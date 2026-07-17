import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Mail, Lock, Eye, EyeOff, ArrowRight, Building2, User } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

type Mode = 'login' | 'register';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [donoNome, setDonoNome] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ empresa_nome: empresaNome, dono_nome: donoNome, email, senha: password });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all shadow-sm';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm pointer-events-none"></div>

      <div className="relative w-full max-w-md z-10 flex flex-col items-center">
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-24 h-24 mb-3">
            <img src="/logo.png" alt="G3 Clinic Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-900 drop-shadow-sm">G3 Clinic</h1>
          <p className="text-emerald-800/80 text-sm mt-1 font-medium drop-shadow-sm">Painel de Gestão Operacional</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-8 shadow-2xl shadow-emerald-900/10 w-full">
          <h2 className="text-xl font-bold text-emerald-900 mb-1">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta da empresa'}
          </h2>
          <p className="text-emerald-700/80 text-sm mb-6">
            {mode === 'login'
              ? 'Insira suas credenciais para acessar o painel'
              : 'Cadastre sua clínica e o usuário administrador (dono)'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1.5 ml-1">Nome da empresa</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={empresaNome} onChange={e => setEmpresaNome(e.target.value)}
                      placeholder="Ex: Rede OdontoSorriso" required className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1.5 ml-1">Seu nome (administrador)</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={donoNome} onChange={e => setDonoNome(e.target.value)}
                      placeholder="Ex: Dr. Paulo" required className={inputCls} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-emerald-900 mb-1.5 ml-1">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-900 mb-1.5 ml-1">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  minLength={6}
                  className="w-full bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all shadow-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-all shadow-md shadow-emerald-500/30 flex items-center justify-center gap-2 group mt-4">
              {loading ? 'Aguarde...' : mode === 'login' ? 'Acessar Sistema' : 'Criar conta'}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="text-center text-xs text-emerald-800/70 mt-6">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
              {mode === 'login' ? 'Registrar empresa' : 'Fazer login'}
            </button>
          </p>
        </div>

        <p className="text-center text-[11px] font-medium text-emerald-800/50 mt-6 drop-shadow-sm">
           © 2025 Clínica da Família — Gestão Clínica
        </p>
      </div>
    </div>
  );
}
