"""motivo/descricao na anamnese odontologica

Revision ID: a8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-09-11

Pedido do usuário: a anamnese funciona como triagem, mas todo procedimento/
consulta precisa de uma descrição/motivo registrado — respaldo jurídico e
pra o profissional lembrar depois o raciocínio clínico daquela avaliação.
"""
from alembic import op
import sqlalchemy as sa

revision = "a8b9c0d1e2f3"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("anamnese_odonto", sa.Column("motivo", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("anamnese_odonto", "motivo")
