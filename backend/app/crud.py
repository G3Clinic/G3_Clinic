"""
Fábrica de routers CRUD genéricos, multi-tenant e protegidos por módulo.

Para cada modelo gera:
  GET    /api/{prefix}            -> lista (escopo empresa; filtros por query)
  GET    /api/{prefix}/{id}       -> um registro (do próprio tenant)
  POST   /api/{prefix}            -> cria (empresa_id forçado pelo token)
  PUT    /api/{prefix}/{id}       -> atualiza (do próprio tenant)
  DELETE /api/{prefix}/{id}       -> remove (do próprio tenant)

Isolamento (row-level): TODAS as queries são filtradas por empresa_id vindo
do JWT; o cliente nunca escolhe a empresa. No create, empresa_id do payload
é ignorado e sobrescrito pelo do token. O acesso ao módulo é exigido via
require_modulo(modulo).

Alguns modelos precisam de uma regra extra (dono de registro, campo
obrigatório etc.) sem duplicar o CRUD inteiro — para isso, make_crud_router
aceita hooks opcionais (todos None por padrão = comportamento inalterado
para os demais ~40 modelos que usam o CRUD genérico puro):

  extra_filter(query, user)                     -> query adicional na listagem/leitura
  before_create(dados, user)                    -> pode mutar/whitelistar campos antes do INSERT
  validate(dados, user, *, is_partial)           -> levanta HTTPException se inválido.
                                                     No create, dados = registro completo,
                                                     is_partial=False. No update, dados = só
                                                     os campos enviados nessa chamada,
                                                     is_partial=True (permite ao hook ignorar
                                                     updates que não tocam no campo da regra).
  check_write(obj, user)                        -> levanta HTTPException(403) se o usuário
                                                     não pode alterar/excluir aquele registro
"""
from datetime import date, datetime
from typing import Any, Callable, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from sqlalchemy import Date, DateTime, Integer
from sqlalchemy.orm import Session

from .database import get_db
from .auth import require_modulo
from .audit import registrar_evento
from . import clinica_models as cm


def _rotulo(obj) -> str:
    for campo in ("nome", "nome_completo", "nome_fantasia", "nome_intervencao", "titulo", "descricao", "exame"):
        v = getattr(obj, campo, None)
        if v:
            return str(v)
    return getattr(obj, list(obj.__table__.primary_key.columns)[0].name, "")


def _row_to_dict(obj) -> dict:
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def _coerce(model, key: str, value: Any):
    if value is None:
        return None
    col = model.__table__.columns.get(key)
    if col is None:
        return value
    ctype = col.type
    try:
        if isinstance(ctype, DateTime) and isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(ctype, Date) and not isinstance(ctype, DateTime) and isinstance(value, str):
            return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return value
    return value


def _cast_pk(model, pk_name: str, raw: str):
    col = model.__table__.columns.get(pk_name)
    if col is not None and isinstance(col.type, Integer):
        try:
            return int(raw)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="ID inválido")
    return raw


# Tabelas com coluna unidade_id que NÃO devem ser filtradas por filial na listagem,
# mesmo carimbando a unidade na criação (só como dado informativo/relatório).
# atendimentos_clinicos: o prontuário acumula evoluções num único "atendimento" por
# paciente (ver ProntuarioPage.abrirProntuario, que faz find-or-create). Se a listagem
# filtrasse por filial, trocar de unidade faria o sistema "não achar" o atendimento já
# existente do paciente (criado numa filial diferente) e criar um novo em branco —
# perdendo o acesso ao histórico de evoluções/documentos já salvos (eles continuam no
# banco, só ficam inacessíveis via essa busca). Histórico clínico é do paciente, não da
# unidade onde ele foi visto.
_SEM_FILTRO_DE_UNIDADE_NA_LISTAGEM = {"atendimentos_clinicos"}


def make_crud_router(
    model,
    prefix: str,
    modulo: str,
    *,
    extra_filter: Optional[Callable[[Any, Any], Any]] = None,
    before_create: Optional[Callable[[dict, Any], dict]] = None,
    validate: Optional[Callable[[dict, Any], None]] = None,
    check_write: Optional[Callable[[Any, Any], None]] = None,
) -> APIRouter:
    router = APIRouter(prefix=f"/api/{prefix}", tags=[prefix])
    columns = {c.name for c in model.__table__.columns}
    pk_name = list(model.__table__.primary_key.columns)[0].name
    guard = require_modulo(modulo)  # exige auth + permissão do módulo

    def _clean(payload: dict) -> dict:
        # empresa_id nunca vem do cliente — é definido pelo token.
        return {
            k: _coerce(model, k, v)
            for k, v in payload.items()
            if k in columns and k != "empresa_id"
        }

    def _scoped(db: Session, user) -> Any:
        query = db.query(model).filter(model.empresa_id == user.empresa_id)
        if extra_filter is not None:
            query = extra_filter(query, user)
        return query

    def _get_own(db: Session, user, item_id: str):
        obj = db.get(model, _cast_pk(model, pk_name, item_id))
        if obj is None or obj.empresa_id != user.empresa_id:
            raise HTTPException(status_code=404, detail="Registro não encontrado")
        return obj

    @router.get("")
    def listar(
        request: Request,
        user: cm.PerfilUsuario = Depends(guard),
        db: Session = Depends(get_db),
        x_filial_id: Optional[int] = Header(default=None, alias="X-Filial-Id"),
    ):
        query = _scoped(db, user)
        params = request.query_params
        for key, val in params.items():
            if key in columns and key != "empresa_id":
                query = query.filter(getattr(model, key) == val)
        # Filtro automático por filial: só para modelos com coluna unidade_id
        # e quando o cliente não filtrou explicitamente por unidade_id.
        # Inclui registros sem filial (NULL) — compartilhados/legados — para
        # não "sumir" dados ao trocar de unidade.
        if (
            "unidade_id" in columns and x_filial_id is not None and "unidade_id" not in params
            and prefix not in _SEM_FILTRO_DE_UNIDADE_NA_LISTAGEM
        ):
            query = query.filter(
                (model.unidade_id == x_filial_id) | (model.unidade_id.is_(None))
            )
        return [_row_to_dict(r) for r in query.all()]

    @router.get("/{item_id}")
    def obter(
        item_id: str,
        user: cm.PerfilUsuario = Depends(guard),
        db: Session = Depends(get_db),
    ):
        return _row_to_dict(_get_own(db, user, item_id))

    @router.post("", status_code=201)
    def criar(
        payload: dict = Body(...),
        user: cm.PerfilUsuario = Depends(guard),
        db: Session = Depends(get_db),
        x_filial_id: Optional[int] = Header(default=None, alias="X-Filial-Id"),
    ):
        dados = _clean(payload)
        # Carimba a filial ativa em registros novos (se o modelo suportar e o
        # cliente não tiver definido explicitamente a unidade).
        if "unidade_id" in columns and not dados.get("unidade_id") and x_filial_id is not None:
            dados["unidade_id"] = x_filial_id
        if before_create is not None:
            dados = before_create(dados, user)
        if validate is not None:
            validate(dados, user, is_partial=False)
        obj = model(**dados)
        obj.empresa_id = user.empresa_id
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return _row_to_dict(obj)

    @router.put("/{item_id}")
    def atualizar(
        item_id: str,
        payload: dict = Body(...),
        user: cm.PerfilUsuario = Depends(guard),
        db: Session = Depends(get_db),
    ):
        obj = _get_own(db, user, item_id)
        if check_write is not None:
            check_write(obj, user)
        limpo = _clean(payload)
        for key, val in limpo.items():
            if key != pk_name:
                setattr(obj, key, val)
        # No update, o validate recebe só os campos enviados nesta chamada
        # (is_partial=True) — cada hook decide se a regra se aplica quando o
        # campo em questão nem foi tocado. Isso evita bloquear updates de
        # registros antigos que já existiam sem satisfazer uma regra
        # adicionada depois (ex.: sala obrigatória em agendamentos legados
        # sem sala, ao só mudar o status).
        if validate is not None:
            validate(limpo, user, is_partial=True)
        if prefix != "eventos_auditoria":
            registrar_evento(db, user, "alteração", modulo, prefix, item_id, f'Alterou "{_rotulo(obj)}"')
        db.commit()
        db.refresh(obj)
        return _row_to_dict(obj)

    @router.delete("/{item_id}")
    def remover(
        item_id: str,
        user: cm.PerfilUsuario = Depends(guard),
        db: Session = Depends(get_db),
    ):
        obj = _get_own(db, user, item_id)
        if check_write is not None:
            check_write(obj, user)
        if prefix != "eventos_auditoria":
            registrar_evento(db, user, "exclusão", modulo, prefix, item_id, f'Excluiu "{_rotulo(obj)}"')
        db.delete(obj)
        db.commit()
        return {"ok": True, "id": item_id}

    return router
