import { useState, useEffect } from 'react';
import { Activity, Users, ArrowLeft, HeartPulse, UserCircle } from 'lucide-react';
import { PageHeader, Card, Btn } from '../../../components/ui/shared';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { pacientesApi, agendamentosApi, procedimentosApi, usuariosApi, type APIAgendamento } from '../../../services/api';

export function EstatisticasPacientesPage() {
  const navigate = useNavigate();

  const [kpis, setKpis] = useState({ totalPacientes: 0, idadeMedia: 0, mulheres: 0, homens: 0 });
  const [dataProcs, setDataProcs] = useState<{ name: string; qtd: number }[]>([]);
  const [dataMedicos, setDataMedicos] = useState<{ name: string; qtd: number }[]>([]);
  const [dataCIDs, setDataCIDs] = useState<{ name: string; qtd: number }[]>([]);

  useEffect(() => {
    Promise.all([pacientesApi.listar(), agendamentosApi.listar(), procedimentosApi.listar(), usuariosApi.listar()])
      .then(([pacs, ags, procs, users]) => {
        // KPIs demográficos
        const total = pacs.length;
        const idades = pacs.map(p => p.data_nascimento ? (new Date().getFullYear() - new Date(p.data_nascimento).getFullYear()) : null).filter((x): x is number => x != null);
        const idadeMedia = idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0;
        const fem = pacs.filter(p => p.sexo === 'F').length;
        const masc = pacs.filter(p => p.sexo === 'M').length;
        const base = fem + masc || 1;
        setKpis({ totalPacientes: total, idadeMedia, mulheres: Math.round((fem / base) * 100), homens: Math.round((masc / base) * 100) });

        // agrega por procedimento e por profissional
        const nomeProc = (id?: string | null) => procs.find(p => p.id === id)?.nome || '—';
        const nomeMed = (id?: string | null) => users.find(u => u.id === id)?.nome || '—';
        const contar = (arr: APIAgendamento[], chave: (a: APIAgendamento) => string | null | undefined, rotulo: (id: string) => string) => {
          const m: Record<string, number> = {};
          arr.forEach(a => { const k = chave(a); if (k) m[k] = (m[k] || 0) + 1; });
          return Object.entries(m).map(([id, qtd]) => ({ name: rotulo(id), qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 6);
        };
        setDataProcs(contar(ags, a => a.procedimento_id, nomeProc));
        setDataMedicos(contar(ags, a => a.profissional_id, nomeMed));
        setDataCIDs([]); // CID por paciente não é agregável sem carregar todas as consultas
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        icon={Activity} 
        title="Estatísticas e Análise" 
        subtitle="Métricas, demografia e recorrência clínica de pacientes"
      >
        <Btn variant="secondary" icon={ArrowLeft} onClick={() => navigate('/dashboard/pacientes')}>
          Voltar a Pacientes
        </Btn>
      </PageHeader>

      {/* KPIs Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 bg-gradient-to-br from-brand-primary/10 to-transparent border-none">
          <div className="p-3 bg-brand-primary text-white rounded-xl shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Total Pacientes</p>
            <p className="text-3xl font-black text-slate-800">{kpis.totalPacientes}</p>
          </div>
        </Card>
        
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-sm">
            <UserCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Idade Média</p>
            <p className="text-3xl font-black text-slate-800">{kpis.idadeMedia} <span className="text-sm font-semibold text-slate-400">anos</span></p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 md:col-span-2">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-sm">
            <HeartPulse size={24} />
          </div>
          <div className="w-full">
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Gênero</p>
            <div className="flex w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div style={{width: `${kpis.mulheres}%`}} className="bg-pink-500"></div>
              <div style={{width: `${kpis.homens}%`}} className="bg-blue-500"></div>
            </div>
            <div className="flex justify-between mt-1 text-xs font-bold text-slate-500">
              <span className="text-pink-600">{kpis.mulheres}% Mulheres</span>
              <span className="text-blue-600">{kpis.homens}% Homens</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Procedimentos */}
        <Card title="Procedimentos Mais Realizados" padding={true}>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataProcs} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: 'rgba(0,0,0,0.05)'}}
                />
                <Bar dataKey="qtd" fill="#14b8a6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Gráfico CIDs */}
        <Card title="CIDs Mais Recorrentes" padding={true}>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataCIDs} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: 'rgba(0,0,0,0.05)'}}
                />
                <Bar dataKey="qtd" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Gráfico Médicos */}
        <Card title="Profissionais Mais Requisitados" padding={true} className="lg:col-span-2">
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataMedicos} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: 'rgba(0,0,0,0.05)'}}
                />
                <Bar dataKey="qtd" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

    </div>
  );
}
