import React, { useState } from 'react';
import { Package, Plus, Search, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, FolderTree, Box, ArrowRightLeft, ShoppingCart, Link2, Download, Upload, Users, Edit, Trash2 } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';

type Tab = 'produtos' | 'categorias' | 'fornecedores' | 'movimentacoes' | 'pedidos' | 'vinculos';

export function EstoquePage() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return (localStorage.getItem('estoque_active_tab') as Tab) || 'produtos';
  });

  React.useEffect(() => {
    localStorage.setItem('estoque_active_tab', activeTab);
  }, [activeTab]);

  // Modals States
  const [modalProduto, setModalProduto] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalFornecedor, setModalFornecedor] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(false);
  const [modalPedido, setModalPedido] = useState(false);
  const [modalVinculo, setModalVinculo] = useState(false);

  const [movimentoTipo, setMovimentoTipo] = useState<'entrada' | 'saida'>('entrada');
  const [movimentoQtd, setMovimentoQtd] = useState('');
  const [movimentoPreco, setMovimentoPreco] = useState('');

  const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
    { id: 'produtos', label: 'Produtos', icon: Box },
    { id: 'categorias', label: 'Categorias', icon: FolderTree },
    { id: 'fornecedores', label: 'Fornecedores', icon: Users },
    { id: 'movimentacoes', label: 'Movimentações', icon: ArrowRightLeft },
    { id: 'pedidos', label: 'Pedidos de Compra', icon: ShoppingCart },
    { id: 'vinculos', label: 'Materiais por Proc.', icon: Link2 },
  ];

  const abrirModalMovimento = (tipo: 'entrada' | 'saida') => {
    setMovimentoTipo(tipo);
    setModalMovimento(true);
  };

  const calcularTotalMovimento = () => {
    const qtd = parseFloat(movimentoQtd) || 0;
    const preco = parseFloat(movimentoPreco.replace(',', '.')) || 0;
    return (qtd * preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader icon={Package} title="Gestão de Estoque" subtitle="Produtos, Movimentações, Fornecedores e Vínculos Odontológicos" />
        <div className="flex gap-2">
          {activeTab === 'produtos' && <Btn icon={Plus} onClick={() => setModalProduto(true)}>Novo Produto</Btn>}
          {activeTab === 'categorias' && <Btn icon={Plus} onClick={() => setModalCategoria(true)}>Nova Categoria</Btn>}
          {activeTab === 'fornecedores' && <Btn icon={Plus} onClick={() => setModalFornecedor(true)}>Novo Fornecedor</Btn>}
          {activeTab === 'movimentacoes' && (
            <>
              <Btn variant="secondary" icon={ArrowDownToLine} onClick={() => abrirModalMovimento('entrada')} className="text-emerald-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50">Entrada Manual</Btn>
              <Btn variant="secondary" icon={ArrowUpFromLine} onClick={() => abrirModalMovimento('saida')} className="text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50">Saída Manual</Btn>
              <Btn variant="outline" icon={Download}>Relatório de Estoque</Btn>
            </>
          )}
          {activeTab === 'pedidos' && <Btn icon={Plus} onClick={() => setModalPedido(true)}>Novo Pedido</Btn>}
          {activeTab === 'vinculos' && <Btn icon={Plus} onClick={() => setModalVinculo(true)}>Novo Vínculo</Btn>}
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
                ${isActive 
                  ? 'border-brand-primary text-brand-primary bg-brand-light/20' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Abas */}
      <div className="min-h-[400px]">
        {activeTab === 'produtos' && (
          <div className="animate-fade-in-up space-y-4">
            <div className="flex gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Buscar material..." className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-primary" />
              </div>
              <div className="flex gap-2">
                 <Badge color="red">3 Itens Críticos</Badge>
              </div>
            </div>

            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white">
                      {['Código', 'Material / Produto', 'Categoria', 'Estoque Atual', 'Mínimo', 'Validade', 'Status', 'Ações'].map(h => (
                        <th key={h} className="text-left px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr className="hover:bg-gray-50 bg-red-50/30">
                      <td className="px-5 py-4 text-slate-500 font-mono text-xs">EST-001</td>
                      <td className="px-5 py-4 font-bold text-slate-800">Luvas de Procedimento P</td>
                      <td className="px-5 py-4 text-slate-600">Descartáveis</td>
                      <td className="px-5 py-4 font-bold text-red-600 text-lg">2 cx</td>
                      <td className="px-5 py-4 text-slate-500">10 cx</td>
                      <td className="px-5 py-4 text-slate-500">--</td>
                      <td className="px-5 py-4"><Badge color="red"><AlertTriangle size={12} className="mr-1 inline"/> Crítico</Badge></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Btn size="sm" variant="ghost" className="text-brand-primary px-2" onClick={() => abrirModalMovimento('entrada')}>Repor</Btn>
                          <button className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light/50 rounded-lg transition-colors" title="Editar">
                            <Edit size={16} />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'categorias' && (
          <div className="animate-fade-in-up">
            <Card title="Categorias de produtos">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Nome da Categoria</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3 text-center">Qtd. Produtos</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhuma categoria cadastrada.</td></tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'fornecedores' && (
          <div className="animate-fade-in-up">
            <Card title="Fornecedores Cadastrados">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Razão Social / Nome</th>
                      <th className="px-4 py-3">CNPJ/CPF</th>
                      <th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum fornecedor cadastrado.</td></tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'movimentacoes' && (
          <div className="animate-fade-in-up">
            <Card title="Histórico de movimentações">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Data/Hora</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 text-right">Qtd</th>
                      <th className="px-4 py-3 text-right">Custo (R$)</th>
                      <th className="px-4 py-3">Observações</th>
                      <th className="px-4 py-3">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhuma movimentação no período.</td></tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'pedidos' && (
          <div className="animate-fade-in-up">
            <Card title="Pedidos de compra">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Data Pedido</th>
                      <th className="px-4 py-3">Solicitante</th>
                      <th className="px-4 py-3">Itens</th>
                      <th className="px-4 py-3 text-right">Custo Est.</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum pedido de compra.</td></tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'vinculos' && (
          <div className="animate-fade-in-up">
            <Card title="Materiais vinculados a procedimentos">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Procedimento</th>
                      <th className="px-4 py-3">Material Vinculado</th>
                      <th className="px-4 py-3 text-right">Qtd Padrão por Uso</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum vínculo cadastrado.</td></tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* MODAIS */}

      {/* Modal Categoria */}
      <Modal open={modalCategoria} onClose={() => setModalCategoria(false)} title="Nova Categoria">
        <div className="space-y-4">
          <InputField label="Nome da Categoria *" placeholder="Ex: Descartáveis" />
          <InputField label="Descrição" placeholder="Opcional" />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalCategoria(false)}>Cancelar</Btn>
            <Btn onClick={() => setModalCategoria(false)}>Confirmar</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Produto */}
      <Modal open={modalProduto} onClose={() => setModalProduto(false)} title="Novo Produto">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nome do Produto *" placeholder="Ex: Resina A2" />
            <SelectField label="Categoria *">
              <option>Descartáveis</option>
              <option>Odontologia</option>
              <option>Curativos</option>
            </SelectField>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Unidade de Medida *">
              <option>Unidade (un)</option>
              <option>Caixa (cx)</option>
              <option>Litros (L)</option>
              <option>Gramas (g)</option>
              <option>Metros (m)</option>
            </SelectField>
            <InputField label="Quantidade por embalagem" placeholder="Ex: 50 se for Caixa" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="Alerta de Estoque Baixo *" type="number" placeholder="Ex: 10" />
            <SelectField label="Fornecedor Preferencial">
              <option>Dental Cremer</option>
              <option>Sury Dental</option>
              <option>Sem fornecedor fixo</option>
            </SelectField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="Validade" type="date" placeholder="Opcional" />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalProduto(false)}>Cancelar</Btn>
            <Btn onClick={() => setModalProduto(false)}>Confirmar</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Fornecedor */}
      <Modal open={modalFornecedor} onClose={() => setModalFornecedor(false)} title="Novo Fornecedor">
        <div className="space-y-4">
          <InputField label="Razão Social / Nome *" placeholder="" />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="CNPJ/CPF *" placeholder="" />
            <InputField label="Telefone *" placeholder="" />
          </div>
          <InputField label="E-mail" placeholder="" />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalFornecedor(false)}>Cancelar</Btn>
            <Btn onClick={() => setModalFornecedor(false)}>Confirmar</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Movimentação */}
      <Modal open={modalMovimento} onClose={() => setModalMovimento(false)} title={movimentoTipo === 'entrada' ? 'Registrar Entrada de Estoque' : 'Registrar Saída Manual'}>
        <div className="space-y-4">
          <SelectField label="Material / Produto *" required>
            <option>Luvas de Procedimento P</option>
            <option>Resina Composta A2</option>
            <option>Gaze Estéril</option>
          </SelectField>
          
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label={movimentoTipo === 'entrada' ? 'Quantidade Adquirida *' : 'Quantidade *'} 
              type="number" 
              required 
              placeholder="Ex: 10" 
              value={movimentoQtd}
              onChange={(e) => setMovimentoQtd(e.target.value)}
            />
            {movimentoTipo === 'entrada' && (
              <InputField 
                label="Preço Unitário (R$)" 
                placeholder="Ex: 15,90" 
                value={movimentoPreco}
                onChange={(e) => setMovimentoPreco(e.target.value)}
              />
            )}
          </div>

          {movimentoTipo === 'entrada' && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Total da Entrada:</span>
              <span className="text-lg font-bold text-brand-primary">{calcularTotalMovimento()}</span>
            </div>
          )}

          <InputField label="Observações" placeholder="Motivo, referência..." />

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalMovimento(false)}>Cancelar</Btn>
            <Btn className={movimentoTipo === 'saida' ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : ''} onClick={() => setModalMovimento(false)}>
               Confirmar {movimentoTipo === 'entrada' ? 'Entrada' : 'Saída'}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Pedido */}
      <Modal open={modalPedido} onClose={() => setModalPedido(false)} title="Novo Pedido de Compra">
        <div className="space-y-4">
          <SelectField label="Fornecedor *">
            <option>Dental Cremer</option>
            <option>Sury Dental</option>
          </SelectField>
          <InputField label="Lista de Itens (Texto Livre por enquanto)" />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalPedido(false)}>Cancelar</Btn>
            <Btn onClick={() => setModalPedido(false)}>Confirmar</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Vínculo Material x Procedimento */}
      <Modal open={modalVinculo} onClose={() => setModalVinculo(false)} title="Vincular Material a Procedimento">
        <div className="space-y-4">
          <SelectField label="Procedimento Odontológico *">
            <option>Restauração Resina 1 Face</option>
            <option>Extração Simples</option>
            <option>Limpeza (Profilaxia)</option>
          </SelectField>
          <SelectField label="Material de Estoque *">
            <option>Resina Composta A2</option>
            <option>Anestésico Lidocaína</option>
            <option>Luvas de Procedimento P</option>
          </SelectField>
          <InputField label="Qtd. Padrão consumida por sessão *" type="number" placeholder="Ex: 1" />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalVinculo(false)}>Cancelar</Btn>
            <Btn onClick={() => setModalVinculo(false)}>Confirmar Vínculo</Btn>
          </div>
        </div>
      </Modal>

    </div>
  );
}
