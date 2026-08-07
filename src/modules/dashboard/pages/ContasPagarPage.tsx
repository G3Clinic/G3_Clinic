import { useState, useEffect, useCallback } from 'react';
import { Receipt, TrendingDown, AlertTriangle, Plus, CheckCircle2, ThumbsUp, Edit2, Trash2, BadgeDollarSign, Link2 } from 'lucide-react';
import { PageHeader, Card, StatsCard, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import {
  contasPagarApi, aprovarContaPagar, pagarContaPagar,
  type APIContaPagar,
} from '../../../services/api';

const PAGAMENTOS = ['Dinheiro', 'PIX', 'Transferência', 'Boleto', 'Cartão'];
const STATUS = [
  { v: 'PENDENTE', label: 'Pendente' },
  { v: 'APROVADO', label: 'Aprovado' },
  { v: 'PAGO', label: 'Pago' },
];
const hoje = () => new Date().toISOString().split('T')[0];

type Form = { descricao: string; valor: string; fornecedor: string; data_vencimento: string; observacoes: string };
const FORM_VAZIO: Form = { descricao: '', valor: '', fornecedor: '', data_vencimento: hoje(), observacoes: '' };

export function ContasPagarPage() {
  const [lista, setLista] = useState<APIContaPagar[]>([]);
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
    contasPagarApi.listar().then(setLista).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const filtrada = lista.filter(c => filtroStatus === 'all' || c.status === filtroStatus);
  const pagoHoje = lista.filter(c => c.status === 'PAGO' && c.data_pagamento === hoje()).reduce((s, c) => s + (c.valor || 0), 0);
  const aPagar = lista.filter(c => c.status !== 'PAGO').reduce((s, c) => s + (c.valor || 0), 0);
  const vencidas = lista.filter(c => c.status !== 'PAGO' && c.data_vencimento && c.data_vencimento < hoje()).reduce((s, c) => s + (c.valor || 0), 0);

  const abrirNovo = () => { setEditId(null); setForm(FORM_VAZIO); setErro(''); setModal(true); };
  const abrirEdit = (c: APIContaPagar) => {
    setEditId(c.id);
    setForm({
      descricao: c.descricao || '', valor: c.valor != null ? String(c.valor) : '',
      fornecedor: c.fornecedor || '', data_vencimento: c.data_vencimento || hoje(),
      observacoes: c.observacoes || '',
    });
    setErro(''); setModal(true);
  };

  const salvar = async () => {
    setErro('');
    if (!form.descricao.trim() || !form.valor) { setErro('Descrição e valor são obrigatórios.'); return; }
    setSalvando(true);
    try {
      const payload = {
        descricao: form.descricao.trim(), valor: Number(form.valor),
        fornecedor: form.fornecedor.trim() || undefined, data_vencimento: form.data_vencimento || undefined,
        observacoes: form.observacoes.trim() || undefined,
      };
      if (editId) await contasPagarApi.atualizar(editId, payload); else await contasPagarApi.criar({ ...payload, status: 'PENDENTE' });
      setModal(false); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };
  const excluir = async (c: APIContaPagar) => { if (confirm('Excluir esta conta a pagar?')) { await contasPagarApi.excluir(c.id); carregar(); } };

  const aprovar = async (c: APIContaPagar) => {
    try { await aprovarContaPagar(c.id); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao aprovar.'); }
  };

  // Pagamento: marca pago e lança SAÍDA no caixa do dia
  const [pagarModal, setPagarModal] = useState<APIContaPagar | null>(null);
  const [pagarForma, setPagarForma] = useState('Dinheiro');
  const [pagando, setPagando] = useState(false);
  const abrirPagar = (c: APIContaPagar) => { setPagarModal(c); setPagarForma('Dinheiro'); };
  const confirmarPagar = async () => {
    if (!pagarModal) return;
    setPagando(true);
    try { await pagarContaPagar(pagarModal.id, pagarForma); setPagarModal(null); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao pagar.'); }
    finally { setPagando(false); }
  };

  const badgeStatus = (s?: string | null) => s === 'PAGO' ? <Badge color="green">Pago</Badge> : s === 'APROVADO' ? <Badge color="blue">Aprovado</Badge> : <Badge color="yellow">Pendente</Badge>;

  return (
    <div className="space-y-5">
      <PageHeader icon={Receipt} title="Contas a Pagar" subtitle="Aprovação e pagamento de despesas e pedidos de compra">
        <Btn icon={Plus} onClick={abrirNovo}>Nova Conta a Pagar</Btn>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatsCard icon={TrendingDown} label="Pago Hoje" value={`R$ ${pagoHoje.toFixed(2)}`} color="green" />
        <StatsCard icon={Receipt} label="A Pagar" value={`R$ ${aPagar.toFixed(2)}`} color="yellow" />
        <StatsCard icon={AlertTriangle} label="Vencidas" value={`R$ ${vencidas.toFixed(2)}`} color="red" />
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700 text-sm">Lista de Contas a Pagar</h3>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
            <option value="all">Todos os status</option>
            {STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">{['Descrição', 'Fornecedor', 'Origem', 'Valor', 'Vencimento', 'Status', 'Ações'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="py-10 text-center text-slate-400">Carregando...</td></tr>
                : filtrada.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-slate-400"><Receipt size={40} className="mx-auto mb-3 text-slate-200" /><p className="text-sm">Nenhuma conta a pagar encontrada</p></td></tr>
                ) : filtrada.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.descricao || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{c.fornecedor || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.pedido_id ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded"><Link2 size={11} /> Estoque</span> : 'Manual'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">R$ {(c.valor ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.data_vencimento ? c.data_vencimento.split('-').reverse().join('/') : '—'}</td>
                    <td className="px-4 py-3">{badgeStatus(c.status)}</td>
                    <td className="px-4 py-3"><div className="flex gap-1 items-center">
                      {c.status === 'PENDENTE' && (
                        <button onClick={() => aprovar(c)} title="Aprovar"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2 py-1">
                          <ThumbsUp size={13} /> Aprovar
                        </button>
                      )}
                      {c.status !== 'PAGO' && (
                        <button onClick={() => abrirPagar(c)} title="Pagar (marca pago + lança no caixa)"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-1">
                          <BadgeDollarSign size={13} /> Pagar
                        </button>
                      )}
                      <button onClick={() => abrirEdit(c)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => excluir(c)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}>
        <div className="space-y-4">
          <InputField label="Descrição" required placeholder="Ex: Aluguel, fornecedor X" value={form.descricao} onChange={e => setCampo('descricao', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Valor (R$)" type="number" placeholder="0.00" required value={form.valor} onChange={e => setCampo('valor', e.target.value)} />
            <InputField label="Fornecedor" placeholder="Opcional" value={form.fornecedor} onChange={e => setCampo('fornecedor', e.target.value)} />
          </div>
          <InputField label="Data de Vencimento" type="date" value={form.data_vencimento} onChange={e => setCampo('data_vencimento', e.target.value)} />
          <InputField label="Observações" placeholder="Opcional" value={form.observacoes} onChange={e => setCampo('observacoes', e.target.value)} />
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={salvando} icon={CheckCircle2}>{salvando ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!pagarModal} onClose={() => setPagarModal(null)} title="Pagar conta">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Confirmar pagamento de <strong>{pagarModal?.descricao}</strong> no valor de <strong>R$ {(pagarModal?.valor ?? 0).toFixed(2)}</strong>. Será lançado como saída no caixa do dia.</p>
          <SelectField label="Forma de Pagamento" value={pagarForma} onChange={e => setPagarForma(e.target.value)}>
            {PAGAMENTOS.map(p => <option key={p}>{p}</option>)}
          </SelectField>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setPagarModal(null)}>Cancelar</Btn>
            <Btn onClick={confirmarPagar} disabled={pagando} className="bg-emerald-500 hover:bg-emerald-600 border-none text-white" icon={CheckCircle2}>{pagando ? 'Processando...' : 'Confirmar Pagamento'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
