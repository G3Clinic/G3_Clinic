import { type ReactNode } from 'react';
import { HeartPulse } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

// Simple GlassCard component for the AuthLayout
function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`backdrop-blur-xl bg-white/40 border border-white/60 shadow-[0_40px_100px_rgba(15,23,42,0.12)] ${className}`}>
      {children}
    </div>
  );
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Elementos Decorativos de Fundo (Mesmo estilo do Login) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[65%] h-[65%] rounded-full bg-brand-primary/20 opacity-30 blur-[130px] animate-pulse-custom" style={{ animationDuration: '9s' }} />
        <div className="absolute -bottom-[15%] -right-[5%] w-[75%] h-[75%] rounded-full bg-blue-400 opacity-20 blur-[160px] animate-pulse-custom" style={{ animationDuration: '14s' }} />
        <div className="absolute top-[25%] left-[35%] w-[45%] h-[45%] rounded-full bg-white opacity-60 blur-[110px]" />
        <div className="absolute top-[10%] right-[15%] w-40 h-40 bg-emerald-200 rounded-full opacity-30 blur-[80px] animate-bounce-custom" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[20%] left-[10%] w-56 h-56 bg-brand-light rounded-full opacity-35 blur-[90px]" />
      </div>

      <div className="w-full max-w-md relative z-20">
        <GlassCard className="p-10 lg:p-12 rounded-[40px] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="bg-gradient-to-br from-emerald-400 to-brand-primary p-3 rounded-2xl shadow-xl shadow-brand-primary/20">
              <HeartPulse className="text-white" size={32} />
            </div>
            <span className="text-3xl font-black tracking-tighter text-[#0a2e5c]">Gontijo Clinic G3</span>
          </div>

          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-[#0a2e5c] mb-2">{title}</h1>
            <p className="text-slate-500 font-medium">{subtitle}</p>
          </div>

          {children}

        </GlassCard>

        {/* Footer */}
        <div className="mt-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest relative z-20">
          &copy; 2026 &bull; Gontijo Clinic G3
        </div>
      </div>
    </div>
  );
}