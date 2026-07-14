import { useState, useEffect } from 'react';
import { User, Camera, Save, KeyRound, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Btn, InputField, SelectField, Modal } from '../../../components/ui/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { authApi, uploadArquivo } from '../../../services/api';
import { formatarCpf, cpfValido } from '../../../utils/cpf';

export function MeuPerfilPage() {
  const { user, refresh } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    nome: '', nome_social: '', cpf: '', telefone: '', email: '', sexo: '', data_nascimento: '',
    conselho_tipo: 'CRM', conselho_numero: '', conselho_uf: 'BA', foto_url: '' as string | undefined,
  });
  const set = (c: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [c]: v }));

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confSenha, setConfSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      nome: user.nome || '', nome_social: user.nome_social || '', cpf: user.cpf || '', telefone: user.telefone || '',
      email: user.email || '', sexo: user.sexo || '', data_nascimento: user.data_nascimento || '',
      conselho_tipo: user.conselho_tipo || 'CRM', conselho_numero: user.conselho_numero || '',
      conselho_uf: user.conselho_uf || 'BA', foto_url: user.foto_url || '',
    });
  }, [user]);

  const salvar = async () => {
    if (form.cpf.trim() && !cpfValido(form.cpf)) {
      alert('CPF inválido — verifique os dígitos.');
      return;
    }
    setSalvando(true);
    try {
      await authApi.atualizarPerfil({
        nome: form.nome, nome_social: form.nome_social || null, cpf: form.cpf.replace(/\D/g, '') || null, telefone: form.telefone || null,
        email: form.email, sexo: form.sexo || null, data_nascimento: form.data_nascimento || null,
        conselho_tipo: form.conselho_tipo, conselho_numero: form.conselho_numero || null, conselho_uf: form.conselho_uf,
        foto_url: form.foto_url || null,
      } as any);
      await refresh();
      alert('Perfil atualizado com sucesso!');
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const alterarFoto = async (file: File) => {
    try { const { url } = await uploadArquivo(file); set('foto_url', url); }
    catch { alert('Erro ao enviar foto.'); }
  };

  const salvarSenha = async () => {
    setErroSenha('');
    if (novaSenha.length < 6) { setErroSenha('Mínimo 6 caracteres.'); return; }
    if (novaSenha !== confSenha) { setErroSenha('As senhas não coincidem.'); return; }
    try {
      await authApi.trocarSenha(novaSenha, senhaAtual || undefined);
      setPasswordModalOpen(false); setSenhaAtual(''); setNovaSenha(''); setConfSenha('');
      alert('Senha alterada com sucesso!');
    } catch (e) { setErroSenha(e instanceof Error ? e.message : 'Erro.'); }
  };

  const inicial = (form.nome || 'U').charAt(0).toUpperCase();
  const labelRole = user?.is_dono ? 'Dono' : (user?.role || 'Funcionário');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader icon={User} title="Meu Perfil" subtitle="Gerencie suas informações pessoais e credenciais" />

      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 bg-brand-light rounded-full flex items-center justify-center text-brand-primary text-3xl font-bold border-4 border-white shadow-md overflow-hidden">
              {form.foto_url ? <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" /> : <span>{inicial}</span>}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{form.nome || 'Usuário'}</h3>
              <p className="text-sm text-slate-500 font-medium capitalize">{labelRole}</p>
            </div>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors w-fit">
              <Camera size={15} /> Alterar foto
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && alterarFoto(e.target.files[0])} />
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <h4 className="font-bold text-slate-800 border-b border-gray-100 pb-3 mb-5">Dados pessoais</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField label="Nome completo" required value={form.nome} onChange={e => set('nome', e.target.value)} />
          <InputField label="Nome social" placeholder="Como prefere ser chamado" value={form.nome_social} onChange={e => set('nome_social', e.target.value)} />
          <InputField label="CPF" placeholder="000.000.000-00" maxLength={14} value={form.cpf} onChange={e => set('cpf', formatarCpf(e.target.value))} />
          <InputField label="Celular" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
          <InputField label="E-mail" value={form.email} onChange={e => set('email', e.target.value)} />
          <SelectField label="Sexo" value={form.sexo} onChange={e => set('sexo', e.target.value)}>
            <option value="">Selecione...</option><option>Masculino</option><option>Feminino</option><option>Outro</option><option>Prefiro não informar</option>
          </SelectField>
          <InputField label="Data de nascimento" type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
        </div>
      </Card>

      <Card>
        <div className="mb-5 border-b border-gray-100 pb-3">
          <h4 className="font-bold text-slate-800">Dados profissionais</h4>
          <p className="text-xs text-slate-500 mt-1">Necessários para emitir prescrições digitais (registro no conselho).</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SelectField label="Conselho" value={form.conselho_tipo} onChange={e => set('conselho_tipo', e.target.value)}>
            <option>CRM</option><option>CRO</option><option>CRP</option>
          </SelectField>
          <InputField label="Número" value={form.conselho_numero} onChange={e => set('conselho_numero', e.target.value)} />
          <SelectField label="UF" value={form.conselho_uf} onChange={e => set('conselho_uf', e.target.value)}>
            {['BA', 'SP', 'RJ', 'MG'].map(uf => <option key={uf}>{uf}</option>)}
          </SelectField>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <Btn variant="secondary" icon={KeyRound} onClick={() => setPasswordModalOpen(true)}>Alterar senha</Btn>
        <Btn icon={Save} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</Btn>
      </div>

      <Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Alterar senha" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-start gap-3 text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" /><p>Escolha uma senha forte de pelo menos 6 caracteres.</p>
          </div>
          <InputField label="Senha atual" type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
          <InputField label="Nova senha" type="password" required value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
          <InputField label="Confirme a nova senha" type="password" required value={confSenha} onChange={e => setConfSenha(e.target.value)} />
          {erroSenha && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erroSenha}</div>}
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
          <Btn variant="cancel" onClick={() => setPasswordModalOpen(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvarSenha}>Salvar senha</Btn>
        </div>
      </Modal>
    </div>
  );
}
