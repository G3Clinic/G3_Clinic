"""caderneta de vacinas (FHIR Immunization local)

Revision ID: b1f2a3c4d5e6
Revises: 49998e323487
Create Date: 2026-07-14

Cria a tabela caderneta_vacinas. Migração isolada (não usa autogenerate) para
adicionar apenas a nova tabela, sem risco de capturar drift de outros modelos.
"""
from alembic import op
import sqlalchemy as sa

revision = "b1f2a3c4d5e6"
down_revision = "49998e323487"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "caderneta_vacinas",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("empresa_id", sa.Integer(), sa.ForeignKey("empresas.id"), nullable=True),
        sa.Column("paciente_id", sa.Integer(), nullable=True),
        sa.Column("vacina", sa.String(), nullable=True),
        sa.Column("dose", sa.String(), nullable=True),
        sa.Column("data_aplicacao", sa.Date(), nullable=True),
        sa.Column("lote", sa.String(), nullable=True),
        sa.Column("fabricante", sa.String(), nullable=True),
        sa.Column("via", sa.String(), nullable=True),
        sa.Column("local_aplicacao", sa.String(), nullable=True),
        sa.Column("aplicador", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_caderneta_vacinas_empresa_id", "caderneta_vacinas", ["empresa_id"])
    op.create_index("ix_caderneta_vacinas_paciente_id", "caderneta_vacinas", ["paciente_id"])


def downgrade() -> None:
    op.drop_index("ix_caderneta_vacinas_paciente_id", table_name="caderneta_vacinas")
    op.drop_index("ix_caderneta_vacinas_empresa_id", table_name="caderneta_vacinas")
    op.drop_table("caderneta_vacinas")
