import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  to: string;
  exact?: boolean;
}

export function SidebarItem({ icon: Icon, label, to, exact = false }: SidebarItemProps) {
  const location = useLocation();

  const isActive = exact 
    ? location.pathname === to 
    : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 group border ${
        isActive 
          ? 'bg-red-50 text-brand-red border-red-100 font-bold' 
          : 'bg-transparent text-slate-500 border-transparent hover:bg-gray-50 hover:text-slate-900'
      }`}
    >
      <Icon 
        size={20} 
        className={`transition-colors ${
          isActive ? 'text-brand-red' : 'text-slate-400 group-hover:text-slate-600'
        }`} 
      />
      <span className="text-sm">{label}</span>
    </Link>
  );
}