import React, { useState, useRef } from 'react';
import { 
  Search, MapPin, ArrowRightLeft, CheckCircle2, X, 
  PackageCheck, Truck, Barcode, ArrowUpRight, ArrowDownLeft,
  AlertTriangle, FileText, Activity, Check, Ban, AlertCircle,
  ThermometerSnowflake, Package, User
} from 'lucide-react';

interface NetworkUnit {
  id: string;
  name: string;
  distance: string;
  stock: { [key: string]: number };
}

const API_URL = 'http://localhost:5000/api';

interface TransferOrder {
  id: string;
  type: 'incoming' | 'outgoing';
  status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed';
  unitName: string;
  items: string;
  date: string;
  reason: string;
  priority: 'normal' | 'high' | 'critical';
}

export function LogisticsPage() {
  const [activeTab, setActiveTab] = useState<'network' | 'outgoing' | 'incoming'>('network');
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [networkUnits, setNetworkUnits] = useState<NetworkUnit[]>([]);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  React.useEffect(() => {
    setIsLoadingNetwork(true);
    fetch(`${API_URL}/rede/unidades`)
      .then(res => res.ok ? res.json() : [])
      .then(data => { setNetworkUnits(data); setIsLoadingNetwork(false); })
      .catch(err => { console.error('Erro ao buscar unidades:', err); setIsLoadingNetwork(false); });

    setIsLoadingOrders(true);
    fetch(`${API_URL}/logistica/transferencias`)
      .then(res => res.ok ? res.json() : [])
      .then(data => { setOrders(data); setIsLoadingOrders(false); })
      .catch(err => { console.error('Erro ao buscar transferências:', err); setIsLoadingOrders(false); });
  }, []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<NetworkUnit | null>(null);
  const [requestData, setRequestData] = useState({ type: '', quantity: 1, reason: 'estoque_baixo', message: '' });

  const [scanCode, setScanCode] = useState('');
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [processingOrder, setProcessingOrder] = useState<TransferOrder | null>(null);
  
  // Dados de Transporte Padronizados
  const [driverName, setDriverName] = useState('');
  const [boxId, setBoxId] = useState('');
  const [temperature, setTemperature] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [orderToReject, setOrderToReject] = useState<TransferOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const scanInputRef = useRef<HTMLInputElement>(null);

  const resetTransportData = () => {
    setDriverName('');
    setBoxId('');
    setTemperature('');
  };

  const handleOpenRequestModal = (unit: NetworkUnit) => {
    setSelectedUnit(unit);
    const firstType = Object.keys(unit.stock)[0];
    setRequestData({ type: firstType, quantity: 1, reason: 'estoque_baixo', message: '' });
  };

  const handleSendRequest = () => {
    if (!selectedUnit) return;

    fetch(`${API_URL}/logistica/transferencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId: selectedUnit.id, ...requestData })
    })
    .then(res => res.json())
    .then(() => {
      setSuccessMessage('Solicitação enviada! Aguarde a aprovação da unidade de origem.');
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedUnit(null);
      }, 2500);
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao enviar solicitação.');
    });
  };

  const handleApproveOrder = (orderId: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'approved' } : o));
    setSuccessMessage('Pedido Aprovado! Disponível para expedição.');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const openRejectModal = (order: TransferOrder) => {
    setOrderToReject(order);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmRejection = () => {
    if (!orderToReject) return;
    setOrders(orders.map(o => o.id === orderToReject.id ? { ...o, status: 'rejected' } : o));
    setRejectModalOpen(false);
    setOrderToReject(null);
    setSuccessMessage('Pedido Recusado e removido da fila.');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode) return;
    if (scannedItems.includes(scanCode.toUpperCase())) {
      alert('Esta bolsa já foi bipada.');
      setScanCode('');
      return;
    }
    setScannedItems([...scannedItems, scanCode.toUpperCase()]);
    setScanCode('');
    scanInputRef.current?.focus();
  };

  const finishOperation = () => {
    if (!driverName || !boxId || !temperature || scannedItems.length === 0) {
      alert('Preencha os dados logísticos do transporte e adicione ao menos uma bolsa.');
      return;
    }

    const payload = {
      orderId: processingOrder?.id,
      driverName,
      boxId,
      temperature,
      bags: scannedItems
    };
    
    const endpoint = activeTab === 'outgoing' ? '/logistica/transferir' : '/logistica/receber';

    fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error('Erro na operação logística');
        return res.json();
    })
    .then(() => {
      setSuccessMessage(activeTab === 'outgoing' ? 'Expedição concluída! Guia de remessa gerada e itens em trânsito.' : 'Recebimento confirmado! Qualidade validada e estoque atualizado.');
      setShowSuccess(true);
      
      if (processingOrder) {
        const newStatus = activeTab === 'outgoing' ? 'in_transit' : 'completed';
        setOrders(orders.map(o => o.id === processingOrder.id ? { ...o, status: newStatus } : o));
      }

      setTimeout(() => {
        setShowSuccess(false);
        setScannedItems([]);
        setProcessingOrder(null);
        resetTransportData();
      }, 2500);
    })
    .catch(err => {
      console.error(err);
      alert('Ocorreu um erro ao finalizar a operação.');
    });
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getMaxQuantity = () => {
    if (!selectedUnit || !requestData.type) return 1;
    return selectedUnit.stock[requestData.type] || 0;
  };

  const isScannerDisabled = () => {
    return !driverName || !boxId || !temperature;
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Central de Logística Integrada</h1>
          <p className="text-slate-500 text-sm">Gerencie solicitações, expedição e recebimento de bolsas entre unidades da rede.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => { setActiveTab('network'); setProcessingOrder(null); resetTransportData(); }}
          className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'network' ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <MapPin size={18} /> Rede & Solicitações
        </button>
        <button 
          onClick={() => { setActiveTab('outgoing'); setProcessingOrder(null); resetTransportData(); }}
          className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'outgoing' ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ArrowUpRight size={18} /> Expedição (Enviar)
        </button>
        <button 
          onClick={() => { setActiveTab('incoming'); setProcessingOrder(null); resetTransportData(); }}
          className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'incoming' ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ArrowDownLeft size={18} /> Recebimento (Entrada)
        </button>
      </div>

      {activeTab === 'network' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   type="text" 
                   placeholder="Buscar unidade vizinha..." 
                   className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-brand-red outline-none transition-all"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoadingNetwork ? (
                <div className="col-span-full py-8 text-center text-slate-400">
                  <Activity className="animate-spin text-brand-red w-8 h-8 mx-auto mb-2" />
                  <p>Carregando unidades da rede...</p>
                </div>
              ) : networkUnits.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400">
                  <p>Nenhuma unidade encontrada.</p>
                </div>
              ) : (
                networkUnits.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map((unit) => (
                  <div key={unit.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all group flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-slate-800 group-hover:text-brand-red transition-colors">{unit.name}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin size={12} /> {unit.distance}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {Object.entries(unit.stock).map(([type, qtd]) => (
                          <div key={type} className={`text-center p-1.5 rounded-lg border ${qtd < 5 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-[10px] font-bold ${qtd < 5 ? 'text-red-700' : 'text-slate-500'}`}>{type}</p>
                            <p className={`font-bold text-sm ${qtd < 5 ? 'text-red-800' : 'text-slate-800'}`}>{qtd}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenRequestModal(unit)}
                      className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowRightLeft size={16} /> Solicitar Transferência
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 h-fit">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-brand-red" />
              Minhas Solicitações
            </h2>
            <div className="space-y-4">
              {isLoadingOrders ? (
                <div className="py-4 text-center text-slate-400">
                  <p>Carregando solicitações...</p>
                </div>
              ) : orders.filter(o => o.type === 'incoming' && o.status !== 'completed').length === 0 ? (
                <div className="py-4 text-center text-slate-400">
                  <p>Sem solicitações em andamento.</p>
                </div>
              ) : (
                orders.filter(o => o.type === 'incoming' && o.status !== 'completed').map(order => (
                  <div key={order.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${order.priority === 'critical' ? 'bg-red-500' : order.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    <div className="pl-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-slate-500">{order.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'in_transit' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {order.status === 'in_transit' ? 'EM TRÂNSITO' : 'AGUARDANDO'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{order.items}</p>
                      <p className="text-xs text-slate-500 mb-2">De: {order.unitName}</p>
                      <div className="flex items-center gap-1 text-[10px] font-bold bg-white w-fit px-2 py-1 rounded border border-gray-200 text-slate-600">
                        <FileText size={10} />
                        Motivo: {order.reason}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'outgoing' || activeTab === 'incoming') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* COLUNA ESQUERDA: LISTA DE PEDIDOS */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 h-fit">
              <h2 className="font-bold text-slate-800 mb-4">
                {activeTab === 'outgoing' ? 'Solicitações Recebidas' : 'Cargas para Receber'}
              </h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {orders.filter(o => o.type === activeTab && o.status !== 'rejected' && o.status !== 'completed').map(order => (
                  <div 
                    key={order.id}
                    className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                      processingOrder?.id === order.id 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                        : 'bg-white border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold rounded-bl-lg ${
                       processingOrder?.id === order.id ? 'bg-slate-700 text-slate-200' : getPriorityColor(order.priority)
                    }`}>
                      {order.priority === 'critical' ? 'URGENTE' : order.priority === 'high' ? 'PRIORITÁRIO' : 'NORMAL'}
                    </div>

                    <div className="flex justify-between items-center mb-1 mt-2">
                      <span className={`text-xs font-bold ${processingOrder?.id === order.id ? 'text-slate-300' : 'text-slate-500'}`}>{order.id}</span>
                      {order.status === 'approved' && <span className="text-[10px] bg-emerald-500 text-white px-2 rounded-full">APROVADO</span>}
                    </div>
                    
                    <p className={`font-bold text-lg ${processingOrder?.id === order.id ? 'text-white' : 'text-slate-800'}`}>{order.items}</p>
                    <p className={`text-xs mt-1 ${processingOrder?.id === order.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {activeTab === 'outgoing' ? `Destino: ${order.unitName}` : `Origem: ${order.unitName}`}
                    </p>
                    
                    <div className={`mt-3 pt-2 border-t flex items-center gap-1.5 ${processingOrder?.id === order.id ? 'border-slate-600' : 'border-gray-100'}`}>
                      <FileText size={12} className={processingOrder?.id === order.id ? 'text-slate-400' : 'text-slate-400'} />
                      <span className={`text-xs font-medium ${processingOrder?.id === order.id ? 'text-slate-200' : 'text-slate-600'}`}>
                        {order.reason}
                      </span>
                    </div>

                    {activeTab === 'outgoing' && order.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleApproveOrder(order.id); }}
                          className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-1"
                        >
                          <Check size={14} /> Aprovar
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openRejectModal(order); }}
                          className="flex-1 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-1"
                        >
                          <Ban size={14} /> Recusar
                        </button>
                      </div>
                    )}

                    {((activeTab === 'outgoing' && order.status === 'approved') || (activeTab === 'incoming' && order.status === 'in_transit')) && (
                      <button 
                        onClick={() => { setProcessingOrder(order); setScannedItems([]); resetTransportData(); }}
                        className={`w-full mt-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${
                          processingOrder?.id === order.id 
                            ? 'bg-slate-700 text-white cursor-default'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {activeTab === 'outgoing' ? 'Iniciar Expedição' : 'Conferir Recebimento'} <ArrowUpRight size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: TRANSPORTE E BIPAGEM */}
          <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
            {!processingOrder ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-slate-400">
                <Truck size={48} className="mb-4 opacity-20" />
                <p>Selecione um pedido aprovado ao lado para iniciar a {activeTab === 'outgoing' ? 'expedição' : 'conferência'}.</p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 animate-fade-in">
                  
                  {/* Cabeçalho do Pedido */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Barcode className="text-slate-400" /> {processingOrder.unitName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">Motivo: {processingOrder.reason}</p>
                    </div>
                    <span className="bg-brand-red text-white text-xs font-bold px-3 py-1 rounded-lg">
                      Lote: {processingOrder.items}
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {activeTab === 'outgoing' ? 'Temp. Saída (°C)' : 'Temp. Chegada (°C)'}
                      </label>
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
                    {activeTab === 'outgoing' ? 'Bipagem de Bolsas (Baixa de Estoque)' : 'Bipagem de Bolsas (Entrada)'}
                  </label>
                  <form onSubmit={handleScan} className="relative">
                    <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      ref={scanInputRef}
                      type="text" 
                      className="w-full pl-12 pr-32 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-mono focus:bg-white focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all uppercase placeholder:text-slate-400"
                      placeholder={!isScannerDisabled() ? "BIPE OU DIGITE O CÓDIGO DA BOLSA" : "Preencha os dados do transporte acima..."}
                      value={scanCode}
                      onChange={e => setScanCode(e.target.value)}
                      disabled={isScannerDisabled()}
                      autoFocus
                    />
                    <button 
                      type="submit"
                      disabled={!scanCode}
                      className="absolute right-2 top-2 bottom-2 px-6 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 disabled:opacity-0 transition-all shadow-sm"
                    >
                      Adicionar
                    </button>
                  </form>
                  
                  {isScannerDisabled() && (
                    <p className="text-xs text-amber-600 mt-3 flex items-center gap-1 font-medium">
                      <AlertCircle size={14} /> Preencha os dados do transporte acima para liberar a leitura.
                    </p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px] animate-fade-in">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Itens Conferidos ({scannedItems.length})</span>
                    <button onClick={() => setScannedItems([])} className="text-xs text-red-500 hover:underline">Limpar lista</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {scannedItems.map((code, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                        <span className="font-mono font-bold text-slate-700">{code}</span>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                    ))}
                    {scannedItems.length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-10">Nenhuma bolsa bipada ainda.</p>
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button 
                      onClick={finishOperation}
                      disabled={scannedItems.length === 0}
                      className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        activeTab === 'outgoing' 
                          ? 'bg-brand-red hover:bg-red-700 shadow-brand-red/20' 
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                      }`}
                    >
                      {activeTab === 'outgoing' 
                        ? <><PackageCheck size={20} /> Confirmar Envio e Baixar Estoque</> 
                        : <><PackageCheck size={20} /> Confirmar Entrada no Estoque</>
                      }
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Nova Solicitação</h3>
              <button onClick={() => setSelectedUnit(null)}><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600 uppercase font-bold">Unidade Cedente</p>
                <p className="font-bold text-slate-800">{selectedUnit.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tipo Sanguíneo</label>
                  <select 
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red"
                    value={requestData.type}
                    onChange={e => setRequestData({...requestData, type: e.target.value})}
                  >
                    {Object.keys(selectedUnit.stock).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Qtd. (Max: {getMaxQuantity()})</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={getMaxQuantity()}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red"
                    value={requestData.quantity}
                    onChange={e => setRequestData({...requestData, quantity: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Motivo da Solicitação <span className="text-red-500">*</span></label>
                <select 
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red"
                  value={requestData.reason}
                  onChange={e => setRequestData({...requestData, reason: e.target.value})}
                >
                  <option value="estoque_baixo">Reposição de Estoque Baixo</option>
                  <option value="cirurgia">Cirurgia Eletiva / Programada</option>
                  <option value="urgencia">Transfusão de Urgência / Emergência</option>
                  <option value="calamidade">Calamidade / Acidente com Múltiplas Vítimas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mensagem ao Cedente (Opcional)</label>
                <textarea 
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red resize-none h-24"
                  placeholder="Descreva detalhes adicionais sobre a necessidade..."
                  value={requestData.message}
                  onChange={e => setRequestData({...requestData, message: e.target.value})}
                />
              </div>

              {requestData.reason === 'urgencia' || requestData.reason === 'calamidade' ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 text-red-700 text-xs font-bold items-center">
                   <AlertTriangle size={16} />
                   <span>Solicitação marcada como PRIORIDADE CRÍTICA.</span>
                </div>
              ) : null}

              <div className="pt-2">
                <button 
                  onClick={handleSendRequest}
                  className="w-full py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-brand-red/20 transition-all flex items-center justify-center gap-2"
                >
                  <Truck size={18} /> Confirmar Solicitação
                </button>
              </div>
            </div>
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
              Informe o motivo da recusa para a unidade solicitante ({orderToReject.unitName}).
            </p>
            
            <textarea 
              className="w-full p-3 bg-red-50 border border-red-200 rounded-xl outline-none focus:border-red-500 resize-none h-32 mb-4 text-red-900 placeholder:text-red-300"
              placeholder="Ex: Estoque indisponível no momento..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              autoFocus
            />

            <div className="flex gap-2">
              <button 
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2 bg-gray-100 text-slate-600 rounded-lg font-bold hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmRejection}
                disabled={!rejectionReason}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-scale-up text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Sucesso!</h3>
            <p className="text-slate-500 text-sm">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}