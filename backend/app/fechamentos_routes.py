from typing import List
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

from . import clinica_models as cm
from . import tenant_models as tm
from . import schemas
from .database import get_db
from .auth import get_current_user, verificar_senha
from .pdf_generator import gerar_pdf_fechamento

router = APIRouter(prefix="/fechamentos", tags=["Fechamentos de Caixa"])

@router.post("/gerar", response_model=dict)
def gerar_fechamento(
    dados: schemas.FechamentoCaixaGerar,
    request: Request,
    user: cm.PerfilUsuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Buscar os lançamentos de caixa do tipo SAIDA para o médico nesta data
    lancamentos = db.query(cm.CaixaLancamento).filter(
        cm.CaixaLancamento.empresa_id == user.empresa_id,
        cm.CaixaLancamento.tipo == "SAIDA",
        cm.CaixaLancamento.data == datetime.strptime(dados.data_fechamento, "%Y-%m-%d").date(),
        # Aqui assumimos que a descrição contém o nome do médico, ou idealmente teríamos uma FK para médico no CaixaLancamento.
        # Vamos assumir que a descrição do caixa já identifica que é um repasse.
        # Para simplificar e devido à falta de FK direta no modelo CaixaLancamento,
        # vamos pegar os atendimentos do dia do médico e calcular.
    ).all()
    
    # Criar o Fechamento
    fechamento = cm.FechamentoCaixa(
        empresa_id=user.empresa_id,
        medico_id=dados.medico_id,
        recepcionista_id=user.id,
        data_fechamento=datetime.strptime(dados.data_fechamento, "%Y-%m-%d").date(),
        valor_total=0.0,
        status="PENDENTE"
    )
    db.add(fechamento)
    db.flush()
    
    # Adicionar assinatura da recepção
    assinatura = cm.AssinaturaEletronica(
        empresa_id=user.empresa_id,
        fechamento_id=fechamento.id,
        usuario_id=user.id,
        papel="RECEPCIONISTA",
        ip_address=request.client.host if request.client else None
    )
    db.add(assinatura)
    
    # FIXME: Adicionar Itens baseados na lógica real de repasses (pular a lógica complexa agora, assumir total)
    # Por agora, para simular a prova de conceito:
    total = sum([(l.valor or 0) for l in lancamentos if l.descricao and "Repasse" in l.descricao])
    fechamento.valor_total = total

    # Avisa o profissional no sininho de notificações — sem isso ele só saberia
    # entrando manualmente em "Meus Fechamentos".
    data_br = fechamento.data_fechamento.strftime("%d/%m/%Y")
    notificacao = cm.Notificacao(
        empresa_id=user.empresa_id,
        usuario_alvo_id=dados.medico_id,
        tipo="info",
        titulo="Novo fechamento de caixa para assinar",
        mensagem=f"Fechamento do dia {data_br}, no valor de R$ {total:.2f}, está pendente da sua assinatura eletrônica.",
        criado_por=user.id,
    )
    db.add(notificacao)

    db.commit()
    db.refresh(fechamento)

    return {"message": "Fechamento gerado com sucesso", "fechamento_id": fechamento.id}


@router.get("/pendentes", response_model=List[dict])
def listar_pendentes(
    user: cm.PerfilUsuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fechamentos = db.query(cm.FechamentoCaixa).filter(
        cm.FechamentoCaixa.empresa_id == user.empresa_id,
        cm.FechamentoCaixa.medico_id == user.id,
        cm.FechamentoCaixa.status == "PENDENTE"
    ).all()
    
    return [{"id": f.id, "data_fechamento": f.data_fechamento, "valor_total": f.valor_total} for f in fechamentos]


@router.post("/{fechamento_id}/confirmar", response_model=dict)
def confirmar_fechamento(
    fechamento_id: str,
    dados: schemas.FechamentoCaixaConfirmar,
    request: Request,
    user: cm.PerfilUsuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validar reautenticação
    if not verificar_senha(dados.senha, user.senha_hash):
        raise HTTPException(status_code=401, detail="Senha incorreta para assinatura eletrônica")
        
    fechamento = db.query(cm.FechamentoCaixa).filter(
        cm.FechamentoCaixa.id == fechamento_id,
        cm.FechamentoCaixa.empresa_id == user.empresa_id,
        cm.FechamentoCaixa.medico_id == user.id
    ).first()
    
    if not fechamento:
        raise HTTPException(status_code=404, detail="Fechamento não encontrado")
        
    if fechamento.status != "PENDENTE":
        raise HTTPException(status_code=400, detail="Fechamento já processado")
        
    # Assinar
    assinatura_medico = cm.AssinaturaEletronica(
        empresa_id=user.empresa_id,
        fechamento_id=fechamento.id,
        usuario_id=user.id,
        papel="MEDICO",
        ip_address=request.client.host if request.client else None
    )
    db.add(assinatura_medico)
    db.flush()
    
    assinatura_recepcao = db.query(cm.AssinaturaEletronica).filter(
        cm.AssinaturaEletronica.fechamento_id == fechamento.id,
        cm.AssinaturaEletronica.papel == "RECEPCIONISTA"
    ).first()
    
    itens = db.query(cm.FechamentoCaixaItem).filter(
        cm.FechamentoCaixaItem.fechamento_id == fechamento.id
    ).all()
    
    # Gerar PDF
    filepath, hash_pdf = gerar_pdf_fechamento(
        fechamento=fechamento,
        itens=itens,
        assinatura_medico=assinatura_medico,
        assinatura_recepcao=assinatura_recepcao
    )
    
    fechamento.status = "CONFIRMADO"
    fechamento.hash_documento = hash_pdf
    fechamento.pdf_path = filepath
    
    db.commit()
    
    return {"message": "Fechamento confirmado com sucesso", "hash": hash_pdf}

@router.get("/{fechamento_id}/pdf")
def baixar_pdf(
    fechamento_id: str,
    user: cm.PerfilUsuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fechamento = db.query(cm.FechamentoCaixa).filter(
        cm.FechamentoCaixa.id == fechamento_id,
        cm.FechamentoCaixa.empresa_id == user.empresa_id
    ).first()
    
    if not fechamento or not fechamento.pdf_path:
        raise HTTPException(status_code=404, detail="PDF não encontrado")
        
    return FileResponse(fechamento.pdf_path, media_type="application/pdf", filename=f"fechamento_{fechamento_id}.pdf")
