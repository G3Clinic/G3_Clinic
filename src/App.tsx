import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { DashboardLayout } from './modules/dashboard/layouts/DashboardLayout';
import { HomePage } from './modules/dashboard/pages/HomePage';
import { PacientesPage } from './modules/dashboard/pages/PacientesPage';
import { EstatisticasPacientesPage } from './modules/dashboard/pages/EstatisticasPacientesPage';
import { AgendaPage } from './modules/dashboard/pages/AgendaPage';
import { RecepcaoPage } from './modules/dashboard/pages/RecepcaoPage';
import { ProntuarioPage } from './modules/dashboard/pages/ProntuarioPage';
import { OdontogramaPage } from './modules/dashboard/pages/OdontogramaPage';
import { CaixaPage } from './modules/dashboard/pages/CaixaPage';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="perfil" element={<MeuPerfilPage />} />
          <Route path="pacientes" element={<PacientesPage />} />
          <Route path="estatisticas-pacientes" element={<EstatisticasPacientesPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="recepcao" element={<RecepcaoPage />} />
          <Route path="prontuario" element={<ProntuarioPage />} />
          <Route path="odontograma" element={<OdontogramaPage />} />
          <Route path="caixa" element={<CaixaPage />} />
          <Route path="estoque" element={<EstoquePage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
          <Route path="financeiro" element={<FinDashboardPage />} />
          <Route path="financeiro/recebimentos" element={<RecebimentosPage />} />
          <Route path="financeiro/auditoria" element={<AuditoriaPage />} />
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
  );
}

export default App;