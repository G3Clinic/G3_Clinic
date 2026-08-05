import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Lock, Calendar, Plus, TrendingUp, X } from 'lucide-react';
import { PageHeader, Card, Btn, InputField, SelectField } from '../../../components/ui/shared';
import { procedimentosApi, finLancamentosApi, type APIProcedimento, type APIFinLancamento } from '../../../services/api';

const mesAtual = () => new Date().toISOString().slice(0, 7);

export function FinDashboardPage() {
  const [mes, setMes] = useState(mesAtual());
  const [procedimentos, setProcedimentos] = useState<APIProcedimento[]>([]);
  const [lancamentos, setLancamentos] = useState<APIFinLancamento[]>([]);

  const [novoNome, setNovoNome] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novoRep, setNovoRep] = useState('');
  const [novoTipoRep, setNovoTipoRep] = useState<'fixo' | 'percentual'>('fixo');

  const carregarProc = useCallback(() => { procedimentosApi.listar().then(setProcedimentos).catch(() => {}); }, []);
  const carregarLanc = useCallback(() => { finLancamentosApi.listar().then(setLancamentos).catch(() => {}); }, []);
  useEffect(() => { carregarProc(); carregarLanc(); }, [carregarProc, carregarLanc]);

  // Repasse por unidade — respeita o tipo cadastrado (fixo em R$ ou percentual sobre o valor).
  // Antes disto o cadastro rápido gravava sempre "percentual", mesmo quando o valor era um
  // repasse fixo em reais — inflava o repasse e distorcia a margem retida pela clínica.
  const rep = (p: APIProcedimento) => {
    const tipo = p.tipo_repasse || 'fixo';
    const val = p.valor_repasse || 0;
    return tipo === 'percentual' ? (p.valor_padrao || 0) * (val / 100) : val;
  };
  const valClinica = (p: APIProcedimento) => (p.valor_padrao || 0) - rep(p);
  const qtd = (procId: string) => lancamentos.find(l => l.procedimento_id === procId && l.mes === mes)?.quantidade || 0;

  const adicionar = async () => {
    if (!novoNome.trim()) return;
    try {
      await procedimentosApi.criar({ nome: novoNome.trim(), tipo: 'consulta', valor_padrao: novoValor ? Number(novoValor) : 0, valor_repasse: novoRep ? Number(novoRep) : 0, tipo_repasse: novoTipoRep });
      setNovoNome(''); setNovoValor(''); setNovoRep(''); setNovoTipoRep('fixo'); carregarProc();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };
  const remover = async (p: APIProcedimento) => { if (confirm(`Remover "${p.nome}" do cardápio?`)) { await procedimentosApi.excluir(p.id); carregarProc(); } };

  const setQtd = async (procId: string, valor: number) => {
    const existente = lancamentos.find(l => l.procedimento_id === procId && l.mes === mes);
    // otimista
    setLancamentos(prev => {
      if (existente) return prev.map(l => l.id === existente.id ? { ...l, quantidade: valor } : l);
      return [...prev, { id: `tmp-${procId}`, procedimento_id: procId, mes, quantidade: valor }];
    });
    try {
      if (existente && !existente.id.startsWith('tmp-')) await finLancamentosApi.atualizar(existente.id, { quantidade: valor });
      else await finLancamentosApi.criar({ procedimento_id: procId, mes, quantidade: valor });
      carregarLanc();
    } catch { /* mantém otimista */ }
  };

  const bruto = procedimentos.reduce((s, p) => s + (p.valor_padrao || 0) * qtd(p.id), 0);
  const repassado = procedimentos.reduce((s, p) => s + rep(p) * qtd(p.id), 0);
  const retido = bruto - repassado;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader icon={DollarSign} title="Dashboard Financeiro" subtitle="Gestão de cardápio de serviços e lançamentos mensais">
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-200">
          <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><Calendar size={16} /> Período:</span>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="border-none bg-transparent font-bold text-brand-primary focus:outline-none focus:ring-0" />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cardápio (global) */}
        <div className="flex flex-col">
          <Card className="flex-1 flex flex-col border-t-4 border-t-slate-700">
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-slate-800 text-white uppercase tracking-widest"><Lock size={12} /> Global — Fixo</span>
              <h3 className="text-lg font-bold text-slate-800 mt-2">1. Cadastro de Serviços e Repasses</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cardápio de procedimentos. Salvo globalmente (não muda por mês).</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-end mb-4 shrink-0">
              <div className="flex-1 w-full"><InputField label="Nome do Procedimento" placeholder="ex: Consulta Clínica" value={novoNome} onChange={e => setNovoNome(e.target.value)} /></div>
              <div className="w-full sm:w-28"><InputField label="Valor (R$)" type="number" placeholder="190" value={novoValor} onChange={e => setNovoValor(e.target.value)} /></div>
              <div className="w-full sm:w-32">
                <SelectField label="Tipo Repasse" value={novoTipoRep} onChange={e => setNovoTipoRep(e.target.value as 'fixo' | 'percentual')}>
                  <option value="fixo">Fixo (R$)</option>
                  <option value="percentual">Percentual (%)</option>
                </SelectField>
              </div>
              <div className="w-full sm:w-28"><InputField label={novoTipoRep === 'percentual' ? '% Profissional' : 'Repasse (R$)'} type="number" placeholder={novoTipoRep === 'percentual' ? '40' : '80'} value={novoRep} onChange={e => setNovoRep(e.target.value)} /></div>
              <Btn icon={Plus} className="w-full sm:w-auto" onClick={adicionar}>Adicionar</Btn>
            </div>
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0"><tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Procedimento</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Valor (R$)</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Repasse</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Val. Clínica</th><th></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {procedimentos.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nenhum serviço cadastrado.</td></tr>
                    : procedimentos.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{p.nome}</td>
                        <td className="px-4 py-3 text-center text-slate-600">R$ {fmt(p.valor_padrao || 0)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{(p.tipo_repasse || 'fixo') === 'percentual' ? `${p.valor_repasse || 0}%` : `R$ ${fmt(p.valor_repasse || 0)}`}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">R$ {fmt(valClinica(p))}</td>
                        <td className="px-4 py-3 text-center"><button onClick={() => remover(p)} className="text-slate-400 hover:text-red-500"><X size={14} /></button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Lançamentos do mês */}
        <div className="flex flex-col">
          <Card className="flex-1 flex flex-col border-t-4 border-t-brand-primary">
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-brand-light text-brand-dark uppercase tracking-widest"><Calendar size={12} /> Mensal</span>
              <h3 className="text-lg font-bold text-slate-800 mt-2">2. Lançamentos do Mês</h3>
              <p className="text-xs text-slate-500 mt-0.5">Informe a quantidade realizada de cada serviço no mês. Totais automáticos.</p>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {procedimentos.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">Cadastre serviços no cardápio primeiro.</p>
                : procedimentos.map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:border-brand-primary/30 hover:bg-brand-light/10 transition-colors">
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 text-sm">{p.nome}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">R$ {fmt(p.valor_padrao || 0)} • Repasse {(p.tipo_repasse || 'fixo') === 'percentual' ? `${p.valor_repasse || 0}%` : `R$ ${fmt(rep(p))}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Qtd:</span>
                      <input type="number" min={0} value={qtd(p.id)} onChange={e => setQtd(p.id, Number(e.target.value) || 0)}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold text-brand-primary focus:outline-none focus:border-brand-primary bg-gray-50" />
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 shrink-0 bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center"><span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5"><DollarSign size={16} /> Faturamento Bruto Total</span><span className="font-bold text-slate-800">R$ {fmt(bruto)}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm font-semibold text-slate-600">↳ Repassado aos Profissionais</span><span className="font-bold text-red-500">- R$ {fmt(repassado)}</span></div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200/50 mt-2"><span className="text-base font-black text-slate-800 flex items-center gap-1.5"><TrendingUp size={18} className="text-emerald-500" /> Total Retido p/ Clínica</span><span className="text-xl font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">R$ {fmt(retido)}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
