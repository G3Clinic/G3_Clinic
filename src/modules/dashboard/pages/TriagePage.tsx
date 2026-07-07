import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, Thermometer, Activity, Scale, Heart, Save, ArrowRight, AlertOctagon, FileText, User, ArrowLeft, Droplets, Ruler } from 'lucide-react';
import { TRIAGE_QUESTIONS } from '../constants/triageQuestions'; 

export function TriagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const selectedDonor = location.state?.donor || null;

  const [vitals, setVitals] = useState({
    height: '', // Novo Campo
    weight: '', 
    temperature: '', 
    systolic: '', 
    diastolic: '', 
    pulse: '', 
    hemoglobin: '', 
    hematocrit: '',
    collectionVolume: '450' // Novo Campo - Volume padrão em ml
  });

  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [showResultModal, setShowResultModal] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<{message: string, isBlocking: boolean}[]>([]);

  const handleHemoglobinChange = (value: string) => {
    const num = parseFloat(value.replace(',', '.'));
    let calculatedHematocrit = '';
    if (!isNaN(num)) calculatedHematocrit = (num * 3).toFixed(1); 
    setVitals(prev => ({ ...prev, hemoglobin: value, hematocrit: calculatedHematocrit }));
  };

  const handleAnswer = (questionId: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleFinishTriage = () => {
    const reasons: {message: string, isBlocking: boolean}[] = [];

    // Validações Físicas
    const weight = Number(vitals.weight);
    const temp = Number(vitals.temperature);
    const sys = Number(vitals.systolic);
    const dia = Number(vitals.diastolic);
    const pulse = Number(vitals.pulse);
    const hb = Number(vitals.hemoglobin.replace(',', '.'));

    if (weight > 0 && weight < 50) reasons.push({message: 'Peso inferior a 50kg (Mínimo exigido).', isBlocking: true});
    if (temp > 37.8) reasons.push({message: `Estado febril detectado (${temp}°C).`, isBlocking: true});
    if (sys > 180 || (sys > 0 && sys < 90)) reasons.push({message: `Pressão sistólica fora dos limites (${sys}).`, isBlocking: true});
    if (dia > 100 || (dia > 0 && dia < 60)) reasons.push({message: `Pressão diastólica fora dos limites (${dia}).`, isBlocking: true});
    if (pulse < 50 || pulse > 100) reasons.push({message: `Batimentos cardíacos irregulares (${pulse} bpm).`, isBlocking: false});
    if (hb > 0 && hb < 12.5) reasons.push({message: `Hemoglobina abaixo do mínimo aceitável (${hb} g/dL).`, isBlocking: true});

    // Validações do Questionário
    TRIAGE_QUESTIONS.forEach(q => {
      const userAnswer = answers[q.id];
      if (userAnswer !== undefined && userAnswer !== q.expectedAnswer) {
        reasons.push({ message: q.failureMessage, isBlocking: q.isBlocking });
      }
    });

    setRejectionReasons(reasons);
    setShowResultModal(true);
  };

  const handleConfirmResult = () => {
    setShowResultModal(false);
    navigate('/dashboard/doadores'); 
  };

  const hasBlockingReason = rejectionReasons.some(r => r.isBlocking);
  const hasWarnings = rejectionReasons.some(r => !r.isBlocking);
  const isApproved = !hasBlockingReason; 

  if (!selectedDonor) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-fade-in-up text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6"><User size={40} className="text-gray-400" /></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Nenhum doador selecionado</h2>
        <p className="text-slate-500 mb-8 max-w-md">Para iniciar a triagem, você deve acessar a Lista de Doadores e selecionar o doador específico.</p>
        <button onClick={() => navigate('/dashboard/doadores')} className="px-6 py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2">
          <ArrowLeft size={18} /> Voltar para Lista de Doadores
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/doadores')} className="p-2 hover:bg-gray-100 rounded-lg text-slate-500 transition-colors"><ArrowLeft size={24} /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Triagem Clínica e Hematológica</h1>
            <p className="text-slate-500 text-sm">Ficha oficial de avaliação para coleta.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 animate-fade-in">
        <div className="bg-slate-800 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"><User size={24} className="text-white" /></div>
            <div>
              <p className="text-sm text-slate-300">Doador em Triagem</p>
              <p className="font-bold text-lg flex items-center gap-2">{selectedDonor.name} <span className="text-xs px-2 py-0.5 bg-brand-red rounded-full">{selectedDonor.bloodType}</span></p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">CÓDIGO: {selectedDonor.code}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-6">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="text-brand-red" size={20} /> Triagem Hematológica</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                  <div>
                      <label className="block text-xs font-bold text-brand-red uppercase mb-1">Hemoglobina (g/dL)</label>
                      <input type="text" className="w-full p-3 bg-white border border-red-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700" placeholder="Ex: 13.5" value={vitals.hemoglobin} onChange={e => handleHemoglobinChange(e.target.value)} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-brand-red uppercase mb-1">Hematócrito (%)</label>
                      <input type="text" className="w-full p-3 bg-white border border-red-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700" placeholder="Ex: 40.5" value={vitals.hematocrit} onChange={e => setVitals({...vitals, hematocrit: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Altura (cm)</label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700" placeholder="Ex: 175" value={vitals.height} onChange={e => setVitals({...vitals, height: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso (kg)</label>
                    <div className="relative">
                      <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700" placeholder="Ex: 75.5" value={vitals.weight} onChange={e => setVitals({...vitals, weight: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temperatura (°C)</label>
                  <div className="relative">
                    <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="number" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700" placeholder="Ex: 36.5" value={vitals.temperature} onChange={e => setVitals({...vitals, temperature: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pressão (Sys)</label>
                      <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700" placeholder="120" value={vitals.systolic} onChange={e => setVitals({...vitals, systolic: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pressão (Dia)</label>
                      <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700" placeholder="80" value={vitals.diastolic} onChange={e => setVitals({...vitals, diastolic: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pulso (bpm)</label>
                    <div className="relative">
                      <Heart className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700" placeholder="Ex: 72" value={vitals.pulse} onChange={e => setVitals({...vitals, pulse: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Volume a Coletar (ml)</label>
                    <div className="relative">
                      <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" className="w-full pl-10 pr-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-emerald-800" value={vitals.collectionVolume} onChange={e => setVitals({...vitals, collectionVolume: e.target.value})} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="xl:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="text-brand-red" size={20} /> Entrevista Confidencial
              </h2>

              <div className="flex-1 space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                {TRIAGE_QUESTIONS.map((question) => {
                  const currentAnswer = answers[question.id];
                  const isRisk = currentAnswer !== undefined && currentAnswer !== question.expectedAnswer;

                  return (
                    <div key={question.id} className={`p-4 rounded-xl border transition-all ${isRisk ? (question.isBlocking ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200') : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <p className={`text-sm font-medium flex-1 ${isRisk ? (question.isBlocking ? 'text-red-800' : 'text-amber-800') : 'text-slate-700'}`}>
                            {question.text}
                          </p>
                          <div className="flex gap-2 min-w-[140px]">
                            <button onClick={() => handleAnswer(question.id, true)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${currentAnswer === true ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-gray-200 hover:bg-gray-100'}`}>SIM</button>
                            <button onClick={() => handleAnswer(question.id, false)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${currentAnswer === false ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-gray-200 hover:bg-gray-100'}`}>NÃO</button>
                          </div>
                        </div>
                        {isRisk && (
                          <div className={`mt-2 text-xs font-bold flex items-center gap-1 ${question.isBlocking ? 'text-red-600' : 'text-amber-600'}`}>
                              <AlertOctagon size={12} /> {question.failureMessage}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
                  <button onClick={handleFinishTriage} className="px-8 py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-brand-red/20 flex items-center gap-2 transition-all">
                    <Save size={18} /> Analisar Triagem
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
             <div className={`p-6 text-center ${isApproved ? (hasWarnings ? 'bg-amber-50' : 'bg-emerald-50') : 'bg-red-50'}`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isApproved ? (hasWarnings ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600') : 'bg-red-100 text-red-600'}`}>
                   {isApproved ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                </div>
                <h2 className={`text-2xl font-bold ${isApproved ? (hasWarnings ? 'text-amber-800' : 'text-emerald-800') : 'text-red-800'}`}>
                  {!isApproved ? 'Doador Inapto' : (hasWarnings ? 'Apto com Ressalvas' : 'Doador Apto!')}
                </h2>
                <p className={`text-sm mt-1 ${isApproved ? (hasWarnings ? 'text-amber-700' : 'text-emerald-600') : 'text-red-600'}`}>
                  {isApproved ? 'Encaminhar para a Sala de Coleta.' : 'Bloqueio do doador no sistema.'}
                </p>
             </div>

             <div className="p-6">
                {rejectionReasons.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-slate-500" /> Ocorrências Registradas:
                    </p>
                    <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                       {rejectionReasons.map((reason, index) => (
                         <li key={index} className={`text-sm px-3 py-2 rounded-lg border flex items-start gap-2 ${reason.isBlocking ? 'text-red-700 bg-red-50 border-red-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}>
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${reason.isBlocking ? 'bg-red-500' : 'bg-amber-500'}`} />
                            {reason.message}
                         </li>
                       ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                   <button onClick={() => setShowResultModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">
                     Voltar / Corrigir
                   </button>
                   <button onClick={handleConfirmResult} className={`flex-1 py-3 font-bold text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isApproved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                     {isApproved ? <>Iniciar Coleta <ArrowRight size={18} /></> : 'Registrar Inaptidão'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}