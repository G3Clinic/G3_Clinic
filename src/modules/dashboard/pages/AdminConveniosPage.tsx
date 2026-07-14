import { useState, useEffect, useCallback } from 'react';
import { ShieldPlus, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { conveniosApi, type APIConvenio } from '../../../services/api';

const TIPOS = ['Saúde', 'Odontologia', 'Vida', 'Particular', 'DPVAT', 'Outro'];

type Form = {
  nome: string;
  codigo: string;
  codigo_ans: string;
  tipo: string;
  percentual_repasse: string;
  observacoes: string;
  ativo: boolean;
};
const FORM_VAZIO: Form = {
  nome: '', codigo: '', codigo_ans: '', tipo: 'Saúde',
  percentual_repasse: '', observacoes: '', ativo: true,
};

export function AdminConveniosPage() {
  const [lista, setLista] = useState<APIConvenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const setCampo = <K extends keyof Form>(campo: K, valor: Form[K]) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  const carregar = useCallback(() => {
    setLoading(true);
    conveniosApi.listar()
      .then(setLista)
      .catch(err => console.error('Erro ao carregar convênios:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErro('');
    setModal(true);
  };

  const abrirEdicao = (c: APIConvenio) => {
    setEditandoId(c.id);
    setForm({
      nome: c.nome,
      codigo: c.codigo || '',
      codigo_ans: c.codigo_ans || '',
      tipo: c.tipo || 'Saúde',
      percentual_repasse: c.percentual_repasse != null ? String(c.percentual_repasse) : '',
      observacoes: c.observacoes || '',
      ativo: c.ativo,
    });
    setErro('');
    setModal(true);
  };

  const salvar = async () => {
    setErro('');
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        codigo: form.codigo.trim() || undefined,
        codigo_ans: form.codigo_ans.trim() || undefined,
        tipo: form.tipo,
        percentual_repasse: form.percentual_repasse ? Number(form.percentual_repasse) : undefined,
        observacoes: form.observacoes.trim() || undefined,
        ativo: form.ativo,
      };
      if (editandoId) await conveniosApi.atualizar(editandoId, payload);
      else await conveniosApi.criar(payload);
      setModal(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar convênio.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c: APIConvenio) => {
    if (!confirm(`Excluir o convênio "${c.nome}"?`)) return;
    try {
      await conveniosApi.excluir(c.id);
      carregar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir convênio.');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={ShieldPlus} title="Cadastro de Convênios" subtitle="Gerencie os planos de saúde aceitos e suas regras">
        <Btn icon={Plus} onClick={abrirNovo}>Novo Convênio</Btn>
      </PageHeader>

      {loading ? (
        <Card><p className="text-center py-8 text-slate-500">Carregando convênios...</p></Card>
      ) : lista.length === 0 ? (
        <Card><p className="text-center py-8 text-slate-500">Nenhum convênio cadastrado.</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lista.map(c => (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-brand-primary font-bold text-sm">
                    {c.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{c.nome}</h4>
                    <p className="text-xs text-slate-400">Cód: {c.codigo || c.codigo_ans || '—'}</p>
                  </div>
                </div>
                <Badge color={c.ativo ? 'green' : 'gray'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span>Tipo: <strong className="text-slate-700">{c.tipo || '—'}</strong></span>
                <span>Repasse: <strong className="text-slate-700">{c.percentual_repasse != null ? `${c.percentual_repasse}%` : '—'}</strong></span>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="secondary" icon={Edit2} className="flex-1 justify-center" onClick={() => abrirEdicao(c)}>Editar</Btn>
                <button onClick={() => excluir(c)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editandoId ? 'Editar Convênio' : 'Novo Convênio'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo do Convênio</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400"><ShieldPlus size={24} /></div>
              <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-50 transition-colors">
                <Plus size={14} /> Enviar foto
                <input type="file" className="hidden" accept="image/*" />
              </label>
            </div>
          </div>
          <InputField label="Nome do Convênio *" required placeholder="Ex: Unimed"
            value={form.nome} onChange={e => setCampo('nome', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Código" placeholder="Ex: UNI001"
              value={form.codigo} onChange={e => setCampo('codigo', e.target.value)} />
            <SelectField label="Tipo *" required value={form.tipo} onChange={e => setCampo('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Registro ANS" placeholder="Opcional"
              value={form.codigo_ans} onChange={e => setCampo('codigo_ans', e.target.value)} />
            <InputField label="Percentual de Repasse (%)" type="number" min={0} max={100} placeholder="80"
              value={form.percentual_repasse} onChange={e => setCampo('percentual_repasse', e.target.value)} />
          </div>
          <SelectField label="Situação" value={form.ativo ? 'ativo' : 'inativo'}
            onChange={e => setCampo('ativo', e.target.value === 'ativo')}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </SelectField>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações Internas</label>
            <textarea rows={3} value={form.observacoes} onChange={e => setCampo('observacoes', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none"
              placeholder="Detalhes, contatos..." />
          </div>

          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Convênio'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
