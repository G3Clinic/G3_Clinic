import { useState } from 'react';
import { Bell, Menu, ChevronDown, User, LogOut, Settings, AlertTriangle, Info, Download, Upload, FileText, Building2, Lock, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, InputField, SelectField, Btn } from '../../../components/ui/shared';
import { useTheme } from '../../../contexts/ThemeContext';

interface TopbarProps {
  onOpenSidebar: () => void;
}

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'alert', title: 'Paciente aguardando', message: 'João Silva está aguardando atendimento há 20 minutos.', time: 'Há 20 min', read: false },
  { id: 2, type: 'system', title: 'Caixa do Dia', message: 'Lembre-se de fechar o caixa ao final do expediente.', time: 'Há 1 hora', read: false },
  { id: 3, type: 'system', title: 'Backup realizado', message: 'Backup automático dos dados concluído com sucesso.', time: 'Há 3 horas', read: true },
];

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));

  const handleLogout = () => {
    setShowUserMenu(false);
    navigate('/login');
  };

  return (
    <header 
      className="h-16 border-b flex items-center justify-between px-4 lg:px-6 shrink-0 z-20 shadow-sm relative text-topbar-text transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-topbar-bg)', borderColor: 'rgba(0,0,0,0.05)' }}
    >

      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 hover:bg-black/5 rounded-lg transition-colors opacity-70 hover:opacity-100"
        >
          <Menu size={22} />
        </button>
        <div className="hidden md:flex items-center gap-3">
          <div>
            <h1 className="text-lg font-black text-brand-primary uppercase tracking-tight">{theme.companyName || 'Clínica da Família'}</h1>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Gestão Operacional</p>
          </div>
        </div>
      </div>

      {/* Legacy Utilities: Unit Bar & Actions */}
      <div className="hidden lg:flex items-center gap-3 ml-8 mr-auto">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
          <Building2 size={16} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">Unidade:</span>
          <select className="bg-transparent text-sm font-bold text-brand-primary outline-none cursor-pointer">
            <option>Matriz - Centro</option>
            <option>Filial - Zona Sul</option>
            <option>Filial - Zona Norte</option>
          </select>
        </div>
        
      </div>

      <div className="flex items-center gap-2 md:gap-4">

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className={`relative p-2 rounded-xl transition-colors ${showNotifications ? 'bg-brand-light text-brand-primary' : 'text-slate-400 hover:bg-gray-100 hover:text-brand-primary'}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-slate-700 text-sm">Notificações</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs font-semibold text-brand-primary hover:underline">
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.map(notif => (
                  <div key={notif.id} className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors ${notif.read ? 'opacity-60' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${notif.type === 'alert' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {notif.type === 'alert' ? <AlertTriangle size={16} /> : <Info size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${notif.read ? 'text-slate-500' : 'text-slate-800'}`}>{notif.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{notif.time}</p>
                    </div>
                    {!notif.read && <span className="w-2 h-2 bg-brand-primary rounded-full shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 hidden md:block" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-brand-primary text-white rounded-lg flex items-center justify-center font-bold text-sm shadow">
              DR
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-700 leading-tight">Dr. Responsável</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Administrador</p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform hidden md:block ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
              <div className="p-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-slate-800">Dr. Responsável</p>
                <p className="text-xs text-slate-500">admin@clinica.com</p>
              </div>
              <div className="p-2">
                <button 
                  onClick={() => { navigate('/dashboard/perfil'); setShowUserMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <User size={15} />
                  Meu Perfil
                </button>
                <button 
                  onClick={() => { setShowSettingsModal(true); setShowUserMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Settings size={15} />
                  Configurações
                </button>
                <hr className="my-1.5 border-gray-100" />
                <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <LogOut size={15} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click-away overlay */}
      {(showNotifications || showUserMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowNotifications(false); setShowUserMenu(false); }} />
      )}


      {/* Settings Modal */}
      <Modal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Configurações do Sistema" maxWidth="max-w-2xl">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4 border-r border-gray-100 pr-6">
              <h4 className="font-bold text-slate-700 text-sm border-b border-gray-100 pb-2">Preferências Clínicas</h4>
              <SelectField label="Tempo Padrão de Consulta">
                <option>15 minutos</option>
                <option selected>30 minutos</option>
                <option>45 minutos</option>
                <option>1 hora</option>
              </SelectField>
              <SelectField label="Unidade Principal">
                <option selected>Matriz - Centro</option>
                <option>Filial - Zona Sul</option>
              </SelectField>
              <InputField label="Alerta de Estoque Mínimo" defaultValue="10" type="number" />
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-700 text-sm border-b border-gray-100 pb-2">Sistema e Notificações</h4>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-slate-700 text-sm">Tema Escuro (Dark Mode)</p>
                  <p className="text-xs text-slate-500">Em desenvolvimento</p>
                </div>
                <div className="w-10 h-5 bg-gray-300 rounded-full relative opacity-50 cursor-not-allowed">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-slate-700 text-sm">Notificações por Email</p>
                  <p className="text-xs text-slate-500">Resumo diário</p>
                </div>
                <div className="w-10 h-5 bg-brand-primary rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-slate-700 text-sm">Sons de Alerta</p>
                  <p className="text-xs text-slate-500">Ao receber mensagens</p>
                </div>
                <div className="w-10 h-5 bg-brand-primary rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <Btn variant="cancel" onClick={() => setShowSettingsModal(false)}>Cancelar</Btn>
            <Btn onClick={() => setShowSettingsModal(false)}>Salvar Configurações</Btn>
          </div>
        </div>
      </Modal>

    </header>
  );
}