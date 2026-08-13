/**
 * Proteção de brute force por conta (e-mail) e por IP.
 * Em memória no processo — adequado para instância única; use Redis em multi-node.
 */

const tentativasPorEmail = new Map();
const tentativasPorIp = new Map();

const MAX_FALHAS = Number.parseInt(process.env.LOGIN_MAX_FAILURES || "5", 10);
const MAX_FALHAS_IP = Number.parseInt(process.env.LOGIN_MAX_FAILURES_IP || "20", 10);
const JANELA_MS = Number.parseInt(
  process.env.LOGIN_LOCK_WINDOW_MS || String(15 * 60 * 1000),
  10,
);

function chaveEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function chaveIp(ip) {
  return String(ip || "unknown").trim();
}

function limparExpirado(map, key, now) {
  const reg = map.get(key);
  if (!reg) return null;

  if (reg.lockedUntil && now > reg.lockedUntil) {
    map.delete(key);
    return null;
  }

  if (now - reg.firstFailureAt > JANELA_MS && !reg.lockedUntil) {
    map.delete(key);
    return null;
  }

  return reg;
}

function obterRegistro(map, key) {
  if (!key) return null;
  return limparExpirado(map, key, Date.now());
}

function statusFromReg(reg, max) {
  if (!reg) {
    return { locked: false, remainingAttempts: max };
  }

  if (reg.lockedUntil && Date.now() < reg.lockedUntil) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((reg.lockedUntil - Date.now()) / 1000),
      remainingAttempts: 0,
    };
  }

  return {
    locked: false,
    remainingAttempts: Math.max(0, max - reg.count),
  };
}

/**
 * @returns {{ locked: boolean, retryAfterSec?: number, remainingAttempts?: number }}
 */
export function getLoginLockStatus(email, ip) {
  const byEmail = statusFromReg(
    obterRegistro(tentativasPorEmail, chaveEmail(email)),
    MAX_FALHAS,
  );
  const byIp = statusFromReg(
    obterRegistro(tentativasPorIp, chaveIp(ip)),
    MAX_FALHAS_IP,
  );

  if (byEmail.locked) return { ...byEmail, scope: "account" };
  if (byIp.locked) return { ...byIp, scope: "ip" };
  return {
    locked: false,
    remainingAttempts: Math.min(
      byEmail.remainingAttempts ?? MAX_FALHAS,
      byIp.remainingAttempts ?? MAX_FALHAS_IP,
    ),
  };
}

export function assertAccountNotLocked(email, ip) {
  const status = getLoginLockStatus(email, ip);
  if (status.locked) {
    const error = new Error(
      status.scope === "ip"
        ? `Muitas tentativas deste IP. Aguarde ${Math.ceil(status.retryAfterSec / 60)} minuto(s).`
        : `Conta temporariamente bloqueada por tentativas inválidas. Aguarde ${Math.ceil(status.retryAfterSec / 60)} minuto(s).`,
    );
    error.code = "ACCOUNT_LOCKED";
    error.retryAfterSec = status.retryAfterSec;
    throw error;
  }
  return status;
}

function registrarFalha(map, key, max, label) {
  if (!key) return;
  const now = Date.now();
  let reg = obterRegistro(map, key);

  if (!reg) {
    reg = { count: 0, firstFailureAt: now, lockedUntil: null };
  }

  reg.count += 1;

  if (reg.count >= max) {
    reg.lockedUntil = now + JANELA_MS;
    console.warn(
      `[BRUTE FORCE] Bloqueio ${label}: ${key} (${reg.count} falhas)`,
    );
  }

  map.set(key, reg);
}

export function recordLoginFailure(email, ip) {
  registrarFalha(tentativasPorEmail, chaveEmail(email), MAX_FALHAS, "conta");
  registrarFalha(tentativasPorIp, chaveIp(ip), MAX_FALHAS_IP, "ip");
  return getLoginLockStatus(email, ip);
}

export function clearLoginFailures(email, ip) {
  const key = chaveEmail(email);
  if (key) tentativasPorEmail.delete(key);
  // Não limpa IP no sucesso — evita reset fácil de varredura
  void ip;
}
