// fetch com retry + backoff exponencial (com jitter), circuit breaker e
// limite de concorrência. Absorve 503/timeout transitório do Supabase
// free-tier sem virar retry-storm no app (ver incidente de saturação de
// compute). Só re-tenta requisições idempotentes (GET/HEAD) — mutations
// NUNCA são re-tentadas (risco de aplicar duas vezes). Após uma falha
// terminal, abre um breaker de fail-fast por alguns segundos para não
// empilhar carga durante um outage sustentado.
//
// Limite de concorrência: no boot, várias stores + o auth disparam queries
// quase simultâneas. No free-tier isso estoura o pool/compute e dispara 503
// → breaker abre → dados parciais. O semáforo segura o pico (default 5
// in-flight); o excedente enfileira e entra assim que abre uma vaga.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffMs(attempt: number): number {
  const base = 400 * 2 ** attempt; // 400, 800, 1600...
  return base + Math.random() * 250; // jitter p/ evitar thundering herd
}

/** Semáforo simples (FIFO) para limitar requisições in-flight. */
function createSemaphore(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return {
    acquire(): Promise<void> {
      if (active < max) {
        active++;
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => queue.push(resolve));
    },
    release(): void {
      const next = queue.shift();
      if (next) {
        // Transfere a vaga direto p/ o próximo da fila (active permanece).
        next();
      } else {
        active--;
      }
    },
  };
}

export function createRetryFetch(
  maxRetries = 2,
  breakerCooldownMs = 5000,
  maxConcurrent = 5,
): typeof fetch {
  // Estado do breaker por instância (a fonte é o client singleton).
  let breakerOpenUntil = 0;
  const sem = createSemaphore(maxConcurrent);

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? "GET").toUpperCase();
    const idempotente = method === "GET" || method === "HEAD";
    const breakerAberto = Date.now() < breakerOpenUntil;
    const tentativas = idempotente && !breakerAberto ? maxRetries : 0;

    await sem.acquire();
    try {
      let ultimoErro: unknown;
      for (let attempt = 0; attempt <= tentativas; attempt++) {
        try {
          const res = await globalThis.fetch(input, init);
          if (res.status === 503 && attempt < tentativas) {
            await sleep(backoffMs(attempt));
            continue;
          }
          if (res.status === 503 && idempotente) {
            breakerOpenUntil = Date.now() + breakerCooldownMs;
          }
          return res;
        } catch (err) {
          ultimoErro = err;
          if (attempt < tentativas) {
            await sleep(backoffMs(attempt));
            continue;
          }
          if (idempotente) {
            breakerOpenUntil = Date.now() + breakerCooldownMs;
          }
          throw err;
        }
      }
      throw ultimoErro;
    } finally {
      sem.release();
    }
  };
}
