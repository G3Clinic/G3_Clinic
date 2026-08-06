import { useState, useEffect } from 'react';
import { Bell, Menu, ChevronDown, User, LogOut, Settings, AlertTriangle, Info, CheckCircle, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, InputField, SelectField, Btn } from '../../../components/ui/shared';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { notificacoesApi, filiaisApi, filialStore, type APINotificacao, type APIFilial } from '../../../services/api';

interface TopbarProps {
  onOpenSidebar: () => void;
}

// Tempo relativo em pt-BR ("Há 20 min", "Há 3 horas", "Ontem", ...)
function tempoRelativo(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const seg = Math.floor((Date.now() - d) / 1000);
  if (seg < 60) return 'Agora mesmo';
  const min = Math.floor(seg / 60);
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Há ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'Ontem';
  if (dias < 7) return `Há ${dias} dias`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const navigate = useNavigate();
  const {} = useTheme();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<APINotificacao[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Unidades acessíveis ao usuário + seleção persistida (filialStore)
  const [filiais, setFiliais] = useState<APIFilial[]>([]);
  const [unidadeAtiva, setUnidadeAtiva] = useState<string>(() => filialStore.get() || '');

  const unreadCount = notifications.filter(n => !n.lida).length;

  const carregarNotificacoes = () => {
    setLoadingNotif(true);
    notificacoesApi.listar()
      .then(data => setNotifications(
        [...data].sort((a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime())
      ))
      .catch(() => setNotifications([]))   // 403 (não-admin) / offline → sem notificações
      .finally(() => setLoadingNotif(false));
  };

  useEffect(() => { carregarNotificacoes(); }, []);

  useEffect(() => {
    filiaisApi.listar()
      .then(todas => {
        // Dono vê todas as filiais; demais, apenas as que
        // têm vínculo (user.filiais) — assim podem alternar sem novo login.
        const acessiveis = user?.is_dono
          ? todas
          : todas.filter(f => (user?.filiais || []).some(uf => uf.unidade_id === f.id));
        setFiliais(acessiveis);

        // Garante uma seleção válida e sincroniza o filialStore (usado no header).
        const atual = filialStore.get() || '';
        const valida = atual && acessiveis.some(f => String(f.id) === atual)
          ? atual
          : (acessiveis[0] ? String(acessiveis[0].id) : '');
        setUnidadeAtiva(valida);
        if (valida) filialStore.set(valida); else filialStore.clear();
      })
      .catch(() => setFiliais([]));
  }, [user]);

  const trocarUnidade = (id: string) => {
    if (!id || id === unidadeAtiva) return;
    filialStore.set(id);
    // Recarrega para que todas as telas refaçam as buscas com a nova filial
    // no header X-Filial-Id. A sessão (token) é preservada — sem novo login.
    window.location.reload();
  };

  const markAllAsRead = async () => {
    const naoLidas = notifications.filter(n => !n.lida);
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));  // otimista
    try {
      await Promise.all(naoLidas.map(n => notificacoesApi.atualizar(n.id, { lida: true })));
    } catch {
      carregarNotificacoes();  // reverte para o estado real do servidor em caso de erro
    }
  };

  // Dados do usuário logado (com fallbacks)
  const nome = user?.nome || 'Usuário';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U';
  const papel = user?.is_dono ? 'Dono' : (user?.role || 'Funcionário');

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
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
          {/* Nomes ocultados a pedido do usuário, apenas a logo (no sidebar) ou menu fica visível */}
        </div>
      </div>

      {/* Seleção de unidade (filiais reais da empresa) */}
      <div className="hidden lg:flex items-center gap-3 ml-8 mr-auto">
        {filiais.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
            <Building2 size={16} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Unidade:</span>
            <select
              value={unidadeAtiva}
              onChange={e => trocarUnidade(e.target.value)}
              className="bg-transparent text-sm font-bold text-brand-primary outline-none cursor-pointer"
            >
              {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        )}
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
                {loadingNotif ? (
                  <div className="p-8 text-center text-sm text-slate-400">Carregando...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell size={28} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nenhuma notificação</p>
                  </div>
                ) : notifications.map(notif => {
                  const tipo = notif.tipo || 'info';
                  const estilo = tipo === 'error' || tipo === 'warning'
                    ? { bg: 'bg-orange-100 text-orange-600', Icon: AlertTriangle }
                    : tipo === 'success'
                      ? { bg: 'bg-emerald-100 text-emerald-600', Icon: CheckCircle }
                      : { bg: 'bg-blue-100 text-blue-600', Icon: Info };
                  const Icon = estilo.Icon;
                  return (
                    <div key={notif.id} className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors ${notif.lida ? 'opacity-60' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${estilo.bg}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${notif.lida ? 'text-slate-500' : 'text-slate-800'}`}>{notif.titulo}</p>
                        {notif.mensagem && <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{notif.mensagem}</p>}
                        <p className="text-[10px] text-slate-400 mt-1">{tempoRelativo(notif.criado_em)}</p>
                      </div>
                      {!notif.lida && <span className="w-2 h-2 bg-brand-primary rounded-full shrink-0 mt-2" />}
                    </div>
                  );
                })}
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
              {iniciais}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{nome}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{papel}</p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform hidden md:block ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
              <div className="p-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-slate-800">{nome}</p>
                <p className="text-xs text-slate-500">{user?.email || ''}</p>
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
              <SelectField label="Unidade Principal" value={unidadeAtiva} onChange={e => trocarUnidade(e.target.value)}>
                {filiais.length === 0 && <option value="">Nenhuma unidade</option>}
                {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
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