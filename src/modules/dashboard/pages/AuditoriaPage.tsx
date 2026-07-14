import { useState, useEffect, useCallback } from 'react';
import { FileSearch, Search, AlertCircle, ArrowDownRight, RefreshCcw, Download } from 'lucide-react';
import { PageHeader, Card, Btn, StatsCard, InputField, SelectField, Badge } from '../../../components/ui/shared';
import { recebimentosApi, pacientesApi, usuariosApi, eventosApi, type APIRecebimento, type APIPaciente, type APIUsuario, type APIEvento } from '../../../services/api';

const primeiroDiaMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const hojeISO = () => new Date().toISOString().slice(0, 10);

export function AuditoriaPage() {
  const [de, setDe] = useState(primeiroDiaMes());
  const [ate, setAte] = useState(hojeISO());
  const [recs, setRecs] = useState<APIRecebimento[]>([]);
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [usuarios, setUsuarios] = useState<APIUsuario[]>([]);
  const [eventos, setEventos] = useState<APIEvento[]>([]);

  const carregar = useCallback(() => {
    recebimentosApi.listar().then(setRecs).catch(() => {});
    pacientesApi.listar().then(setPacientes).catch(() => {});
    usuariosApi.listar().then(setUsuarios).catch(() => {});
    eventosApi.listar().then(setEventos).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const eventosPeriodo = eventos.filter(e => {
    const d = (e.criado_em || '').slice(0, 10);
    return d >= de && d <= ate;
  }).sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
  const corAcao = (a?: string | null) => a === 'exclusão' ? 'red' : a === 'alteração' ? 'yellow' : 'blue';

  const nomePac = (id?: number | null) => pacientes.find(p => p.id === id)?.nome || '—';
  const noPeriodo = (d?: string | null) => !!d && d >= de && d <= ate;

  // Estornos = recebimentos marcados como ESTORNADO no período
  const estornos = recs.filter(r => r.status === 'ESTORNADO' && noPeriodo(r.data_recebimento || r.data_vencimento));
  const totalEstornado = estornos.reduce((s, r) => s + (r.valor || 0), 0);
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader icon={FileSearch} title="Auditoria Financeira" subtitle="Rastreamento de estornos, cancelamentos e alterações em transações" />
        <div className="flex gap-2"><Btn icon={Download} variant="secondary">Exportar Log</Btn></div>
      </div>

      <Card padding={false} className="bg-white border-gray-200 shadow-sm">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <InputField label="De" type="date" value={de} onChange={e => setDe(e.target.value)} />
          <InputField label="Até" type="date" value={ate} onChange={e => setAte(e.target.value)} />
          <SelectField label="Tipo de Operação">
            <option>Todos os tipos</option>
            <option>Estorno / Cancelamento</option>
          </SelectField>
          <SelectField label="Usuário Responsável">
            <option value="">Todos os usuários</option>
            {usuarios.map(u => <option key={u.id}>{u.nome}</option>)}
          </SelectField>
          <Btn icon={Search} className="w-full justify-center" onClick={carregar}>Auditar</Btn>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard icon={AlertCircle} label="Eventos no Período" value={String(eventosPeriodo.length)} color="red" />
        <StatsCard icon={ArrowDownRight} label="Estornos Realizados" value={brl(totalEstornado)} color="yellow" />
        <StatsCard icon={RefreshCcw} label="Exclusões" value={String(eventosPeriodo.filter(e => e.acao === 'exclusão').length)} color="gray" />
      </div>

      <Card title="Log de Eventos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Descrição'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {eventosPeriodo.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-slate-400">
                  <FileSearch size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm">Nenhum evento registrado no período</p>
                  <p className="text-xs mt-1">Criações, alterações e exclusões aparecem aqui automaticamente.</p>
                </td></tr>
              ) : eventosPeriodo.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-slate-500">{e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{e.usuario_nome || '—'}</td>
                  <td className="px-4 py-3"><Badge color={corAcao(e.acao)}>{e.acao}</Badge></td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{e.modulo || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{e.descricao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
