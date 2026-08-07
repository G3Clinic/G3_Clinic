"""restringe procedimentos a profissionais especificos

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-07

Adiciona profissionais_ids (JSON) em procedimentos: lista de ids de
profissionais habilitados a realizar aquele atendimento. None/vazio
continua liberado para todos — não muda o comportamento de linhas
existentes. Usado pela Agenda para filtrar o select de Procedimento
conforme o Profissional escolhido (evita a recepção escolher, por engano,
um atendimento de outro profissional com valor diferente).
"""
from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("procedimentos", sa.Column("profissionais_ids", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("procedimentos", "profissionais_ids")
