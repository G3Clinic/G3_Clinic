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
    'w-full bg-white/10 border border-white/20 text-white placeholder:text-blue-300/60 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-2xl shadow-2xl shadow-brand-primary/40 mb-4">
            <HeartPulse size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Clínica da Família</h1>
          <p className="text-blue-300 text-sm mt-1">Painel de Gestão Operacional</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-1">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta da empresa'}
          </h2>
          <p className="text-blue-200 text-sm mb-6">
            {mode === 'login'
              ? 'Insira suas credenciais para acessar o painel'
              : 'Cadastre sua clínica e o usuário administrador (dono)'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1.5">Nome da empresa</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300" />
                    <input value={empresaNome} onChange={e => setEmpresaNome(e.target.value)}
                      placeholder="Ex: Rede OdontoSorriso" required className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1.5">Seu nome (administrador)</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300" />
                    <input value={donoNome} onChange={e => setDonoNome(e.target.value)}
                      placeholder="Ex: Dr. Paulo" required className={inputCls} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300" />
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  minLength={6}
                  className="w-full bg-white/10 border border-white/20 text-white placeholder:text-blue-300/60 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-primary hover:bg-brand-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-brand-primary/30 hover:shadow-brand-primary/50 flex items-center justify-center gap-2 group mt-2">
              {loading ? 'Aguarde…' : mode === 'login' ? 'Acessar Sistema' : 'Criar conta'}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="text-center text-xs text-blue-300 mt-6">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="font-semibold text-white hover:underline">
              {mode === 'login' ? 'Registrar empresa' : 'Fazer login'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-blue-400/60 mt-6">
          © 2025 Clínica da Família — Gestão Clínica
        </p>
      </div>
    </div>
  );
}
