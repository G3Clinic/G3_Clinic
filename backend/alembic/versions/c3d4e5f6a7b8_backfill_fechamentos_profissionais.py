"""backfill: concede 'fechamentos' a profissionais de saude que ja tem prontuario

Revision ID: c3d4e5f6a7b8
Revises: a7b8c9d0e1f2
Create Date: 2026-08-07

O modulo "Meus Fechamentos" foi criado depois que varios profissionais de
saude ja existiam no sistema. A lista de modulos padrao por papel (usada
so na tela de Cadastro de Usuarios, ao criar/trocar o papel de um usuario)
foi atualizada para incluir "fechamentos" em profissional_saude, mas isso
so vale para usuarios criados/editados dali pra frente -- quem ja existia
continua sem a permissao gravada em usuario_permissoes, e o admin precisa
marcar manualmente pra cada um.

Este backfill concede "fechamentos" automaticamente para todo usuario com
role='profissional_saude' que ja tem "prontuario" liberado numa filial
(ou seja, ja usa o sistema normalmente naquela unidade) e ainda nao tem
"fechamentos" na mesma filial. Nao mexe em quem nunca teve prontuario
liberado (perfis desativados/incompletos) nem em outros papeis -- dono e
administrador ja tem acesso total independente de checkbox (bypass em
require_modulo).
"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("""
        INSERT INTO usuario_permissoes (empresa_id, usuario_id, unidade_id, modulo, criado_em)
        SELECT up.empresa_id, up.usuario_id, up.unidade_id, 'fechamentos', CURRENT_TIMESTAMP
        FROM usuario_permissoes up
        JOIN perfis_usuarios pu ON pu.id = up.usuario_id
        WHERE up.modulo = 'prontuario'
          AND pu.role = 'profissional_saude'
          AND NOT EXISTS (
              SELECT 1 FROM usuario_permissoes fp
              WHERE fp.usuario_id = up.usuario_id
                AND fp.unidade_id = up.unidade_id
                AND fp.modulo = 'fechamentos'
          )
    """))


def downgrade() -> None:
    # Backfill de dados: não reverte (não dá pra distinguir o que era
    # backfill do que foi marcado manualmente depois).
    pass
