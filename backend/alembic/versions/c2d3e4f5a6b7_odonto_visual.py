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

import sqlalchemy as sa

revision = "c2d3e4f5a6b7"
down_revision = "b1f2a3c4d5e6"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("odonto_procedimentos", sa.Column("tipo_visual", sa.String(), server_default="nenhum"))
    op.add_column("orcamento_itens", sa.Column("status_visual", sa.String(), server_default="a_realizar"))

def downgrade() -> None:
    op.drop_column("orcamento_itens", "status_visual")
    op.drop_column("odonto_procedimentos", "tipo_visual")
