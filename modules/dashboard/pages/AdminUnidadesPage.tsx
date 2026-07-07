import { useState, useEffect } from 'react';
import { Building2, Edit2, Camera, Search, Save, Check } from 'lucide-react';
import { PageHeader, Card, Btn, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { formatCNPJ, formatPhone, formatCEP, fetchAddressByCEP } from '../../../utils/formatters';

const MOCK_UNIDADES : any[] = []; // TODO (Backend): Substituir pela chamada da API

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export function AdminUnidadesPage() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<typeof MOCK_UNIDADES[0] | null>(null);

  // Form State
  const [cnpj, setCnpj] = useState('');
  const [tel, setTel] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const openEdit = (u: typeof MOCK_UNIDADES[0] | null) => { 
    setSelected(u); 
    if (u) {
      setCnpj(u.cnpj);
      setTel(u.tel);
      setCep(u.cep || '');
      setRua(u.rua || '');
      setBairro(u.bairro || '');
      setCidade(u.cidade || '');
      setUf(u.uf || '');
    } else {
      setCnpj(''); setTel(''); setCep(''); setRua(''); setBairro(''); setCidade(''); setUf('');
    }
    setModal(true); 
  };

  const handleCepLookup = async () => {
    if (cep.replace(/\D/g, '').length === 8) {
      setIsFetchingCep(true);
      const data = await fetchAddressByCEP(cep);
      setIsFetchingCep(false);
      if (data) {
        setRua(data.logradouro);
        setBairro(data.bairro);
        setCidade(data.localidade);
        setUf(data.uf);
      }
    }
  };

  useEffect(() => {
    if (cep.replace(/\D/g, '').length === 8) {
      handleCepLookup();
    }
  }, [cep]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader icon={Building2} title="Cadastro de Unidades" subtitle="Dados cadastrais, endereço e logo de cada unidade da clínica" />
        <Btn onClick={() => openEdit(null)}>Nova Unidade</Btn>
      </div>

      <div className="max-w-3xl space-y-4">
        {MOCK_UNIDADES.map(u => (
          <Card key={u.id} className="flex items-center gap-4 hover:border-brand-primary/50 transition-colors">
            <div className="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center text-brand-primary shrink-0">
              <Building2 size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800">{u.nome}</h4>
              <p className="text-xs text-slate-500 mt-1">CNPJ: {u.cnpj} · Tel: {u.tel} · {u.cidade}/{u.uf}</p>
            </div>
            <Btn variant="primary" icon={Edit2} onClick={() => openEdit(u)} className="shadow-sm">Editar</Btn>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={selected ? `Editar: ${selected.nome}` : 'Nova Unidade'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo da Unidade</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400"><Building2 size={24} /></div>
              <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-50 transition-colors">
                <Camera size={14} /> Escolher imagem
                <input type="file" className="hidden" accept="image/*" />
              </label>
            </div>
          </div>
          <div className="font-bold text-xs text-brand-primary uppercase tracking-widest border-b border-gray-100 pb-1 pt-2">Dados Cadastrais</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><InputField label="Nome Fantasia" required placeholder="Nome da unidade" defaultValue={selected?.nome} /></div>
            <div className="col-span-2"><InputField label="Razão Social" placeholder="Razão social completa" /></div>
            <InputField label="CNPJ" placeholder="00.000.000/0001-00" value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))} maxLength={18} />
            <InputField label="Telefone" placeholder="(00) 00000-0000" value={tel} onChange={(e) => setTel(formatPhone(e.target.value))} maxLength={15} />
          </div>
          
          <div className="font-bold text-xs text-brand-primary uppercase tracking-widest border-b border-gray-100 pb-1 pt-2">Endereço</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex gap-2 col-span-2 relative">
              <InputField label="CEP" placeholder="00000-000" value={cep} onChange={(e) => setCep(formatCEP(e.target.value))} maxLength={9} />
              {isFetchingCep && <div className="absolute right-12 top-8 text-xs text-slate-400">Buscando...</div>}
              <div className="flex items-end pb-0.5"><Btn size="sm" variant="secondary" icon={Search} onClick={handleCepLookup}>Buscar</Btn></div>
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-2">
              <div className="col-span-2"><InputField label="Rua / Logradouro" placeholder="Nome da rua" value={rua} onChange={e => setRua(e.target.value)} /></div>
              <InputField label="Número" placeholder="Nº" defaultValue={selected?.num} />
            </div>
            <InputField label="Complemento" placeholder="Sala, Bloco..." />
            <InputField label="Bairro" placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} />
            <div className="col-span-2 grid grid-cols-4 gap-2">
              <div className="col-span-3"><InputField label="Cidade" placeholder="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} /></div>
              <SelectField label="UF" value={uf} onChange={e => setUf(e.target.value)}>
                <option value="">Selecione</option>
                {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
              </SelectField>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Check}>Salvar Unidade</Btn>
        </div>
      </Modal>
    </div>
  );
}
