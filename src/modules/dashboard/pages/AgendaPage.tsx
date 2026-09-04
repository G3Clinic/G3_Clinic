import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Filter, Clock, ChevronLeft, ChevronRight, Save, Trash2, UserPlus, CalendarCheck, X } from 'lucide-react';
import { PageHeader, Card, Btn, Modal, InputField, SelectField } from '../../../components/ui/shared';
import {
  agendamentosApi, pacientesApi, salasApi, procedimentosApi, conveniosApi, usuariosApi,
  type APIAgendamento, type APIPaciente, type APISala, type APIProcedimento, type APIConvenio, type APIUsuario,
} from '../../../services/api';
import { cpfValido, formatarCpf } from '../../../utils/cpf';
import { useAuth } from '../../../contexts/AuthContext';

const HORARIOS = Array.from({ length: 14 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
const DIAS_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const DIAS_LABEL_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
type Visao = 'dia' | 'semana' | 'mes';
const CORES_SALA = ['bg-emerald-100 border-emerald-300', 'bg-blue-100 border-blue-300', 'bg-amber-100 border-amber-300', 'bg-purple-100 border-purple-300', 'bg-rose-100 border-rose-300'];
const STATUS = ['Agendado', 'Confirmado', 'Em atendimento', 'Finalizado', 'Cancelado'];
const PAGAMENTOS = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Convênio'];

function segundaFeira(d: Date): Date {
  const r = new Date(d);
  const dia = (r.getDay() + 6) % 7; // 0 = segunda
  r.setDate(r.getDate() - dia);
  r.setHours(0, 0, 0, 0);
  return r;
}
const addDias = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
// Data local (YYYY-MM-DD) — NÃO usar toISOString (converte p/ UTC e erra o dia em fuso negativo).
const fmtISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtBR = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

// Layout de calendário: altura de cada faixa de 1h (px) e primeira hora da grade.
const ROW_H = 56;            // = h-14
const PRIMEIRA_HORA = 7;
const minutos = (t?: string | null) => {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Posiciona os agendamentos de um dia em "faixas" (lanes) para que atendimentos
// sobrepostos fiquem lado a lado, e cada um vire uma barra vertical contínua.
type BarraAg<T> = { a: T; ini: number; fim: number; lane: number; lanes: number };
function layoutDia<T extends { hora_inicio?: string | null; hora_fim?: string | null }>(appts: T[], getOrdem?: (a: T) => number): BarraAg<T>[] {
  const items = appts.map(a => {
    const ini = minutos(a.hora_inicio);
    let fim = a.hora_fim ? minutos(a.hora_fim) : ini + 60;
    if (fim <= ini) fim = ini + 60;
    return { a, ini, fim };
  }).sort((x, y) => x.ini - y.ini || x.fim - y.fim);

  const out: BarraAg<T>[] = [];
  let i = 0;
  while (i < items.length) {
    // agrupa em "cluster" de sobreposição encadeada
    const cluster = [items[i]];
    let clusterFim = items[i].fim;
    let j = i + 1;
    while (j < items.length && items[j].ini < clusterFim) {
      cluster.push(items[j]);
      clusterFim = Math.max(clusterFim, items[j].fim);
      j++;
    }
    if (getOrdem) {
      cluster.sort((x, y) => getOrdem(x.a) - getOrdem(y.a) || x.ini - y.ini);
    }
    // distribui em lanes dentro do cluster
    const laneFim: number[] = [];
    const laneDe = new Map<typeof cluster[number], number>();
    for (const it of cluster) {
      let lane = laneFim.findIndex(f => f <= it.ini);
      if (lane === -1) { lane = laneFim.length; laneFim.push(it.fim); }
      else laneFim[lane] = it.fim;
      laneDe.set(it, lane);
    }
    const lanes = laneFim.length;
    for (const it of cluster) out.push({ ...it, lane: laneDe.get(it)!, lanes });
    i = j;
  }
  return out;
}

// Faixa de horas [inicio, fim] que um agendamento ocupa na grade.
// Ex.: 07:00–10:30 → [7, 10] (ocupa 7,8,9,10). Fim exato na hora (10:00) não
// ocupa a faixa das 10h. Sem hora_fim, ocupa apenas a hora inicial.
const faixaHoras = (ini?: string | null, fim?: string | null): [number, number] => {
  const hi = parseInt((ini || '0').slice(0, 2), 10) || 0;
  if (!fim) return [hi, hi];
  const [fh, fm] = fim.split(':').map(Number);
  let hf = fm > 0 ? fh : fh - 1;
  if (Number.isNaN(hf) || hf < hi) hf = hi;
  return [hi, hf];
};

type Form = {
  paciente_id: string; profissional_id: string; sala_id: string; procedimento_id: string;
  convenio_id: string; data_agendamento: string; hora_inicio: string; hora_fim: string;
  status: string; forma_pagamento: string; valor_cobrado: string; observacoes: string;
};
const FORM_VAZIO: Form = {
  paciente_id: '', profissional_id: '', sala_id: '', procedimento_id: '', convenio_id: '',
  data_agendamento: '', hora_inicio: '', hora_fim: '', status: 'Agendado',
  forma_pagamento: '', valor_cobrado: '', observacoes: '',
};

export function AgendaPage() {
  const { user } = useAuth();
  const [visao, setVisao] = useState<Visao>('semana');
  const [cursor, setCursor] = useState(() => new Date());
  const semana = segundaFeira(cursor);
  const [filtroSala, setFiltroSala] = useState('all');

  const [agendamentos, setAgendamentos] = useState<APIAgendamento[]>([]);
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [salas, setSalas] = useState<APISala[]>([]);
  const [procedimentos, setProcedimentos] = useState<APIProcedimento[]>([]);
  const [convenios, setConvenios] = useState<APIConvenio[]>([]);
  const [profissionais, setProfissionais] = useState<APIUsuario[]>([]);

  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const setCampo = (c: keyof Form, v: string) => setForm(prev => ({ ...prev, [c]: v }));

  // Um procedimento com profissionais_ids preenchido só aparece pro(s) profissional(is)
  // marcados no cadastro (Cadastrar Atendimentos) — evita a recepção escolher, por engano,
  // o atendimento de outro profissional com valor diferente. Sem profissional selecionado
  // ainda, mostra tudo (senão o campo Procedimento ficaria vazio até escolher o médico).
  const procedimentosDoProfissional = (profissionalId: string) =>
    procedimentos.filter(p => !profissionalId || !p.profissionais_ids?.length || p.profissionais_ids.includes(profissionalId));

  const handleProfissionalChange = (profId: string) => {
    setForm(prev => {
      const disponiveis = procedimentosDoProfissional(profId);
      // Se o procedimento já escolhido não é mais válido pro novo profissional, limpa.
      const aindaValido = !prev.procedimento_id || disponiveis.some(p => p.id === prev.procedimento_id);
      return { ...prev, profissional_id: profId, ...(aindaValido ? {} : { procedimento_id: '' }) };
    });
  };

  const handleProcedimentoChange = (procId: string) => {
    const proc = procedimentos.find(p => p.id === procId);
    setForm(prev => {
      const updates: Partial<Form> = { procedimento_id: procId };
      if (proc) {
        updates.valor_cobrado = proc.valor_padrao != null ? String(proc.valor_padrao) : '';
        if (prev.hora_inicio && proc.duracao) {
          const [h, m] = prev.hora_inicio.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            const totalMin = h * 60 + m + proc.duracao;
            const endH = Math.floor(totalMin / 60);
            const endM = totalMin % 60;
            updates.hora_fim = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
          }
        }
      }
      return { ...prev, ...updates };
    });
  };

  const handleHoraInicioChange = (hora: string) => {
    setForm(prev => {
      const updates: Partial<Form> = { hora_inicio: hora };
      if (hora && prev.procedimento_id) {
        const proc = procedimentos.find(p => p.id === prev.procedimento_id);
        if (proc && proc.duracao) {
          const [h, m] = hora.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            const totalMin = h * 60 + m + proc.duracao;
            const endH = Math.floor(totalMin / 60);
            const endM = totalMin % 60;
            updates.hora_fim = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
          }
        }
      }
      return { ...prev, ...updates };
    });
  };

  // Criação rápida de paciente dentro do modal de agendamento
  const [novoPacOpen, setNovoPacOpen] = useState(false);
  const [novoPac, setNovoPac] = useState({ nome: '', cpf: '', telefone: '', data_nascimento: '', sexo: '' });
  const [salvandoPac, setSalvandoPac] = useState(false);
  const [erroPac, setErroPac] = useState('');
  const setNP = (c: keyof typeof novoPac, v: string) => setNovoPac(prev => ({ ...prev, [c]: v }));

  const abrirNovoPaciente = () => {
    setNovoPac({ nome: '', cpf: '', telefone: '', data_nascimento: '', sexo: '' });
    setErroPac(''); setNovoPacOpen(true);
  };

  const salvarNovoPaciente = async () => {
    setErroPac('');
    if (!novoPac.nome.trim()) { setErroPac('Nome é obrigatório.'); return; }
    if (!cpfValido(novoPac.cpf)) { setErroPac('CPF inválido.'); return; }
    setSalvandoPac(true);
    try {
      const criado = await pacientesApi.criar({
        nome: novoPac.nome.trim(), cpf: novoPac.cpf.trim(),
        telefone: novoPac.telefone.trim() || undefined,
        data_nascimento: novoPac.data_nascimento || undefined,
        sexo: novoPac.sexo || undefined,
      });
      // recarrega a lista e já seleciona o novo paciente no agendamento
      const lista = await pacientesApi.listar();
      setPacientes(lista);
      setCampo('paciente_id', String(criado.id));
      setNovoPacOpen(false);
    } catch (e) { setErroPac(e instanceof Error ? e.message : 'Erro ao criar paciente.'); }
    finally { setSalvandoPac(false); }
  };

  const carregarAg = useCallback(() => {
    agendamentosApi.listar().then(setAgendamentos).catch(e => console.error('agendamentos:', e));
  }, []);

  useEffect(() => {
    carregarAg();
    pacientesApi.listar().then(setPacientes).catch(() => {});
    salasApi.listar().then(setSalas).catch(() => {});
    procedimentosApi.listar().then(setProcedimentos).catch(() => {});
    conveniosApi.listar().then(setConvenios).catch(() => {});
    usuariosApi.listarProfissionais().then(setProfissionais).catch(() => {});
  }, [carregarAg]);

  const nomePaciente = (id?: number | null) => pacientes.find(p => p.id === id)?.nome || 'Paciente';
  const nomeProf = (id?: string | null) => profissionais.find(p => p.id === id)?.nome || '';
  const nomeProc = (id?: string | null) => procedimentos.find(p => p.id === id)?.nome || '';

  // Confirmação até 24h antes: agendamentos ainda "Agendado" (não confirmados
  // nem cancelados) cujo início cai dentro das próximas 24h a partir de agora.
  const agsPendentesConfirmacao = (() => {
    const agora = Date.now();
    const em24h = agora + 24 * 60 * 60 * 1000;
    return agendamentos
      .filter(a => (a.status || 'Agendado') === 'Agendado' && a.data_agendamento)
      .map(a => ({ a, ts: new Date(`${a.data_agendamento}T${a.hora_inicio || '00:00'}:00`).getTime() }))
      .filter(({ ts }) => !Number.isNaN(ts) && ts >= agora && ts <= em24h)
      .sort((x, y) => x.ts - y.ts)
      .map(({ a }) => a);
  })();
  const mudarStatusRapido = async (id: string, status: string) => {
    try { await agendamentosApi.atualizar(id, { status }); carregarAg(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao atualizar status.'); }
  };
  const confirmarAgendamento = (id: string) => mudarStatusRapido(id, 'Confirmado');
  const corSala = (salaId?: string | null) => {
    const idx = salas.findIndex(s => s.id === salaId);
    return idx >= 0 ? CORES_SALA[idx % CORES_SALA.length] : 'bg-slate-100 border-slate-300';
  };

  // Dias exibidos na grade de horários: 1 (dia) ou 5 (semana útil).
  const diasDaSemana = visao === 'dia'
    ? [{ label: DIAS_LABEL_SEMANA[(cursor.getDay() + 6) % 7], date: new Date(cursor), iso: fmtISO(cursor) }]
    : DIAS_LABEL.map((label, i) => ({ label, date: addDias(semana, i), iso: fmtISO(addDias(semana, i)) }));

  // Navegação sensível à visão (dia = ±1d, semana = ±7d, mês = ±1 mês).
  const navegar = (dir: number) => setCursor(prev => {
    const r = new Date(prev);
    if (visao === 'dia') r.setDate(r.getDate() + dir);
    else if (visao === 'semana') r.setDate(r.getDate() + dir * 7);
    else r.setMonth(r.getMonth() + dir);
    return r;
  });
  const irHoje = () => setCursor(new Date());

  const rotuloPeriodo = visao === 'dia'
    ? cursor.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    : visao === 'semana'
      ? `${fmtBR(semana)} – ${fmtBR(addDias(semana, 4))}`
      : cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Células do calendário do mês (semanas iniciando na segunda).
  const celulasMes = (() => {
    const primeiro = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const inicio = segundaFeira(primeiro);
    const dias: { date: Date; iso: string; doMes: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDias(inicio, i);
      dias.push({ date: d, iso: fmtISO(d), doMes: d.getMonth() === cursor.getMonth() });
    }
    return dias;
  })();
  const agsDoDia = (iso: string) => agendamentos
    .filter(a => a.data_agendamento === iso && (filtroSala === 'all' || a.sala_id === filtroSala))
    .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));

  const abrirNovo = (dataISO?: string, hora?: string) => {
    setEditandoId(null);
    let start = hora || '';
    let end = '';
    
    if (dataISO && hora) {
      const appts = agendamentos.filter(a => a.data_agendamento === dataISO && (filtroSala === 'all' || a.sala_id === filtroSala) && !['Cancelado', 'Falta'].includes(a.status || ''));
      const toMin = (h?: string | null) => {
        if (!h) return 0;
        const [hh, mm] = h.split(':').map(Number);
        return (hh || 0) * 60 + (mm || 0);
      };
      const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      
      const blockStart = toMin(hora);
      const blockEnd = blockStart + 60;
      
      const overlaps = appts.map(a => ({
        i: Math.max(blockStart, toMin(a.hora_inicio)),
        f: Math.min(blockEnd, a.hora_fim ? toMin(a.hora_fim) : toMin(a.hora_inicio) + 30)
      })).filter(x => x.i < x.f).sort((a, b) => a.i - b.i);
      
      if (overlaps.length > 0) {
        let gaps: {i: number, f: number}[] = [];
        let curr = blockStart;
        for (const o of overlaps) {
          if (o.i > curr) gaps.push({i: curr, f: o.i});
          curr = Math.max(curr, o.f);
        }
        if (curr < blockEnd) gaps.push({i: curr, f: blockEnd});
        
        if (gaps.length > 0) {
          gaps.sort((a, b) => (b.f - b.i) - (a.f - a.i));
          start = fmtMin(gaps[0].i);
          end = fmtMin(gaps[0].f);
        } else {
          start = hora;
          end = fmtMin(blockEnd);
        }
      }
    }
    
    setForm({ ...FORM_VAZIO, data_agendamento: dataISO || fmtISO(new Date()), hora_inicio: start, hora_fim: end, sala_id: filtroSala !== 'all' ? filtroSala : '' });
    setErro(''); setModal(true);
  };
  const abrirEdicao = (a: APIAgendamento) => {
    setEditandoId(a.id);
    setForm({
      paciente_id: a.paciente_id != null ? String(a.paciente_id) : '',
      profissional_id: a.profissional_id || '', sala_id: a.sala_id || '', procedimento_id: a.procedimento_id || '',
      convenio_id: a.convenio_id != null ? String(a.convenio_id) : '',
      data_agendamento: a.data_agendamento || '', hora_inicio: a.hora_inicio || '', hora_fim: a.hora_fim || '',
      status: a.status || 'Agendado', forma_pagamento: a.forma_pagamento || '',
      valor_cobrado: a.valor_cobrado != null ? String(a.valor_cobrado) : '', observacoes: a.observacoes || '',
    });
    setErro(''); setModal(true);
  };

  const salvar = async () => {
    setErro('');
    if (!form.paciente_id) { setErro('Selecione o paciente.'); return; }
    if (!form.sala_id) { setErro('Selecione a sala.'); return; }
    if (!form.data_agendamento || !form.hora_inicio) { setErro('Informe data e horário de início.'); return; }

    const sala = salas.find(x => x.id === form.sala_id);
    // Sala em manutenção não aceita agendamentos.
    if (sala?.status === 'Manutenção') {
      setErro(`A sala "${sala.nome}" está em manutenção e não aceita agendamentos.`);
      return;
    }

    // Converte HH:MM para minutos totais para comparação exata
    const toMin = (h?: string | null) => {
      if (!h) return 0;
      const [hh, mm] = h.split(':').map(Number);
      return (hh || 0) * 60 + (mm || 0);
    };

    const ni = toMin(form.hora_inicio);
    const nf = form.hora_fim ? toMin(form.hora_fim) : ni + 30; // assume 30m se não tiver fim

    // Ocupação da sala que SOBREPÕE a faixa do novo agendamento (ignora cancelados/faltas)
    const ocupacao = agendamentos.filter(a => {
      if (a.id === editandoId || a.sala_id !== form.sala_id) return false;
      if (a.data_agendamento !== form.data_agendamento) return false;
      if (['Cancelado', 'Falta'].includes(a.status || '')) return false;
      
      const ai = toMin(a.hora_inicio);
      const af = a.hora_fim ? toMin(a.hora_fim) : ai + 30;
      
      // Sobreposição: Início de um é antes do fim do outro, e vice-versa (exclusivo nos limites)
      return ai < nf && ni < af;
    }).length;
    const capacidade = sala?.capacidade && sala.capacidade > 0 ? sala.capacidade : 1;

    // Ultrapassaria a capacidade → não permite.
    if (ocupacao >= capacidade) {
      setErro(`A sala "${sala?.nome || ''}" atingiu a capacidade máxima (${capacidade}) neste horário. Escolha outra sala ou horário.`);
      return;
    }
    // Já há alguém na sala, mas ainda cabe → confirma.
    if (ocupacao >= 1) {
      const ok = window.confirm(
        `Já existe ${ocupacao === 1 ? 'um paciente' : `${ocupacao} pacientes`} nesta sala neste horário. Deseja adicionar outro? (capacidade ${capacidade})`);
      if (!ok) return;
    }
    setSalvando(true);
    try {
      const payload = {
        paciente_id: Number(form.paciente_id),
        profissional_id: form.profissional_id || undefined,
        sala_id: form.sala_id || undefined,
        procedimento_id: form.procedimento_id || undefined,
        convenio_id: form.convenio_id ? Number(form.convenio_id) : undefined,
        data_agendamento: form.data_agendamento,
        hora_inicio: form.hora_inicio, hora_fim: form.hora_fim || undefined,
        status: form.status, forma_pagamento: form.forma_pagamento || undefined,
        valor_cobrado: form.valor_cobrado ? Number(form.valor_cobrado) : undefined,
        observacoes: form.observacoes || undefined,
      };
      if (editandoId) await agendamentosApi.atualizar(editandoId, payload);
      // criado_por só é gravado na criação — usado pra apurar a comissão da
      // recepcionista em Relatórios (por consulta) por quem realmente agendou.
      else await agendamentosApi.criar({ ...payload, criado_por: user?.id });
      setModal(false); carregarAg();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar agendamento.'); }
    finally { setSalvando(false); }
  };

  const excluir = async () => {
    if (!editandoId) return;
    if (!confirm('Excluir este agendamento?')) return;
    try { await agendamentosApi.excluir(editandoId); setModal(false); carregarAg(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Calendar} title="Agenda e Ocupação" subtitle="Mapa de ocupação semanal e controle de salas">
        <div className="flex gap-2">
          <Btn variant="secondary" icon={UserPlus} onClick={abrirNovoPaciente}>Cadastrar Paciente</Btn>
          <Btn icon={Plus} onClick={() => abrirNovo()}>Novo Agendamento</Btn>
        </div>
      </PageHeader>

      {agsPendentesConfirmacao.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck size={18} className="text-amber-600" />
            <h3 className="font-bold text-amber-800 text-sm">
              {agsPendentesConfirmacao.length} consulta{agsPendentesConfirmacao.length > 1 ? 's' : ''} nas próximas 24h ainda sem confirmação
            </h3>
          </div>
          <div className="space-y-1.5">
            {agsPendentesConfirmacao.map(ag => (
              <div key={ag.id} className="flex items-center justify-between gap-3 bg-white border border-amber-100 rounded-lg px-3 py-2 text-sm">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="font-bold text-slate-700 shrink-0">{fmtBR(new Date(ag.data_agendamento + 'T00:00:00'))} {ag.hora_inicio}</span>
                  <span className="text-slate-600 truncate">{nomePaciente(ag.paciente_id)}</span>
                  {nomeProf(ag.profissional_id) && <span className="text-slate-400 text-xs truncate hidden sm:inline">• {nomeProf(ag.profissional_id)}</span>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Btn size="sm" onClick={() => confirmarAgendamento(ag.id)} className="bg-emerald-500 hover:bg-emerald-600 border-none text-white">Confirmar</Btn>
                  <Btn size="sm" variant="ghost" icon={X} onClick={() => { if (confirm('Marcar este agendamento como cancelado (paciente não confirmou)?')) mudarStatusRapido(ag.id, 'Cancelado'); }}>Não confirmou</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <Btn size="sm" variant="secondary" onClick={() => navegar(-1)}><ChevronLeft size={16} /></Btn>
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 capitalize min-w-[130px] justify-center">
              <Clock size={16} /> {rotuloPeriodo}
            </span>
            <Btn size="sm" variant="secondary" onClick={() => navegar(1)}><ChevronRight size={16} /></Btn>
            <Btn size="sm" variant="ghost" onClick={irHoje}>Hoje</Btn>
            {/* Toggle de visão: Dia / Semana / Mês */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {([['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setVisao(v)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${visao === v ? 'bg-white shadow-sm text-brand-primary' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Filter size={16} /> Sala:</span>
            <div className="flex bg-gray-100 p-1 rounded-xl flex-wrap">
              <button onClick={() => setFiltroSala('all')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filtroSala === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Todas</button>
              {salas.map(s => (
                <button key={s.id} onClick={() => setFiltroSala(s.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filtroSala === s.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>{s.nome}</button>
              ))}
            </div>
          </div>
        </div>

        {visao === 'mes' ? (
          /* ── Visão de Mês: calendário ── */
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 border-b-2 border-gray-300 pb-2 mb-2">
                {DIAS_LABEL_SEMANA.map(d => (
                  <div key={d} className="text-xs font-bold text-slate-500 text-center uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {celulasMes.map(cel => {
                  const lista = agsDoDia(cel.iso);
                  const hoje = cel.iso === fmtISO(new Date());
                  return (
                    <div key={cel.iso} onClick={() => abrirNovo(cel.iso, '')}
                      className={`min-h-[92px] rounded-lg border p-1 cursor-pointer transition-colors ${cel.doMes ? 'bg-white border-gray-200 hover:bg-brand-light/10' : 'bg-gray-50/60 border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <button onClick={e => { e.stopPropagation(); setCursor(cel.date); setVisao('dia'); }}
                          className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${hoje ? 'bg-brand-primary text-white' : cel.doMes ? 'text-slate-600 hover:bg-gray-100' : 'text-slate-300'}`}>
                          {cel.date.getDate()}
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {lista.slice(0, 3).map(ag => (
                          <div key={ag.id} onClick={e => { e.stopPropagation(); abrirEdicao(ag); }}
                            title={`${nomePaciente(ag.paciente_id)} • ${ag.hora_inicio || ''}`}
                            className={`rounded px-1 py-0.5 border truncate text-[9px] font-semibold text-slate-700 hover:shadow-sm ${corSala(ag.sala_id)}`}>
                            {ag.hora_inicio ? ag.hora_inicio + ' ' : ''}{nomePaciente(ag.paciente_id)}
                          </div>
                        ))}
                        {lista.length > 3 && (
                          <button onClick={e => { e.stopPropagation(); setCursor(cel.date); setVisao('dia'); }}
                            className="text-[9px] font-bold text-brand-primary hover:underline px-1">+{lista.length - 3} mais</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── Visão de Dia / Semana: grade de horários ── */
          <div className="flex-1 overflow-x-auto">
            <div style={{ minWidth: visao === 'dia' ? 320 : 700 }}>
              <div className="grid border-b-2 border-gray-300 pb-2 mb-2" style={{ gridTemplateColumns: `60px repeat(${diasDaSemana.length}, minmax(0, 1fr))` }}>
                <div className="text-xs font-bold text-slate-400 text-center">Hora</div>
                {diasDaSemana.map(d => (
                  <div key={d.iso} className="text-sm font-bold text-slate-700 text-center uppercase tracking-wider">
                    {d.label}<span className="block text-[10px] text-slate-400 font-medium">{fmtBR(d.date)}</span>
                  </div>
                ))}
              </div>
              <div className="flex">
                {/* Coluna de horas */}
                <div className="shrink-0" style={{ width: 60 }}>
                  {HORARIOS.map(hora => (
                    <div key={hora} style={{ height: ROW_H }} className="text-xs text-slate-500 text-center pt-1 font-medium">{hora}</div>
                  ))}
                </div>
                {/* Área dos dias: células de fundo (criar) + barras dos agendamentos */}
                <div className="relative flex-1" style={{ height: HORARIOS.length * ROW_H }}>
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${diasDaSemana.length}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${HORARIOS.length}, ${ROW_H}px)` }}>
                    {HORARIOS.map(hora => diasDaSemana.map(d => (
                      <div key={`${hora}-${d.iso}`} onClick={() => abrirNovo(d.iso, hora)}
                        className="border-l border-b border-gray-200 hover:bg-brand-light/10 cursor-pointer" />
                    )))}
                  </div>
                  {diasDaSemana.map((d, di) => {
                    const appts = agendamentos.filter(a =>
                      a.data_agendamento === d.iso && (filtroSala === 'all' || a.sala_id === filtroSala));
                    const N = diasDaSemana.length;
                    const colW = 100 / N;
                    const totalH = HORARIOS.length * ROW_H;
                    const getOrdemSala = (a: APIAgendamento) => {
                      const idx = salas.findIndex(s => s.id === a.sala_id);
                      return idx >= 0 ? idx : 999;
                    };
                    return layoutDia(appts, getOrdemSala).map(({ a: ag, ini, fim, lane, lanes }) => {
                      const top = Math.max(0, (ini / 60 - PRIMEIRA_HORA) * ROW_H);
                      const altura = Math.min((fim - ini) / 60 * ROW_H, totalH - top);
                      const left = di * colW + (lane / lanes) * colW;
                      const width = colW / lanes;
                      const sala = salas.find(s => s.id === ag.sala_id);
                      const prof = nomeProf(ag.profissional_id);
                      return (
                        <div key={ag.id} onClick={e => { e.stopPropagation(); abrirEdicao(ag); }}
                          title={`${nomePaciente(ag.paciente_id)}${prof ? ' • ' + prof : ''}${sala ? ' • ' + sala.nome : ''} • ${ag.hora_inicio || ''}${ag.hora_fim ? '–' + ag.hora_fim : ''}`}
                          style={{ position: 'absolute', top: top + 1, height: Math.max(altura - 2, 16), left: `calc(${left}% + 2px)`, width: `calc(${width}% - 14px)` }}
                          className={`rounded-md border-2 px-1 py-0.5 overflow-hidden hover:shadow-md hover:z-30 transition-shadow z-20 ${corSala(ag.sala_id)}`}>
                          <p className="text-[9px] font-bold text-slate-800 leading-tight truncate">{nomePaciente(ag.paciente_id)}</p>
                          <p className="text-[8px] text-slate-600 leading-tight truncate">{ag.hora_inicio || ''}{ag.hora_fim ? '–' + ag.hora_fim : ''}</p>
                          {altura > 44 && <p className="text-[8px] text-slate-500 leading-tight truncate">{prof || nomeProc(ag.procedimento_id) || ag.status}</p>}
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editandoId ? 'Editar Agendamento' : 'Novo Agendamento'}>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SelectField label="Paciente *" required value={form.paciente_id} onChange={e => setCampo('paciente_id', e.target.value)} disabled={!!editandoId}>
                <option value="">Selecione o paciente...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome} — {p.cpf}</option>)}
              </SelectField>
            </div>
            {!editandoId && <Btn variant="secondary" icon={UserPlus} onClick={abrirNovoPaciente} className="shrink-0">Novo</Btn>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Status" value={form.status} onChange={e => setCampo('status', e.target.value)}>
              {STATUS.map(s => <option key={s}>{s}</option>)}
            </SelectField>
            <SelectField label="Profissional" value={form.profissional_id} onChange={e => handleProfissionalChange(e.target.value)}>
              <option value="">Selecione...</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Sala *" required value={form.sala_id} onChange={e => setCampo('sala_id', e.target.value)}>
              <option value="">Selecione...</option>
              {salas.map(s => (
                <option key={s.id} value={s.id} disabled={s.status === 'Manutenção'}>
                  {s.nome}{s.capacidade ? ` (cap. ${s.capacidade})` : ''}{s.status === 'Manutenção' ? ' — em manutenção' : ''}
                </option>
              ))}
            </SelectField>
            <SelectField label="Procedimento" value={form.procedimento_id} onChange={e => handleProcedimentoChange(e.target.value)}>
              <option value="">Selecione...</option>
              {procedimentosDoProfissional(form.profissional_id).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </SelectField>
            {!form.profissional_id && procedimentos.some(p => p.profissionais_ids?.length) && (
              <p className="col-span-2 -mt-2 text-[11px] text-slate-400">Selecione o profissional para ver só os atendimentos liberados para ele.</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <InputField label="Data *" type="date" required value={form.data_agendamento} onChange={e => setCampo('data_agendamento', e.target.value)} />
            <InputField label="Início *" type="time" required value={form.hora_inicio} onChange={e => handleHoraInicioChange(e.target.value)} />
            <InputField label="Fim" type="time" value={form.hora_fim} onChange={e => setCampo('hora_fim', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações</label>
            <textarea rows={2} placeholder="Anotações adicionais..." value={form.observacoes} onChange={e => setCampo('observacoes', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <SelectField label="Convênio" value={form.convenio_id} onChange={e => setCampo('convenio_id', e.target.value)}>
              <option value="">Particular</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </SelectField>
            <SelectField label="Forma de Pagamento" value={form.forma_pagamento} onChange={e => setCampo('forma_pagamento', e.target.value)}>
              <option value="">—</option>
              {PAGAMENTOS.map(p => <option key={p}>{p}</option>)}
            </SelectField>
            <InputField label="Valor Cobrado (R$)" type="number" step="0.01" placeholder="0.00" value={form.valor_cobrado} onChange={e => setCampo('valor_cobrado', e.target.value)} />
          </div>
          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
          <div className="pt-4 flex justify-between items-center border-t border-gray-100">
            {editandoId ? (
              <button onClick={excluir} className="text-red-500 hover:text-red-700 text-sm font-semibold flex items-center gap-1"><Trash2 size={14} /> Excluir</button>
            ) : <span />}
            <div className="flex gap-3">
              <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn icon={Save} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Agendamento'}</Btn>
            </div>
          </div>
        </div>
      </Modal>

      {/* Criação rápida de paciente (sem sair do agendamento) */}
      <Modal open={novoPacOpen} onClose={() => setNovoPacOpen(false)} title="Novo Paciente (rápido)">
        <div className="space-y-4">
          <InputField label="Nome Completo *" required placeholder="Nome do paciente" value={novoPac.nome} onChange={e => setNP('nome', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="CPF *" required placeholder="000.000.000-00" maxLength={14} value={novoPac.cpf} onChange={e => setNP('cpf', formatarCpf(e.target.value))} />
            <InputField label="Celular / WhatsApp" placeholder="(00) 00000-0000" value={novoPac.telefone} onChange={e => setNP('telefone', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Data de Nascimento" type="date" value={novoPac.data_nascimento} onChange={e => setNP('data_nascimento', e.target.value)} />
            <SelectField label="Sexo" value={novoPac.sexo} onChange={e => setNP('sexo', e.target.value)}>
              <option value="">Selecione...</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </SelectField>
          </div>
          <p className="text-[11px] text-slate-500">Dados essenciais para agendar. Você pode completar o cadastro depois em Pacientes.</p>
          {erroPac && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erroPac}</div>}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setNovoPacOpen(false)}>Cancelar</Btn>
            <Btn icon={Save} onClick={salvarNovoPaciente} disabled={salvandoPac}>{salvandoPac ? 'Salvando...' : 'Criar e Selecionar'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
