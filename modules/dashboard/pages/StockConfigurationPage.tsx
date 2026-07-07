import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle2, RotateCcw, Sliders, Activity } from 'lucide-react';

interface BloodLevelConfig {
  type: string;
  critical: number; 
  warning: number;  
  ideal: number;    
}

const INITIAL_CONFIG: BloodLevelConfig[] = [
  { type: 'A+', critical: 50, warning: 100, ideal: 150 },
  { type: 'A-', critical: 10, warning: 20, ideal: 40 },
  { type: 'B+', critical: 40, warning: 80, ideal: 120 },
  { type: 'B-', critical: 10, warning: 20, ideal: 40 },
  { type: 'AB+', critical: 10, warning: 20, ideal: 30 },
  { type: 'AB-', critical: 5, warning: 10, ideal: 20 },
  { type: 'O+', critical: 80, warning: 150, ideal: 250 },
  { type: 'O-', critical: 20, warning: 40, ideal: 80 },
];

const API_URL = 'http://localhost:5000/api';

export function StockConfigurationPage() {
  const [configs, setConfigs] = useState<BloodLevelConfig[]>([]);
  const [originalConfigs, setOriginalConfigs] = useState<BloodLevelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/estoque/configuracoes`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const loadedConfigs = (data && data.length > 0) ? data : INITIAL_CONFIG;
        setConfigs(loadedConfigs);
        setOriginalConfigs(loadedConfigs);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar configurações:', err);
        setConfigs(INITIAL_CONFIG);
        setOriginalConfigs(INITIAL_CONFIG);
        setIsLoading(false);
      });
  }, []);

  const handleChange = (type: string, field: keyof BloodLevelConfig, value: number) => {
    setConfigs(configs.map(cfg => 
      cfg.type === type ? { ...cfg, [field]: value } : cfg
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    const invalid = configs.find(c => c.critical >= c.warning || c.warning >= c.ideal);
    if (invalid) {
      alert(`Erro na configuração de ${invalid.type}: \nO nível Crítico deve ser menor que o Alerta, que deve ser menor que o Ideal.`);
      return;
    }

    fetch(`${API_URL}/estoque/configuracoes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configs)
    })
    .then(res => {
      if (!res.ok) throw new Error('Falha ao salvar');
      return res.json();
    })
    .then(() => {
      setShowSuccess(true);
      setHasChanges(false);
      setOriginalConfigs(configs);
      setTimeout(() => setShowSuccess(false), 2500);
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao salvar configurações.');
    });
  };

  const handleReset = () => {
    if (confirm('Descartar alterações não salvas?')) {
      setConfigs(originalConfigs);
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Parametrização de Estoque</h1>
          <p className="text-slate-500 text-sm">Defina os níveis de alerta para os indicadores do Dashboard.</p>
        </div>
        
        <div className="flex gap-3">
           <button 
             onClick={handleReset}
             disabled={!hasChanges}
             className="px-4 py-2 text-slate-500 hover:bg-gray-100 rounded-xl font-bold transition-colors disabled:opacity-50"
           >
             <RotateCcw size={18} />
           </button>
           <button 
             onClick={handleSave}
             disabled={!hasChanges}
             className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-slate-200"
           >
             <Save size={18} />
             Salvar Alterações
           </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 bg-white border border-gray-200 rounded-2xl text-center text-slate-400">
          <Activity className="animate-spin text-brand-red w-8 h-8 mx-auto mb-2" />
          <p>Carregando parâmetros...</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start gap-4">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Sliders size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Como funciona?</h3>
              <p className="text-sm text-slate-500 max-w-2xl leading-relaxed mt-1">
                Esses valores alimentam os gráficos e alertas do sistema.
                <br />
                <span className="text-red-600 font-bold">• Crítico:</span> Estoque abaixo desse valor gera alertas de emergência.
                <br />
                <span className="text-amber-600 font-bold">• Alerta:</span> Ponto de pedido (iniciar campanhas).
                <br />
                <span className="text-emerald-600 font-bold">• Ideal:</span> Meta operacional (100% da capacidade).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 pl-8">Tipo Sanguíneo</th>
                  <th className="p-4 text-center text-red-600">Nível Crítico (Min)</th>
                  <th className="p-4 text-center text-amber-600">Nível de Alerta</th>
                  <th className="p-4 text-center text-emerald-600">Meta Ideal (Max)</th>
                  <th className="p-4">Visualização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {configs.map((config) => (
                  <tr key={config.type} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-8">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-700 border border-slate-200">
                        {config.type}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <input 
                          type="number" 
                          className="w-24 p-2 text-center font-bold text-red-700 bg-red-50 border border-red-100 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
                          value={config.critical}
                          onChange={(e) => handleChange(config.type, 'critical', Number(e.target.value))}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <input 
                          type="number" 
                          className="w-24 p-2 text-center font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg outline-none focus:ring-2 focus:ring-amber-200"
                          value={config.warning}
                          onChange={(e) => handleChange(config.type, 'warning', Number(e.target.value))}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <input 
                          type="number" 
                          className="w-24 p-2 text-center font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200"
                          value={config.ideal}
                          onChange={(e) => handleChange(config.type, 'ideal', Number(e.target.value))}
                        />
                      </div>
                    </td>
                    <td className="p-4 w-48">
                      <div className="h-2 w-full bg-gray-100 rounded-full flex overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${(config.critical / config.ideal) * 100}%` }} title="Zona Crítica" />
                        <div className="h-full bg-amber-400" style={{ width: `${((config.warning - config.critical) / config.ideal) * 100}%` }} title="Zona de Alerta" />
                        <div className="h-full bg-emerald-500 flex-1" title="Zona Segura" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-scale-up text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Parâmetros Atualizados!</h3>
            <p className="text-slate-500">O Dashboard agora reflete as novas metas de estoque.</p>
          </div>
        </div>
      )}
    </div>
  );
}