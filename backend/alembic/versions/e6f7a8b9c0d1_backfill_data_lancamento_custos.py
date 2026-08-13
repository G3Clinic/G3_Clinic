"""backfill: data_lancamento dos custos operacionais existentes

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-08-13

Mesma classe de bug do backfill de competencia dos repasses de recepção
(d5e6f7a8b9c0): o DRE de Relatórios somava TODO custo operacional
cadastrado, em qualquer período selecionado, porque data_lancamento nunca
era preenchido pelo formulário de Despesas — só ficava a coluna criada,
sem uso. Corrigido no código (Relatórios agora filtra custos por
data_lancamento dentro do período; Despesas passou a exigir a data no
formulário).

Este backfill usa created_at (data em que o registro foi de fato criado no
sistema) como data_lancamento pra quem ainda está NULL — é a melhor
aproximação disponível pra não fazer despesas antigas somem do DRE.
"""
from alembic import op
import sqlalchemy as sa

revision = "e6f7a8b9c0d1"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # SQLite (local) tem date(); Postgres (produção) usa CAST — não são portáveis entre si.
    expr = "date(created_at)" if conn.dialect.name == "sqlite" else "CAST(created_at AS DATE)"
    conn.execute(sa.text(
        f"UPDATE custos_operacionais SET data_lancamento = {expr} "
        "WHERE data_lancamento IS NULL AND created_at IS NOT NULL"
    ))


def downgrade() -> None:
    # Backfill de dados: não reverte.
    pass
