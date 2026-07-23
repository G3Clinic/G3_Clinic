import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader, Card, Btn, Modal } from '../../../components/ui/shared';
import { Activity, X, User, CheckCircle, FileText, MousePointer2, Search, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import {
  especialidadesApi, odontoProcApi, pacientesApi, orcamentosApi, orcamentoItensApi,
  finalizarOrcamento, pacienteStore,
  type APIEspecialidade, type APIOdontoProc, type APIPaciente, type APIOrcamento, type APIOrcamentoItem,
} from '../../../services/api';
import './odontograma.css';

const PERM_SUP = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
const PERM_INF = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];
const DEC_SUP  = [55,54,53,52,51, 61,62,63,64,65];
const DEC_INF  = [85,84,83,82,81, 71,72,73,74,75];

// Dentes anteriores (incisivos/caninos) têm face Incisal em vez de Oclusal
const DENTES_INCISAL = [11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63,71,72,73,81,82,83];

const COR_STATUS: Record<string, string> = { a_realizar: '#ef4444', executado: '#22c55e', existente: '#3b82f6' };
const LABEL_STATUS: Record<string, string> = { a_realizar: 'A realizar', executado: 'Executado', existente: 'Existente' };

// css da cruzeta ↔ código de face
const FACES_RENDER = [
  { css: 'top',    codes: ['V'], l: 'Vestibular' },
  { css: 'bottom', codes: ['L'], l: 'Lingual/Palatina' },
  { css: 'left',   codes: ['M'], l: 'Mesial' },
  { css: 'right',  codes: ['D'], l: 'Distal' },
  { css: 'center', codes: ['O', 'I'], l: 'Oclusal/Incisal' },
];

const facesDoDente = (num: number) =>
  DENTES_INCISAL.includes(num)
    ? [{ c: 'V', l: 'Vestibular' }, { c: 'L', l: 'Lingual/Palatina' }, { c: 'M', l: 'Mesial' }, { c: 'D', l: 'Distal' }, { c: 'I', l: 'Incisal' }]
    : [{ c: 'V', l: 'Vestibular' }, { c: 'L', l: 'Lingual/Palatina' }, { c: 'M', l: 'Mesial' }, { c: 'D', l: 'Distal' }, { c: 'O', l: 'Oclusal' }];

type CartItem = {
  id: string; dente: number; faces: string[]; facesLabels: string;
  proc: string; valor: number; procedimentoId: string; tipoVisual: string; statusVisual: string;
};
// estado dental: por dente, lista de marcações {faces(codes), cor, tipoVisual}
type Marca = { faces: string; cor: string; tipoVisual: string };

const FACE_POS: Record<string, { cx: number; cy: number }> = {
  'V': { cx: 50, cy: 10 },
  'L': { cx: 50, cy: 90 },
  'M': { cx: 10, cy: 50 },
  'D': { cx: 90, cy: 50 },
  'O': { cx: 50, cy: 50 },
  'I': { cx: 50, cy: 50 }
};

function RenderSimbolos({ marcas }: { marcas: Marca[] }) {
  if (!marcas || marcas.length === 0) return null;

  const prioridade: Record<string, number> = { carie: 0, restauracao: 0, provisorio: 0, coroa: 1, canal: 2, extracao: 2, ausente: 3 };
  const ordenados = [...marcas].sort((a, b) => (prioridade[a.tipoVisual] || 0) - (prioridade[b.tipoVisual] || 0));

  return (
    <svg className="odontoDenteSVG" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      {ordenados.map((s, i) => {
        const { tipoVisual, faces, cor } = s;
        if (tipoVisual === 'tratado') return <circle key={i} cx="50" cy="50" r="7" fill="#9ca3af" opacity="0.8" />;
        if (tipoVisual === 'ausente') return (
          <g key={i}>
            <line x1="10" y1="10" x2="90" y2="90" stroke="#9ca3af" strokeWidth="10" strokeLinecap="round" />
            <line x1="90" y1="10" x2="10" y2="90" stroke="#9ca3af" strokeWidth="10" strokeLinecap="round" />
          </g>
        );
        if (tipoVisual === 'extracao') return (
          <g key={i}>
            <line x1="12" y1="12" x2="88" y2="88" stroke={cor} strokeWidth="9" strokeLinecap="round" />
            <line x1="88" y1="12" x2="12" y2="88" stroke={cor} strokeWidth="9" strokeLinecap="round" />
          </g>
        );
        if (tipoVisual === 'canal') return <line key={i} x1="50" y1="5" x2="50" y2="95" stroke={cor} strokeWidth="6" strokeLinecap="round" />;
        if (tipoVisual === 'coroa') return <rect key={i} x="6" y="6" width="88" height="58" rx="4" fill="none" stroke={cor} strokeWidth="5" />;
        
        const faceList = faces ? faces.split(',').map(f => f.trim()) : ['O'];
        return (
          <g key={i}>
            {faceList.map((fc, j) => {
              const pos = FACE_POS[fc] || FACE_POS['O'];
              if (tipoVisual === 'carie' || tipoVisual === 'restauracao') return <circle key={j} cx={pos.cx} cy={pos.cy} r="12" fill={cor} />;
              if (tipoVisual === 'provisorio') return <circle key={j} cx={pos.cx} cy={pos.cy} r="11" fill="none" stroke={cor} strokeWidth="4" />;
              return null;
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function OdontogramaPage() {
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [pacienteId, setPacienteId] = useState<string>(() => {
    const p = pacienteStore.get();
    return p ? String(p.id) : '';
  });
  const [buscaPac, setBuscaPac] = useState('');
  const [trocandoPac, setTrocandoPac] = useState(false);

  const [especialidades, setEspecialidades] = useState<APIEspecialidade[]>([]);
  const [procs, setProcs] = useState<APIOdontoProc[]>([]);

  const [denteSel, setDenteSel] = useState<number | null>(null);
  const [espSel, setEspSel] = useState<string | null>(null);
  const [buscaProc, setBuscaProc] = useState('');

  const [modalIntOpen, setModalIntOpen] = useState(false);
  const [intAtual, setIntAtual] = useState<APIOdontoProc | null>(null);
  const [facesSel, setFacesSel] = useState<string[]>([]);
  const [statusSel, setStatusSel] = useState<'a_realizar' | 'executado' | 'existente'>('a_realizar');
  const [valorPaciente, setValorPaciente] = useState('');

  const [itens, setItens] = useState<CartItem[]>([]);
  const [salvando, setSalvando] = useState(false);

  // histórico + estado dental vindo de orçamentos anteriores
  const [historico, setHistorico] = useState<{ orc: APIOrcamento; itens: APIOrcamentoItem[] }[]>([]);
  const [histAberto, setHistAberto] = useState<string | null>(null);
  const [vizOrc, setVizOrc] = useState<{ orc: APIOrcamento; itens: APIOrcamentoItem[] } | null>(null);

  useEffect(() => {
    especialidadesApi.listar().then(setEspecialidades).catch(() => {});
    odontoProcApi.listar().then(setProcs).catch(() => {});
    pacientesApi.listar().then(setPacientes).catch(() => {});
    // Limpa o store após ler no useState
    if (pacienteStore.get()) pacienteStore.clear();
  }, []);

  const paciente = pacientes.find(p => String(p.id) === pacienteId) || null;

  // ── histórico e estado dental do paciente ──
  const carregarHistorico = useCallback((pid: string) => {
    if (!pid) { setHistorico([]); return; }
    Promise.all([orcamentosApi.listar().catch(() => []), orcamentoItensApi.listar().catch(() => [])])
      .then(([orcs, its]) => {
        const doPac = orcs
          .filter(o => String(o.paciente_id) === pid)
          .sort((a, b) => (b.data_criacao || '').localeCompare(a.data_criacao || ''));
        setHistorico(doPac.map(o => ({ orc: o, itens: its.filter(i => i.orcamento_id === o.id) })));
      });
  }, []);
  useEffect(() => { carregarHistorico(pacienteId); }, [pacienteId, carregarHistorico]);

  // estado acumulado (histórico) por dente
  const estadoHistorico = useMemo(() => {
    const mapa: Record<number, Marca[]> = {};
    historico.forEach(({ itens: its }) => its.forEach(it => {
      const d = Number(it.dente_numero);
      if (!d) return;
      const tv = procs.find(p => p.id === it.procedimento_id)?.tipo_visual || 'nenhum';
      mapa[d] = mapa[d] || [];
      mapa[d].push({
        faces: it.faces || '',
        cor: COR_STATUS[it.status_visual || 'a_realizar'] || COR_STATUS.a_realizar,
        tipoVisual: tv === 'nenhum' ? 'tratado' : tv
      });
    }));
    return mapa;
  }, [historico, procs]);

  // estado do carrinho atual (a_realizar por padrão, já com a cor do status escolhido)
  const estadoCarrinho = useMemo(() => {
    const mapa: Record<number, Marca[]> = {};
    itens.forEach(it => {
      const tv = it.tipoVisual || 'nenhum';
      mapa[it.dente] = mapa[it.dente] || [];
      mapa[it.dente].push({ 
        faces: it.faces.join(','), 
        cor: COR_STATUS[it.statusVisual] || COR_STATUS.a_realizar,
        tipoVisual: tv === 'nenhum' ? 'tratado' : tv
      });
    });
    return mapa;
  }, [itens]);

  // cor de cada face (css) de um dente, combinando histórico + carrinho (carrinho vence)
  const corFace = useCallback((denteNum: number, cssPos: string): string | null => {
    const codes = FACES_RENDER.find(f => f.css === cssPos)?.codes || [];
    const marcas = [...(estadoHistorico[denteNum] || []), ...(estadoCarrinho[denteNum] || [])];
    let cor: string | null = null;
    marcas.forEach(m => {
      const fs = (m.faces || '').split(/[,\s]+/).filter(Boolean);
      if (fs.some(c => codes.includes(c))) cor = m.cor;
    });
    return cor;
  }, [estadoHistorico, estadoCarrinho]);

  // ── seleção ──
  const selecionarDente = (num: number) => { setDenteSel(num); setEspSel(null); setBuscaProc(''); };

  const procsDaEsp = (espId: string) => procs.filter(p => p.especialidade_id === espId);
  const resultadosBusca = useMemo(() => {
    const q = buscaProc.trim().toLowerCase();
    if (q.length < 1) return [];
    return procs
      .filter(p => (p.nome_intervencao || '').toLowerCase().includes(q))
      .map(p => ({ proc: p, esp: especialidades.find(e => e.id === p.especialidade_id) }));
  }, [buscaProc, procs, especialidades]);

  const abrirModalIntervencao = (proc: APIOdontoProc) => {
    if (!paciente) { alert('Selecione um paciente primeiro.'); return; }
    if (!denteSel && proc.local_aplicacao !== 'arcada' && proc.local_aplicacao !== 'geral') { alert('Selecione um dente primeiro.'); return; }
    setIntAtual(proc);
    if (proc.local_aplicacao === 'dente' && denteSel) {
      setFacesSel(facesDoDente(denteSel).map(f => f.c));
    } else {
      setFacesSel([]);
    }
    setStatusSel('a_realizar');
    setValorPaciente(String(proc.valor_base ?? 0)); setModalIntOpen(true);
  };
  const toggleFaceModal = (face: string) => setFacesSel(prev => prev.includes(face) ? prev.filter(f => f !== face) : [...prev, face]);

  const gravarIntervencao = () => {
    if (!intAtual) return;
    if (!denteSel && intAtual.local_aplicacao !== 'arcada' && intAtual.local_aplicacao !== 'geral') return;
    if (intAtual.local_aplicacao === 'face' && !facesSel.length) { alert('Selecione pelo menos uma face.'); return; }
    const faces = denteSel ? facesDoDente(denteSel) : [];
    const labels = facesSel.map(c => faces.find(f => f.c === c)?.l || c).join(', ');
    setItens(prev => [...prev, {
      id: Math.random().toString(36).slice(2), dente: denteSel, faces: facesSel, facesLabels: labels,
      proc: intAtual.nome_intervencao, valor: Number(valorPaciente) || Number(intAtual.valor_base) || 0,
      procedimentoId: intAtual.id, tipoVisual: intAtual.tipo_visual || 'nenhum', statusVisual: statusSel,
    }]);
    setModalIntOpen(false); setIntAtual(null); setFacesSel([]);
  };

  const aplicarTodaArcada = () => {
    if (!intAtual) return;
    const todos = [...PERM_SUP, ...PERM_INF, ...DEC_SUP, ...DEC_INF];
    const valorBase = Number(valorPaciente) || Number(intAtual.valor_base) || 0;
    const newItens = todos.map((d, idx) => {
      const faces = facesDoDente(d);
      return {
        id: Math.random().toString(36).slice(2) + idx, 
        dente: d, 
        faces: faces.map(f => f.c), 
        facesLabels: 'Arcada Completa',
        proc: intAtual.nome_intervencao, 
        valor: idx === 0 ? valorBase : 0, 
        procedimentoId: intAtual.id, 
        tipoVisual: intAtual.tipo_visual || 'nenhum', 
        statusVisual: statusSel,
      };
    });
    setItens(prev => [...prev, ...newItens]);
    setModalIntOpen(false); setIntAtual(null); setFacesSel([]);
  };
  const removerItem = (id: string) => setItens(prev => prev.filter(i => i.id !== id));
  const total = itens.reduce((acc, it) => acc + it.valor, 0);

  const trocarPaciente = () => {
    if (itens.length && !confirm('Trocar de paciente vai limpar o orçamento atual. Continuar?')) return;
    setItens([]); setDenteSel(null); setEspSel(null); setPacienteId(''); setTrocandoPac(true); setBuscaPac('');
  };
  const escolherPaciente = (p: APIPaciente) => { setPacienteId(String(p.id)); setTrocandoPac(false); setBuscaPac(''); };

  const finalizar = async () => {
    if (!pacienteId) { alert('Selecione um paciente primeiro.'); return; }
    if (!itens.length) return;
    if (!confirm('Finalizar atendimento e enviar cobrança para o caixa?')) return;
    setSalvando(true);
    try {
      await finalizarOrcamento({
        paciente_id: Number(pacienteId), valor_total: total,
        itens: itens.map(it => ({
          dente_numero: String(it.dente), faces: it.faces.join(','),
          procedimento_id: it.procedimentoId, valor_cobrado: it.valor, status_visual: it.statusVisual,
        })),
      });
      alert('Atendimento finalizado! Recebimento pendente gerado no financeiro.');
      setItens([]); setDenteSel(null); setEspSel(null);
      carregarHistorico(pacienteId);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao salvar orçamento.'); }
    finally { setSalvando(false); }
  };

  const getMappedToothImage = (num: number, isDeciduo: boolean) => {
    if (!isDeciduo) return `/assets/images/toothImageFront${num}.png`;
    let mapped = num;
    if (num >= 51 && num <= 55) mapped = 10 + (num - 50);
    else if (num >= 61 && num <= 65) mapped = 20 + (num - 60);
    else if (num >= 71 && num <= 75) mapped = 30 + (num - 70);
    else if (num >= 81 && num <= 85) mapped = 40 + (num - 80);
    return `/assets/images/toothImageFront${mapped}.png`;
  };

  const renderLinha = (nums: number[], deciduo: boolean, id: string) => (
    <div id={id} className={`odontoLinhaDentes ${deciduo ? 'decidua' : ''}`}>
      {nums.map(num => (
        <div key={num} className={`odontoDente ${deciduo ? 'deciduo' : ''}`}
          data-dente={num} title={`Dente ${num}`} onClick={() => selecionarDente(num)}>
          <div className={`odontoDenteCirculo ${denteSel === num ? 'selecionado' : ''}`}>
            <div className="odontoDenteNum">{num}</div>
            <div className="odontoDenteImgWrap">
              <img className="odontoDenteImg" src={getMappedToothImage(num, deciduo)} alt={`Dente ${num}`} draggable={false}
                onError={e => (e.currentTarget.style.display = 'none')}
                style={deciduo ? { width: 26, height: 28, opacity: 0.8 } : undefined} />
              <RenderSimbolos marcas={[...(estadoHistorico[num] || []), ...(estadoCarrinho[num] || [])]} />
            </div>
          </div>
          <div className="odontoDenteGraf">
            {FACES_RENDER.map(face => {
              const cor = corFace(num, face.css);
              return <div key={face.css} className={`odFace ${face.css} ${cor ? 'finalizada' : ''}`}
                style={cor ? { backgroundColor: cor, opacity: 0.85 } : undefined} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const pacFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(buscaPac.toLowerCase()) || (p.cpf || '').includes(buscaPac));

  return (
    <div className="space-y-6">
      <PageHeader icon={Activity} title="Odontograma Interativo" subtitle="Dente → especialidade → intervenção → faces e status">
        <div className="flex items-center gap-3">
          {paciente ? (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
              <User size={16} className="text-brand-primary" />
              <span className="text-sm font-bold text-brand-primary">{paciente.nome}</span>
              <button onClick={trocarPaciente} className="text-xs text-slate-500 hover:text-slate-700 underline ml-1">Trocar</button>
            </div>
          ) : (
            <span className="text-sm text-slate-500">Selecione um paciente abaixo</span>
          )}
        </div>
      </PageHeader>

      {(!paciente || trocandoPac) && (
        <Card>
          <div className="relative max-w-lg">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={buscaPac} onChange={e => setBuscaPac(e.target.value)} placeholder="Buscar paciente por nome ou CPF..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-xl">
            {pacFiltrados.length === 0 ? <p className="text-sm text-slate-400 p-4 text-center">Nenhum paciente encontrado.</p>
              : pacFiltrados.slice(0, 50).map(p => (
                <button key={p.id} onClick={() => escolherPaciente(p)} className="w-full text-left px-4 py-2.5 hover:bg-brand-light/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-light text-brand-primary flex items-center justify-center font-bold text-xs">{p.nome.substring(0, 2).toUpperCase()}</div>
                  <div><p className="text-sm font-bold text-slate-800">{p.nome}</p><p className="text-xs text-slate-500">CPF: {p.cpf}</p></div>
                </button>
              ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Histórico */}
        <div className="xl:col-span-3">
          <Card padding={false} className="h-full flex flex-col overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 font-bold text-sm text-slate-700 uppercase tracking-wider">
              <FileText size={16} className="text-brand-primary" /> Histórico
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[520px]">
              {!paciente ? <div className="text-sm text-slate-400 text-center py-8 italic">Selecione um paciente</div>
                : historico.length === 0 ? <div className="text-sm text-slate-400 text-center py-8 italic">Nenhum orçamento anterior</div>
                : historico.map(({ orc, itens: its }) => {
                  const aberto = histAberto === orc.id;
                  return (
                    <div key={orc.id} className="border border-gray-100 rounded-lg overflow-hidden">
                      <button onClick={() => setHistAberto(aberto ? null : orc.id)} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 text-left">
                        {aberto ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-600">{orc.data_criacao ? new Date(orc.data_criacao).toLocaleDateString('pt-BR') : '—'}</p>
                          <p className="text-[10px] text-slate-400">{orc.status_geral || 'Finalizado'}</p>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600">R$ {Number(orc.valor_total || 0).toFixed(2).replace('.', ',')}</span>
                        <span onClick={e => { e.stopPropagation(); setVizOrc({ orc, itens: its }); }} title="Visualizar odontograma" className="p-1 text-slate-400 hover:text-brand-primary cursor-pointer"><Eye size={13} /></span>
                      </button>
                      {aberto && (
                        <div className="px-3 pb-2 space-y-1 border-t border-gray-50">
                          {its.length === 0 ? <p className="text-[10px] text-slate-400 py-1">Sem itens</p>
                            : its.map(it => (
                              <div key={it.id} className="flex items-center gap-2 text-[11px] pt-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COR_STATUS[it.status_visual || 'a_realizar'] }} />
                                <span className="font-bold text-brand-primary">D.{it.dente_numero}</span>
                                <span className="text-slate-500 truncate flex-1">{it.faces || ''}</span>
                                <span className="text-emerald-600 font-semibold">R$ {Number(it.valor_cobrado || 0).toFixed(0)}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>

        {/* Arcadas */}
        <div className="xl:col-span-9 overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="odontoPainelArcada">
            <div className="odontoLegenda">
              <span className="odontoLegItem"><span className="odontoLegBox normal"></span> Normal</span>
              <span className="odontoLegItem"><span className="odontoLegBox selecionada"></span> Selecionado</span>
              <span className="odontoLegItem"><span className="odontoLegBox" style={{ background: COR_STATUS.a_realizar }}></span> A realizar</span>
              <span className="odontoLegItem"><span className="odontoLegBox" style={{ background: COR_STATUS.executado }}></span> Executado</span>
              <span className="odontoLegItem"><span className="odontoLegBox" style={{ background: COR_STATUS.existente }}></span> Existente</span>
            </div>
            <div className="odontoArcadaLabel">ARCADA SUPERIOR — PERMANENTE</div>
            {renderLinha(PERM_SUP, false, 'odontoPermanenteSup')}
            <div className="odontoArcadaLabel decidua odontoLabelDecSup">ARCADA SUPERIOR — DECÍDUA</div>
            {renderLinha(DEC_SUP, true, 'odontoDeciduaSup')}
            <div className="odontoDivisor"></div>
            {renderLinha(DEC_INF, true, 'odontoDeciduaInf')}
            <div className="odontoArcadaLabel decidua odontoLabelDecInf">ARCADA INFERIOR — DECÍDUA</div>
            {renderLinha(PERM_INF, false, 'odontoPermanenteInf')}
            <div className="odontoArcadaLabel">ARCADA INFERIOR — PERMANENTE</div>
          </div>
        </div>

        {/* Seleção + orçamento */}
        <div className="xl:col-span-12">
          <Card padding className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <div className="p-3 bg-brand-light/30 border border-brand-primary/20 rounded-xl flex items-center justify-center gap-2 text-brand-primary mb-4">
                {denteSel ? <span className="font-bold flex items-center gap-2 text-sm"><Activity size={18} /> Dente #{denteSel} selecionado</span>
                  : <span className="font-medium flex items-center gap-2 opacity-70 text-sm"><MousePointer2 size={18} /> Clique em um dente para começar</span>}
              </div>

              {denteSel && (
                <div className="space-y-4">
                  {/* Busca rápida de procedimento */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={buscaProc} onChange={e => setBuscaProc(e.target.value)} placeholder="Buscar procedimento por nome..."
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
                    {resultadosBusca.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {resultadosBusca.map(({ proc, esp }) => (
                          <button key={proc.id} onClick={() => { setEspSel(esp?.id || null); setBuscaProc(''); abrirModalIntervencao(proc); }}
                            className="w-full text-left px-3 py-2 hover:bg-brand-light/30 flex items-center justify-between gap-2">
                            <span className="text-xs"><strong className="text-slate-700">{proc.nome_intervencao}</strong> <span className="text-slate-400">· {esp?.nome || ''}</span></span>
                            <span className="text-[10px] font-bold text-emerald-600 shrink-0">R$ {(proc.valor_base || 0).toFixed(2).replace('.', ',')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidade</h4>
                    <div className="flex flex-wrap gap-2">
                      {especialidades.length === 0 ? <span className="text-xs text-slate-400 italic">Cadastre especialidades em Administração → Proc. Odontológicos.</span>
                        : especialidades.map(esp => (
                          <button key={esp.id} onClick={() => setEspSel(esp.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${espSel === esp.id ? 'bg-brand-primary text-white shadow-sm' : 'bg-gray-50 text-slate-600 hover:bg-gray-100 border border-gray-200'}`}>
                            {esp.nome}
                          </button>
                        ))}
                    </div>
                  </div>

                  {espSel && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Intervenção</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {procsDaEsp(espSel).length === 0 ? <span className="text-xs text-slate-400 italic col-span-2">Nenhuma intervenção nesta especialidade.</span>
                          : procsDaEsp(espSel).map(inv => (
                            <button key={inv.id} onClick={() => abrirModalIntervencao(inv)}
                              className="flex flex-col items-start gap-1 p-2 rounded-lg border border-gray-200 hover:border-brand-primary hover:bg-brand-light/20 transition-all text-left group">
                              <span className="text-[11px] leading-tight font-semibold text-slate-700 group-hover:text-brand-primary">{inv.nome_intervencao}</span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">R$ {(inv.valor_base || 0).toFixed(2).replace('.', ',')}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={16} className="text-brand-primary" /> Orçamento atual</h4>
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/50 border-b border-gray-200 text-slate-500">
                    <tr><th className="px-2 py-2 font-semibold">Dente</th><th className="px-2 py-2 font-semibold">Proc.</th><th className="px-2 py-2 font-semibold">Status</th><th className="px-2 py-2 font-semibold text-right">Valor</th><th></th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itens.length === 0 ? <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400 italic">Nenhum item lançado</td></tr>
                      : itens.map(it => (
                        <tr key={it.id} className="hover:bg-white">
                          <td className="px-2 py-2 font-bold text-brand-primary">#{it.dente}</td>
                          <td className="px-2 py-2 text-slate-600 truncate max-w-[110px]" title={`${it.proc} · ${it.facesLabels}`}>{it.proc}</td>
                          <td className="px-2 py-2"><span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: COR_STATUS[it.statusVisual] }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: COR_STATUS[it.statusVisual] }} />{LABEL_STATUS[it.statusVisual]}</span></td>
                          <td className="px-2 py-2 font-bold text-emerald-600 text-right">R$ {it.valor.toFixed(2).replace('.', ',')}</td>
                          <td className="px-2 py-2 text-right"><button className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removerItem(it.id)}><X size={14} /></button></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between font-bold text-slate-800 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span>Total estimado:</span>
                <span className="text-emerald-700 text-lg">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              <Btn className="w-full flex items-center justify-center gap-2 mt-3 shadow-md shadow-brand-primary/20" size="md" disabled={!itens.length || salvando} onClick={finalizar}>
                <CheckCircle size={18} /> {salvando ? 'Salvando...' : 'Finalizar e enviar para o caixa'}
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: intervenção + faces + status */}
      {modalIntOpen && intAtual && (
        <Modal open={modalIntOpen} onClose={() => setModalIntOpen(false)} title={`${intAtual.nome_intervencao} — Dente #${denteSel}`}>
          <div className="space-y-4">
            <div className="text-center border border-gray-200 rounded-xl p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Clique nas faces afetadas</p>
              <div className="odoFacePickArea">
                <div className="odoFacePickLbl lblTop">Vestibular</div>
                <div className="odoFacePickLbl lblBottom">Lingual/<br />Palatina</div>
                <div className="odoFacePickLbl lblLeft">Mesial</div>
                <div className="odoFacePickLbl lblRight">Distal</div>
                <div className="odoFacePickCruzeta">
                  {facesDoDente(denteSel!).map(f => {
                    const css = f.c === 'V' ? 'top' : f.c === 'L' ? 'bottom' : f.c === 'M' ? 'left' : f.c === 'D' ? 'right' : 'center';
                    return <div key={f.c} className={`odFacePick ${css} ${facesSel.includes(f.c) ? 'selecionada' : ''}`} onClick={() => toggleFaceModal(f.c)} title={f.l}>
                      {(f.c === 'O' || f.c === 'I') && <span className="odFacePickCenterLbl">{f.c === 'I' ? 'Inc' : 'Ocl'}</span>}
                    </div>;
                  })}
                </div>
              </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">{denteSel && facesSel.length ? facesSel.map(c => facesDoDente(denteSel).find(f => f.c === c)?.l).join(' · ') : 'Nenhuma face selecionada'}</p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status da intervenção</p>
              <div className="flex gap-2">
                {(['a_realizar', 'executado', 'existente'] as const).map(s => (
                  <button key={s} onClick={() => setStatusSel(s)}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all ${statusSel === s ? 'text-white shadow-sm' : 'bg-white text-slate-600 border-gray-200'}`}
                    style={statusSel === s ? { backgroundColor: COR_STATUS[s], borderColor: COR_STATUS[s] } : {}}>
                    {LABEL_STATUS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Valor clínica (R$)</label><input readOnly value={(intAtual.valor_base ?? 0).toFixed(2)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-slate-500" /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Valor paciente (R$)</label><input type="number" step="0.01" value={valorPaciente} onChange={e => setValorPaciente(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20" /></div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              {intAtual.local_aplicacao === 'arcada' && (
                <Btn variant="secondary" onClick={aplicarTodaArcada}>Aplicar em Toda a Arcada</Btn>
              )}
              <Btn variant="ghost" onClick={() => setModalIntOpen(false)}>Cancelar</Btn>
              <Btn icon={CheckCircle} onClick={gravarIntervencao}>Gravar intervenção</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: visualização histórica */}
      {vizOrc && (
        <Modal open={!!vizOrc} onClose={() => setVizOrc(null)} title="Odontograma do atendimento" maxWidth="max-w-3xl">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{vizOrc.orc.data_criacao ? new Date(vizOrc.orc.data_criacao).toLocaleString('pt-BR') : ''} · <strong>{vizOrc.orc.status_geral || 'Finalizado'}</strong> · <span className="text-emerald-700 font-bold">R$ {Number(vizOrc.orc.valor_total || 0).toFixed(2).replace('.', ',')}</span></p>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="p-2 text-slate-500 font-bold">Dente</th><th className="p-2 text-slate-500 font-bold">Faces</th><th className="p-2 text-slate-500 font-bold">Status</th><th className="p-2 text-slate-500 font-bold text-right">Valor</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {vizOrc.itens.map(it => (
                    <tr key={it.id}>
                      <td className="p-2 font-bold text-brand-primary">D.{it.dente_numero}</td>
                      <td className="p-2 text-slate-500">{it.faces || '—'}</td>
                      <td className="p-2"><span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: COR_STATUS[it.status_visual || 'a_realizar'] }}><span className="w-2 h-2 rounded-full" style={{ background: COR_STATUS[it.status_visual || 'a_realizar'] }} />{LABEL_STATUS[it.status_visual || 'a_realizar']}</span></td>
                      <td className="p-2 text-right font-semibold text-emerald-600">R$ {Number(it.valor_cobrado || 0).toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
