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
});
