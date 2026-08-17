import {
  ZOHO_ATTEMPT_STATUS,
  ZOHO_LEAD_STATUS,
} from "./leadStatus.js";

export const MIN_OBSERVACAO = 10;
export const ATTEMPT_WINDOW_MONTHS = 1;
export const TIMEOUT_OBSERVACAO =
  "Essa tentativa não foi tratada pelo consultor";

export const ATTEMPT_ROUNDS = {
  1: {
    n: 1,
    label: "Primeira tentativa",
    date: "dataPrimeiraTentativa",
    desc: "descricaoPrimeiraTentativa",
    status: "statusPrimeiraTentativa",
  },
  2: {
    n: 2,
    label: "Segunda tentativa",
    date: "dataSegundaTentativa",
    desc: "descricaoSegundaTentativa",
    status: "statusSegundaTentativa",
  },
  3: {
    n: 3,
    label: "Terceira tentativa",
    date: "dataTerceiraTentativa",
    desc: "descricaoTerceiraTentativa",
    status: "statusTerceiraTentativa",
  },
};

function validationError(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = "VALIDATION_ERROR";
  return err;
}

export function normalizeAttemptText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isLeadAccepted(lead) {
  const status = String(lead?.slaStatus || "");
  return status === "aceito" || status === "confirmado";
}

export function parseAttemptRound(round) {
  const n = Number(round);
  if (![1, 2, 3].includes(n)) {
    throw validationError("Tentativa inválida. Use 1, 2 ou 3.");
  }
  return n;
}

export function isLeadClosed(lead) {
  return (
    Boolean(lead?.dataSemInteresse) ||
    Boolean(lead?.dataConversao) ||
    normalizeAttemptText(lead?.status).includes("convert") ||
    normalizeAttemptText(lead?.status).includes("sem interesse")
  );
}

export function isAttemptRoundDone(lead, round) {
  const meta = ATTEMPT_ROUNDS[round];
  return Boolean(lead?.[meta.date]);
}

export function isAttemptTreated(lead, round) {
  return normalizeAttemptText(lead?.[ATTEMPT_ROUNDS[round].status]).includes(
    "tratado",
  );
}

export function isAttemptNoReturn(lead, round) {
  return normalizeAttemptText(lead?.[ATTEMPT_ROUNDS[round].status]).includes(
    "retorno",
  );
}

export function qualificationStartIso(lead) {
  return lead?.dataQualificado || lead?.slaCheckinAt || null;
}

export function addCalendarMonths(iso, months) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

export function attemptDeadlineAt(lead, round) {
  const start = qualificationStartIso(lead);
  if (!start || !round) return null;
  return addCalendarMonths(start, round * ATTEMPT_WINDOW_MONTHS);
}

export function daysUntil(iso) {
  if (!iso) return null;
  const target = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function isAttemptWindowOpen(lead, round) {
  const deadline = attemptDeadlineAt(lead, round);
  if (!deadline) return false;
  return Date.now() <= deadline.getTime();
}

/**
 * Próxima tentativa em aberto.
 * A 2ª/3ª só existem se a anterior venceu o prazo (Sem Retorno).
 * Tentativa tratada no prazo encerra a cadeia.
 */
export function currentOpenAttemptRound(lead) {
  if (isLeadClosed(lead) || !isLeadAccepted(lead)) return null;
  for (const round of [1, 2, 3]) {
    if (isAttemptRoundDone(lead, round)) {
      if (isAttemptTreated(lead, round)) return null;
      continue;
    }
    if (round === 1) return 1;
    if (isAttemptNoReturn(lead, round - 1)) return round;
    return null;
  }
  return null;
}

export function hasTreatedAttempt(lead) {
  return (
    isAttemptTreated(lead, 1) ||
    isAttemptTreated(lead, 2) ||
    isAttemptTreated(lead, 3)
  );
}

export function isTreatedOnTime(lead) {
  return !currentOpenAttemptRound(lead) && hasTreatedAttempt(lead);
}

export function hasSemContato(lead) {
  return (
    Boolean(lead?.dataSemContato) ||
    normalizeAttemptText(lead?.status).includes("sem contato")
  );
}

export function canMarkSemContato(lead) {
  return (
    isLeadAccepted(lead) &&
    !isLeadClosed(lead) &&
    !hasTreatedAttempt(lead) &&
    !hasSemContato(lead)
  );
}

export function requireObservacao(observacao) {
  const note =
    observacao === undefined || observacao === null
      ? undefined
      : String(observacao).trim();
  if (!note) {
    throw validationError(
      "Para enviar uma tentativa ou lead sem interesse, adicione uma observação",
    );
  }
  if (note.length < MIN_OBSERVACAO) {
    throw validationError(
      "Observação da tentativa deve ter pelo menos 10 caracteres",
    );
  }
  return note;
}

export function assertCanRegisterAttempt(lead, round) {
  const n = parseAttemptRound(round);
  const meta = ATTEMPT_ROUNDS[n];

  if (isLeadClosed(lead)) {
    throw validationError("Lead já encerrado (sem interesse / convertido).");
  }

  if (currentOpenAttemptRound(lead) !== n) {
    throw validationError(
      n === 1
        ? "Primeira tentativa já registrada ou lead ainda não aceito."
        : `${meta.label} não está disponível neste momento.`,
    );
  }

  if (!isAttemptWindowOpen(lead, n)) {
    throw validationError(
      "O prazo de 1 mês desta tentativa já encerrou. Sem retorno será aplicado automaticamente.",
    );
  }

  return { n, meta };
}

export function assertCanMarkSemInteresse(lead) {
  if (isLeadClosed(lead)) {
    throw validationError("Lead já encerrado.");
  }
  if (isTreatedOnTime(lead)) {
    throw validationError(
      "Tentativa já registrada no prazo. O lead está com interesse.",
    );
  }
}

export function treatedAttemptUpdates(lead, round, { observacao, at }) {
  const { n, meta } = assertCanRegisterAttempt(lead, round);
  const note = requireObservacao(observacao);
  return {
    n,
    note,
    updates: {
      [meta.desc]: note,
      [meta.date]: at,
      [meta.status]: ZOHO_ATTEMPT_STATUS.TRATADO,
      status: ZOHO_LEAD_STATUS.COM_INTERESSE,
      dataEmContato: lead.dataEmContato || at,
      dataEmAquecimento: lead.dataEmAquecimento || at,
      updatedAt: at,
    },
  };
}

export function semInteresseUpdates(lead, { observacao, at }) {
  assertCanMarkSemInteresse(lead);
  const note = requireObservacao(observacao);
  const round = currentOpenAttemptRound(lead);
  const meta = round ? ATTEMPT_ROUNDS[round] : null;
  const updates = {
    status: ZOHO_LEAD_STATUS.SEM_INTERESSE,
    dataSemInteresse: at,
    updatedAt: at,
  };
  if (meta) {
    updates[meta.desc] = note;
    updates[meta.date] = at;
    updates[meta.status] = ZOHO_ATTEMPT_STATUS.TRATADO;
  }
  return { note, round, updates };
}

export function timeoutAttemptUpdates(lead, round, at) {
  const n = parseAttemptRound(round);
  const meta = ATTEMPT_ROUNDS[n];
  if (isLeadClosed(lead) || isAttemptRoundDone(lead, n)) return null;
  if (currentOpenAttemptRound(lead) !== n) return null;
  if (isAttemptWindowOpen(lead, n)) return null;

  const updates = {
    [meta.desc]: TIMEOUT_OBSERVACAO,
    [meta.date]: at,
    [meta.status]: ZOHO_ATTEMPT_STATUS.SEM_RETORNO,
    updatedAt: at,
  };
  if (n === 1) updates.adicionarSegundaTentativa = true;
  if (n === 2) updates.adicionarTerceiraTentativa = true;
  return updates;
}

export function assertCanMarkSemContato(lead) {
  if (isLeadClosed(lead)) {
    throw validationError("Lead já encerrado.");
  }
  if (hasTreatedAttempt(lead)) {
    throw validationError(
      "Tentativa já registrada. O lead está com interesse.",
    );
  }
  if (hasSemContato(lead)) {
    throw validationError("Lead já está marcado como sem contato.");
  }
  if (!isLeadAccepted(lead)) {
    throw validationError("Aceite o lead antes de marcar sem contato.");
  }
}

export function semContatoUpdates(lead, { at }) {
  assertCanMarkSemContato(lead);
  return {
    updates: {
      status: ZOHO_LEAD_STATUS.SEM_CONTATO,
      dataSemContato: at,
      updatedAt: at,
    },
  };
}

export function applyLeadUpdates(lead, updates) {
  if (!updates) return lead;
  return { ...lead, ...updates };
}

export function buildLeadTimeline(lead) {
  const lost =
    Boolean(lead.dataSemInteresse) ||
    normalizeAttemptText(lead.status).includes("sem interesse");
  const converted = Boolean(
    lead.dataConversao || normalizeAttemptText(lead.status).includes("convert"),
  );
  const treatedRound =
    [1, 2, 3].find((round) => isAttemptTreated(lead, round)) || null;
  const interesseDate =
    lead.dataEmAquecimento ||
    lead.dataEmContato ||
    (treatedRound ? lead[ATTEMPT_ROUNDS[treatedRound].date] : null) ||
    (normalizeAttemptText(lead.status).includes("interesse") &&
    !normalizeAttemptText(lead.status).includes("sem")
      ? lead.updatedAt
      : null);

  const stages = [
    {
      id: "criado",
      label: "Criado",
      date: lead.dataNovoLead || lead.createdAt || null,
    },
    {
      id: "qualificado",
      label: "Qualificado",
      date: lead.dataQualificado || lead.slaCheckinAt || null,
    },
  ];

  const attemptLabels = {
    1: {
      id: "tentativa1",
      label: "Primeira Tentativa",
      date: lead.dataPrimeiraTentativa,
    },
    2: {
      id: "tentativa2",
      label: "Segunda Tentativa",
      date: lead.dataSegundaTentativa,
    },
    3: {
      id: "tentativa3",
      label: "Terceira Tentativa",
      date: lead.dataTerceiraTentativa,
    },
  };

  const qualified = Boolean(
    lead.dataQualificado || lead.slaCheckinAt || isLeadAccepted(lead),
  );

  if (qualified || treatedRound || lost || isAttemptRoundDone(lead, 1)) {
    const maxAttemptShown = treatedRound
      ? treatedRound
      : isAttemptNoReturn(lead, 3) || isAttemptRoundDone(lead, 3)
        ? 3
        : isAttemptNoReturn(lead, 2) || isAttemptRoundDone(lead, 2)
          ? 3
          : isAttemptNoReturn(lead, 1) || isAttemptRoundDone(lead, 1)
            ? 2
            : 1;

    for (let round = 1; round <= maxAttemptShown; round += 1) {
      if (treatedRound && round > treatedRound) break;
      stages.push(attemptLabels[round]);
    }

    if (lost) {
      stages.push({
        id: "semInteresse",
        label: "Lead Sem Interesse",
        date: lead.dataSemInteresse || lead.updatedAt || null,
      });
    } else if (treatedRound || interesseDate) {
      stages.push({
        id: "interesse",
        label: "Lead Com Interesse",
        date: interesseDate,
      });
      stages.push({
        id: "convertido",
        label: "Convertido",
        date: converted ? lead.dataConversao || lead.updatedAt : null,
      });
    } else if (!isAttemptNoReturn(lead, 3)) {
      stages.push({
        id: "interesse",
        label: "Lead Com Interesse",
        date: null,
      });
      stages.push({
        id: "convertido",
        label: "Convertido",
        date: null,
      });
    }
  }

  if (!stages[0].date && lead.createdAt) {
    stages[0].date = lead.createdAt;
  }

  let currentIndex = -1;
  for (let i = 0; i < stages.length; i += 1) {
    if (stages[i].date) currentIndex = i;
  }

  return {
    lost,
    lostAt: lead.dataSemInteresse || null,
    stages: stages.map((stage, index) => {
      let state = "pending";
      if (stage.date) state = "done";
      else if (lost) state = index < stages.length - 1 ? "pending" : "done";
      else if (index === currentIndex + 1) state = "current";
      else if (currentIndex < 0 && index === 0) state = "current";
      return { ...stage, state };
    }),
  };
}

export function buildAttemptView(lead) {
  const currentRound = currentOpenAttemptRound(lead);
  const deadlineAt = currentRound ? attemptDeadlineAt(lead, currentRound) : null;
  const expired = Boolean(
    currentRound && deadlineAt && Date.now() > deadlineAt.getTime(),
  );
  const treatedOnTime = isTreatedOnTime(lead);
  const windowLabels = {
    1: "1ª tentativa — 1 mês a partir da qualificação",
    2: "2ª tentativa — aberta porque a 1ª não foi feita no prazo",
    3: "3ª tentativa — aberta porque a 2ª não foi feita no prazo",
  };

  return {
    currentRound,
    deadlineAt: deadlineAt ? deadlineAt.toISOString() : null,
    daysRemaining: daysUntil(deadlineAt),
    expired,
    treatedOnTime,
    canRegisterAttempt: currentRound !== null && !expired,
    canRegisterFirstAttempt: currentRound === 1 && !expired,
    hasFirstAttempt: Boolean(lead.dataPrimeiraTentativa),
    hasSecondAttempt: Boolean(lead.dataSegundaTentativa),
    hasThirdAttempt: Boolean(lead.dataTerceiraTentativa),
    hasSemInteresse: Boolean(lead.dataSemInteresse),
    hasSemContato: hasSemContato(lead),
    canMarkSemContato: canMarkSemContato(lead),
    converted: Boolean(
      lead.dataConversao ||
        normalizeAttemptText(lead.status).includes("convert"),
    ),
    windowLabel: expired
      ? "Prazo de 1 mês encerrado. Sem retorno será aplicado automaticamente."
      : treatedOnTime
        ? "Tentativa registrada no prazo. A próxima não será aberta."
        : windowLabels[currentRound] || "Tentativas de contato",
  };
}
