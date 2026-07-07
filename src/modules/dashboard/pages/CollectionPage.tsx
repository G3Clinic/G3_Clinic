import { useState, useEffect } from 'react';
import { User, Clock, CheckCircle2, AlertTriangle, Syringe, Printer, X, FileWarning, Tag, Settings2, Droplets } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface DonorInQueue {
  id: string;
  name: string;
  bloodType: string;
  triageTime: string;
  weight: number;
}

export function CollectionPage() {
  const [queue, setQueue] = useState<DonorInQueue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/coleta/agendamentos`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setQueue(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar fila:', err);
        setIsLoading(false);
      });
  }, []);
  const [selectedDonor, setSelectedDonor] = useState<DonorInQueue | null>(null);
  
  // Estado atualizado para refletir a ficha oficial
  const [collectionData, setCollectionData] = useState({
    hemovidaLabel: '',
    isbtLabel: '',
    startTime: '',
    endTime: '',
    bagType: 'Dupla', 
    volume: 450, 
    connectorNum: '',
    compoguardNum: ''
  });

  const [showIssueModal, setShowIssueModal] = useState(false);
  // Adicionado o registro de insumos perdidos/gastos
  const [issueData, setIssueData] = useState({ type: '', observation: '', consumedMaterials: '' });

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSelectDonor = (donor: DonorInQueue) => {
    setSelectedDonor(donor);
    // Pré-preenche com a hora atual ao selecionar o doador
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setCollectionData({ 
      hemovidaLabel: '', 
      isbtLabel: '',
      startTime: timeString,
      endTime: '',
      bagType: 'Dupla', 
      volume: 450, 
      connectorNum: '',
      compoguardNum: ''
    });
  };

  const handleSuccess = () => {
    if (!collectionData.hemovidaLabel || !collectionData.isbtLabel) {
      alert('É obrigatório preencher as etiquetas Hemovida e ISBT/NAT.');
      return;
    }
    if (!collectionData.startTime || !collectionData.endTime) {
      alert('Informe os horários de início e término da coleta.');
      return;
    }
    if (collectionData.volume <= 0 || collectionData.volume > 450) {
      alert('O volume deve ser entre 1ml e 450ml.');
      return;
    }

    setIsProcessing(true);
    
    fetch(`${API_URL}/coleta/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorId: selectedDonor?.id,
        ...collectionData,
        status: 'sucesso'
      })
    })
    .then(res => {
      if (!res.ok) throw new Error('Falha no registro');
      setSuccessMessage(`Coleta de ${collectionData.volume}ml registrada com sucesso!\nBolsa vinculada às etiquetas ${collectionData.isbtLabel}.`);
      setQueue(queue.filter(d => d.id !== selectedDonor?.id));
      setSelectedDonor(null);
      setIsProcessing(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao registrar coleta.');
      setIsProcessing(false);
    });
  };

  const handleIssue = () => {
    if (!issueData.type) return;
    setIsProcessing(true);
    setShowIssueModal(false);
    
    fetch(`${API_URL}/coleta/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorId: selectedDonor?.id,
        ...collectionData,
        issue: issueData,
        status: 'intercorrencia'
      })
    })
    .then(res => {
      if (!res.ok) throw new Error('Falha no registro');
      setSuccessMessage(`Intercorrência registrada: ${issueData.type}.\nInsumos relatados e doador encaminhado para observação.`);
      setQueue(queue.filter(d => d.id !== selectedDonor?.id));
      setSelectedDonor(null);
      setIssueData({ type: '', observation: '', consumedMaterials: '' });
      setIsProcessing(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao registrar intercorrência.');
      setIsProcessing(false);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sala de Coleta</h1>
          <p className="text-slate-500 text-sm">Registro oficial de punção, rastreabilidade e intercorrências.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100 font-medium">
          <Clock size={16} />
          <span>Fila de Espera: <strong>{queue.length} doadores</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FILA DE ESPERA */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <User size={18} /> Aguardando Coleta
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
               <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                 <AlertTriangle className="animate-spin text-blue-500 w-6 h-6" />
                 Carregando fila...
               </div>
            ) : queue.length === 0 ? (
               <div className="p-8 text-center text-slate-400 text-sm">Ninguém na fila.</div>
            ) : (
              queue.map(donor => (
                <button 
                  key={donor.id}
                  onClick={() => handleSelectDonor(donor)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex justify-between items-center ${selectedDonor?.id === donor.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <div>
                    <p className="font-bold text-slate-800">{donor.name}</p>
                    <p className="text-xs text-slate-500">Triagem: {donor.triageTime} • {donor.weight}kg</p>
                  </div>
                  {donor.bloodType !== 'Unknown' && (
                    <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded text-xs">{donor.bloodType}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ÁREA DE REGISTRO DA COLETA */}
        <div className="lg:col-span-2">
          {!selectedDonor ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl h-[400px] flex flex-col items-center justify-center text-slate-400">
              <Syringe size={48} className="mb-4 opacity-20" />
              <p>Selecione um doador na fila para iniciar a punção.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 animate-fade-in">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Registro de Coleta</h2>
                  <p className="text-slate-500">Doador: <strong className="text-slate-800">{selectedDonor.name}</strong></p>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                
                {/* ETIQUETAS */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                   <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                     <Tag size={16} className="text-brand-red" /> Rastreabilidade (Etiquetas)
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Etiqueta Hemovida</label>
                       <input 
                          type="text" 
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono font-bold text-slate-700"
                          placeholder="Escaneie o código"
                          value={collectionData.hemovidaLabel}
                          onChange={e => setCollectionData({...collectionData, hemovidaLabel: e.target.value})}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Etiqueta ISBT/NAT</label>
                       <input 
                          type="text" 
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono font-bold text-slate-700"
                          placeholder="Escaneie o código"
                          value={collectionData.isbtLabel}
                          onChange={e => setCollectionData({...collectionData, isbtLabel: e.target.value})}
                       />
                     </div>
                   </div>
                </div>

                {/* TEMPO E VOLUME */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Início Coleta</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="time" 
                        className="w-full pl-9 pr-3 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700"
                        value={collectionData.startTime}
                        onChange={e => setCollectionData({...collectionData, startTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Término Coleta</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="time" 
                        className="w-full pl-9 pr-3 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-bold text-slate-700"
                        value={collectionData.endTime}
                        onChange={e => setCollectionData({...collectionData, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Volume Coletado (ml)</label>
                    <div className="relative">
                       <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red" size={16} />
                       <input 
                          type="number" 
                          min="0" 
                          max="450" 
                          className="w-full pl-9 pr-3 py-3 bg-red-50 border border-red-200 rounded-xl outline-none focus:border-brand-red font-mono font-bold text-red-800"
                          value={collectionData.volume}
                          onChange={e => setCollectionData({...collectionData, volume: Number(e.target.value)})}
                       />
                    </div>
                  </div>
                </div>

                {/* EQUIPAMENTOS E TIPO DE BOLSA */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                   <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                     <Settings2 size={16} className="text-brand-red" /> Dados Técnicos do Material
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Bolsa</label>
                       <select 
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-medium text-slate-700"
                          value={collectionData.bagType}
                          onChange={e => setCollectionData({...collectionData, bagType: e.target.value})}
                       >
                          <option value="Simples">Simples</option>
                          <option value="Dupla">Dupla</option>
                          <option value="Tripla">Tripla</option>
                          <option value="Quádrupla">Quádrupla</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conector nº</label>
                       <input 
                          type="text" 
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono text-slate-700"
                          placeholder="Número"
                          value={collectionData.connectorNum}
                          onChange={e => setCollectionData({...collectionData, connectorNum: e.target.value})}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Compoguard nº</label>
                       <input 
                          type="text" 
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono text-slate-700"
                          placeholder="Número"
                          value={collectionData.compoguardNum}
                          onChange={e => setCollectionData({...collectionData, compoguardNum: e.target.value})}
                       />
                     </div>
                   </div>
                </div>

              </div>

              {/* AÇÕES DE RODAPÉ */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => setShowIssueModal(true)}
                  className="px-4 py-3 bg-red-50 text-red-700 font-bold rounded-xl hover:bg-red-100 border border-red-100 flex items-center gap-2 transition-colors"
                >
                  <AlertTriangle size={18} />
                  Registrar Intercorrência
                </button>
                
                <div className="flex-1 flex gap-2 justify-end">
                   <button 
                      className="px-4 py-3 bg-white text-slate-600 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      title="Reimprimir Etiqueta"
                      onClick={() => alert('Comando enviado para a impressora.')}
                   >
                      <Printer size={18} />
                   </button>

                   <button 
                      onClick={handleSuccess}
                      disabled={isProcessing}
                      className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all disabled:opacity-50"
                   >
                      {isProcessing ? 'Processando...' : (
                        <>
                          <CheckCircle2 size={18} /> Finalizar Coleta
                        </>
                      )}
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE INTERCORRÊNCIA COM INSUMOS GASTOS */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-up border-2 border-red-100">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-red-800 flex items-center gap-2 text-lg">
                   <FileWarning /> Ficha de Intercorrência
                </h3>
                <button onClick={() => setShowIssueModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
             </div>

             <div className="space-y-4">
                <p className="text-sm text-slate-500 mb-2">
                  Preencha os dados caso a coleta tenha sido interrompida ou o doador tenha apresentado reações.
                </p>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Motivo / Tipo de Ocorrência <span className="text-brand-red">*</span></label>
                   <select 
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-red-500 text-slate-700"
                      value={issueData.type}
                      onChange={e => setIssueData({...issueData, type: e.target.value})}
                   >
                      <option value="">Selecione...</option>
                      <option value="Reação Vagal Leve (Tontura/Mal estar)">Reação Vagal Leve (Tontura/Mal estar)</option>
                      <option value="Reação Vagal Moderada (Vômito/Desmaio)">Reação Vagal Moderada (Vômito/Desmaio)</option>
                      <option value="Reação Vagal Grave (Convulsão)">Reação Vagal Grave (Convulsão)</option>
                      <option value="Hematoma / Infiltração / Punção acidental de artéria">Problemas de Punção (Hematoma/Artéria)</option>
                      <option value="Fluxo Lento / Interrompido">Fluxo Lento / Interrompido</option>
                      <option value="Defeito no Material (Bolsa furada/Rompida)">Defeito no Material (Bolsa furada/Rompida)</option>
                      <option value="Desistência do Doador">Desistência do Doador</option>
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Observações e Conduta Médica</label>
                   <textarea 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 resize-none h-20 text-sm"
                      placeholder="Descreva o estado do doador e as ações tomadas..."
                      value={issueData.observation}
                      onChange={e => setIssueData({...issueData, observation: e.target.value})}
                   />
                </div>

                {/* Registro de Insumos da Unidade perdidos */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                   <label className="block text-sm font-bold text-amber-800 mb-1">Registro de Insumos Gastos/Perdidos</label>
                   <p className="text-xs text-amber-600 mb-2">Caso a intercorrência tenha inutilizado algum kit de coleta, registre aqui para baixa no estoque.</p>
                   <textarea 
                      className="w-full p-3 bg-white border border-amber-200 rounded-xl outline-none focus:border-amber-500 resize-none h-16 text-sm"
                      placeholder="Ex: 1x Bolsa Quádrupla inutilizada devido à perfuração acidental."
                      value={issueData.consumedMaterials}
                      onChange={e => setIssueData({...issueData, consumedMaterials: e.target.value})}
                   />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleIssue}
                    disabled={!issueData.type || isProcessing}
                    className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 disabled:opacity-50 transition-colors"
                  >
                     {isProcessing ? 'Registrando...' : 'Registrar Intercorrência e Encerrar'}
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-scale-up text-center max-w-sm">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${successMessage.includes('Intercorrência') ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {successMessage.includes('Intercorrência') ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {successMessage.includes('Intercorrência') ? 'Intercorrência Salva' : 'Coleta Finalizada!'}
            </h3>
            <p className="text-slate-500 whitespace-pre-line text-sm">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}