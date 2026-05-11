import { useRoutes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import AnimatedPage from "../components/animation/AnimatedPage";
import Login from "../pages/Auth/Login";
import Mfa from "../pages/Auth/Mfa";
import Dashboard from "../pages/Dashboard/Dashboard";
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
import Teams from "../pages/Teams/Teams";
import TeamDetails from "../pages/Teams/TeamDetails";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AdminRoute from "../components/auth/AdminRoute";
import TeamRoute from "../components/auth/TeamRoute";
import { authService } from "../services/auth";
import { ROUTES } from "../utils/constants";

/**
 * Componente wrapper para a rota de login
 * Evita loops infinitos verificando autenticação apenas uma vez
 */
function LoginRoute() {
  const isAuthenticated = authService.isAuthenticated();
  const isMfaPending = authService.isMfaPending();

  if (isMfaPending) {
    return <Navigate to={ROUTES.MFA} replace />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Login />;
}

function MfaRoute() {
  if (!authService.isMfaPending()) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <Mfa />;
}

const appRouteObjects = [
  { path: ROUTES.LOGIN, element: <LoginRoute /> },
  { path: ROUTES.MFA, element: <MfaRoute /> },
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.PLATFORM_UPDATES,
    element: <PlatformUpdates />,
  },
  {
    path: ROUTES.USUARIOS,
    element: (
      <AdminRoute>
        <Users />
      </AdminRoute>
    ),
  },
  {
    path: ROUTES.EQUIPES,
    element: (
      <TeamRoute>
        <Teams />
      </TeamRoute>
    ),
  },
  {
    path: `${ROUTES.EQUIPES}/:id`,
    element: (
      <TeamRoute>
        <TeamDetails />
      </TeamRoute>
    ),
  },
  {
    path: ROUTES.RECOMPRA,
    element: (
      <ProtectedRoute>
        <Recompra />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.COMPRA,
    element: (
      <ProtectedRoute>
        <Compra />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.OCORRENCIA,
    element: (
      <ProtectedRoute>
        <Ocorrencia />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.PROPOSTA,
    element: (
      <ProtectedRoute>
        <Proposta />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.AGRADECIMENTO,
    element: (
      <ProtectedRoute>
        <Agradecimento />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SAVED_FORMS,
    element: (
      <ProtectedRoute>
        <SavedForms />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.FAQ,
    element: (
      <ProtectedRoute>
        <FAQ />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.MANUAL,
    element: (
      <ProtectedRoute>
        <Manual />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to={ROUTES.LOGIN} replace />,
  },
];

export default function AppRoutes() {
  const location = useLocation();
  const element = useRoutes(appRouteObjects, location);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <AnimatedPage key={location.pathname}>{element}</AnimatedPage>
    </AnimatePresence>
  );
}
