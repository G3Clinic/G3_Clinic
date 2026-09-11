import { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Plus, Send, PackageCheck, FileCheck2, Edit, Trash2, Clock } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import {
  recepcaoLabApi, laudosApi, pacientesApi, usuariosApi,
  type APIRecepcaoLab, type APILaudo, type APIPaciente, type APIUsuario,
} from '../../../services/api';

// "Site do laboratório" — portal interno de envio/recebimento de trabalhos e exames com
// laboratórios parceiros (próteses, exames, etc.). Não integra com nenhum sistema
// externo de verdade (não há credenciais de nenhum laboratório específico), então é um
// registro manual: a clínica lança o que foi enviado e, quando o laboratório retorna,
// lança o laudo/resultado vinculado. Os modelos (RecepcaoLab, Laudo) já existiam no
// backend — só faltava a tela.
type Tab = 'trabalhos' | 'laudos';
const STATUS_TRABALHO = ['em_producao', 'pronto', 'entregue', 'cancelado'];
const STATUS_LABEL: Record<string, string> = { em_producao: 'Em Produção', pronto: 'Pronto (aguardando retirada)', entregue: 'Entregue ao Paciente', cancelado: 'Cancelado' };
const STATUS_LAUDO_LABEL: Record<string, string> = { pendente: 'Pendente', recebido: 'Recebido' };

export function LaboratorioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('trabalhos');
  const [trabalhos, setTrabalhos] = useState<APIRecepcaoLab[]>([]);
  const [laudos, setLaudos] = useState<APILaudo[]>([]);
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [usuarios, setUsuarios] = useState<APIUsuario[]>([]);

  const [modalTrabalho, setModalTrabalho] = useState(false);
  const [modalLaudo, setModalLaudo] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const TRABALHO_VAZIO = { paciente_id: '', profissional_id: '', laboratorio: '', tipo_trabalho: '', data_entrada: new Date().toISOString().slice(0, 10), data_prevista: '', valor: '', observacoes: '' };
  const [trab, setTrab] = useState({ ...TRABALHO_VAZIO });
  const LAUDO_VAZIO = { recepcao_lab_id: '', profissional_id: '', tipo: '', descricao: '', data_emissao: new Date().toISOString().slice(0, 10) };
  const [lau, setLau] = useState({ ...LAUDO_VAZIO });

  const carregar = useCallback(() => {
    recepcaoLabApi.listar().then(setTrabalhos).catch(() => {});
    laudosApi.listar().then(setLaudos).catch(() => {});
    pacientesApi.listar().then(setPacientes).catch(() => {});
    usuariosApi.listar().then(setUsuarios).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomePac = (id?: number | null) => pacientes.find(p => String(p.id) === String(id))?.nome || '—';
  const nomeUsr = (id?: string | null) => usuarios.find(u => u.id === id)?.nome || '—';
  const trabalhoLabel = (id?: string | null) => {
    const t = trabalhos.find(t => t.id === id);
    return t ? `${nomePac(t.paciente_id)} · ${t.tipo_trabalho || t.laboratorio || t.id}` : '—';
  };

  const abrirNovoTrabalho = () => { setEditId(null); setTrab({ ...TRABALHO_VAZIO }); setModalTrabalho(true); };
  const editarTrabalho = (t: APIRecepcaoLab) => {
    setEditId(t.id);
    setTrab({
      paciente_id: t.paciente_id != null ? String(t.paciente_id) : '', profissional_id: t.profissional_id || '',
      laboratorio: t.laboratorio || '', tipo_trabalho: t.tipo_trabalho || '',
      data_entrada: t.data_entrada || '', data_prevista: t.data_prevista || '',
      valor: t.valor != null ? String(t.valor) : '', observacoes: t.observacoes || '',
    });
    setModalTrabalho(true);
  };
  const salvarTrabalho = async () => {
    if (!trab.paciente_id || !trab.laboratorio.trim()) return alert('Paciente e laboratório são obrigatórios.');
    const payload = {
      paciente_id: Number(trab.paciente_id), profissional_id: trab.profissional_id || undefined,
      laboratorio: trab.laboratorio.trim(), tipo_trabalho: trab.tipo_trabalho || undefined,
      data_entrada: trab.data_entrada || undefined, data_prevista: trab.data_prevista || undefined,
      valor: trab.valor ? Number(trab.valor) : undefined, observacoes: trab.observacoes || undefined,
      status: editId ? undefined : 'em_producao',
    };
    try { if (editId) await recepcaoLabApi.atualizar(editId, payload); else await recepcaoLabApi.criar(payload); setModalTrabalho(false); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao salvar.'); }
  };
  const mudarStatusTrabalho = async (t: APIRecepcaoLab, status: string) => {
    try {
      const payload: Partial<APIRecepcaoLab> = { status };
      if (status === 'entregue' && !t.data_retorno) payload.data_retorno = new Date().toISOString().slice(0, 10);
      await recepcaoLabApi.atualizar(t.id, payload);
      carregar();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao atualizar status.'); }
  };

  const abrirNovoLaudo = (recepcaoLabId?: string) => { setEditId(null); setLau({ ...LAUDO_VAZIO, recepcao_lab_id: recepcaoLabId || '' }); setModalLaudo(true); };
  const salvarLaudo = async () => {
    if (!lau.recepcao_lab_id || !lau.descricao.trim()) return alert('Trabalho vinculado e descrição são obrigatórios.');
    try {
      await laudosApi.criar({
        recepcao_lab_id: lau.recepcao_lab_id, profissional_id: lau.profissional_id || undefined,
        tipo: lau.tipo || undefined, descricao: lau.descricao.trim(),
        data_emissao: lau.data_emissao || undefined, status: 'recebido', data_entrega: new Date().toISOString().slice(0, 10),
      });
      setModalLaudo(false);
      carregar();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao salvar laudo.'); }
  };
  const del = async (fn: () => Promise<unknown>) => { if (confirm('Excluir este registro?')) { await fn(); carregar(); } };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader icon={FlaskConical} title="Laboratório" subtitle="Envio e recebimento de trabalhos/exames com laboratórios parceiros" />
        <div className="flex gap-2 flex-wrap">
          {activeTab === 'trabalhos' && <Btn icon={Plus} onClick={abrirNovoTrabalho}>Enviar Novo Trabalho</Btn>}
          {activeTab === 'laudos' && <Btn icon={Plus} onClick={() => abrirNovoLaudo()}>Registrar Laudo/Resultado</Btn>}
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-px">
        {([{ id: 'trabalhos', label: 'Trabalhos Enviados', icon: Send }, { id: 'laudos', label: 'Laudos / Resultados', icon: FileCheck2 }] as const).map(tab => {
          const Icon = tab.icon; const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-brand-primary text-brand-primary bg-brand-light/20' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'}`}>
              <Icon size={16} />{tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'trabalhos' && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Profissional</th><th className="px-4 py-3">Laboratório</th><th className="px-4 py-3">Tipo de Trabalho</th>
                  <th className="px-4 py-3">Enviado em</th><th className="px-4 py-3">Previsto</th><th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trabalhos.length === 0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhum trabalho enviado ao laboratório ainda.</td></tr>
                  : [...trabalhos].reverse().map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-medium text-slate-700">{nomePac(t.paciente_id)}</td>
                      <td className="px-4 py-3 text-slate-500">{t.profissional_id ? nomeUsr(t.profissional_id) : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{t.laboratorio}</td>
                      <td className="px-4 py-3 text-slate-500">{t.tipo_trabalho || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{t.data_entrada ? t.data_entrada.split('-').reverse().join('/') : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{t.data_prevista ? t.data_prevista.split('-').reverse().join('/') : '—'}</td>
                      <td className="px-4 py-3">
                        <select value={t.status || 'em_producao'} onChange={e => mudarStatusTrabalho(t, e.target.value)}
                          className="text-xs font-bold rounded-lg border border-gray-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20">
                          {STATUS_TRABALHO.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{t.valor != null ? `R$ ${t.valor.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button title="Registrar laudo/resultado" onClick={() => abrirNovoLaudo(t.id)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light/50 rounded-lg"><PackageCheck size={16} /></button>
                        <button title="Editar" onClick={() => editarTrabalho(t)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light/50 rounded-lg"><Edit size={16} /></button>
                        <button title="Excluir" onClick={() => del(() => recepcaoLabApi.excluir(t.id))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'laudos' && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Trabalho vinculado</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Descrição / Resultado</th>
                  <th className="px-4 py-3">Emitido em</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {laudos.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  <Clock size={28} className="mx-auto mb-2 text-slate-200" />Nenhum laudo/resultado registrado ainda.
                </td></tr>
                  : [...laudos].reverse().map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-medium text-slate-700">{trabalhoLabel(l.recepcao_lab_id)}</td>
                      <td className="px-4 py-3 text-slate-500">{l.tipo || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-md truncate" title={l.descricao || ''}>{l.descricao || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{l.data_emissao ? l.data_emissao.split('-').reverse().join('/') : '—'}</td>
                      <td className="px-4 py-3"><Badge color={l.status === 'recebido' ? 'green' : 'yellow'}>{STATUS_LAUDO_LABEL[l.status || 'pendente']}</Badge></td>
                      <td className="px-4 py-3"><button title="Excluir" onClick={() => del(() => laudosApi.excluir(l.id))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: novo/editar trabalho enviado ao laboratório */}
      <Modal open={modalTrabalho} onClose={() => setModalTrabalho(false)} title={editId ? 'Editar Trabalho' : 'Enviar Novo Trabalho ao Laboratório'}>
        <div className="space-y-4">
          <SelectField label="Paciente *" value={trab.paciente_id} onChange={e => setTrab({ ...trab, paciente_id: e.target.value })}>
            <option value="">Selecione...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </SelectField>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Laboratório *" placeholder="Ex: Lab. Prótese ABC" value={trab.laboratorio} onChange={e => setTrab({ ...trab, laboratorio: e.target.value })} />
            <InputField label="Tipo de Trabalho" placeholder="Ex: Prótese, Placa, Exame..." value={trab.tipo_trabalho} onChange={e => setTrab({ ...trab, tipo_trabalho: e.target.value })} />
          </div>
          <SelectField label="Profissional Solicitante" value={trab.profissional_id} onChange={e => setTrab({ ...trab, profissional_id: e.target.value })}>
            <option value="">Sem vínculo</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </SelectField>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Data de Envio" type="date" value={trab.data_entrada} onChange={e => setTrab({ ...trab, data_entrada: e.target.value })} />
            <InputField label="Previsão de Retorno" type="date" value={trab.data_prevista} onChange={e => setTrab({ ...trab, data_prevista: e.target.value })} />
          </div>
          <InputField label="Valor (R$)" type="number" step="0.01" value={trab.valor} onChange={e => setTrab({ ...trab, valor: e.target.value })} />
          <InputField label="Observações" value={trab.observacoes} onChange={e => setTrab({ ...trab, observacoes: e.target.value })} />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100"><Btn variant="ghost" onClick={() => setModalTrabalho(false)}>Cancelar</Btn><Btn onClick={salvarTrabalho}>Confirmar</Btn></div>
        </div>
      </Modal>

      {/* Modal: registrar laudo/resultado recebido */}
      <Modal open={modalLaudo} onClose={() => setModalLaudo(false)} title="Registrar Laudo / Resultado">
        <div className="space-y-4">
          <SelectField label="Trabalho vinculado *" value={lau.recepcao_lab_id} onChange={e => setLau({ ...lau, recepcao_lab_id: e.target.value })}>
            <option value="">Selecione...</option>{trabalhos.map(t => <option key={t.id} value={t.id}>{nomePac(t.paciente_id)} · {t.tipo_trabalho || t.laboratorio}</option>)}
          </SelectField>
          <InputField label="Tipo" placeholder="Ex: Resultado de exame, Prótese pronta..." value={lau.tipo} onChange={e => setLau({ ...lau, tipo: e.target.value })} />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição / Resultado *</label>
            <textarea rows={4} value={lau.descricao} onChange={e => setLau({ ...lau, descricao: e.target.value })} placeholder="Cole ou digite aqui o resultado/laudo enviado pelo laboratório..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
          </div>
          <InputField label="Data de Emissão" type="date" value={lau.data_emissao} onChange={e => setLau({ ...lau, data_emissao: e.target.value })} />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100"><Btn variant="ghost" onClick={() => setModalLaudo(false)}>Cancelar</Btn><Btn onClick={salvarLaudo}>Salvar</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
