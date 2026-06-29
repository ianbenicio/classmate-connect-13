import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createRetryFetch } from "@/integrations/supabase/retry-fetch";

function resp(status: number): Response {
  return { status } as Response;
}

describe("createRetryFetch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("re-tenta GET em 503 e retorna o sucesso", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(resp(503)).mockResolvedValueOnce(resp(200));
    vi.stubGlobal("fetch", fetchMock);

    const rf = createRetryFetch(2);
    const p = rf("url");
    await vi.runAllTimersAsync();
    const res = await p;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("nao re-tenta POST (mutation)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resp(503));
    vi.stubGlobal("fetch", fetchMock);

    const rf = createRetryFetch(2);
    const res = await rf("url", { method: "POST" });

    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("esgota as tentativas e retorna 503", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resp(503));
    vi.stubGlobal("fetch", fetchMock);

    const rf = createRetryFetch(2);
    const p = rf("url");
    await vi.runAllTimersAsync();
    const res = await p;

    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it("re-tenta em erro de rede e depois sucede", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(resp(200));
    vi.stubGlobal("fetch", fetchMock);

    const rf = createRetryFetch(2);
    const p = rf("url");
    await vi.runAllTimersAsync();
    const res = await p;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("breaker: apos falha terminal, proxima GET falha rapido sem retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resp(503));
    vi.stubGlobal("fetch", fetchMock);

    const rf = createRetryFetch(2);
    const p1 = rf("url");
    await vi.runAllTimersAsync();
    await p1; // esgota tentativas -> abre breaker
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockClear();
    const res2 = await rf("url"); // breaker aberto -> 1 call so
    expect(res2.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("timeout: aborta GET pendurada e re-tenta", async () => {
    const fetchMock = vi
      .fn()
      // 1a tentativa: nunca resolve sozinha; rejeita quando o signal aborta.
      .mockImplementationOnce(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_res, rej) => {
            init?.signal?.addEventListener("abort", () =>
              rej(new DOMException("aborted", "AbortError")),
            );
          }),
      )
      .mockResolvedValueOnce(resp(200));
    vi.stubGlobal("fetch", fetchMock);

    const rf = createRetryFetch(2, 5000, 5, 1000); // timeout 1s
    const p = rf("url");
    await vi.runAllTimersAsync();
    const res = await p;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("semaforo: limita requisicoes in-flight; excedente enfileira", async () => {
    vi.useRealTimers();
    // fetch que só resolve quando chamarmos o resolver capturado.
    const resolvers: Array<() => void> = [];
    const fetchMock = vi.fn(
      () => new Promise<Response>((res) => resolvers.push(() => res(resp(200)))),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rf = createRetryFetch(0, 5000, 2); // maxConcurrent = 2
    const p1 = rf("a");
    const p2 = rf("b");
    const p3 = rf("c"); // deve enfileirar

    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2); // só 2 in-flight

    resolvers[0](); // libera a 1a -> abre vaga p/ a 3a
    await p1;
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    resolvers[1]();
    resolvers[2]();
    await Promise.all([p2, p3]);
  });
});
