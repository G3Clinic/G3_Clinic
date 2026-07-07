import { useState } from 'react';
import { DoorOpen, Plus, Edit2, Trash2, Info, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';

const MOCK_SALAS : any[] = []; // TODO (Backend): Substituir pela chamada da API

export function AdminSalasPage() {
  const [modal, setModal] = useState(false);
  return (
    <div className="space-y-5">
      <PageHeader icon={DoorOpen} title="Cadastro de Salas" subtitle="As salas cadastradas ficam disponíveis automaticamente na Agenda">
        <Btn icon={Plus} onClick={() => setModal(true)}>Nova Sala</Btn>
      </PageHeader>
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700 flex gap-2 items-start">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          As salas cadastradas aqui ficam disponíveis automaticamente na <strong>Agenda</strong> para agendamento de pacientes com profissional e sala específicos.
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_SALAS.map(s => (
          <Card key={s.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-brand-primary">
                  <DoorOpen size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{s.nome}</h4>
                  <p className="text-xs text-slate-500">{s.tipo} · Cap. {s.capacidade}</p>
                </div>
              </div>
              <Badge color={s.status === 'Disponível' ? 'green' : 'yellow'}>{s.status}</Badge>
            </div>
            <div className="flex gap-2 mt-4">
              <Btn size="sm" variant="secondary" icon={Edit2} className="flex-1 justify-center">Editar</Btn>
              <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Nova Sala">
        <div className="space-y-4">
          <InputField label="Nome da Sala" required placeholder="Ex: Sala 05" />
          <SelectField label="Tipo de Sala" required>
            <option value="">Selecione</option>
            <option>Consultório</option>
            <option>Procedimento</option>
            <option>Odontológica</option>
            <option>Emergência</option>
          </SelectField>
          <InputField label="Capacidade (pacientes)" type="number" min={1} defaultValue="1" />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações</label>
            <textarea rows={2} placeholder="Informações adicionais sobre a sala..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save}>Salvar Sala</Btn>
        </div>
      </Modal>
    </div>
  );
}
