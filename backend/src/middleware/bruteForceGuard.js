/**
 * Proteção de brute force por conta (e-mail).
 * Em memória no processo — adequado para instância única; use Redis em multi-node.
 */

const tentativasPorEmail = new Map();

const MAX_FALHAS = Number.parseInt(process.env.LOGIN_MAX_FAILURES || "5", 10);
const JANELA_MS = Number.parseInt(
  process.env.LOGIN_LOCK_WINDOW_MS || String(15 * 60 * 1000),
  10,
);

function chaveEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function obterRegistro(email) {
  const key = chaveEmail(email);
  if (!key) return null;

  const reg = tentativasPorEmail.get(key);
  if (!reg) return null;

  if (reg.lockedUntil && Date.now() > reg.lockedUntil) {
    tentativasPorEmail.delete(key);
    return null;
  }

  if (Date.now() - reg.firstFailureAt > JANELA_MS && !reg.lockedUntil) {
    tentativasPorEmail.delete(key);
    return null;
  }

  return reg;
}

/**
 * @returns {{ locked: boolean, retryAfterSec?: number, remainingAttempts?: number }}
 */
export function getLoginLockStatus(email) {
  const reg = obterRegistro(email);
  if (!reg) {
    return { locked: false, remainingAttempts: MAX_FALHAS };
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
    remainingAttempts: Math.max(0, MAX_FALHAS - reg.count),
  };
}

export function assertAccountNotLocked(email) {
  const status = getLoginLockStatus(email);
  if (status.locked) {
    const error = new Error(
      `Conta temporariamente bloqueada por tentativas inválidas. Aguarde ${Math.ceil(status.retryAfterSec / 60)} minuto(s).`,
    );
    error.code = "ACCOUNT_LOCKED";
    error.retryAfterSec = status.retryAfterSec;
    throw error;
  }
  return status;
}

export function recordLoginFailure(email) {
  const key = chaveEmail(email);
  if (!key) return getLoginLockStatus(email);

  const now = Date.now();
  let reg = obterRegistro(email);

  if (!reg) {
    reg = { count: 0, firstFailureAt: now, lockedUntil: null };
  }

  reg.count += 1;

  if (reg.count >= MAX_FALHAS) {
    reg.lockedUntil = now + JANELA_MS;
    console.warn(
      `[BRUTE FORCE] Conta bloqueada temporariamente: ${key} (${reg.count} falhas)`,
    );
  }

  tentativasPorEmail.set(key, reg);
  return getLoginLockStatus(email);
}

export function clearLoginFailures(email) {
  const key = chaveEmail(email);
  if (key) {
    tentativasPorEmail.delete(key);
  }
}
