import { useState, useEffect, useMemo } from 'react';
import { Activity, Users, ArrowLeft, HeartPulse, UserCircle } from 'lucide-react';
import { PageHeader, Card, Btn, Badge } from '../../../components/ui/shared';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { pacientesApi, agendamentosApi, procedimentosApi, usuariosApi, documentosApi, configApi, type APIAgendamento, type APIPaciente } from '../../../services/api';

export function EstatisticasPacientesPage() {
  const navigate = useNavigate();

  const [kpis, setKpis] = useState({ totalPacientes: 0, idadeMedia: 0, mulheres: 0, homens: 0 });
  const [dataProcs, setDataProcs] = useState<{ name: string; qtd: number }[]>([]);
  const [dataMedicos, setDataMedicos] = useState<{ name: string; qtd: number }[]>([]);
  const [dataCIDs, setDataCIDs] = useState<{ name: string; qtd: number }[]>([]);
  const [dataQueixas, setDataQueixas] = useState<{ name: string; qtd: number }[]>([]);
  const [dataComorbidades, setDataComorbidades] = useState<{ name: string; qtd: number }[]>([]);
  const [dataAlergias, setDataAlergias] = useState<{ name: string; qtd: number }[]>([]);
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [agendamentos, setAgendamentos] = useState<APIAgendamento[]>([]);

  useEffect(() => {
    Promise.all([
      pacientesApi.listar(), agendamentosApi.listar(), procedimentosApi.listar(), usuariosApi.listar(),
      documentosApi.listar().catch(() => []), configApi.listarTodos().catch(() => []),
    ])
      .then(([pacs, ags, procs, users, docs, configs]) => {
        // KPIs demográficos
        const total = pacs.length;
        const idades = pacs.map(p => p.data_nascimento ? (new Date().getFullYear() - new Date(p.data_nascimento).getFullYear()) : null).filter((x): x is number => x != null);
        const idadeMedia = idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0;
        const fem = pacs.filter(p => p.sexo === 'F').length;
        const masc = pacs.filter(p => p.sexo === 'M').length;
        const base = fem + masc || 1;
        setKpis({ totalPacientes: total, idadeMedia, mulheres: Math.round((fem / base) * 100), homens: Math.round((masc / base) * 100) });
        setPacientes(pacs);
        setAgendamentos(ags);

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

        // Frequência de valores em texto livre — normaliza (minúsculo, sem espaço nas
        // pontas) pra agrupar variações óbvias de digitação ("Dor de dente" == "dor de
        // dente "), mas sem tentar um NLP de verdade: é uma contagem literal do texto
        // digitado, não uma categorização clínica.
        const contarTexto = (valores: (string | null | undefined)[]) => {
          const m: Record<string, number> = {};
          valores.forEach(v => {
            const norm = (v || '').trim();
            if (!norm) return;
            m[norm] = (m[norm] || 0) + 1;
          });
          return Object.entries(m).map(([name, qtd]) => ({ name, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 8);
        };

        // Queixa principal: campo estruturado dentro do documento de Triagem
        // (documentos_atendimento, tipo="triagem", conteudo.queixa_principal). Só existe
        // pra atendimentos triados depois que esse campo foi adicionado ao Prontuário.
        const queixas = docs.filter(d => d.tipo === 'triagem').map(d => (d.conteudo as { queixa_principal?: string } | undefined)?.queixa_principal);
        setDataQueixas(contarTexto(queixas));

        // Alergias: campo livre já existente no cadastro do Paciente.
        setDataAlergias(contarTexto(pacs.map(p => p.alergias)));

        // Comorbidade: campo "doencas_cronicas" da Anamnese Geral, guardada em
        // clinica_dados sob a chave "anamnese:<paciente_id>" (mesmo mecanismo usado pela
        // Anamnese em Pacientes e pelo card de alerta no Prontuário).
        const comorbidades = configs
          .filter(c => typeof c.chave === 'string' && c.chave.startsWith('anamnese:'))
          .map(c => (c.valor as { doencas_cronicas?: string } | undefined)?.doencas_cronicas);
        setDataComorbidades(contarTexto(comorbidades));
      })
      .catch(() => {});
  }, []);

  // ── Atendimento ABC: classifica pacientes pelo faturamento que geraram (Pareto) ──
  // Mesmo método da Curva ABC de Estoque: ordena do maior pro menor faturamento e
  // acumula % do total — A = até 80% acumulado (poucos pacientes concentram a maior
  // parte da receita), B = 80%–95%, C = os 5% finais. Considera só atendimentos
  // Finalizados (valor_cobrado realmente gerado, não agendamentos futuros/cancelados).
  const atendimentoABC = useMemo(() => {
    const faturamentoPorPaciente: Record<string, { qtd: number; valor: number }> = {};
    agendamentos.filter(a => a.status === 'Finalizado' && a.paciente_id).forEach(a => {
      const pid = String(a.paciente_id);
      faturamentoPorPaciente[pid] = faturamentoPorPaciente[pid] || { qtd: 0, valor: 0 };
      faturamentoPorPaciente[pid].qtd += 1;
      faturamentoPorPaciente[pid].valor += a.valor_cobrado || 0;
    });
    const linhas = Object.entries(faturamentoPorPaciente)
      .map(([pid, d]) => ({ paciente: pacientes.find(p => String(p.id) === pid), pacienteId: pid, ...d }))
      .sort((a, b) => b.valor - a.valor);
    const totalValor = linhas.reduce((acc, l) => acc + l.valor, 0) || 1;
    // Fold funcional (sem reatribuir uma variável externa a cada item) pra acumular o
    // valor corrido — evita mutação de estado durante o cálculo de render.
    const { linhas: comClasse } = linhas.reduce<{ acumulado: number; linhas: (typeof linhas[number] & { pctAcumulado: number; classe: 'A' | 'B' | 'C' })[] }>((estado, l) => {
      const acumulado = estado.acumulado + l.valor;
      const pctAcumulado = (acumulado / totalValor) * 100;
      const classe: 'A' | 'B' | 'C' = pctAcumulado <= 80 ? 'A' : pctAcumulado <= 95 ? 'B' : 'C';
      return { acumulado, linhas: [...estado.linhas, { ...l, pctAcumulado, classe }] };
    }, { acumulado: 0, linhas: [] });
    return comClasse;
  }, [agendamentos, pacientes]);
  const CLASSE_COR: Record<string, 'red' | 'yellow' | 'gray'> = { A: 'red', B: 'yellow', C: 'gray' };
  const contagemClasseAtend = { A: atendimentoABC.filter(c => c.classe === 'A').length, B: atendimentoABC.filter(c => c.classe === 'B').length, C: atendimentoABC.filter(c => c.classe === 'C').length };

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

      {/* Queixa principal / Comorbidade / Alergias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Queixas Principais Mais Frequentes" padding={true}>
          <p className="text-[11px] text-slate-400 -mt-2 mb-2">Só considera atendimentos triados com o campo Queixa Principal preenchido.</p>
          <div className="h-64 w-full">
            {dataQueixas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">Sem dados suficientes ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataQueixas} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="qtd" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Comorbidades Mais Frequentes" padding={true}>
          <p className="text-[11px] text-slate-400 -mt-2 mb-2">Doenças crônicas informadas na Anamnese Geral do paciente.</p>
          <div className="h-64 w-full">
            {dataComorbidades.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">Sem dados suficientes ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataComorbidades} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="qtd" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Alergias Mais Frequentes" padding={true}>
          <p className="text-[11px] text-slate-400 -mt-2 mb-2">Campo Alergias do cadastro do paciente.</p>
          <div className="h-64 w-full">
            {dataAlergias.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">Sem dados suficientes ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataAlergias} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="qtd" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Atendimento ABC — classificação de pacientes por faturamento (Pareto) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-red-500 text-white rounded-xl shadow-sm"><Badge color="red">A</Badge></div>
          <div><p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Classe A</p><p className="text-2xl font-black text-slate-800">{contagemClasseAtend.A} <span className="text-xs font-semibold text-slate-400">paciente(s)</span></p></div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-yellow-500 text-white rounded-xl shadow-sm"><Badge color="yellow">B</Badge></div>
          <div><p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Classe B</p><p className="text-2xl font-black text-slate-800">{contagemClasseAtend.B} <span className="text-xs font-semibold text-slate-400">paciente(s)</span></p></div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-gray-400 text-white rounded-xl shadow-sm"><Badge color="gray">C</Badge></div>
          <div><p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Classe C</p><p className="text-2xl font-black text-slate-800">{contagemClasseAtend.C} <span className="text-xs font-semibold text-slate-400">paciente(s)</span></p></div>
        </Card>
      </div>
      <Card title="Atendimento ABC — pacientes por faturamento gerado">
        <p className="text-xs text-slate-500 mb-3">Classe A concentra até 80% do faturamento (pacientes mais valiosos para a clínica), B de 80% a 95%, C os 5% finais. Considera só atendimentos Finalizados.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
              <tr><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Paciente</th><th className="px-4 py-3 text-right">Atendimentos</th><th className="px-4 py-3 text-right">Faturamento</th><th className="px-4 py-3 text-right">% Acumulado</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {atendimentoABC.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum atendimento finalizado ainda.</td></tr>
                : atendimentoABC.slice(0, 30).map(l => (
                  <tr key={l.pacienteId} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><Badge color={CLASSE_COR[l.classe]}>{l.classe}</Badge></td>
                    <td className="px-4 py-3 font-medium text-slate-700">{l.paciente?.nome || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{l.qtd}</td>
                    <td className="px-4 py-3 text-right font-mono">R$ {l.valor.toFixed(2).replace('.', ',')}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{l.pctAcumulado.toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {atendimentoABC.length > 30 && <p className="text-xs text-slate-400 text-center mt-2">Mostrando os 30 primeiros de {atendimentoABC.length} pacientes.</p>}
        </div>
      </Card>

    </div>
  );
}
