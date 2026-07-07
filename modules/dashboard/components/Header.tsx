import { Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-all gap-2 md:gap-4">
      
      <div className="flex items-center gap-2 lg:gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform shrink-0"
        >
          <Menu size={24} />
        </button>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all text-sm truncate"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-2">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-700">Dr. Ricardo</span>
            <span className="text-xs text-slate-500">Médico Triagista</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-red/10 border-2 border-brand-red/20 flex items-center justify-center text-brand-red font-bold cursor-pointer hover:bg-brand-red/20 transition-colors shrink-0">
            DR
          </div>
        </div>
      </div>
    </header>
  );
}