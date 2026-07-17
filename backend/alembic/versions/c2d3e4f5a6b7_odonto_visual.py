"""odontograma visual — tipo_visual e status_visual

Revision ID: c2d3e4f5a6b7
Revises: b1f2a3c4d5e6
Create Date: 2026-07-15

Garante as colunas visuais do odontograma:
  - odonto_procedimentos.tipo_visual  (símbolo: carie, restauracao, canal, coroa, extracao, ausente…)
  - orcamento_itens.status_visual     (a_realizar / executado / existente)

Idempotente e agnóstico de banco (SQLite/Postgres): só adiciona a coluna se ela
ainda NÃO existir. A migração inicial já pode ter criado essas colunas (o schema
inicial reflete os modelos atuais), então em bancos novos aqui é no-op.
"""
from alembic import op
import sqlalchemy as sa

revision = "c2d3e4f5a6b7"
down_revision = "b1f2a3c4d5e6"
branch_labels = None
depends_on = None


def _tem_coluna(insp, tabela: str, coluna: str) -> bool:
    try:
        return any(c["name"] == coluna for c in insp.get_columns(tabela))
    except Exception:
        return False


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    if not _tem_coluna(insp, "odonto_procedimentos", "tipo_visual"):
        op.add_column("odonto_procedimentos", sa.Column("tipo_visual", sa.String(), server_default="nenhum"))
    if not _tem_coluna(insp, "orcamento_itens", "status_visual"):
        op.add_column("orcamento_itens", sa.Column("status_visual", sa.String(), server_default="a_realizar"))


def downgrade() -> None:
    insp = sa.inspect(op.get_bind())
    if _tem_coluna(insp, "orcamento_itens", "status_visual"):
        op.drop_column("orcamento_itens", "status_visual")
    if _tem_coluna(insp, "odonto_procedimentos", "tipo_visual"):
        op.drop_column("odonto_procedimentos", "tipo_visual")
