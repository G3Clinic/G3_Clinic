import React from 'react';
import { User, ArrowLeft, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AuthLayout } from '../layouts/AuthLayout';

export function ForgotPasswordPage() {
  return (
    <AuthLayout 
      title="Recuperar Senha" 
      subtitle="Informe seu e-mail para receber as instruções de recuperação."
    >
      <form className="space-y-6">
        <Input 
          label="E-mail Corporativo" 
          type="email" 
          placeholder="ex: doutor@hemocentro.gov.br" 
          icon={User}
        />

        <div className="pt-2 space-y-4">
          <Button className="w-full py-4 text-base group">
            Enviar Link de Recuperação
            <Send size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>

          <Link 
            to="/login" 
            className="flex items-center justify-center gap-2 text-sm font-medium text-ui-muted hover:text-brand-red transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar para o Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}