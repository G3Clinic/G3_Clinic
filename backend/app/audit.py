"""Helper para registrar eventos na trilha de auditoria."""
from sqlalchemy.orm import Session

from . import clinica_models as cm


def registrar_evento(db: Session, user, acao: str, modulo: str,
                     entidade: str, entidade_id, descricao: str | None = None) -> None:
    """Adiciona um evento de auditoria à sessão (o commit fica com o chamador)."""
    try:
        db.add(cm.EventoAuditoria(
            empresa_id=getattr(user, "empresa_id", None),
            usuario_id=getattr(user, "id", None),
            usuario_nome=getattr(user, "nome", None),
            acao=acao,
            modulo=modulo,
            entidade=entidade,
            entidade_id=str(entidade_id) if entidade_id is not None else None,
            descricao=descricao,
        ))
    except Exception:
        # auditoria nunca deve quebrar a operação principal
        pass
