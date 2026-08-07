"""pdf do fechamento salvo no banco (disco do Railway e efemero)

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-08-07

O PDF do fechamento assinado era escrito em uploads/recibos/ (disco local
do container). Toda vez que o Railway reimplanta (a cada git push), esse
arquivo some — pdf_path no banco continua apontando pra um caminho morto,
e o download passa a falhar com "PDF não encontrado". Mesmo problema já
resolvido antes pra logo da clínica (commit 8d715d6): guardar o conteúdo
no banco em vez de depender do filesystem.
"""
from alembic import op
import sqlalchemy as sa

revision = "a7b8c9d0e1f2"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fechamentos_caixa", sa.Column("pdf_bytes", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column("fechamentos_caixa", "pdf_bytes")
