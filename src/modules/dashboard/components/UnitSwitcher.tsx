import { Building2, ChevronDown } from 'lucide-react';

export function UnitSwitcher() {
  return (
    <div className="flex items-center gap-2 px-2 md:px-3 py-2 bg-gray-100 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors">
      <div className="bg-white p-1.5 rounded-md shadow-sm">
        <Building2 size={16} className="text-brand-red" />
      </div>
      
      {/* Texto: Escondido no Mobile (hidden), visível no PC (md:flex) */}
      <div className="hidden md:flex flex-col">
        <span className="text-[10px] uppercase font-bold text-gray-400 leading-tight">Unidade Atual</span>
        <span className="text-sm font-semibold text-gray-700 leading-tight truncate max-w-[120px]">Hemocentro Regional</span>
      </div>

      <ChevronDown size={16} className="text-gray-400 ml-0 md:ml-2" />
    </div>
  );
}