"""estorno de lancamento de caixa (contas a pagar/receber ja tinham; caixa do dia nao)

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-09-11

Pedido do usuario: "possibilitar estornar pagamento no caixa do dia". Hoje um
lancamento de ENTRADA no caixa (um pagamento recebido) nao tem como ser
desfeito -- so dava pra excluir, o que apaga o rastro contabil do dia.

Adiciona duas colunas em caixa_lancamentos:
  - estornado: marca que ESTE lancamento foi revertido (nao conta mais como
    "em aberto" na UI, mas continua no historico).
  - estorno_de_id: no lancamento de SAIDA gerado automaticamente pelo
    estorno, aponta pro id do lancamento de ENTRADA original -- rastreio de
    auditoria (contra-lancamento, nao seguido de nada apagado).
"""
from alembic import op
import sqlalchemy as sa

revision = "f7a8b9c0d1e2"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("caixa_lancamentos", sa.Column("estornado", sa.Boolean(), nullable=True))
    op.add_column("caixa_lancamentos", sa.Column("estorno_de_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("caixa_lancamentos", "estorno_de_id")
    op.drop_column("caixa_lancamentos", "estornado")
