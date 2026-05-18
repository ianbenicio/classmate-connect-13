---
name: javis-test
description: Patterns de teste pra Javis (vitest + happy-dom + smoke RLS gated). Use quando user pedir novo teste, debug de test failing, expansão de cobertura, ou setup E2E Playwright. Cobre vi.hoisted, mock supabase client, RLS smoke gated por SUPABASE_TEST=1.
user-invocable: true
---

# javis-test

Test patterns canônicos.

## Stack

- **vitest 4.x** + **happy-dom** + **@testing-library/react**
- **@playwright/test** (E2E, Sprint F)
- Config standalone em `vitest.config.ts`
- Setup em `src/test/setup.ts` (matchMedia shim)
- 3 anchor tests: `current-project`, `auth`, `rls-smoke`

## Quando invocar

- "Adicionar teste pra X"
- "Por que esse teste tá falhando?"
- "Aumentar cobertura"
- "Setup E2E"

## Mock supabase client

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

// CRITICAL: vi.hoisted pra evitar TDZ no factory
const { toastErrorSpy } = vi.hoisted(() => ({ toastErrorSpy: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastErrorSpy, warning: vi.fn(), success: vi.fn() },
}));

const queryHandlers: Record<string, () => Promise<unknown>> = {};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { /* getUser/getSession/onAuthStateChange mocks */ },
    from: (table: string) => {
      const exec = () => queryHandlers[table]?.() ?? Promise.resolve({ data: null, error: null });
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => exec(),
        then: (r: (v: unknown) => unknown) => exec().then(r),
      };
      return chain;
    },
  },
}));

beforeEach(() => {
  toastErrorSpy.mockClear();
  Object.keys(queryHandlers).forEach(k => delete queryHandlers[k]);
});
```

## Mock module singleton

```ts
async function loadModule() {
  vi.resetModules();
  return import("@/lib/current-project");
}

it("reset state per test", async () => {
  if (typeof localStorage !== "undefined") localStorage.clear();
  const m = await loadModule();
  // tests...
});
```

## RLS smoke (gated por SUPABASE_TEST=1)

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const need = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(`missing env ${key}`);
  return v;
};

function client(jwt: string | null): SupabaseClient {
  return createClient(URL, ANON_KEY, {
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe.runIf(process.env.SUPABASE_TEST === "1")("RLS smoke", () => {
  it("aluno: bounded reads", async () => {
    const c = client(need("RLS_TEST_ALUNO_JWT"));
    const { count, error } = await c.from("alunos")
      .select("*", { count: "exact", head: true });
    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(50);
  });
});
```

## E2E Playwright (Sprint F)

```ts
import { test, expect } from "@playwright/test";

test("professor: registrar aula", async ({ page }) => {
  await page.goto("/auth");
  await page.fill('[name="email"]', process.env.E2E_PROF_EMAIL!);
  await page.fill('[name="password"]', process.env.E2E_PROF_PASSWORD!);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");
});
```

## Princípios

- **Anchor tests primeiro**: cobrir invariants críticos (race-guard, rollback, RLS) antes de detalhes
- **vi.hoisted** sempre que mock factory referencia variable do escopo
- **happy-dom > jsdom** pra unit
- **describe.runIf** pra testes condicionais (env, feature flag)
- **Não teste implementação, teste comportamento**: AC do user story

## Comandos

```bash
npm test                       # unit + integration
npm run test:watch             # watch mode
npm run test:rls               # RLS smoke (SUPABASE_TEST=1 + JWTs)
npm run gen:test-jwts          # gera JWTs pra smoke
```

## Não fazer

- ❌ `const spy = vi.fn()` antes de `vi.mock` que usa spy → TDZ. Use `vi.hoisted`.
- ❌ Testar lib (testing-library) — testar nosso código
- ❌ Snapshot tests pra texto formatado — frágil
- ❌ Hit Supabase real em unit tests — sempre mock; smoke RLS só em runner separado
- ❌ Pular cleanup em `beforeEach` — vaza state entre tests
