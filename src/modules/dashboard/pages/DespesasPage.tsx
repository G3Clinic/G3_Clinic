import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { custosApi, type APICusto } from '../../../services/api';

const CATEGORIAS = ['Fixo', 'Variável', 'Investimento', 'Pagamento'];
const CORES: Record<string, 'blue' | 'yellow' | 'purple' | 'gray'> = {
  Fixo: 'blue', 'Variável': 'yellow', Investimento: 'purple', Pagamento: 'gray',
};

export function DespesasPage() {
  const [custos, setCustos] = useState<APICusto[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [frequencia, setFrequencia] = useState('Mensal');
  const [valor, setValor] = useState('');

  const carregar = useCallback(() => { custosApi.listar().then(setCustos).catch(() => {}); }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const filtrada = custos.filter(c => filtroCategoria === 'all' || c.categoria === filtroCategoria);
  const totalPorCategoria = (cat: string) => custos.filter(c => c.categoria === cat).reduce((s, c) => s + (c.valor || 0), 0);
  const totalGeral = custos.reduce((s, c) => s + (c.valor || 0), 0);

  const abrirNovo = () => {
    setEditId(null); setErro('');
    setDescricao(''); setCategoria(CATEGORIAS[0]); setFrequencia('Mensal'); setValor('');
    setModal(true);
  };
  const abrirEdit = (c: APICusto) => {
    setEditId(c.id); setErro('');
    setDescricao(c.descricao || ''); setCategoria(c.categoria || CATEGORIAS[0]); setFrequencia(c.frequencia || 'Mensal');
    setValor(c.valor != null ? String(c.valor) : ''); setModal(true);
  };

  const salvar = async () => {
    setErro('');
    if (!descricao.trim()) { setErro('Descrição é obrigatória.'); return; }
    setSalvando(true);
    try {
      const payload = { descricao: descricao.trim(), categoria, frequencia, valor: valor ? Number(valor) : undefined };
      if (editId) await custosApi.atualizar(editId, payload); else await custosApi.criar(payload);
      setModal(false); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };
  const excluir = async (c: APICusto) => { if (confirm(`Excluir "${c.descricao}"?`)) { await custosApi.excluir(c.id); carregar(); } };

  return (
    <div className="space-y-5">
      <PageHeader icon={Wallet} title="Despesas" subtitle="Custos fixos, variáveis, investimentos e pagamentos diversos">
        <Btn icon={Plus} onClick={abrirNovo}>Nova Despesa</Btn>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {CATEGORIAS.map(cat => (
          <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{cat}</p>
            <p className="text-lg font-bold text-slate-800 mt-1">R$ {totalPorCategoria(cat).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700 text-sm">Lista de Despesas <span className="text-slate-400 font-normal">— Total: R$ {totalGeral.toFixed(2)}</span></h3>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
            <option value="all">Todas as categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">{['Descrição', 'Categoria', 'Valor (R$)', 'Frequência', 'Status', 'Ações'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtrada.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-500">Nenhuma despesa cadastrada.</td></tr> : filtrada.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.descricao}</td>
                  <td className="px-4 py-3"><Badge color={CORES[c.categoria || ''] || 'gray'}>{c.categoria}</Badge></td>
                  <td className="px-4 py-3 font-mono text-slate-600">R$ {(c.valor ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-500">{c.frequencia}</td>
                  <td className="px-4 py-3"><Badge color="green">{c.status || 'Ativo'}</Badge></td>
                  <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => abrirEdit(c)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => excluir(c)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={`${editId ? 'Editar' : 'Nova'} Despesa`}>
        <div className="space-y-4">
          <InputField label="Descrição" required placeholder="Ex: Aluguel, equipamento novo..." value={descricao} onChange={e => setDescricao(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Categoria" value={categoria} onChange={e => setCategoria(e.target.value)}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </SelectField>
            <SelectField label="Frequência" value={frequencia} onChange={e => setFrequencia(e.target.value)}><option>Mensal</option><option>Anual</option><option>Avulso</option></SelectField>
          </div>
          <InputField label="Valor (R$)" type="number" step="0.01" placeholder="0.00" value={valor} onChange={e => setValor(e.target.value)} />
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
