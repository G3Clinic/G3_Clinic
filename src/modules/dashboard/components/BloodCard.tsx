import { AlertTriangle, Droplets } from 'lucide-react';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type StockStatus = 'critical' | 'warning' | 'stable';

interface BloodCardProps {
  type: BloodType;
  amount: number;
  status: StockStatus;
  predictionDays?: number;
}

export function BloodCard({ type, amount, status, predictionDays }: BloodCardProps) {
  
  const targetAmount = 150; 
  const percentage = Math.min((amount / targetAmount) * 100, 100);

  const styles = {
    critical: {
      color: 'text-red-600',
      bgIcon: 'bg-red-50',
      bar: 'bg-red-500',
      track: 'bg-red-100',
      badge: 'text-red-700 bg-red-50 border-red-100'
    },
    warning: {
      color: 'text-amber-600',
      bgIcon: 'bg-amber-50',
      bar: 'bg-amber-500',
      track: 'bg-amber-100',
      badge: 'text-amber-700 bg-amber-50 border-amber-100'
    },
    stable: {
      color: 'text-emerald-600',
      bgIcon: 'bg-emerald-50',
      bar: 'bg-emerald-500',
      track: 'bg-emerald-100',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-100'
    }
  };

  const currentStyle = styles[status];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      
      <div className={`absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 rounded-full opacity-10 ${currentStyle.bar}`} />

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${currentStyle.bgIcon} ${currentStyle.color}`}>
            {type}
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Estoque</span>
            <div className={`text-xs font-medium px-2 py-0.5 rounded-full border w-fit mt-0.5 ${currentStyle.badge}`}>
              {status === 'critical' ? 'Crítico' : status === 'warning' ? 'Atenção' : 'Estável'}
            </div>
          </div>
        </div>

        {predictionDays && predictionDays < 7 && (
          <div className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100" title="Previsão de término">
            <AlertTriangle size={12} />
            {predictionDays} dias
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1 mt-2 mb-3">
        <span className="text-3xl font-bold text-slate-800">{amount}</span>
        <span className="text-sm text-slate-400 font-medium">/ {targetAmount}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
          <span>0%</span>
          <span>Meta</span>
        </div>
        <div className={`h-2.5 w-full rounded-full overflow-hidden ${currentStyle.track}`}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${currentStyle.bar}`} 
            style={{ width: `${percentage}%` }} 
          />
        </div>
      </div>
    </div>
  );
}