import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Clock, CheckCircle2, UserX, UserCheck, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader, Card, StatsCard, Badge, Modal, InputField, SelectField, Btn } from '../../../components/ui/shared';
import {
  agendamentosApi, pacientesApi, procedimentosApi, conveniosApi, usuariosApi, recebimentosApi, finalizarAtendimento, pacienteStore,
  type APIAgendamento, type APIPaciente, type APIProcedimento, type APIConvenio, type APIUsuario,
} from '../../../services/api';

const CORES_STATUS: Record<string, 'blue' | 'yellow' | 'green' | 'red' | 'gray'> = {
  'Agendado': 'gray', 'Confirmado': 'blue', 'Aguardando na Recepção': 'yellow',
  'Em Atendimento': 'green', 'Finalizado': 'blue', 'Falta': 'red', 'Cancelado': 'red',
};
const PAGAMENTOS = ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito'];

export function RecepcaoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const hasProntuario = user?.is_dono || user?.role === 'administrador' || user?.permissoes?.some(p => p.modulo === 'prontuario');
  // Profissional de saúde (não dono/admin) só pode ver os próprios pacientes na fila —
  // recepcionista/admin/dono continuam vendo todos, pois coordenam a agenda de todos os médicos.
  const restritoAoProprioProfissional = user?.role === 'profissional_saude' && !user?.is_dono;

  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().slice(0, 10));
  const [ags, setAgs] = useState<APIAgendamento[]>([]);
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [procedimentos, setProcedimentos] = useState<APIProcedimento[]>([]);
  const [convenios, setConvenios] = useState<APIConvenio[]>([]);
  const [profissionais, setProfissionais] = useState<APIUsuario[]>([]);

  const [recebimentos, setRecebimentos] = useState<any[]>([]);
  const [pagModal, setPagModal] = useState(false);
  const [pagAg, setPagAg] = useState<APIAgendamento | null>(null);
  const [pagValor, setPagValor] = useState('');
  const [pagForma, setPagForma] = useState('Dinheiro');

  const carregar = useCallback(() => {
    agendamentosApi.listar().then(setAgs).catch(() => {});
    recebimentosApi.listar().then(setRecebimentos).catch(() => {});
  }, []);
  useEffect(() => {
    carregar();
    pacientesApi.listar().then(setPacientes).catch(() => {});
    procedimentosApi.listar().then(setProcedimentos).catch(() => {});
    conveniosApi.listar().then(setConvenios).catch(() => {});
    usuariosApi.listar().then(setProfissionais).catch(() => {});
  }, [carregar]);

  // Um atendimento está "pago" se há recebimento RECEBIDO para o agendamento.
  const estaPago = (agId: string) =>
    recebimentos.some((r: any) => r.agendamento_id === agId && (r.status || '').toUpperCase() === 'RECEBIDO');

  // Libera para a sala só com pagamento (convênio é exceção — não paga na hora).
  const iniciarAtendimento = (a: APIAgendamento) => {
    if (!a.convenio_id && !estaPago(a.id)) {
      alert('Registre o pagamento antes de liberar o paciente para a sala de atendimento.');
      abrirPagamento(a);
      return;
    }
    mudarStatus(a, 'Em Atendimento');
  };

  const pac = (id?: number | null) => pacientes.find(p => p.id === id);
  const nomeProf = (id?: string | null) => profissionais.find(p => p.id === id)?.nome || '—';
  const nomeProc = (id?: string | null) => procedimentos.find(p => p.id === id)?.nome || '—';
  const nomeConv = (id?: number | null) => convenios.find(c => c.id === id)?.nome || 'Particular';

  const doDia = ags.filter(a => a.data_agendamento === dataFiltro)
    .filter(a => !restritoAoProprioProfissional || a.profissional_id === user?.id)
    .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));

  const cont = (st: string[]) => doDia.filter(a => st.includes(a.status || 'Agendado')).length;

  const mudarStatus = async (a: APIAgendamento, status: string) => {
    try { await agendamentosApi.atualizar(a.id, { status }); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
  };

  // Finalizar: caixa só se pago; senão vira "pendente de pagamento" (via backend)
  const finalizar = async (a: APIAgendamento) => {
    try {
      const r = await finalizarAtendimento(a.id);
      carregar();
      if (r.status_pagamento === 'pago') alert('Atendimento finalizado e lançado no caixa do dia.');
      else alert('Atendimento finalizado — PENDENTE DE PAGAMENTO. Dê baixa em Financeiro → Recebimentos quando o paciente pagar.');
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao finalizar atendimento.'); }
  };

  const abrirPagamento = (a: APIAgendamento) => {
    setPagAg(a); setPagValor(a.valor_cobrado != null ? String(a.valor_cobrado) : ''); setPagForma('Dinheiro'); setPagModal(true);
  };
  const confirmarPagamento = async () => {
    if (!pagAg) return;
    try {
      await recebimentosApi.criar({
        agendamento_id: pagAg.id, valor: pagValor ? Number(pagValor) : undefined,
        forma_pagamento: pagForma, status: 'RECEBIDO', data_recebimento: dataFiltro,
      });
      setPagModal(false); carregar();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao registrar pagamento.'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Stethoscope} title="Recepção e Fila de Espera" subtitle="Controle do fluxo de pacientes do dia" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={Clock} label="Agendados" value={String(cont(['Agendado', 'Confirmado']))} color="blue" />
        <StatsCard icon={UserCheck} label="Na Recepção" value={String(cont(['Aguardando na Recepção']))} color="yellow" />
        <StatsCard icon={Stethoscope} label="Em Atendimento" value={String(cont(['Em Atendimento']))} color="green" />
        <StatsCard icon={UserX} label="Faltas / Cancelados" value={String(cont(['Falta', 'Cancelado']))} color="red" />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="font-bold text-slate-800">Fila do Dia</h3>
          <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-primary" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Hora', 'Paciente', 'Profissional / Procedimento', 'Convênio', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {doDia.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">Nenhum agendamento para esta data.</td></tr>
              ) : doDia.map(a => {
                const p = pac(a.paciente_id);
                const st = a.status || 'Agendado';
                return (
                  <tr key={a.id} className={`hover:bg-gray-50 ${st === 'Em Atendimento' ? 'bg-brand-light/30 border-l-2 border-l-brand-primary' : st === 'Aguardando na Recepção' ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-4 font-bold text-slate-700">{a.hora_inicio || '—'}</td>
                    <td className="px-4 py-4"><p className="font-bold text-slate-800">{p?.nome || 'Paciente'}</p><p className="text-xs text-slate-500">{p?.telefone || ''}</p></td>
                    <td className="px-4 py-4"><p className="font-semibold text-slate-700">{nomeProf(a.profissional_id)}</p><p className="text-xs text-slate-500">{nomeProc(a.procedimento_id)}</p></td>
                    <td className="px-4 py-4"><Badge color={a.convenio_id ? 'blue' : 'gray'}>{nomeConv(a.convenio_id)}</Badge></td>
                    <td className="px-4 py-4"><Badge color={CORES_STATUS[st] || 'gray'}>{st}</Badge></td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        {hasProntuario && (
                        <button title="Ficha do Paciente" onClick={() => { if (p) pacienteStore.set({ id: Number(p.id), nome: p.nome }); navigate('/dashboard/pacientes'); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"><FileText size={18} /></button>
                      )}
                        {['Agendado', 'Confirmado'].includes(st) && <button title="Marcar Presença" onClick={() => mudarStatus(a, 'Aguardando na Recepção')} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded transition-colors"><UserCheck size={18} /></button>}
                        {st === 'Aguardando na Recepção' && <button title={a.convenio_id || estaPago(a.id) ? 'Iniciar Atendimento' : 'Requer pagamento antes de liberar'} onClick={() => iniciarAtendimento(a)} className={`p-1.5 rounded transition-colors ${a.convenio_id || estaPago(a.id) ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-amber-50'}`}><Stethoscope size={18} /></button>}
                        {st === 'Em Atendimento' && <button title="Finalizar (lança no caixa)" onClick={() => finalizar(a)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"><CheckCircle2 size={18} /></button>}
                        {!['Finalizado', 'Cancelado', 'Falta'].includes(st) && <button title="Registrar Pagamento" onClick={() => abrirPagamento(a)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"><DollarSign size={18} /></button>}
                        {['Agendado', 'Confirmado'].includes(st) && <button title="Cancelar/Falta" onClick={() => mudarStatus(a, 'Falta')} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"><UserX size={18} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={pagModal} onClose={() => setPagModal(false)} title="Registrar Pagamento">
        <div className="space-y-4">
          <InputField label="Paciente" value={pac(pagAg?.paciente_id)?.nome || ''} disabled />
          <InputField label="Valor a Pagar (R$)" type="number" placeholder="0.00" required value={pagValor} onChange={e => setPagValor(e.target.value)} />
          <SelectField label="Forma de Pagamento" required value={pagForma} onChange={e => setPagForma(e.target.value)}>
            {PAGAMENTOS.map(p => <option key={p}>{p}</option>)}
          </SelectField>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setPagModal(false)}>Cancelar</Btn>
            <Btn onClick={confirmarPagamento} className="bg-emerald-500 hover:bg-emerald-600 border-none text-white" icon={CheckCircle2}>Confirmar Pagamento</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
