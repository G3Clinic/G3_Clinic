import React, { useState } from 'react';
import { Bell, Send, Check } from 'lucide-react';
import { PageHeader, Card, Btn, InputField, SelectField } from '../../../components/ui/shared';

export function AdminNotificacoesPage() {
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sending notification
    setEnviado(true);
    setTimeout(() => setEnviado(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Bell} title="Disparar Notificações" subtitle="Envie avisos, atualizações ou alertas para os usuários da clínica" />

      <div className="max-w-2xl">
        <Card title="Nova Notificação">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="Público Alvo *" required>
                <option value="todos">Todos os Usuários</option>
                <option value="medicos">Apenas Médicos</option>
                <option value="recepcao">Apenas Recepção</option>
                <option value="admin">Apenas Administradores</option>
              </SelectField>

              <SelectField label="Tipo de Notificação *" required>
                <option value="info">Informativo (Azul)</option>
                <option value="success">Sucesso (Verde)</option>
                <option value="warning">Aviso / Importante (Amarelo)</option>
                <option value="error">Alerta Crítico (Vermelho)</option>
              </SelectField>
            </div>

            <InputField label="Título da Notificação *" required placeholder="Ex: Atualização no sistema" />
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mensagem *</label>
              <textarea 
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none h-32"
                placeholder="Escreva a mensagem que aparecerá no sininho de notificações..."
                required
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Btn type="submit" icon={enviado ? Check : Send} className={enviado ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                {enviado ? 'Notificação Enviada!' : 'Disparar Notificação'}
              </Btn>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
