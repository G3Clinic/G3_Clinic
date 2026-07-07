import { useState } from 'react';
import { ShieldPlus, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';

const MOCK_CONV : any[] = []; // TODO (Backend): Substituir pela chamada da API

export function AdminConveniosPage() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<typeof MOCK_CONV[0] | null>(null);

  const openEdit = (c: typeof MOCK_CONV[0] | null) => {
    setSelected(c);
    setModal(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={ShieldPlus} title="Cadastro de Convênios" subtitle="Gerencie os planos de saúde aceitos e suas regras">
        <Btn icon={Plus} onClick={() => openEdit(null)}>Novo Convênio</Btn>
      </PageHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_CONV.map(c => (
          <Card key={c.id}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-brand-primary font-bold text-sm">
                  {c.nome.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{c.nome}</h4>
                  <p className="text-xs text-slate-400">Cód: {c.codigo}</p>
                </div>
              </div>
              <Badge color="green">{c.status}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span>Tipo: <strong className="text-slate-700">{c.tipo}</strong></span>
              <span>Repasse: <strong className="text-slate-700">{c.repasse}%</strong></span>
            </div>
            <div className="flex gap-2">
              <Btn size="sm" variant="secondary" icon={Edit2} className="flex-1 justify-center" onClick={() => openEdit(c)}>Editar</Btn>
              <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={selected ? `Editar: ${selected.nome}` : 'Novo Convênio'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo do Convênio</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400"><ShieldPlus size={24} /></div>
              <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-50 transition-colors">
                <Plus size={14} /> Enviar foto
                <input type="file" className="hidden" accept="image/*" />
              </label>
            </div>
          </div>
          <InputField label="Nome do Convênio *" required placeholder="Ex: Unimed" defaultValue={selected?.nome} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Código" placeholder="Ex: UNI001" defaultValue={selected?.codigo} />
            <SelectField label="Tipo *" required>
              <option value="">Selecione...</option>
              <option selected={selected?.tipo === 'Saúde'}>Saúde</option>
              <option selected={selected?.tipo === 'Odontologia'}>Odontologia</option>
              <option selected={selected?.tipo === 'Vida'}>Vida</option>
              <option selected={selected?.tipo === 'Particular'}>Particular</option>
              <option selected={selected?.tipo === 'DPVAT'}>DPVAT</option>
              <option selected={selected?.tipo === 'Outro'}>Outro</option>
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Registro ANS" placeholder="Opcional" />
            <InputField label="Percentual de Repasse (%)" type="number" min={0} max={100} placeholder="80" defaultValue={selected?.repasse} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações Internas</label>
            <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none" placeholder="Detalhes, contatos..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save}>Salvar Convênio</Btn>
        </div>
      </Modal>
    </div>
  );
}
