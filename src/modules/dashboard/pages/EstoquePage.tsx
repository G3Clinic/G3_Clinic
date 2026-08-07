import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, FolderTree, Box, ArrowRightLeft, ShoppingCart, Link2, Users, Edit, Trash2, Send } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import {
  estoqueCategoriasApi, estoqueProdutosApi, estoqueFornecedoresApi, estoqueMovApi, estoquePedidosApi,
  procMateriaisApi, odontoProcApi, estoqueApi, enviarPedidoAoFinanceiro,
  type APIEstoqueCategoria, type APIEstoqueProduto, type APIEstoqueFornecedor, type APIEstoqueMov,
  type APIEstoquePedido, type APIProcMaterial, type APIOdontoProc, type APISaldo,
} from '../../../services/api';

type Tab = 'produtos' | 'categorias' | 'fornecedores' | 'movimentacoes' | 'pedidos' | 'vinculos';
const UNIDADES_MEDIDA = ['Unidade (un)', 'Caixa (cx)', 'Litros (L)', 'Gramas (g)', 'Metros (m)'];

export function EstoquePage() {
  const [activeTab, setActiveTab] = useState<Tab>(() => (localStorage.getItem('estoque_active_tab') as Tab) || 'produtos');
  React.useEffect(() => { localStorage.setItem('estoque_active_tab', activeTab); }, [activeTab]);

  const [categorias, setCategorias] = useState<APIEstoqueCategoria[]>([]);
  const [produtos, setProdutos] = useState<APIEstoqueProduto[]>([]);
  const [fornecedores, setFornecedores] = useState<APIEstoqueFornecedor[]>([]);
  const [movs, setMovs] = useState<APIEstoqueMov[]>([]);
  const [pedidos, setPedidos] = useState<APIEstoquePedido[]>([]);
  const [vinculos, setVinculos] = useState<APIProcMaterial[]>([]);
  const [odontoProcs, setOdontoProcs] = useState<APIOdontoProc[]>([]);
  const [saldos, setSaldos] = useState<APISaldo[]>([]);
  const [busca, setBusca] = useState('');

  const [modalProduto, setModalProduto] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalFornecedor, setModalFornecedor] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(false);
  const [modalPedido, setModalPedido] = useState(false);
  const [modalVinculo, setModalVinculo] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // forms
  const [prod, setProd] = useState({ nome: '', categoria_id: '', unidade_medida: UNIDADES_MEDIDA[0], unidades_por_embalagem: '', estoque_minimo: '', fornecedor_id: '', data_validade: '', codigo: '' });
  const [cat, setCat] = useState({ nome: '', descricao: '' });
  const [forn, setForn] = useState({ nome: '', cnpj_cpf: '', telefone: '', email: '' });
  const [movimentoTipo, setMovimentoTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [mov, setMov] = useState({ produto_id: '', quantidade: '', custo_unitario: '', observacoes: '' });
  const [ped, setPed] = useState({ fornecedor_id: '', itens_texto: '', custo_estimado: '' });
  const [vinc, setVinc] = useState({ procedimento_id: '', produto_id: '', quantidade: '1' });

  const carregar = useCallback(() => {
    estoqueCategoriasApi.listar().then(setCategorias).catch(() => {});
    estoqueProdutosApi.listar().then(setProdutos).catch(() => {});
    estoqueFornecedoresApi.listar().then(setFornecedores).catch(() => {});
    estoqueMovApi.listar().then(setMovs).catch(() => {});
    estoquePedidosApi.listar().then(setPedidos).catch(() => {});
    procMateriaisApi.listar().then(setVinculos).catch(() => {});
    odontoProcApi.listar().then(setOdontoProcs).catch(() => {});
    estoqueApi.saldos().then(setSaldos).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // helpers
  const nomeCat = (id?: string | null) => categorias.find(c => c.id === id)?.nome || '—';
  const nomeForn = (id?: string | null) => fornecedores.find(f => f.id === id)?.nome || '—';
  const nomeProd = (id?: string | null) => produtos.find(p => p.id === id)?.nome || '—';
  const nomeProc = (id?: string | null) => odontoProcs.find(p => p.id === id)?.nome_intervencao || '—';
  const saldoProduto = (pid: string) => saldos.find(s => s.produto_id === pid)?.quantidade ?? 0;
  const critico = (p: APIEstoqueProduto) => saldoProduto(p.id) < (p.estoque_minimo || 0);
  const qtdCriticos = produtos.filter(critico).length;

  // ── salvar ──
  const salvarProduto = async () => {
    if (!prod.nome.trim()) return alert('Nome obrigatório.');
    const payload = {
      nome: prod.nome.trim(), codigo: prod.codigo || undefined, categoria_id: prod.categoria_id || undefined,
      fornecedor_id: prod.fornecedor_id || undefined, unidade_medida: prod.unidade_medida,
      unidades_por_embalagem: prod.unidades_por_embalagem ? Number(prod.unidades_por_embalagem) : undefined,
      estoque_minimo: prod.estoque_minimo ? Number(prod.estoque_minimo) : undefined,
      data_validade: prod.data_validade || undefined,
    };
    try { if (editId) await estoqueProdutosApi.atualizar(editId, payload); else await estoqueProdutosApi.criar(payload); setModalProduto(false); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };
  const salvarCategoria = async () => {
    if (!cat.nome.trim()) return alert('Nome obrigatório.');
    try { if (editId) await estoqueCategoriasApi.atualizar(editId, cat); else await estoqueCategoriasApi.criar(cat); setModalCategoria(false); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };
  const salvarFornecedor = async () => {
    if (!forn.nome.trim()) return alert('Nome obrigatório.');
    try { if (editId) await estoqueFornecedoresApi.atualizar(editId, forn); else await estoqueFornecedoresApi.criar(forn); setModalFornecedor(false); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };
  const salvarMovimento = async () => {
    if (!mov.produto_id || !mov.quantidade) return alert('Produto e quantidade obrigatórios.');
    try {
      // usa o endpoint de negócio: registra a movimentação E baixa/atualiza o saldo
      await estoqueApi.movimentar({ produto_id: mov.produto_id, tipo: movimentoTipo, quantidade: Number(mov.quantidade), custo_unitario: mov.custo_unitario ? Number(mov.custo_unitario.replace(',', '.')) : undefined, observacoes: mov.observacoes || undefined });
      setModalMovimento(false); setMov({ produto_id: '', quantidade: '', custo_unitario: '', observacoes: '' }); carregar();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };
  const salvarPedido = async () => {
    if (!ped.fornecedor_id) return alert('Selecione o fornecedor.');
    try { await estoquePedidosApi.criar({ fornecedor_id: ped.fornecedor_id, itens_texto: ped.itens_texto || undefined, custo_estimado: ped.custo_estimado ? Number(ped.custo_estimado) : undefined, status: 'PENDENTE' }); setModalPedido(false); setPed({ fornecedor_id: '', itens_texto: '', custo_estimado: '' }); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };
  // Manda o pedido pro Financeiro aprovar e pagar — vira Conta a Pagar vinculada.
  const enviarAoFinanceiro = async (pd: APIEstoquePedido) => {
    try { await enviarPedidoAoFinanceiro(pd.id); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao enviar ao financeiro.'); }
  };
  const salvarVinculo = async () => {
    if (!vinc.procedimento_id || !vinc.produto_id) return alert('Procedimento e material obrigatórios.');
    try { await procMateriaisApi.criar({ procedimento_id: vinc.procedimento_id, produto_id: vinc.produto_id, quantidade: Number(vinc.quantidade) || 1 }); setModalVinculo(false); setVinc({ procedimento_id: '', produto_id: '', quantidade: '1' }); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };

  const abrirNovoProduto = () => { setEditId(null); setProd({ nome: '', categoria_id: '', unidade_medida: UNIDADES_MEDIDA[0], unidades_por_embalagem: '', estoque_minimo: '', fornecedor_id: '', data_validade: '', codigo: '' }); setModalProduto(true); };
  const editarProduto = (p: APIEstoqueProduto) => { setEditId(p.id); setProd({ nome: p.nome, categoria_id: p.categoria_id || '', unidade_medida: p.unidade_medida || UNIDADES_MEDIDA[0], unidades_por_embalagem: p.unidades_por_embalagem != null ? String(p.unidades_por_embalagem) : '', estoque_minimo: p.estoque_minimo != null ? String(p.estoque_minimo) : '', fornecedor_id: p.fornecedor_id || '', data_validade: p.data_validade || '', codigo: p.codigo || '' }); setModalProduto(true); };
  const abrirNovaCategoria = () => { setEditId(null); setCat({ nome: '', descricao: '' }); setModalCategoria(true); };
  const abrirNovoFornecedor = () => { setEditId(null); setForn({ nome: '', cnpj_cpf: '', telefone: '', email: '' }); setModalFornecedor(true); };
  const abrirModalMovimento = (tipo: 'ENTRADA' | 'SAIDA') => { setMovimentoTipo(tipo); setModalMovimento(true); };

  const del = async (fn: () => Promise<unknown>) => { if (confirm('Excluir este item?')) { await fn(); carregar(); } };
  const totalMov = ((parseFloat(mov.quantidade) || 0) * (parseFloat(mov.custo_unitario.replace(',', '.')) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
    { id: 'produtos', label: 'Produtos', icon: Box }, { id: 'categorias', label: 'Categorias', icon: FolderTree },
    { id: 'fornecedores', label: 'Fornecedores', icon: Users }, { id: 'movimentacoes', label: 'Movimentações', icon: ArrowRightLeft },
    { id: 'pedidos', label: 'Pedidos de Compra', icon: ShoppingCart }, { id: 'vinculos', label: 'Materiais por Proc.', icon: Link2 },
  ];
  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader icon={Package} title="Gestão de Estoque" subtitle="Produtos, Movimentações, Fornecedores e Vínculos Odontológicos" />
        <div className="flex gap-2 flex-wrap">
          {activeTab === 'produtos' && <Btn icon={Plus} onClick={abrirNovoProduto}>Novo Produto</Btn>}
          {activeTab === 'categorias' && <Btn icon={Plus} onClick={abrirNovaCategoria}>Nova Categoria</Btn>}
          {activeTab === 'fornecedores' && <Btn icon={Plus} onClick={abrirNovoFornecedor}>Novo Fornecedor</Btn>}
          {activeTab === 'movimentacoes' && (<>
            <Btn variant="secondary" icon={ArrowDownToLine} onClick={() => abrirModalMovimento('ENTRADA')} className="text-emerald-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50">Entrada Manual</Btn>
            <Btn variant="secondary" icon={ArrowUpFromLine} onClick={() => abrirModalMovimento('SAIDA')} className="text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50">Saída Manual</Btn>
          </>)}
          {activeTab === 'pedidos' && <Btn icon={Plus} onClick={() => setModalPedido(true)}>Novo Pedido</Btn>}
          {activeTab === 'vinculos' && <Btn icon={Plus} onClick={() => setModalVinculo(true)}>Novo Vínculo</Btn>}
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-px">
        {tabs.map((tab) => { const Icon = tab.icon; const isActive = activeTab === tab.id; return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-brand-primary text-brand-primary bg-brand-light/20' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'}`}>
            <Icon size={16} />{tab.label}
          </button>
        ); })}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'produtos' && (
          <div className="animate-fade-in-up space-y-4">
            <div className="flex gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Buscar material..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-primary" />
              </div>
              {qtdCriticos > 0 && <Badge color="red">{qtdCriticos} Itens Críticos</Badge>}
            </div>
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100 bg-white">{['Código', 'Material / Produto', 'Categoria', 'Estoque Atual', 'Mínimo', 'Validade', 'Status', 'Ações'].map(h => <th key={h} className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {produtosFiltrados.length === 0 ? <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>
                      : produtosFiltrados.map(p => { const saldo = saldoProduto(p.id); const crit = saldo < (p.estoque_minimo || 0); return (
                        <tr key={p.id} className={`hover:bg-gray-50 ${crit ? 'bg-red-50/30' : ''}`}>
                          <td className="px-5 py-4 text-slate-500 font-mono text-xs">{p.codigo || '—'}</td>
                          <td className="px-5 py-4 font-bold text-slate-800">{p.nome}</td>
                          <td className="px-5 py-4 text-slate-600">{nomeCat(p.categoria_id)}</td>
                          <td className={`px-5 py-4 font-bold text-lg ${crit ? 'text-red-600' : 'text-slate-700'}`}>{saldo}</td>
                          <td className="px-5 py-4 text-slate-500">{p.estoque_minimo ?? '—'}</td>
                          <td className="px-5 py-4 text-slate-500">{p.data_validade ? p.data_validade.split('-').reverse().join('/') : '--'}</td>
                          <td className="px-5 py-4">{crit ? <Badge color="red"><AlertTriangle size={12} className="mr-1 inline" /> Crítico</Badge> : <Badge color="green">OK</Badge>}</td>
                          <td className="px-5 py-4"><div className="flex items-center gap-2">
                            <Btn size="sm" variant="ghost" className="text-brand-primary px-2" onClick={() => { setMov(m => ({ ...m, produto_id: p.id })); abrirModalMovimento('ENTRADA'); }}>Repor</Btn>
                            <button className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light/50 rounded-lg" title="Editar" onClick={() => editarProduto(p)}><Edit size={16} /></button>
                            <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir" onClick={() => del(() => estoqueProdutosApi.excluir(p.id))}><Trash2 size={16} /></button>
                          </div></td>
                        </tr>
                      ); })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'categorias' && (
          <Card title="Categorias de produtos"><div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3 text-center">Qtd. Produtos</th><th className="px-4 py-3">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {categorias.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhuma categoria cadastrada.</td></tr>
                : categorias.map(c => (<tr key={c.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td><td className="px-4 py-3 text-slate-500">{c.descricao || '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{produtos.filter(p => p.categoria_id === c.id).length}</td>
                  <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => { setEditId(c.id); setCat({ nome: c.nome, descricao: c.descricao || '' }); setModalCategoria(true); }} className="p-1.5 text-slate-400 hover:text-brand-primary rounded-lg"><Edit size={14} /></button>
                    <button onClick={() => del(() => estoqueCategoriasApi.excluir(c.id))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div></td></tr>))}
            </tbody></table></div></Card>
        )}

        {activeTab === 'fornecedores' && (
          <Card title="Fornecedores Cadastrados"><div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100"><tr><th className="px-4 py-3">Razão Social / Nome</th><th className="px-4 py-3">CNPJ/CPF</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {fornecedores.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum fornecedor cadastrado.</td></tr>
                : fornecedores.map(f => (<tr key={f.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium text-slate-800">{f.nome}</td><td className="px-4 py-3 text-slate-500">{f.cnpj_cpf || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{f.telefone || '—'}</td><td className="px-4 py-3 text-slate-500">{f.email || '—'}</td>
                  <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => { setEditId(f.id); setForn({ nome: f.nome, cnpj_cpf: f.cnpj_cpf || '', telefone: f.telefone || '', email: f.email || '' }); setModalFornecedor(true); }} className="p-1.5 text-slate-400 hover:text-brand-primary rounded-lg"><Edit size={14} /></button>
                    <button onClick={() => del(() => estoqueFornecedoresApi.excluir(f.id))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div></td></tr>))}
            </tbody></table></div></Card>
        )}

        {activeTab === 'movimentacoes' && (
          <Card title="Histórico de movimentações"><div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Produto</th><th className="px-4 py-3 text-right">Qtd</th><th className="px-4 py-3 text-right">Custo (R$)</th><th className="px-4 py-3">Observações</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {movs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma movimentação.</td></tr>
                : [...movs].reverse().map(m => (<tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-slate-500">{m.criado_em ? new Date(m.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3">{m.tipo === 'SAIDA' ? <Badge color="red">Saída</Badge> : <Badge color="green">Entrada</Badge>}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{nomeProd(m.produto_id)}</td>
                  <td className="px-4 py-3 text-right font-mono">{m.quantidade}</td><td className="px-4 py-3 text-right font-mono">{m.custo_unitario != null ? `R$ ${m.custo_unitario.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{m.observacoes || '—'}</td></tr>))}
            </tbody></table></div></Card>
        )}

        {activeTab === 'pedidos' && (
          <Card title="Pedidos de compra"><div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Fornecedor</th><th className="px-4 py-3">Itens</th><th className="px-4 py-3 text-right">Custo Est.</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {pedidos.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum pedido de compra.</td></tr>
                : pedidos.map(pd => (<tr key={pd.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 text-slate-500">{pd.criado_em ? new Date(pd.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{nomeForn(pd.fornecedor_id)}</td><td className="px-4 py-3 text-slate-500 max-w-xs truncate">{pd.itens_texto || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{pd.custo_estimado != null ? `R$ ${pd.custo_estimado.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3"><Badge color={pd.status === 'RECEBIDO' ? 'green' : pd.status === 'CANCELADO' ? 'gray' : pd.status === 'AGUARDANDO_FINANCEIRO' ? 'blue' : 'yellow'}>{pd.status === 'AGUARDANDO_FINANCEIRO' ? 'Aguardando Financeiro' : pd.status}</Badge></td>
                  <td className="px-4 py-3"><div className="flex gap-1 items-center">
                    {pd.status === 'PENDENTE' && (
                      <button onClick={() => enviarAoFinanceiro(pd)} title="Enviar ao Financeiro (vira Conta a Pagar)"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2 py-1">
                        <Send size={13} /> Enviar ao Financeiro
                      </button>
                    )}
                    <button onClick={() => del(() => estoquePedidosApi.excluir(pd.id))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div></td></tr>))}
            </tbody></table></div></Card>
        )}

        {activeTab === 'vinculos' && (
          <Card title="Materiais vinculados a procedimentos"><div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100"><tr><th className="px-4 py-3">Procedimento</th><th className="px-4 py-3">Material Vinculado</th><th className="px-4 py-3 text-right">Qtd Padrão</th><th className="px-4 py-3">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {vinculos.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum vínculo cadastrado.</td></tr>
                : vinculos.map(v => (<tr key={v.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium text-slate-700">{nomeProc(v.procedimento_id)}</td><td className="px-4 py-3 text-slate-600">{nomeProd(v.produto_id)}</td>
                  <td className="px-4 py-3 text-right font-mono">{v.quantidade}</td>
                  <td className="px-4 py-3"><button onClick={() => del(() => procMateriaisApi.excluir(v.id))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button></td></tr>))}
            </tbody></table></div></Card>
        )}
      </div>

      {/* Modais */}
      <Modal open={modalCategoria} onClose={() => setModalCategoria(false)} title={editId ? 'Editar Categoria' : 'Nova Categoria'}>
        <div className="space-y-4">
          <InputField label="Nome da Categoria *" placeholder="Ex: Descartáveis" value={cat.nome} onChange={e => setCat({ ...cat, nome: e.target.value })} />
          <InputField label="Descrição" placeholder="Opcional" value={cat.descricao} onChange={e => setCat({ ...cat, descricao: e.target.value })} />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100"><Btn variant="ghost" onClick={() => setModalCategoria(false)}>Cancelar</Btn><Btn onClick={salvarCategoria}>Confirmar</Btn></div>
        </div>
      </Modal>

      <Modal open={modalProduto} onClose={() => setModalProduto(false)} title={editId ? 'Editar Produto' : 'Novo Produto'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nome do Produto *" placeholder="Ex: Resina A2" value={prod.nome} onChange={e => setProd({ ...prod, nome: e.target.value })} />
            <SelectField label="Categoria" value={prod.categoria_id} onChange={e => setProd({ ...prod, categoria_id: e.target.value })}>
              <option value="">Selecione...</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Unidade de Medida *" value={prod.unidade_medida} onChange={e => setProd({ ...prod, unidade_medida: e.target.value })}>{UNIDADES_MEDIDA.map(u => <option key={u}>{u}</option>)}</SelectField>
            <InputField label="Quantidade por embalagem" placeholder="Ex: 50" value={prod.unidades_por_embalagem} onChange={e => setProd({ ...prod, unidades_por_embalagem: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Alerta de Estoque Baixo *" type="number" placeholder="Ex: 10" value={prod.estoque_minimo} onChange={e => setProd({ ...prod, estoque_minimo: e.target.value })} />
            <SelectField label="Fornecedor Preferencial" value={prod.fornecedor_id} onChange={e => setProd({ ...prod, fornecedor_id: e.target.value })}>
              <option value="">Sem fornecedor fixo</option>{fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Código" placeholder="Ex: EST-001" value={prod.codigo} onChange={e => setProd({ ...prod, codigo: e.target.value })} />
            <InputField label="Validade" type="date" value={prod.data_validade} onChange={e => setProd({ ...prod, data_validade: e.target.value })} />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100"><Btn variant="ghost" onClick={() => setModalProduto(false)}>Cancelar</Btn><Btn onClick={salvarProduto}>Confirmar</Btn></div>
        </div>
      </Modal>

      <Modal open={modalFornecedor} onClose={() => setModalFornecedor(false)} title={editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <div className="space-y-4">
          <InputField label="Razão Social / Nome *" value={forn.nome} onChange={e => setForn({ ...forn, nome: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="CNPJ/CPF" value={forn.cnpj_cpf} onChange={e => setForn({ ...forn, cnpj_cpf: e.target.value })} />
            <InputField label="Telefone" value={forn.telefone} onChange={e => setForn({ ...forn, telefone: e.target.value })} />
          </div>
          <InputField label="E-mail" value={forn.email} onChange={e => setForn({ ...forn, email: e.target.value })} />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100"><Btn variant="ghost" onClick={() => setModalFornecedor(false)}>Cancelar</Btn><Btn onClick={salvarFornecedor}>Confirmar</Btn></div>
        </div>
      </Modal>

      <Modal open={modalMovimento} onClose={() => setModalMovimento(false)} title={movimentoTipo === 'ENTRADA' ? 'Registrar Entrada de Estoque' : 'Registrar Saída Manual'}>
        <div className="space-y-4">
          <SelectField label="Material / Produto *" required value={mov.produto_id} onChange={e => setMov({ ...mov, produto_id: e.target.value })}>
            <option value="">Selecione...</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </SelectField>
          <div className="grid grid-cols-2 gap-4">
            <InputField label={movimentoTipo === 'ENTRADA' ? 'Quantidade Adquirida *' : 'Quantidade *'} type="number" required placeholder="Ex: 10" value={mov.quantidade} onChange={e => setMov({ ...mov, quantidade: e.target.value })} />
            {movimentoTipo === 'ENTRADA' && <InputField label="Preço Unitário (R$)" placeholder="Ex: 15,90" value={mov.custo_unitario} onChange={e => setMov({ ...mov, custo_unitario: e.target.value })} />}
          </div>
          {movimentoTipo === 'ENTRADA' && <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex justify-between items-center"><span className="text-sm font-semibold text-slate-600">Total da Entrada:</span><span className="text-lg font-bold text-brand-primary">{totalMov}</span></div>}
          <InputField label="Observações" placeholder="Motivo, referência..." value={mov.observacoes} onChange={e => setMov({ ...mov, observacoes: e.target.value })} />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100"><Btn variant="ghost" onClick={() => setModalMovimento(false)}>Cancelar</Btn>
            <Btn className={movimentoTipo === 'SAIDA' ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : ''} onClick={salvarMovimento}>Confirmar {movimentoTipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</Btn></div>
        </div>
      </Modal>

      <Modal open={modalPedido} onClose={() => setModalPedido(false)} title="Novo Pedido de Compra">
        <div className="space-y-4">
          <SelectField label="Fornecedor *" value={ped.fornecedor_id} onChange={e => setPed({ ...ped, fornecedor_id: e.target.value })}>
            <option value="">Selecione...</option>{fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </SelectField>
          <InputField label="Lista de Itens" placeholder="Descreva os itens do pedido" value={ped.itens_texto} onChange={e => setPed({ ...ped, itens_texto: e.target.value })} />
          <InputField label="Custo Estimado (R$)" type="number" step="0.01" value={ped.custo_estimado} onChange={e => setPed({ ...ped, custo_estimado: e.target.value })} />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100"><Btn variant="ghost" onClick={() => setModalPedido(false)}>Cancelar</Btn><Btn onClick={salvarPedido}>Confirmar</Btn></div>
        </div>
      </Modal>

      <Modal open={modalVinculo} onClose={() => setModalVinculo(false)} title="Vincular Material a Procedimento">
        <div className="space-y-4">
          <SelectField label="Procedimento Odontológico *" value={vinc.procedimento_id} onChange={e => setVinc({ ...vinc, procedimento_id: e.target.value })}>
            <option value="">Selecione...</option>{odontoProcs.map(p => <option key={p.id} value={p.id}>{p.nome_intervencao}</option>)}
          </SelectField>
          <SelectField label="Material de Estoque *" value={vinc.produto_id} onChange={e => setVinc({ ...vinc, produto_id: e.target.value })}>
            <option value="">Selecione...</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </SelectField>
          <InputField label="Qtd. Padrão consumida por sessão *" type="number" placeholder="Ex: 1" value={vinc.quantidade} onChange={e => setVinc({ ...vinc, quantidade: e.target.value })} />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100"><Btn variant="ghost" onClick={() => setModalVinculo(false)}>Cancelar</Btn><Btn onClick={salvarVinculo}>Confirmar Vínculo</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
