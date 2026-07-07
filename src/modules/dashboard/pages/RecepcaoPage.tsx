import React, { useState } from 'react';
import { Stethoscope, UserPlus, Clock, CheckCircle2, UserX, UserCheck, DollarSign } from 'lucide-react';
import { PageHeader, Card, StatsCard, Badge, Modal, InputField, SelectField, Btn } from '../../../components/ui/shared';

export function RecepcaoPage() {
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader icon={Stethoscope} title="Recepção e Fila de Espera" subtitle="Controle do fluxo de pacientes do dia" />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={Clock} label="Agendados" value="12" color="blue" />
        <StatsCard icon={UserCheck} label="Na Recepção" value="3" color="yellow" />
        <StatsCard icon={Stethoscope} label="Em Atendimento" value="2" color="green" />
        <StatsCard icon={UserX} label="Faltas / Cancelados" value="1" color="red" />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="font-bold text-slate-800">Fila de Hoje</h3>
          <div className="flex items-center gap-3">
            <input 
              type="date" 
              value={dataFiltro}
              onChange={e => setDataFiltro(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-primary" 
            />
            <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-primary">
              <option>Todos os profissionais</option>
              <option>Dr. João (Clínico Geral)</option>
              <option>Dra. Maria (Odonto)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Hora','Paciente','Profissional / Procedimento','Convênio','Status','Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              
              {/* Paciente 1 - Agendado */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-4 font-bold text-slate-700">10:00</td>
                <td className="px-4 py-4">
                  <p className="font-bold text-slate-800">Carlos Eduardo Silva</p>
                  <p className="text-xs text-slate-500">11 99999-8888</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-700">Dr. João</p>
                  <p className="text-xs text-slate-500">Consulta Inicial</p>
                </td>
                <td className="px-4 py-4"><Badge color="blue">Unimed</Badge></td>
                <td className="px-4 py-4"><Badge color="gray">Agendado</Badge></td>
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    <button title="Marcar Presença" className="p-1.5 text-amber-500 hover:bg-amber-50 rounded transition-colors"><UserCheck size={18}/></button>
                    <button title="Registrar Pagamento" onClick={() => setPagamentoModalOpen(true)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"><DollarSign size={18}/></button>
                    <button title="Cancelar/Falta" className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"><UserX size={18}/></button>
                  </div>
                </td>
              </tr>

              {/* Paciente 2 - Na Recepção */}
              <tr className="hover:bg-gray-50 bg-amber-50/30">
                <td className="px-4 py-4 font-bold text-slate-700">10:30</td>
                <td className="px-4 py-4">
                  <p className="font-bold text-slate-800">Ana Beatriz Costa</p>
                  <p className="text-xs text-slate-500">Chegou às 10:15</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-700">Dra. Maria</p>
                  <p className="text-xs text-slate-500">Restauração</p>
                </td>
                <td className="px-4 py-4"><Badge color="gray">Particular</Badge></td>
                <td className="px-4 py-4"><Badge color="yellow">Aguardando na Recepção</Badge></td>
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    <button title="Iniciar Atendimento" className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"><Stethoscope size={18}/></button>
                    <button title="Registrar Pagamento" onClick={() => setPagamentoModalOpen(true)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"><DollarSign size={18}/></button>
                  </div>
                </td>
              </tr>

              {/* Paciente 3 - Em atendimento */}
              <tr className="hover:bg-gray-50 bg-brand-light/30 border-l-2 border-l-brand-primary">
                <td className="px-4 py-4 font-bold text-brand-primary">09:30</td>
                <td className="px-4 py-4">
                  <p className="font-bold text-slate-800">Roberto Alves</p>
                  <p className="text-xs text-slate-500">Atend. desde 09:40</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-700">Dr. Pedro</p>
                  <p className="text-xs text-slate-500">Limpeza</p>
                </td>
                <td className="px-4 py-4"><Badge color="blue">Bradesco Saúde</Badge></td>
                <td className="px-4 py-4"><Badge color="green">Em Atendimento</Badge></td>
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    <button title="Finalizar" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"><CheckCircle2 size={18}/></button>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={pagamentoModalOpen} onClose={() => setPagamentoModalOpen(false)} title="Registrar Pagamento">
        <div className="space-y-4">
          <InputField label="Paciente" value="Carlos Eduardo Silva" disabled />
          <InputField label="Valor a Pagar (R$)" type="number" placeholder="0.00" required />
          <SelectField label="Forma de Pagamento" required>
            <option>Dinheiro</option>
            <option>PIX</option>
            <option>Cartão de Crédito</option>
            <option>Cartão de Débito</option>
          </SelectField>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setPagamentoModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={() => setPagamentoModalOpen(false)} className="bg-emerald-500 hover:bg-emerald-600 border-none text-white" icon={CheckCircle2}>Confirmar Pagamento</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
