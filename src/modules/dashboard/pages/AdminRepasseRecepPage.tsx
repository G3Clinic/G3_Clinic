import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { repasseRecepApi, usuariosApi, filialStore, type APIRepasseRecep, type APIUsuario } from '../../../services/api';

const TIPOS = ['Percentual por Consulta', 'Valor Fixo Mensal', 'Valor Fixo por Consulta'];

export function AdminRepasseRecepPage() {
  const [lista, setLista] = useState<APIRepasseRecep[]>([]);
  const [recepcionistas, setRecepcionistas] = useState<APIUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [recepId, setRecepId] = useState('');
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [valor, setValor] = useState('');
  const [referencia, setReferencia] = useState('');
  const [status, setStatus] = useState('Pendente');

  const carregar = useCallback(() => {
    setLoading(true);
    repasseRecepApi.listar().then(setLista).catch(() => {}).finally(() => setLoading(false));
    const unidadeAtiva = filialStore.get();
    Promise.all([usuariosApi.listar(), usuariosApi.listarFiliaisTodosUsuarios()])
      .then(([us, vinculos]) => {
        const recepDaUnidade = us.filter(u =>
          u.role === 'recepcionista' &&
          (!unidadeAtiva || vinculos.some(v => v.usuario_id === u.id && String(v.unidade_id) === unidadeAtiva))
        );
        setRecepcionistas(recepDaUnidade);
      })
      .catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeRecep = (id?: string | null) => recepcionistas.find(r => r.id === id)?.nome || '—';

  const abrirNovo = () => { setEditId(null); setRecepId(''); setTipo(TIPOS[0]); setValor(''); setReferencia(''); setStatus('Pendente'); setErro(''); setModal(true); };
  const abrirEdit = (r: APIRepasseRecep) => {
    setEditId(r.id); setRecepId(r.recepcionista_id || ''); setTipo(r.tipo || TIPOS[0]);
    setValor(r.valor != null ? String(r.valor) : ''); setReferencia(r.referencia || ''); setStatus(r.status || 'Pendente');
    setErro(''); setModal(true);
  };

  const salvar = async () => {
    setErro('');
    if (!recepId) { setErro('Selecione a recepcionista.'); return; }
    setSalvando(true);
    try {
      // "por Consulta" (Percentual/Fixo) é uma regra de taxa, não um lançamento — não tem
      // status de pagamento: o valor é aplicado direto quando o paciente paga a consulta
      // (ver cálculo em Relatórios). Só "Valor Fixo Mensal" tem Pendente/Pago de verdade.
      const payload = {
        recepcionista_id: recepId, tipo, valor: valor ? Number(valor) : undefined, referencia: referencia.trim() || undefined,
        status: tipo.includes('por Consulta') ? undefined : status,
      };
      if (editId) await repasseRecepApi.atualizar(editId, payload); else await repasseRecepApi.criar(payload);
      setModal(false); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };
  const marcarPago = async (r: APIRepasseRecep) => { await repasseRecepApi.atualizar(r.id, { status: 'Pago' }); carregar(); };
  const excluir = async (r: APIRepasseRecep) => { if (confirm('Excluir este repasse?')) { await repasseRecepApi.excluir(r.id); carregar(); } };

  // Regras "por Consulta" ficam fora dessas somas — não são valores pendentes/pagos, são
  // taxas (% ou R$ por atendimento); somar entraria % junto com R$ na mesma conta.
  const listaComStatus = lista.filter(r => !r.tipo?.includes('por Consulta'));
  const totalPendente = listaComStatus.filter(r => r.status !== 'Pago').reduce((s, r) => s + (r.valor || 0), 0);
  const totalPago = listaComStatus.filter(r => r.status === 'Pago').reduce((s, r) => s + (r.valor || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader icon={DollarSign} title="Regras de Repasse" subtitle="Configure comissões para dentistas e recepcionistas">
        <Btn icon={Plus} onClick={abrirNovo}>Novo Repasse</Btn>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Pendente</p><p className="text-2xl font-bold text-amber-600 mt-1">R$ {totalPendente.toFixed(2)}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Pago</p><p className="text-2xl font-bold text-emerald-600 mt-1">R$ {totalPago.toFixed(2)}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recepcionistas</p><p className="text-2xl font-bold text-brand-primary mt-1">{recepcionistas.length}</p></div>
      </div>

      <Card>
        <h3 className="font-bold text-slate-700 text-sm mb-4">Lista de Repasses</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">{['Recepcionista', 'Tipo de Repasse', 'Valor', 'Referência', 'Status', 'Ações'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={6} className="text-center py-8 text-slate-500">Carregando...</td></tr>
                : lista.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-500">Nenhum repasse cadastrado.</td></tr>
                : lista.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 text-slate-700">{nomeRecep(r.recepcionista_id)}</td>
                    <td className="px-4 py-3 text-slate-500">{r.tipo}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{r.tipo?.includes('Percentual') ? `${r.valor}%` : `R$ ${(r.valor ?? 0).toFixed(2)}`}</td>
                    <td className="px-4 py-3 text-slate-500">{r.referencia || '-'}</td>
                    <td className="px-4 py-3">
                      {r.tipo?.includes('por Consulta') ? (
                        <Badge color="blue">Ativo</Badge>
                      ) : (
                        <Badge color={r.status === 'Pago' ? 'green' : 'yellow'}>{r.status}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(!r.tipo?.includes('por Consulta') && r.status !== 'Pago') && <button onClick={() => marcarPago(r)} className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">✓ Marcar Pago</button>}
                      <button onClick={() => abrirEdit(r)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => excluir(r)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Repasse' : 'Novo Repasse'}>
        <div className="space-y-4">
          <SelectField label="Recepcionista" required value={recepId} onChange={e => setRecepId(e.target.value)}>
            <option value="">Selecione</option>
            {recepcionistas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </SelectField>
          <SelectField label="Tipo de Repasse" required value={tipo} onChange={e => setTipo(e.target.value)}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </SelectField>
          <InputField label="Valor (% ou R$)" type="number" step="0.01" placeholder="Ex: 5 ou 800.00" value={valor} onChange={e => setValor(e.target.value)} />
          <InputField label="Referência (Mês/Ano)" placeholder="Ex: Julho/2025" value={referencia} onChange={e => setReferencia(e.target.value)} />
          {!tipo?.includes('por Consulta') && (
            <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value)}><option>Pendente</option><option>Pago</option></SelectField>
          )}
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Repasse'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
