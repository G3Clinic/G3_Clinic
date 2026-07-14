import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Btn, Modal, SelectField } from '../../../components/ui/shared';
import { Activity, X, User, ClipboardList, CheckCircle, Calendar, FileText, MousePointer2 } from 'lucide-react';
import {
  especialidadesApi, odontoProcApi, pacientesApi, finalizarOrcamento,
  type APIEspecialidade, type APIOdontoProc, type APIPaciente,
} from '../../../services/api';
import './odontograma.css';

const PERM_SUP = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
const PERM_INF = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];
const DEC_SUP  = [55,54,53,52,51, 61,62,63,64,65];
const DEC_INF  = [85,84,83,82,81, 71,72,73,74,75];

const FACES = [
  { c: 'V', l: 'Vestibular',       css: 'top'    },
  { c: 'L', l: 'Lingual/Palatina', css: 'bottom' },
  { c: 'M', l: 'Mesial',           css: 'left'   },
  { c: 'D', l: 'Distal',           css: 'right'  },
  { c: 'O', l: 'Oclusal',          css: 'center' }
];

export function OdontogramaPage() {
  const [denteSel, setDenteSel] = useState<number | null>(null);
  const [espSel, setEspSel] = useState<string | null>(null);
  const [modalIntOpen, setModalIntOpen] = useState(false);
  const [intAtual, setIntAtual] = useState<APIOdontoProc | null>(null);
  const [facesSel, setFacesSel] = useState<string[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  // dados reais
  const [especialidades, setEspecialidades] = useState<APIEspecialidade[]>([]);
  const [procs, setProcs] = useState<APIOdontoProc[]>([]);
  const [pacientes, setPacientes] = useState<APIPaciente[]>([]);
  const [pacienteId, setPacienteId] = useState<string>('');

  useEffect(() => {
    especialidadesApi.listar().then(setEspecialidades).catch(() => {});
    odontoProcApi.listar().then(setProcs).catch(() => {});
    pacientesApi.listar().then(setPacientes).catch(() => {});
  }, []);

  const paciente = pacientes.find(p => String(p.id) === pacienteId) || null;
  const procsDaEsp = (espId: string) => procs.filter(p => p.especialidade_id === espId);
  const getEspecialidadeInfo = () => especialidades.find(e => e.id === espSel);

  const selecionarDente = (num: number) => { setDenteSel(num); setEspSel(null); };

  const abrirModalIntervencao = (proc: APIOdontoProc) => {
    if (!denteSel) { alert('Selecione um dente primeiro'); return; }
    setIntAtual(proc); setFacesSel([]); setModalIntOpen(true);
  };
  const toggleFaceModal = (face: string) => setFacesSel(prev => prev.includes(face) ? prev.filter(f => f !== face) : [...prev, face]);

  const gravarIntervencao = () => {
    if (!intAtual) return;
    setItens(prev => [...prev, {
      id: Math.random().toString(), dente: denteSel, faces: facesSel,
      proc: intAtual.nome_intervencao, valor: intAtual.valor_base || 0, procedimentoId: intAtual.id,
    }]);
    setModalIntOpen(false); setIntAtual(null); setFacesSel([]);
  };
  const removerItem = (id: string) => setItens(prev => prev.filter(i => i.id !== id));
  const total = itens.reduce((acc, it) => acc + it.valor, 0);

  const finalizar = async () => {
    if (!pacienteId) { alert('Selecione um paciente primeiro.'); return; }
    if (itens.length === 0) return;
    setSalvando(true);
    try {
      await finalizarOrcamento({
        paciente_id: Number(pacienteId), valor_total: total,
        itens: itens.map(it => ({ dente_numero: String(it.dente), faces: (it.faces || []).join(''), procedimento_id: it.procedimentoId, valor_cobrado: it.valor })),
      });
      alert('Orçamento finalizado! Um recebimento pendente foi gerado no financeiro.');
      setItens([]); setDenteSel(null); setEspSel(null);
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

  // Helper to render the Dente exactly like reference
  const renderLinha = (nums: number[], deciduo: boolean, id: string) => {
    return (
      <div id={id} className={`odontoLinhaDentes ${deciduo ? 'decidua' : ''}`}>
        {nums.map(num => (
          <div 
            key={num} 
            className={`odontoDente ${deciduo ? 'deciduo' : ''} ${denteSel === num ? 'selecionado' : ''}`}
            data-dente={num} 
            title={`Dente ${num}`}
            onClick={() => selecionarDente(num)}
          >
            <div className="odontoDenteNum">{num}</div>
            <img 
              className="odontoDenteImg" 
              src={getMappedToothImage(num, deciduo)} 
              alt={`Dente ${num}`} 
              draggable="false" 
              onError={(e) => (e.currentTarget.style.display = 'none')} 
              style={deciduo ? { width: 26, height: 28, opacity: 0.8 } : undefined}
            />
            
            <div className="odontoDenteGraf">
              {FACES.map(face => {
                const isFinalizada = itens.some(it => it.dente === num && it.faces.includes(face.c));
                return (
                  <div 
                    key={face.c} 
                    className={`odFace ${face.css} ${isFinalizada ? 'finalizada' : ''}`} 
                    data-dente={num} 
                    data-face={face.c}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        icon={Activity} 
        title="Odontograma Interativo" 
        subtitle="Selecione as faces do dente e lance no orçamento"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <User size={16} className="text-brand-primary" />
            <select value={pacienteId} onChange={e => setPacienteId(e.target.value)} className="text-sm font-bold text-brand-primary bg-transparent outline-none cursor-pointer">
              <option value="">Selecionar paciente...</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Painel Histórico (esquerda) */}
        <div className="xl:col-span-3">
          <Card padding={false} className="h-full flex flex-col overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 font-bold text-sm text-slate-700 uppercase tracking-wider">
              <Calendar size={16} className="text-brand-primary" /> Histórico
            </div>
            <div className="flex-1 overflow-y-auto p-4">
               <div className="text-sm text-slate-500 text-center py-8 italic">Nenhum histórico encontrado</div>
            </div>
          </Card>
        </div>

        {/* Painel Central: Arcadas */}
        <div className="xl:col-span-9 overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="odontoPainelArcada">
          <div className="odontoLegenda">
            <span className="odontoLegItem"><span className="odontoLegBox normal"></span> Normal</span>
            <span className="odontoLegItem"><span className="odontoLegBox selecionada"></span> Selecionado</span>
            <span className="odontoLegItem"><span className="odontoLegBox finalizada"></span> Registrado</span>
          </div>

          <div className="odontoArcadaLabel">ARCADA SUPERIOR — PERMANENTE</div>
          {renderLinha(PERM_SUP, false, "odontoPermanenteSup")}

          <div className="odontoArcadaLabel decidua odontoLabelDecSup">ARCADA SUPERIOR — DECÍDUA</div>
          {renderLinha(DEC_SUP, true, "odontoDeciduaSup")}

          <div className="odontoDivisor"></div>

          {renderLinha(DEC_INF, true, "odontoDeciduaInf")}
          <div className="odontoArcadaLabel decidua odontoLabelDecInf">ARCADA INFERIOR — DECÍDUA</div>

          {renderLinha(PERM_INF, false, "odontoPermanenteInf")}
          <div className="odontoArcadaLabel">ARCADA INFERIOR — PERMANENTE</div>
        </div>

        </div>

        {/* Painel Inferior: Orçamento e Seleção */}
        <div className="xl:col-span-12">
          <Card padding={true} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <div className="p-3 bg-brand-light/30 border border-brand-primary/20 rounded-xl flex items-center justify-center gap-2 text-brand-primary">
              {denteSel ? (
                <span className="font-bold flex items-center gap-2 text-sm">
                  <Activity size={18} /> Dente #{denteSel} selecionado
                </span>
              ) : (
                <span className="font-medium flex items-center gap-2 opacity-70 text-sm">
                  <MousePointer2 size={18} /> Clique em um dente para começar
                </span>
              )}
            </div>

            {denteSel && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidade</h4>
                  <div className="flex flex-wrap gap-2">
                    {especialidades.length === 0 ? <span className="text-xs text-slate-400 italic">Cadastre especialidades em Administração → Especialidades Odonto.</span>
                      : especialidades.map(esp => (
                        <button
                          key={esp.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${espSel === esp.id ? 'bg-brand-primary text-white shadow-sm' : 'bg-gray-50 text-slate-600 hover:bg-gray-100 border border-gray-200'}`}
                          onClick={() => setEspSel(esp.id)}
                        >
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
                          <button key={inv.id} className="flex flex-col items-start gap-1 p-2 rounded-lg border border-gray-200 hover:border-brand-primary hover:bg-brand-light/20 transition-all text-left group" onClick={() => abrirModalIntervencao(inv)}>
                            <span className="text-[11px] leading-tight font-semibold text-slate-700 group-hover:text-brand-primary transition-colors">{inv.nome_intervencao}</span>
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
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-brand-primary" /> Orçamento Atual
              </h4>
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/50 border-b border-gray-200 text-slate-500">
                    <tr>
                      <th className="px-2 py-2 font-semibold">Dente</th>
                      <th className="px-2 py-2 font-semibold">Proc.</th>
                      <th className="px-2 py-2 font-semibold text-right">Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itens.length === 0 ? (
                      <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400 italic">Nenhum item lançado</td></tr>
                    ) : (
                      itens.map((it, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="px-2 py-2 font-bold text-brand-primary">#{it.dente}</td>
                          <td className="px-2 py-2 text-slate-600 truncate max-w-[80px]" title={it.proc}>{it.proc}</td>
                          <td className="px-2 py-2 font-bold text-emerald-600 text-right">R$ {it.valor.toFixed(2).replace('.',',')}</td>
                          <td className="px-2 py-2 text-right">
                            <button className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" onClick={() => removerItem(it.id)}>
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between font-bold text-slate-800 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span>Total Estimado:</span>
                <span className="text-emerald-700 text-lg">R$ {itens.reduce((acc, i) => acc + i.valor, 0).toFixed(2).replace('.',',')}</span>
              </div>
            </div>

            <div className="lg:col-span-2">
              <Btn className="w-full flex items-center justify-center gap-2 mt-1 shadow-md shadow-brand-primary/20" size="md" disabled={itens.length === 0 || salvando} onClick={finalizar}>
                <CheckCircle size={18} /> {salvando ? 'Salvando...' : 'Finalizar e Enviar'}
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      {modalIntOpen && intAtual && (
        <Modal 
          open={modalIntOpen} 
          onClose={() => setModalIntOpen(false)} 
          title={`Intervenção — Dente #${denteSel}`}
        >
          <div id="odoModalIntEsp" style={{fontSize:'.75rem',color:'var(--s5)',marginBottom:16}}>
            Especialidade: {getEspecialidadeInfo()?.nome}
          </div>

          <div style={{marginBottom:16,border:'1px solid var(--s3)',borderRadius:8,padding:'16px 14px',textAlign:'center'}}>
            <div style={{fontSize:'.72rem',fontWeight:800,color:'var(--s6)',marginBottom:14,textTransform:'uppercase',letterSpacing:'.05em'}}>
              Clique nas faces afetadas
            </div>
            <div className="odoFacePickArea">
              <div className="odoFacePickLbl lblTop">Vestibular</div>
              <div className="odoFacePickLbl lblBottom">Lingual/<br/>Palatina</div>
              <div className="odoFacePickLbl lblLeft">Mesial</div>
              <div className="odoFacePickLbl lblRight">Distal</div>
              <div className="odoFacePickCruzeta">
                {FACES.map(f => (
                  <div 
                    key={f.c} 
                    className={`odFacePick ${f.css} ${facesSel.includes(f.c) ? 'selecionada' : ''}`} 
                    onClick={() => toggleFaceModal(f.c)}
                    title={f.l}
                  >
                    {f.c === 'O' && <span className="odFacePickCenterLbl">Ocl</span>}
                  </div>
                ))}
              </div>
            </div>
            <div id="odoFacesSelText" className="odoFacesSelText">
              {facesSel.length > 0 ? facesSel.map(f => FACES.find(x => x.c === f)?.l).join(' · ') : 'Nenhuma face selecionada'}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
            <div className="patFG">
              <label className="afLabel">Valor Clínica (R$)</label>
              <input type="number" className="afInp" readOnly value={(intAtual.valor_base || 0).toFixed(2)}
                     style={{background:'var(--s1)',cursor:'not-allowed',color:'var(--s7)'}}/>
            </div>
            <div className="patFG">
              <label className="afLabel">Valor Paciente (R$)</label>
              <input type="number" className="afInp" readOnly value={(intAtual.valor_base || 0).toFixed(2)}
                     style={{background:'var(--s1)',cursor:'not-allowed',color:'var(--s7)'}}/>
            </div>
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button className="btn bSm" style={{background:'var(--s1)',border:'1px solid var(--s2)',color:'var(--s7)'}}
                    onClick={() => setModalIntOpen(false)}>Cancelar</button>
            <button className="btn bG bSm" onClick={gravarIntervencao}>✅ Gravar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
