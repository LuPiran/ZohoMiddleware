import { authService } from "../services/auth";

/**
 * Verifica se o usuário tem permissão de Admin Painel
 * @returns {boolean}
 */
export function hasAdminPanelPermission() {
  const user = authService.getUser();
  if (!user) return false;

  // Tenta diferentes variações do campo Perfil
  const perfil =
    user.Perfil ||
    user.perfil ||
    user.Profile ||
    user.profile ||
    user.Perfil_Usuario ||
    user.perfil_usuario ||
    "";

  // Verifica se o perfil é "Admin Painel"
  return (
    perfil &&
    typeof perfil === "string" &&
    perfil.trim().toLowerCase() === "admin painel"
  );
}

/**
 * Verifica se o usuário é Admin Portal
 * @returns {boolean}
 */
export function isAdminPortal() {
  const user = authService.getUser();
  if (!user) return false;

  // Tenta diferentes variações do campo Perfil
  const perfil =
    user.Perfil ||
    user.perfil ||
    user.Profile ||
    user.profile ||
    user.Perfil_Usuario ||
    user.perfil_usuario ||
    "";

  // Verifica se o perfil é "Admin Portal"
  return (
    perfil &&
    typeof perfil === "string" &&
    perfil.trim().toLowerCase() === "admin portal"
  );
}
