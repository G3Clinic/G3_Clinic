"""odontograma visual — tipo_visual e status_visual

Revision ID: c2d3e4f5a6b7
Revises: b1f2a3c4d5e6
Create Date: 2026-07-15

Adiciona as colunas visuais do odontograma:
  - odonto_procedimentos.tipo_visual  (símbolo: carie, restauracao, canal, coroa, extracao, ausente…)
  - orcamento_itens.status_visual     (a_realizar / executado / existente)
Idempotente via IF NOT EXISTS.
"""
from alembic import op

revision = "c2d3e4f5a6b7"
down_revision = "b1f2a3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE odonto_procedimentos ADD COLUMN IF NOT EXISTS tipo_visual VARCHAR DEFAULT 'nenhum'")
    op.execute("ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS status_visual VARCHAR DEFAULT 'a_realizar'")


def downgrade() -> None:
    op.execute("ALTER TABLE orcamento_itens DROP COLUMN IF EXISTS status_visual")
    op.execute("ALTER TABLE odonto_procedimentos DROP COLUMN IF EXISTS tipo_visual")
