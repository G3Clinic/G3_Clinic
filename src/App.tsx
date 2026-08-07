import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useProntuarioFloat } from './contexts/ProntuarioFloatContext';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { DashboardLayout } from './modules/dashboard/layouts/DashboardLayout';
import { HomePage } from './modules/dashboard/pages/HomePage';
import { PacientesPage } from './modules/dashboard/pages/PacientesPage';
import { EstatisticasPacientesPage } from './modules/dashboard/pages/EstatisticasPacientesPage';
import { AgendaPage } from './modules/dashboard/pages/AgendaPage';
import { RecepcaoPage } from './modules/dashboard/pages/RecepcaoPage';
import { OdontogramaPage } from './modules/dashboard/pages/OdontogramaPage';
import { CaixaPage } from './modules/dashboard/pages/CaixaPage';
import { FechamentosPage } from './modules/dashboard/pages/FechamentosPage';
import { EstoquePage } from './modules/dashboard/pages/EstoquePage';
import { RelatoriosPage } from './modules/dashboard/pages/RelatoriosPage';
import { FinDashboardPage } from './modules/dashboard/pages/FinDashboardPage';
import { RecebimentosPage } from './modules/dashboard/pages/RecebimentosPage';
import { AuditoriaPage } from './modules/dashboard/pages/AuditoriaPage';
import { AdminCadastroPage } from './modules/dashboard/pages/AdminCadastroPage';
import { AdminControlePage } from './modules/dashboard/pages/AdminControlePage';
import { AdminIdentidadePage } from './modules/dashboard/pages/AdminIdentidadePage';
import { AdminUnidadesPage } from './modules/dashboard/pages/AdminUnidadesPage';
import { AdminSalasPage } from './modules/dashboard/pages/AdminSalasPage';
import { AdminAtendimentosPage } from './modules/dashboard/pages/AdminAtendimentosPage';
import { AdminOdontoProcPage } from './modules/dashboard/pages/AdminOdontoProcPage';
import { AdminConveniosPage } from './modules/dashboard/pages/AdminConveniosPage';
import { AdminDREPage } from './modules/dashboard/pages/AdminDREPage';
import { AdminRepasseRecepPage } from './modules/dashboard/pages/AdminRepasseRecepPage';
import { AdminBackupPage } from './modules/dashboard/pages/AdminBackupPage';
import { AdminNotificacoesPage } from './modules/dashboard/pages/AdminNotificacoesPage';
import { MeuPerfilPage } from './modules/dashboard/pages/MeuPerfilPage';

// O Prontuário Eletrônico virou janela flutuante/minimizável (ProntuarioFloatWindow,
// montada em DashboardLayout) em vez de página cheia. Isso preserva links antigos e o
// atalho do teclado/histórico que apontam pra /dashboard/prontuario: só abre a janela
// flutuante e volta pro dashboard, sem quebrar quem tinha essa URL salva.
function AbrirProntuarioFlutuante() {
  const { abrirProntuario } = useProntuarioFloat();
  const navigate = useNavigate();
  useEffect(() => {
    abrirProntuario();
    navigate('/dashboard', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Protege rotas: sem sessão → redireciona ao login. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<HomePage />} />
          <Route path="perfil" element={<MeuPerfilPage />} />
          <Route path="pacientes" element={<PacientesPage />} />
          <Route path="estatisticas-pacientes" element={<EstatisticasPacientesPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="recepcao" element={<RecepcaoPage />} />
          <Route path="prontuario" element={<AbrirProntuarioFlutuante />} />
          <Route path="odontograma" element={<OdontogramaPage />} />
          <Route path="caixa" element={<CaixaPage />} />
          <Route path="fechamentos" element={<FechamentosPage />} />
          <Route path="estoque" element={<EstoquePage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
          <Route path="financeiro" element={<FinDashboardPage />} />
          <Route path="financeiro/recebimentos" element={<RecebimentosPage />} />
          {/* Log geral de auditoria — fora do Financeiro (rota antiga redireciona) */}
          <Route path="auditoria" element={<AuditoriaPage />} />
          <Route path="financeiro/auditoria" element={<Navigate to="/dashboard/auditoria" replace />} />
          <Route path="admin/usuarios" element={<AdminCadastroPage />} />
          <Route path="admin/controle" element={<AdminControlePage />} />
          <Route path="admin/identidade" element={<AdminIdentidadePage />} />
          <Route path="admin/unidades" element={<AdminUnidadesPage />} />
          <Route path="admin/salas" element={<AdminSalasPage />} />
          <Route path="admin/atendimentos" element={<AdminAtendimentosPage />} />
          <Route path="admin/odonto-proc" element={<AdminOdontoProcPage />} />
          <Route path="admin/convenios" element={<AdminConveniosPage />} />
          <Route path="admin/dre" element={<AdminDREPage />} />
          <Route path="admin/repasse-recep" element={<AdminRepasseRecepPage />} />
          <Route path="admin/notificacoes" element={<AdminNotificacoesPage />} />
          <Route path="admin/backup" element={<AdminBackupPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;