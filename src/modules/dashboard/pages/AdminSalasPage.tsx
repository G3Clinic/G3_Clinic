import { useState, useEffect, useCallback } from 'react';
import { DoorOpen, Plus, Edit2, Trash2, Info, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { salasApi, type APISala } from '../../../services/api';

const TIPOS = ['Consultório', 'Procedimento', 'Odontológica', 'Emergência'];

type Form = { nome: string; tipo: string; capacidade: string; status: string; observacoes: string };
const FORM_VAZIO: Form = { nome: '', tipo: '', capacidade: '1', status: 'Disponível', observacoes: '' };

export function AdminSalasPage() {
  const [lista, setLista] = useState<APISala[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const setCampo = (c: keyof Form, v: string) => setForm(prev => ({ ...prev, [c]: v }));

  const carregar = useCallback(() => {
    setLoading(true);
    salasApi.listar().then(setLista)
      .catch(e => console.error('Erro ao carregar salas:', e))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setEditandoId(null); setForm(FORM_VAZIO); setErro(''); setModal(true); };
  const abrirEdicao = (s: APISala) => {
    setEditandoId(s.id);
    setForm({
      nome: s.nome, tipo: s.tipo || '', capacidade: s.capacidade != null ? String(s.capacidade) : '',
      // Só existem dois status agora; qualquer legado (ex.: "Ocupada") vira Disponível.
      status: s.status === 'Manutenção' ? 'Manutenção' : 'Disponível', observacoes: s.observacoes || '',
    });
    setErro(''); setModal(true);
  };

  const salvar = async () => {
    setErro('');
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    if (!form.tipo) { setErro('Selecione o tipo da sala.'); return; }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(), tipo: form.tipo,
        capacidade: form.capacidade ? Number(form.capacidade) : undefined,
        status: form.status, observacoes: form.observacoes.trim() || undefined,
      };
      if (editandoId) await salasApi.atualizar(editandoId, payload);
      else await salasApi.criar(payload);
      setModal(false); carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar sala.');
    } finally { setSalvando(false); }
  };

  const excluir = async (s: APISala) => {
    if (!confirm(`Excluir a sala "${s.nome}"?`)) return;
    try { await salasApi.excluir(s.id); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao excluir sala.'); }
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={DoorOpen} title="Cadastro de Salas" subtitle="As salas cadastradas ficam disponíveis automaticamente na Agenda">
        <Btn icon={Plus} onClick={abrirNovo}>Nova Sala</Btn>
      </PageHeader>
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700 flex gap-2 items-start">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          As salas cadastradas aqui ficam disponíveis automaticamente na <strong>Agenda</strong> para agendamento de pacientes com profissional e sala específicos.
        </div>
      </div>

      {loading ? (
        <Card><p className="text-center py-8 text-slate-500">Carregando salas...</p></Card>
      ) : lista.length === 0 ? (
        <Card><p className="text-center py-8 text-slate-500">Nenhuma sala cadastrada.</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map(s => (
            <Card key={s.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-brand-primary">
                    <DoorOpen size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{s.nome}</h4>
                    <p className="text-xs text-slate-500">{s.tipo || '—'} · Cap. {s.capacidade ?? '—'}</p>
                  </div>
                </div>
                <Badge color={s.status === 'Disponível' ? 'green' : 'yellow'}>{s.status || 'Disponível'}</Badge>
              </div>
              <div className="flex gap-2 mt-4">
                <Btn size="sm" variant="secondary" icon={Edit2} className="flex-1 justify-center" onClick={() => abrirEdicao(s)}>Editar</Btn>
                <button onClick={() => excluir(s)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editandoId ? 'Editar Sala' : 'Nova Sala'}>
        <div className="space-y-4">
          <InputField label="Nome da Sala" required placeholder="Ex: Sala 05"
            value={form.nome} onChange={e => setCampo('nome', e.target.value)} />
          <SelectField label="Tipo de Sala" required value={form.tipo} onChange={e => setCampo('tipo', e.target.value)}>
            <option value="">Selecione</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Capacidade (pacientes)" type="number" min={1}
              value={form.capacidade} onChange={e => setCampo('capacidade', e.target.value)} />
            <SelectField label="Status" value={form.status} onChange={e => setCampo('status', e.target.value)}>
              <option>Disponível</option>
              <option>Manutenção</option>
            </SelectField>
          </div>
          <p className="text-[11px] text-slate-500 -mt-2">
            <strong>Disponível</strong> aceita agendamentos; <strong>Manutenção</strong> bloqueia novos agendamentos.
            A ocupação em tempo real é gerenciada automaticamente pela Agenda.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações</label>
            <textarea rows={2} placeholder="Informações adicionais sobre a sala..."
              value={form.observacoes} onChange={e => setCampo('observacoes', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none" />
          </div>
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Sala'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
