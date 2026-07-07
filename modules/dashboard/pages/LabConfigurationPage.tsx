import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, FlaskConical, CheckCircle2, Activity } from 'lucide-react';

export interface LabExam {
  id: string;
  name: string;
  method: string; 
  type: 'serology' | 'immuno';
  mandatory: boolean;
}

export const DEFAULT_EXAMS: LabExam[] = [
  { id: '1', name: 'HIV 1/2', method: 'Eletroquimioluminescência', type: 'serology', mandatory: true },
  { id: '2', name: 'Hepatite B (HBsAg)', method: 'Eletroquimioluminescência', type: 'serology', mandatory: true },
  { id: '3', name: 'Hepatite C (Anti-HCV)', method: 'Eletroquimioluminescência', type: 'serology', mandatory: true },
  { id: '4', name: 'Sífilis', method: 'VDRL / Treponêmico', type: 'serology', mandatory: true },
  { id: '5', name: 'Doença de Chagas', method: 'Quimioluminescência', type: 'serology', mandatory: true },
  { id: '6', name: 'HTLV I/II', method: 'ELISA', type: 'serology', mandatory: true },
  { id: '7', name: 'Tipagem ABO/Rh', method: 'Gel Teste', type: 'immuno', mandatory: true },
  { id: '8', name: 'Pesquisa de Anticorpos Irregulares (PAI)', method: 'Gel Teste', type: 'immuno', mandatory: true },
];

const API_URL = 'http://localhost:5000/api';

export function LabConfigurationPage() {
  const [exams, setExams] = useState<LabExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newExam, setNewExam] = useState({ name: '', method: '', type: 'serology' });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/laboratorio/exames`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setExams((data && data.length > 0) ? data : DEFAULT_EXAMS);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar exames:', err);
        setExams(DEFAULT_EXAMS);
        setIsLoading(false);
      });
  }, []);

  const handleAddExam = () => {
    if (!newExam.name || !newExam.method) return;
    const exam: LabExam = {
      id: Date.now().toString(),
      name: newExam.name,
      method: newExam.method,
      type: newExam.type as 'serology' | 'immuno',
      mandatory: true
    };
    setExams([...exams, exam]);
    setNewExam({ name: '', method: '', type: 'serology' });
  };

  const handleRemoveExam = (id: string) => {
    if (confirm('Tem certeza? Isso afetará os resultados futuros.')) {
      setExams(exams.filter(e => e.id !== id));
    }
  };

  const handleSave = () => {
    fetch(`${API_URL}/laboratorio/exames`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exams)
    })
    .then(res => {
      if (!res.ok) throw new Error('Falha ao salvar');
      return res.json();
    })
    .then(() => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao salvar os testes laboratoriais.');
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Configuração de Exames</h1>
          <p className="text-slate-500 text-sm">Defina os testes laboratoriais obrigatórios para liberação de bolsas.</p>
        </div>
        <button onClick={handleSave} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 flex items-center gap-2 shadow-lg shadow-slate-200 transition-all">
          <Save size={18} /> Salvar Lista
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-brand-red" /> Novo Exame
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Exame</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Ex: Malária" value={newExam.name} onChange={e => setNewExam({...newExam, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Metodologia</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Ex: Gota Espessa" value={newExam.method} onChange={e => setNewExam({...newExam, method: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
              <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red" value={newExam.type} onChange={e => setNewExam({...newExam, type: e.target.value})}>
                <option value="serology">Sorologia (Doenças)</option>
                <option value="immuno">Imunohematologia (Tipagem)</option>
              </select>
            </div>
            <button onClick={handleAddExam} disabled={!newExam.name || !newExam.method} className="w-full py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50">Adicionar à Lista</button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
           <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
             <span className="font-bold text-slate-700 flex items-center gap-2"><FlaskConical size={18} /> Exames Ativos ({isLoading ? '...' : exams.length})</span>
           </div>
           {isLoading ? (
             <div className="p-12 text-center text-slate-400">
               <Activity className="animate-spin text-brand-red w-8 h-8 mx-auto mb-2" />
               <p>Carregando testes laboratoriais...</p>
             </div>
           ) : (
             <div className="divide-y divide-gray-100">
               {exams.map(exam => (
                 <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800">{exam.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{exam.method}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${exam.type === 'serology' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{exam.type === 'serology' ? 'Sorologia' : 'Imunohematologia'}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveExam(exam.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
      {showSuccess && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-scale-up text-center"><CheckCircle2 size={32} className="text-emerald-600 mb-4"/><h3 className="text-xl font-bold text-slate-800">Lista Atualizada!</h3></div></div>}
    </div>
  );
}