import { Navigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { hasTeamPermission } from "../../utils/permissions";
import { ROUTES } from "../../utils/constants";

export default function TeamRoute({ children }) {
  if (authService.isMfaPending()) {
    return <Navigate to={ROUTES.MFA} replace />;
  }
  if (!authService.isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  if (!hasTeamPermission()) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return children;
}

