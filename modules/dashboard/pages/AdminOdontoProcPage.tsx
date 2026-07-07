import { useState } from 'react';
import { Smile, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Modal, InputField, SelectField } from '../../../components/ui/shared';

const MOCK_ESP : any[] = [];

export function AdminOdontoProcPage() {
  const [open, setOpen] = useState<number[]>([1]);
  const [modalEsp, setModalEsp] = useState(false);
  const [modalIntv, setModalIntv] = useState(false);

  const toggle = (id: number) => setOpen(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="space-y-5">
      <PageHeader icon={Smile} title="Especialidades Odontológicas" subtitle="Cadastre especialidades e suas intervenções disponíveis no odontograma">
        <Btn icon={Plus} onClick={() => setModalEsp(true)}>Nova Especialidade</Btn>
      </PageHeader>

      <div className="space-y-3">
        {MOCK_ESP.map(esp => (
          <Card key={esp.id} padding={false}>
            <button onClick={() => toggle(esp.id)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-2xl text-left">
              <div className="w-4 h-8 rounded-full" style={{ backgroundColor: esp.cor }} />
              <div className="flex-1">
                <h4 className="font-bold text-slate-800">{esp.nome}</h4>
                <p className="text-xs text-slate-400">{esp.intervencoes.length} intervenção(ões)</p>
              </div>
              <div className="flex gap-2">
                <button className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg" onClick={e => e.stopPropagation()}><Edit2 size={14}/></button>
                <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={e => e.stopPropagation()}><Trash2 size={14}/></button>
                {open.includes(esp.id) ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
              </div>
            </button>
            {open.includes(esp.id) && (
              <div className="px-4 pb-4">
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Intervenções</span>
                    <Btn size="sm" variant="secondary" icon={Plus} onClick={() => setModalIntv(true)}>Adicionar</Btn>
                  </div>
                  {esp.intervencoes.map(intv => (
                    <div key={intv} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-sm text-slate-700">{intv}</span>
                      <div className="flex gap-1">
                        <button className="p-1 text-slate-400 hover:text-brand-primary rounded-lg"><Edit2 size={12}/></button>
                        <button className="p-1 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={modalEsp} onClose={() => setModalEsp(false)} title="Nova Especialidade">
        <div className="space-y-4">
          <InputField label="Nome da Especialidade" required placeholder="Ex: Implantodontia" />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor de Identificação</label>
            <input type="color" defaultValue="#3B82F6" className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModalEsp(false)}>Cancelar</Btn>
          <Btn icon={Save}>Salvar Especialidade</Btn>
        </div>
      </Modal>

      <Modal open={modalIntv} onClose={() => setModalIntv(false)} title="Nova Intervenção/Procedimento">
        <div className="space-y-4">
          <InputField label="Nome da Intervenção/Procedimento" required placeholder="Ex: Restauração (Resina)" />
          <InputField label="Valor Padrão (R$)" type="number" step="0.01" required placeholder="0.00" />
          <SelectField label="Tipo Visual no Odontograma" required>
            <option value="nenhum">Apenas Lançamento (Ex: Consulta)</option>
            <option value="xis">Marcar com "X"</option>
            <option value="bolinha">Marcar com Bolinha</option>
            <option value="preenchimento">Preenchimento de Face (Ex: Restauração)</option>
          </SelectField>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModalIntv(false)}>Cancelar</Btn>
          <Btn icon={Save}>Salvar Intervenção</Btn>
        </div>
      </Modal>
    </div>
  );
}
