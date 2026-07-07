import { useState, useEffect } from 'react';
import { User, Shield, Lock, Save, CheckCircle2, AlertCircle, Headphones, Mail, MessageCircle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export function UserProfilePage() {
  const [user, setUser] = useState<{name: string, email: string, role: string, unit: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/usuarios/me`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setUser(data);
        } else {
          setUser({ name: '', email: '', role: '', unit: '' });
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar perfil:', err);
        setUser({ name: '', email: '', role: '', unit: '' });
        setIsLoading(false);
      });
  }, []);

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleUpdatePassword = async () => {
    setMessage(null);

    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setMessage({ type: 'error', text: 'Preencha todos os campos de senha.' });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'A nova senha e a confirmação não conferem.' });
      return;
    }

    if (passwords.new.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/usuarios/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senha_atual: passwords.current,
          nova_senha: passwords.new
        })
      });

      if (!response.ok) {
        throw new Error('A senha atual está incorreta ou ocorreu um erro no servidor.');
      }

      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar senha.' });
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-500">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Meu Perfil</h1>
          <p className="text-slate-500 text-sm">Gerencie suas credenciais de acesso.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="space-y-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 h-fit">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <User className="text-brand-red" size={20} />
              Dados Cadastrais
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-medium cursor-not-allowed select-none">
                  {user.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Corporativo</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-medium cursor-not-allowed select-none">
                  {user.email}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função / Cargo</label>
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-600 font-medium flex items-center gap-2 cursor-not-allowed">
                      <Shield size={16} className="text-slate-400" />
                      {user.role}
                    </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                Estes dados são gerenciados pelo administrador do sistema. Para solicitar alterações cadastrais, entre em contato com o RH.
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 h-fit">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Headphones className="text-brand-red" size={20} />
              Suporte e Atendimento
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Encontrou um problema ou tem sugestões? Entre em contato diretamente com nossa equipe de desenvolvimento.
            </p>
            
            <div className="space-y-3">
              <a 
                href="#" 
                className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
                onClick={(e) => { e.preventDefault(); alert('Abriria o WhatsApp Web'); }}
              >
                <MessageCircle size={20} />
                Chamar no WhatsApp
              </a>
              
              <a 
                href="mailto:suporte@avdasoftware.com" 
                className="flex items-center justify-center gap-3 w-full py-4 bg-gray-50 text-slate-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <Mail size={20} />
                Enviar E-mail
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 h-fit">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Lock className="text-brand-red" size={20} />
            Segurança e Senha
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Senha Atual</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                placeholder="Digite sua senha atual"
                value={passwords.current}
                onChange={e => setPasswords({...passwords, current: e.target.value})}
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nova Senha</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
                value={passwords.new}
                onChange={e => setPasswords({...passwords, new: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
              <input 
                type="password" 
                className={`w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all ${passwords.confirm && passwords.new !== passwords.confirm ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-brand-red'}`}
                placeholder="Repita a nova senha"
                value={passwords.confirm}
                onChange={e => setPasswords({...passwords, confirm: e.target.value})}
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                 {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                 {message.text}
              </div>
            )}

            <button 
              onClick={handleUpdatePassword}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Save size={18} />
              Atualizar Senha
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}