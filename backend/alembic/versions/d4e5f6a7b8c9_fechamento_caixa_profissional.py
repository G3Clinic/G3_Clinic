"""fechamento de caixa do profissional (assinatura eletronica)

Revision ID: d4e5f6a7b8c9
Revises: 9e15ff1c1bca
Create Date: 2026-08-06

Cria as tabelas fechamentos_caixa, fechamentos_caixa_itens e
assinaturas_eletronicas (app/clinica_models.py) que ja existiam como modelos
SQLAlchemy e eram usadas por app/fechamentos_routes.py, mas nunca tinham uma
migração correspondente — em produção (Postgres, alembic upgrade head) o
endpoint POST /fechamentos/gerar quebrava com
psycopg2.errors.UndefinedTable: relation "fechamentos_caixa" does not exist.
Migração isolada (não usa autogenerate), só as tabelas novas.
"""
from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "9e15ff1c1bca"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fechamentos_caixa",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.Integer(), sa.ForeignKey("empresas.id"), nullable=True),
        sa.Column("medico_id", sa.String(length=36), nullable=False),
        sa.Column("recepcionista_id", sa.String(length=36), nullable=False),
        sa.Column("data_fechamento", sa.Date(), nullable=False),
        sa.Column("valor_total", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("observacao_contestacao", sa.Text(), nullable=True),
        sa.Column("hash_documento", sa.String(length=64), nullable=True),
        sa.Column("pdf_path", sa.String(length=255), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fechamentos_caixa_empresa_id", "fechamentos_caixa", ["empresa_id"])

    op.create_table(
        "fechamentos_caixa_itens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.Integer(), sa.ForeignKey("empresas.id"), nullable=True),
        sa.Column("fechamento_id", sa.String(length=36), sa.ForeignKey("fechamentos_caixa.id"), nullable=False),
        sa.Column("agendamento_id", sa.String(length=36), nullable=True),
        sa.Column("caixa_lancamento_id", sa.String(length=36), nullable=True),
        sa.Column("paciente_nome", sa.String(length=100), nullable=True),
        sa.Column("valor_procedimento", sa.Float(), nullable=True),
        sa.Column("percentual_aplicado", sa.Float(), nullable=True),
        sa.Column("valor_repasse", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fechamentos_caixa_itens_empresa_id", "fechamentos_caixa_itens", ["empresa_id"])
    op.create_index("ix_fechamentos_caixa_itens_fechamento_id", "fechamentos_caixa_itens", ["fechamento_id"])

    op.create_table(
        "assinaturas_eletronicas",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.Integer(), sa.ForeignKey("empresas.id"), nullable=True),
        sa.Column("fechamento_id", sa.String(length=36), sa.ForeignKey("fechamentos_caixa.id"), nullable=False),
        sa.Column("usuario_id", sa.String(length=36), nullable=False),
        sa.Column("papel", sa.String(length=20), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("hash_assinatura", sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_assinaturas_eletronicas_empresa_id", "assinaturas_eletronicas", ["empresa_id"])
    op.create_index("ix_assinaturas_eletronicas_fechamento_id", "assinaturas_eletronicas", ["fechamento_id"])


def downgrade() -> None:
    op.drop_index("ix_assinaturas_eletronicas_fechamento_id", table_name="assinaturas_eletronicas")
    op.drop_index("ix_assinaturas_eletronicas_empresa_id", table_name="assinaturas_eletronicas")
    op.drop_table("assinaturas_eletronicas")

    op.drop_index("ix_fechamentos_caixa_itens_fechamento_id", table_name="fechamentos_caixa_itens")
    op.drop_index("ix_fechamentos_caixa_itens_empresa_id", table_name="fechamentos_caixa_itens")
    op.drop_table("fechamentos_caixa_itens")

    op.drop_index("ix_fechamentos_caixa_empresa_id", table_name="fechamentos_caixa")
    op.drop_table("fechamentos_caixa")
