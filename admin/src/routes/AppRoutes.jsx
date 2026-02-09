import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Users from "../pages/Users/Users";
import Recompra from "../pages/Recompra/Recompra";
import Compra from "../pages/Compra/Compra";
import Ocorrencia from "../pages/Ocorrencia/Ocorrencia";
import Proposta from "../pages/Proposta/Proposta";
import Agradecimento from "../pages/Agradecimento/Agradecimento";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AdminRoute from "../components/auth/AdminRoute";
import { authService } from "../services/auth";
import { ROUTES } from "../utils/constants";

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
          <ProtectedRoute>
            <Recompra />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.COMPRA}
        element={
          <ProtectedRoute>
            <Compra />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.OCORRENCIA}
        element={
          <ProtectedRoute>
            <Ocorrencia />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PROPOSTA}
        element={
          <ProtectedRoute>
            <Proposta />
          </ProtectedRoute>
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
      {/* Redireciona qualquer rota não encontrada para login */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}
