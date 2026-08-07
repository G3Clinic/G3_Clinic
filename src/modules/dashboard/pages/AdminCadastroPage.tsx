import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit2, Trash2, Save, KeyRound, Check, AlertTriangle, Search, UserX, UserCheck } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { usuariosApi, filiaisApi, permissoesApi, type APIUsuario, type APIFilial } from '../../../services/api';

// Papel: valor do select (1-4) <-> role do backend
const ROLE_POR_NUM: Record<string, string> = { '1': 'administrador', '2': 'profissional_saude', '3': 'recepcionista', '4': 'faturamento' };
const NUM_POR_ROLE: Record<string, string> = { administrador: '1', profissional_saude: '2', recepcionista: '3', faturamento: '4' };
const LABEL_ROLE: Record<string, string> = { administrador: 'Administrador', profissional_saude: 'Profissional de Saúde', recepcionista: 'Recepcionista', faturamento: 'Faturamento' };

// Módulos exibidos (label) -> chave do backend (null = cosmético, sem gate)
const MODULOS: { label: string; key: string | null }[] = [
  { label: 'Painel', key: null },
  { label: 'Pacientes', key: 'pacientes' },
  { label: 'Agenda', key: 'agenda' },
  { label: 'Recepção', key: 'recepcao' },
  { label: 'Prontuário', key: 'prontuario' },
  { label: 'Odontograma', key: 'odontograma' },
  { label: 'Caixa do Dia', key: 'caixa' },
  { label: 'Financeiro', key: 'financeiro' },
  { label: 'Auditoria', key: null },
  { label: 'Estoque', key: 'estoque' },
  { label: 'Relatórios', key: 'relatorios' },
  { label: 'Administração', key: 'admin' },
];

const MODULOS_POR_PAPEL: Record<string, string[]> = {
  '1': ['pacientes', 'agenda', 'recepcao', 'prontuario', 'odontograma', 'caixa', 'financeiro', 'estoque', 'relatorios', 'admin'],
  '2': ['pacientes', 'agenda', 'recepcao', 'prontuario', 'odontograma', 'caixa'],
  '3': ['pacientes', 'agenda', 'recepcao', 'caixa'],
  '4': ['financeiro', 'relatorios', 'caixa']
};

type Form = {
  nome: string; email: string; cpf: string; telefone: string; papel: string; senha: string;
  conselho_tipo: string; conselho_numero: string; conselho_uf: string;
  especialidade_medica: string; rqe_numero: string; rqe_uf: string;
};
const FORM_VAZIO: Form = {
  nome: '', email: '', cpf: '', telefone: '', papel: '', senha: '',
  conselho_tipo: 'CRM', conselho_numero: '', conselho_uf: 'SP',
  especialidade_medica: '', rqe_numero: '', rqe_uf: 'SP',
};
const UFS = ['SP', 'RJ', 'MG', 'BA'];

export function AdminCadastroPage() {
  const [usuarios, setUsuarios] = useState<APIUsuario[]>([]);
  const [filiais, setFiliais] = useState<APIFilial[]>([]);
  const [vinculosFiliais, setVinculosFiliais] = useState<{ usuario_id: string; unidade_id: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [modal, setModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<APIUsuario | null>(null);

  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [modsMarcados, setModsMarcados] = useState<Set<string>>(new Set());
  const [filiaisMarcadas, setFiliaisMarcadas] = useState<Set<number>>(new Set());
  const [senha1, setSenha1] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const setCampo = (c: keyof Form, v: string) => setForm(prev => ({ ...prev, [c]: v }));

  const handlePapelChange = (papel: string) => {
    setCampo('papel', papel);
    if (MODULOS_POR_PAPEL[papel]) {
      setModsMarcados(new Set(MODULOS_POR_PAPEL[papel]));
    }
  };

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([usuariosApi.listar(), filiaisApi.listar(), usuariosApi.listarFiliaisTodosUsuarios()])
      .then(([us, fs, vs]) => { setUsuarios(us); setFiliais(fs); setVinculosFiliais(vs); })
      .catch(e => console.error('Erro ao carregar usuários:', e))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const unidadesDoUsuario = (usuarioId: string) => vinculosFiliais.filter(v => v.usuario_id === usuarioId).map(v => v.unidade_id);

  const usuariosFiltrados = usuarios.filter(u => {
    const buscaOk = !busca.trim() || u.nome.toLowerCase().includes(busca.toLowerCase()) || (u.email || '').toLowerCase().includes(busca.toLowerCase());
    const papelOk = !filtroPapel || u.role === filtroPapel;
    const unidadeOk = !filtroUnidade || unidadesDoUsuario(u.id).includes(Number(filtroUnidade));
    const statusOk = !filtroStatus || (filtroStatus === 'ativo' ? u.ativo !== false : u.ativo === false);
    return buscaOk && papelOk && unidadeOk && statusOk;
  });

  const camposProfissional = () => ({
    conselho_tipo: form.conselho_tipo, conselho_numero: form.conselho_numero, conselho_uf: form.conselho_uf,
    especialidade_medica: form.especialidade_medica || undefined, rqe_numero: form.rqe_numero || undefined, rqe_uf: form.rqe_uf || undefined,
  });

  // ── Novo usuário ──
  const abrirNovo = () => { 
    setForm(FORM_VAZIO); 
    setErro(''); 
    setModsMarcados(new Set()); 
    setFiliaisMarcadas(new Set(filiais.map(f => f.id)));
    setModal(true); 
  };
  const salvarNovo = async () => {
    setErro('');
    if (!form.nome.trim() || !form.email.trim() || !form.papel) { setErro('Nome, e-mail e perfil são obrigatórios.'); return; }
    if (form.senha.length < 6) { setErro('Senha temporária: mínimo 6 caracteres.'); return; }
    setSalvando(true);
    try {
      const payload: Record<string, unknown> = {
        nome: form.nome.trim(), email: form.email.trim(), senha: form.senha,
        role: ROLE_POR_NUM[form.papel], cpf: form.cpf || undefined, telefone: form.telefone || undefined,
        unidade_ids: Array.from(filiaisMarcadas),
      };
      if (form.papel === '2') Object.assign(payload, camposProfissional());
      const res = await usuariosApi.criar(payload);
      
      const modulos = Array.from(modsMarcados);
      const filiaisArr = Array.from(filiaisMarcadas);
      await Promise.all(filiaisArr.map(id => usuariosApi.definirPermissoes(res.id, id, modulos)));

      setModal(false); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao criar usuário.'); }
    finally { setSalvando(false); }
  };

  // ── Editar usuário ──
  const abrirEdit = async (u: APIUsuario) => {
    setSelectedUser(u);
    setForm({
      nome: u.nome || '', email: u.email || '', cpf: u.cpf || '', telefone: u.telefone || '',
      papel: u.role ? NUM_POR_ROLE[u.role] || '3' : '3', senha: '',
      conselho_tipo: u.conselho_tipo || 'CRM', conselho_numero: u.conselho_numero || '', conselho_uf: u.conselho_uf || 'SP',
      especialidade_medica: u.especialidade_medica || '', rqe_numero: u.rqe_numero || '', rqe_uf: u.rqe_uf || 'SP',
    });
    setErro('');
    // carrega permissões atuais do usuário
    try {
      const todas = await permissoesApi.listar();
      const doUser = todas.filter(p => p.usuario_id === u.id).map(p => p.modulo);
      setModsMarcados(new Set(doUser));
    } catch { setModsMarcados(new Set()); }
    
    try {
      const uFiliais = await usuariosApi.listarFiliaisUsuario(u.id);
      setFiliaisMarcadas(new Set(uFiliais));
    } catch { setFiliaisMarcadas(new Set()); }
    
    setEditModalOpen(true);
  };
  const toggleMod = (key: string) => setModsMarcados(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });
  const toggleFilial = (id: number) => setFiliaisMarcadas(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const salvarEdit = async () => {
    if (!selectedUser) return;
    setErro(''); setSalvando(true);
    try {
      await usuariosApi.atualizar(selectedUser.id, {
        nome: form.nome.trim(), email: form.email || undefined, cpf: form.cpf || undefined,
        telefone: form.telefone || undefined, role: ROLE_POR_NUM[form.papel],
        ...(form.papel === '2' ? camposProfissional() : {}),
      });
      // aplica módulos apenas nas filiais marcadas
      const filiaisArr = Array.from(filiaisMarcadas);
      await usuariosApi.definirFiliaisUsuario(selectedUser.id, filiaisArr);
      const modulos = Array.from(modsMarcados);
      await Promise.all(filiaisArr.map(id => usuariosApi.definirPermissoes(selectedUser.id, id, modulos)));
      setEditModalOpen(false); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  // ── Senha / excluir ──
  const abrirSenha = (u: APIUsuario) => { setSelectedUser(u); setSenha1(''); setSenha2(''); setErro(''); setPasswordModalOpen(true); };
  const salvarSenha = async () => {
    if (!selectedUser) return;
    setErro('');
    if (senha1.length < 6) { setErro('Mínimo 6 caracteres.'); return; }
    if (senha1 !== senha2) { setErro('As senhas não coincidem.'); return; }
    try { await usuariosApi.redefinirSenha(selectedUser.id, senha1); setPasswordModalOpen(false); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao trocar senha.'); }
  };
  const excluir = async () => {
    if (!selectedUser) return;
    try { await usuariosApi.excluir(selectedUser.id); setDeleteModalOpen(false); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  };

  // Ativar/desativar acesso — diferente de excluir: mantém o cadastro (histórico, vínculos)
  // e só bloqueia o login (o backend já rejeita login de usuário com ativo=false).
  const alternarAtivo = async (u: APIUsuario) => {
    const estaAtivo = u.ativo !== false;
    if (estaAtivo && !confirm(`Desativar o acesso de "${u.nome}"? Ele(a) não conseguirá mais fazer login. O cadastro é mantido e pode ser reativado depois.`)) return;
    try {
      await usuariosApi.atualizar(u.id, { ativo: !estaAtivo });
      carregar();
    } catch (e) { alert(e instanceof Error ? e.message : `Erro ao ${estaAtivo ? 'desativar' : 'reativar'} usuário.`); }
  };

  const iniciais = (nome: string) => nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const renderPermissoes = () => (
    <>
      <div className="mt-4">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">UNIDADES LIBERADAS</label>
        <div className="grid grid-cols-2 gap-2">
          {filiais.map(f => {
            const marcado = filiaisMarcadas.has(f.id);
            return (
              <label key={f.id} className={`flex items-center gap-2 p-2 bg-slate-50 rounded-lg border cursor-pointer transition-colors ${marcado ? 'border-brand-primary/40' : 'border-transparent hover:border-brand-primary/20'}`}>
                <input type="checkbox" className="hidden" checked={marcado} onChange={() => toggleFilial(f.id)} />
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${marcado ? 'bg-brand-primary border-brand-primary' : 'bg-white border-slate-300'}`}>
                  {marcado && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm font-bold text-slate-700">{f.nome}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">MÓDULOS LIBERADOS</label>
        <div className="grid grid-cols-2 gap-2">
          {MODULOS.map(m => {
            const marcado = m.key === null || modsMarcados.has(m.key);
            return (
              <label key={m.label} className={`flex items-center gap-2 p-2 bg-slate-50 rounded-lg border cursor-pointer transition-colors ${marcado ? 'border-brand-primary/40' : 'border-transparent hover:border-brand-primary/20'} ${m.key === null ? 'opacity-60 cursor-default' : ''}`}>
                <input type="checkbox" className="hidden" disabled={m.key === null} checked={marcado} onChange={() => m.key && toggleMod(m.key)} />
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${marcado ? 'bg-brand-primary border-brand-primary' : 'bg-white border-slate-300'}`}>
                  {marcado && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm font-bold text-slate-700">{m.label}</span>
              </label>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Administrador e dono têm acesso total automaticamente. "Painel" e "Auditoria" são sempre visíveis.</p>
      </div>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Cadastro de Usuários" subtitle="Crie e gerencie todos os usuários que acessam o sistema">
        <Btn icon={Plus} onClick={abrirNovo}>+ Novo Usuário</Btn>
      </PageHeader>

      <Card padding={false} className="bg-white border-gray-200 shadow-sm">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome ou e-mail..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
            </div>
          </div>
          <SelectField label="Perfil" value={filtroPapel} onChange={e => setFiltroPapel(e.target.value)}>
            <option value="">Todos</option>
            <option value="administrador">Administrador</option>
            <option value="profissional_saude">Profissional de Saúde</option>
            <option value="recepcionista">Recepcionista</option>
            <option value="faturamento">Faturamento</option>
          </SelectField>
          <SelectField label="Unidade" value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}>
            <option value="">Todas</option>
            {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </SelectField>
          <SelectField label="Status" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </SelectField>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Usuário', 'E-mail', 'Perfil', 'CRM/Registro', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Carregando...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Nenhum usuário cadastrado.</td></tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Nenhum usuário encontrado para os filtros aplicados.</td></tr>
              ) : usuariosFiltrados.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center text-brand-primary font-bold text-xs">{iniciais(u.nome)}</div>
                      <span className="font-medium text-slate-800">{u.nome}{u.is_dono && <span className="ml-1 text-[10px] text-amber-600">(dono)</span>}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3"><Badge color={u.role === 'administrador' ? 'red' : u.role === 'profissional_saude' ? 'blue' : 'purple'}>{u.role ? LABEL_ROLE[u.role] || u.role : '—'}</Badge></td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{u.conselho_numero ? `${u.conselho_tipo || ''} ${u.conselho_numero}/${u.conselho_uf || ''}` : '—'}</td>
                  <td className="px-4 py-3"><Badge color={u.ativo === false ? 'gray' : 'green'}>{u.ativo === false ? 'Inativo' : 'Ativo'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEdit(u)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg" title="Editar Usuário"><Edit2 size={14} /></button>
                      <button onClick={() => abrirSenha(u)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg" title="Trocar Senha"><KeyRound size={14} /></button>
                      {!u.is_dono && (
                        u.ativo === false
                          ? <button onClick={() => alternarAtivo(u)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Reativar Usuário"><UserCheck size={14} /></button>
                          : <button onClick={() => alternarAtivo(u)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg" title="Desativar Usuário"><UserX size={14} /></button>
                      )}
                      {!u.is_dono && <button onClick={() => { setSelectedUser(u); setDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Excluir Usuário"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Novo Usuário */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo Usuário">
        <div className="space-y-4">
          <InputField label="Nome Completo" required placeholder="Nome do usuário" value={form.nome} onChange={e => setCampo('nome', e.target.value)} />
          <InputField label="E-mail" required type="email" placeholder="email@clinica.com" value={form.email} onChange={e => setCampo('email', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={e => setCampo('cpf', e.target.value)} />
            <InputField label="Celular" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setCampo('telefone', e.target.value)} />
          </div>
          <SelectField label="Perfil de Acesso" required value={form.papel} onChange={e => handlePapelChange(e.target.value)}>
            <option value="">Selecione</option>
            <option value="1">Administrador</option>
            <option value="2">Profissional de Saúde</option>
            <option value="3">Recepcionista</option>
            <option value="4">Faturamento</option>
          </SelectField>

          {form.papel === '2' && (
            <div className="space-y-4 border-t border-gray-100 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField label="Conselho *" required value={form.conselho_tipo} onChange={e => setCampo('conselho_tipo', e.target.value)}>
                  <option>CRM</option><option>CRO</option><option>CRP</option><option>CREFITO</option><option>CRBM</option><option>CRF</option><option>COREN</option>
                </SelectField>
                <InputField label="Número do Registro *" required placeholder="Ex: 123456" value={form.conselho_numero} onChange={e => setCampo('conselho_numero', e.target.value)} />
                <SelectField label="UF *" required value={form.conselho_uf} onChange={e => setCampo('conselho_uf', e.target.value)}>
                  {UFS.map(uf => <option key={uf}>{uf}</option>)}
                </SelectField>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Ex: CRM 12345/SP — obrigatório para identificação do profissional habilitado.</p>
              <h4 className="font-bold text-slate-700 text-sm mt-4">Especialidade Médica (RQE)</h4>
              <InputField label="Especialidade Médica (opcional)" placeholder="Ex: Cardiologia" value={form.especialidade_medica} onChange={e => setCampo('especialidade_medica', e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Número do RQE (opcional)" placeholder="Ex: 12345" value={form.rqe_numero} onChange={e => setCampo('rqe_numero', e.target.value)} />
                <SelectField label="UF" value={form.rqe_uf} onChange={e => setCampo('rqe_uf', e.target.value)}>
                  {UFS.map(uf => <option key={uf}>{uf}</option>)}
                </SelectField>
              </div>
            </div>
          )}

          {renderPermissoes()}

          <InputField label="Senha Temporária" type="password" required value={form.senha} onChange={e => setCampo('senha', e.target.value)} />
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="cancel" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvarNovo} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Usuário'}</Btn>
        </div>
      </Modal>

      {/* Editar Usuário */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Usuário" maxWidth="max-w-2xl">
        <div className="space-y-5">
          <InputField label="NOME COMPLETO *" value={form.nome} onChange={e => setCampo('nome', e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="CPF" value={form.cpf} onChange={e => setCampo('cpf', e.target.value)} />
            <InputField label="CELULAR" value={form.telefone} onChange={e => setCampo('telefone', e.target.value)} />
          </div>
          <InputField label="E-MAIL (OPCIONAL)" value={form.email} onChange={e => setCampo('email', e.target.value)} />
          <SelectField label="PAPEL *" value={form.papel} onChange={e => handlePapelChange(e.target.value)}>
            <option value="1">Administrador</option>
            <option value="2">Profissional de Saúde</option>
            <option value="3">Recepcionista</option>
            <option value="4">Faturamento</option>
          </SelectField>

          {form.papel === '2' && (
            <div className="space-y-4 border-t border-gray-100 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField label="Conselho *" required value={form.conselho_tipo} onChange={e => setCampo('conselho_tipo', e.target.value)}>
                  <option>CRM</option><option>CRO</option><option>CRP</option><option>CREFITO</option><option>CRBM</option><option>CRF</option><option>COREN</option>
                </SelectField>
                <InputField label="Número do Registro *" required value={form.conselho_numero} onChange={e => setCampo('conselho_numero', e.target.value)} />
                <SelectField label="UF *" required value={form.conselho_uf} onChange={e => setCampo('conselho_uf', e.target.value)}>
                  {UFS.map(uf => <option key={uf}>{uf}</option>)}
                </SelectField>
              </div>
              <InputField label="Especialidade Médica (opcional)" value={form.especialidade_medica} onChange={e => setCampo('especialidade_medica', e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Número do RQE (opcional)" value={form.rqe_numero} onChange={e => setCampo('rqe_numero', e.target.value)} />
                <SelectField label="UF" value={form.rqe_uf} onChange={e => setCampo('rqe_uf', e.target.value)}>
                  {UFS.map(uf => <option key={uf}>{uf}</option>)}
                </SelectField>
              </div>
            </div>
          )}

          {renderPermissoes()}
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="mt-8 flex justify-end">
          <button onClick={salvarEdit} disabled={salvando} className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-60 w-full md:w-auto justify-center">
            <Check size={18} /> {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </Modal>

      {/* Trocar Senha */}
      <Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Nova Senha" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 mb-4">Defina uma nova senha de acesso para <strong>{selectedUser?.nome}</strong>.</p>
          <InputField label="Nova Senha" type="password" required value={senha1} onChange={e => setSenha1(e.target.value)} />
          <InputField label="Confirmar Nova Senha" type="password" required value={senha2} onChange={e => setSenha2(e.target.value)} />
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <Btn variant="cancel" onClick={() => setPasswordModalOpen(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvarSenha}>Salvar Senha</Btn>
        </div>
      </Modal>

      {/* Excluir */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Excluir Usuário" maxWidth="max-w-md">
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2"><AlertTriangle size={32} /></div>
          <h3 className="text-lg font-bold text-slate-800">Você tem certeza?</h3>
          <p className="text-sm text-slate-500">Deseja realmente excluir o usuário <strong>{selectedUser?.nome}</strong>? Essa ação não poderá ser desfeita.</p>
        </div>
        <div className="mt-2 flex gap-3 w-full">
          <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button onClick={excluir} className="flex-1 py-2.5 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">Excluir</button>
        </div>
      </Modal>
    </div>
  );
}
