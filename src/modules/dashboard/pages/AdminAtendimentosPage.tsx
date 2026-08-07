import { useState, useEffect, useCallback } from 'react';
import { Stethoscope, Plus, Edit2, Trash2, Info, Save, Users, Search } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { procedimentosApi, usuariosApi, type APIProcedimento, type APIUsuario } from '../../../services/api';

const TABS = ['consulta', 'procedimento', 'exame'] as const;
type TabType = typeof TABS[number];

type Form = { tipo: TabType; nome: string; duracao: string; valor: string; valor_repasse: string; tipo_repasse: string; profissionaisIds: string[] };
const FORM_VAZIO: Form = { tipo: 'consulta', nome: '', duracao: '', valor: '', valor_repasse: '', tipo_repasse: 'fixo', profissionaisIds: [] };

export function AdminAtendimentosPage() {
  const [tab, setTab] = useState<TabType>('consulta');
  const [lista, setLista] = useState<APIProcedimento[]>([]);
  const [profissionais, setProfissionais] = useState<APIUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [buscaProf, setBuscaProf] = useState('');

  const setCampo = (c: keyof Omit<Form, 'profissionaisIds'>, v: string) => setForm(prev => ({ ...prev, [c]: v }));
  const toggleProfissional = (id: string) => setForm(prev => ({
    ...prev,
    profissionaisIds: prev.profissionaisIds.includes(id)
      ? prev.profissionaisIds.filter(x => x !== id)
      : [...prev.profissionaisIds, id],
  }));

  const carregar = useCallback(() => {
    setLoading(true);
    procedimentosApi.listar().then(setLista)
      .catch(e => console.error('Erro ao carregar atendimentos:', e))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { usuariosApi.listarProfissionais().then(setProfissionais).catch(() => {}); }, []);

  const nomeProf = (id: string) => profissionais.find(p => p.id === id)?.nome || '—';
  const doTab = lista.filter(p => (p.tipo || 'consulta') === tab);
  const profissionaisFiltrados = profissionais.filter(p => p.nome.toLowerCase().includes(buscaProf.toLowerCase()));

  const abrirNovo = () => { setEditandoId(null); setForm({ ...FORM_VAZIO, tipo: tab }); setErro(''); setBuscaProf(''); setModal(true); };
  const abrirEdicao = (p: APIProcedimento) => {
    setEditandoId(p.id);
    setForm({
      tipo: (p.tipo as TabType) || 'consulta',
      nome: p.nome,
      duracao: p.duracao != null ? String(p.duracao) : '',
      valor: p.valor_padrao != null ? String(p.valor_padrao) : '',
      valor_repasse: p.valor_repasse != null ? String(p.valor_repasse) : '',
      tipo_repasse: p.tipo_repasse || 'fixo',
      profissionaisIds: p.profissionais_ids || [],
    });
    setErro(''); setBuscaProf(''); setModal(true);
  };

  const salvar = async () => {
    setErro('');
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSalvando(true);
    try {
      const payload = {
        tipo: form.tipo, nome: form.nome.trim(),
        duracao: form.duracao ? Number(form.duracao) : undefined,
        valor_padrao: form.valor ? Number(form.valor) : undefined,
        valor_repasse: form.valor_repasse ? Number(form.valor_repasse) : undefined,
        tipo_repasse: form.tipo_repasse,
        profissionais_ids: form.profissionaisIds.length ? form.profissionaisIds : null,
      };
      if (editandoId) await procedimentosApi.atualizar(editandoId, payload);
      else await procedimentosApi.criar(payload);
      setModal(false); carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar atendimento.');
    } finally { setSalvando(false); }
  };

  const excluir = async (p: APIProcedimento) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    try { await procedimentosApi.excluir(p.id); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Stethoscope} title="Cadastrar Atendimentos" subtitle="Os atendimentos cadastrados ficam disponíveis na Agenda">
        <Btn icon={Plus} onClick={abrirNovo}>Novo Atendimento</Btn>
      </PageHeader>
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700 flex gap-2 items-start">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          Os atendimentos cadastrados aqui ficam disponíveis na <strong>Agenda</strong> para agendamento de pacientes.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === t ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'consulta' ? '🩺 Consultas' : t === 'procedimento' ? '💉 Procedimentos' : '🔬 Exames'}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nome', 'Duração (min)', 'Valor (R$)', 'Profissionais', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Carregando...</td></tr>
              ) : doTab.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Nenhum item nesta categoria.</td></tr>
              ) : doTab.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{a.duracao != null ? `${a.duracao} min` : '—'}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">R$ {(a.valor_padrao ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {a.profissionais_ids && a.profissionais_ids.length > 0
                      ? <span title={a.profissionais_ids.map(nomeProf).join(', ')}><Badge color="blue">{a.profissionais_ids.length === 1 ? nomeProf(a.profissionais_ids[0]) : `${a.profissionais_ids.length} profissionais`}</Badge></span>
                      : <span className="text-xs text-slate-400">Todos</span>}
                  </td>
                  <td className="px-4 py-3"><Badge color={a.ativo === false ? 'gray' : 'green'}>{a.ativo === false ? 'Inativo' : 'Ativo'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEdicao(a)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => excluir(a)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editandoId ? 'Editar Atendimento' : 'Novo Atendimento'}>
        <div className="space-y-4">
          <SelectField label="Tipo" required value={form.tipo} onChange={e => setCampo('tipo', e.target.value)}>
            <option value="consulta">Consulta</option>
            <option value="procedimento">Procedimento</option>
            <option value="exame">Exame</option>
          </SelectField>
          <InputField label="Nome do Atendimento" required placeholder="Ex: Consulta Clínica Geral"
            value={form.nome} onChange={e => setCampo('nome', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Duração (minutos)" type="number" min={5} placeholder="30"
              value={form.duracao} onChange={e => setCampo('duracao', e.target.value)} />
            <InputField label="Valor (R$)" type="number" step="0.01" placeholder="0.00"
              value={form.valor} onChange={e => setCampo('valor', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Tipo de Repasse" required value={form.tipo_repasse} onChange={e => setCampo('tipo_repasse', e.target.value)}>
              <option value="fixo">Fixo (R$)</option>
              <option value="percentual">Percentual (%)</option>
            </SelectField>
            <InputField label={`Repasse Profissional (${form.tipo_repasse === 'percentual' ? '%' : 'R$'})`} type="number" step="0.01" placeholder="0.00"
              value={form.valor_repasse} onChange={e => setCampo('valor_repasse', e.target.value)} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Users size={14} /> Restringir a profissionais específicos
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Nenhum marcado = disponível para todos. Marque só quando este atendimento (ex: um valor diferente do padrão) for exclusivo de determinado(s) profissional(is) — assim ele só aparece na Agenda quando esse profissional é selecionado.
            </p>
            {profissionais.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum profissional cadastrado ainda.</p>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={buscaProf} onChange={e => setBuscaProf(e.target.value)} placeholder="Buscar profissional..."
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
                </div>
                {form.profissionaisIds.length > 0 && (
                  <p className="text-[11px] text-brand-primary font-semibold mb-1.5">{form.profissionaisIds.length} selecionado(s)</p>
                )}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-100 rounded-xl p-2">
                  {profissionaisFiltrados.length === 0 ? (
                    <p className="text-xs text-slate-400 p-1">Nenhum profissional encontrado.</p>
                  ) : profissionaisFiltrados.map(p => (
                    <label key={p.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${form.profissionaisIds.includes(p.id) ? 'bg-brand-light border-brand-primary text-brand-dark' : 'bg-white border-gray-200 text-slate-600 hover:border-gray-300'}`}>
                      <input type="checkbox" className="accent-brand-primary" checked={form.profissionaisIds.includes(p.id)} onChange={() => toggleProfissional(p.id)} />
                      {p.nome}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
