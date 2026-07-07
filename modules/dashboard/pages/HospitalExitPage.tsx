import { useState, useRef, useEffect } from 'react';
import { 
  Truck, User, Barcode, CheckCircle2, X, AlertCircle, Building2, 
  ThermometerSnowflake, Package, FileText, ClipboardCheck,
  ArrowUpRight, Activity, Check, Ban
} from 'lucide-react';

interface ScannedBag {
  code: string;
  type: string;
  component: string;
}

interface HospitalOrder {
  id: string;
  hospitalName: string;
  doctor: string;
  items: string;
  date: string;
  reason: string;
  priority: 'normal' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

const API_URL = 'http://localhost:5000/api';

export function HospitalExitPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'dispatch'>('requests');
  const [orders, setOrders] = useState<HospitalOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    setIsLoadingOrders(true);
    fetch(`${API_URL}/pedidos/pendentes`)
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setIsLoadingOrders(false);
      })
      .catch(err => {
        console.error('Erro ao buscar pedidos pendentes:', err);
        setIsLoadingOrders(false);
      });
  }, []);
  
  const [processingOrder, setProcessingOrder] = useState<HospitalOrder | null>(null);
  
  // Dados Logísticos (Agrupados)
  const [driverName, setDriverName] = useState('');
  const [boxId, setBoxId] = useState('');
  const [temperature, setTemperature] = useState('');

  const [scanCode, setScanCode] = useState('');
  const [scannedBags, setScannedBags] = useState<ScannedBag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [orderToReject, setOrderToReject] = useState<HospitalOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const scanInputRef = useRef<HTMLInputElement>(null);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const handleApproveOrder = (orderId: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'approved' } : o));
    setToastMessage('Solicitação Aprovada! Pronta para expedição.');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const openRejectModal = (order: HospitalOrder) => {
    setOrderToReject(order);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmRejection = () => {
    if (!orderToReject) return;
    setOrders(orders.map(o => o.id === orderToReject.id ? { ...o, status: 'rejected' } : o));
    setRejectModalOpen(false);
    setOrderToReject(null);
    setToastMessage('Solicitação Hospitalar Recusada.');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode) return;

    const codeUpper = scanCode.toUpperCase();
    if (scannedBags.find(b => b.code === codeUpper)) {
      alert('Esta bolsa já foi bipada e está na caixa térmica!');
      setScanCode('');
      scanInputRef.current?.focus();
      return;
    }

    fetch(`${API_URL}/estoque/bolsa/${codeUpper}`)
      .then(res => {
        if (!res.ok) throw new Error('Bolsa não encontrada');
        return res.json();
      })
      .then(data => {
        const newBag: ScannedBag = {
          code: codeUpper,
          type: data.type || data.bloodType,
          component: data.component
        };
        setScannedBags([...scannedBags, newBag]);
      })
      .catch(err => {
        console.error('Erro na bipagem:', err);
        alert('Erro: Bolsa não encontrada ou indisponível.');
      })
      .finally(() => {
        setScanCode('');
        scanInputRef.current?.focus();
      });
  };

  const handleRemoveBag = (code: string) => {
    setScannedBags(scannedBags.filter(b => b.code !== code));
  };

  const handleFinalizeExit = () => {
    if (!driverName || !boxId || !temperature || scannedBags.length === 0) {
      alert('Preencha os dados logísticos do transporte e bipe ao menos uma bolsa para liberar a saída.');
      return;
    }

    setIsSubmitting(true);

    const checkOutData = {
      orderId: processingOrder?.id,
      driverName,
      boxId,
      temperature,
      bags: scannedBags.map(b => b.code)
    };

    fetch(`${API_URL}/logistica/saida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkOutData)
    })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao registrar saída de estoque');
        return res.json();
      })
      .then(() => {
        setIsSubmitting(false);
        setShowReceipt(true);
        if (processingOrder) {
          setOrders(orders.map(o => o.id === processingOrder.id ? { ...o, status: 'completed' } : o));
        }
      })
      .catch(err => {
        console.error('Erro na saída:', err);
        setIsSubmitting(false);
        alert('Ocorreu um erro ao finalizar a expedição.');
      });
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setScannedBags([]);
    setScanCode('');
    setDriverName('');
    setBoxId('');
    setTemperature('');
    setProcessingOrder(null);
    setActiveTab('requests');
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Saída Hospitalar</h1>
          <p className="text-slate-500 text-sm">Gestão de solicitações clínicas, expedição de caixas e baixa de estoque.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => { setActiveTab('requests'); setProcessingOrder(null); }}
          className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'requests' ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Activity size={18} /> Solicitações Pendentes
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="bg-red-100 text-brand-red text-[10px] px-2 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('dispatch')}
          className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'dispatch' ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ArrowUpRight size={18} /> Expedição & Saída
        </button>
      </div>

      {activeTab === 'requests' && (
        isLoadingOrders ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3 bg-white border border-gray-200 rounded-2xl">
            <Activity className="animate-spin text-brand-red w-8 h-8" />
            <p className="font-medium">Carregando solicitações...</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {orders.filter(o => o.status === 'pending').map(order => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
              <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl ${getPriorityColor(order.priority)}`}>
                {order.priority === 'critical' ? 'URGÊNCIA/EMERGÊNCIA' : order.priority === 'high' ? 'PRIORITÁRIO' : 'ELETIVO'}
              </div>
              
              <div className="mb-4 pr-24">
                <span className="text-xs font-bold text-slate-400">{order.id}</span>
                <h3 className="font-bold text-slate-800 text-lg mt-1">{order.hospitalName}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <User size={14} /> {order.doctor}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4 flex-1">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Hemocomponentes Solicitados</p>
                <p className="font-bold text-brand-red text-lg">{order.items}</p>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-200">
                  <FileText size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">{order.reason}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={() => openRejectModal(order)}
                  className="flex-1 py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-2 transition-colors border border-red-100"
                >
                  <Ban size={16} /> Recusar
                </button>
                <button 
                  onClick={() => handleApproveOrder(order.id)}
                  className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 flex items-center justify-center gap-2 transition-colors border border-emerald-100"
                >
                  <Check size={16} /> Aprovar
                </button>
              </div>
            </div>
          ))}
          {orders.filter(o => o.status === 'pending').length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white border border-gray-200 rounded-2xl border-dashed">
              <Activity size={48} className="mx-auto mb-4 opacity-20" />
              <p>Não há solicitações hospitalares pendentes.</p>
            </div>
          )}
        </div>
        )
      )}

      {activeTab === 'dispatch' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
          
          {/* COLUNA ESQUERDA: LISTA DE PEDIDOS APROVADOS */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 h-fit">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 px-2">
                <CheckCircle2 className="text-emerald-500" size={20} />
                Pedidos Aprovados
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {orders.filter(o => o.status === 'approved').map(order => (
                  <button 
                    key={order.id}
                    onClick={() => { setProcessingOrder(order); /* setScannedItems([]); */ }}
                    className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                      processingOrder?.id === order.id 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-brand-red/50 hover:bg-red-50/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold ${processingOrder?.id === order.id ? 'text-slate-300' : 'text-slate-500'}`}>{order.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        processingOrder?.id === order.id ? 'bg-slate-700 text-slate-200' : getPriorityColor(order.priority)
                      }`}>
                        {order.priority === 'critical' ? 'URGENTE' : 'NORMAL'}
                      </span>
                    </div>
                    <p className={`font-bold truncate ${processingOrder?.id === order.id ? 'text-white' : 'text-slate-800'}`}>{order.hospitalName}</p>
                    <p className={`text-sm mt-1 font-medium ${processingOrder?.id === order.id ? 'text-brand-red' : 'text-brand-red'}`}>{order.items}</p>
                  </button>
                ))}
                {orders.filter(o => o.status === 'approved').length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-4">Nenhum pedido aguardando expedição.</p>
                )}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: TRANSPORTE, BIPAGEM E CAIXA TÉRMICA */}
          <div className="xl:col-span-2 space-y-6 flex flex-col h-full">
            {!processingOrder ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-slate-400">
                <Truck size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium text-slate-500">Selecione um pedido aprovado ao lado</p>
                <p className="text-sm">Para iniciar o processo logístico e montagem da caixa térmica.</p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 animate-fade-in">
                  
                  {/* Cabeçalho do Pedido */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Building2 className="text-slate-400" /> {processingOrder.hospitalName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">A/C: {processingOrder.doctor} • Motivo: {processingOrder.reason}</p>
                    </div>
                    <span className="bg-brand-red text-white text-xs font-bold px-3 py-1 rounded-lg">
                      Separar: {processingOrder.items}
                    </span>
                  </div>

                  {/* DADOS DE TRANSPORTE (HORIZONTAL, FINO E NO TOPO) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl mb-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motorista / Portador</label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="Nome..."
                          className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-brand-red outline-none transition-all text-slate-700"
                          value={driverName}
                          onChange={e => setDriverName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Caixa Térmica</label>
                      <div className="relative">
                        <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="ID (Ex: CX-05)"
                          className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-brand-red outline-none transition-all font-mono uppercase text-slate-700"
                          value={boxId}
                          onChange={e => setBoxId(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Temp. Saída (°C)</label>
                      <div className="relative">
                        <ThermometerSnowflake className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500" size={14} />
                        <input 
                          type="number" 
                          placeholder="Ex: 4.5"
                          className="w-full pl-8 pr-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm focus:border-brand-red outline-none transition-all font-bold text-blue-800"
                          value={temperature}
                          onChange={e => setTemperature(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') scanInputRef.current?.focus(); }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CAMPO DE BIPAGEM */}
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Bipagem de Bolsas (Baixa de Estoque)
                  </label>
                  <form onSubmit={handleScan} className="relative">
                    <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      ref={scanInputRef}
                      type="text" 
                      className="w-full pl-12 pr-32 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-mono focus:bg-white focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all uppercase placeholder:text-slate-400"
                      placeholder={driverName && temperature && boxId ? "BIPE OU DIGITE O CÓDIGO DA BOLSA" : "Preencha os dados logísticos acima..."}
                      value={scanCode}
                      onChange={e => setScanCode(e.target.value)}
                      disabled={!driverName || !boxId || !temperature}
                    />
                    <button 
                      type="submit"
                      disabled={!scanCode}
                      className="absolute right-2 top-2 bottom-2 px-6 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 disabled:opacity-0 transition-all shadow-sm"
                    >
                      Adicionar
                    </button>
                  </form>
                  {(!driverName || !boxId || !temperature) && (
                    <p className="text-xs text-amber-600 mt-3 flex items-center gap-1 font-medium">
                      <AlertCircle size={14} /> Preencha os dados do transporte acima para liberar a leitura.
                    </p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px] animate-fade-in">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <Package className="text-slate-400" size={18} />
                      Itens na Caixa Térmica ({scannedBags.length})
                    </h3>
                    {scannedBags.length > 0 && (
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={14} /> Lote em formação
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[350px] custom-scrollbar">
                    {scannedBags.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 p-12">
                        <Package size={48} className="mb-4 opacity-20" />
                        <p className="text-center font-medium text-sm">Nenhuma bolsa bipada ainda.<br/>Inicie a leitura dos códigos de barras.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 border-b border-gray-100">
                          <tr>
                            <th className="p-4 pl-6">Código ISBT/NAT</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Hemocomponente</th>
                            <th className="p-4 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {scannedBags.map((bag) => (
                            <tr key={bag.code} className="hover:bg-slate-50 transition-colors group">
                              <td className="p-4 pl-6 font-mono font-bold text-slate-700">{bag.code}</td>
                              <td className="p-4">
                                <span className={`font-bold px-2.5 py-1 rounded-lg text-xs ${bag.type.includes('-') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {bag.type}
                                </span>
                              </td>
                              <td className="p-4 text-slate-600 font-medium">{bag.component}</td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => handleRemoveBag(bag.code)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-50 group-hover:opacity-100"
                                >
                                  <X size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto">
                    <button 
                      onClick={handleFinalizeExit}
                      disabled={scannedBags.length === 0 || isSubmitting}
                      className="w-full py-4 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-red/20 text-lg"
                    >
                      {isSubmitting ? 'Gerando Guia de Remessa...' : (
                        <>
                          <Truck size={24} />
                          Liberar Veículo e Baixar Estoque
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {rejectModalOpen && orderToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-up border-2 border-red-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle className="text-red-600" /> Recusar Solicitação
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Informe o motivo da recusa para o {orderToReject.hospitalName}.
            </p>
            
            <textarea 
              className="w-full p-3 bg-red-50 border border-red-200 rounded-xl outline-none focus:border-red-500 resize-none h-32 mb-4 text-red-900 placeholder:text-red-300 text-sm"
              placeholder="Ex: Estoque incompatível com a solicitação no momento..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              autoFocus
            />

            <div className="flex gap-2">
              <button 
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 text-slate-600 rounded-xl font-bold hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmRejection}
                disabled={!rejectionReason}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && processingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-emerald-500 p-6 text-center text-white relative">
               <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                 <div className="w-40 h-40 border-4 border-white rounded-full absolute -top-10 -right-10"></div>
                 <div className="w-24 h-24 border-4 border-white rounded-full absolute bottom-4 -left-8"></div>
               </div>
               <ClipboardCheck size={56} className="mx-auto mb-4 relative z-10" />
               <h2 className="text-2xl font-bold tracking-tight relative z-10">Guia de Remessa Emitida</h2>
               <p className="opacity-90 mt-1 relative z-10 text-sm">A solicitação {processingOrder.id} foi concluída.</p>
            </div>
            
            <div className="p-6 space-y-4">
               <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                 <Building2 className="text-slate-400 mt-0.5" size={20} />
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase">Destino</p>
                   <p className="font-bold text-slate-700">{processingOrder.hospitalName}</p>
                   <p className="text-sm text-slate-500">A/C: {processingOrder.doctor}</p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                   <p className="text-xs font-bold text-blue-400 uppercase">Transporte</p>
                   <p className="font-bold text-blue-900 mt-1 truncate" title={driverName}>{driverName}</p>
                   <p className="text-xs text-blue-600 mt-0.5">Caixa: <span className="font-mono">{boxId}</span> ({temperature}°C)</p>
                 </div>
                 <div className="p-4 bg-brand-red/10 rounded-xl border border-brand-red/20 text-center flex flex-col justify-center">
                   <p className="text-xs font-bold text-brand-red uppercase">Volume Enviado</p>
                   <p className="text-3xl font-extrabold text-brand-red mt-1">{scannedBags.length}</p>
                   <p className="text-xs text-brand-red font-medium">Bolsas Baixadas</p>
                 </div>
               </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button 
                onClick={() => alert('Imprimindo Guia de Remessa e Relação de Bolsas...')}
                className="flex-1 py-3 bg-gray-100 text-slate-600 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={18} /> Imprimir Guia
              </button>
              <button 
                onClick={handleCloseReceipt}
                className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up bg-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl font-medium flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-400" />
          {toastMessage}
        </div>
      )}

    </div>
  );
}
