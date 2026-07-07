import { useState, useRef, useEffect } from 'react';
import { Filter, Download, Building2, ChevronDown, AlertTriangle, Droplets, Calendar, Check, Users, MapPin, Activity } from 'lucide-react';
import { OperationsChart } from '../components/OperationsChart';
import { StockDistributionChart } from '../components/StockDistributionChart';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type BloodType = typeof BLOOD_TYPES[number];

const INITIAL_HEMOCOMPONENTS = BLOOD_TYPES.reduce((acc, type) => {
  acc[type] = [];
  return acc;
}, {} as Record<BloodType, { name: string, amount: number, target: number, prediction: number }[]>);

const INITIAL_DEMOGRAPHICS = BLOOD_TYPES.reduce((acc, type) => {
  acc[type] = { gender: { m: 0, f: 0 }, age: [0, 0, 0, 0] };
  return acc;
}, {} as Record<BloodType, { gender: { m: number, f: number }, age: number[] }>);

const API_URL = 'http://localhost:5000/api';

function CustomSelect({ 
  options, value, onChange, icon: Icon, align = 'left'
}: { 
  options: { label: string, value: string }[], value: string, onChange: (val: string) => void, icon?: any, align?: 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(opt => opt.value === value)?.label;

  return (
    <div className="relative min-w-[140px]" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-3 pr-2 py-2 bg-white border rounded-lg text-xs font-medium transition-all ${isOpen ? 'border-brand-red ring-2 ring-brand-red/10' : 'border-gray-200 hover:border-gray-300'}`}
      >
        <div className="flex items-center gap-2 text-slate-700 truncate">
          {Icon && <Icon size={16} className="text-gray-400" />}
          <span>{selectedLabel}</span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-max min-w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center justify-between ${value === option.value ? 'text-brand-red font-semibold bg-red-50' : 'text-slate-600'}`}
            >
              {option.label}
              {value === option.value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardHome() {
  const [activeTab, setActiveTab] = useState<BloodType>('O+');
  const [selectedUnit, setSelectedUnit] = useState('consolidado');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [hemocomponentsByType, setHemocomponentsByType] = useState(INITIAL_HEMOCOMPONENTS);
  const [demographicsByType, setDemographicsByType] = useState(INITIAL_DEMOGRAPHICS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch(`${API_URL}/dashboard/kpis`).then(res => res.ok ? res.json() : null),
      fetch(`${API_URL}/dashboard/graficos`).then(res => res.ok ? res.json() : null)
    ])
    .then(([kpis, graficos]) => {
      // O backend deve retornar os dados com a estrutura esperada
      if (kpis) setHemocomponentsByType(kpis);
      if (graficos) setDemographicsByType(graficos);
      setIsLoading(false);
    })
    .catch(err => {
      console.error('Erro ao buscar dashboard:', err);
      setIsLoading(false);
    });
  }, [selectedUnit]);

  // Busca os hemocomponentes com base no tipo selecionado na aba
  const activeHemocomponents = hemocomponentsByType[activeTab] || [];

  const demographics = demographicsByType[activeTab] || { gender: { m: 0, f: 0 }, age: [0, 0, 0, 0] };
  const genderData = [
    { label: 'Masculino', value: demographics.gender.m, color: '#3b82f6' },
    { label: 'Feminino', value: demographics.gender.f, color: '#ec4899' },
  ];
  const ageData = [
    { label: '18-29', value: demographics.age[0], height: 'h-24' },
    { label: '30-45', value: demographics.age[1], height: 'h-32' },
    { label: '46-60', value: demographics.age[2], height: 'h-12' },
    { label: '60+', value: demographics.age[3], height: 'h-8' },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setIsFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6 pb-8 animate-fade-in-up">
      
      {/* Header e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Controle</h1>
          <p className="text-slate-500 text-sm">Visão geral da operação e níveis por Hemocomponente.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 relative">
          <div className="min-w-[240px]">
             <CustomSelect 
                icon={Building2}
                value={selectedUnit}
                onChange={setSelectedUnit}
                options={[
                  { label: 'Visão Consolidada (Rede)', value: 'consolidado' },
                  { label: 'Hemocentro Regional (Sede)', value: 'unidade-1' },
                  { label: 'Unidade Móvel 01', value: 'unidade-2' }
                ]}
              />
          </div>

          <div className="flex gap-2" ref={filterRef}>
            <div className="relative">
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`px-4 py-2 bg-white border rounded-lg shadow-sm transition-colors text-xs font-medium flex items-center gap-2 h-full ${isFilterOpen ? 'border-brand-red text-brand-red bg-red-50' : 'border-gray-200 text-slate-600 hover:bg-gray-50'}`}>
                 <Filter size={16} /> <span>Filtros</span>
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-4 animate-fade-in-up">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Período</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="radio" name="period" className="text-brand-red focus:ring-brand-red" defaultChecked /> Hoje</label>
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="radio" name="period" className="text-brand-red focus:ring-brand-red" /> Esta Semana</label>
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="radio" name="period" className="text-brand-red focus:ring-brand-red" /> Este Mês</label>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <button className="w-full py-2 bg-brand-red text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Aplicar Filtros</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button className="px-4 py-2 text-brand-red bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 shadow-sm transition-colors text-xs font-medium flex items-center gap-2 h-full">
               <Download size={16} /> <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cartão Principal: Status por Hemocomponente */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 overflow-x-auto bg-slate-50">
          <div className="flex p-3 min-w-max gap-2">
            {BLOOD_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex-1 min-w-[70px] py-3 px-2 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 border ${
                  activeTab === type 
                    ? 'bg-brand-red border-brand-red text-white shadow-md scale-105' 
                    : 'bg-white border-gray-200 text-slate-500 hover:bg-red-50 hover:text-brand-red hover:border-red-200'
                }`}
              >
                <span className="text-xl">{type}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <div className="mb-6 border-b border-gray-100 pb-4 flex justify-between items-end">
             <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Estoque <span className="text-brand-red">{activeTab}</span></h2>
                <p className="text-sm text-slate-500">Níveis de segurança de todos os hemocomponentes derivados deste tipo sanguíneo.</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {isLoading ? (
               <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                 <AlertTriangle className="animate-spin text-brand-red w-8 h-8" />
                 <p className="font-medium">Carregando indicadores...</p>
               </div>
            ) : activeHemocomponents.length === 0 ? (
               <div className="col-span-full py-12 text-center text-slate-400">Nenhum dado disponível.</div>
            ) : (
              activeHemocomponents.map((comp) => {
                const percentage = Math.min((comp.amount / comp.target) * 100, 100);
                const isCritical = percentage < 25;
                const isWarning = percentage >= 25 && percentage < 50;
                
                const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
                const bgColor = isCritical ? 'bg-red-50' : isWarning ? 'bg-amber-50' : 'bg-emerald-50';
                const textColor = isCritical ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-emerald-700';

                return (
                  <div key={comp.name} className="p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow bg-white">
                     <div className="flex justify-between items-start mb-4">
                       <div>
                         <h3 className="text-sm font-bold text-slate-700 w-40 truncate" title={comp.name}>{comp.name}</h3>
                         <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-extrabold text-slate-800">{comp.amount}</span>
                            <span className="text-xs text-slate-400 font-medium">/ {comp.target} un</span>
                         </div>
                       </div>
                       <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${bgColor} ${textColor}`}>
                          {isCritical ? 'Crítico' : isWarning ? 'Atenção' : 'Estável'}
                       </span>
                     </div>

                     <div className="space-y-2 mb-4">
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>

                    {comp.prediction <= 5 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-xs font-bold text-red-600">
                        <AlertTriangle size={14} /> Previsão de esgotamento: {comp.prediction} dias
                      </div>
                    )}
                    {comp.prediction > 5 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-xs font-medium text-slate-400">
                        <Activity size={14} /> Abastecido para {comp.prediction} dias
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[300px]">
          {isLoading ? (
             <div className="h-full flex items-center justify-center text-slate-400 py-12">Carregando gráficos...</div>
          ) : (
             <>
                <div className="flex items-center gap-2 mb-6">
                  <h3 className="font-bold text-slate-800">Perfil: Gênero</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Tipo {activeTab}</span>
                </div>
                
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-40 h-40 rounded-full transition-all duration-500" style={{ background: `conic-gradient(${genderData[0].color} 0% ${genderData[0].value}%, ${genderData[1].color} ${genderData[0].value}% 100%)` }}>
                    <div className="absolute inset-0 m-8 bg-white rounded-full flex items-center justify-center flex-col">
                      <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
                      <span className="text-xl font-bold text-slate-800">{genderData[0].value + genderData[1].value > 0 ? '100%' : '0%'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-6 mt-4">
                  {genderData.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{item.value}%</p>
                        <p className="text-xs text-slate-400">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </>
          )}
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[300px]">
          {isLoading ? (
             <div className="h-full flex items-center justify-center text-slate-400 py-12">Carregando gráficos...</div>
          ) : (
             <>
                <div className="flex items-center gap-2 mb-6">
                   <h3 className="font-bold text-slate-800">Perfil: Faixa Etária</h3>
                   <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Tipo {activeTab}</span>
                </div>
                
                <div className="flex items-end justify-around h-48 pt-4 pb-2 border-b border-gray-100">
                  {ageData.map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-2 w-full group relative">
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded mb-1 z-10">
                        {item.value}%
                      </div>
                      <div 
                        className={`w-12 md:w-16 bg-brand-red/90 rounded-t-lg transition-all duration-500 hover:bg-brand-red ${item.height}`}
                        style={{ height: `${item.value * 2.5}px` }} 
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-around mt-4">
                  {ageData.map((item) => (
                    <div key={item.label} className="text-center w-full">
                      <p className="text-sm font-bold text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-400">anos</p>
                    </div>
                  ))}
                </div>
             </>
          )}
        </div>
      </section>

    </div>
  );
}