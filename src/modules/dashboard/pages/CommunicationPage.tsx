import { useState, useEffect } from 'react';
import { Send, Users, Filter, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export function CommunicationPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedBloodTypes, setSelectedBloodTypes] = useState<string[]>([]);
  const [onlyApt, setOnlyApt] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [audienceCount, setAudienceCount] = useState(0);

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const toggleBloodType = (type: string) => {
    if (selectedBloodTypes.includes(type)) {
      setSelectedBloodTypes(selectedBloodTypes.filter(t => t !== type));
    } else {
      setSelectedBloodTypes([...selectedBloodTypes, type]);
    }
  };

  useEffect(() => {
    if (selectedBloodTypes.length === 0) {
      setAudienceCount(0);
      return;
    }
    const params = new URLSearchParams();
    selectedBloodTypes.forEach(type => params.append('tipos', type));
    params.append('somenteAptos', onlyApt.toString());

    fetch(`${API_URL}/comunicacao/audiencia?${params.toString()}`)
      .then(res => res.ok ? res.json() : { total: 0 })
      .then(data => setAudienceCount(data.total || 0))
      .catch((err) => {
         console.error('Erro ao buscar audiencia:', err);
         setAudienceCount(0);
      });
  }, [selectedBloodTypes, onlyApt]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const response = await fetch(`${API_URL}/comunicacao/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assunto: subject,
          mensagem: message,
          tiposSanguineos: selectedBloodTypes,
          somenteAptos: onlyApt
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao disparar campanha');
      }

      setShowSuccess(true);
      setSubject('');
      setMessage('');
      setSelectedBloodTypes([]);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Falha ao enviar campanha. O servidor pode estar indisponível.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Comunicação e Engajamento</h1>
          <p className="text-slate-500 text-sm">Campanhas de convocação e avisos para doadores.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 h-fit">
          <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Filter className="text-brand-red" size={20} />
            Definição de Público
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Tipos Sanguíneos Alvo</label>
              <div className="grid grid-cols-4 gap-2">
                {bloodTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleBloodType(type)}
                    className={`h-10 rounded-lg font-bold text-xs transition-all border ${
                      selectedBloodTypes.includes(type)
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-gray-200 hover:border-brand-red'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-brand-red focus:ring-brand-red"
                  checked={onlyApt}
                  onChange={e => setOnlyApt(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">Apenas doadores aptos (Intervalo cumprido)</span>
              </label>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="bg-white p-2 rounded-full text-blue-600 shadow-sm">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-800 uppercase">Alcance Estimado</p>
                <p className="text-2xl font-bold text-slate-800">{audienceCount} <span className="text-sm font-normal text-slate-500">doadores</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col h-[600px]">
          <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <MessageSquare className="text-brand-red" size={20} />
            Editor de Mensagem
          </h2>

          <div className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Assunto (E-mail / Push)</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red transition-all"
                placeholder="Ex: Seu tipo sanguíneo está em falta! Doe vida hoje."
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-bold text-slate-700 mb-1">Conteúdo da Mensagem</label>
              <textarea 
                className="w-full flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-red transition-all resize-none"
                placeholder="Digite sua mensagem aqui..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <button 
                onClick={() => { setSubject('Estoque Crítico: Precisamos de você!'); setMessage('Olá! O estoque do seu tipo sanguíneo está em nível crítico. Compareça ao hemocentro mais próximo e ajude a salvar vidas.'); }}
                className="px-4 py-2 bg-red-50 text-brand-red text-xs font-bold rounded-lg border border-red-100 hover:bg-red-100 whitespace-nowrap"
              >
                Template: Estoque Crítico
              </button>
              <button 
                onClick={() => { setSubject('Sua doação salva vidas'); setMessage('Já faz um tempo desde sua última doação. Que tal agendar um retorno e renovar a esperança de alguém?'); }}
                className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 hover:bg-blue-100 whitespace-nowrap"
              >
                Template: Retorno
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 mt-6 flex justify-end">
            <button 
              onClick={handleSend}
              disabled={isSending || selectedBloodTypes.length === 0 || !message}
              className="px-8 py-4 bg-brand-red text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-brand-red/20"
            >
              {isSending ? 'Enviando...' : (
                <>
                  <Send size={18} /> Disparar Campanha
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-scale-up text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Campanha Enviada!</h3>
            <p className="text-slate-500">
              A mensagem entrou na fila de disparo para <strong>{audienceCount}</strong> doadores.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}