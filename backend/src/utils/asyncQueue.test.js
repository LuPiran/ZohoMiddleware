import { describe, expect, it } from "vitest";
import { createAsyncQueue } from "./asyncQueue.js";

function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

describe("createAsyncQueue", () => {
  it("roda uma tarefa de cada vez, na ordem de chegada (concurrency padrão 1)", async () => {
    const enqueue = createAsyncQueue();
    const order = [];
    let running = 0;
    let maxConcurrent = 0;

    async function task(id, ms) {
      running += 1;
      maxConcurrent = Math.max(maxConcurrent, running);
      await delay(ms);
      running -= 1;
      order.push(id);
      return id;
    }

    const results = await Promise.all([
      enqueue(() => task("a", 30)),
      enqueue(() => task("b", 10)),
      enqueue(() => task("c", 5)),
    ]);

    expect(maxConcurrent).toBe(1);
    expect(order).toEqual(["a", "b", "c"]);
    expect(results).toEqual(["a", "b", "c"]);
  });

  it("propaga rejeição de uma tarefa sem travar as seguintes", async () => {
    const enqueue = createAsyncQueue();
    const boom = enqueue(() => Promise.reject(new Error("falhou")));
    const ok = enqueue(() => delay(5, "ok"));

    await expect(boom).rejects.toThrow("falhou");
    await expect(ok).resolves.toBe("ok");
  });

  it("respeita o limite de concorrência configurado", async () => {
    const enqueue = createAsyncQueue({ concurrency: 2 });
    let running = 0;
    let maxConcurrent = 0;

    async function task() {
      running += 1;
      maxConcurrent = Math.max(maxConcurrent, running);
      await delay(15);
      running -= 1;
    }

    await Promise.all([enqueue(task), enqueue(task), enqueue(task), enqueue(task)]);

    expect(maxConcurrent).toBe(2);
  });
});
