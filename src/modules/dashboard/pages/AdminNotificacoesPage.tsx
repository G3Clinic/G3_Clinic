import React, { useState } from 'react';
import { Bell, Send, Check } from 'lucide-react';
import { PageHeader, Card, Btn, InputField, SelectField } from '../../../components/ui/shared';
import { notificacoesApi } from '../../../services/api';

export function AdminNotificacoesPage() {
  const [enviado, setEnviado] = useState(false);
  const [publico, setPublico] = useState('todos');
  const [tipo, setTipo] = useState('info');
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) return;
    try {
      await notificacoesApi.criar({ publico_alvo: publico, tipo, titulo: titulo.trim(), mensagem: mensagem.trim() });
      setEnviado(true);
      setTitulo(''); setMensagem('');
      setTimeout(() => setEnviado(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar notificação.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Bell} title="Disparar Notificações" subtitle="Envie avisos, atualizações ou alertas para os usuários da clínica" />

      <div className="max-w-2xl">
        <Card title="Nova Notificação">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="Público Alvo *" required value={publico} onChange={e => setPublico(e.target.value)}>
                <option value="todos">Todos os Usuários</option>
                <option value="medicos">Apenas Médicos</option>
                <option value="recepcao">Apenas Recepção</option>
                <option value="admin">Apenas Administradores</option>
              </SelectField>

              <SelectField label="Tipo de Notificação *" required value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="info">Informativo (Azul)</option>
                <option value="success">Sucesso (Verde)</option>
                <option value="warning">Aviso / Importante (Amarelo)</option>
                <option value="error">Alerta Crítico (Vermelho)</option>
              </SelectField>
            </div>

            <InputField label="Título da Notificação *" required placeholder="Ex: Atualização no sistema" value={titulo} onChange={e => setTitulo(e.target.value)} />

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mensagem *</label>
              <textarea
                value={mensagem} onChange={e => setMensagem(e.target.value)}
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
