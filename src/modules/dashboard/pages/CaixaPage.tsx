import { useState, useEffect, useCallback } from 'react';
import { Landmark, ArrowUpCircle, ArrowDownCircle, Lock, DollarSign, Wallet } from 'lucide-react';
import { PageHeader, Card, Btn, StatsCard, Badge, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { caixaLancamentosApi, caixaTurnosApi, type APICaixaLancamento } from '../../../services/api';

const PAGAMENTOS = ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito'];
const hojeISO = () => new Date().toISOString().split('T')[0];

export function CaixaPage() {
  const [lancamentos, setLancamentos] = useState<APICaixaLancamento[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('Dinheiro');

  const carregar = useCallback(() => {
    caixaLancamentosApi.listar().then(setLancamentos).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const doDia = lancamentos.filter(l => (l.data || (l.criado_em || '').slice(0, 10)) === hojeISO());
  const somaForma = (formas: string[], t: 'ENTRADA' | 'SAIDA' = 'ENTRADA') =>
    doDia.filter(l => l.tipo === t && formas.includes(l.forma_pagamento || '')).reduce((s, l) => s + (l.valor || 0), 0);
  const entradasDinheiro = somaForma(['Dinheiro']);
  const entradasCartaoPix = somaForma(['PIX', 'Cartão de Crédito', 'Cartão de Débito']);
  const saidas = doDia.filter(l => l.tipo === 'SAIDA').reduce((s, l) => s + (l.valor || 0), 0);
  const totalDia = entradasDinheiro + entradasCartaoPix - saidas;
  const porForma = (f: string) => somaForma([f]);

  const abrirModal = (t: 'ENTRADA' | 'SAIDA') => { setTipo(t); setDescricao(''); setValor(''); setForma('Dinheiro'); setModalOpen(true); };
  const salvar = async () => {
    if (!descricao.trim() || !valor) { alert('Preencha descrição e valor.'); return; }
    try {
      await caixaLancamentosApi.criar({ tipo, descricao: descricao.trim(), valor: Number(valor), forma_pagamento: forma, data: hojeISO() });
      setModalOpen(false); carregar();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };
  const fecharCaixa = async () => {
    if (!confirm(`Fechar o caixa do dia? Total: R$ ${totalDia.toFixed(2)}`)) return;
    try {
      await caixaTurnosApi.criar({
        data_fechamento: new Date().toISOString(),
        status_auditoria: 'Pendente de Auditoria',
        total_arrecadado: entradasDinheiro + entradasCartaoPix,
        total_retido_clinica: totalDia,
      });
      alert('Caixa fechado — turno registrado para auditoria.');
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao fechar o caixa.'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Landmark} title="Caixa do Dia" subtitle="Controle de fluxo de caixa, pagamentos e recebimentos diários">
        <div className="flex gap-2">
          <Btn variant="secondary" icon={ArrowDownCircle} onClick={() => abrirModal('SAIDA')} className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200">Nova Saída</Btn>
          <Btn icon={ArrowUpCircle} onClick={() => abrirModal('ENTRADA')} className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-emerald-500/20 shadow-sm">Nova Entrada</Btn>
          <Btn variant="danger" icon={Lock} className="ml-2" onClick={fecharCaixa}>Fechar Caixa</Btn>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={DollarSign} label="Total do Dia" value={`R$ ${totalDia.toFixed(2)}`} color="blue" />
        <StatsCard icon={ArrowUpCircle} label="Entradas (Dinheiro)" value={`R$ ${entradasDinheiro.toFixed(2)}`} color="green" />
        <StatsCard icon={ArrowUpCircle} label="Entradas (Cartão/PIX)" value={`R$ ${entradasCartaoPix.toFixed(2)}`} color="green" />
        <StatsCard icon={ArrowDownCircle} label="Saídas / Despesas" value={`R$ ${saidas.toFixed(2)}`} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Wallet size={18} className="text-brand-primary" />Lançamentos do Dia</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Forma PGTO</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-500">Valor</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {doDia.length === 0 ? <tr><td colSpan={4} className="text-center py-10 text-slate-400">Nenhum lançamento hoje.</td></tr>
                    : doDia.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-slate-500 text-xs font-mono">{l.criado_em ? new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{l.descricao}</td>
                        <td className="px-4 py-3"><Badge color={l.forma_pagamento === 'PIX' ? 'green' : l.forma_pagamento?.includes('Cartão') ? 'blue' : 'gray'}>{l.forma_pagamento}</Badge></td>
                        <td className={`px-4 py-3 text-right font-bold ${l.tipo === 'SAIDA' ? 'text-red-500' : 'text-emerald-600'}`}>{l.tipo === 'SAIDA' ? '- ' : '+ '}R$ {(l.valor ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full bg-brand-light/30 border-brand-primary/20">
            <h3 className="font-bold text-slate-800 mb-6 text-center">Resumo Fechamento</h3>
            <div className="space-y-4">
              {PAGAMENTOS.map(f => (
                <div key={f} className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                  <span className="text-slate-600 font-medium">{f}</span>
                  <span className="font-bold text-slate-800">R$ {porForma(f).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
              <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total do Dia</p>
              <p className="text-center text-4xl font-black text-brand-primary">R$ {totalDia.toFixed(2)}</p>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={tipo === 'ENTRADA' ? 'Nova Entrada (Recebimento)' : 'Nova Saída (Despesa)'}>
        <div className="space-y-4">
          <InputField label="Descrição do Lançamento" required placeholder="Ex: Pagamento de consulta, Compra de materiais..." value={descricao} onChange={e => setDescricao(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Valor (R$)" type="number" required placeholder="0.00" value={valor} onChange={e => setValor(e.target.value)} />
            <SelectField label="Forma de Pagamento" required value={forma} onChange={e => setForma(e.target.value)}>
              {PAGAMENTOS.map(p => <option key={p}>{p}</option>)}
              {tipo === 'SAIDA' && <option>Boleto / Transferência</option>}
            </SelectField>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn className={tipo === 'SAIDA' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white border-none'} onClick={salvar}>
              {tipo === 'ENTRADA' ? 'Gravar Entrada' : 'Gravar Saída'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
