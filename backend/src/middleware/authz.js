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
    console.warn(
      `[SECURITY][IDOR] Admin negado user=${req.user.id} path=${req.originalUrl} ip=${req.ip}`,
    );
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

    console.warn(
      `[SECURITY][IDOR] Acesso negado user=${requesterId} resource=${resourceId} path=${req.originalUrl} ip=${req.ip}`,
    );

    return res.status(403).json({
      success: false,
      error: "Você não tem permissão para acessar este recurso",
    });
  };
}

/**
 * Valida ID de recurso Zoho / interno (mitiga path traversal / IDOR por ID malformado).
 */
export function requireSafeResourceId(paramName = "id") {
  return (req, res, next) => {
    const value = String(req.params[paramName] || "").trim();
    // Zoho IDs são tipicamente numéricos longos; UUIDs também ok
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(value)) {
      return res.status(400).json({
        success: false,
        error: "Identificador de recurso inválido",
      });
    }
    req.params[paramName] = value;
    return next();
  };
}
