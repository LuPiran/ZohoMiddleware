import { Navigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { ROUTES } from "../../utils/constants";

export default function ProtectedRoute({ children }) {
  if (authService.isMfaPending()) {
    return <Navigate to={ROUTES.MFA} replace />;
  }

  if (!authService.isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
}
