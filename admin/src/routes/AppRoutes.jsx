import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Users from "../pages/Users/Users";
import Recompra from "../pages/Recompra/Recompra";
import Compra from "../pages/Compra/Compra";
import Ocorrencia from "../pages/Ocorrencia/Ocorrencia";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { authService } from "../services/auth";
import { ROUTES } from "../utils/constants";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rota raiz "/" é a página de login */}
      <Route
        path={ROUTES.LOGIN}
        element={
          authService.isAuthenticated() ? (
            <Navigate to={ROUTES.DASHBOARD} replace />
          ) : (
            <Login />
          )
        }
      />
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
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
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
      {/* Redireciona qualquer rota não encontrada para login */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}
