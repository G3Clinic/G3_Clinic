import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Btn, Modal, InputField } from '../../../components/ui/shared';
import { FileSignature, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { fechamentosApi, filialStore, type APIFechamentoCaixa } from '../../../services/api';

export function FechamentosPage() {
  const [fechamentos, setFechamentos] = useState<APIFechamentoCaixa[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [senha, setSenha] = useState('');
  const [fechamentoAtivo, setFechamentoAtivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erroCarregar, setErroCarregar] = useState('');

  const { user } = useAuth();

  // Mesma lógica de permissão do Sidebar (temPermissao): dono/admin sempre têm acesso;
  // demais precisam do módulo "fechamentos" liberado na unidade ativa.
  const unidadeAtiva = filialStore.get();
  const temAcesso = user?.is_dono || user?.role === 'administrador' ||
    (!!unidadeAtiva && (user?.permissoes || []).some(p => String(p.unidade_id) === unidadeAtiva && p.modulo === 'fechamentos'));

  const carregar = useCallback(async () => {
    if (!temAcesso) return;
    setErroCarregar('');
    try {
      const data = await fechamentosApi.pendentes();
      setFechamentos(data);
    } catch (e) {
      setErroCarregar(e instanceof Error ? e.message : 'Erro ao carregar fechamentos.');
    }
  }, [temAcesso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirConfirmacao = (id: string) => {
    setFechamentoAtivo(id);
    setSenha('');
    setModalOpen(true);
  };

  const confirmar = async () => {
    if (!senha) {
      alert('Digite sua senha para confirmar.');
      return;
    }
    if (!fechamentoAtivo) return;
    setLoading(true);
    try {
      await fechamentosApi.confirmar(fechamentoAtivo, senha);
      alert('Fechamento confirmado com sucesso!');
      await fechamentosApi.baixarPdf(fechamentoAtivo).catch(() => {});
      setModalOpen(false);
      carregar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao processar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const baixarPDF = (id: string) => {
    fechamentosApi.baixarPdf(id).catch(e => alert(e instanceof Error ? e.message : 'Erro ao baixar PDF.'));
  };

  if (!temAcesso) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p>Você não tem acesso a esta página. Fale com o administrador para liberar o módulo "Meus Fechamentos".</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileSignature}
        title="Meus Fechamentos"
        subtitle="Confirmação e assinatura eletrônica de repasses"
      />

      {erroCarregar && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{erroCarregar}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fechamentos.map(f => (
          <Card key={f.id} className="relative overflow-hidden group hover:border-brand-primary transition-colors">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Data do Fechamento</p>
                <p className="text-lg font-black text-slate-800">{new Date(f.data_fechamento).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Clock size={14} /> PENDENTE
              </div>
            </div>

            <div className="py-4 border-y border-dashed border-gray-200 my-4">
              <p className="text-sm text-slate-500 text-center uppercase tracking-wider mb-1">Valor do Repasse</p>
              <p className="text-3xl text-center font-black text-brand-primary">R$ {f.valor_total.toFixed(2)}</p>
            </div>

            <div className="flex gap-3">
              <Btn onClick={() => abrirConfirmacao(f.id)} className="w-full bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-emerald-500/20" icon={CheckCircle}>
                Assinar e Aceitar
              </Btn>
              <Btn variant="secondary" onClick={() => baixarPDF(f.id)} title="Baixar PDF"><Download size={16} /></Btn>
            </div>
          </Card>
        ))}

        {fechamentos.length === 0 && !erroCarregar && (
          <div className="col-span-full py-12 text-center text-slate-400">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-300" />
            <h3 className="text-lg font-medium text-slate-600">Tudo certo por aqui!</h3>
            <p>Você não possui nenhum fechamento pendente de assinatura no momento.</p>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Assinatura Eletrônica">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
            <p className="font-bold mb-1">Confirmação de Aceite</p>
            <p>Ao informar sua senha, você assina digitalmente este recibo de repasse, gerando um registro inalterável com seu IP e timestamp.</p>
          </div>

          <InputField
            label="Senha de Acesso"
            type="password"
            required
            placeholder="Sua senha de login"
            value={senha}
            onChange={e => setSenha(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalOpen(false)} disabled={loading}>Cancelar</Btn>
            <Btn className="bg-brand-primary hover:bg-brand-secondary text-white" onClick={confirmar} disabled={loading}>
              {loading ? 'Assinando...' : 'Assinar Digitalmente'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
