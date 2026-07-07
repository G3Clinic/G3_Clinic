import { useState } from 'react';
import { DollarSign, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';

const MOCK_REPASSES : any[] = []; // TODO (Backend): Substituir pela chamada da API

export function AdminRepasseRecepPage() {
  const [modal, setModal] = useState(false);
  const [tipoRepasse, setTipoRepasse] = useState('Porcentagem');

  return (
    <div className="space-y-5">
      <PageHeader icon={DollarSign} title="Regras de Repasse" subtitle="Configure comissões para dentistas e recepcionistas">
        <Btn icon={Plus} onClick={() => setModal(true)}>Novo Repasse</Btn>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Pendente</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">—</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Pago (Mês)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">—</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recepcionistas Ativas</p>
          <p className="text-2xl font-bold text-brand-primary mt-1">3</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-700 text-sm">Lista de Repasses</h3>
          <select className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
            <option>Todos os meses</option>
            <option>Julho/2025</option>
            <option>Junho/2025</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Recepcionista','Tipo de Repasse','Valor','Referência','Status','Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_REPASSES.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-brand-light rounded-lg flex items-center justify-center text-brand-primary text-xs font-bold">
                        {r.profissional.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
                      </div>
                      <span className="font-medium text-slate-800">{r.profissional}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.tipo}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {r.tipo.includes('Percentual') ? `${r.valor}%` : r.valor}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.procedimento}</td>
                  <td className="px-4 py-3">
                    <Badge color={r.status === 'Pago' ? 'green' : 'yellow'}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.status === 'Pendente' && <button className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">✓ Marcar Pago</button>}
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

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Repasse">
        <div className="space-y-4">
          <SelectField label="Recepcionista" required>
            <option value="">Selecione</option>
            <option>Maria Silva</option>
            <option>João Souza</option>
            <option>Ana Lima</option>
          </SelectField>
          <SelectField label="Tipo de Repasse" required>
            <option>Percentual por Consulta</option>
            <option>Valor Fixo Mensal</option>
          </SelectField>
          <InputField label="Valor (% ou R$)" type="number" step="0.01" placeholder="Ex: 5 ou 800.00" />
          <InputField label="Referência (Mês/Ano)" placeholder="Ex: Julho/2025" />
          <SelectField label="Status">
            <option>Pendente</option>
            <option>Pago</option>
          </SelectField>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save}>Salvar Repasse</Btn>
        </div>
      </Modal>
    </div>
  );
}
