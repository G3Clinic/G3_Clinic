import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mail, Lock, ArrowRight, HeartPulse, Wallet, UserCheck, Eye, EyeOff 
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import doctorImg from '../../../assets/doctor.png';

const GlassCard = ({ children, className = "", opacity = "bg-white/20" }: any) => (
  <div className={`backdrop-blur-xl ${opacity} border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] ${className}`}>
    {children}
  </div>
);

export function LoginPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const [errorMessage, setErrorMessage] = useState(''); 

  const navigate = useNavigate(); 

  useEffect(() => {
    const savedEmail = localStorage.getItem('g3_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(''); 
    
    // Simulating login for now
    if (rememberMe) {
      localStorage.setItem('g3_saved_email', email);
    } else {
      localStorage.removeItem('g3_saved_email');
    }
    navigate('/dashboard');
  };

  const handleGoogleLogin = () => {
    // Simulando login com Google
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-brand-primary/10 via-white to-brand-primary/5 opacity-70" />

      <div className="absolute inset-0 overflow-hidden z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[65%] h-[65%] rounded-full bg-brand-primary/20 opacity-40 blur-[130px] animate-pulse-custom" style={{ animationDuration: '9s' }} />
        <div className="absolute -bottom-[15%] -right-[5%] w-[75%] h-[75%] rounded-full bg-blue-400 opacity-30 blur-[160px] animate-pulse-custom" style={{ animationDuration: '14s' }} />
        <div className="absolute top-[25%] left-[35%] w-[45%] h-[45%] rounded-full bg-white opacity-60 blur-[110px]" />
        <div className="absolute top-[10%] right-[15%] w-40 h-40 bg-emerald-200 rounded-full opacity-30 blur-[80px] animate-bounce-custom" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[20%] left-[10%] w-56 h-56 bg-brand-light rounded-full opacity-35 blur-[90px]" />
      </div>

      <div className="relative z-20 w-full min-h-screen flex items-center justify-center p-6 md:p-12">
        <div className="relative w-full max-w-6xl flex flex-col lg:flex-row items-stretch justify-between gap-12 lg:gap-20">
          
          {/* LADO ESQUERDO */}
          <div className="hidden lg:flex lg:w-[50%] flex-col justify-between relative pointer-events-none select-none py-4">
            <div className="space-y-4 relative z-30">
              <h1 className="text-5xl xl:text-6xl font-black tracking-tighter text-[#0a2e5c] whitespace-nowrap">
                Gestão <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-blue-600 to-emerald-500">Inteligente</span>
              </h1>
              <p className="text-slate-600 max-w-md text-base leading-relaxed font-semibold opacity-90">
                Integração completa: do primeiro atendimento ao controle administrativo e financeiro.
              </p>
            </div>

            <div className="relative flex-1 w-full flex items-center justify-center my-6">
              <div className="absolute w-64 h-64 bg-brand-primary/10 rounded-full blur-[100px]" />
              <div className="relative w-full h-full flex items-end justify-center overflow-visible pointer-events-none">
                  <img src={doctorImg} alt="Profissional de Saúde" className="max-h-[380px] xl:max-h-[460px] w-auto object-contain drop-shadow-2xl z-10" />
              </div>

              <GlassCard className="absolute top-[10%] -right-2 p-4 rounded-[28px] flex items-center gap-4 shadow-xl pointer-events-auto transition-transform hover:scale-105 z-20">
                <div className="p-3 bg-brand-primary/10 rounded-2xl"><UserCheck size={24} className="text-brand-primary" /></div>
                <div>
                  <p className="text-lg font-black text-[#0a2e5c]">Cuidado 360°</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Jornada do Paciente</p>
                </div>
              </GlassCard>

              <GlassCard className="absolute bottom-[10%] -left-2 p-4 rounded-[28px] flex items-center gap-4 shadow-xl pointer-events-auto transition-transform hover:scale-105 z-20">
                <div className="p-3 bg-brand-primary rounded-2xl shadow-lg shadow-brand-primary/20"><Wallet size={24} className="text-white" /></div>
                <div>
                  <p className="text-lg font-black text-[#0a2e5c]">Saúde Financeira</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Gestão e Faturamento</p>
                </div>
              </GlassCard>
            </div>

            <div className="flex gap-12 pt-6 border-t border-brand-primary/10 relative z-30">
              <div><p className="text-2xl font-black text-[#0a2e5c]">Unificado</p><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Interface Única</p></div>
              <div><p className="text-2xl font-black text-[#0a2e5c]">Inteligente</p><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Análise de Dados</p></div>
            </div>
          </div>

          {/* LADO DIREITO: CARD DE LOGIN */}
          <div className="w-full lg:w-[460px] relative flex flex-col justify-center">
            <GlassCard className="w-full p-10 lg:p-12 rounded-[40px] md:rounded-[48px] shadow-[0_40px_100px_rgba(15,23,42,0.12)] border-white/60" opacity="bg-white/40">
              <div className="flex items-center gap-3 mb-10">
                {theme.logoFullUrl ? (
                   <img src={theme.logoFullUrl} alt="Logo" className="h-20 w-auto object-contain" />
                ) : theme.logoIconUrl ? (
                   <div className="flex items-center gap-3">
                     <img src={theme.logoIconUrl} alt="Logo Icon" className="w-16 h-16 object-contain" />
                     <span className="text-3xl font-black tracking-tighter text-[#0a2e5c]">{theme.companyName || 'Gontijo Clinic G3'}</span>
                   </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-emerald-400 to-brand-primary p-3 rounded-2xl shadow-xl shadow-brand-primary/20">
                      <HeartPulse className="text-white" size={32} />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-[#0a2e5c]">{theme.companyName || 'Gontijo Clinic G3'}</span>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <h2 className="text-4xl font-black text-[#0a2e5c] mb-3 tracking-tighter leading-none">Acesso</h2>
                <p className="text-slate-500 text-sm font-semibold">Introduza as suas credenciais administrativas.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="group space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary/60 group-focus-within:text-brand-primary transition-colors" size={18} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 bg-white/60 border border-white rounded-[24px] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:bg-white/90 transition-all text-sm font-semibold placeholder:text-slate-300 shadow-sm"
                    />
                  </div>
                </div>

                <div className="group space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary/60 group-focus-within:text-brand-primary transition-colors" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-14 pr-12 py-5 bg-white/60 border border-white rounded-[24px] focus:outline-none focus:ring-4 focus:ring-brand-primary/10 focus:bg-white/90 transition-all text-sm font-semibold placeholder:text-slate-300 shadow-sm"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-primary transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center mt-2 mb-2 px-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-4 h-4 rounded border border-brand-primary/30 bg-white/50 group-hover:bg-white transition-colors shadow-sm">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="absolute opacity-0 cursor-pointer w-full h-full z-10" />
                      {rememberMe && <div className="w-2 h-2 bg-brand-primary rounded-[2px]" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 group-hover:text-[#0a2e5c] transition-colors">Lembrar meu e-mail</span>
                  </label>
                </div>

                {errorMessage && (
                  <div className="text-red-500 text-xs font-bold text-center mt-2 px-2 animate-pulse">
                    {errorMessage}
                  </div>
                )}

                <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold py-4 rounded-[16px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/30 group active:scale-[0.98] mt-6 uppercase tracking-widest text-xs border border-emerald-400/50">
                  Entrar <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </button>
                
                {/* BOTÃO DO GOOGLE */}
                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Ou</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button 
                  type="button" 
                  onClick={handleGoogleLogin}
                  className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-slate-600 font-bold py-3.5 rounded-[16px] flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.98] tracking-wide text-sm mt-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Entrar com Google
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-200/50 flex justify-center">
                 <Link to="/forgot-password" className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed hover:text-brand-primary transition-colors block">
                   Esqueceu a senha? <br /> Clique aqui para recuperar
                 </Link>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-custom { 0%, 100% { transform: scale(1); opacity: 0.35; } 50% { transform: scale(1.08); opacity: 0.5; } }
        @keyframes bounce-custom { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
        .animate-pulse-custom { animation: pulse-custom infinite ease-in-out; }
        .animate-bounce-custom { animation: bounce-custom infinite ease-in-out; }
      `}</style>
    </div>
  );
}