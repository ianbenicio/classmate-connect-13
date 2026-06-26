// fetch com retry + backoff exponencial (com jitter) e circuit breaker.
// Absorve 503/timeout transitório do Supabase free-tier sem virar retry-storm
// no app (ver incidente de saturação de compute). Só re-tenta requisições
// idempotentes (GET/HEAD) — mutations NUNCA são re-tentadas (risco de aplicar
// duas vezes). Após uma falha terminal, abre um breaker de fail-fast por alguns
// segundos para não empilhar carga durante um outage sustentado.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffMs(attempt: number): number {
  const base = 400 * 2 ** attempt; // 400, 800, 1600...
  return base + Math.random() * 250; // jitter p/ evitar thundering herd
}

export function createRetryFetch(maxRetries = 2, breakerCooldownMs = 5000): typeof fetch {
  // Estado do breaker por instância (a fonte é o client singleton).
  let breakerOpenUntil = 0;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? "GET").toUpperCase();
    const idempotente = method === "GET" || method === "HEAD";
    const breakerAberto = Date.now() < breakerOpenUntil;
    const tentativas = idempotente && !breakerAberto ? maxRetries : 0;

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
  };
}
