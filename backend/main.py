from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import shutil
import uuid
from datetime import date
from typing import List, Optional

from app.config import settings
from app.database import get_db
from app import models, schemas, clinica_models, tenant_models, init_db
from app.crud import make_crud_router
from app.auth import get_current_user, require_modulo
from app.auth_routes import router as auth_router
from app.validators import cpf_valido, normalizar_cpf
from app.audit import registrar_evento
from app.services import memed, cid, autolac

app = FastAPI(title="API da Clínica (SaaS multi-tenant)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    """Postgres/Docker: schema vem do Alembic (entrypoint) — só semeia módulos.
    Dev/SQLite (python main.py): cria o schema via create_all + auto-migração."""
    if settings.DATABASE_URL.startswith("sqlite"):
        init_db.init()
    else:
        init_db.seed()


# Rotas de autenticação e administração (registro, login, delegação).
app.include_router(auth_router)

# CRUD completo, multi-tenant e protegido por módulo, de todas as tabelas.
for _model, _prefix, _modulo in clinica_models.CRUD_MODELS:
    app.include_router(make_crud_router(_model, _prefix, _modulo))

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def read_root():
    return {"message": "Bem vindo à API da Clínica", "status": "ok"}


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    _user=Depends(get_current_user),
):
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"{settings.PUBLIC_URL}/uploads/{filename}"}


# --- Memed Routes ---
@app.get("/api/memed/ambiente")
async def get_memed_ambiente(_user=Depends(get_current_user)):
    """Diz qual ambiente Memed está ativo (sandbox/produção) e se há chaves."""
    return memed.ambiente_info()


@app.get("/api/memed/token")
async def get_memed_token(user=Depends(get_current_user)):
    # Converte data_nascimento (ISO) para o formato dd/mm/YYYY exigido pela Memed.
    nasc = None
    if getattr(user, "data_nascimento", None):
        try:
            d = user.data_nascimento
            d = date.fromisoformat(str(d)[:10]) if not isinstance(d, date) else d
            nasc = d.strftime("%d/%m/%Y")
        except (ValueError, TypeError):
            nasc = None
    try:
        token = await memed.obter_token(
            id_medico=str(user.id),
            nome=user.nome or "Profissional",
            cpf=normalizar_cpf(user.cpf) or "12345678909",
            crm=user.conselho_numero or "12345",
            uf=user.conselho_uf or "SP",
            data_nascimento=nasc,
            sexo=getattr(user, "sexo", None),
            email=getattr(user, "email", None),
            telefone=getattr(user, "telefone", None),
        )
        return {"token": token}
    except Exception as e:
        # 503: dependência externa/config (chaves Memed) — não é erro do nosso servidor
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/memed/medicamentos")
async def search_medicamentos(q: str = "", _user=Depends(get_current_user)):
    try:
        data = await memed.buscar_principios_ativos(q)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Prescrições Memed (LGPD): persistir emitidas e remover excluídas ---
# Critério obrigatório de homologação. Guardamos o registro por empresa em
# clinica_dados (chave memed_prescricao:<id>), sem exigir migração de schema.
def _chave_prescricao(memed_id: str) -> str:
    return f"memed_prescricao:{memed_id}"


@app.post("/api/memed/prescricoes")
def salvar_prescricao_memed(
    prescricao: dict = Body(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memed_id = str(prescricao.get("id") or prescricao.get("prescricao_id") or "")
    if not memed_id:
        raise HTTPException(status_code=400, detail="Prescrição sem id da Memed")
    chave = _chave_prescricao(memed_id)
    reg = db.query(clinica_models.ClinicaDado).filter(
        clinica_models.ClinicaDado.empresa_id == user.empresa_id,
        clinica_models.ClinicaDado.chave == chave,
    ).first()
    if reg:
        reg.valor = prescricao
    else:
        db.add(clinica_models.ClinicaDado(empresa_id=user.empresa_id, chave=chave, valor=prescricao))
    registrar_evento(db, user, "criação", "prontuario", "memed_prescricoes", memed_id, "Prescrição digital emitida (Memed)")
    db.commit()
    return {"ok": True, "memed_id": memed_id}


@app.delete("/api/memed/prescricoes/{memed_id}")
def excluir_prescricao_memed(
    memed_id: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reg = db.query(clinica_models.ClinicaDado).filter(
        clinica_models.ClinicaDado.empresa_id == user.empresa_id,
        clinica_models.ClinicaDado.chave == _chave_prescricao(memed_id),
    ).first()
    if reg:
        db.delete(reg)
        registrar_evento(db, user, "exclusão", "prontuario", "memed_prescricoes", memed_id, "Prescrição digital excluída (Memed)")
        db.commit()
    return {"ok": True, "memed_id": memed_id}


# --- Autolac Routes (laboratório de apoio) ---
# Protegidas pelo módulo "recepcao" (recepção de laboratório).
@app.get("/api/autolac/status-conexao")
async def autolac_status_conexao(_user=Depends(require_modulo("recepcao"))):
    """Diz se a integração está configurada e, se sim, testa o login."""
    if not autolac.esta_configurada():
        return {"configurada": False, "conectado": False,
                "mensagem": "Defina AUTOLAC_BASE_URL, AUTOLAC_APOIADO_ID e AUTOLAC_SENHA no backend/.env."}
    try:
        info = await autolac.testar_conexao()
        return {"configurada": True, "conectado": True, **info}
    except Exception as e:
        return {"configurada": True, "conectado": False, "mensagem": str(e)}


@app.get("/api/autolac/exames")
async def autolac_exames(pageNumber: int = 1, pageSize: int = 200,
                         _user=Depends(require_modulo("recepcao"))):
    try:
        data = await autolac.listar_exames(pageNumber, pageSize)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/autolac/pedidos")
async def autolac_pedidos(pedido_lote: dict, _user=Depends(require_modulo("recepcao"))):
    try:
        data = await autolac.enviar_pedidos(pedido_lote)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/autolac/status")
async def autolac_status(consulta: dict, _user=Depends(require_modulo("recepcao"))):
    try:
        data = await autolac.consultar_status(consulta)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/autolac/resultados")
async def autolac_resultados(consulta: dict, _user=Depends(require_modulo("recepcao"))):
    try:
        data = await autolac.consultar_resultados(consulta)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# --- CID Routes ---
@app.get("/api/cid/search")
async def search_cid(q: str = "", _user=Depends(get_current_user)):
    data = await cid.buscar_cid(q)
    return {"data": data}


# --- Regra de negócio: movimentação de estoque atualiza o saldo ---
class MovimentacaoIn(BaseModel):
    produto_id: str
    unidade_id: Optional[int] = None
    tipo: str  # ENTRADA / SAIDA / AJUSTE
    quantidade: float
    custo_unitario: Optional[float] = None
    observacoes: Optional[str] = None


@app.post("/api/estoque/movimentar")
def movimentar_estoque(
    dados: MovimentacaoIn,
    user=Depends(require_modulo("estoque")),
    db: Session = Depends(get_db),
):
    mov = clinica_models.EstoqueMovimentacao(
        empresa_id=user.empresa_id, produto_id=dados.produto_id, unidade_id=dados.unidade_id,
        tipo=dados.tipo, quantidade=dados.quantidade, custo_unitario=dados.custo_unitario,
        observacoes=dados.observacoes, criado_por=user.id,
    )
    db.add(mov)

    # atualiza (ou cria) o saldo do produto
    saldo = db.query(clinica_models.EstoqueSaldo).filter(
        clinica_models.EstoqueSaldo.empresa_id == user.empresa_id,
        clinica_models.EstoqueSaldo.produto_id == dados.produto_id,
        clinica_models.EstoqueSaldo.unidade_id == dados.unidade_id,
    ).first()
    if saldo is None:
        saldo = clinica_models.EstoqueSaldo(
            empresa_id=user.empresa_id, produto_id=dados.produto_id,
            unidade_id=dados.unidade_id, quantidade=0,
        )
        db.add(saldo)

    if dados.tipo == "SAIDA":
        saldo.quantidade = (saldo.quantidade or 0) - dados.quantidade
    elif dados.tipo == "AJUSTE":
        saldo.quantidade = dados.quantidade
    else:  # ENTRADA
        saldo.quantidade = (saldo.quantidade or 0) + dados.quantidade

    registrar_evento(db, user, "movimentação", "estoque", "estoque_movimentacoes",
                     dados.produto_id, f"{dados.tipo} de {dados.quantidade}")
    db.commit()
    db.refresh(saldo)
    return {"ok": True, "produto_id": dados.produto_id, "saldo": saldo.quantidade}


@app.get("/api/estoque/saldos")
def listar_saldos(user=Depends(require_modulo("estoque")), db: Session = Depends(get_db)):
    saldos = db.query(clinica_models.EstoqueSaldo).filter(
        clinica_models.EstoqueSaldo.empresa_id == user.empresa_id
    ).all()
    return [{"produto_id": s.produto_id, "unidade_id": s.unidade_id, "quantidade": s.quantidade} for s in saldos]


# --- Regra de negócio: finalizar orçamento gera recebimento pendente ---
class OrcItemIn(BaseModel):
    dente_numero: Optional[str] = None
    faces: Optional[str] = None
    procedimento_id: Optional[str] = None
    valor_cobrado: Optional[float] = None


class FinalizarOrcamentoIn(BaseModel):
    paciente_id: int
    valor_total: float
    itens: List[OrcItemIn] = []


@app.post("/api/orcamentos/finalizar")
def finalizar_orcamento(
    dados: FinalizarOrcamentoIn,
    user=Depends(require_modulo("odontograma")),
    db: Session = Depends(get_db),
):
    orc = clinica_models.Orcamento(
        empresa_id=user.empresa_id, paciente_id=dados.paciente_id,
        profissional_id=user.id, valor_total=dados.valor_total, status_geral="Finalizado",
    )
    db.add(orc)
    db.flush()

    for it in dados.itens:
        db.add(clinica_models.OrcamentoItem(
            empresa_id=user.empresa_id, orcamento_id=orc.id, dente_numero=it.dente_numero,
            faces=it.faces, procedimento_id=it.procedimento_id, valor_cobrado=it.valor_cobrado,
            status_item="Aprovado",
        ))

    # gera recebimento pendente referente ao orçamento
    rec = clinica_models.Recebimento(
        empresa_id=user.empresa_id, paciente_id=dados.paciente_id, valor=dados.valor_total,
        status="PENDENTE", descricao="Orçamento odontológico", data_vencimento=date.today(),
        criado_por=user.id,
    )
    db.add(rec)
    registrar_evento(db, user, "criação", "odontograma", "orcamentos", orc.id,
                     f"Orçamento finalizado (R$ {dados.valor_total:.2f}) — recebimento gerado")
    db.commit()
    return {"ok": True, "orcamento_id": orc.id, "recebimento_id": rec.id}


# --- Finalizar atendimento: lança no caixa do dia + auditoria ---
@app.post("/api/agendamentos/{agendamento_id}/finalizar")
def finalizar_atendimento(
    agendamento_id: str,
    user=Depends(require_modulo("recepcao")),
    db: Session = Depends(get_db),
):
    """Encerra o fluxo de um atendimento: marca como Finalizado, contabiliza
    o valor no caixa do dia (caixa_lancamentos, ENTRADA) e registra no log.
    Idempotente: se o agendamento já estava Finalizado, não lança de novo."""
    ag = db.query(clinica_models.Agendamento).filter(
        clinica_models.Agendamento.id == agendamento_id,
        clinica_models.Agendamento.empresa_id == user.empresa_id,
    ).first()
    if ag is None:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    ja_finalizado = (ag.status == "Finalizado")
    ag.status = "Finalizado"
    ag.atualizado_em = __import__("datetime").datetime.utcnow()

    lancamento_id = None
    if not ja_finalizado:
        # Valor: o cobrado no agendamento; se ausente, o padrão do procedimento.
        valor = ag.valor_cobrado
        if not valor and ag.procedimento_id:
            proc = db.query(clinica_models.Procedimento).filter(
                clinica_models.Procedimento.id == ag.procedimento_id,
                clinica_models.Procedimento.empresa_id == user.empresa_id,
            ).first()
            valor = proc.valor_padrao if proc else 0
        valor = valor or 0

        pac = db.query(models.Paciente).filter(
            models.Paciente.id == ag.paciente_id,
            models.Paciente.empresa_id == user.empresa_id,
        ).first() if ag.paciente_id else None
        nome_pac = pac.nome if pac else "Paciente"

        lanc = clinica_models.CaixaLancamento(
            empresa_id=user.empresa_id, unidade_id=ag.unidade_id,
            tipo="ENTRADA", descricao=f"Atendimento finalizado — {nome_pac}",
            paciente_id=ag.paciente_id, valor=valor,
            forma_pagamento=ag.forma_pagamento or None,
            data=date.today(), criado_por=user.id,
        )
        db.add(lanc)
        db.flush()
        lancamento_id = lanc.id
        registrar_evento(db, user, "finalização", "recepcao", "agendamentos", ag.id,
                         f'Finalizou atendimento de "{nome_pac}" — R$ {valor:.2f} lançado no caixa do dia')

    db.commit()
    return {"ok": True, "agendamento_id": ag.id, "ja_finalizado": ja_finalizado,
            "caixa_lancamento_id": lancamento_id}


# --- Backup: exporta os dados da empresa (JSON) ---
@app.get("/api/backup")
def exportar_backup(
    user=Depends(require_modulo("admin")),
    db: Session = Depends(get_db),
):
    def _dump(model):
        rows = db.query(model).filter(model.empresa_id == user.empresa_id).all()
        return [{c.name: getattr(r, c.name) for c in r.__table__.columns} for r in rows]

    dados = {"pacientes": _dump(models.Paciente)}
    for _model, _prefix, _mod in clinica_models.CRUD_MODELS:
        try:
            dados[_prefix] = _dump(_model)
        except Exception:
            dados[_prefix] = []
    return {"empresa_id": user.empresa_id, "gerado_em": __import__("datetime").datetime.utcnow().isoformat(), "dados": dados}


def _mapa_modelos():
    m = {prefix: model for model, prefix, _ in clinica_models.CRUD_MODELS}
    m["pacientes"] = models.Paciente
    return m


@app.post("/api/backup/importar")
def importar_backup(
    payload: dict,
    user=Depends(require_modulo("admin")),
    db: Session = Depends(get_db),
):
    """Reimporta um backup (merge por id, sempre no escopo da empresa atual).
    Registros existentes são atualizados; novos são inseridos."""
    from datetime import datetime as _dt, date as _d
    from sqlalchemy import Date as _Date, DateTime as _DateTime

    dados = payload.get("dados", {})
    if not isinstance(dados, dict):
        raise HTTPException(status_code=400, detail="Backup inválido: falta 'dados'")

    modelos = _mapa_modelos()
    total = 0
    for prefix, rows in dados.items():
        model = modelos.get(prefix)
        if not model or not isinstance(rows, list):
            continue
        cols = {c.name: c for c in model.__table__.columns}
        pk = list(model.__table__.primary_key.columns)[0].name
        for row in rows:
            if not isinstance(row, dict):
                continue
            limpo = {}
            for k, v in row.items():
                if k not in cols:
                    continue
                ctype = cols[k].type
                if isinstance(v, str) and v:
                    if isinstance(ctype, _DateTime):
                        try: v = _dt.fromisoformat(v.replace("Z", "+00:00"))
                        except ValueError: pass
                    elif isinstance(ctype, _Date):
                        try: v = _d.fromisoformat(v[:10])
                        except ValueError: pass
                limpo[k] = v
            if "empresa_id" in cols:
                limpo["empresa_id"] = user.empresa_id  # força o tenant
            pkval = limpo.get(pk)
            existente = db.get(model, pkval) if pkval is not None else None
            if existente is not None and getattr(existente, "empresa_id", None) == user.empresa_id:
                for k, v in limpo.items():
                    if k != pk:
                        setattr(existente, k, v)
            else:
                db.add(model(**limpo))
            total += 1
    registrar_evento(db, user, "importação", "admin", "backup", None, f"Importou backup ({total} registros)")
    db.commit()
    return {"ok": True, "registros": total}


# --- Filiais (unidades da empresa) — para selects em qualquer tela ---
@app.get("/api/filiais")
def listar_filiais(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    unidades = db.query(clinica_models.Unidade).filter(
        clinica_models.Unidade.empresa_id == user.empresa_id
    ).order_by(clinica_models.Unidade.id).all()
    return [
        {"id": u.id, "nome": u.nome_fantasia or u.razao_social or f"Filial {u.id}"}
        for u in unidades
    ]


# --- Pacientes (compartilhado na empresa) ---
@app.post("/api/pacientes", response_model=schemas.PacienteResponse, status_code=201)
def create_paciente(
    paciente: schemas.PacienteCreate,
    user=Depends(require_modulo("pacientes")),
    db: Session = Depends(get_db),
):
    if not cpf_valido(paciente.cpf):
        raise HTTPException(status_code=400, detail="CPF inválido")
    cpf = normalizar_cpf(paciente.cpf)

    ja_existe = db.query(models.Paciente).filter(
        models.Paciente.empresa_id == user.empresa_id,
        models.Paciente.cpf == cpf,
    ).first()
    if ja_existe:
        raise HTTPException(status_code=409, detail="Já existe um paciente com este CPF")

    dados = paciente.model_dump()
    dados["cpf"] = cpf
    db_paciente = models.Paciente(**dados, empresa_id=user.empresa_id)
    db.add(db_paciente)
    db.commit()
    db.refresh(db_paciente)
    return db_paciente


@app.get("/api/pacientes", response_model=List[schemas.PacienteResponse])
def get_pacientes(
    user=Depends(require_modulo("pacientes")),
    db: Session = Depends(get_db),
):
    return db.query(models.Paciente).filter(
        models.Paciente.empresa_id == user.empresa_id
    ).all()


def _get_paciente_do_tenant(db: Session, paciente_id: int, empresa_id: int):
    p = db.query(models.Paciente).filter(
        models.Paciente.id == paciente_id,
        models.Paciente.empresa_id == empresa_id,
    ).first()
    if p is None:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    return p


@app.get("/api/pacientes/{paciente_id}", response_model=schemas.PacienteResponse)
def get_paciente(
    paciente_id: int,
    user=Depends(require_modulo("pacientes")),
    db: Session = Depends(get_db),
):
    return _get_paciente_do_tenant(db, paciente_id, user.empresa_id)


@app.put("/api/pacientes/{paciente_id}", response_model=schemas.PacienteResponse)
def update_paciente(
    paciente_id: int,
    dados: schemas.PacienteUpdate,
    user=Depends(require_modulo("pacientes")),
    db: Session = Depends(get_db),
):
    p = _get_paciente_do_tenant(db, paciente_id, user.empresa_id)
    campos = dados.model_dump(exclude_unset=True)

    if "cpf" in campos and campos["cpf"] is not None:
        if not cpf_valido(campos["cpf"]):
            raise HTTPException(status_code=400, detail="CPF inválido")
        campos["cpf"] = normalizar_cpf(campos["cpf"])
        duplicado = db.query(models.Paciente).filter(
            models.Paciente.empresa_id == user.empresa_id,
            models.Paciente.cpf == campos["cpf"],
            models.Paciente.id != paciente_id,
        ).first()
        if duplicado:
            raise HTTPException(status_code=409, detail="Já existe um paciente com este CPF")

    for campo, valor in campos.items():
        setattr(p, campo, valor)
    db.commit()
    db.refresh(p)
    return p


@app.delete("/api/pacientes/{paciente_id}")
def delete_paciente(
    paciente_id: int,
    user=Depends(require_modulo("pacientes")),
    db: Session = Depends(get_db),
):
    p = _get_paciente_do_tenant(db, paciente_id, user.empresa_id)
    registrar_evento(db, user, "exclusão", "pacientes", "pacientes", paciente_id, f'Excluiu paciente "{p.nome}"')
    db.delete(p)
    db.commit()
    return {"ok": True, "id": paciente_id}


# --- Consultas ---
@app.post("/api/consultas", response_model=schemas.ConsultaResponse, status_code=201)
def create_consulta(
    consulta: schemas.ConsultaCreate,
    user=Depends(require_modulo("prontuario")),
    db: Session = Depends(get_db),
):
    db_consulta = models.Consulta(**consulta.model_dump(), empresa_id=user.empresa_id)
    db.add(db_consulta)
    db.commit()
    db.refresh(db_consulta)
    return db_consulta


@app.get("/api/pacientes/{paciente_id}/consultas", response_model=List[schemas.ConsultaResponse])
def get_consultas(
    paciente_id: int,
    user=Depends(require_modulo("prontuario")),
    db: Session = Depends(get_db),
):
    return db.query(models.Consulta).filter(
        models.Consulta.paciente_id == paciente_id,
        models.Consulta.empresa_id == user.empresa_id,
    ).all()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
