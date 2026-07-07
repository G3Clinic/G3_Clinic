import { useState } from 'react';
import { Users, Plus, Edit2, Trash2, Save, KeyRound, Check, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';

const MOCK_USERS : any[] = []; // TODO (Backend): Substituir pela chamada da API

export function AdminCadastroPage() {
  const [modal, setModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [novoPapel, setNovoPapel] = useState('');
  const [editPapel, setEditPapel] = useState('3');

  const MODULOS = ['Painel', 'Pacientes', 'Agenda', 'Recepção', 'Prontuário', 'Caixa do Dia', 'Financeiro', 'Auditoria', 'Estoque', 'Relatórios'];

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Cadastro de Usuários" subtitle="Crie e gerencie todos os usuários que acessam o sistema">
        <Btn icon={Plus} onClick={() => setModal(true)}>+ Novo Usuário</Btn>
      </PageHeader>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Usuário','E-mail','Perfil','CRM/Registro','Status','Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_USERS.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center text-brand-primary font-bold text-xs">
                        {u.nome.split(' ').map(n => n[0]).slice(0,2).join('')}
                      </div>
                      <span className="font-medium text-slate-800">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3"><Badge color={u.perfil === 'Administrador' ? 'red' : u.perfil === 'Profissional de Saúde' ? 'blue' : 'purple'}>{u.perfil}</Badge></td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{u.crm}</td>
                  <td className="px-4 py-3"><Badge color="green">{u.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedUser(u); setEditPapel(u.perfil === 'Profissional de Saúde' ? '2' : u.perfil === 'Administrador' ? '1' : '3'); setEditModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg" title="Editar Usuário"><Edit2 size={14}/></button>
                      <button onClick={() => { setSelectedUser(u); setPasswordModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg" title="Trocar Senha"><KeyRound size={14}/></button>
                      <button onClick={() => { setSelectedUser(u); setDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Excluir Usuário"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Novo Usuário">
        <div className="space-y-4">
          <InputField label="Nome Completo" required placeholder="Nome do usuário" />
          <InputField label="E-mail" required type="email" placeholder="email@clinica.com" />
          <SelectField label="Perfil de Acesso" required value={novoPapel} onChange={(e) => setNovoPapel(e.target.value)}>
            <option value="">Selecione</option>
            <option value="1">Administrador</option>
            <option value="2">Profissional de Saúde</option>
            <option value="3">Recepcionista</option>
            <option value="4">Faturamento</option>
          </SelectField>

          {novoPapel === '2' && (
            <div className="space-y-4 border-t border-gray-100 pt-4 mt-4">
              <SelectField label="Conselho Profissional">
                <option>Especialidade (opcional)</option>
                <option>Médico(a)</option>
              </SelectField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField label="Conselho *" required>
                  <option>CRM</option>
                  <option>CRO</option>
                  <option>CRP</option>
                </SelectField>
                <InputField label="Número do Registro *" required placeholder="Ex: 123456" />
                <SelectField label="UF *" required>
                  <option>SP</option>
                  <option>RJ</option>
                  <option>MG</option>
                  <option>BA</option>
                </SelectField>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Ex: CRM 12345/SP — obrigatório para identificação do profissional habilitado.</p>

              <h4 className="font-bold text-slate-700 text-sm mt-4">Especialidade Médica (RQE)</h4>
              <SelectField label="Especialidade Médica (opcional)">
                <option>Selecione a especialidade médica...</option>
                <option>Cardiologia</option>
                <option>Pediatria</option>
                <option>Clínica Médica</option>
              </SelectField>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Número do RQE (opcional)" placeholder="Ex: 12345" />
                <SelectField label="UF">
                  <option>SP</option>
                  <option>RJ</option>
                  <option>BA</option>
                </SelectField>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">O RQE (Registro de Qualificação de Especialista) identifica a especialidade médica além da formação geral.</p>
            </div>
          )}

          <InputField label="Senha Temporária" type="password" required />
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="cancel" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save}>Salvar Usuário</Btn>
        </div>
      </Modal>
      {/* Editar Usuário Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Usuário" maxWidth="max-w-2xl">
        <div className="space-y-5">
          <InputField label="NOME COMPLETO *" defaultValue={selectedUser?.nome} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="CPF *" defaultValue="00000000000" />
            <InputField label="CELULAR" defaultValue="(00) 00000-0000" />
          </div>

          <InputField label="E-MAIL (OPCIONAL)" defaultValue={selectedUser?.email} />
          
          <SelectField label="PAPEL *" value={editPapel} onChange={(e) => setEditPapel(e.target.value)}>
            <option value="1">Administrador</option>
            <option value="2">Profissional de Saúde</option>
            <option value="3">Recepção</option>
          </SelectField>

          {editPapel === '2' && (
            <div className="space-y-4 border-t border-gray-100 pt-4 mt-4">
              <SelectField label="Conselho Profissional">
                <option>Especialidade (opcional)</option>
                <option>Médico(a)</option>
              </SelectField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField label="Conselho *" required>
                  <option>CRM</option>
                  <option>CRO</option>
                  <option>CRP</option>
                </SelectField>
                <InputField label="Número do Registro *" required placeholder="Ex: 123456" />
                <SelectField label="UF *" required>
                  <option>SP</option>
                  <option>RJ</option>
                  <option>MG</option>
                  <option>BA</option>
                </SelectField>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Ex: CRM 12345/SP — obrigatório para identificação do profissional habilitado.</p>

              <h4 className="font-bold text-slate-700 text-sm mt-4">Especialidade Médica (RQE)</h4>
              <SelectField label="Especialidade Médica (opcional)">
                <option>Selecione a especialidade médica...</option>
                <option>Cardiologia</option>
                <option>Pediatria</option>
                <option>Clínica Médica</option>
              </SelectField>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Número do RQE (opcional)" placeholder="Ex: 12345" />
                <SelectField label="UF">
                  <option>SP</option>
                  <option>RJ</option>
                  <option>BA</option>
                </SelectField>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">O RQE (Registro de Qualificação de Especialista) identifica a especialidade médica além da formação geral.</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">MÓDULOS LIBERADOS</label>
            <div className="grid grid-cols-2 gap-2">
              {MODULOS.map(m => (
                <label key={m} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-transparent hover:border-brand-primary/20 cursor-pointer transition-colors">
                  <div className="w-4 h-4 rounded bg-white border border-slate-300 flex items-center justify-center">
                    <Check size={12} className="text-brand-primary" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{m}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button onClick={() => setEditModalOpen(false)} className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-colors w-full md:w-auto justify-center">
            <Check size={18} />
            Salvar alterações
          </button>
        </div>
      </Modal>

      {/* Trocar Senha Modal */}
      <Modal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Nova Senha" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 mb-4">Defina uma nova senha de acesso para <strong>{selectedUser?.nome}</strong>.</p>
          <InputField label="Nova Senha" type="password" required />
          <InputField label="Confirmar Nova Senha" type="password" required />
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <Btn variant="cancel" onClick={() => setPasswordModalOpen(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={() => setPasswordModalOpen(false)}>Salvar Senha</Btn>
        </div>
      </Modal>

      {/* Excluir Usuário Modal */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Excluir Usuário" maxWidth="max-w-md">
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Você tem certeza?</h3>
          <p className="text-sm text-slate-500">
            Deseja realmente excluir o usuário <strong>{selectedUser?.nome}</strong>? Essa ação não poderá ser desfeita.
          </p>
        </div>
        <div className="mt-2 flex gap-3 w-full">
          <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-2.5 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">Excluir</button>
        </div>
      </Modal>

    </div>
  );
}
