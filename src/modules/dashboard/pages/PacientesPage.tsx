import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Search, UserPlus, Edit, FileText, Trash2, ArrowLeft, Calendar, FileSpreadsheet, Activity, ChevronRight, Stethoscope, Camera, ClipboardList, Pill, AlertTriangle, Save, X } from 'lucide-react';
import { PageHeader, Card, Btn, Modal, InputField, SelectField, Badge } from '../../../components/ui/shared';
import { useNavigate } from 'react-router-dom';
import { cidApi, memedApi, consultasApi, pacientesApi, type CIDItem, type APIPaciente } from '../../../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type Paciente = {
  id: string;
  nome: string;
  cpf: string;
  tel: string;
  plano: string;
  ultima: string;
  historico_cid?: string[];
};

export function PacientesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [perfilAtivo, setPerfilAtivo] = useState<Paciente | null>(null);
  const [modalConsultaOpen, setModalConsultaOpen] = useState(false);
  const [perfilTab, setPerfilTab] = useState('historico');
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);

  useEffect(() => {
    // Carregar pacientes reais da API
    pacientesApi.listar().then(data => {
      setPacientes(data.map(p => ({
        id: String(p.id),
        nome: p.nome,
        cpf: p.cpf,
        tel: p.telefone || 'Sem telefone',
        plano: p.plano_saude || 'Particular',
        ultima: p.data_nascimento || 'N/A', // ajustar conforme API real
        historico_cid: [] 
      })));
    }).catch(err => {
      console.error("Erro ao carregar pacientes:", err);
      // Mantém a lista vazia se a API falhar
    }).finally(() => setLoadingPacientes(false));
  }, []);

  // ── Nova Consulta states ─────────────────────────────
  const [consultaMotivo, setConsultaMotivo] = useState('');
  const [consultaHistorico, setConsultaHistorico] = useState('');
  const [consultaSalva, setConsultaSalva] = useState(false);
  const [consultaSalvando, setConsultaSalvando] = useState(false);

  // CID autocomplete
  const [cidQuery, setCidQuery] = useState('');
  const [cidSugestoes, setCidSugestoes] = useState<CIDItem[]>([]);
  const [cidSelecionado, setCidSelecionado] = useState<CIDItem | null>(null);
  const [cidLoading, setCidLoading] = useState(false);
  const cidDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memed
  const [memedToken, setMemedToken] = useState<string | null>(null);
  const [memedLoading, setMemedLoading] = useState(false);
  const [memedErro, setMemedErro] = useState<string | null>(null);
  const memedScriptRef = useRef<HTMLScriptElement | null>(null);

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

  // ── Memed script loader ─────────────────────────────
  const carregarMemed = useCallback(async () => {
    setMemedLoading(true);
    setMemedErro(null);
    try {
      const { token } = await memedApi.getToken();
      setMemedToken(token);
      if (memedScriptRef.current) memedScriptRef.current.remove();
      const script = document.createElement('script');
      script.src = 'https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js';
      script.setAttribute('data-token', token);
      script.setAttribute('data-color', '#0f4c7a');
      script.onload = () => setMemedLoading(false);
      script.onerror = () => { setMemedErro('Script Memed não carregou'); setMemedLoading(false); };
      document.body.appendChild(script);
      memedScriptRef.current = script;
    } catch (e: any) {
      setMemedErro(e?.message || 'Erro ao carregar Memed');
      setMemedLoading(false);
    }
  }, []);

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
          <Btn icon={UserPlus} onClick={() => setModalOpen(true)}>Novo Paciente</Btn>
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
                          <button title="Excluir" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-slate-500">
            <span>Mostrando 3 de 156 pacientes</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">Anterior</button>
              <button className="px-3 py-1 border border-brand-primary bg-brand-primary text-white rounded-lg">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">Próximo</button>
            </div>
          </div>
        </Card>

        {/* Modal Novo Paciente foi extraído para ser usado em ambas as views */}
        {renderModalPaciente()}
      </div>
    );
  }
  // Função para renderizar o modal em qualquer estado
  function renderModalPaciente() { return (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Cadastro de Paciente" maxWidth="max-w-4xl">
      <div className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Info Básica */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-100 pb-2">Informações Pessoais (Obrigatórios)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><InputField label="Nome Completo *" required placeholder="Nome do paciente" defaultValue={perfilAtivo ? perfilAtivo.nome : ''} /></div>
              <InputField label="Data de Nascimento *" type="date" required defaultValue={perfilAtivo ? "1985-08-15" : ''} />
              <InputField label="CPF *" required placeholder="000.000.000-00" defaultValue={perfilAtivo ? perfilAtivo.cpf : ''} />
              <InputField label="Celular / WhatsApp *" required placeholder="(00) 00000-0000" defaultValue={perfilAtivo ? perfilAtivo.tel : ''} />
              <SelectField label="Sexo Biológico *" required>
                <option value="">Selecione...</option>
                <option value="M" selected={!!perfilAtivo}>Masculino</option>
                <option value="F">Feminino</option>
              </SelectField>
            </div>

            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-100 pb-2 mt-6">Dados do Responsável</h4>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Nome do Responsável" placeholder="Nome completo" />
              <InputField label="CPF do Responsável" placeholder="000.000.000-00" />
            </div>

            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-100 pb-2 mt-6">Dados Complementares (Opcionais)</h4>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Gênero" placeholder="Ex: Não-binário" />
              <SelectField label="Unidade de Cadastro">
                <option>Matriz</option>
                <option>Filial Centro</option>
              </SelectField>
              <InputField label="Nome da Mãe" placeholder="Nome completo da mãe" className="col-span-2" />
              <InputField label="E-mail" type="email" placeholder="paciente@email.com" className="col-span-2" defaultValue={perfilAtivo ? 'joao.doe@email.com' : ''} />
            </div>

            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-100 pb-2 mt-6">Endereço</h4>
            <div className="flex gap-4 mb-4">
              <InputField label="Data" placeholder="Data" />
              <InputField label="Horário" placeholder="Horário" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="CEP" placeholder="00000-000" />
              <InputField label="Logradouro" placeholder="Rua, Avenida..." className="col-span-2" defaultValue={perfilAtivo ? 'Rua das Flores' : ''} />
              <InputField label="Número" placeholder="Nº" defaultValue={perfilAtivo ? '123' : ''} />
              <InputField label="Complemento" placeholder="Apto, Sala..." className="col-span-2" />
              <InputField label="Bairro" placeholder="Bairro" defaultValue={perfilAtivo ? 'Centro' : ''} />
              <InputField label="Cidade" placeholder="Cidade" defaultValue={perfilAtivo ? 'São Paulo' : ''} />
              <SelectField label="UF">
                <option value="">UF</option>
                <option selected={!!perfilAtivo}>SP</option>
                <option>RJ</option>
                <option>MG</option>
              </SelectField>
            </div>
          </div>

          {/* Coluna Direita - Convênio / Opções */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 h-fit">
            <h4 className="text-sm font-bold text-slate-700 border-b border-gray-200 pb-2">Plano de Saúde</h4>
            <SelectField label="Convênio" required>
              <option selected={perfilAtivo?.plano === 'Particular'}>Particular</option>
              <option selected={perfilAtivo?.plano === 'Unimed'}>Unimed</option>
              <option selected={perfilAtivo?.plano === 'Bradesco Saúde'}>Bradesco Saúde</option>
              <option selected={perfilAtivo?.plano === 'SulAmérica'}>SulAmérica</option>
            </SelectField>
            <InputField label="Nº da Carteirinha" placeholder="00000000000" />
            <InputField label="Validade da Carteira" type="date" />
            
            <div className="mt-4 pt-4 border-t border-gray-200">
               <h4 className="text-sm font-bold text-slate-700 mb-2 text-red-600 flex items-center gap-2"><Activity size={16} /> Alergias</h4>
               <InputField label="Alergias" placeholder="Ex: Penicilina, Iodo, Dipirona..." />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
               <h4 className="text-sm font-bold text-slate-700 mb-2">Observações (Opcional)</h4>
               <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary" placeholder="Outras informações clínicas ou restrições..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
          <Btn onClick={() => setModalOpen(false)}>Salvar Paciente</Btn>
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
          <Btn variant="secondary" icon={Edit} onClick={() => setModalOpen(true)}>Editar Dados</Btn>
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
              <Activity size={16} className="text-brand-primary" /> Histórico de CIDs
            </h3>
            {perfilAtivo.historico_cid && perfilAtivo.historico_cid.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {perfilAtivo.historico_cid.map((cid, i) => (
                  <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-100">
                    {cid}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Nenhum CID registrado.</p>
            )}
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
                <span className="text-sm font-bold text-slate-800">15/08/1985 (38 anos)</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">Sexo</span>
                <span className="text-sm font-bold text-slate-800">Masculino</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">E-mail</span>
                <span className="text-sm font-bold text-slate-800">joao.doe@email.com</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-slate-600">Endereço</span>
                <span className="text-sm font-bold text-slate-800 text-right">Rua das Flores, 123<br/>Centro - SP</span>
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
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent animate-fade-in-up">
                  
                  {/* Item 1 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-brand-light text-brand-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      <Stethoscope size={18} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-800 text-sm">Avaliação Clínica</h4>
                        <time className="text-[10px] font-bold text-brand-primary bg-brand-light px-2 py-0.5 rounded-full">Ontem, 14:30</time>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Dr. João • Clínica Geral</p>
                      <p className="text-sm text-slate-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        Paciente relata sensibilidade no dente 46. Realizado exame clínico e raio-x. Indicada restauração em resina.
                      </p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gray-100 text-slate-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Activity size={18} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white border border-gray-100 shadow-sm opacity-70">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-800 text-sm">Profilaxia</h4>
                        <time className="text-[10px] font-bold text-slate-500 bg-gray-100 px-2 py-0.5 rounded-full">10/05/2026</time>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Dra. Maria • Limpeza</p>
                      <p className="text-sm text-slate-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        Limpeza de rotina realizada com sucesso. Paciente orientado sobre escovação.
                      </p>
                    </div>
                  </div>

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
                      {!memedToken && (
                        <Btn size="sm" onClick={carregarMemed} disabled={memedLoading}>
                          {memedLoading ? 'Carregando...' : 'Abrir Prescrição'}
                        </Btn>
                      )}
                    </div>
                    {memedErro && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠️ {memedErro} — configure as chaves no backend/.env
                      </div>
                    )}
                    {memedToken && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        ✓ Memed conectado. O painel de prescrição foi aberto.
                      </div>
                    )}
                    {!memedToken && !memedErro && !memedLoading && (
                      <p className="text-xs text-slate-500">Clique em "Abrir Prescrição" para lançar o módulo de receituário digital da Memed.</p>
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
                <div className="animate-fade-in-up space-y-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <h4 className="font-bold text-slate-800 mb-2">Anamnese Geral</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li><strong>Alergias:</strong> Sim (Penicilina)</li>
                      <li><strong>Doenças Crônicas:</strong> Não</li>
                      <li><strong>Uso de Medicamentos:</strong> Nenhum contínuo</li>
                      <li><strong>Fumante:</strong> Não</li>
                    </ul>
                  </div>
                </div>
              )}

              {perfilTab === 'orcamentos' && (
                <div className="animate-fade-in-up">
                  <div className="text-center py-10">
                    <FileText size={48} className="text-slate-300 mx-auto mb-3" />
                    <h4 className="text-slate-500 font-bold">Nenhum orçamento cadastrado</h4>
                    <p className="text-sm text-slate-400 mt-1">Gere novos orçamentos através do módulo de Odontograma.</p>
                  </div>
                </div>
              )}

              {perfilTab === 'imagens' && (
                <div className="animate-fade-in-up">
                  <div className="text-center py-10">
                    <Camera size={48} className="text-slate-300 mx-auto mb-3" />
                    <h4 className="text-slate-500 font-bold">Nenhuma imagem ou raio-x anexado</h4>
                    <Btn variant="outline" size="sm" className="mt-4">Fazer Upload</Btn>
                  </div>
                </div>
              )}

              {(perfilTab === 'odontograma' || perfilTab === 'planos') && (
                <div className="animate-fade-in-up">
                  <div className="text-center py-10">
                    <Stethoscope size={48} className="text-slate-300 mx-auto mb-3" />
                    <h4 className="text-slate-500 font-bold">Este recurso possui seu próprio módulo.</h4>
                    <Btn variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard/odontograma')}>Acessar {perfilTab === 'odontograma' ? 'Odontograma' : 'Planos'}</Btn>
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
            <button onClick={() => navigate('/dashboard/odontograma')} className="p-4 border border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-light/20 flex flex-col items-center justify-center gap-2 transition-colors">
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
