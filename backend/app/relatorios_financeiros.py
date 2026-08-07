"""
KPIs financeiros para o Dashboard Financeiro.

Adaptação, para o schema real deste sistema, do guia "KPIs Financeiros para
Gestão de Clínicas Multiprofissionais". O guia foi escrito em cima de nomes
de tabela que já batem quase 1:1 com o schema daqui (recebimentos,
agendamentos, procedimentos, custos_operacionais, repasses_profissionais,
repasses_recepcionistas, caixa_turnos, orcamentos) — mas aqui é
FastAPI + SQLAlchemy (SQLite local / Postgres no Railway), não Supabase/PG
puro, então os cálculos são feitos em Python sobre os dados filtrados, em
vez de SQL com date_trunc/FILTER (que não existem em SQLite).

Diferenças conscientes em relação ao guia original:
  - unidade_id aqui já é Integer em todas as tabelas envolvidas (não há a
    inconsistência texto/UUID que o guia alertava — não se aplica).
  - "Realizado" no guia corresponde a status == "Finalizado" neste sistema.
  - Taxa de Conversão de Orçamentos (KPI 13 do guia): orcamentos.status_geral
    hoje só é usado como "Finalizado" (não existe fluxo de
    aprovado/pendente/recusado) — por isso é reportado apenas o volume,
    sem taxa de conversão fictícia.
  - Taxa de Ocupação da Agenda (KPI 14): não existe tabela de capacidade
    (horários configurados) — é reportada uma proxy (comparecimento =
    Finalizado ÷ não-cancelados), sinalizada como tal na resposta.
  - Fechamento de Caixa Diário (KPI 12): recebimentos já carregam
    caixa_turno_id na baixa — usado direto, sem o join por data do guia.
"""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from .database import get_db
from .auth import require_modulo
from . import clinica_models as cm

router = APIRouter(prefix="/api/relatorios", tags=["Relatórios Financeiros"])


def _periodo(data_inicio: Optional[str], data_fim: Optional[str]):
    if data_fim:
        fim = date.fromisoformat(data_fim)
    else:
        fim = date.today()
    if data_inicio:
        inicio = date.fromisoformat(data_inicio)
    else:
        inicio = fim.replace(day=1)
    return inicio, fim


@router.get("/kpis-financeiros")
def kpis_financeiros(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    user: cm.PerfilUsuario = Depends(require_modulo("financeiro")),
    db: Session = Depends(get_db),
    x_filial_id: Optional[int] = Header(default=None, alias="X-Filial-Id"),
):
    empresa_id = user.empresa_id
    inicio, fim = _periodo(data_inicio, data_fim)

    def base(model):
        return db.query(model).filter(model.empresa_id == empresa_id)

    # ── 1/2. Faturamento bruto + ticket médio ──────────────────────────
    recebidos_q = base(cm.Recebimento).filter(
        cm.Recebimento.status == "RECEBIDO",
        cm.Recebimento.data_recebimento >= inicio,
        cm.Recebimento.data_recebimento <= fim,
    )
    if x_filial_id is not None:
        recebidos_q = recebidos_q.filter(cm.Recebimento.unidade_id == x_filial_id)
    recebidos = recebidos_q.all()

    faturamento_bruto = sum(r.valor or 0 for r in recebidos)
    qtd_recebimentos = len(recebidos)
    atendimentos_distintos = len({r.agendamento_id for r in recebidos if r.agendamento_id}) or qtd_recebimentos
    ticket_medio = round(faturamento_bruto / atendimentos_distintos, 2) if atendimentos_distintos else 0

    # ── 3. Receita por profissional ────────────────────────────────────
    agendamento_ids = {r.agendamento_id for r in recebidos if r.agendamento_id}
    agendamentos_map = {}
    if agendamento_ids:
        for a in db.query(cm.Agendamento).filter(cm.Agendamento.id.in_(agendamento_ids)).all():
            agendamentos_map[a.id] = a

    profissionais_ids = {a.profissional_id for a in agendamentos_map.values() if a.profissional_id}
    profissionais_map = {}
    if profissionais_ids:
        for pu in db.query(cm.PerfilUsuario).filter(cm.PerfilUsuario.id.in_(profissionais_ids)).all():
            profissionais_map[pu.id] = pu.nome

    receita_por_profissional = {}
    for r in recebidos:
        ag = agendamentos_map.get(r.agendamento_id) if r.agendamento_id else None
        prof_id = ag.profissional_id if ag else None
        if not prof_id:
            continue
        acc = receita_por_profissional.setdefault(prof_id, {"profissional_id": prof_id, "profissional": profissionais_map.get(prof_id, "—"), "receita": 0.0, "atendimentos": 0})
        acc["receita"] += r.valor or 0
        acc["atendimentos"] += 1
    receita_por_profissional = sorted(receita_por_profissional.values(), key=lambda x: -x["receita"])

    # ── 4. Receita por convênio vs particular ──────────────────────────
    convenio_ids = {r.convenio_id for r in recebidos if r.convenio_id}
    convenios_map = {}
    if convenio_ids:
        for c in db.query(cm.Convenio).filter(cm.Convenio.id.in_(convenio_ids)).all():
            convenios_map[c.id] = c.nome

    receita_por_convenio = {}
    for r in recebidos:
        origem = convenios_map.get(r.convenio_id, "Particular") if r.convenio_id else "Particular"
        acc = receita_por_convenio.setdefault(origem, {"origem": origem, "receita": 0.0})
        acc["receita"] += r.valor or 0
    receita_por_convenio = sorted(receita_por_convenio.values(), key=lambda x: -x["receita"])
    for item in receita_por_convenio:
        item["pct"] = round(100 * item["receita"] / faturamento_bruto, 1) if faturamento_bruto else 0

    # ── 5. Receita por unidade (todas as filiais da empresa, sem filtro) ──
    recebidos_todas_unidades = base(cm.Recebimento).filter(
        cm.Recebimento.status == "RECEBIDO",
        cm.Recebimento.data_recebimento >= inicio,
        cm.Recebimento.data_recebimento <= fim,
    ).all()
    unidades_map = {u.id: (u.nome_fantasia or u.razao_social or f"Unidade {u.id}") for u in db.query(cm.Unidade).filter(cm.Unidade.empresa_id == empresa_id).all()}
    receita_por_unidade = {}
    for r in recebidos_todas_unidades:
        uid = r.unidade_id
        nome = unidades_map.get(uid, "Sem unidade")
        acc = receita_por_unidade.setdefault(uid, {"unidade_id": uid, "unidade": nome, "receita": 0.0})
        acc["receita"] += r.valor or 0
    receita_por_unidade = sorted(receita_por_unidade.values(), key=lambda x: -x["receita"])

    # ── 6. % Repasse sobre faturamento ──────────────────────────────────
    repasses_q = base(cm.RepasseProfissional).filter(
        cm.RepasseProfissional.periodo_ini <= fim,
        cm.RepasseProfissional.periodo_fim >= inicio,
    )
    if x_filial_id is not None:
        repasses_q = repasses_q.filter(cm.RepasseProfissional.unidade_id == x_filial_id)
    repasses = repasses_q.all()
    total_faturado_repasse = sum(r.valor_faturado or 0 for r in repasses)
    total_repassado = sum(r.valor_repasse or 0 for r in repasses)
    pct_repasse = round(100 * total_repassado / total_faturado_repasse, 1) if total_faturado_repasse else 0

    # ── 7. Custos operacionais por categoria ────────────────────────────
    custos_q = base(cm.CustoOperacional).filter(
        cm.CustoOperacional.data_lancamento >= inicio,
        cm.CustoOperacional.data_lancamento <= fim,
    )
    if x_filial_id is not None:
        custos_q = custos_q.filter(cm.CustoOperacional.unidade_id == x_filial_id)
    custos = custos_q.all()
    custos_por_categoria = {}
    for c in custos:
        cat = c.categoria or "Sem categoria"
        custos_por_categoria[cat] = custos_por_categoria.get(cat, 0.0) + (c.valor or 0)
    custos_por_categoria = sorted(
        [{"categoria": k, "total": v} for k, v in custos_por_categoria.items()], key=lambda x: -x["total"]
    )
    total_custos = sum(c.valor or 0 for c in custos)

    # ── 8. Repasse a recepcionistas ─────────────────────────────────────
    repasse_recep_q = base(cm.RepasseRecepcionista).filter(
        cm.RepasseRecepcionista.competencia >= inicio,
        cm.RepasseRecepcionista.competencia <= fim,
    )
    if x_filial_id is not None:
        repasse_recep_q = repasse_recep_q.filter(cm.RepasseRecepcionista.unidade_id == x_filial_id)
    repasses_recep = repasse_recep_q.all()
    total_repasse_recep = sum(r.valor or 0 for r in repasses_recep)
    qtd_pendentes_recep = sum(1 for r in repasses_recep if (r.status or "").lower() == "pendente")

    # ── 9. Margem de contribuição por procedimento ──────────────────────
    proc_q = base(cm.Procedimento).filter(cm.Procedimento.ativo.is_(True))
    if x_filial_id is not None:
        proc_q = proc_q.filter((cm.Procedimento.unidade_id == x_filial_id) | (cm.Procedimento.unidade_id.is_(None)))
    margem_por_procedimento = []
    for p in proc_q.all():
        valor_padrao = p.valor_padrao or 0
        if (p.tipo_repasse or "fixo") == "percentual":
            valor_repasse_efetivo = valor_padrao * (p.valor_repasse or 0) / 100
        else:
            valor_repasse_efetivo = p.valor_repasse or 0
        margem_abs = valor_padrao - valor_repasse_efetivo
        margem_pct = round(100 * margem_abs / valor_padrao, 1) if valor_padrao else 0
        margem_por_procedimento.append({
            "id": p.id, "nome": p.nome, "valor_padrao": valor_padrao,
            "valor_repasse_efetivo": round(valor_repasse_efetivo, 2),
            "margem_absoluta": round(margem_abs, 2), "margem_pct": margem_pct,
        })
    margem_por_procedimento.sort(key=lambda x: x["margem_pct"])

    # ── 10. DRE simplificado ─────────────────────────────────────────────
    resultado_liquido = faturamento_bruto - total_repassado - total_repasse_recep - total_custos
    margem_liquida_pct = round(100 * resultado_liquido / faturamento_bruto, 1) if faturamento_bruto else 0
    dre = {
        "receita_bruta": round(faturamento_bruto, 2),
        "repasse_profissionais": round(total_repassado, 2),
        "repasse_recepcionistas": round(total_repasse_recep, 2),
        "custos_operacionais": round(total_custos, 2),
        "resultado_liquido": round(resultado_liquido, 2),
        "margem_liquida_pct": margem_liquida_pct,
    }

    # ── 11. Taxa de inadimplência ─────────────────────────────────────────
    ag_realizados_q = base(cm.Agendamento).filter(
        cm.Agendamento.status == "Finalizado",
        cm.Agendamento.data_agendamento >= inicio,
        cm.Agendamento.data_agendamento <= fim,
    )
    if x_filial_id is not None:
        ag_realizados_q = ag_realizados_q.filter(cm.Agendamento.unidade_id == x_filial_id)
    ag_realizados = ag_realizados_q.all()
    valor_cobrado_total = sum(a.valor_cobrado or 0 for a in ag_realizados)
    ag_ids_realizados = {a.id for a in ag_realizados}
    recebido_desses = db.query(cm.Recebimento).filter(
        cm.Recebimento.empresa_id == empresa_id,
        cm.Recebimento.agendamento_id.in_(ag_ids_realizados),
        cm.Recebimento.status == "RECEBIDO",
    ).all() if ag_ids_realizados else []
    valor_recebido_desses = sum(r.valor or 0 for r in recebido_desses)
    valor_pendente = valor_cobrado_total - valor_recebido_desses
    taxa_inadimplencia_pct = round(100 * valor_pendente / valor_cobrado_total, 1) if valor_cobrado_total else 0
    inadimplencia = {
        "atendimentos_realizados": len(ag_realizados),
        "valor_cobrado": round(valor_cobrado_total, 2),
        "valor_recebido": round(valor_recebido_desses, 2),
        "valor_pendente": round(valor_pendente, 2),
        "taxa_pct": taxa_inadimplencia_pct,
    }

    # ── 12. Fechamento de caixa diário (via caixa_turno_id no recebimento) ──
    turnos_q = base(cm.CaixaTurno).filter(
        cm.CaixaTurno.data_abertura >= inicio,
        cm.CaixaTurno.data_abertura <= fim + timedelta(days=1),
    )
    if x_filial_id is not None:
        turnos_q = turnos_q.filter(cm.CaixaTurno.unidade_id == x_filial_id)
    turnos = turnos_q.order_by(cm.CaixaTurno.data_abertura.desc()).limit(31).all()
    turno_ids = [t.id for t in turnos]
    recebidos_por_turno = {}
    if turno_ids:
        for r in db.query(cm.Recebimento).filter(
            cm.Recebimento.empresa_id == empresa_id,
            cm.Recebimento.caixa_turno_id.in_(turno_ids),
            cm.Recebimento.status == "RECEBIDO",
        ).all():
            recebidos_por_turno[r.caixa_turno_id] = recebidos_por_turno.get(r.caixa_turno_id, 0.0) + (r.valor or 0)
    recepcionistas_ids = {t.recepcionista_id for t in turnos if t.recepcionista_id}
    recepcionistas_map = {}
    if recepcionistas_ids:
        for pu in db.query(cm.PerfilUsuario).filter(cm.PerfilUsuario.id.in_(recepcionistas_ids)).all():
            recepcionistas_map[pu.id] = pu.nome
    fechamentos_caixa_diario = [{
        "turno_id": t.id,
        "unidade_id": t.unidade_id,
        "recepcionista": recepcionistas_map.get(t.recepcionista_id, "—"),
        "data_abertura": t.data_abertura.isoformat() if t.data_abertura else None,
        "data_fechamento": t.data_fechamento.isoformat() if t.data_fechamento else None,
        "status_auditoria": t.status_auditoria,
        "total_recebido_no_turno": round(recebidos_por_turno.get(t.id, 0.0), 2),
    } for t in turnos]

    # ── 13. Orçamentos (volume — sem funil de conversão real hoje) ───────
    orc_q = base(cm.Orcamento).filter(
        cm.Orcamento.data_criacao >= inicio,
        cm.Orcamento.data_criacao <= fim + timedelta(days=1),
    )
    if x_filial_id is not None:
        orc_q = orc_q.filter(cm.Orcamento.unidade_id == x_filial_id)
    orcamentos = orc_q.all()
    orcamentos_info = {
        "quantidade": len(orcamentos),
        "valor_total": round(sum(o.valor_total or 0 for o in orcamentos), 2),
        "observacao": "Sistema ainda não registra status de aprovação/recusa de orçamento — mostrando apenas volume emitido.",
    }

    # ── 14. Ocupação da agenda (proxy: comparecimento) ──────────────────
    ag_periodo_q = base(cm.Agendamento).filter(
        cm.Agendamento.data_agendamento >= inicio,
        cm.Agendamento.data_agendamento <= fim,
    )
    if x_filial_id is not None:
        ag_periodo_q = ag_periodo_q.filter(cm.Agendamento.unidade_id == x_filial_id)
    ag_periodo = ag_periodo_q.all()
    nao_cancelados = [a for a in ag_periodo if a.status not in ("Cancelado", "Falta")]
    finalizados = [a for a in nao_cancelados if a.status == "Finalizado"]
    ocupacao_pct = round(100 * len(finalizados) / len(nao_cancelados), 1) if nao_cancelados else 0
    ocupacao_agenda = {
        "atendimentos_finalizados": len(finalizados),
        "agendamentos_nao_cancelados": len(nao_cancelados),
        "taxa_comparecimento_pct": ocupacao_pct,
        "observacao": "Proxy de ocupação (comparecimento) — não há tabela de capacidade/horários configurados para medir ocupação real da agenda.",
    }

    # ── 15. Taxa de cancelamento / no-show ────────────────────────────────
    cancelados = [a for a in ag_periodo if a.status in ("Cancelado", "Falta")]
    taxa_cancelamento_pct = round(100 * len(cancelados) / len(ag_periodo), 1) if ag_periodo else 0
    cancelamento = {
        "cancelados": len(cancelados),
        "total_agendamentos": len(ag_periodo),
        "taxa_pct": taxa_cancelamento_pct,
    }

    return {
        "periodo": {"inicio": inicio.isoformat(), "fim": fim.isoformat()},
        "faturamento_bruto": {"total": round(faturamento_bruto, 2), "qtd_recebimentos": qtd_recebimentos},
        "ticket_medio": ticket_medio,
        "receita_por_profissional": receita_por_profissional,
        "receita_por_convenio": receita_por_convenio,
        "receita_por_unidade": receita_por_unidade,
        "pct_repasse": {"faturamento_base": round(total_faturado_repasse, 2), "total_repassado": round(total_repassado, 2), "pct": pct_repasse},
        "custos_por_categoria": custos_por_categoria,
        "custos_total": round(total_custos, 2),
        "repasse_recepcionistas": {"total": round(total_repasse_recep, 2), "qtd_pendentes": qtd_pendentes_recep},
        "margem_por_procedimento": margem_por_procedimento,
        "dre": dre,
        "inadimplencia": inadimplencia,
        "fechamentos_caixa_diario": fechamentos_caixa_diario,
        "orcamentos": orcamentos_info,
        "ocupacao_agenda": ocupacao_agenda,
        "cancelamento": cancelamento,
    }
