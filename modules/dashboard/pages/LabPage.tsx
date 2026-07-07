import { useState, useEffect } from 'react';
import { FlaskConical, CheckCircle2, XCircle, AlertTriangle, FileText, Microscope, TestTube2, X, RefreshCw } from 'lucide-react';
import { DEFAULT_EXAMS } from './LabConfigurationPage';

interface LabBag {
  id: string;
  code: string;
  type: string; // Tipo declarado/presumido na coleta
  collectedAt: string;
  status: 'pending' | 'analyzing' | 'approved' | 'discarded';
  results?: Record<string, string>;
  finalType?: string; // O tipo real confirmado pelo lab
}

const API_URL = 'http://localhost:5000/api';

export function LabPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [bags, setBags] = useState<LabBag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/laboratorio/amostras`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setBags(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar amostras:', err);
        setIsLoading(false);
      });
  }, []);
  
  const [selectedBag, setSelectedBag] = useState<LabBag | null>(null);
  
  // Resultados dos exames normais (Sorologia)
  const [examResults, setExamResults] = useState<Record<string, 'positive' | 'negative'>>({});
  
  // Resultado específico da Tipagem
  const [typingResult, setTypingResult] = useState({ abo: '', rh: '' });

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const availableExams = DEFAULT_EXAMS;

  const handleOpenAnalysis = (bag: LabBag) => {
    setSelectedBag(bag);
    setExamResults({});
    // Resetar tipagem
    setTypingResult({ abo: '', rh: '' });
  };

  const toggleResult = (examId: string, value: 'positive' | 'negative') => {
    setExamResults(prev => ({ ...prev, [examId]: value }));
  };

  // Lógica para verificar se a tipagem mudou
  const getFinalBloodType = () => {
    if (!typingResult.abo || !typingResult.rh) return null;
    return `${typingResult.abo}${typingResult.rh}`;
  };

  const isDivergent = () => {
    const final = getFinalBloodType();
    return final && selectedBag && final !== selectedBag.type;
  };

  const isAllNegative = () => {
    // Pega apenas exames que NÃO são a tipagem (ID 7 é a tipagem na nossa config padrão)
    const diseaseExams = availableExams.filter(e => e.id !== '7');
    return diseaseExams.every(exam => examResults[exam.id] === 'negative');
  };

  const isComplete = () => {
    const diseaseExams = availableExams.filter(e => e.id !== '7');
    const diseasesChecked = diseaseExams.every(exam => examResults[exam.id]);
    const typingChecked = typingResult.abo !== '' && typingResult.rh !== '';
    return diseasesChecked && typingChecked;
  };

  const handleFinishAnalysis = () => {
    if (!selectedBag) return;

    const approved = isAllNegative();
    const finalType = getFinalBloodType() || selectedBag.type;
    const newStatus = approved ? 'approved' : 'discarded';
    
    fetch(`${API_URL}/laboratorio/resultado/${selectedBag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        results: { ...examResults, bloodType: finalType },
        type: finalType
      })
    })
    .then(res => {
      if (!res.ok) throw new Error('Falha ao registrar resultado');
      
      // Atualiza a bolsa localmente
      setBags(bags.map(b => b.id === selectedBag.id ? { 
        ...b, 
        status: newStatus, 
        results: { ...examResults, bloodType: finalType },
        type: finalType
      } : b));
      
      let msg = '';
      if (approved) {
        msg = `Bolsa ${selectedBag.code} APROVADA.\nTipagem Confirmada: ${finalType}`;
        if (isDivergent()) {
          msg += `\n(ATENÇÃO: Cadastro do doador corrigido de ${selectedBag.type} para ${finalType})`;
        }
      } else {
        msg = `Bolsa ${selectedBag.code} REPROVADA nos exames sorológicos.\nMarcada para descarte.`;
      }

      setSuccessMessage(msg);
      setShowSuccess(true);
      setSelectedBag(null);

      setTimeout(() => setShowSuccess(false), 4000);
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao registrar resultado da análise.');
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Laboratório de Imunohematologia</h1>
          <p className="text-slate-500 text-sm">Lançamento de resultados e liberação de bolsas.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('queue')}
          className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'queue' ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Microscope size={18} /> Bancada de Análise
        </button>
      </div>

      {activeTab === 'queue' && (
        isLoading ? (
           <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3 bg-white border border-gray-200 rounded-2xl">
             <AlertTriangle className="animate-spin text-brand-red w-8 h-8" />
             <p className="font-medium">Carregando amostras...</p>
           </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {bags.filter(b => b.status === 'pending' || b.status === 'analyzing').map(bag => (
             <div key={bag.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <TestTube2 size={24} />
                     </div>
                     <div>
                        <p className="font-mono font-bold text-lg text-slate-800">{bag.code}</p>
                        <p className="text-xs text-slate-500">{bag.collectedAt}</p>
                     </div>
                   </div>
                   <span className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded-lg text-sm">{bag.type}</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-gray-50 p-2 rounded-lg">
                    <FlaskConical size={14} />
                    <span>Aguardando {availableExams.length} exames</span>
                  </div>
                  
                  <button 
                    onClick={() => handleOpenAnalysis(bag)}
                    className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Microscope size={18} />
                    Lançar Resultados
                  </button>
                </div>
             </div>
           ))}
           {bags.filter(b => b.status === 'pending' || b.status === 'analyzing').length === 0 && (
             <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-slate-400 py-12 bg-white border border-gray-200 rounded-2xl">
               Nenhuma amostra pendente de análise no momento.
             </div>
           )}
        </div>
        )
      )}

      {selectedBag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 animate-scale-up flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Microscope className="text-brand-red" /> Análise Laboratorial
                 </h2>
                 <p className="text-slate-500 text-sm">Bolsa: <strong className="font-mono text-slate-800">{selectedBag.code}</strong> • Declarado: {selectedBag.type}</p>
              </div>
              <button onClick={() => setSelectedBag(null)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
              
              {/* BLOCO ESPECIAL: TIPAGEM ABO/RH (ID 7) */}
              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <TestTube2 size={18} /> Tipagem Sanguínea (Confirmação)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Grupo ABO</label>
                    <div className="flex gap-2">
                      {['A', 'B', 'AB', 'O'].map(type => (
                        <button
                          key={type}
                          onClick={() => setTypingResult(prev => ({ ...prev, abo: type }))}
                          className={`flex-1 py-3 rounded-lg font-bold border transition-all ${
                            typingResult.abo === type 
                              ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                              : 'bg-white text-slate-600 border-gray-200 hover:bg-white'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fator Rh</label>
                    <div className="flex gap-2">
                      {['+', '-'].map(rh => (
                        <button
                          key={rh}
                          onClick={() => setTypingResult(prev => ({ ...prev, rh: rh }))}
                          className={`flex-1 py-3 rounded-lg font-bold border transition-all ${
                            typingResult.rh === rh 
                              ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                              : 'bg-white text-slate-600 border-gray-200 hover:bg-white'
                          }`}
                        >
                          {rh === '+' ? 'Positivo (+)' : 'Negativo (-)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isDivergent() && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 animate-pulse-slow">
                    <RefreshCw className="text-amber-600 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Divergência Detectada</p>
                      <p className="text-xs text-amber-700">
                        O doador declarou ser <strong>{selectedBag.type}</strong>, mas o teste indicou <strong>{getFinalBloodType()}</strong>. 
                        O cadastro do doador será corrigido automaticamente ao salvar.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* OUTROS EXAMES (SOROLOGIA e PAI) */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <span className="w-full h-px bg-gray-200"></span>
                  Exames Obrigatórios (Segurança)
                  <span className="w-full h-px bg-gray-200"></span>
                </h3>
                <div className="space-y-3">
                  {availableExams.filter(e => e.id !== '7').map(exam => (
                    <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="mb-2 sm:mb-0">
                        <p className="font-bold text-slate-800">{exam.name}</p>
                        <p className="text-xs text-slate-500">{exam.method}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => toggleResult(exam.id, 'negative')}
                          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                            examResults[exam.id] === 'negative' 
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' 
                              : 'bg-white text-slate-500 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {exam.type === 'immuno' ? 'Negativo' : 'Não Reagente'}
                        </button>
                        <button 
                          onClick={() => toggleResult(exam.id, 'positive')}
                          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                            examResults[exam.id] === 'positive' 
                              ? 'bg-red-500 text-white border-red-600 shadow-md' 
                              : 'bg-white text-slate-500 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {exam.type === 'immuno' ? 'Positivo' : 'Reagente'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="text-sm">
                   Resultado Final: 
                   {!isComplete() ? (
                     <span className="font-bold text-slate-400 ml-2">Preencha todos os campos...</span>
                   ) : isAllNegative() ? (
                     <span className="font-bold text-emerald-600 ml-2 flex items-center gap-1 inline-flex"><CheckCircle2 size={16}/> APROVADO</span>
                   ) : (
                     <span className="font-bold text-red-600 ml-2 flex items-center gap-1 inline-flex"><XCircle size={16}/> REPROVADO (Descarte)</span>
                   )}
                 </div>

                 <button 
                   disabled={!isComplete()}
                   onClick={handleFinishAnalysis}
                   className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${
                     !isComplete() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                     isAllNegative() 
                       ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                       : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                   }`}
                 >
                   {isAllNegative() ? 'Liberar Bolsa' : 'Confirmar Descarte'}
                 </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-scale-up text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${successMessage.includes('REPROVADA') ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {successMessage.includes('REPROVADA') ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{successMessage.includes('REPROVADA') ? 'Bolsa Descartada' : 'Bolsa Liberada'}</h3>
            <p className="text-slate-500 whitespace-pre-line">{successMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}