import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Search, UserPlus, Edit, FileText, Trash2, ArrowLeft, Calendar, FileSpreadsheet, Activity, Stethoscope, Camera, ClipboardList, Pill, AlertTriangle, Save, X, Upload, ImageIcon, Loader2, DollarSign } from 'lucide-react';
import { PageHeader, Card, Btn, Modal, InputField, SelectField, Badge } from '../../../components/ui/shared';
import { useNavigate } from 'react-router-dom';
import { cidApi, memedApi, consultasApi, pacientesApi, filiaisApi, orcamentosApi, configApi, uploadArquivo, pacienteStore, type CIDItem, type APIPaciente, type APIFilial, type APIConsulta, type APIOrcamento } from '../../../services/api';
import { cpfValido, formatarCpf } from '../../../utils/cpf';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useMemed } from '../../../hooks/useMemed';

type Paciente = {
  id: string;
  nome: string;
  cpf: string;
  tel: string;
  plano: string;
  ultima: string;
  data_nascimento?: string;
  sexo?: string;
  alergias?: string;
  observacoes?: string;
  historico_cid?: string[];
  raw: APIPaciente;          // objeto completo da API (para edição/perfil)
};

// Estado do formulário do modal (todos os campos do cadastro)
type PacienteForm = {
  nome: string;
  data_nascimento: string;
  cpf: string;
  telefone: string;
  unidade_id: string;
  sexo: string;
  genero: string;
  nome_mae: string;
  email: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  plano_saude: string;
  carteirinha_numero: string;
  carteirinha_validade: string;
  alergias: string;
  observacoes: string;
};

const FORM_VAZIO: PacienteForm = {
  nome: '', data_nascimento: '', cpf: '', telefone: '', unidade_id: '', sexo: '', genero: '',
  nome_mae: '', email: '', responsavel_nome: '', responsavel_cpf: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  plano_saude: 'Particular', carteirinha_numero: '', carteirinha_validade: '',
  alergias: '', observacoes: '',
};

// Anamnese — questionário clínico persistido por paciente (via configApi)
type AnamneseForm = {
  alergias: string;
  doencas_cronicas: string;
  medicamentos: string;
  cirurgias: string;
  anamnese_odontologica: string;
  fumante: string;      // 'sim' | 'nao' | ''
  alcool: string;
  gravidez: string;
  pressao_alterada: string;
  diabetes: string;
  observacoes: string;
};
const ANAMNESE_VAZIA: AnamneseForm = {
  alergias: '', doencas_cronicas: '', medicamentos: '', cirurgias: '', anamnese_odontologica: '',
  fumante: '', alcool: '', gravidez: '', pressao_alterada: '', diabetes: '', observacoes: '',
};

// Imagem/exame anexado ao paciente (lista persistida via configApi)
type ImagemAnexo = { url: string; nome: string; data: string };

function apiParaPaciente(p: APIPaciente): Paciente {
  return {
    id: String(p.id),
    nome: p.nome,
    cpf: p.cpf,
    tel: p.telefone || 'Sem telefone',
    plano: p.plano_saude || 'Particular',
    ultima: '—',
    data_nascimento: p.data_nascimento,
    sexo: p.sexo,
    alergias: p.alergias,
    observacoes: p.observacoes,
    historico_cid: [],
    raw: p,
  };
}

export function PacientesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [perfilAtivo, setPerfilAtivo] = useState<Paciente | null>(null);
  // Leva o paciente do perfil para o Odontograma (paciente já vem selecionado lá)
  const irOdontograma = () => {
    if (perfilAtivo) pacienteStore.set({ id: Number(perfilAtivo.id), nome: perfilAtivo.nome });
    navigate('/dashboard/odontograma');
  };
  const [modalConsultaOpen, setModalConsultaOpen] = useState(false);
  const [perfilTab, setPerfilTab] = useState('historico');
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);

  // Formulário do modal (criar/editar)
  const [form, setForm] = useState<PacienteForm>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvandoPac, setSalvandoPac] = useState(false);
  const [formErro, setFormErro] = useState('');

  // Filiais da empresa (para "Unidade de Cadastro")
  const [filiais, setFiliais] = useState<APIFilial[]>([]);

  // Busca de endereço por CEP (ViaCEP)
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepErro, setCepErro] = useState('');

  const setCampo = (campo: keyof PacienteForm, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }));

  // Formata "00000000" → "00000-000" e dispara a busca ao completar 8 dígitos
  const onCepChange = (valor: string) => {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    const formatado = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
    setCampo('cep', formatado);
    setCepErro('');
    if (digitos.length === 8) buscarCep(digitos);
  };

  const buscarCep = async (cep8: string) => {
    setBuscandoCep(true);
    setCepErro('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep8}/json/`);
      const data = await res.json();
      if (data.erro) { setCepErro('CEP não encontrado.'); return; }
      setForm(prev => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
        complemento: prev.complemento || data.complemento || '',
      }));
    } catch {
      setCepErro('Não foi possível consultar o CEP.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const carregarPacientes = useCallback(() => {
    setLoadingPacientes(true);
    pacientesApi.listar()
      .then(data => setPacientes(data.map(apiParaPaciente)))
      .catch(err => console.error('Erro ao carregar pacientes:', err))
      .finally(() => setLoadingPacientes(false));
  }, []);

  useEffect(() => { carregarPacientes(); }, [carregarPacientes]);

  useEffect(() => {
    filiaisApi.listar()
      .then(setFiliais)
      .catch(err => console.error('Erro ao carregar filiais:', err));
  }, []);

  const abrirNovoPaciente = () => {
    setEditandoId(null);
    // pré-seleciona a primeira filial (ex.: Matriz)
    setForm({ ...FORM_VAZIO, unidade_id: filiais[0] ? String(filiais[0].id) : '' });
    setFormErro('');
    setModalOpen(true);
  };

  const abrirEdicaoPaciente = (p: Paciente) => {
    const r = p.raw;
    setEditandoId(p.id);
    setForm({
      nome: r.nome || '',
      data_nascimento: r.data_nascimento || '',
      cpf: r.cpf || '',
      telefone: r.telefone || '',
      unidade_id: r.unidade_id != null ? String(r.unidade_id) : '',
      sexo: r.sexo || '',
      genero: r.genero || '',
      nome_mae: r.nome_mae || '',
      email: r.email || '',
      responsavel_nome: r.responsavel_nome || '',
      responsavel_cpf: r.responsavel_cpf || '',
      cep: r.cep || '',
      logradouro: r.logradouro || '',
      numero: r.numero || '',
      complemento: r.complemento || '',
      bairro: r.bairro || '',
      cidade: r.cidade || '',
      uf: r.uf || '',
      plano_saude: r.plano_saude || 'Particular',
      carteirinha_numero: r.carteirinha_numero || '',
      carteirinha_validade: r.carteirinha_validade || '',
      alergias: r.alergias || '',
      observacoes: r.observacoes || '',
    });
    setFormErro('');
    setModalOpen(true);
  };

  const salvarPaciente = async () => {
    setFormErro('');
    if (!form.nome.trim()) { setFormErro('Nome é obrigatório.'); return; }
    if (!form.cpf.trim()) { setFormErro('CPF é obrigatório.'); return; }
    if (!cpfValido(form.cpf)) { setFormErro('CPF inválido — verifique os dígitos.'); return; }
    setSalvandoPac(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        cpf: form.cpf.trim(),
        telefone: form.telefone.trim() || undefined,
        unidade_id: form.unidade_id ? Number(form.unidade_id) : undefined,
        data_nascimento: form.data_nascimento || undefined,
        sexo: form.sexo || undefined,
        genero: form.genero || undefined,
        nome_mae: form.nome_mae || undefined,
        email: form.email || undefined,
        responsavel_nome: form.responsavel_nome || undefined,
        responsavel_cpf: form.responsavel_cpf || undefined,
        cep: form.cep || undefined,
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        cidade: form.cidade || undefined,
        uf: form.uf || undefined,
        plano_saude: form.plano_saude || undefined,
        carteirinha_numero: form.carteirinha_numero || undefined,
        carteirinha_validade: form.carteirinha_validade || undefined,
        alergias: form.alergias || undefined,
        observacoes: form.observacoes || undefined,
      };
      let salvo: APIPaciente;
      if (editandoId) {
        salvo = await pacientesApi.atualizar(parseInt(editandoId), payload);
      } else {
        salvo = await pacientesApi.criar(payload);
      }
      // Atualiza o perfil aberto, se for o mesmo
      if (perfilAtivo && editandoId === perfilAtivo.id) {
        setPerfilAtivo(apiParaPaciente(salvo));
      }
      setModalOpen(false);
      carregarPacientes();
    } catch (e) {
      setFormErro(e instanceof Error ? e.message : 'Erro ao salvar paciente.');
    } finally {
      setSalvandoPac(false);
    }
  };

  const excluirPaciente = async (p: Paciente) => {
    if (!confirm(`Excluir o paciente "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await pacientesApi.excluir(parseInt(p.id));
      if (perfilAtivo?.id === p.id) setPerfilAtivo(null);
      carregarPacientes();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir paciente.');
    }
  };

  // ── Nova Consulta states ─────────────────────────────
  const [consultaMotivo, setConsultaMotivo] = useState('');
  const [consultaHistorico, setConsultaHistorico] = useState('');
  const [consultaSalva, setConsultaSalva] = useState(false);
  const [consultaSalvando, setConsultaSalvando] = useState(false);

  // ── Histórico Clínico (consultas reais) ──────────────
  const [consultas, setConsultas] = useState<APIConsulta[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // ── Orçamentos do paciente ───────────────────────────
  const [orcamentos, setOrcamentos] = useState<APIOrcamento[]>([]);
  const [loadingOrcamentos, setLoadingOrcamentos] = useState(false);

  // ── Anamnese ─────────────────────────────────────────
  const [anamnese, setAnamnese] = useState<AnamneseForm>(ANAMNESE_VAZIA);
  const [anamneseSalva, setAnamneseSalva] = useState(false);
  const [anamneseSalvando, setAnamneseSalvando] = useState(false);

  // ── Imagens / Exames anexados ────────────────────────
  const [imagens, setImagens] = useState<ImagemAnexo[]>([]);
  const [uploadando, setUploadando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega os dados do prontuário quando um perfil é aberto
  useEffect(() => {
    if (!perfilAtivo) return;
    const pid = Number(perfilAtivo.id);

    setLoadingHistorico(true);
    consultasApi.listarPorPaciente(pid)
      .then(setConsultas)
      .catch(() => setConsultas([]))
      .finally(() => setLoadingHistorico(false));

    setLoadingOrcamentos(true);
    orcamentosApi.listar()
      .then(todos => setOrcamentos(todos.filter(o => Number(o.paciente_id) === pid)))
      .catch(() => setOrcamentos([]))
      .finally(() => setLoadingOrcamentos(false));

    configApi.obter(`anamnese:${perfilAtivo.id}`)
      .then(v => setAnamnese(v ? { ...ANAMNESE_VAZIA, ...(v as Partial<AnamneseForm>) } : ANAMNESE_VAZIA))
      .catch(() => setAnamnese(ANAMNESE_VAZIA));

    configApi.obter(`imagens:${perfilAtivo.id}`)
      .then(v => setImagens(Array.isArray(v) ? (v as ImagemAnexo[]) : []))
      .catch(() => setImagens([]));
  }, [perfilAtivo]);

  const setAnam = (campo: keyof AnamneseForm, valor: string) =>
    setAnamnese(prev => ({ ...prev, [campo]: valor }));

  const salvarAnamnese = async () => {
    if (!perfilAtivo) return;
    setAnamneseSalvando(true);
    try {
      await configApi.salvar(`anamnese:${perfilAtivo.id}`, anamnese);
      setAnamneseSalva(true);
      setTimeout(() => setAnamneseSalva(false), 3000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar anamnese.');
    } finally {
      setAnamneseSalvando(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!perfilAtivo) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadando(true);
    try {
      const novos: ImagemAnexo[] = [];
      for (const file of files) {
        const { url } = await uploadArquivo(file);
        novos.push({ url, nome: file.name, data: new Date().toISOString() });
      }
      const atualizado = [...imagens, ...novos];
      setImagens(atualizado);
      await configApi.salvar(`imagens:${perfilAtivo.id}`, atualizado);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha no upload.');
    } finally {
      setUploadando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removerImagem = async (idx: number) => {
    if (!perfilAtivo) return;
    const atualizado = imagens.filter((_, i) => i !== idx);
    setImagens(atualizado);
    try { await configApi.salvar(`imagens:${perfilAtivo.id}`, atualizado); } catch { /* ignore */ }
  };

  // CID autocomplete
  const [cidQuery, setCidQuery] = useState('');
  const [cidSugestoes, setCidSugestoes] = useState<CIDItem[]>([]);
  const [cidSelecionado, setCidSelecionado] = useState<CIDItem | null>(null);
  const [cidLoading, setCidLoading] = useState(false);
  const cidDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memed (integração homologada — hook compartilhado)
  const { pronto: memedPronto, carregando: memedLoading, erro: memedErro, iniciar: iniciarMemed, abrirPrescricao } = useMemed();

  // Alergias via Memed
  const [alergiaQuery, setAlergiaQuery] = useState('');
  const [alergiaSugestoes, setAlergiaSugestoes] = useState<{id: string|number; nome: string}[]>([]);
  const [alergiasSelecionadas, setAlergiasSelecionadas] = useState<{id: string|number; nome: string}[]>([]);
  const alergiaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── CID search handler ──────────────────────────────
  const buscarCid = useCallback((q: string) => {
    if (!q || q.length < 2) { setCidSugestoes([]); return; }
    setCidLoading(true);
    cidApi.buscar(q)
      .then(data => setCidSugestoes(data))
      .catch(() => setCidSugestoes([]))
      .finally(() => setCidLoading(false));
  }, []);

  const handleCidChange = (val: string) => {
    setCidQuery(val);
    setCidSelecionado(null);
    if (cidDebounceRef.current) clearTimeout(cidDebounceRef.current);
    cidDebounceRef.current = setTimeout(() => buscarCid(val), 350);
  };

  // ── Alergia search handler (Memed medicamentos) ─────
  const buscarAlergia = useCallback((q: string) => {
    if (!q || q.length < 2) { setAlergiaSugestoes([]); return; }
    memedApi.buscarMedicamentos(q)
      .then(data => setAlergiaSugestoes(data))
      .catch(() => setAlergiaSugestoes([]));
  }, []);

  const handleAlergiaChange = (val: string) => {
    setAlergiaQuery(val);
    if (alergiaDebounceRef.current) clearTimeout(alergiaDebounceRef.current);
    alergiaDebounceRef.current = setTimeout(() => buscarAlergia(val), 400);
  };

  const adicionarAlergia = (item: {id: string|number; nome: string}) => {
    if (!alergiasSelecionadas.find(a => a.id === item.id)) {
      setAlergiasSelecionadas(prev => [...prev, item]);
    }
    setAlergiaQuery('');
    setAlergiaSugestoes([]);
  };

  // ── Memed: carrega o script uma vez ao abrir a aba de nova consulta ──
  useEffect(() => { if (perfilTab === 'nova_consulta') iniciarMemed(); }, [perfilTab, iniciarMemed]);

  const abrirPrescricaoMemed = () => {
    const p = perfilAtivo;
    if (!p) return;
    if (!p.cpf) {
      alert('É necessário informar o CPF do paciente para emitir a prescrição digital.');
      return;
    }
    if (!p.raw.endereco || !p.raw.bairro || !p.raw.cidade || !p.raw.uf) {
      alert('É necessário informar o endereço completo (Rua, Bairro, Cidade e UF) do paciente para emitir a prescrição digital.');
      return;
    }
    abrirPrescricao(
      { id: p.id, nome: p.nome, sexo: p.sexo, cpf: p.cpf, data_nascimento: p.data_nascimento, telefone: p.raw.telefone, email: p.raw.email },
      { nome: p.plano || 'Clínica', uf: p.raw.uf || undefined, cidade: p.raw.cidade || undefined },
    );
  };

  // ── Salvar consulta ─────────────────────────────────
  const salvarConsulta = async () => {
    setConsultaSalvando(true);
    try {
      await consultasApi.criar({
        paciente_id: parseInt(perfilAtivo?.id || '0'),
        motivo: consultaMotivo,
        cid: cidSelecionado?.codigo,
        cid_descricao: cidSelecionado?.descricao,
        historico: consultaHistorico,
      });

      // Atualiza o CID no histórico do paciente localmente
      if (cidSelecionado && perfilAtivo && !perfilAtivo.historico_cid?.includes(cidSelecionado.codigo)) {
        setPerfilAtivo({
          ...perfilAtivo,
          historico_cid: [...(perfilAtivo.historico_cid || []), cidSelecionado.codigo]
        });
      }

      setConsultaSalva(true);
      setTimeout(() => setConsultaSalva(false), 3000);

      // Limpar formulário
      setConsultaMotivo('');
      setConsultaHistorico('');
      setCidSelecionado(null);
      setAlergiasSelecionadas([]);

      // Recarrega o histórico e volta para a aba de histórico
      if (perfilAtivo) {
        consultasApi.listarPorPaciente(Number(perfilAtivo.id))
          .then(setConsultas)
          .catch(() => {});
      }
      setPerfilTab('historico');

    } catch {
      // Falhou mas permite prosseguir na demo sem backend
    } finally {
      setConsultaSalvando(false);
    }
  };

  const inserirTemplate = (tipo: string) => {
    const templates: Record<string, string> = {
      atestado: `<h3>Atestado Médico</h3><p>Atesto para os devidos fins que o(a) paciente <strong>${perfilAtivo?.nome}</strong> necessita de ____ dias de repouso a partir desta data.</p><p>Motivo (CID): ${cidSelecionado ? cidSelecionado.codigo : '____'}</p>`,
      receituario: `<h3>Receituário</h3><p>Uso Oral:</p><ol><li><strong>Medicamento</strong> - Posologia</li></ol>`,
      evolucao: `<h3>Evolução Clínica</h3><p><strong>Queixa Principal:</strong> </p><p><strong>Exame Físico:</strong> </p><p><strong>Conduta:</strong> </p>`,
    };
    if (templates[tipo]) {
      setConsultaHistorico(prev => prev + (prev ? '<br/><br/>' : '') + templates[tipo]);
    }
  };

  // -- View: Lista de Pacientes --
  if (!perfilAtivo) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Users} title="Cadastro de Pacientes" subtitle="Gerenciamento da base de pacientes e prontuários">
          <Btn icon={Activity} variant="secondary" onClick={() => navigate('/dashboard/estatisticas-pacientes')}>Estatísticas</Btn>
          <Btn icon={UserPlus} onClick={abrirNovoPaciente}>Novo Paciente</Btn>
        </PageHeader>

        <Card padding={false}>
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nome, CPF, Telefone ou CID..." 
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-brand-primary flex-1 sm:flex-none">
                <option>Ordenar por Nome (A-Z)</option>
                <option>Mais recentes</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  {['Nome Completo', 'CPF', 'Telefone', 'Plano de Saúde', 'Última Consulta', 'Ações'].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingPacientes ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-500">Carregando pacientes...</td></tr>
                ) : pacientes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-500">Nenhum paciente encontrado.</td></tr>
                ) : (
                  pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || p.cpf.includes(busca) || (p.historico_cid && p.historico_cid.some(c => c.toLowerCase().includes(busca.toLowerCase())))).map((p, i) => (
                    <tr key={i} className="hover:bg-brand-light/20 transition-colors group cursor-pointer" onClick={() => setPerfilAtivo(p)}>
                      <td className="px-5 py-4 font-bold text-slate-800">{p.nome}</td>
                      <td className="px-5 py-4 text-slate-600">{p.cpf}</td>
                      <td className="px-5 py-4 text-slate-600">{p.tel}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${p.plano === 'Particular' ? 'bg-gray-100 text-gray-700' : 'bg-brand-light text-brand-dark'}`}>
                          {p.plano}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-sm">{p.ultima}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button title="Ver Perfil" className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded" onClick={() => setPerfilAtivo(p)}><FileText size={16}/></button>
                          <button title="Iniciar Consulta" className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded" onClick={() => { setPerfilAtivo(p); setModalConsultaOpen(true); }}><Stethoscope size={16}/></button>
                          <button title="Excluir" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" onClick={() => excluirPaciente(p)}><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-slate-500">
            <span>{pacientes.length} paciente(s) cadastrado(s)</span>
          </div>
        </Card>

        {/* Modal Novo Paciente foi extraído para ser usado em ambas as views */}
        {renderModalPaciente()}
      </div>
    );
  }
  // Função para renderizar o modal em qualquer estado
  function renderModalPaciente() { return (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editandoId ? 'Editar Paciente' : 'Cadastro de Paciente'} maxWidth="max-w-4xl">
      <div className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Info Básica */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-100 pb-2">Informações Pessoais (Obrigatórios)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><InputField label="Nome Completo *" required placeholder="Nome do paciente" value={form.nome} onChange={e => setCampo('nome', e.target.value)} /></div>
              <InputField label="Data de Nascimento *" type="date" required value={form.data_nascimento} onChange={e => setCampo('data_nascimento', e.target.value)} />
              <InputField label="CPF *" required placeholder="000.000.000-00" maxLength={14} value={form.cpf} onChange={e => setCampo('cpf', formatarCpf(e.target.value))} />
              <InputField label="Celular / WhatsApp *" required placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setCampo('telefone', e.target.value)} />
              <SelectField label="Sexo Biológico *" required value={form.sexo} onChange={e => setCampo('sexo', e.target.value)}>
                <option value="">Selecione...</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </SelectField>
            </div>

            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-100 pb-2 mt-6">Dados do Responsável</h4>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Nome do Responsável" placeholder="Nome completo" value={form.responsavel_nome} onChange={e => setCampo('responsavel_nome', e.target.value)} />
              <InputField label="CPF do Responsável" placeholder="000.000.000-00" value={form.responsavel_cpf} onChange={e => setCampo('responsavel_cpf', e.target.value)} />
            </div>

            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-100 pb-2 mt-6">Dados Complementares (Opcionais)</h4>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Gênero" placeholder="Ex: Não-binário" value={form.genero} onChange={e => setCampo('genero', e.target.value)} />
              <SelectField label="Unidade de Cadastro"
                value={form.unidade_id} onChange={e => setCampo('unidade_id', e.target.value)}>
                <option value="">Selecione...</option>
                {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </SelectField>
              <InputField label="Nome da Mãe" placeholder="Nome completo da mãe" className="col-span-2" value={form.nome_mae} onChange={e => setCampo('nome_mae', e.target.value)} />
              <InputField label="E-mail" type="email" placeholder="paciente@email.com" className="col-span-2" value={form.email} onChange={e => setCampo('email', e.target.value)} />
            </div>

            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-100 pb-2 mt-6">Endereço</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <InputField label={buscandoCep ? 'CEP (buscando...)' : 'CEP'} placeholder="00000-000" maxLength={9} value={form.cep} onChange={e => onCepChange(e.target.value)} />
                {cepErro && <p className="text-[11px] text-amber-600 mt-1">{cepErro}</p>}
              </div>
              <InputField label="Logradouro" placeholder="Rua, Avenida..." className="col-span-2" value={form.logradouro} onChange={e => setCampo('logradouro', e.target.value)} />
              <InputField label="Número" placeholder="Nº" value={form.numero} onChange={e => setCampo('numero', e.target.value)} />
              <InputField label="Complemento" placeholder="Apto, Sala..." className="col-span-2" value={form.complemento} onChange={e => setCampo('complemento', e.target.value)} />
              <InputField label="Bairro" placeholder="Bairro" value={form.bairro} onChange={e => setCampo('bairro', e.target.value)} />
              <InputField label="Cidade" placeholder="Cidade" value={form.cidade} onChange={e => setCampo('cidade', e.target.value)} />
              <SelectField label="UF" value={form.uf} onChange={e => setCampo('uf', e.target.value)}>
                <option value="">UF</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf}>{uf}</option>)}
              </SelectField>
            </div>
          </div>

          {/* Coluna Direita - Convênio / Opções */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 h-fit">
            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-200 pb-2">Plano de Saúde</h4>
            <SelectField label="Convênio" required value={form.plano_saude} onChange={e => setCampo('plano_saude', e.target.value)}>
              <option>Particular</option>
              <option>Unimed</option>
              <option>Bradesco Saúde</option>
              <option>SulAmérica</option>
            </SelectField>
            <InputField label="Nº da Carteirinha" placeholder="00000000000" value={form.carteirinha_numero} onChange={e => setCampo('carteirinha_numero', e.target.value)} />
            <InputField label="Validade da Carteira" type="date" value={form.carteirinha_validade} onChange={e => setCampo('carteirinha_validade', e.target.value)} />

            <div className="mt-4 pt-4 border-t border-gray-200">
               <h4 className="text-sm font-bold text-slate-700 mb-2 text-red-600 flex items-center gap-2"><Activity size={16} /> Alergias</h4>
               <InputField label="Alergias" placeholder="Ex: Penicilina, Iodo, Dipirona..." value={form.alergias} onChange={e => setCampo('alergias', e.target.value)} />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
               <h4 className="text-sm font-bold text-slate-700 mb-2">Observações (Opcional)</h4>
               <textarea rows={3} value={form.observacoes} onChange={e => setCampo('observacoes', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary" placeholder="Outras informações clínicas ou restrições..." />
            </div>
          </div>
        </div>

        {formErro && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formErro}</div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvarPaciente} disabled={salvandoPac}>
            {salvandoPac ? 'Salvando...' : 'Salvar Paciente'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}


  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Cabeçalho do Perfil */}
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setPerfilAtivo(null)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-brand-primary text-slate-500 hover:text-brand-primary transition-all shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          Perfil do Paciente
        </h1>
        <div className="ml-auto flex gap-2">
          <Btn variant="secondary" icon={Edit} onClick={() => abrirEdicaoPaciente(perfilAtivo)}>Editar Dados</Btn>
          <Btn icon={Calendar} onClick={() => navigate('/dashboard/agenda')}>Agendar Consulta</Btn>
          <Btn icon={Stethoscope} variant="primary" onClick={() => setModalConsultaOpen(true)}>Iniciar Consulta</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Resumo e Infos */}
        <div className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden relative bg-gradient-to-br from-brand-primary/20 to-transparent">
            
            <div className="relative z-10 space-y-4">
              
              <div className="flex flex-col items-center justify-center text-center gap-3 border-b border-gray-200/50 pb-4">
                <button className="relative w-20 h-20 bg-brand-primary text-white rounded-full flex items-center justify-center font-black text-3xl group overflow-hidden border-4 border-white shadow-sm transition-all hover:scale-105">
                  <span className="group-hover:opacity-0 transition-opacity">{perfilAtivo.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}</span>
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                    {perfilAtivo.nome}
                    <Badge color="green">Ativo</Badge>
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Plano Atual</p>
                  <p className="font-bold text-sm text-slate-800">{perfilAtivo.plano}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Última Consulta</p>
                  <p className="font-bold text-sm text-slate-800">{perfilAtivo.ultima}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Saldo Devedor</p>
                  <p className="font-bold text-sm text-slate-800">R$ 0,00</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Histórico de CIDs */}
          <Card padding={true} className="border-none shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-brand-primary" /> Histórico de CIDs (Doenças)
            </h3>
            {(() => {
              const cidsUnicos = new Map<string, string>();
              consultas.forEach(c => {
                if (c.cid) cidsUnicos.set(c.cid, c.cid_descricao || '');
              });
              if (cidsUnicos.size > 0) {
                return (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(cidsUnicos.entries()).map(([codigo, desc]) => (
                      <Badge key={codigo} color="red">{codigo}{desc ? ` - ${desc}` : ''}</Badge>
                    ))}
                  </div>
                );
              }
              return <p className="text-xs text-slate-500 italic">Nenhum CID registrado.</p>;
            })()}
          </Card>

          <Card title="Dados Demográficos">
            <div className="space-y-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">CPF</span>
                <span className="text-sm font-bold text-slate-800">{perfilAtivo.cpf}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">Celular / WhatsApp</span>
                <span className="text-sm font-bold text-slate-800">{perfilAtivo.tel}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">Data Nasc.</span>
                <span className="text-sm font-bold text-slate-800">
                  {perfilAtivo.data_nascimento ? perfilAtivo.data_nascimento.split('-').reverse().join('/') : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">Sexo</span>
                <span className="text-sm font-bold text-slate-800">
                  {perfilAtivo.sexo === 'M' ? 'Masculino' : perfilAtivo.sexo === 'F' ? 'Feminino' : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">E-mail</span>
                <span className="text-sm font-bold text-slate-800 text-right">{perfilAtivo.raw.email || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">Endereço</span>
                <span className="text-sm font-bold text-slate-800 text-right">
                  {perfilAtivo.raw.logradouro
                    ? `${perfilAtivo.raw.logradouro}${perfilAtivo.raw.numero ? ', ' + perfilAtivo.raw.numero : ''}${perfilAtivo.raw.bairro ? ' — ' + perfilAtivo.raw.bairro : ''}${perfilAtivo.raw.uf ? ' - ' + perfilAtivo.raw.uf : ''}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">Alergias</span>
                <span className="text-sm font-bold text-slate-800 text-right">{perfilAtivo.alergias || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">Observações</span>
                <span className="text-sm font-bold text-slate-800 text-right">{perfilAtivo.observacoes || '—'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna Central/Direita: Abas de Prontuário */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding={false} className="h-full">
            <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar">
              {[
                { id: 'historico', label: 'Histórico Clínico' },
                { id: 'nova_consulta', label: 'Nova Consulta' },
                { id: 'odontograma', label: 'Odontograma' },
                { id: 'anamnese', label: 'Anamnese' },
                { id: 'planos', label: 'Planos / Tratam.' },
                { id: 'orcamentos', label: 'Orçamentos' },
                { id: 'imagens', label: 'Imagens' },
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setPerfilTab(tab.id)}
                  className={`flex-1 py-4 px-4 text-sm font-bold whitespace-nowrap transition-colors ${
                    perfilTab === tab.id 
                      ? 'text-brand-primary border-b-2 border-brand-primary' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="p-5 min-h-[400px]">
              {perfilTab === 'historico' && (
                <div className="animate-fade-in-up">
                  {loadingHistorico ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                      <Loader2 size={18} className="animate-spin" /> Carregando histórico...
                    </div>
                  ) : consultas.length === 0 ? (
                    <div className="text-center py-12">
                      <Stethoscope size={48} className="text-slate-300 mx-auto mb-3" />
                      <h4 className="text-slate-500 font-bold">Nenhuma consulta registrada</h4>
                      <p className="text-sm text-slate-400 mt-1">As consultas realizadas aparecerão aqui.</p>
                      <Btn size="sm" icon={Stethoscope} className="mt-4" onClick={() => setPerfilTab('nova_consulta')}>Iniciar Consulta</Btn>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {consultas.map(c => (
                        <div key={c.id} className="relative pl-6 border-l-2 border-brand-primary/30">
                          <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-brand-primary border-2 border-white shadow-sm" />
                          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Stethoscope size={15} className="text-brand-primary" />
                                {c.motivo || 'Consulta'}
                              </h4>
                              <time className="text-[10px] font-bold text-brand-primary bg-brand-light px-2 py-0.5 rounded-full">
                                {c.data_hora ? new Date(c.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                              </time>
                            </div>
                            {c.cid && (
                              <p className="text-xs mb-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 font-bold rounded border border-red-100">
                                  {c.cid}{c.cid_descricao ? ` — ${c.cid_descricao}` : ''}
                                </span>
                              </p>
                            )}
                            {c.historico && (
                              <div className="text-sm text-slate-600 bg-gray-50 p-3 rounded-lg border border-gray-100 prose prose-sm max-w-none [&_h3]:text-sm [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5"
                                   dangerouslySetInnerHTML={{ __html: c.historico }} />
                            )}
                            {c.prescricoes && c.prescricoes.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {c.prescricoes.map(p => p.link_receita && (
                                  <a key={p.id} href={p.link_receita} target="_blank" rel="noopener noreferrer"
                                     className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100">
                                    <Pill size={12} /> Receita digital
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {perfilTab === 'nova_consulta' && (
                <div className="animate-fade-in-up space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Stethoscope size={18} className="text-brand-primary"/>
                      Nova Consulta — {perfilAtivo?.nome}
                    </h3>
                    {consultaSalva && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">✓ Salvo com sucesso</span>
                    )}
                  </div>

                  {/* Motivo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Motivo da Consulta</label>
                    <input
                      value={consultaMotivo}
                      onChange={e => setConsultaMotivo(e.target.value)}
                      placeholder="Ex: Dor de dente, retorno, avaliação..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    />
                  </div>

                  {/* CID autocomplete */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Diagnóstico (CID)</label>
                    <div className="relative">
                      <input
                        value={cidSelecionado ? `${cidSelecionado.codigo} — ${cidSelecionado.descricao}` : cidQuery}
                        onChange={e => handleCidChange(e.target.value)}
                        placeholder="Digite o código ou nome da doença..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary pr-8"
                      />
                      {cidLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">...</span>}
                      {cidSelecionado && (
                        <button onClick={() => { setCidSelecionado(null); setCidQuery(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={14}/></button>
                      )}
                    </div>
                    {cidSugestoes.length > 0 && !cidSelecionado && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {cidSugestoes.map(item => (
                          <button
                            key={item.codigo}
                            onClick={() => { setCidSelecionado(item); setCidQuery(''); setCidSugestoes([]); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-brand-light/30 transition-colors flex gap-3"
                          >
                            <span className="font-bold text-brand-primary shrink-0">{item.codigo}</span>
                            <span className="text-slate-700">{item.descricao}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Evolução / Editor Rico */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-600">Evolução / Anotações Clínicas</label>
                      <div className="flex gap-2">
                        <Btn variant="outline" size="sm" onClick={() => inserirTemplate('evolucao')} className="text-[10px] px-2 py-1 h-auto">Temp. Evolução</Btn>
                        <Btn variant="outline" size="sm" onClick={() => inserirTemplate('atestado')} className="text-[10px] px-2 py-1 h-auto">Temp. Atestado</Btn>
                        <Btn variant="outline" size="sm" onClick={() => inserirTemplate('receituario')} className="text-[10px] px-2 py-1 h-auto">Temp. Receituário</Btn>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                      <ReactQuill 
                        theme="snow" 
                        value={consultaHistorico} 
                        onChange={setConsultaHistorico} 
                        className="h-48 mb-12"
                        placeholder="Descreva a evolução, exame físico, conduta..."
                      />
                    </div>
                  </div>

                  {/* Alergias via Memed */}
                  <div className="p-4 bg-red-50/60 border border-red-100 rounded-xl">
                    <label className="block text-xs font-bold text-red-700 mb-2 flex items-center gap-1"><AlertTriangle size={13}/> Alergias registradas</label>
                    <div className="relative">
                      <input
                        value={alergiaQuery}
                        onChange={e => handleAlergiaChange(e.target.value)}
                        placeholder="Buscar princípio ativo ou medicamento (via Memed)..."
                        className="w-full border border-red-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      {alergiaSugestoes.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-36 overflow-y-auto">
                          {alergiaSugestoes.map(item => (
                            <button key={item.id} onClick={() => adicionarAlergia(item)} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2">
                              <Pill size={13} className="text-red-400"/>{item.nome}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {alergiasSelecionadas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {alergiasSelecionadas.map(a => (
                          <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                            {a.nome}
                            <button onClick={() => setAlergiasSelecionadas(prev => prev.filter(x => x.id !== a.id))} className="hover:text-red-900"><X size={11}/></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Prescrição Memed */}
                  <div className="p-4 bg-brand-light/30 border border-brand-primary/20 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-brand-dark flex items-center gap-2"><Pill size={14}/> Prescrição Digital (Memed)</label>
                      <Btn size="sm" onClick={abrirPrescricaoMemed} disabled={!memedPronto}>
                        {memedPronto ? 'Abrir Prescrição' : 'Preparando prescrição…'}
                      </Btn>
                    </div>
                    {memedErro ? (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-2">
                        <p>⚠️ {memedErro}</p>
                        <button onClick={iniciarMemed} disabled={memedLoading}
                          className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-900 underline disabled:opacity-50">
                          {memedLoading ? 'Tentando...' : '↻ Tentar novamente'}
                        </button>
                      </div>
                    ) : memedPronto ? (
                      <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        ✓ Memed pronta — clique para abrir o receituário digital do paciente.
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Carregando o módulo de receituário digital da Memed…</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Btn variant="ghost" onClick={() => setPerfilTab('historico')}>Cancelar</Btn>
                    <Btn icon={Save} onClick={salvarConsulta} disabled={consultaSalvando}>
                      {consultaSalvando ? 'Salvando...' : 'Salvar Consulta'}
                    </Btn>
                  </div>
                </div>
              )}

              {perfilTab === 'anamnese' && (
                <div className="animate-fade-in-up space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardList size={18} className="text-brand-primary" /> Anamnese Geral
                    </h4>
                    {anamneseSalva && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">✓ Salvo com sucesso</span>
                    )}
                  </div>

                  {/* Perguntas Sim/Não */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {([
                      { campo: 'fumante', label: 'É fumante?' },
                      { campo: 'alcool', label: 'Consome álcool regularmente?' },
                      { campo: 'pressao_alterada', label: 'Pressão arterial alterada?' },
                      { campo: 'diabetes', label: 'Diabético?' },
                      { campo: 'gravidez', label: 'Gestante?' },
                    ] as const).map(q => (
                      <div key={q.campo} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <span className="text-sm font-semibold text-slate-700">{q.label}</span>
                        <div className="flex gap-1">
                          {['sim', 'nao'].map(op => (
                            <button
                              key={op}
                              type="button"
                              onClick={() => setAnam(q.campo, op)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                anamnese[q.campo] === op
                                  ? (op === 'sim' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white')
                                  : 'bg-white text-slate-500 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {op === 'sim' ? 'Sim' : 'Não'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Campos de texto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Alergias" placeholder="Ex: Penicilina, Iodo..." value={anamnese.alergias} onChange={e => setAnam('alergias', e.target.value)} />
                    <InputField label="Doenças Crônicas" placeholder="Ex: Hipertensão, asma..." value={anamnese.doencas_cronicas} onChange={e => setAnam('doencas_cronicas', e.target.value)} />
                    <InputField label="Medicamentos em uso" placeholder="Uso contínuo..." value={anamnese.medicamentos} onChange={e => setAnam('medicamentos', e.target.value)} />
                    <InputField label="Cirurgias anteriores" placeholder="Histórico cirúrgico..." value={anamnese.cirurgias} onChange={e => setAnam('cirurgias', e.target.value)} />
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-xs font-bold text-slate-600 mb-2">Anamnese Odontológica</label>
                    <textarea 
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary min-h-[80px]"
                      placeholder="Histórico odontológico, próteses, tratamentos..."
                      value={anamnese.anamnese_odontologica}
                      onChange={e => setAnam('anamnese_odontologica', e.target.value)}
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Observações Gerais</label>
                    <textarea rows={3} value={anamnese.observacoes} onChange={e => setAnam('observacoes', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                      placeholder="Outras informações relevantes ao histórico do paciente..." />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <Btn icon={Save} onClick={salvarAnamnese} disabled={anamneseSalvando}>
                      {anamneseSalvando ? 'Salvando...' : 'Salvar Anamnese'}
                    </Btn>
                  </div>
                </div>
              )}

              {perfilTab === 'orcamentos' && (
                <div className="animate-fade-in-up">
                  {loadingOrcamentos ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                      <Loader2 size={18} className="animate-spin" /> Carregando orçamentos...
                    </div>
                  ) : orcamentos.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText size={48} className="text-slate-300 mx-auto mb-3" />
                      <h4 className="text-slate-500 font-bold">Nenhum orçamento cadastrado</h4>
                      <p className="text-sm text-slate-400 mt-1">Gere novos orçamentos através do módulo de Odontograma.</p>
                      <Btn variant="outline" size="sm" icon={Activity} className="mt-4" onClick={irOdontograma}>Acessar Odontograma</Btn>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orcamentos.map(o => {
                        const status = (o.status_geral || 'pendente').toLowerCase();
                        const cor = status.includes('aprov') || status.includes('pago') ? 'green'
                          : status.includes('cancel') || status.includes('recus') ? 'red' : 'yellow';
                        return (
                          <div key={o.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-brand-primary/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <DollarSign size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">Orçamento #{o.id}</p>
                                <p className="text-xs text-slate-500">
                                  {o.data_criacao ? new Date(o.data_criacao).toLocaleDateString('pt-BR') : '—'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-emerald-700 text-lg">
                                R$ {Number(o.valor_total || 0).toFixed(2).replace('.', ',')}
                              </span>
                              <Badge color={cor}>{o.status_geral || 'Pendente'}</Badge>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-end pt-2">
                        <Btn variant="outline" size="sm" icon={Activity} onClick={irOdontograma}>Novo Orçamento</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {perfilTab === 'imagens' && (
                <div className="animate-fade-in-up space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Camera size={18} className="text-brand-primary" /> Imagens e Exames
                    </h4>
                    <Btn size="sm" icon={uploadando ? Loader2 : Upload} onClick={() => fileInputRef.current?.click()} disabled={uploadando}>
                      {uploadando ? 'Enviando...' : 'Fazer Upload'}
                    </Btn>
                  </div>

                  {imagens.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                      <ImageIcon size={48} className="text-slate-300 mx-auto mb-3" />
                      <h4 className="text-slate-500 font-bold">Nenhuma imagem ou raio-x anexado</h4>
                      <p className="text-sm text-slate-400 mt-1">Aceita imagens e PDF. Clique em "Fazer Upload".</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {imagens.map((img, idx) => {
                        const isPdf = /\.pdf($|\?)/i.test(img.url) || /\.pdf$/i.test(img.nome);
                        return (
                          <div key={idx} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                            <a href={img.url} target="_blank" rel="noopener noreferrer" className="block aspect-square flex items-center justify-center">
                              {isPdf ? (
                                <div className="flex flex-col items-center gap-1 text-slate-400">
                                  <FileText size={32} />
                                  <span className="text-[10px] font-bold">PDF</span>
                                </div>
                              ) : (
                                <img src={img.url} alt={img.nome} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
                              )}
                            </a>
                            <button
                              onClick={() => removerImagem(idx)}
                              className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/90 text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                            <p className="text-[10px] text-slate-600 truncate px-2 py-1 bg-white border-t border-gray-100" title={img.nome}>{img.nome}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(perfilTab === 'odontograma' || perfilTab === 'planos') && (
                <div className="animate-fade-in-up">
                  <div className="text-center py-10">
                    <Stethoscope size={48} className="text-slate-300 mx-auto mb-3" />
                    <h4 className="text-slate-500 font-bold">Este recurso possui seu próprio módulo.</h4>
                    <Btn variant="outline" size="sm" className="mt-4" onClick={irOdontograma}>Acessar {perfilTab === 'odontograma' ? 'Odontograma' : 'Planos'}</Btn>
                  </div>
                </div>
              )}

            </div>
          </Card>
        </div>
      </div>

      {renderModalPaciente()}
      {renderModalConsulta()}
    </div>
  );

  function renderModalConsulta() {
    return (
      <Modal open={modalConsultaOpen} onClose={() => setModalConsultaOpen(false)} title="Iniciar Consulta Direta">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Selecione o tipo de procedimento para iniciar o atendimento de <strong>{perfilAtivo?.nome}</strong>:</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={irOdontograma} className="p-4 border border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-light/20 flex flex-col items-center justify-center gap-2 transition-colors">
              <Activity size={24} className="text-brand-primary" />
              <span className="font-bold text-sm text-slate-700">Odontograma</span>
            </button>
            <button onClick={() => { setModalConsultaOpen(false); setPerfilTab('nova_consulta'); }} className="p-4 border border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-light/20 flex flex-col items-center justify-center gap-2 transition-colors">
              <ClipboardList size={24} className="text-brand-primary" />
              <span className="font-bold text-sm text-slate-700">Consulta Direta (Perfil)</span>
            </button>
            <button onClick={() => setModalConsultaOpen(false)} className="p-4 border border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-light/20 flex flex-col items-center justify-center gap-2 transition-colors">
              <FileSpreadsheet size={24} className="text-brand-primary" />
              <span className="font-bold text-sm text-slate-700">Exames / Imagens</span>
            </button>
            <button onClick={() => setModalConsultaOpen(false)} className="p-4 border border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-light/20 flex flex-col items-center justify-center gap-2 transition-colors">
              <Calendar size={24} className="text-brand-primary" />
              <span className="font-bold text-sm text-slate-700">Agendar Retorno</span>
            </button>
          </div>
        </div>
      </Modal>
    );
  }
}
