"""
Contas a Pagar — aprovação e pagamento, e a ponte com o Estoque.

O modelo FinanceiroContaPagar já existia (com pedido_id, aprovado_por,
status, data_pagamento) mas não tinha rotas dedicadas nem tela — só o CRUD
genérico. Aqui entram as duas ações que fazem sentido de negócio ("aprovar"
e "pagar", não são apenas um PUT de status) e a rota que o Estoque chama
para mandar um pedido de compra para o Financeiro aprovar e pagar, em vez
de o próprio Estoque decidir sozinho.
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .auth import require_modulo
from . import clinica_models as cm

router = APIRouter(prefix="/api/financeiro", tags=["Financeiro — Contas a Pagar"])


def _conta(db: Session, empresa_id: int, conta_id: str) -> cm.FinanceiroContaPagar:
    conta = db.query(cm.FinanceiroContaPagar).filter(
        cm.FinanceiroContaPagar.id == conta_id,
        cm.FinanceiroContaPagar.empresa_id == empresa_id,
    ).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
    return conta


@router.post("/contas-pagar/{conta_id}/aprovar")
def aprovar_conta_pagar(
    conta_id: str,
    user: cm.PerfilUsuario = Depends(require_modulo("financeiro")),
    db: Session = Depends(get_db),
):
    conta = _conta(db, user.empresa_id, conta_id)
    if conta.status not in ("PENDENTE",):
        raise HTTPException(status_code=400, detail=f"Conta em status '{conta.status}' não pode ser aprovada")
    conta.status = "APROVADO"
    conta.aprovado_por = user.id
    db.commit()
    return {"ok": True, "status": conta.status}


@router.post("/contas-pagar/{conta_id}/pagar")
def pagar_conta_pagar(
    conta_id: str,
    dados: dict = Body(default={}),
    user: cm.PerfilUsuario = Depends(require_modulo("financeiro")),
    db: Session = Depends(get_db),
):
    conta = _conta(db, user.empresa_id, conta_id)
    if conta.status == "PAGO":
        return {"ok": True, "ja_pago": True}
    if conta.status not in ("PENDENTE", "APROVADO"):
        raise HTTPException(status_code=400, detail=f"Conta em status '{conta.status}' não pode ser paga")
    # Paga direto de "Pendente" também aprova nesse momento — evita forçar
    # dois cliques quando quem está pagando já é quem tem alçada pra aprovar.
    conta.aprovado_por = conta.aprovado_por or user.id
    conta.status = "PAGO"
    conta.data_pagamento = date.today()

    lanc = cm.CaixaLancamento(
        empresa_id=user.empresa_id, unidade_id=conta.unidade_id, tipo="SAIDA",
        descricao=f"Pagamento — {conta.descricao or conta.fornecedor or 'Conta a pagar'}",
        valor=conta.valor or 0, forma_pagamento=dados.get("forma_pagamento"),
        data=date.today(), criado_por=user.id,
    )
    db.add(lanc)
    db.commit()
    return {"ok": True, "ja_pago": False, "caixa_lancamento_id": lanc.id}


@router.post("/estoque-pedidos/{pedido_id}/enviar")
def enviar_pedido_ao_financeiro(
    pedido_id: str,
    user: cm.PerfilUsuario = Depends(require_modulo("estoque")),
    db: Session = Depends(get_db),
):
    """Cria uma Conta a Pagar vinculada ao pedido de compra (pedido_id), pra
    quem cuida do financeiro aprovar e pagar — o Estoque só solicita."""
    pedido = db.query(cm.EstoquePedido).filter(
        cm.EstoquePedido.id == pedido_id,
        cm.EstoquePedido.empresa_id == user.empresa_id,
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    ja_enviado = db.query(cm.FinanceiroContaPagar).filter(
        cm.FinanceiroContaPagar.empresa_id == user.empresa_id,
        cm.FinanceiroContaPagar.pedido_id == pedido_id,
    ).first()
    if ja_enviado:
        raise HTTPException(status_code=400, detail="Este pedido já foi enviado ao financeiro")

    fornecedor_nome = None
    if pedido.fornecedor_id:
        forn = db.query(cm.EstoqueFornecedor).filter(
            cm.EstoqueFornecedor.id == pedido.fornecedor_id,
            cm.EstoqueFornecedor.empresa_id == user.empresa_id,
        ).first()
        fornecedor_nome = forn.nome if forn else None

    conta = cm.FinanceiroContaPagar(
        empresa_id=user.empresa_id, unidade_id=pedido.unidade_id,
        descricao=f"Pedido de compra (Estoque): {pedido.itens_texto or pedido.id}",
        valor=pedido.custo_estimado or 0, fornecedor=fornecedor_nome,
        status="PENDENTE", pedido_id=pedido.id, criado_por=user.id,
    )
    db.add(conta)
    pedido.status = "AGUARDANDO_FINANCEIRO"
    db.commit()
    db.refresh(conta)
    return {"ok": True, "conta_pagar_id": conta.id}
