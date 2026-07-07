import React, { useState } from 'react';
import { CreditCard, TrendingUp, TrendingDown, Plus, CheckCircle2 } from 'lucide-react';
import { PageHeader, Card, StatsCard, Btn, Modal, InputField, SelectField } from '../../../components/ui/shared';

export function RecebimentosPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader icon={CreditCard} title="Recebimentos" subtitle="Controle de recebimentos e contas a receber">
        <Btn icon={Plus} onClick={() => setModalOpen(true)}>Novo Recebimento</Btn>
      </PageHeader>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatsCard icon={TrendingUp} label="Recebidos Hoje" value="—" color="green" />
        <StatsCard icon={CreditCard} label="A Receber" value="—" color="yellow" />
        <StatsCard icon={TrendingDown} label="Em Atraso" value="—" color="red" />
      </div>
      
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700 text-sm">Lista de Recebimentos</h3>
          <div className="flex gap-2">
            <select className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs"><option>Todos os status</option><option>Pago</option><option>Pendente</option><option>Em atraso</option></select>
            <select className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs"><option>Todos os convênios</option><option>Particular</option><option>Unimed</option></select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Paciente','Convênio','Serviço','Valor','Vencimento','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <CreditCard size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm">Nenhum recebimento encontrado para o período selecionado</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Recebimento">
        <div className="space-y-4">
          <InputField label="Paciente" placeholder="Nome do paciente" required />
          <InputField label="Descrição do Serviço" placeholder="Ex: Restauração, Consulta" required />
          
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Valor (R$)" type="number" placeholder="0.00" required />
            <SelectField label="Convênio" required>
              <option>Particular</option>
              <option>Unimed</option>
              <option>Bradesco Saúde</option>
            </SelectField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="Data de Vencimento" type="date" required />
            <SelectField label="Status de Pagamento" required>
              <option value="PENDENTE">Pendente</option>
              <option value="RECEBIDO">Recebido / Pago</option>
              <option value="ESTORNADO">Estornado</option>
            </SelectField>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={() => setModalOpen(false)} className="bg-emerald-500 hover:bg-emerald-600 border-none text-white" icon={CheckCircle2}>Salvar Recebimento</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
