import { useState, useEffect, useCallback, useRef } from 'react';
import { ClipboardList, Search, User, FileText, Activity, Stethoscope, FileSymlink, AlertCircle, Plus, Trash2, Pill, BookText, Save, Edit2, Settings, ChevronRight, Syringe, AlertTriangle, Printer } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, InputField, Modal } from '../../../components/ui/shared';
import {
  pacientesApi, atendimentosClinicosApi, evolucoesApi, documentosApi, modelosProntuarioApi,
  procedimentosApi, memedApi, vacinasApi, configApi, pacienteStore,
  type APIPaciente, type APIEvolucao, type APIModeloProntuario, type APIProcedimento, type APIVacina,
} from '../../../services/api';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useMemed } from '../../../hooks/useMemed';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { imprimirDocumento, escapeHtml } from '../../../utils/print';

// Linha divisória (<hr>) no editor — blot custom registrado uma única vez no módulo
const BlockEmbed: any = Quill.import('blots/block/embed');
class DividerBlot extends BlockEmbed {
  static blotName = 'divider';
  static tagName = 'hr';
}
Quill.register(DividerBlot, true);
const quillIcons: any = Quill.import('ui/icons');
quillIcons['divider'] = '<svg viewBox="0 0 18 18"><line class="ql-stroke" x1="2" y1="9" x2="16" y2="9"></line></svg>';

// Barra de ferramentas rica para a evolução clínica
const QUILL_MODULES = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      [{ color: [] }, { background: [] }],
      ['divider', 'clean'],
    ],
    handlers: {
      divider(this: { quill: any }) {
        const q = this.quill;
        const range = q.getSelection(true);
        q.insertText(range.index, '\n', 'user');
        q.insertEmbed(range.index + 1, 'divider', true, 'user');
        q.setSelection(range.index + 2, 0, 'silent');
      },
    },
  },
};

type TabId = 'vacinacao' | 'triagem' | 'evolucao' | 'exames' | 'receituario' | 'atestado';
const idade = (nasc?: string) => nasc ? Math.floor((Date.now() - new Date(nasc).getTime()) / 31557600000) : null;

export function ProntuarioPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [busca, setBusca] = useState('');
  const [paciente, setPaciente] = useState<APIPaciente | null>(null);
  const [atendimentoId, setAtendimentoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('triagem');
  const [anamnese, setAnamnese] = useState<any>(null);

  // Impressão formatada (exames, receituário, atestado) — cabeçalho da clínica + dados do paciente + assinatura
  const conselhoLabel = (u: typeof user) => u?.conselho_tipo && u?.conselho_numero
    ? `${u.conselho_tipo} ${u.conselho_numero}${u.conselho_uf ? '/' + u.conselho_uf : ''}` : undefined;
  const imprimir = (titulo: string, conteudoHtml: string, rodapeExtra?: string) => {
    if (!paciente) return;
    imprimirDocumento({
      titulo,
      empresa: { nome: theme.companyName || 'Clínica', logoUrl: theme.logoFullUrl || theme.logoIconUrl || undefined },
      paciente: { nome: paciente.nome, cpf: paciente.cpf, dataNascimento: paciente.data_nascimento },
      medico: { nome: user?.nome, conselho: conselhoLabel(user) },
      conteudoHtml,
      rodapeExtra,
    });
  };

  // triagem
  const [tri, setTri] = useState<Record<string, string>>({});
  const setT = (k: string, v: string) => setTri(p => ({ ...p, [k]: v }));
  const imc = (() => { 
    const p = parseFloat(tri.peso), a = parseFloat(tri.altura); 
    if (p > 0 && a > 0) {
      const aMetros = a / 100;
      return p / (aMetros * aMetros);
    }
    return null;
  })();

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
  const [exames, setExames] = useState<string>('');
  const [receita, setReceita] = useState<{ medicamento: string; quantidade: string; posologia: string }[]>([]);
  const [novoMed, setNovoMed] = useState({ medicamento: '', quantidade: '', posologia: '' });
  const [atestado, setAtestado] = useState({ dias: '', cid: '', texto: '' });

  // Caderneta de vacinação (FHIR Immunization local)
  const VACINA_VAZIA = { vacina: '', dose: '', data_aplicacao: '', lote: '', fabricante: '', via: '', local_aplicacao: '', aplicador: '', observacoes: '' };
  const [vacinas, setVacinas] = useState<APIVacina[]>([]);
  const [novaVacina, setNovaVacina] = useState({ ...VACINA_VAZIA });
  const [salvandoVacina, setSalvandoVacina] = useState(false);
  const setNV = (k: keyof typeof VACINA_VAZIA, v: string) => setNovaVacina(p => ({ ...p, [k]: v }));

  const carregarVacinas = useCallback((pacienteId?: number) => {
    if (!pacienteId) { setVacinas([]); return; }
    vacinasApi.listar().then(todas => setVacinas(todas.filter(v => Number(v.paciente_id) === pacienteId))).catch(() => setVacinas([]));
  }, []);

  const addVacina = async () => {
    if (!paciente || !novaVacina.vacina.trim()) return;
    setSalvandoVacina(true);
    try {
      await vacinasApi.criar({ ...novaVacina, paciente_id: paciente.id, status: 'aplicada' });
      setNovaVacina({ ...VACINA_VAZIA });
      carregarVacinas(paciente.id);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao registrar vacina.'); }
    finally { setSalvandoVacina(false); }
  };
  const excluirVacina = async (v: APIVacina) => {
    if (!window.confirm(`Excluir o registro da vacina "${v.vacina}"?`)) return;
    try { await vacinasApi.excluir(v.id); carregarVacinas(paciente?.id); } catch { /* ignore */ }
  };

  // Procedimentos (para exames: selecionar → puxa o valor)
  const [procedimentos, setProcedimentos] = useState<APIProcedimento[]>([]);
  // Autocomplete de medicamentos (via Memed)
  const [medSugestoes, setMedSugestoes] = useState<{ id: string | number; nome: string }[]>([]);
  const medDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscarMed = (q: string) => {
    setNovoMed(m => ({ ...m, medicamento: q }));
    if (medDebounce.current) clearTimeout(medDebounce.current);
    if (q.trim().length < 2) { setMedSugestoes([]); return; }
    medDebounce.current = setTimeout(() => {
      memedApi.buscarMedicamentos(q).then(setMedSugestoes).catch(() => setMedSugestoes([]));
    }, 350);
  };

  // Prescrição digital Memed (integração homologada — hook compartilhado)
  const { pronto: memedPronto, erro: memedErro, iniciar: iniciarMemed, abrirPrescricao } = useMemed();

  // Carrega o script uma vez ao abrir a aba de receituário (carregamento antecipado).
  useEffect(() => { if (activeTab === 'receituario') iniciarMemed(); }, [activeTab, iniciarMemed]);

  const abrirPrescricaoMemed = () => {
    if (!paciente) return;
    if (!paciente.cpf) {
      alert('É necessário informar o CPF do paciente para emitir a prescrição digital.');
      return;
    }
    if (!paciente.logradouro || !paciente.bairro || !paciente.cidade || !paciente.uf) {
      alert('É necessário informar o endereço completo (Rua, Bairro, Cidade e UF) do paciente para emitir a prescrição digital.');
      return;
    }
    abrirPrescricao(
      { 
        id: paciente.id, nome: paciente.nome, sexo: paciente.sexo, cpf: paciente.cpf, 
        data_nascimento: paciente.data_nascimento, telefone: paciente.telefone, email: paciente.email,
        endereco: paciente.logradouro ? `${paciente.logradouro}${paciente.numero ? ', ' + paciente.numero : ''}${paciente.bairro ? ' - ' + paciente.bairro : ''}` : undefined,
        cidade: paciente.cidade || undefined
      },
      { nome: 'Clínica', uf: paciente.uf || undefined, cidade: paciente.cidade || undefined },
    );
  };

  useEffect(() => { pacientesApi.listar().then(setPacientes).catch(() => {}); }, []);
  useEffect(() => { carregarModelos(); }, [carregarModelos]);
  useEffect(() => { procedimentosApi.listar().then(setProcedimentos).catch(() => {}); }, []);

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
    const dEx = meus.find(d => d.tipo === 'exames'); 
    if (Array.isArray(dEx?.conteudo)) {
      setExames(dEx?.conteudo.map((e: any) => `- ${e.tipo} (Justificativa: ${e.justificativa || 'Nenhuma'})`).join('\n') || '');
    } else {
      setExames(dEx?.conteudo || '');
    }
    const dRec = meus.find(d => d.tipo === 'receituario'); setReceita(dRec?.conteudo || []);
    const dAt = meus.find(d => d.tipo === 'atestado'); if (dAt?.conteudo) setAtestado(dAt.conteudo);
  }, []);

  const abrirProntuario = async (p: APIPaciente) => {
    setPaciente(p); setActiveTab('triagem'); setTri({}); setExames(''); setReceita([]); setAtestado({ dias: '', cid: '', texto: '' });
    carregarVacinas(p.id);
    configApi.obter(`anamnese:${p.id}`).then(v => setAnamnese(v || null)).catch(() => setAnamnese(null));
    // acha o atendimento existente do paciente (histórico contínuo — não é por
    // filial nem por data) ou cria um novo. Se por algum motivo houver mais de um
    // (ex.: registros antigos, de antes do filtro por filial ter sido corrigido),
    // pega o mais antigo — é onde está o histórico de verdade.
    const todos = await atendimentosClinicosApi.listar().catch(() => []);
    const doPaciente = todos.filter(a => a.paciente_id === p.id)
      .sort((a, b) => (a.data_atendimento || '').localeCompare(b.data_atendimento || ''));
    let atd = doPaciente[0];
    if (!atd) atd = await atendimentosClinicosApi.criar({ paciente_id: p.id, data_atendimento: new Date().toISOString() });
    setAtendimentoId(atd.id);
    await carregarAtendimento(atd.id);
  };

  // Paciente "levado" de outra tela (ex.: Recepção → Ficha do Paciente) — one-shot
  useEffect(() => {
    if (paciente || pacientes.length === 0) return;
    const alvo = pacienteStore.get();
    if (!alvo) return;
    pacienteStore.clear();
    const p = pacientes.find(x => Number(x.id) === Number(alvo.id));
    if (p) abrirProntuario(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacientes]);

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
  // Exames: agora texto livre
  const addMed = async () => {
    if (!novoMed.medicamento) return;
    const arr = [...receita, { ...novoMed }]; setReceita(arr);
    setNovoMed({ medicamento: '', quantidade: '', posologia: '' }); setMedSugestoes([]);
    await salvarDoc('receituario', arr);
  };
  const salvarAtestado = async () => { await salvarDoc('atestado', atestado); alert('Atestado salvo!'); };

  const receituarioHtml = () => receita.length === 0
    ? '<p><em>Nenhum medicamento prescrito.</em></p>'
    : '<ol>' + receita.map(m =>
        `<li><strong>${escapeHtml(m.medicamento)}</strong>${m.quantidade ? ' — ' + escapeHtml(m.quantidade) : ''}${m.posologia ? `<br/><span style="font-size:12px;color:#475569;">${escapeHtml(m.posologia)}</span>` : ''}</li>`
      ).join('') + '</ol>';

  // Modelos prontos de atestado (já com dados do paciente/data)
  const hojeBR = () => new Date().toLocaleDateString('pt-BR');
  const horaBR = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const modeloAtestado = (tipo: 'comparecimento' | 'medico' | 'acompanhante') => {
    const nome = paciente?.nome || '____________________';
    const cpf = paciente?.cpf || '____________';
    const dias = atestado.dias || '____';
    const cid = atestado.cid ? ` (CID: ${atestado.cid})` : '';
    const textos: Record<string, string> = {
      comparecimento: `<p style="text-align:center"><strong>DECLARAÇÃO DE COMPARECIMENTO</strong></p><p>Declaro para os devidos fins que o(a) Sr(a). <strong>${nome}</strong>, CPF ${cpf}, compareceu a esta unidade de saúde no dia <strong>${hojeBR()}</strong>, no horário das <strong>${horaBR()}</strong>, para atendimento médico.</p><p>&nbsp;</p><p style="text-align:center">_______________________________<br>Assinatura e carimbo do médico</p>`,
      medico: `<p style="text-align:center"><strong>ATESTADO MÉDICO</strong></p><p>Atesto para os devidos fins que o(a) paciente <strong>${nome}</strong>, CPF ${cpf}, necessita de <strong>${dias}</strong> dia(s) de afastamento de suas atividades a partir de <strong>${hojeBR()}</strong>, por motivo de doença${cid}.</p><p>&nbsp;</p><p style="text-align:center">_______________________________<br>Assinatura e carimbo do médico</p>`,
      acompanhante: `<p style="text-align:center"><strong>DECLARAÇÃO DE ACOMPANHANTE</strong></p><p>Declaro que o(a) Sr(a). <strong>${nome}</strong>, CPF ${cpf}, acompanhou paciente em atendimento nesta unidade no dia <strong>${hojeBR()}</strong>, no horário das <strong>${horaBR()}</strong>, sendo necessária sua presença durante o atendimento.</p><p>&nbsp;</p><p style="text-align:center">_______________________________<br>Assinatura e carimbo do médico</p>`,
    };
    setAtestado(a => ({ ...a, texto: textos[tipo] }));
  };

  const pFiltrados = pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.cpf || '').includes(busca));
  const tabs = [
    { id: 'vacinacao', label: 'Caderneta de Vacinação', icon: Syringe },
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

          {/* Card de Informações Clínicas Importantes */}
          {anamnese && (anamnese.alergias || anamnese.doencas_cronicas || anamnese.medicamentos) && (
            <div className="mx-6 mt-4 p-4 bg-red-50/80 border-l-4 border-l-red-500 border border-y-red-100 border-r-red-100 rounded-r-xl">
              <h4 className="text-red-700 font-bold text-sm flex items-center gap-2 mb-2"><AlertTriangle size={16} /> Informações Clínicas Importantes</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {anamnese.alergias && <div><span className="font-semibold text-red-900 block">Alergias:</span><span className="text-red-800">{anamnese.alergias}</span></div>}
                {anamnese.doencas_cronicas && <div><span className="font-semibold text-red-900 block">Doenças Crônicas:</span><span className="text-red-800">{anamnese.doencas_cronicas}</span></div>}
                {anamnese.medicamentos && <div><span className="font-semibold text-red-900 block">Medicamentos em uso:</span><span className="text-red-800">{anamnese.medicamentos}</span></div>}
              </div>
            </div>
          )}

          <div className="p-6">
            {activeTab === 'vacinacao' && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
                  <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Syringe size={16} className="text-brand-primary" /> Registrar vacina</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4"><InputField label="Vacina *" placeholder="Ex: Hepatite B, Tríplice viral" value={novaVacina.vacina} onChange={e => setNV('vacina', e.target.value)} /></div>
                    <div className="md:col-span-3"><InputField label="Dose" placeholder="1ª dose, reforço…" value={novaVacina.dose} onChange={e => setNV('dose', e.target.value)} /></div>
                    <div className="md:col-span-2"><InputField label="Data" type="date" value={novaVacina.data_aplicacao} onChange={e => setNV('data_aplicacao', e.target.value)} /></div>
                    <div className="md:col-span-3"><InputField label="Lote" placeholder="Nº do lote" value={novaVacina.lote} onChange={e => setNV('lote', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3"><InputField label="Fabricante" placeholder="Laboratório" value={novaVacina.fabricante} onChange={e => setNV('fabricante', e.target.value)} /></div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Via</label>
                      <select value={novaVacina.via} onChange={e => setNV('via', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20">
                        <option value="">—</option>{['Intramuscular', 'Subcutânea', 'Intradérmica', 'Oral'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-3"><InputField label="Local de aplicação" placeholder="Ex: Deltoide direito" value={novaVacina.local_aplicacao} onChange={e => setNV('local_aplicacao', e.target.value)} /></div>
                    <div className="md:col-span-3"><InputField label="Aplicador" placeholder="Quem aplicou" value={novaVacina.aplicador} onChange={e => setNV('aplicador', e.target.value)} /></div>
                    <div className="md:col-span-1 flex items-end"><Btn icon={Plus} onClick={addVacina} disabled={salvandoVacina || !novaVacina.vacina.trim()} className="w-full justify-center">Add</Btn></div>
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-100"><tr>{['Vacina', 'Dose', 'Data', 'Lote', 'Via / Local', 'Aplicador', ''].map(h => <th key={h} className="p-3 text-slate-500 font-bold">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {vacinas.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma vacina registrada para este paciente.</td></tr>
                        : [...vacinas].sort((a, b) => (b.data_aplicacao || '').localeCompare(a.data_aplicacao || '')).map(v => (
                          <tr key={v.id}>
                            <td className="p-3 font-medium text-slate-700">{v.vacina}</td>
                            <td className="p-3 text-slate-500">{v.dose || '—'}</td>
                            <td className="p-3 text-slate-500">{v.data_aplicacao ? v.data_aplicacao.split('-').reverse().join('/') : '—'}</td>
                            <td className="p-3 text-slate-500">{v.lote || '—'}</td>
                            <td className="p-3 text-slate-500">{[v.via, v.local_aplicacao].filter(Boolean).join(' · ') || '—'}</td>
                            <td className="p-3 text-slate-500">{v.aplicador || '—'}</td>
                            <td className="p-3 text-right"><button onClick={() => excluirVacina(v)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <InputField label="Peso (kg)" type="number" step="0.1" placeholder="70.5" value={tri.peso || ''} onChange={e => setT('peso', e.target.value)} />
                    <InputField label="Altura (cm)" type="number" step="1" placeholder="175" value={tri.altura || ''} onChange={e => setT('altura', e.target.value)} />
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
              <div className="space-y-4 animate-fade-in-up">
                <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                  <ReactQuill theme="snow" value={exames} onChange={setExames} modules={QUILL_MODULES}
                    className="h-72 mb-12" placeholder="Descreva os exames solicitados..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Btn icon={Printer} variant="outline" disabled={!exames.replace(/<[^>]*>/g, '').trim()} onClick={() => imprimir('Solicitação de Exames', exames)}>Imprimir</Btn>
                  <Btn icon={Save} onClick={() => salvarDoc('exames', exames).then(() => alert('Exames salvos com sucesso!'))}>Salvar Exames</Btn>
                </div>
              </div>
            )}

            {activeTab === 'receituario' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
                  {/* Nome + Quantidade lado a lado */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-8 relative">
                      <InputField label="Medicamento" placeholder="Nome e concentração (busca na Memed)" value={novoMed.medicamento} onChange={e => buscarMed(e.target.value)} />
                      {medSugestoes.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {medSugestoes.map(s => (
                            <button key={s.id} onClick={() => { setNovoMed(m => ({ ...m, medicamento: s.nome })); setMedSugestoes([]); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-brand-light/30 flex items-center gap-2">
                              <Pill size={13} className="text-brand-primary" />{s.nome}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-4"><InputField label="Quantidade" placeholder="Ex: 1 caixa / 30 comp" value={novoMed.quantidade} onChange={e => setNovoMed({ ...novoMed, quantidade: e.target.value })} /></div>
                  </div>
                  {/* Posologia embaixo */}
                  <div className="flex gap-3 items-end">
                    <div className="flex-1"><InputField label="Posologia" placeholder="Ex: 1 comprimido de 8/8h por 5 dias" value={novoMed.posologia} onChange={e => setNovoMed({ ...novoMed, posologia: e.target.value })} /></div>
                    <Btn icon={Plus} onClick={addMed}>Adicionar</Btn>
                  </div>
                </div>
                <div className="bg-[#fefce8] border border-[#fef08a] rounded-xl p-5 shadow-sm min-h-[200px] font-serif text-slate-800">
                  <h3 className="text-center font-bold text-lg border-b border-[#fde047] pb-2 mb-4">RECEITUÁRIO MÉDICO</h3>
                  {receita.length === 0 ? <p className="text-sm italic text-slate-500 text-center mb-8">Nenhum medicamento prescrito.</p>
                    : <ol className="list-decimal pl-6 space-y-3">{receita.map((m, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <span><strong>{m.medicamento}</strong>{m.quantidade ? ` — ${m.quantidade}` : ''}</span>
                            <button onClick={() => { const arr = receita.filter((_, j) => j !== i); setReceita(arr); salvarDoc('receituario', arr); }} className="text-red-400 hover:text-red-600 not-italic shrink-0">✕</button>
                          </div>
                          {m.posologia && <div className="text-xs text-slate-600 mt-0.5 pl-1">{m.posologia}</div>}
                        </li>
                      ))}</ol>}
                </div>
                <div className="flex justify-end">
                  <Btn icon={Printer} variant="outline" disabled={receita.length === 0} onClick={() => imprimir('Receituário Médico', receituarioHtml())}>Imprimir Receituário</Btn>
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
              <div className="space-y-5 animate-fade-in-up">
                <div className="grid grid-cols-3 gap-4">
                  <InputField label="Dias de Repouso" type="number" placeholder="Qtd de dias" value={atestado.dias} onChange={e => setAtestado({ ...atestado, dias: e.target.value })} />
                  <InputField label="CID (Opcional)" placeholder="Código CID-10" value={atestado.cid} onChange={e => setAtestado({ ...atestado, cid: e.target.value })} />
                  <div />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500">Modelos:</span>
                  <Btn size="sm" variant="outline" onClick={() => modeloAtestado('medico')}>Atestado médico</Btn>
                  <Btn size="sm" variant="outline" onClick={() => modeloAtestado('comparecimento')}>Comparecimento</Btn>
                  <Btn size="sm" variant="outline" onClick={() => modeloAtestado('acompanhante')}>Acompanhante</Btn>
                  <span className="text-[11px] text-slate-400">— já preenche nome, CPF, data e hora do paciente</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Texto do Atestado</label>
                  <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                    <ReactQuill theme="snow" value={atestado.texto} onChange={v => setAtestado(a => ({ ...a, texto: v }))} modules={QUILL_MODULES}
                      className="h-56 mb-12" placeholder="Escolha um modelo acima ou escreva o atestado…" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Btn icon={Printer} variant="outline" disabled={!atestado.texto.replace(/<[^>]*>/g, '').trim()} onClick={() => imprimir('Atestado', atestado.texto, atestado.cid ? `CID: ${atestado.cid}` : undefined)}>Imprimir</Btn>
                  <Btn icon={Save} onClick={salvarAtestado}>Salvar Atestado</Btn>
                </div>
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
