import { useState, useEffect, useCallback } from 'react';
import { DollarSign, FileText, TrendingUp, TrendingDown, AlertTriangle, Percent, Loader2, Search, Calendar } from 'lucide-react';
import { Card, Btn, StatsCard, InputField } from '../../../components/ui/shared';
import { relatoriosFinanceirosApi, type APIKpisFinanceiros } from '../../../services/api';

const primeiroDiaMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const hojeISO = () => new Date().toISOString().slice(0, 10);
const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function KpisFinanceirosPanel() {
  const [de, setDe] = useState(primeiroDiaMes());
  const [ate, setAte] = useState(hojeISO());
  const [dados, setDados] = useState<APIKpisFinanceiros | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    setErro('');
    relatoriosFinanceirosApi.kpis(de, ate)
      .then(setDados)
      .catch(e => setErro(e instanceof Error ? e.message : 'Erro ao carregar KPIs financeiros.'))
      .finally(() => setLoading(false));
  }, [de, ate]);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <Card padding={false} className="bg-white border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex gap-2">
          <Btn variant="secondary" size="sm" onClick={() => { setDe(hojeISO()); setAte(hojeISO()); }}>Hoje</Btn>
          <Btn variant="secondary" size="sm" onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - 7);
            setDe(d.toISOString().slice(0, 10)); setAte(hojeISO());
          }}>7 Dias</Btn>
          <Btn variant="secondary" size="sm" onClick={() => { setDe(primeiroDiaMes()); setAte(hojeISO()); }}>Mês Atual</Btn>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <InputField label="De" type="date" value={de} onChange={e => setDe(e.target.value)} />
          <InputField label="Até" type="date" value={ate} onChange={e => setAte(e.target.value)} />
          <Btn icon={loading ? Loader2 : Search} className="w-full justify-center" onClick={carregar} disabled={loading}>
            {loading ? 'Carregando...' : 'Atualizar'}
          </Btn>
        </div>
      </Card>

      {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{erro}</div>}

      {loading && !dados ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Calculando indicadores...
        </div>
      ) : dados && (
        <>
          {/* KPIs principais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
            <StatsCard icon={DollarSign} label="Faturamento Bruto" value={brl(dados.faturamento_bruto.total)} color="green" />
            <StatsCard icon={FileText} label="Ticket Médio" value={brl(dados.ticket_medio)} color="blue" />
            <StatsCard icon={Percent} label="% Repasse Médico" value={`${dados.pct_repasse.pct}%`} color="gray" />
            <StatsCard icon={TrendingUp} label="Resultado Líquido" value={brl(dados.dre.resultado_liquido)} color={dados.dre.resultado_liquido >= 0 ? 'green' : 'red'} />
            <StatsCard icon={TrendingDown} label="Margem Líquida" value={`${dados.dre.margem_liquida_pct}%`} color={dados.dre.margem_liquida_pct >= 0 ? 'green' : 'red'} />
            <StatsCard icon={AlertTriangle} label="Inadimplência" value={`${dados.inadimplencia.taxa_pct}%`} color={dados.inadimplencia.taxa_pct > 15 ? 'red' : 'gray'} />
            <StatsCard icon={Calendar} label="Cancelamento/Falta" value={`${dados.cancelamento.taxa_pct}%`} color={dados.cancelamento.taxa_pct > 15 ? 'red' : 'gray'} />
          </div>

          {/* DRE simplificado */}
          <Card title="DRE Simplificado">
            <div className="space-y-2">
              <div className="flex justify-between items-center"><span className="text-sm font-semibold text-slate-600">Receita Bruta</span><span className="font-bold text-slate-800">{brl(dados.dre.receita_bruta)}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-slate-500">↳ Repasse a Profissionais</span><span className="text-red-500 font-semibold">- {brl(dados.dre.repasse_profissionais)}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-slate-500">↳ Repasse a Recepcionistas</span><span className="text-red-500 font-semibold">- {brl(dados.dre.repasse_recepcionistas)}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-slate-500">↳ Custos Operacionais</span><span className="text-red-500 font-semibold">- {brl(dados.dre.custos_operacionais)}</span></div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                <span className="text-base font-black text-slate-800">Resultado Líquido</span>
                <span className={`text-xl font-black px-3 py-1 rounded-lg ${dados.dre.resultado_liquido >= 0 ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100'}`}>{brl(dados.dre.resultado_liquido)}</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receita por profissional */}
            <Card title="Receita por Profissional">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr><th className="px-3 py-2">Profissional</th><th className="px-3 py-2 text-center">Atend.</th><th className="px-3 py-2 text-right">Receita</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dados.receita_por_profissional.length === 0 ? <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">Sem dados no período.</td></tr>
                      : dados.receita_por_profissional.map(p => (
                        <tr key={p.profissional_id}><td className="px-3 py-2 font-semibold text-slate-700">{p.profissional}</td><td className="px-3 py-2 text-center text-slate-500">{p.atendimentos}</td><td className="px-3 py-2 text-right font-bold text-slate-800">{brl(p.receita)}</td></tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Receita por convênio */}
            <Card title="Receita: Convênio vs. Particular">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr><th className="px-3 py-2">Origem</th><th className="px-3 py-2 text-center">%</th><th className="px-3 py-2 text-right">Receita</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dados.receita_por_convenio.length === 0 ? <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">Sem dados no período.</td></tr>
                      : dados.receita_por_convenio.map(c => (
                        <tr key={c.origem}><td className="px-3 py-2 font-semibold text-slate-700">{c.origem}</td><td className="px-3 py-2 text-center text-slate-500">{c.pct}%</td><td className="px-3 py-2 text-right font-bold text-slate-800">{brl(c.receita)}</td></tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Receita por unidade */}
            <Card title="Receita por Unidade">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr><th className="px-3 py-2">Unidade</th><th className="px-3 py-2 text-right">Receita</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dados.receita_por_unidade.length === 0 ? <tr><td colSpan={2} className="px-3 py-6 text-center text-slate-400">Sem dados no período.</td></tr>
                      : dados.receita_por_unidade.map(u => (
                        <tr key={u.unidade_id ?? 'sem-unidade'}><td className="px-3 py-2 font-semibold text-slate-700">{u.unidade}</td><td className="px-3 py-2 text-right font-bold text-slate-800">{brl(u.receita)}</td></tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Custos por categoria */}
            <Card title="Custos Operacionais por Categoria">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr><th className="px-3 py-2">Categoria</th><th className="px-3 py-2 text-right">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dados.custos_por_categoria.length === 0 ? <tr><td colSpan={2} className="px-3 py-6 text-center text-slate-400">Nenhum custo lançado no período.</td></tr>
                      : dados.custos_por_categoria.map(c => (
                        <tr key={c.categoria}><td className="px-3 py-2 font-semibold text-slate-700">{c.categoria}</td><td className="px-3 py-2 text-right font-bold text-slate-800">{brl(c.total)}</td></tr>
                      ))}
                  </tbody>
                  {dados.custos_por_categoria.length > 0 && (
                    <tfoot><tr className="border-t border-gray-200"><td className="px-3 py-2 font-bold text-slate-800">Total</td><td className="px-3 py-2 text-right font-bold text-slate-800">{brl(dados.custos_total)}</td></tr></tfoot>
                  )}
                </table>
              </div>
            </Card>
          </div>

          {/* Margem de contribuição por procedimento */}
          <Card title="Margem de Contribuição por Procedimento">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                  <tr><th className="px-3 py-2">Procedimento</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-right">Repasse</th><th className="px-3 py-2 text-right">Margem</th><th className="px-3 py-2 text-right">Margem %</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dados.margem_por_procedimento.length === 0 ? <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Nenhum procedimento cadastrado.</td></tr>
                    : dados.margem_por_procedimento.map(p => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-semibold text-slate-700">{p.nome}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{brl(p.valor_padrao)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{brl(p.valor_repasse_efetivo)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">{brl(p.margem_absoluta)}</td>
                        <td className={`px-3 py-2 text-right font-bold ${p.margem_pct < 30 ? 'text-red-500' : 'text-emerald-600'}`}>{p.margem_pct}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Fechamento de caixa diário */}
          <Card title="Fechamento de Caixa por Turno">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                  <tr><th className="px-3 py-2">Abertura</th><th className="px-3 py-2">Fechamento</th><th className="px-3 py-2">Recepcionista</th><th className="px-3 py-2">Auditoria</th><th className="px-3 py-2 text-right">Total Recebido</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dados.fechamentos_caixa_diario.length === 0 ? <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Nenhum turno de caixa no período.</td></tr>
                    : dados.fechamentos_caixa_diario.map(t => (
                      <tr key={t.turno_id}>
                        <td className="px-3 py-2 text-slate-600">{t.data_abertura ? new Date(t.data_abertura).toLocaleString('pt-BR') : '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{t.data_fechamento ? new Date(t.data_fechamento).toLocaleString('pt-BR') : 'Aberto'}</td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{t.recepcionista}</td>
                        <td className="px-3 py-2 text-slate-500">{t.status_auditoria || '—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">{brl(t.total_recebido_no_turno)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card title="Orçamentos Emitidos">
              <div className="flex items-center justify-between">
                <div><p className="text-2xl font-black text-slate-800">{dados.orcamentos.quantidade}</p><p className="text-xs text-slate-500 mt-0.5">orçamentos no período</p></div>
                <div className="text-right"><p className="text-2xl font-black text-brand-primary">{brl(dados.orcamentos.valor_total)}</p><p className="text-xs text-slate-500 mt-0.5">valor total</p></div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 italic">{dados.orcamentos.observacao}</p>
            </Card>

            <Card title="Ocupação da Agenda (proxy)">
              <div className="flex items-center justify-between">
                <div><p className="text-2xl font-black text-slate-800">{dados.ocupacao_agenda.taxa_comparecimento_pct}%</p><p className="text-xs text-slate-500 mt-0.5">taxa de comparecimento</p></div>
                <div className="text-right"><p className="text-sm font-bold text-slate-600">{dados.ocupacao_agenda.atendimentos_finalizados} / {dados.ocupacao_agenda.agendamentos_nao_cancelados}</p><p className="text-xs text-slate-500 mt-0.5">finalizados / agendados</p></div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 italic">{dados.ocupacao_agenda.observacao}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
