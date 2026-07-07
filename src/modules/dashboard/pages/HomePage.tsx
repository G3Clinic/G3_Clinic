import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, MonitorPlay, ClipboardList, Smile,
  Landmark, Package, BarChart2, DollarSign, ArrowRight, HeartPulse, Info
} from 'lucide-react';

const modules = [
  { icon: Users, label: 'Cadastro de Pacientes', sub: 'Gerenciar pacientes', color: 'text-blue-600', to: '/dashboard/pacientes' },
  { icon: Calendar, label: 'Agenda', sub: 'Consultas e horários', color: 'text-emerald-600', to: '/dashboard/agenda' },
  { icon: MonitorPlay, label: 'Recepção', sub: 'Fila de atendimento', color: 'text-violet-600', to: '/dashboard/recepcao' },
  { icon: ClipboardList, label: 'Prontuário Eletrônico', sub: 'Histórico médico', color: 'text-sky-600', to: '/dashboard/prontuario' },
  { icon: Smile, label: 'Odontograma', sub: 'Saúde bucal', color: 'text-teal-600', to: '/dashboard/odontograma' },
  { icon: Landmark, label: 'Caixa do Dia', sub: 'Controle financeiro', color: 'text-amber-600', to: '/dashboard/caixa' },
  { icon: Package, label: 'Estoque', sub: 'Materiais e medicamentos', color: 'text-orange-600', to: '/dashboard/estoque' },
  { icon: BarChart2, label: 'Relatórios', sub: 'Análises e dados', color: 'text-rose-600', to: '/dashboard/relatorios' },
  { icon: DollarSign, label: 'Financeiro', sub: 'Dashboard financeiro', color: 'text-green-600', to: '/dashboard/financeiro' },
];

export function HomePage() {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-primary to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-brand-primary/20">
        <div className="flex items-center gap-3 mb-1">
          <HeartPulse size={22} className="opacity-80" />
          <span className="text-sm font-medium opacity-80">Sistema de Gestão</span>
        </div>
        <h2 className="text-2xl font-bold">{greeting}, Dr. Responsável!</h2>
        <p className="text-blue-100 text-sm mt-1">
          Use o menu lateral ou os atalhos abaixo para navegar entre os módulos do sistema.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Consultas Hoje', value: '—', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Em Atendimento', value: '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Finalizados', value: '—', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Pacientes Cad.', value: '—', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Módulos do Sistema</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(mod => (
            <button
              key={mod.to}
              onClick={() => navigate(mod.to)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-brand-primary/30 hover:shadow-md transition-all group text-left"
            >
              <div className={`flex items-center justify-center shrink-0 ${mod.color} group-hover:scale-110 transition-transform`}>
                <mod.icon size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{mod.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{mod.sub}</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
