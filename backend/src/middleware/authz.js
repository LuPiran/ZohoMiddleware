/**
 * Middlewares de autorização (após authenticateToken).
 */

function normalizarPerfil(perfil) {
  return String(perfil || "")
    .trim()
    .toLowerCase();
}

export function isAdminPainel(user) {
  return normalizarPerfil(user?.perfil) === "admin painel";
}

/**
 * Exige perfil Admin Painel (gestão de usuários / ops).
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Token de autenticação não fornecido",
    });
  }

  if (!isAdminPainel(req.user)) {
    return res.status(403).json({
      success: false,
      error: "Acesso restrito a administradores do painel",
    });
  }

  next();
}

/**
 * Permite o próprio usuário ou Admin Painel (ex.: foto de perfil).
 */
export function requireSelfOrAdmin(paramName = "userId") {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Token de autenticação não fornecido",
      });
    }

    const resourceId = String(req.params[paramName] || "");
    const requesterId = String(req.user.id || "");

    if (resourceId && requesterId && resourceId === requesterId) {
      return next();
    }

    if (isAdminPainel(req.user)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: "Você não tem permissão para acessar este recurso",
    });
  };
}
