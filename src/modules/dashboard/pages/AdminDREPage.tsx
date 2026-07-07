import { useState } from 'react';
import { PieChart, Plus, Edit2, Trash2, Save, DollarSign, TestTubes } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';

const TABS = ['custos','lab'] as const;

const MOCK_CUSTOS : any[] = []; // TODO (Backend): Substituir pela chamada da API

const MOCK_LAB : any[] = []; // TODO (Backend): Substituir pela chamada da API

export function AdminDREPage() {
  const [tab, setTab] = useState<'custos' | 'lab'>('custos');
  const [modal, setModal] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader icon={PieChart} title="Custos & Laboratório" subtitle="Gerencie os custos fixos/variáveis e exames de laboratório parceiros">
        <Btn icon={Plus} onClick={() => setModal(true)}>Novo Custo/Exame</Btn>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('custos')} className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'custos' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <DollarSign size={16} /> Custos Operacionais
        </button>
        <button onClick={() => setTab('lab')} className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'lab' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <TestTubes size={16} /> Tabela de Laboratório
        </button>
      </div>

      {tab === 'custos' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Descrição','Categoria','Valor (R$)','Frequência','Status','Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_CUSTOS.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.descricao}</td>
                    <td className="px-4 py-3"><Badge color={c.categoria === 'Fixo' ? 'blue' : 'yellow'}>{c.categoria}</Badge></td>
                    <td className="px-4 py-3 font-mono text-slate-600">R$ {c.valor.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.frequencia}</td>
                    <td className="px-4 py-3"><Badge color="green">{c.status}</Badge></td>
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
      )}

      {tab === 'lab' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Exame','Laboratório','Custo (R$)','Prazo','Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_LAB.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.exame}</td>
                    <td className="px-4 py-3 text-slate-500">{l.laboratorio}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">R$ {l.custo.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{l.prazo}</td>
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
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={`Novo ${tab === 'custos' ? 'Custo' : 'Exame de Laboratório'}`}>
        <div className="space-y-4">
          {tab === 'custos' ? (
            <>
              <InputField label="Descrição" required placeholder="Ex: Aluguel" />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Categoria"><option>Fixo</option><option>Variável</option></SelectField>
                <SelectField label="Frequência"><option>Mensal</option><option>Anual</option><option>Avulso</option></SelectField>
              </div>
              <InputField label="Valor (R$)" type="number" step="0.01" placeholder="0.00" />
            </>
          ) : (
            <>
              <InputField label="Nome do Exame" required placeholder="Ex: Hemograma Completo" />
              <InputField label="Laboratório" placeholder="Ex: Lab Central" />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Custo (R$)" type="number" step="0.01" placeholder="0.00" />
                <InputField label="Prazo de Resultado" placeholder="Ex: 2 dias" />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  );
}
