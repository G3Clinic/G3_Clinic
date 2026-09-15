"""origem_entrada_id em caixa_lancamentos

Revision ID: b1c2d3e4f5a6
Revises: a8b9c0d1e2f3
Create Date: 2026-09-14

Pedido do usuário: se um pagamento (ENTRADA) que gerou repasse de profissional
ou comissão de recepção for estornado, a comissão paga em cima dele precisa
ser retirada também. Esta coluna liga o lançamento de repasse/comissão
(SAÍDA) à ENTRADA que o originou, pra dar pra encontrar e reverter.
"""
from alembic import op
import sqlalchemy as sa

revision = "b1c2d3e4f5a6"
down_revision = "a8b9c0d1e2f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("caixa_lancamentos", sa.Column("origem_entrada_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("caixa_lancamentos", "origem_entrada_id")
