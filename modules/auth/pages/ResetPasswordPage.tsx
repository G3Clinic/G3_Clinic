import React from 'react';
import { Lock, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AuthLayout } from '../layouts/AuthLayout';

export function ResetPasswordPage() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/login');
  };

  return (
    <AuthLayout 
      title="Redefinir Senha" 
      subtitle="Crie uma nova credencial segura para retomar o acesso."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <Input 
          label="Código de Segurança" 
          type="text" 
          icon={KeyRound}
        />

        <div className="space-y-4">
            <Input 
              label="Nova Senha" 
              type="password" 
              icon={Lock}
            />

            <Input 
              label="Confirmar Nova Senha" 
              type="password" 
              icon={Lock}
            />
        </div>

        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-start gap-3 mt-6">
          <CheckCircle2 className="w-5 h-5 text-brand-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-brand-primary mb-1">Dica de Segurança</p>
            <p className="text-emerald-700/80 leading-relaxed">
              Use uma combinação de letras maiúsculas, minúsculas, números e símbolos para uma senha forte.
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full py-4 text-base group mt-4">
          Redefinir e Acessar
          <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </form>
    </AuthLayout>
  );
}