"""notificacao dirigida a um usuario especifico

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-07

Adiciona usuario_alvo_id em notificacoes: até agora só existia publico_alvo
(broadcast por papel — todos/medicos/recepcao/admin). Necessário pra avisar
um profissional específico (ex: "seu fechamento de caixa está pendente de
assinatura") sem notificar todos os médicos da empresa.
"""
from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notificacoes", sa.Column("usuario_alvo_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("notificacoes", "usuario_alvo_id")
