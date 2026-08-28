import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import LeadsMedicos from "../pages/LeadsMedicos/LeadsMedicos";
import LeadDetail from "../pages/LeadsMedicos/LeadDetail";
import PlatformUpdates from "../pages/PlatformUpdates/PlatformUpdates";
import Users from "../pages/Users/Users";
import Recompra from "../pages/Recompra/Recompra";
import Compra from "../pages/Compra/Compra";
import Ocorrencia from "../pages/Ocorrencia/Ocorrencia";
import Proposta from "../pages/Proposta/Proposta";
import Agradecimento from "../pages/Agradecimento/Agradecimento";
import SavedForms from "../pages/SavedForms/SavedForms";
import FAQ from "../pages/FAQ/FAQ";
import Manual from "../pages/Manual/Manual";
import CentralComercial from "../pages/CentralComercial/CentralComercial";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AdminRoute from "../components/auth/AdminRoute";
import { authService } from "../services/auth";
import {
  ROUTES,
  podeVerLeadsMedicos,
  podeVerCompra,
  podeVerOcorrencia,
  podeVerProposta,
  podeVerRecompra,
} from "../utils/constants";

/**
 * Componente wrapper para a rota de login
 * Evita loops infinitos verificando autenticação apenas uma vez
 */
function LoginRoute() {
  // Verifica autenticação apenas uma vez ao montar, sem useEffect
  const isAuthenticated = authService.isAuthenticated();

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Login />;
}

function OptionalFormRoute({ permissionCheck, children }) {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Consultor veio de uma tentativa em Leads Médicos (LeadFirstAttemptCard ->
  // /compra): a compra é parte do fluxo de tratativa do lead, então libera
  // o acesso independente da permissão opcional de "Compra" estar habilitada
  // — o antigo modal também não fazia essa checagem.
  const cameFromLeadAttempt = Boolean(location.state?.leadAttemptContext);

  const user = authService.getUser();
  const canAccess =
    cameFromLeadAttempt ||
    (typeof permissionCheck === "function" && permissionCheck(user));

  if (!canAccess) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rota raiz "/" é a página de login */}
      <Route path={ROUTES.LOGIN} element={<LoginRoute />} />
      {/* Rotas protegidas */}
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.LEADS_MEDICOS}
        element={
          <OptionalFormRoute permissionCheck={podeVerLeadsMedicos}>
            <LeadsMedicos />
          </OptionalFormRoute>
        }
      />
      <Route
        path={ROUTES.LEADS_MEDICOS_DETAIL}
        element={
          <OptionalFormRoute permissionCheck={podeVerLeadsMedicos}>
            <LeadDetail />
          </OptionalFormRoute>
        }
      />
      <Route
        path={ROUTES.PLATFORM_UPDATES}
        element={<PlatformUpdates />}
      />
      <Route
        path={ROUTES.USUARIOS}
        element={
          <AdminRoute>
            <Users />
          </AdminRoute>
        }
      />
      <Route
        path={ROUTES.RECOMPRA}
        element={
          <OptionalFormRoute permissionCheck={podeVerRecompra}>
            <Recompra />
          </OptionalFormRoute>
        }
      />
      <Route
        path={ROUTES.COMPRA}
        element={
          <OptionalFormRoute permissionCheck={podeVerCompra}>
            <Compra />
          </OptionalFormRoute>
        }
      />
      <Route
        path={ROUTES.OCORRENCIA}
        element={
          <OptionalFormRoute permissionCheck={podeVerOcorrencia}>
            <Ocorrencia />
          </OptionalFormRoute>
        }
      />
      <Route
        path={ROUTES.PROPOSTA}
        element={
          <OptionalFormRoute permissionCheck={podeVerProposta}>
            <Proposta />
          </OptionalFormRoute>
        }
      />
      <Route
        path={ROUTES.AGRADECIMENTO}
        element={
          <ProtectedRoute>
            <Agradecimento />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SAVED_FORMS}
        element={
          <ProtectedRoute>
            <SavedForms />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.FAQ}
        element={
          <ProtectedRoute>
            <FAQ />
          </ProtectedRoute>
        }
      />
        <Route
          path={ROUTES.MANUAL}
          element={
            <ProtectedRoute>
              <Manual />
            </ProtectedRoute>
          }
        />
      <Route
        path={ROUTES.CENTRAL_COMERCIAL}
        element={
          <ProtectedRoute>
            <CentralComercial />
          </ProtectedRoute>
        }
      />
      {/* Redireciona qualquer rota não encontrada para login */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}
