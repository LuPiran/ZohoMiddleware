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
    user.tipo ||
    user.Tipo ||
    "";

  // Mantem compatibilidade com legado Zoho e novo modelo Supabase.
  return (
    perfil &&
    typeof perfil === "string" &&
    ["admin painel", "admin", "diretoria"].includes(perfil.trim().toLowerCase())
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
    user.tipo ||
    user.Tipo ||
    "";

  // Verifica se o perfil é "Admin Portal"
  return (
    perfil &&
    typeof perfil === "string" &&
    perfil.trim().toLowerCase() === "admin portal"
  );
}

export function isGerente() {
  const user = authService.getUser();
  if (!user) return false;
  const tipo = String(user.tipo || user.Tipo || "").trim().toLowerCase();
  return tipo === "gerente";
}

export function hasTeamPermission() {
  return hasAdminPanelPermission() || isGerente();
}
