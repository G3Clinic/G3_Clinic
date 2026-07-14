import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Users, FileText, Calendar, DollarSign, Activity, FileSpreadsheet, Download, RefreshCcw, Search, ChevronRight, Stethoscope, Microscope, TrendingUp, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Btn, StatsCard, SelectField, InputField } from '../../../components/ui/shared';
import {
  agendamentosApi, recebimentosApi, conveniosApi, procedimentosApi, usuariosApi,
  pacientesApi, custosApi, recepcaoLabApi,
  type APIAgendamento, type APIRecebimento, type APIConvenio, type APIProcedimento, type APIUsuario,
  type APIPaciente, type APICusto, type APIRecepcaoLab,
} from '../../../services/api';

type Tab = 'financeiro' | 'atendimentos' | 'producao' | 'dre' | 'laboratorio';

const primeiroDiaMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const hojeISO = () => new Date().toISOString().slice(0, 10);

export function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return (localStorage.getItem('relatorios_active_tab') as Tab) || 'financeiro';
  });

  React.useEffect(() => {
    localStorage.setItem('relatorios_active_tab', activeTab);
  }, [activeTab]);

  // Filtros
  const [de, setDe] = useState(primeiroDiaMes());
  const [ate, setAte] = useState(hojeISO());
  const [fProf, setFProf] = useState('');
  const [fConv, setFConv] = useState('');

  const [ags, setAgs] = useState<APIAgendamento[]>([]);
  const [recs, setRecs] = useState<APIRecebimento[]>([]);
  const [convenios, setConvenios] = useState<APIConvenio[]>([]);
  const [procedimentos, setProcedimentos] = useState<APIProcedimento[]>([]);
  const [profissionais, setProfissionais] = useState<APIUsuario[]>([]);
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [custos, setCustos] = useState<APICusto[]>([]);
  const [trabalhosLab, setTrabalhosLab] = useState<APIRecepcaoLab[]>([]);

  const carregar = useCallback(() => {
    agendamentosApi.listar().then(setAgs).catch(() => {});
    recebimentosApi.listar().then(setRecs).catch(() => {});
    conveniosApi.listar().then(setConvenios).catch(() => {});
    procedimentosApi.listar().then(setProcedimentos).catch(() => {});
    usuariosApi.listar().then(us => setProfissionais(us.filter(u => u.role === 'profissional_saude' || u.is_dono))).catch(() => {});
    pacientesApi.listar().then(setPacientes).catch(() => {});
    custosApi.listar().then(setCustos).catch(() => {});
    recepcaoLabApi.listar().then(setTrabalhosLab).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const noPeriodo = (d?: string | null) => !!d && d >= de && d <= ate;
  const agsF = ags.filter(a => noPeriodo(a.data_agendamento) && (!fProf || a.profissional_id === fProf) && (!fConv || String(a.convenio_id) === fConv));
  const recsF = recs.filter(r => noPeriodo(r.data_recebimento || r.data_vencimento) && r.status === 'RECEBIDO' && (!fConv || String(r.convenio_id) === fConv));

  const fatBruto = recsF.reduce((s, r) => s + (r.valor || 0), 0);
  const ticketMedio = recsF.length ? fatBruto / recsF.length : 0;
  const pacUnicos = new Set(agsF.map(a => a.paciente_id).filter(Boolean)).size;
  const totalAgs = agsF.length;
  const atendidos = agsF.filter(a => a.status === 'Finalizado').length;
  const faltantes = agsF.filter(a => a.status === 'Falta' || a.status === 'Cancelado').length;
  const comparecimento = (atendidos + faltantes) ? Math.round((atendidos / (atendidos + faltantes)) * 100) : 0;
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Helpers de nome e agregações das abas ──
  const nomePac = (id?: number | null) => pacientes.find(p => p.id === id)?.nome || '—';
  const nomeProf = (id?: string | null) => profissionais.find(p => p.id === id)?.nome || '—';
  const nomeProc = (id?: string | null) => procedimentos.find(p => p.id === id)?.nome || '—';
  const nomeConv = (id?: number | null) => convenios.find(c => c.id === id)?.nome || 'Particular';
  const fmtData = (d?: string | null) => d ? d.split('-').reverse().join('/') : '—';

  // Financeiro: resumo por forma de pagamento
  const porForma = Object.entries(
    recsF.reduce<Record<string, { qtd: number; total: number }>>((acc, r) => {
      const f = r.forma_pagamento || 'Não informado';
      acc[f] = { qtd: (acc[f]?.qtd || 0) + 1, total: (acc[f]?.total || 0) + (r.valor || 0) };
      return acc;
    }, {})
  );

  // Produção: métricas por profissional
  const producao = profissionais.map(prof => {
    const doProf = agsF.filter(a => a.profissional_id === prof.id);
    const at = doProf.filter(a => a.status === 'Finalizado').length;
    const fal = doProf.filter(a => a.status === 'Falta' || a.status === 'Cancelado').length;
    return {
      nome: prof.nome,
      agendados: doProf.length,
      atendidos: at,
      faltantes: fal,
      unicos: new Set(doProf.map(a => a.paciente_id).filter(Boolean)).size,
      comp: (at + fal) ? Math.round((at / (at + fal)) * 100) : 0,
      faturamento: doProf.filter(a => a.status === 'Finalizado').reduce((s, a) => s + (a.valor_cobrado || 0), 0),
    };
  }).filter(p => p.agendados > 0);

  // DRE: bruto − custos − repasses = lucro
  const totalCustos = custos.reduce((s, c) => s + (c.valor || 0), 0);
  const repasseDe = (a: APIAgendamento) => {
    const proc = procedimentos.find(p => p.id === a.procedimento_id);
    const perc = proc?.valor_repasse || 0;
    return (a.valor_cobrado || 0) * (perc / 100);
  };
  const finalizadosF = agsF.filter(a => a.status === 'Finalizado');
  const totalRepasses = finalizadosF.reduce((s, a) => s + repasseDe(a), 0);
  const lucro = fatBruto - totalCustos - totalRepasses;
  const margem = fatBruto ? Math.round((lucro / fatBruto) * 100) : 0;
  const repassesPorProf = profissionais.map(prof => {
    const doProf = finalizadosF.filter(a => a.profissional_id === prof.id);
    return {
      nome: prof.nome,
      atend: doProf.length,
      faturado: doProf.reduce((s, a) => s + (a.valor_cobrado || 0), 0),
      repasse: doProf.reduce((s, a) => s + repasseDe(a), 0),
    };
  }).filter(r => r.atend > 0);

  // Laboratório: trabalhos no período
  const labF = trabalhosLab.filter(t => noPeriodo(t.data_entrada));

  const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'atendimentos', label: 'Atendimentos', icon: Calendar },
    { id: 'producao', label: 'Produção', icon: Stethoscope },
    { id: 'dre', label: 'DRE', icon: TrendingUp },
    { id: 'laboratorio', label: 'Laboratório', icon: Microscope },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader icon={BarChart} title="Relatórios" subtitle="Faturamento, atendimentos e produção por período" />
        <div className="flex gap-2">
          <Btn icon={RefreshCcw} variant="secondary">Atualizar</Btn>
          <Btn icon={FileText} className="bg-red-600 hover:bg-red-700 text-white border-red-600">Exportar PDF</Btn>
        </div>
      </div>

      {/* Filtros Completos */}
      <Card padding={false} className="bg-white border-gray-200 shadow-sm">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
          <InputField label="De" type="date" value={de} onChange={e => setDe(e.target.value)} />
          <InputField label="Até" type="date" value={ate} onChange={e => setAte(e.target.value)} />
          <SelectField label="Profissional" value={fProf} onChange={e => setFProf(e.target.value)}>
            <option value="">Todos</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </SelectField>
          <SelectField label="Convênio" value={fConv} onChange={e => setFConv(e.target.value)}>
            <option value="">Todos</option>
            {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </SelectField>
          <SelectField label="Procedimento">
            <option>Todos</option>
            {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </SelectField>
          <Btn icon={Search} className="w-full justify-center" onClick={carregar}>Atualizar</Btn>
        </div>
      </Card>

      {/* KPIs Gerais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatsCard icon={DollarSign} label="Fat. Bruto" value={brl(fatBruto)} color="green" />
        <StatsCard icon={FileText} label="Ticket Médio" value={brl(ticketMedio)} color="blue" />
        <StatsCard icon={Users} label="Pac. Únicos" value={String(pacUnicos)} color="blue" />
        <StatsCard icon={Calendar} label="Agendamentos" value={String(totalAgs)} color="gray" />
        <StatsCard icon={Activity} label="Atendidos" value={String(atendidos)} color="green" />
        <StatsCard icon={AlertTriangle} label="Faltantes" value={String(faltantes)} color="red" />
        <StatsCard icon={BarChart} label="Comparecimento" value={`${comparecimento}%`} color={comparecimento >= 70 ? 'green' : 'red'} />
      </div>

      {/* Navegação de Abas */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
                ${isActive 
                  ? 'border-brand-primary text-brand-primary bg-brand-light/20' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Abas */}
      <div className="min-h-[400px]">
        {activeTab === 'financeiro' && (
          <div className="space-y-6 animate-fade-in-up">
            <Card title="Resumo por Forma de Pagamento">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Forma</th>
                      <th className="px-4 py-3 text-center">Qtd</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {porForma.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Nenhum dado financeiro no período.</td></tr>
                    ) : porForma.map(([forma, d]) => (
                      <tr key={forma} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{forma}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{d.qtd}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{brl(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Detalhamento Financeiro">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Paciente</th>
                      <th className="px-4 py-3">Profissional</th>
                      <th className="px-4 py-3">Procedimento</th>
                      <th className="px-4 py-3">Convênio</th>
                      <th className="px-4 py-3">Forma Pgto</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recsF.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum lançamento no período.</td></tr>
                    ) : recsF.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-slate-500">{fmtData(r.data_recebimento || r.data_vencimento)}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{nomePac(r.paciente_id)}</td>
                        <td className="px-4 py-3 text-slate-500">—</td>
                        <td className="px-4 py-3 text-slate-500">{r.descricao || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{nomeConv(r.convenio_id)}</td>
                        <td className="px-4 py-3 text-slate-500">{r.forma_pagamento || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{brl(r.valor || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'atendimentos' && (
          <div className="animate-fade-in-up">
            <Card title="Lista de Atendimentos">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Hora</th>
                      <th className="px-4 py-3">Paciente</th>
                      <th className="px-4 py-3">Profissional</th>
                      <th className="px-4 py-3">Procedimento</th>
                      <th className="px-4 py-3">Convênio</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {agsF.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum agendamento no período.</td></tr>
                    ) : agsF.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-slate-500">{fmtData(a.data_agendamento)}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{a.hora_inicio || '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{nomePac(a.paciente_id)}</td>
                        <td className="px-4 py-3 text-slate-500">{nomeProf(a.profissional_id)}</td>
                        <td className="px-4 py-3 text-slate-500">{nomeProc(a.procedimento_id)}</td>
                        <td className="px-4 py-3 text-slate-500">{nomeConv(a.convenio_id)}</td>
                        <td className="px-4 py-3 text-slate-500">{a.status || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{brl(a.valor_cobrado || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'producao' && (
          <div className="animate-fade-in-up">
            <Card title="Produção por Profissional">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Profissional</th>
                      <th className="px-4 py-3 text-center">Agendados</th>
                      <th className="px-4 py-3 text-center">Atendidos</th>
                      <th className="px-4 py-3 text-center">Faltantes</th>
                      <th className="px-4 py-3 text-center">Pac. Únicos</th>
                      <th className="px-4 py-3 text-center">Comparecimento</th>
                      <th className="px-4 py-3 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {producao.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum dado de produção no período.</td></tr>
                    ) : producao.map(p => (
                      <tr key={p.nome} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{p.nome}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{p.agendados}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-bold">{p.atendidos}</td>
                        <td className="px-4 py-3 text-center text-red-500">{p.faltantes}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{p.unicos}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{p.comp}%</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{brl(p.faturamento)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'dre' && (
          <div className="animate-fade-in-up space-y-6">
            <Card title="Demonstrativo de Resultado (DRE)">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2"><DollarSign size={24} /></div>
                  <p className="text-sm font-semibold text-slate-500">Faturamento Bruto</p>
                  <p className="text-xl font-bold text-emerald-600">{brl(fatBruto)}</p>
                </div>
                <div className="text-2xl font-bold text-gray-300">−</div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2"><Activity size={24} /></div>
                  <p className="text-sm font-semibold text-slate-500">Custos Operacionais</p>
                  <p className="text-xl font-bold text-red-600">{brl(totalCustos)}</p>
                </div>
                <div className="text-2xl font-bold text-gray-300">−</div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2"><Users size={24} /></div>
                  <p className="text-sm font-semibold text-slate-500">Repasses</p>
                  <p className="text-xl font-bold text-orange-600">{brl(totalRepasses)}</p>
                </div>
                <div className="text-2xl font-bold text-gray-300">=</div>
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-emerald-100 min-w-[200px]">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2"><TrendingUp size={24} /></div>
                  <p className="text-sm font-semibold text-slate-500">Lucro Líquido</p>
                  <p className={`text-2xl font-black ${lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{brl(lucro)}</p>
                  <p className={`text-xs font-bold mt-1 ${lucro >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Margem: {margem}%</p>
                </div>
              </div>
            </Card>

            <Card title="Repasses por Profissional">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Profissional</th>
                      <th className="px-4 py-3 text-center">Atendimentos</th>
                      <th className="px-4 py-3 text-right">Faturado</th>
                      <th className="px-4 py-3 text-right">Repasse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {repassesPorProf.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum repasse no período.</td></tr>
                    ) : repassesPorProf.map(r => (
                      <tr key={r.nome} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{r.nome}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{r.atend}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{brl(r.faturado)}</td>
                        <td className="px-4 py-3 text-right font-mono text-orange-600">{brl(r.repasse)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'laboratorio' && (
          <div className="animate-fade-in-up">
            <Card title="Trabalhos Laboratoriais">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Data Ent.</th>
                      <th className="px-4 py-3">Paciente</th>
                      <th className="px-4 py-3">Profissional</th>
                      <th className="px-4 py-3">Laboratório</th>
                      <th className="px-4 py-3">Trabalho</th>
                      <th className="px-4 py-3">Prev. Entrega</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {labF.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum trabalho laboratorial no período.</td></tr>
                    ) : labF.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-slate-500">{fmtData(t.data_entrada)}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{nomePac(t.paciente_id)}</td>
                        <td className="px-4 py-3 text-slate-500">{nomeProf(t.profissional_id)}</td>
                        <td className="px-4 py-3 text-slate-500">{t.laboratorio || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{t.tipo_trabalho || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{fmtData(t.data_prevista)}</td>
                        <td className="px-4 py-3 text-slate-500">{t.status || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{brl(t.valor || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
