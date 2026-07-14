import { useState, useEffect, useCallback } from 'react';
import { Building2, Edit2, Camera, Search, Check } from 'lucide-react';
import { PageHeader, Card, Btn, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { formatCNPJ, formatPhone, formatCEP, fetchAddressByCEP } from '../../../utils/formatters';
import { unidadesApi, type APIUnidade } from '../../../services/api';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

type Form = {
  nome_fantasia: string; razao_social: string; cnpj: string; telefone: string;
  cep: string; rua: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string;
};
const FORM_VAZIO: Form = {
  nome_fantasia: '', razao_social: '', cnpj: '', telefone: '',
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
};

export function AdminUnidadesPage() {
  const [lista, setLista] = useState<APIUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const setCampo = (c: keyof Form, v: string) => setForm(prev => ({ ...prev, [c]: v }));

  const carregar = useCallback(() => {
    setLoading(true);
    unidadesApi.listar().then(setLista)
      .catch(e => console.error('Erro ao carregar unidades:', e))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setEditandoId(null); setForm(FORM_VAZIO); setErro(''); setModal(true); };
  const abrirEdicao = (u: APIUnidade) => {
    setEditandoId(u.id);
    setForm({
      nome_fantasia: u.nome_fantasia || '', razao_social: u.razao_social || '',
      cnpj: u.cnpj || '', telefone: u.telefone || '', cep: u.cep || '',
      rua: u.rua || '', numero: u.numero || '', complemento: u.complemento || '',
      bairro: u.bairro || '', cidade: u.cidade || '', uf: u.uf || '',
    });
    setErro(''); setModal(true);
  };

  const handleCepLookup = async () => {
    if (form.cep.replace(/\D/g, '').length !== 8) return;
    setIsFetchingCep(true);
    const data = await fetchAddressByCEP(form.cep);
    setIsFetchingCep(false);
    if (data) {
      setForm(prev => ({ ...prev, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf }));
    }
  };
  useEffect(() => {
    if (form.cep.replace(/\D/g, '').length === 8) handleCepLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cep]);

  const salvar = async () => {
    setErro('');
    if (!form.nome_fantasia.trim()) { setErro('Nome Fantasia é obrigatório.'); return; }
    setSalvando(true);
    try {
      const payload: Partial<APIUnidade> = {
        nome_fantasia: form.nome_fantasia.trim(),
        razao_social: form.razao_social.trim() || undefined,
        cnpj: form.cnpj.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        cep: form.cep.trim() || undefined,
        rua: form.rua.trim() || undefined,
        numero: form.numero.trim() || undefined,
        complemento: form.complemento.trim() || undefined,
        bairro: form.bairro.trim() || undefined,
        cidade: form.cidade.trim() || undefined,
        uf: form.uf || undefined,
      };
      if (editandoId) await unidadesApi.atualizar(editandoId, payload);
      else await unidadesApi.criar(payload);
      setModal(false); carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar unidade.');
    } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader icon={Building2} title="Cadastro de Unidades" subtitle="Dados cadastrais, endereço e logo de cada unidade da clínica" />
        <Btn onClick={abrirNovo}>Nova Unidade</Btn>
      </div>

      <div className="max-w-3xl space-y-4">
        {loading ? (
          <Card><p className="text-center py-6 text-slate-500">Carregando unidades...</p></Card>
        ) : lista.length === 0 ? (
          <Card><p className="text-center py-6 text-slate-500">Nenhuma unidade cadastrada.</p></Card>
        ) : lista.map(u => (
          <Card key={u.id} className="flex items-center gap-4 hover:border-brand-primary/50 transition-colors">
            <div className="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center text-brand-primary shrink-0">
              <Building2 size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800">{u.nome_fantasia || u.razao_social || `Unidade ${u.id}`}</h4>
              <p className="text-xs text-slate-500 mt-1">
                CNPJ: {u.cnpj || '—'} · Tel: {u.telefone || '—'}
                {(u.cidade || u.uf) ? ` · ${u.cidade || ''}${u.uf ? '/' + u.uf : ''}` : ''}
              </p>
            </div>
            <Btn variant="primary" icon={Edit2} onClick={() => abrirEdicao(u)} className="shadow-sm">Editar</Btn>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editandoId ? 'Editar Unidade' : 'Nova Unidade'} maxWidth="max-w-xl">
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
            <div className="col-span-2"><InputField label="Nome Fantasia" required placeholder="Nome da unidade" value={form.nome_fantasia} onChange={e => setCampo('nome_fantasia', e.target.value)} /></div>
            <div className="col-span-2"><InputField label="Razão Social" placeholder="Razão social completa" value={form.razao_social} onChange={e => setCampo('razao_social', e.target.value)} /></div>
            <InputField label="CNPJ" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => setCampo('cnpj', formatCNPJ(e.target.value))} maxLength={18} />
            <InputField label="Telefone" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setCampo('telefone', formatPhone(e.target.value))} maxLength={15} />
          </div>

          <div className="font-bold text-xs text-brand-primary uppercase tracking-widest border-b border-gray-100 pb-1 pt-2">Endereço</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex gap-2 col-span-2 relative">
              <InputField label="CEP" placeholder="00000-000" value={form.cep} onChange={e => setCampo('cep', formatCEP(e.target.value))} maxLength={9} />
              {isFetchingCep && <div className="absolute right-12 top-8 text-xs text-slate-400">Buscando...</div>}
              <div className="flex items-end pb-0.5"><Btn size="sm" variant="secondary" icon={Search} onClick={handleCepLookup}>Buscar</Btn></div>
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-2">
              <div className="col-span-2"><InputField label="Rua / Logradouro" placeholder="Nome da rua" value={form.rua} onChange={e => setCampo('rua', e.target.value)} /></div>
              <InputField label="Número" placeholder="Nº" value={form.numero} onChange={e => setCampo('numero', e.target.value)} />
            </div>
            <InputField label="Complemento" placeholder="Sala, Bloco..." value={form.complemento} onChange={e => setCampo('complemento', e.target.value)} />
            <InputField label="Bairro" placeholder="Bairro" value={form.bairro} onChange={e => setCampo('bairro', e.target.value)} />
            <div className="col-span-2 grid grid-cols-4 gap-2">
              <div className="col-span-3"><InputField label="Cidade" placeholder="Cidade" value={form.cidade} onChange={e => setCampo('cidade', e.target.value)} /></div>
              <SelectField label="UF" value={form.uf} onChange={e => setCampo('uf', e.target.value)}>
                <option value="">Selecione</option>
                {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
              </SelectField>
            </div>
          </div>
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Check} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Unidade'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
