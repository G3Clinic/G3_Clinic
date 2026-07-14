import { useState, useEffect, useCallback } from 'react';
import { PieChart, Plus, Edit2, Trash2, Save, DollarSign, TestTubes } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { custosApi, tabelaLabApi, type APICusto, type APITabelaLab } from '../../../services/api';

export function AdminDREPage() {
  const [tab, setTab] = useState<'custos' | 'lab'>('custos');
  const [custos, setCustos] = useState<APICusto[]>([]);
  const [labs, setLabs] = useState<APITabelaLab[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // form custos
  const [cDescricao, setCDescricao] = useState('');
  const [cCategoria, setCCategoria] = useState('Fixo');
  const [cFrequencia, setCFrequencia] = useState('Mensal');
  const [cValor, setCValor] = useState('');
  // form lab
  const [lExame, setLExame] = useState('');
  const [lLab, setLLab] = useState('');
  const [lCusto, setLCusto] = useState('');
  const [lPrazo, setLPrazo] = useState('');

  const carregar = useCallback(() => {
    custosApi.listar().then(setCustos).catch(() => {});
    tabelaLabApi.listar().then(setLabs).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => {
    setEditId(null); setErro('');
    setCDescricao(''); setCCategoria('Fixo'); setCFrequencia('Mensal'); setCValor('');
    setLExame(''); setLLab(''); setLCusto(''); setLPrazo('');
    setModal(true);
  };
  const abrirEditCusto = (c: APICusto) => {
    setTab('custos'); setEditId(c.id); setErro('');
    setCDescricao(c.descricao || ''); setCCategoria(c.categoria || 'Fixo'); setCFrequencia(c.frequencia || 'Mensal');
    setCValor(c.valor != null ? String(c.valor) : ''); setModal(true);
  };
  const abrirEditLab = (l: APITabelaLab) => {
    setTab('lab'); setEditId(l.id); setErro('');
    setLExame(l.exame || ''); setLLab(l.laboratorio || ''); setLCusto(l.custo != null ? String(l.custo) : ''); setLPrazo(l.prazo || '');
    setModal(true);
  };

  const salvar = async () => {
    setErro(''); setSalvando(true);
    try {
      if (tab === 'custos') {
        if (!cDescricao.trim()) { setErro('Descrição é obrigatória.'); setSalvando(false); return; }
        const payload = { descricao: cDescricao.trim(), categoria: cCategoria, frequencia: cFrequencia, valor: cValor ? Number(cValor) : undefined };
        if (editId) await custosApi.atualizar(editId, payload); else await custosApi.criar(payload);
      } else {
        if (!lExame.trim()) { setErro('Nome do exame é obrigatório.'); setSalvando(false); return; }
        const payload = { exame: lExame.trim(), laboratorio: lLab.trim() || undefined, custo: lCusto ? Number(lCusto) : undefined, prazo: lPrazo.trim() || undefined };
        if (editId) await tabelaLabApi.atualizar(editId, payload); else await tabelaLabApi.criar(payload);
      }
      setModal(false); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const excluirCusto = async (c: APICusto) => { if (confirm(`Excluir "${c.descricao}"?`)) { await custosApi.excluir(c.id); carregar(); } };
  const excluirLab = async (l: APITabelaLab) => { if (confirm(`Excluir "${l.exame}"?`)) { await tabelaLabApi.excluir(l.id); carregar(); } };

  return (
    <div className="space-y-5">
      <PageHeader icon={PieChart} title="Custos & Laboratório" subtitle="Gerencie os custos fixos/variáveis e exames de laboratório parceiros">
        <Btn icon={Plus} onClick={abrirNovo}>Novo {tab === 'custos' ? 'Custo' : 'Exame'}</Btn>
      </PageHeader>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('custos')} className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'custos' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><DollarSign size={16} /> Custos Operacionais</button>
        <button onClick={() => setTab('lab')} className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'lab' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><TestTubes size={16} /> Tabela de Laboratório</button>
      </div>

      {tab === 'custos' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">{['Descrição', 'Categoria', 'Valor (R$)', 'Frequência', 'Status', 'Ações'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {custos.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-500">Nenhum custo cadastrado.</td></tr> : custos.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.descricao}</td>
                    <td className="px-4 py-3"><Badge color={c.categoria === 'Fixo' ? 'blue' : 'yellow'}>{c.categoria}</Badge></td>
                    <td className="px-4 py-3 font-mono text-slate-600">R$ {(c.valor ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.frequencia}</td>
                    <td className="px-4 py-3"><Badge color="green">{c.status || 'Ativo'}</Badge></td>
                    <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEditCusto(c)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => excluirCusto(c)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div></td>
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
              <thead><tr className="border-b border-gray-100">{['Exame', 'Laboratório', 'Custo (R$)', 'Prazo', 'Ações'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {labs.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-500">Nenhum exame cadastrado.</td></tr> : labs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.exame}</td>
                    <td className="px-4 py-3 text-slate-500">{l.laboratorio || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">R$ {(l.custo ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{l.prazo || '—'}</td>
                    <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEditLab(l)} className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => excluirLab(l)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={`${editId ? 'Editar' : 'Novo'} ${tab === 'custos' ? 'Custo' : 'Exame de Laboratório'}`}>
        <div className="space-y-4">
          {tab === 'custos' ? (
            <>
              <InputField label="Descrição" required placeholder="Ex: Aluguel" value={cDescricao} onChange={e => setCDescricao(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Categoria" value={cCategoria} onChange={e => setCCategoria(e.target.value)}><option>Fixo</option><option>Variável</option></SelectField>
                <SelectField label="Frequência" value={cFrequencia} onChange={e => setCFrequencia(e.target.value)}><option>Mensal</option><option>Anual</option><option>Avulso</option></SelectField>
              </div>
              <InputField label="Valor (R$)" type="number" step="0.01" placeholder="0.00" value={cValor} onChange={e => setCValor(e.target.value)} />
            </>
          ) : (
            <>
              <InputField label="Nome do Exame" required placeholder="Ex: Hemograma Completo" value={lExame} onChange={e => setLExame(e.target.value)} />
              <InputField label="Laboratório" placeholder="Ex: Lab Central" value={lLab} onChange={e => setLLab(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Custo (R$)" type="number" step="0.01" placeholder="0.00" value={lCusto} onChange={e => setLCusto(e.target.value)} />
                <InputField label="Prazo de Resultado" placeholder="Ex: 2 dias" value={lPrazo} onChange={e => setLPrazo(e.target.value)} />
              </div>
            </>
          )}
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
