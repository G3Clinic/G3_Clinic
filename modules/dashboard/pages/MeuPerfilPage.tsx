import React, { useState } from 'react';
import { User, Calendar, Camera, Trash2, Save, KeyRound, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Btn, InputField, SelectField, Modal } from '../../../components/ui/shared';

export function MeuPerfilPage() {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader icon={User} title="Meu Perfil" subtitle="Gerencie suas informações pessoais e credenciais" />

      {/* Foto de Perfil */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 bg-brand-light rounded-full flex items-center justify-center text-brand-primary text-3xl font-bold border-4 border-white shadow-md overflow-hidden">
              <span className="group-hover:opacity-0 transition-opacity">A</span>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={24} className="text-white" />
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Administrador</h3>
              <p className="text-sm text-slate-500 font-medium">Administrador</p>
            </div>
            <div className="flex gap-3">
              <Btn size="sm" variant="outline" icon={Camera}>Alterar foto</Btn>
              <Btn size="sm" variant="ghost" icon={Trash2} className="text-red-500 hover:bg-red-50 hover:text-red-600 border-0">Remover foto</Btn>
            </div>
          </div>
        </div>
      </Card>

      {/* Google Agenda */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800 mb-1">Google Agenda</h4>
            <p className="text-sm text-slate-500 mb-4">Conecte para que os agendamentos da clínica apareçam na sua Google Agenda.</p>
            <Btn variant="outline" className="border-gray-200 text-slate-700 hover:bg-gray-50 font-semibold gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Conectar com o Google
            </Btn>
          </div>
        </div>
      </Card>

      {/* Dados Pessoais */}
      <Card>
        <h4 className="font-bold text-slate-800 border-b border-gray-100 pb-3 mb-5">Dados pessoais</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField label="Nome completo" defaultValue="Administrador" required />
          <InputField label="Nome social" placeholder="Como prefere ser chamado" />
          <InputField label="Celular" defaultValue="(00) 00000-0000" />
          <InputField label="E-mail" defaultValue="admin@diligens.med" />
          <SelectField label="Sexo">
            <option>Masculino</option>
            <option>Feminino</option>
            <option>Outro</option>
            <option>Prefiro não informar</option>
          </SelectField>
          <InputField label="Data de nascimento" type="date" defaultValue="1985-05-20" />
        </div>
      </Card>

      {/* Dados Profissionais */}
      <Card>
        <div className="mb-5 border-b border-gray-100 pb-3">
          <h4 className="font-bold text-slate-800">Dados profissionais</h4>
          <p className="text-xs text-slate-500 mt-1">Necessários para emitir prescrições digitais (registro no conselho).</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SelectField label="Conselho">
            <option>CRM</option>
            <option>CRO</option>
            <option>CRP</option>
          </SelectField>
          <InputField label="Número" defaultValue="367025" />
          <SelectField label="UF">
            <option>BA</option>
            <option>SP</option>
            <option>RJ</option>
            <option>MG</option>
          </SelectField>
        </div>
      </Card>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <Btn variant="secondary" icon={KeyRound} onClick={() => setPasswordModalOpen(true)}>Alterar senha</Btn>
        <Btn icon={Save}>Salvar alterações</Btn>
      </div>

      {/* Modal Alterar Senha */}
      <Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Defina sua senha" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-start gap-3 text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>Por segurança, é necessário trocar a senha provisória antes de continuar.</p>
          </div>
          <InputField label="Senha atual (provisória)" type="password" required />
          <InputField label="Nova senha (mín. 8 caracteres)" type="password" required />
          <InputField label="Confirme a nova senha" type="password" required />
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
          <Btn variant="cancel" onClick={() => setPasswordModalOpen(false)}>Cancelar e sair</Btn>
          <Btn icon={Save} onClick={() => setPasswordModalOpen(false)}>Salvar e entrar</Btn>
        </div>
      </Modal>

    </div>
  );
}
