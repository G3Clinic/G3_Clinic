import React, { useState } from 'react';
import { BarChart, Users, FileText, Calendar, DollarSign, Activity, FileSpreadsheet, Download, RefreshCcw, Search, ChevronRight, Stethoscope, Microscope, TrendingUp, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Btn, StatsCard, SelectField, InputField } from '../../../components/ui/shared';

type Tab = 'financeiro' | 'atendimentos' | 'producao' | 'dre' | 'laboratorio';

export function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return (localStorage.getItem('relatorios_active_tab') as Tab) || 'financeiro';
  });

  React.useEffect(() => {
    localStorage.setItem('relatorios_active_tab', activeTab);
  }, [activeTab]);

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
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
          <InputField label="De" type="date" defaultValue="2025-01-01" />
          <InputField label="Até" type="date" defaultValue="2025-01-31" />
          <SelectField label="Profissional">
            <option>Todos</option>
            <option>Dr. João</option>
            <option>Dra. Maria</option>
          </SelectField>
          <SelectField label="Convênio">
            <option>Todos</option>
            <option>Unimed</option>
            <option>Bradesco Saúde</option>
          </SelectField>
          <SelectField label="Procedimento">
            <option>Todos</option>
            <option>Consulta Clínica</option>
          </SelectField>
          <SelectField label="Forma Pgto">
            <option>Todas</option>
            <option>Dinheiro</option>
            <option>PIX</option>
            <option>Cartão Crédito</option>
          </SelectField>
          <Btn icon={Search} className="w-full justify-center">Buscar</Btn>
        </div>
      </Card>

      {/* KPIs Gerais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatsCard icon={DollarSign} label="Fat. Bruto" value="R$ 0,00" color="green" />
        <StatsCard icon={FileText} label="Ticket Médio" value="R$ 0,00" color="blue" />
        <StatsCard icon={Users} label="Pac. Únicos" value="0" color="blue" />
        <StatsCard icon={Calendar} label="Agendamentos" value="0" color="gray" />
        <StatsCard icon={Activity} label="Atendidos" value="0" color="green" />
        <StatsCard icon={AlertTriangle} label="Faltantes" value="0" color="red" />
        <StatsCard icon={BarChart} label="Comparecimento" value="0%" color="red" />
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
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Nenhum dado financeiro no período.</td></tr>
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
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum lançamento no período.</td></tr>
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
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum agendamento no período.</td></tr>
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
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum dado de produção no período.</td></tr>
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
                  <p className="text-xl font-bold text-emerald-600">R$ 0,00</p>
                </div>
                <div className="text-2xl font-bold text-gray-300">−</div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2"><Activity size={24} /></div>
                  <p className="text-sm font-semibold text-slate-500">Custos Operacionais</p>
                  <p className="text-xl font-bold text-red-600">R$ 0,00</p>
                </div>
                <div className="text-2xl font-bold text-gray-300">−</div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2"><Users size={24} /></div>
                  <p className="text-sm font-semibold text-slate-500">Repasses</p>
                  <p className="text-xl font-bold text-orange-600">R$ 0,00</p>
                </div>
                <div className="text-2xl font-bold text-gray-300">=</div>
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-emerald-100 min-w-[200px]">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2"><TrendingUp size={24} /></div>
                  <p className="text-sm font-semibold text-slate-500">Lucro Líquido</p>
                  <p className="text-2xl font-black text-emerald-600">R$ 0,00</p>
                  <p className="text-xs font-bold text-emerald-700 mt-1">Margem: 0%</p>
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
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum repasse no período.</td></tr>
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
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum trabalho laboratorial no período.</td></tr>
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
