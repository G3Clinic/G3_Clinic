"""backfill: competencia dos repasses "Valor Fixo Mensal" existentes

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-08-07

Bug: o DRE de Relatórios somava TODO repasse "Valor Fixo Mensal" existente,
em qualquer período selecionado (Hoje, 7 dias, mês atual...), porque o
formulário de cadastro nunca preenchia a coluna competencia (Date) que já
existia no modelo — só o texto livre "referencia" (ex.: "Julho/2025").
Sem uma data de verdade pra comparar com o período do relatório, o cálculo
somava tudo sempre, inflando/distorcendo o DRE dependendo de quantos meses
de repasse já existiam cadastrados.

Fix de código: Relatórios agora só soma um repasse mensal se sua
competencia cair dentro do período do filtro; e o cadastro passou a exigir
competencia obrigatória no formulário.

Este backfill tenta recuperar a competencia dos registros já existentes,
lendo o texto livre de referencia (ex.: "Julho/2025", "julho/25",
"Julho 2025") — registros cujo texto não bate com nenhum padrão reconhecido
ficam com competencia NULL (não entram em nenhum período do relatório até
serem reeditados manualmente, o que é seguro: melhor sumir do relatório do
que continuar contando errado).
"""
import re
from datetime import date

from alembic import op
import sqlalchemy as sa

revision = "d5e6f7a8b9c0"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None

MESES = {
    "janeiro": 1, "jan": 1, "fevereiro": 2, "fev": 2, "março": 3, "marco": 3, "mar": 3,
    "abril": 4, "abr": 4, "maio": 5, "mai": 5, "junho": 6, "jun": 6, "julho": 7, "jul": 7,
    "agosto": 8, "ago": 8, "setembro": 9, "set": 9, "outubro": 10, "out": 10,
    "novembro": 11, "nov": 11, "dezembro": 12, "dez": 12,
}
PADRAO = re.compile(r"([a-zçã\.]+)\s*[/\- ]\s*(\d{2,4})", re.IGNORECASE)


def _parse_competencia(referencia: str):
    if not referencia:
        return None
    m = PADRAO.search(referencia.strip())
    if not m:
        return None
    nome_mes = m.group(1).lower().strip(".")
    ano_txt = m.group(2)
    mes = MESES.get(nome_mes)
    if not mes:
        return None
    ano = int(ano_txt)
    if ano < 100:
        ano += 2000
    if ano < 2000 or ano > 2100:
        return None
    return date(ano, mes, 1)


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        "SELECT id, referencia FROM repasses_recepcionistas "
        "WHERE competencia IS NULL AND tipo = 'Valor Fixo Mensal'"
    )).fetchall()
    for row_id, referencia in rows:
        competencia = _parse_competencia(referencia or "")
        if competencia is not None:
            conn.execute(
                sa.text("UPDATE repasses_recepcionistas SET competencia = :c WHERE id = :id"),
                {"c": competencia, "id": row_id},
            )


def downgrade() -> None:
    # Backfill de dados: não reverte (não dá pra distinguir o que foi
    # preenchido por este backfill do que foi editado manualmente depois).
    pass
