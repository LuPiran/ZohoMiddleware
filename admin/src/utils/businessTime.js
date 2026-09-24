// América/São_Paulo é sempre UTC-3 (Brasil suspendeu o horário de verão em
// 2019) — mesmo offset fixo usado no backend (slaOffers.js).
const BR_OFFSET_MS = 3 * 60 * 60 * 1000;

function isWeekendBR(date) {
  const localDay = new Date(date.getTime() - BR_OFFSET_MS).getUTCDay(); // 0=dom, 6=sáb
  return localDay === 0 || localDay === 6;
}

/** Instante correspondente à próxima meia-noite em horário de Brasília. */
function nextMidnightBR(date) {
  const local = new Date(date.getTime() - BR_OFFSET_MS);
  local.setUTCHours(24, 0, 0, 0);
  return new Date(local.getTime() + BR_OFFSET_MS);
}

/**
 * Quantos ms de dia útil (horário de Brasília) existem entre `from` e `to`
 * — fim de semana não conta nada. Espelha addBusinessMinutes do backend
 * (backend/src/services/slaOffers.js) na direção inversa: em vez de somar
 * uma duração a partir de um início, mede o tempo útil dentro de um
 * intervalo já fechado. Nunca retorna negativo.
 *
 * Consequência importante pro countdown visual: se `from` cai num fim de
 * semana, o resultado não muda enquanto `from` andar dentro do próprio fim
 * de semana (sempre pula pra segunda 00:00 antes de somar) — ou seja, o
 * timer fica "congelado" no sábado/domingo e só volta a descer na segunda.
 */
export function businessMsBetween(from, to) {
  let cursor = new Date(from);
  const end = new Date(to);
  if (cursor >= end) return 0;

  let totalMs = 0;
  while (cursor < end) {
    if (isWeekendBR(cursor)) {
      cursor = nextMidnightBR(cursor);
      continue;
    }
    const endOfDay = nextMidnightBR(cursor);
    const segmentEnd = endOfDay < end ? endOfDay : end;
    totalMs += segmentEnd.getTime() - cursor.getTime();
    cursor = segmentEnd;
  }
  return totalMs;
}

/** Ms úteis restantes até `deadline`, a partir de agora. */
export function businessMsRemaining(deadline) {
  if (!deadline) return 0;
  return businessMsBetween(new Date(), new Date(deadline));
}
