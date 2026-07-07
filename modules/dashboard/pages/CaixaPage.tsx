import React, { useState } from 'react';
import { Landmark, ArrowUpCircle, ArrowDownCircle, Lock, DollarSign, Wallet } from 'lucide-react';
import { PageHeader, Card, Btn, StatsCard, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';

export function CaixaPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState<'entrada' | 'saida'>('entrada');

  const abrirModal = (tipo: 'entrada' | 'saida') => {
    setTipoLancamento(tipo);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Landmark} title="Caixa do Dia" subtitle="Controle de fluxo de caixa, pagamentos e recebimentos diários">
        <div className="flex gap-2">
           <Btn variant="secondary" icon={ArrowDownCircle} onClick={() => abrirModal('saida')} className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200">Nova Saída</Btn>
           <Btn icon={ArrowUpCircle} onClick={() => abrirModal('entrada')} className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-emerald-500/20 shadow-sm">Nova Entrada</Btn>
           <Btn variant="danger" icon={Lock} className="ml-2">Fechar Caixa</Btn>
        </div>
      </PageHeader>

      {/* Resumo do Caixa */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={DollarSign} label="Saldo Inicial" value="R$ 150,00" color="blue" />
        <StatsCard icon={ArrowUpCircle} label="Entradas (Dinheiro)" value="R$ 450,00" color="green" />
        <StatsCard icon={ArrowUpCircle} label="Entradas (Cartão/PIX)" value="R$ 1.250,00" color="green" />
        <StatsCard icon={ArrowDownCircle} label="Saídas / Despesas" value="R$ 120,00" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel Esquerdo - Movimentações */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Wallet size={18} className="text-brand-primary" />
              Lançamentos do Dia
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Descrição / Paciente</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Forma PGTO</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">08:00</td>
                    <td className="px-4 py-3 font-medium text-slate-700">Abertura de Caixa</td>
                    <td className="px-4 py-3"><Badge>Dinheiro</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">R$ 150,00</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">09:15</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">Consulta Inicial</p>
                      <p className="text-xs text-slate-500">Ana Beatriz Costa</p>
                    </td>
                    <td className="px-4 py-3"><Badge color="green">PIX</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">+ R$ 150,00</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">10:30</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">Restauração Resina</p>
                      <p className="text-xs text-slate-500">Carlos Eduardo Silva</p>
                    </td>
                    <td className="px-4 py-3"><Badge color="blue">Cartão de Crédito</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">+ R$ 250,00</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">11:00</td>
                    <td className="px-4 py-3 font-medium text-slate-700">Compra de Material Limpeza (Padaria)</td>
                    <td className="px-4 py-3"><Badge>Dinheiro</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">- R$ 45,00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Painel Direito - Totalizador */}
        <div className="lg:col-span-1">
           <Card className="h-full bg-brand-light/30 border-brand-primary/20">
             <h3 className="font-bold text-slate-800 mb-6 text-center">Resumo Fechamento</h3>
             
             <div className="space-y-4">
               <div className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                 <span className="text-slate-600 font-medium">Dinheiro na gaveta</span>
                 <span className="font-bold text-slate-800">R$ 555,00</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                 <span className="text-slate-600 font-medium">PIX</span>
                 <span className="font-bold text-slate-800">R$ 800,00</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                 <span className="text-slate-600 font-medium">Cartão de Crédito</span>
                 <span className="font-bold text-slate-800">R$ 250,00</span>
               </div>
               <div className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                 <span className="text-slate-600 font-medium">Cartão de Débito</span>
                 <span className="font-bold text-slate-800">R$ 200,00</span>
               </div>
             </div>

             <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total do Dia</p>
                <p className="text-center text-4xl font-black text-brand-primary">R$ 1.805,00</p>
             </div>
           </Card>
        </div>

      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={tipoLancamento === 'entrada' ? 'Nova Entrada (Recebimento)' : 'Nova Saída (Despesa)'}>
        <div className="space-y-4">
          <InputField label="Descrição do Lançamento" required placeholder="Ex: Pagamento de consulta, Compra de materiais..." />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Valor (R$)" type="number" required placeholder="0.00" />
            <SelectField label="Forma de Pagamento" required>
              <option>Dinheiro</option>
              <option>PIX</option>
              <option>Cartão de Crédito</option>
              <option>Cartão de Débito</option>
              {tipoLancamento === 'saida' && <option>Boleto / Transferência</option>}
            </SelectField>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn className={tipoLancamento === 'saida' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white border-none'} onClick={() => setModalOpen(false)}>
              {tipoLancamento === 'entrada' ? 'Gravar Entrada' : 'Gravar Saída'}
            </Btn>
          </div>
        </div>
      </Modal>

    </div>
  );
}
