import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, User, FileText, Activity, Stethoscope, FileSymlink, AlertCircle, Plus, Trash2, Pill, BookText, Save, Edit2, Settings, ChevronRight } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, InputField, Modal } from '../../../components/ui/shared';
import {
  pacientesApi, atendimentosClinicosApi, evolucoesApi, documentosApi, modelosProntuarioApi,
  type APIPaciente, type APIEvolucao, type APIModeloProntuario,
} from '../../../services/api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useMemed } from '../../../hooks/useMemed';

// Barra de ferramentas rica para a evolução clínica
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
};

type TabId = 'triagem' | 'evolucao' | 'exames' | 'receituario' | 'atestado';
const idade = (nasc?: string) => nasc ? Math.floor((Date.now() - new Date(nasc).getTime()) / 31557600000) : null;

export function ProntuarioPage() {
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [busca, setBusca] = useState('');
  const [paciente, setPaciente] = useState<APIPaciente | null>(null);
  const [atendimentoId, setAtendimentoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('triagem');

  // triagem
  const [tri, setTri] = useState<Record<string, string>>({});
  const setT = (k: string, v: string) => setTri(p => ({ ...p, [k]: v }));
  const imc = (() => { const p = parseFloat(tri.peso), a = parseFloat(tri.altura); return p > 0 && a > 0 ? p / (a * a) : null; })();

  // evolução (editor rico + modelos HTML)
  const [evolucoes, setEvolucoes] = useState<APIEvolucao[]>([]);
  const [novaEvolucao, setNovaEvolucao] = useState('');
  const [evolExpandidas, setEvolExpandidas] = useState<Set<string>>(new Set());
  const toggleEvol = (id: string) => setEvolExpandidas(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const resumoHtml = (html?: string | null) =>
    (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Evolução clínica';
  const [modelos, setModelos] = useState<APIModeloProntuario[]>([]);
  const [modeloSel, setModeloSel] = useState('');
  // Gerenciamento de modelos (criar/editar/excluir)
  const [gerenciarOpen, setGerenciarOpen] = useState(false);
  const [modeloEditId, setModeloEditId] = useState<string | null>(null);
  const [modeloForm, setModeloForm] = useState({ titulo: '', conteudo: '' });
  const [salvandoModelo, setSalvandoModelo] = useState(false);

  const htmlDoModelo = (m?: APIModeloProntuario) =>
    !m ? '' : (typeof m.conteudo === 'string' ? m.conteudo : (m.conteudo?.html ?? ''));

  const carregarModelos = useCallback(() => {
    modelosProntuarioApi.listar().then(setModelos).catch(() => {});
  }, []);

  const aplicarModelo = (id: string) => {
    setModeloSel(id);
    if (!id) return;
    const m = modelos.find(x => x.id === id);
    if (!m) return;
    const html = htmlDoModelo(m);
    const temConteudo = novaEvolucao.replace(/<[^>]*>/g, '').trim().length > 0;
    if (temConteudo && !window.confirm('Substituir o conteúdo atual da evolução pelo modelo selecionado?')) {
      setModeloSel('');
      return;
    }
    setNovaEvolucao(html);
  };

  // ── CRUD de modelos ──────────────────────────────────
  const abrirGerenciarModelos = (conteudoInicial = '') => {
    setModeloEditId(null);
    setModeloForm({ titulo: '', conteudo: conteudoInicial });
    setGerenciarOpen(true);
  };
  const novoModelo = () => { setModeloEditId(null); setModeloForm({ titulo: '', conteudo: '' }); };
  const editarModelo = (m: APIModeloProntuario) => {
    setModeloEditId(m.id);
    setModeloForm({ titulo: m.titulo || '', conteudo: htmlDoModelo(m) });
  };
  const excluirModelo = async (m: APIModeloProntuario) => {
    if (!window.confirm(`Excluir o modelo "${m.titulo || 'Sem título'}"?`)) return;
    try {
      await modelosProntuarioApi.excluir(m.id);
      if (modeloEditId === m.id) novoModelo();
      if (modeloSel === m.id) setModeloSel('');
      carregarModelos();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao excluir modelo.'); }
  };
  const salvarModeloForm = async () => {
    const titulo = modeloForm.titulo.trim();
    if (!titulo) return;
    setSalvandoModelo(true);
    try {
      if (modeloEditId) await modelosProntuarioApi.atualizar(modeloEditId, { titulo, conteudo: modeloForm.conteudo });
      else await modelosProntuarioApi.criar({ titulo, conteudo: modeloForm.conteudo });
      carregarModelos();
      novoModelo();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao salvar modelo.'); }
    finally { setSalvandoModelo(false); }
  };

  // exames / receituário / atestado (docs JSON)
  const [exames, setExames] = useState<{ tipo: string; justificativa: string }[]>([]);
  const [novoExame, setNovoExame] = useState({ tipo: '', justificativa: '' });
  const [receita, setReceita] = useState<{ medicamento: string; posologia: string }[]>([]);
  const [novoMed, setNovoMed] = useState({ medicamento: '', posologia: '' });
  const [atestado, setAtestado] = useState({ dias: '', cid: '', texto: '' });

  // Prescrição digital Memed (integração homologada — hook compartilhado)
  const { pronto: memedPronto, erro: memedErro, iniciar: iniciarMemed, abrirPrescricao } = useMemed();

  // Carrega o script uma vez ao abrir a aba de receituário (carregamento antecipado).
  useEffect(() => { if (activeTab === 'receituario') iniciarMemed(); }, [activeTab, iniciarMemed]);

  const abrirPrescricaoMemed = () => {
    if (!paciente) return;
    abrirPrescricao(
      { id: paciente.id, nome: paciente.nome, sexo: paciente.sexo, cpf: paciente.cpf, data_nascimento: paciente.data_nascimento, telefone: paciente.telefone, email: paciente.email },
      { nome: 'Clínica', uf: paciente.uf || undefined, cidade: paciente.cidade || undefined },
    );
  };

  useEffect(() => { pacientesApi.listar().then(setPacientes).catch(() => {}); }, []);
  useEffect(() => { carregarModelos(); }, [carregarModelos]);

  const getImcClass = (val: number | null) => {
    if (!val) return '';
    if (val < 18.5) return 'bg-blue-100 text-blue-900';
    if (val <= 24.9) return 'bg-emerald-100 text-emerald-900 font-bold';
    if (val <= 29.9) return 'bg-yellow-100 text-yellow-900';
    if (val <= 34.9) return 'bg-orange-100 text-orange-900';
    if (val <= 39.9) return 'bg-red-100 text-red-900';
    return 'bg-red-200 text-red-900 font-bold';
  };

  const carregarAtendimento = useCallback(async (atdId: string) => {
    // evoluções
    const evs = await evolucoesApi.listar().catch(() => []);
    setEvolucoes(evs.filter(e => e.atendimento_id === atdId));
    // documentos (triagem/exames/receituario/atestado)
    const docs = await documentosApi.listar().catch(() => []);
    const meus = docs.filter(d => d.atendimento_id === atdId);
    const dTri = meus.find(d => d.tipo === 'triagem'); if (dTri?.conteudo) setTri(dTri.conteudo);
    const dEx = meus.find(d => d.tipo === 'exames'); setExames(dEx?.conteudo || []);
    const dRec = meus.find(d => d.tipo === 'receituario'); setReceita(dRec?.conteudo || []);
    const dAt = meus.find(d => d.tipo === 'atestado'); if (dAt?.conteudo) setAtestado(dAt.conteudo);
  }, []);

  const abrirProntuario = async (p: APIPaciente) => {
    setPaciente(p); setActiveTab('triagem'); setTri({}); setExames([]); setReceita([]); setAtestado({ dias: '', cid: '', texto: '' });
    // acha atendimento existente do paciente ou cria um novo
    const todos = await atendimentosClinicosApi.listar().catch(() => []);
    let atd = todos.find(a => a.paciente_id === p.id);
    if (!atd) atd = await atendimentosClinicosApi.criar({ paciente_id: p.id, data_atendimento: new Date().toISOString() });
    setAtendimentoId(atd.id);
    await carregarAtendimento(atd.id);
  };

  // upsert de documento por tipo
  const salvarDoc = async (tipo: string, conteudo: any) => {
    if (!atendimentoId) return;
    const docs = await documentosApi.listar().catch(() => []);
    const existente = docs.find(d => d.atendimento_id === atendimentoId && d.tipo === tipo);
    if (existente) await documentosApi.atualizar(existente.id, { conteudo });
    else await documentosApi.criar({ atendimento_id: atendimentoId, tipo, conteudo });
  };

  const salvarTriagem = async () => { await salvarDoc('triagem', tri); alert('Triagem salva!'); };
  const salvarEvolucao = async () => {
    const semTags = novaEvolucao.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!atendimentoId || !semTags) return;
    await evolucoesApi.criar({ atendimento_id: atendimentoId, texto_evolucao: novaEvolucao });
    setNovaEvolucao(''); setModeloSel(''); await carregarAtendimento(atendimentoId);
  };
  const addExame = async () => { if (!novoExame.tipo) return; const arr = [...exames, novoExame]; setExames(arr); setNovoExame({ tipo: '', justificativa: '' }); await salvarDoc('exames', arr); };
  const addMed = async () => { if (!novoMed.medicamento) return; const arr = [...receita, novoMed]; setReceita(arr); setNovoMed({ medicamento: '', posologia: '' }); await salvarDoc('receituario', arr); };
  const salvarAtestado = async () => { await salvarDoc('atestado', atestado); alert('Atestado salvo!'); };

  const pFiltrados = pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.cpf || '').includes(busca));
  const tabs = [
    { id: 'triagem', label: 'Triagem / Sinais Vitais', icon: Activity },
    { id: 'evolucao', label: 'Evolução Clínica', icon: ClipboardList },
    { id: 'exames', label: 'Exames Solicitados', icon: Stethoscope },
    { id: 'receituario', label: 'Receituário Médico', icon: FileText },
    { id: 'atestado', label: 'Atestado', icon: FileSymlink },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Prontuário Eletrônico" subtitle="Registro clínico detalhado e histórico do paciente">
        {paciente && <Btn size="sm" icon={User} onClick={() => { setPaciente(null); setAtendimentoId(null); }}>Trocar Paciente</Btn>}
      </PageHeader>

      <Card padding={false} className="overflow-hidden">
        {paciente ? (
          <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between bg-brand-light/30 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold text-xl">{paciente.nome.substring(0, 2).toUpperCase()}</div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{paciente.nome}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>CPF: {paciente.cpf}</span>
                  {idade(paciente.data_nascimento) != null && <><span>•</span><span>{idade(paciente.data_nascimento)} anos</span></>}
                  {paciente.alergias && <><span>•</span><span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12} /> Alérgico: {paciente.alergias}</span></>}
                </div>
              </div>
            </div>
            <Badge color="blue">Plano: {paciente.plano_saude || 'Particular'}</Badge>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative flex-1 max-w-2xl">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar paciente pelo nome ou CPF..."
                  className="w-full border border-gray-200 rounded-xl bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-slate-800 transition-all shadow-sm" />
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Selecione um Paciente</h3>
              <div className="flex flex-col gap-2">
                {pFiltrados.length === 0 ? <p className="text-sm text-slate-400 py-4">Nenhum paciente encontrado.</p>
                  : pFiltrados.map(p => (
                    <div key={p.id} onClick={() => abrirProntuario(p)} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-brand-primary hover:bg-brand-light/10 cursor-pointer transition-all bg-white group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-full flex items-center justify-center font-bold text-sm">{p.nome.substring(0, 2).toUpperCase()}</div>
                        <div><p className="font-bold text-slate-800 group-hover:text-brand-primary transition-colors">{p.nome}</p><div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5"><span>CPF: {p.cpf}</span>{idade(p.data_nascimento) != null && <><span>•</span><span>{idade(p.data_nascimento)} anos</span></>}</div></div>
                      </div>
                      <Btn size="sm" variant="ghost" className="text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">Abrir Prontuário</Btn>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {paciente && (
        <Card padding={false}>
          <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id; const Icon = tab.icon;
              return <button key={tab.id} onClick={() => setActiveTab(tab.id as TabId)} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${isActive ? 'border-brand-primary text-brand-primary bg-brand-light/20' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'}`}><Icon size={16} />{tab.label}</button>;
            })}
          </div>

          <div className="p-6">
            {activeTab === 'triagem' && (
              <div className="space-y-6 animate-fade-in-up">
                <h4 className="font-bold text-slate-700 text-sm border-b border-gray-100 pb-2">Sinais Vitais</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <InputField label="PA Sistólica" type="number" placeholder="120" value={tri.pa_sistolica || ''} onChange={e => setT('pa_sistolica', e.target.value)} />
                  <InputField label="PA Diastólica" type="number" placeholder="80" value={tri.pa_diastolica || ''} onChange={e => setT('pa_diastolica', e.target.value)} />
                  <InputField label="FC (bpm)" type="number" placeholder="75" value={tri.fc || ''} onChange={e => setT('fc', e.target.value)} />
                  <InputField label="FR (rpm)" type="number" placeholder="16" value={tri.fr || ''} onChange={e => setT('fr', e.target.value)} />
                  <InputField label="Temperatura (°C)" type="number" step="0.1" placeholder="36.5" value={tri.temp || ''} onChange={e => setT('temp', e.target.value)} />
                  <InputField label="Saturação SpO2 (%)" type="number" placeholder="98" value={tri.spo2 || ''} onChange={e => setT('spo2', e.target.value)} />
                  <InputField label="Glicemia (mg/dL)" type="number" placeholder="90" value={tri.glicemia || ''} onChange={e => setT('glicemia', e.target.value)} />
                </div>
                <h4 className="font-bold text-slate-700 text-sm border-b border-gray-100 pb-2 mt-6">Antropometria e IMC</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <InputField label="Peso (kg)" type="number" step="0.1" placeholder="70" value={tri.peso || ''} onChange={e => setT('peso', e.target.value)} />
                    <InputField label="Altura (m)" type="number" step="0.01" placeholder="1.75" value={tri.altura || ''} onChange={e => setT('altura', e.target.value)} />
                    <InputField label="IMC Calculado" value={imc ? imc.toFixed(1) : '—'} disabled />
                  </div>
                  <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden h-fit">
                    <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-2 text-left text-slate-500">Classificação</th><th className="p-2 text-left text-slate-500">IMC (kg/m²)</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className={imc && imc < 18.5 ? getImcClass(imc) : ''}><td className="p-2">Baixo peso</td><td className="p-2">&lt; 18,5</td></tr>
                      <tr className={imc && imc >= 18.5 && imc <= 24.9 ? getImcClass(imc) : ''}><td className="p-2">Normal</td><td className="p-2">18,5 – 24,9</td></tr>
                      <tr className={imc && imc >= 25 && imc <= 29.9 ? getImcClass(imc) : ''}><td className="p-2">Pré-obeso</td><td className="p-2">25,0 – 29,9</td></tr>
                      <tr className={imc && imc >= 30 && imc <= 34.9 ? getImcClass(imc) : ''}><td className="p-2">Obeso I</td><td className="p-2">30,0 – 34,9</td></tr>
                      <tr className={imc && imc >= 35 && imc <= 39.9 ? getImcClass(imc) : ''}><td className="p-2">Obeso II</td><td className="p-2">35,0 – 39,9</td></tr>
                      <tr className={imc && imc >= 40 ? getImcClass(imc) : ''}><td className="p-2">Obeso III</td><td className="p-2">≥ 40</td></tr>
                    </tbody>
                  </table>
                </div>
                <h4 className="font-bold text-slate-700 text-sm border-b border-gray-100 pb-2 mt-6">Observações de Triagem</h4>
                <textarea rows={3} value={tri.observacoes || ''} onChange={e => setT('observacoes', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" placeholder="Queixas principais, alergias, motivo da consulta..." />
                <div className="flex justify-end"><Btn onClick={salvarTriagem}>Salvar Triagem</Btn></div>
              </div>
            )}

            {activeTab === 'evolucao' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="font-bold text-slate-700 text-sm mb-3">Histórico</h4>
                  <div className="space-y-2">
                    {evolucoes.length === 0 ? <p className="text-sm text-slate-400">Nenhuma evolução registrada.</p>
                      : [...evolucoes].reverse().map(e => {
                        const aberta = evolExpandidas.has(e.id);
                        return (
                          <div key={e.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                            <button onClick={() => toggleEvol(e.id)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left transition-colors">
                              <ChevronRight size={16} className={`shrink-0 text-slate-400 transition-transform ${aberta ? 'rotate-90' : ''}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-brand-primary">{e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : 'Evolução'}</p>
                                {!aberta && <p className="text-xs text-slate-500 truncate mt-0.5">{resumoHtml(e.texto_evolucao)}</p>}
                              </div>
                            </button>
                            {aberta && (
                              <div className="border-t border-gray-100 overflow-x-auto">
                                <div className="px-4 pb-4 pt-2 text-sm text-slate-700 break-words [overflow-wrap:anywhere] [word-break:break-word] prose prose-sm max-w-none prose-hr:my-2 prose-p:my-1.5 prose-p:whitespace-normal prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
                                     dangerouslySetInnerHTML={{ __html: e.texto_evolucao || '' }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <label className="block text-xs font-semibold text-slate-600">Nova Evolução (SOAP)</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <BookText size={14} className="text-brand-primary" />
                        <select value={modeloSel} onChange={e => aplicarModelo(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-primary bg-white max-w-[220px]">
                          <option value="">Carregar modelo…</option>
                          {modelos.map(m => <option key={m.id} value={m.id}>{m.titulo || 'Sem título'}</option>)}
                        </select>
                      </div>
                      <Btn size="sm" variant="outline" icon={Save} onClick={() => abrirGerenciarModelos(novaEvolucao)}>Salvar como modelo</Btn>
                      <Btn size="sm" variant="ghost" icon={Settings} onClick={() => { novoModelo(); setGerenciarOpen(true); }}>Gerenciar</Btn>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                    <ReactQuill theme="snow" value={novaEvolucao} onChange={setNovaEvolucao} modules={QUILL_MODULES}
                      className="h-72 mb-12" placeholder="Subjetivo, Objetivo, Avaliação e Plano — ou carregue um modelo acima." />
                  </div>
                </div>
                <div className="flex justify-end"><Btn onClick={salvarEvolucao}>Assinar e Salvar</Btn></div>
              </div>
            )}

            {activeTab === 'exames' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="flex gap-4 items-end">
                  <div className="flex-1"><InputField label="Tipo de Exame" placeholder="Ex: Hemograma Completo" value={novoExame.tipo} onChange={e => setNovoExame({ ...novoExame, tipo: e.target.value })} /></div>
                  <div className="flex-1"><InputField label="Justificativa Clínica" placeholder="CID ou motivo..." value={novoExame.justificativa} onChange={e => setNovoExame({ ...novoExame, justificativa: e.target.value })} /></div>
                  <Btn icon={Plus} onClick={addExame}>Adicionar</Btn>
                </div>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="p-3 text-slate-500 font-bold">Exame</th><th className="p-3 text-slate-500 font-bold">Justificativa</th><th className="p-3"></th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {exames.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-slate-400">Nenhum exame adicionado.</td></tr>
                        : exames.map((ex, i) => <tr key={i}><td className="p-3 font-medium text-slate-700">{ex.tipo}</td><td className="p-3 text-slate-500">{ex.justificativa || '—'}</td><td className="p-3 text-right"><button onClick={() => { const arr = exames.filter((_, j) => j !== i); setExames(arr); salvarDoc('exames', arr); }} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'receituario' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="flex gap-4 items-end">
                  <div className="flex-1"><InputField label="Medicamento" placeholder="Nome e concentração" value={novoMed.medicamento} onChange={e => setNovoMed({ ...novoMed, medicamento: e.target.value })} /></div>
                  <div className="flex-1"><InputField label="Posologia" placeholder="Ex: 1 comp 8/8h por 5 dias" value={novoMed.posologia} onChange={e => setNovoMed({ ...novoMed, posologia: e.target.value })} /></div>
                  <Btn icon={Plus} onClick={addMed}>Adicionar</Btn>
                </div>
                <div className="bg-[#fefce8] border border-[#fef08a] rounded-xl p-5 shadow-sm min-h-[200px] font-serif text-slate-800">
                  <h3 className="text-center font-bold text-lg border-b border-[#fde047] pb-2 mb-4">RECEITUÁRIO MÉDICO</h3>
                  {receita.length === 0 ? <p className="text-sm italic text-slate-500 text-center mb-8">Nenhum medicamento prescrito.</p>
                    : <ol className="list-decimal pl-6 space-y-2">{receita.map((m, i) => <li key={i} className="text-sm"><strong>{m.medicamento}</strong> — {m.posologia} <button onClick={() => { const arr = receita.filter((_, j) => j !== i); setReceita(arr); salvarDoc('receituario', arr); }} className="text-red-400 hover:text-red-600 ml-2 not-italic">✕</button></li>)}</ol>}
                </div>

                {/* Prescrição Digital (Memed) */}
                <div className="p-4 bg-brand-light/30 border border-brand-primary/20 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-brand-dark flex items-center gap-2"><Pill size={16} /> Prescrição Digital (Memed)</label>
                    <Btn size="sm" onClick={abrirPrescricaoMemed} disabled={!memedPronto}>
                      {memedPronto ? 'Abrir Prescrição' : 'Preparando prescrição…'}
                    </Btn>
                  </div>
                  {memedErro ? (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      ⚠️ {memedErro}
                    </div>
                  ) : memedPronto ? (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      ✓ Memed pronta — clique para abrir o receituário digital do paciente.
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Carregando o módulo oficial de receituário digital da Memed…</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'atestado' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="grid grid-cols-3 gap-4">
                  <InputField label="Dias de Repouso" type="number" placeholder="Qtd de dias" value={atestado.dias} onChange={e => setAtestado({ ...atestado, dias: e.target.value })} />
                  <InputField label="CID (Opcional)" placeholder="Código CID-10" value={atestado.cid} onChange={e => setAtestado({ ...atestado, cid: e.target.value })} />
                  <div />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Texto do Atestado</label>
                  <textarea rows={5} value={atestado.texto} onChange={e => setAtestado({ ...atestado, texto: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    placeholder={`Atesto para os devidos fins que ${paciente.nome} necessita de [X] dias de repouso a partir desta data.`} />
                </div>
                <div className="flex justify-end"><Btn onClick={salvarAtestado}>Salvar Atestado</Btn></div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Modal open={gerenciarOpen} onClose={() => setGerenciarOpen(false)} title="Modelos de Prontuário" maxWidth="max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Lista de modelos salvos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-700">Modelos salvos ({modelos.length})</h4>
              <Btn size="sm" variant="secondary" icon={Plus} onClick={novoModelo}>Novo</Btn>
            </div>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
              {modelos.length === 0 ? (
                <p className="text-sm text-slate-400 p-4 text-center">Nenhum modelo cadastrado.</p>
              ) : modelos.map(m => (
                <div key={m.id} className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${modeloEditId === m.id ? 'bg-brand-light/20' : ''}`}>
                  <button onClick={() => editarModelo(m)} className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{m.titulo || 'Sem título'}</p>
                    <p className="text-[10px] text-slate-400">{m.criado_em ? new Date(m.criado_em).toLocaleDateString('pt-BR') : ''}</p>
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <button title="Editar" onClick={() => editarModelo(m)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14} /></button>
                    <button title="Excluir" onClick={() => excluirModelo(m)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor do modelo (criar/editar) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-700">{modeloEditId ? 'Editar modelo' : 'Novo modelo'}</h4>
              {novaEvolucao.replace(/<[^>]*>/g, '').trim() && (
                <button onClick={() => setModeloForm(f => ({ ...f, conteudo: novaEvolucao }))} className="text-[11px] font-bold text-brand-primary hover:underline">Usar evolução atual</button>
              )}
            </div>
            <InputField label="Título *" required placeholder="Ex: Consulta Clínica Geral — SOAP"
              value={modeloForm.titulo} onChange={e => setModeloForm(f => ({ ...f, titulo: e.target.value }))} />
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
              <ReactQuill theme="snow" value={modeloForm.conteudo} onChange={v => setModeloForm(f => ({ ...f, conteudo: v }))}
                modules={QUILL_MODULES} className="h-56 mb-12" placeholder="Conteúdo do modelo (HTML rico)..." />
            </div>
            <div className="flex justify-end gap-2">
              {modeloEditId && <Btn variant="ghost" onClick={novoModelo}>Cancelar edição</Btn>}
              <Btn icon={Save} onClick={salvarModeloForm} disabled={!modeloForm.titulo.trim() || salvandoModelo}>
                {salvandoModelo ? 'Salvando...' : modeloEditId ? 'Atualizar modelo' : 'Criar modelo'}
              </Btn>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setGerenciarOpen(false)}>Fechar</Btn>
        </div>
      </Modal>
    </div>
  );
}
