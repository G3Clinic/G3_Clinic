import { useState, useEffect, useCallback } from 'react';
import { CreditCard, TrendingUp, TrendingDown, Plus, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { PageHeader, Card, StatsCard, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import {
  recebimentosApi, pacientesApi, conveniosApi,
  type APIRecebimento, type APIPaciente, type APIConvenio,
} from '../../../services/api';

const STATUS = [
  { v: 'PENDENTE', label: 'Pendente' },
  { v: 'RECEBIDO', label: 'Recebido / Pago' },
  { v: 'ESTORNADO', label: 'Estornado' },
];
const hoje = () => new Date().toISOString().split('T')[0];

type Form = { paciente_id: string; descricao: string; valor: string; convenio_id: string; data_vencimento: string; status: string };
const FORM_VAZIO: Form = { paciente_id: '', descricao: '', valor: '', convenio_id: '', data_vencimento: hoje(), status: 'PENDENTE' };

export function RecebimentosPage() {
  const [lista, setLista] = useState<APIRecebimento[]>([]);
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [convenios, setConvenios] = useState<APIConvenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const setCampo = (c: keyof Form, v: string) => setForm(prev => ({ ...prev, [c]: v }));

  const carregar = useCallback(() => {
    setLoading(true);
    recebimentosApi.listar().then(setLista).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    carregar();
    pacientesApi.listar().then(setPacientes).catch(() => {});
    conveniosApi.listar().then(setConvenios).catch(() => {});
  }, [carregar]);

  const nomePac = (id?: number | null) => pacientes.find(p => p.id === id)?.nome || '—';
  const nomeConv = (id?: number | null) => convenios.find(c => c.id === id)?.nome || 'Particular';

  const filtrada = lista.filter(r => filtroStatus === 'all' || r.status === filtroStatus);
  const recebidosHoje = lista.filter(r => r.status === 'RECEBIDO' && r.data_recebimento === hoje()).reduce((s, r) => s + (r.valor || 0), 0);
  const aReceber = lista.filter(r => r.status === 'PENDENTE').reduce((s, r) => s + (r.valor || 0), 0);
  const emAtraso = lista.filter(r => r.status === 'PENDENTE' && r.data_vencimento && r.data_vencimento < hoje()).reduce((s, r) => s + (r.valor || 0), 0);

  const abrirNovo = () => { setEditId(null); setForm(FORM_VAZIO); setErro(''); setModal(true); };
  const abrirEdit = (r: APIRecebimento) => {
    setEditId(r.id);
    setForm({
      paciente_id: r.paciente_id != null ? String(r.paciente_id) : '', descricao: r.descricao || '',
      valor: r.valor != null ? String(r.valor) : '', convenio_id: r.convenio_id != null ? String(r.convenio_id) : '',
      data_vencimento: r.data_vencimento || hoje(), status: r.status || 'PENDENTE',
    });
    setErro(''); setModal(true);
  };

  const salvar = async () => {
    setErro('');
    if (!form.valor) { setErro('Informe o valor.'); return; }
    setSalvando(true);
    try {
      const payload = {
        paciente_id: form.paciente_id ? Number(form.paciente_id) : undefined,
        descricao: form.descricao.trim() || undefined,
        valor: Number(form.valor),
        convenio_id: form.convenio_id ? Number(form.convenio_id) : undefined,
        data_vencimento: form.data_vencimento || undefined,
        status: form.status,
        data_recebimento: form.status === 'RECEBIDO' ? hoje() : undefined,
      };
      if (editId) await recebimentosApi.atualizar(editId, payload); else await recebimentosApi.criar(payload);
      setModal(false); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };
  const excluir = async (r: APIRecebimento) => { if (confirm('Excluir este recebimento?')) { await recebimentosApi.excluir(r.id); carregar(); } };

  const badgeStatus = (s?: string | null) => s === 'RECEBIDO' ? <Badge color="green">Pago</Badge> : s === 'ESTORNADO' ? <Badge color="gray">Estornado</Badge> : <Badge color="yellow">Pendente</Badge>;

  return (
    <div className="space-y-5">
      <PageHeader icon={CreditCard} title="Recebimentos" subtitle="Controle de recebimentos e contas a receber">
        <Btn icon={Plus} onClick={abrirNovo}>Novo Recebimento</Btn>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatsCard icon={TrendingUp} label="Recebidos Hoje" value={`R$ ${recebidosHoje.toFixed(2)}`} color="green" />
        <StatsCard icon={CreditCard} label="A Receber" value={`R$ ${aReceber.toFixed(2)}`} color="yellow" />
        <StatsCard icon={TrendingDown} label="Em Atraso" value={`R$ ${emAtraso.toFixed(2)}`} color="red" />
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700 text-sm">Lista de Recebimentos</h3>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
            <option value="all">Todos os status</option>
            {STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">{['Paciente', 'Convênio', 'Serviço', 'Valor', 'Vencimento', 'Status', 'Ações'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="py-10 text-center text-slate-400">Carregando...</td></tr>
                : filtrada.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-slate-400"><CreditCard size={40} className="mx-auto mb-3 text-slate-200" /><p className="text-sm">Nenhum recebimento encontrado</p></td></tr>
                ) : filtrada.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-medium text-slate-800">{nomePac(r.paciente_id)}</td>
                    <td className="px-4 py-3 text-slate-500">{nomeConv(r.convenio_id)}</td>
                    <td className="px-4 py-3 text-slate-500">{r.descricao || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">R$ {(r.valor ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{r.data_vencimento ? r.data_vencimento.split('-').reverse().join('/') : '—'}</td>
                    <td className="px-4 py-3">{badgeStatus(r.status)}</td>
                    <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEdit(r)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => excluir(r)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Recebimento' : 'Registrar Recebimento'}>
        <div className="space-y-4">
          <SelectField label="Paciente" value={form.paciente_id} onChange={e => setCampo('paciente_id', e.target.value)}>
            <option value="">Selecione...</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </SelectField>
          <InputField label="Descrição do Serviço" placeholder="Ex: Restauração, Consulta" value={form.descricao} onChange={e => setCampo('descricao', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Valor (R$)" type="number" placeholder="0.00" required value={form.valor} onChange={e => setCampo('valor', e.target.value)} />
            <SelectField label="Convênio" value={form.convenio_id} onChange={e => setCampo('convenio_id', e.target.value)}>
              <option value="">Particular</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Data de Vencimento" type="date" value={form.data_vencimento} onChange={e => setCampo('data_vencimento', e.target.value)} />
            <SelectField label="Status de Pagamento" required value={form.status} onChange={e => setCampo('status', e.target.value)}>
              {STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </SelectField>
          </div>
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={salvando} className="bg-emerald-500 hover:bg-emerald-600 border-none text-white" icon={CheckCircle2}>{salvando ? 'Salvando...' : 'Salvar Recebimento'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
