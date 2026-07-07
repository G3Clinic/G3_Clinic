import { useState } from 'react';
import { Stethoscope, Plus, Edit2, Trash2, Info, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';

const TABS = ['consulta','procedimento','exame'] as const;
type TabType = typeof TABS[number];

const MOCK_ATENDIMENTOS: any = { agendados: [], andamento: [], finalizados: [], cancelados: [] };

export function AdminAtendimentosPage() {
  const [tab, setTab] = useState<TabType>('consulta');
  const [modal, setModal] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader icon={Stethoscope} title="Cadastrar Atendimentos" subtitle="Os atendimentos cadastrados ficam disponíveis na Agenda">
        <Btn icon={Plus} onClick={() => setModal(true)}>Nova Consulta</Btn>
      </PageHeader>
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700 flex gap-2 items-start">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          Os atendimentos cadastrados aqui ficam disponíveis na <strong>Agenda</strong> para agendamento de pacientes.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === t ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'consulta' ? '🩺 Consultas' : t === 'procedimento' ? '💉 Procedimentos' : '🔬 Exames'}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nome','Duração (min)','Valor (R$)','Status','Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_ATENDIMENTOS[tab].map(a => (
                <tr key={a.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{a.duracao} min</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">R$ {a.valor.toFixed(2)}</td>
                  <td className="px-4 py-3"><Badge color="green">{a.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14}/></button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Atendimento">
        <div className="space-y-4">
          <SelectField label="Tipo" required>
            <option>Consulta</option>
            <option>Procedimento</option>
            <option>Exame</option>
          </SelectField>
          <InputField label="Nome do Atendimento" required placeholder="Ex: Consulta Clínica Geral" />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Duração (minutos)" type="number" min={5} placeholder="30" />
            <InputField label="Valor (R$)" type="number" step="0.01" placeholder="0.00" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  );
}
