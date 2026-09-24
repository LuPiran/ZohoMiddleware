/**
 * Fila FIFO em memória, com concorrência configurável (default 1 — só uma
 * tarefa por vez). Usada pra serializar o processamento do webhook de leads:
 * se o Zoho disparar vários de uma vez (import em massa, reenvio), cada
 * `createLeadFromZoho` roda um de cada vez em vez de todos em paralelo —
 * evita que dois leads concorrentes leiam `cargaAceita`/`ultimaAtribuicao`
 * desatualizados e caiam no mesmo consultor (corrida no balanceamento).
 */
export function createAsyncQueue({ concurrency = 1 } = {}) {
  const pending = [];
  let active = 0;

  function runNext() {
    if (active >= concurrency || pending.length === 0) return;
    const { task, resolve, reject } = pending.shift();
    active += 1;
    task()
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        runNext();
      });
  }

  return function enqueue(task) {
    return new Promise((resolve, reject) => {
      pending.push({ task, resolve, reject });
      runNext();
    });
  };
}
