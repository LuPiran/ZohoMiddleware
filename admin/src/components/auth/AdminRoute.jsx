import { Navigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { ROUTES } from "../../utils/constants";

/**
 * Componente de rota protegida para Admin Painel
 * Redireciona para Dashboard se não tiver permissão
 */
export default function AdminRoute({ children }) {
  // Verifica autenticação
  if (!authService.isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Verifica permissão de Admin Painel
  if (!hasAdminPanelPermission()) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}
