import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Home, Users, Calendar, MonitorPlay, ClipboardList,
  Smile, DollarSign, Package, BarChart2, TrendingUp,
  FileSearch, Building2, DoorOpen, Stethoscope, HeartPulse,
  Handshake, PieChart, Repeat2, Settings, LogOut, X, ChevronDown,
  Landmark, Database, DownloadCloud, UploadCloud
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../../contexts/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavGroupProps {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isCollapsed?: boolean;
}

function NavGroup({ icon: Icon, label, children, defaultOpen = false, isCollapsed = false, onExpand }: NavGroupProps & { onExpand?: () => void }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => {
          if (isCollapsed) {
            onExpand?.();
            setOpen(true);
            return;
          }
          setOpen(!open);
        }}
        className={clsx(
          "w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-light hover:text-brand-primary transition-all duration-300 group overflow-hidden",
          isCollapsed ? "justify-center" : "gap-3"
        )}
        title={isCollapsed ? label : undefined}
      >
        <Icon size={18} className="shrink-0 text-slate-400 group-hover:text-brand-primary transition-colors" />
        <div className={clsx("flex-1 flex items-center justify-between overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <span className="truncate">{label}</span>
          <ChevronDown size={14} className={clsx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>
      {(open && !isCollapsed) && (
        <div className="ml-4 pl-3 border-l border-gray-100 mt-1 space-y-0.5 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  );
}

function NavItem({ icon: Icon, label, to, isCollapsed = false }: { icon: React.ElementType; label: string; to: string; isCollapsed?: boolean }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        clsx(
          'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden',
          isCollapsed ? 'justify-center' : 'gap-3',
          isActive
            ? 'bg-brand-light text-brand-primary font-semibold'
            : 'hover:bg-brand-light/50 hover:text-brand-primary'
        )
      }
      title={isCollapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className={clsx('shrink-0 transition-colors', isActive ? 'text-brand-primary' : 'text-slate-400 group-hover:text-brand-primary')} />
          <span className={clsx("truncate transition-all duration-300", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SubNavItem({ label, to }: { label: string; to: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        clsx(
          'block px-3 py-2 rounded-lg text-sm transition-all',
          isActive
            ? 'text-brand-primary font-semibold bg-brand-light'
            : 'opacity-80 hover:opacity-100 hover:text-brand-primary hover:bg-brand-light/30'
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const { theme } = useTheme();
  const navigate = useNavigate();

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside className={clsx(
        'fixed top-0 left-0 z-50 h-screen border-r flex flex-col transition-all duration-300 ease-in-out shadow-xl text-sidebar-text',
        'lg:static lg:shadow-none',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isCollapsed ? 'w-20' : 'w-64'
      )} style={{ backgroundColor: 'var(--color-sidebar-bg)', borderColor: 'rgba(0,0,0,0.05)' }}>

        {/* Logo */}
        <div className={clsx("h-16 flex items-center px-5 border-b border-gray-100", isCollapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            {!isCollapsed && theme.logoFullUrl ? (
              <div className="h-8 flex items-center justify-center">
                <img src={theme.logoFullUrl} alt="Logo" className="h-full w-auto object-contain" />
              </div>
            ) : (
              <>
                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden", !theme.logoIconUrl && "bg-brand-primary shadow-md shadow-brand-primary/30")}>
                  {theme.logoIconUrl ? (
                    <img src={theme.logoIconUrl} alt="Icon" className="w-full h-full object-contain" />
                  ) : (
                    <HeartPulse size={18} className="text-white" />
                  )}
                </div>
                {!isCollapsed && (
                  <div className="whitespace-nowrap transition-opacity duration-300">
                    <div className="text-sm font-bold leading-tight">{theme.companyName || 'Clínica Dashboard'}</div>
                    <div className="text-[10px] font-medium opacity-70">Gestão Clínica</div>
                  </div>
                )}
              </>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar overflow-x-hidden">

          <div className={clsx("text-[10px] font-bold uppercase tracking-widest px-3 mb-2 opacity-50", isCollapsed && "text-center px-0")}>
            {isCollapsed ? "•" : "Principal"}
          </div>
          <NavItem icon={Home} label="Tela Inicial" to="/dashboard" isCollapsed={isCollapsed} />
          <NavItem icon={Users} label="Pacientes" to="/dashboard/pacientes" isCollapsed={isCollapsed} />
          <NavItem icon={Calendar} label="Agenda" to="/dashboard/agenda" isCollapsed={isCollapsed} />
          <NavItem icon={MonitorPlay} label="Recepção" to="/dashboard/recepcao" isCollapsed={isCollapsed} />
          <NavItem icon={ClipboardList} label="Prontuário Eletrônico" to="/dashboard/prontuario" isCollapsed={isCollapsed} />
          <NavItem icon={Smile} label="Odontograma" to="/dashboard/odontograma" isCollapsed={isCollapsed} />

          <div className={clsx("text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mt-5 mb-2", isCollapsed && "text-center px-0")}>
            {isCollapsed ? "•" : "Operacional"}
          </div>
          <NavItem icon={Landmark} label="Caixa do Dia" to="/dashboard/caixa" isCollapsed={isCollapsed} />
          <NavItem icon={Package} label="Estoque" to="/dashboard/estoque" isCollapsed={isCollapsed} />
          <NavItem icon={BarChart2} label="Relatórios" to="/dashboard/relatorios" isCollapsed={isCollapsed} />

          <div className={clsx("text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mt-5 mb-2", isCollapsed && "text-center px-0")}>
            {isCollapsed ? "•" : "Financeiro"}
          </div>
          <NavGroup icon={DollarSign} label="Financeiro" defaultOpen={false} isCollapsed={isCollapsed} onExpand={() => setIsCollapsed(false)}>
            <SubNavItem label="Dashboard" to="/dashboard/financeiro" />
            <SubNavItem label="Recebimentos" to="/dashboard/financeiro/recebimentos" />
            <SubNavItem label="Auditoria Financeira" to="/dashboard/financeiro/auditoria" />
          </NavGroup>

          <div className={clsx("text-[10px] font-bold uppercase tracking-widest px-3 mt-5 mb-2 opacity-50", isCollapsed && "text-center px-0")}>
            {isCollapsed ? "•" : "Administrativo"}
          </div>
          <NavGroup icon={Settings} label="Administrativo" defaultOpen={false} isCollapsed={isCollapsed} onExpand={() => setIsCollapsed(false)}>
            <SubNavItem label="Identidade Visual" to="/dashboard/admin/identidade" />
            <SubNavItem label="Cadastro de Usuários" to="/dashboard/admin/usuarios" />
            <SubNavItem label="Controle de Acesso" to="/dashboard/admin/controle" />
            <SubNavItem label="Disparar Notificações" to="/dashboard/admin/notificacoes" />
            <SubNavItem label="Cadastro de Unidades" to="/dashboard/admin/unidades" />
            <SubNavItem label="Cadastro de Salas" to="/dashboard/admin/salas" />
            <SubNavItem label="Atendimentos" to="/dashboard/admin/atendimentos" />
            <SubNavItem label="Proc. Odontológicos" to="/dashboard/admin/odonto-proc" />
            <SubNavItem label="Convênios" to="/dashboard/admin/convenios" />
            <SubNavItem label="Custos & Laboratório" to="/dashboard/admin/dre" />
            <SubNavItem label="Repasses Recepcionistas" to="/dashboard/admin/repasse-recep" />
          </NavGroup>

          <div className={clsx("text-[10px] font-bold uppercase tracking-widest px-3 mt-5 mb-2 opacity-50", isCollapsed && "text-center px-0")}>
            {isCollapsed ? "•" : "Sistema"}
          </div>
          <NavGroup icon={Database} label="Banco de Dados" defaultOpen={false} isCollapsed={isCollapsed} onExpand={() => setIsCollapsed(false)}>
            <SubNavItem label="Backup e Restauração" to="/dashboard/admin/backup" />
          </NavGroup>

        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 flex flex-col gap-2">
          {/* Botão Retrair - Apenas Desktop */}
          <button 
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center gap-3 w-full px-3 py-2 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-xl transition-all"
            title={isCollapsed ? "Expandir menu" : "Retrair menu"}
          >
            <ChevronDown size={18} className={clsx('transition-transform', isCollapsed ? '-rotate-90' : 'rotate-90')} />
            {!isCollapsed && <span className="text-sm font-medium">Retrair Menu</span>}
          </button>

          <button 
            onClick={() => navigate('/login')}
            className={clsx(
              "flex items-center w-full px-3 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 overflow-hidden",
              isCollapsed ? "justify-center" : "gap-3"
            )}
            title={isCollapsed ? "Sair do Sistema" : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={clsx("truncate transition-all duration-300 text-left flex-1", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 text-sm font-medium")}>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}