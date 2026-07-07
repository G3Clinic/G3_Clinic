import React, { useState } from 'react';
import { DollarSign, Lock, Calendar, Plus, TrendingUp, Download, X } from 'lucide-react';
import { PageHeader, Card, Btn, InputField } from '../../../components/ui/shared';

export function FinDashboardPage() {
  const [mes, setMes] = useState('2026-05');

  return (
    <div className="space-y-6">
      <PageHeader icon={DollarSign} title="Dashboard Financeiro" subtitle="Gestão de cardápio de serviços e lançamentos mensais">
         <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-200">
           <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><Calendar size={16}/> Período de Análise:</span>
           <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="border-none bg-transparent font-bold text-brand-primary focus:outline-none focus:ring-0" />
           <Btn size="sm">Salvar Mês</Btn>
         </div>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Coluna Esquerda: GLOBAL FIXO */}
        <div className="flex flex-col h-[calc(100vh-160px)]">
          <Card className="flex-1 flex flex-col h-full border-t-4 border-t-slate-700">
             <div className="mb-4">
               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-slate-800 text-white uppercase tracking-widest"><Lock size={12}/> Global — Fixo</span>
               <h3 className="text-lg font-bold text-slate-800 mt-2">1. Cadastro de Serviços e Repasses</h3>
               <p className="text-xs text-slate-500 mt-0.5">Cardápio de procedimentos desta unidade. Salva globalmente (não muda por mês).</p>
             </div>

             <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-end mb-4 shrink-0">
               <div className="flex-1 w-full"><InputField label="Nome do Procedimento" placeholder="ex: Consulta Clínica" /></div>
               <div className="w-full sm:w-28"><InputField label="Valor (R$)" type="number" placeholder="190" /></div>
               <div className="w-full sm:w-28"><InputField label="% Profissional" type="number" placeholder="40" /></div>
               <Btn icon={Plus} className="w-full sm:w-auto">Adicionar</Btn>
             </div>

             <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl">
               <table className="w-full text-sm">
                 <thead className="bg-gray-50 sticky top-0">
                   <tr>
                     <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Procedimento</th>
                     <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Valor (R$)</th>
                     <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">% Prof.</th>
                     <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Val. Clínica</th>
                     <th></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   <tr className="hover:bg-gray-50">
                     <td className="px-4 py-3 font-semibold text-slate-700">Consulta Inicial</td>
                     <td className="px-4 py-3 text-center text-slate-600">R$ 150,00</td>
                     <td className="px-4 py-3 text-center text-slate-600">40%</td>
                     <td className="px-4 py-3 text-center font-bold text-emerald-600">R$ 90,00</td>
                     <td className="px-4 py-3 text-center"><button className="text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button></td>
                   </tr>
                   <tr className="hover:bg-gray-50">
                     <td className="px-4 py-3 font-semibold text-slate-700">Limpeza (Profilaxia)</td>
                     <td className="px-4 py-3 text-center text-slate-600">R$ 200,00</td>
                     <td className="px-4 py-3 text-center text-slate-600">50%</td>
                     <td className="px-4 py-3 text-center font-bold text-emerald-600">R$ 100,00</td>
                     <td className="px-4 py-3 text-center"><button className="text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button></td>
                   </tr>
                   <tr className="hover:bg-gray-50">
                     <td className="px-4 py-3 font-semibold text-slate-700">Extração Simples</td>
                     <td className="px-4 py-3 text-center text-slate-600">R$ 300,00</td>
                     <td className="px-4 py-3 text-center text-slate-600">45%</td>
                     <td className="px-4 py-3 text-center font-bold text-emerald-600">R$ 165,00</td>
                     <td className="px-4 py-3 text-center"><button className="text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button></td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </Card>
        </div>

        {/* Coluna Direita: MENSAL */}
        <div className="flex flex-col h-[calc(100vh-160px)]">
          <Card className="flex-1 flex flex-col h-full border-t-4 border-t-brand-primary">
            <div className="mb-4">
               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-brand-light text-brand-dark uppercase tracking-widest"><Calendar size={12}/> Mensal</span>
               <h3 className="text-lg font-bold text-slate-800 mt-2 flex justify-between items-center">
                 2. Lançamentos do Mês
                 <Btn variant="ghost" size="sm" icon={Download} className="text-brand-primary">Sincronizar Lançamentos</Btn>
               </h3>
               <p className="text-xs text-slate-500 mt-0.5">Informe a quantidade realizada de cada serviço no mês. Totais calculados automaticamente.</p>
             </div>

             <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {/* Lançamento Item */}
                <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:border-brand-primary/30 hover:bg-brand-light/10 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">Consulta Inicial</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">R$ 150,00 • Repasse 40%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Qtd:</span>
                    <input type="number" defaultValue="25" className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold text-brand-primary focus:outline-none focus:border-brand-primary bg-gray-50" />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:border-brand-primary/30 hover:bg-brand-light/10 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">Limpeza (Profilaxia)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">R$ 200,00 • Repasse 50%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Qtd:</span>
                    <input type="number" defaultValue="14" className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold text-brand-primary focus:outline-none focus:border-brand-primary bg-gray-50" />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:border-brand-primary/30 hover:bg-brand-light/10 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">Extração Simples</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">R$ 300,00 • Repasse 45%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Qtd:</span>
                    <input type="number" defaultValue="5" className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold text-brand-primary focus:outline-none focus:border-brand-primary bg-gray-50" />
                  </div>
                </div>
             </div>

             <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 shrink-0 bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5"><DollarSign size={16} /> Faturamento Bruto Total</span>
                  <span className="font-bold text-slate-800">R$ 8.050,00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">↳ Repassado aos Profissionais</span>
                  <span className="font-bold text-red-500">- R$ 3.575,00</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200/50 mt-2">
                  <span className="text-base font-black text-slate-800 flex items-center gap-1.5"><TrendingUp size={18} className="text-emerald-500"/> Total Retido p/ Clínica</span>
                  <span className="text-xl font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">R$ 4.475,00</span>
                </div>
             </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
