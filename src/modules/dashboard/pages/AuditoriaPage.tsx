import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileSearch, ListChecks, UserCog, RefreshCcw, Filter } from 'lucide-react';
import { PageHeader, Card, Btn, StatsCard, InputField, SelectField, Badge } from '../../../components/ui/shared';
import { usuariosApi, eventosApi, type APIUsuario, type APIEvento } from '../../../services/api';

const primeiroDiaMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const hojeISO = () => new Date().toISOString().slice(0, 10);

// Nomes amigáveis dos módulos internos.
const MODULO_LABEL: Record<string, string> = {
  admin: 'Administração', agenda: 'Agenda', caixa: 'Caixa', financeiro: 'Financeiro',
  estoque: 'Estoque', prontuario: 'Prontuário', odontograma: 'Odontograma', recepcao: 'Recepção',
};
const moduloNome = (m?: string | null) => (m ? (MODULO_LABEL[m] || m.charAt(0).toUpperCase() + m.slice(1)) : '—');

const ACAO_LABEL: Record<string, string> = {
  'criação': 'Criou', 'alteração': 'Alterou', 'exclusão': 'Excluiu', 'finalização': 'Finalizou',
};
const acaoNome = (a?: string | null) => (a ? (ACAO_LABEL[a] || a) : '—');
const corAcao = (a?: string | null) => a === 'exclusão' ? 'red' : a === 'alteração' ? 'yellow' : a === 'finalização' ? 'green' : 'blue';

// Remove UUIDs / sequências longas de dígitos das descrições (o que o usuário
// via como "sequência de números que não sei o que é").
const limparDescricao = (d?: string | null) => (d || '')
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'registro')
  .replace(/\b[0-9a-f]{16,}\b/gi, 'registro')
  .trim() || '—';

export function AuditoriaPage() {
  const [de, setDe] = useState(primeiroDiaMes());
  const [ate, setAte] = useState(hojeISO());
  const [usuarioId, setUsuarioId] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState('');
  const [acaoFiltro, setAcaoFiltro] = useState('');

  const [usuarios, setUsuarios] = useState<APIUsuario[]>([]);
  const [eventos, setEventos] = useState<APIEvento[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    usuariosApi.listar().then(setUsuarios).catch(() => {});
    eventosApi.listar().then(setEventos).catch(() => {}).finally(() => setCarregando(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeUsuario = (id?: string | null) => usuarios.find(u => String(u.id) === String(id))?.nome;

  const filtrados = useMemo(() => eventos.filter(e => {
    const d = (e.criado_em || '').slice(0, 10);
    if (d < de || d > ate) return false;
    if (usuarioId && String(e.usuario_id) !== usuarioId) return false;
    if (moduloFiltro && e.modulo !== moduloFiltro) return false;
    if (acaoFiltro && e.acao !== acaoFiltro) return false;
    return true;
  }).sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || '')), [eventos, de, ate, usuarioId, moduloFiltro, acaoFiltro]);

  const modulosDisponiveis = useMemo(
    () => Array.from(new Set(eventos.map(e => e.modulo).filter(Boolean))) as string[], [eventos]);

  return (
    <div className="space-y-6">
      <PageHeader icon={FileSearch} title="Registro de Atividades" subtitle="Log geral de auditoria — criações, alterações, exclusões e finalizações em todos os módulos">
        <Btn icon={RefreshCcw} variant="secondary" onClick={carregar} disabled={carregando}>{carregando ? 'Atualizando…' : 'Atualizar'}</Btn>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard icon={ListChecks} label="Eventos no período" value={String(filtrados.length)} color="blue" />
        <StatsCard icon={UserCog} label="Funcionários ativos no log" value={String(new Set(filtrados.map(e => e.usuario_id)).size)} color="purple" />
        <StatsCard icon={RefreshCcw} label="Exclusões" value={String(filtrados.filter(e => e.acao === 'exclusão').length)} color="red" />
      </div>

      <Card padding={false}>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end border-b border-gray-100">
          <InputField label="De" type="date" value={de} onChange={e => setDe(e.target.value)} />
          <InputField label="Até" type="date" value={ate} onChange={e => setAte(e.target.value)} />
          <SelectField label="Funcionário" value={usuarioId} onChange={e => setUsuarioId(e.target.value)}>
            <option value="">Todos os funcionários</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </SelectField>
          <SelectField label="Módulo" value={moduloFiltro} onChange={e => setModuloFiltro(e.target.value)}>
            <option value="">Todos os módulos</option>
            {modulosDisponiveis.map(m => <option key={m} value={m}>{moduloNome(m)}</option>)}
          </SelectField>
          <SelectField label="Ação" value={acaoFiltro} onChange={e => setAcaoFiltro(e.target.value)}>
            <option value="">Todas as ações</option>
            <option value="criação">Criações</option>
            <option value="alteração">Alterações</option>
            <option value="exclusão">Exclusões</option>
            <option value="finalização">Finalizações</option>
          </SelectField>
          <Btn icon={Filter} variant="secondary" className="w-full justify-center"
            onClick={() => { setUsuarioId(''); setModuloFiltro(''); setAcaoFiltro(''); }}>Limpar filtros</Btn>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Data/Hora', 'Funcionário', 'Ação', 'Módulo', 'O que aconteceu'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-slate-400">
                  <FileSearch size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm">Nenhum evento no período/filtros selecionados</p>
                  <p className="text-xs mt-1">Criações, alterações, exclusões e finalizações aparecem aqui automaticamente.</p>
                </td></tr>
              ) : filtrados.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{e.usuario_nome || nomeUsuario(e.usuario_id) || '—'}</td>
                  <td className="px-4 py-3"><Badge color={corAcao(e.acao)}>{acaoNome(e.acao)}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{moduloNome(e.modulo)}</td>
                  <td className="px-4 py-3 text-slate-600">{limparDescricao(e.descricao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-100 text-xs text-slate-500">{filtrados.length} evento(s)</div>
      </Card>
    </div>
  );
}
