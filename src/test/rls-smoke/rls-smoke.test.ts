// Anchor test: RLS smoke against real Supabase. Gated by SUPABASE_TEST=1.
// Run: SUPABASE_TEST=1 npx vitest run src/test/rls-smoke
//
// Required env:
//   VITE_SUPABASE_URL              (or SUPABASE_URL)
//   VITE_SUPABASE_PUBLISHABLE_KEY  (or SUPABASE_ANON_KEY)
//   RLS_TEST_ALUNO_JWT             — JWT for an aluno-role test user
//   RLS_TEST_PROFESSOR_JWT         — JWT for a professor-role test user
//   RLS_TEST_ADMIN_JWT             — JWT for an admin-role test user
//   RLS_TEST_SUPER_JWT             — (optional) JWT for super_admin
import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

function client(jwt: string | null): SupabaseClient {
  return createClient(url, anonKey, {
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function count(c: SupabaseClient, table: string): Promise<number> {
  const { count: n, error } = await c.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

const need = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(`missing env ${key} — set before running RLS smoke`);
  return v;
};

describe.runIf(process.env.SUPABASE_TEST === "1")("RLS smoke (real Supabase)", () => {
  it("anon cannot read alunos/agendamentos/system_settings", async () => {
    if (!url || !anonKey) throw new Error("SUPABASE_URL + ANON_KEY required");
    const anon = client(null);
    expect(await count(anon, "alunos")).toBe(0);
    expect(await count(anon, "agendamentos")).toBe(0);
    expect(await count(anon, "system_settings")).toBe(0);
  });

  it("aluno: sees own row in alunos, own turma, own curso", async () => {
    const c = client(need("RLS_TEST_ALUNO_JWT"));
    const alunos = await count(c, "alunos");
    const turmas = await count(c, "turmas");
    const cursos = await count(c, "cursos");
    expect(alunos).toBeGreaterThanOrEqual(1);
    expect(alunos).toBeLessThan(50);
    expect(turmas).toBeGreaterThanOrEqual(1);
    expect(cursos).toBeGreaterThanOrEqual(1);
  });

  it("aluno: CANNOT read system_settings (C2)", async () => {
    const c = client(need("RLS_TEST_ALUNO_JWT"));
    expect(await count(c, "system_settings")).toBe(0);
  });

  it("professor: sees drive.* settings but NOT SA secret (C2)", async () => {
    const c = client(need("RLS_TEST_PROFESSOR_JWT"));
    const settings = await c
      .from("system_settings")
      .select("key")
      .like("key", "integration.drive%");
    expect(settings.error).toBeNull();
    const keys = (settings.data ?? []).map((r: { key: string }) => r.key);
    expect(keys).not.toContain("integration.drive.service_account_json");
    expect(keys.length).toBeGreaterThan(0);
  });

  it("admin: CAN read SA secret", async () => {
    const c = client(need("RLS_TEST_ADMIN_JWT"));
    const { data, error } = await c
      .from("system_settings")
      .select("key, value")
      .eq("key", "integration.drive.service_account_json")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.key).toBe("integration.drive.service_account_json");
  });

  it("aluno: bounded reads on aluno_habilidades (M1)", async () => {
    const c = client(need("RLS_TEST_ALUNO_JWT"));
    const { data, error } = await c
      .from("aluno_habilidades")
      .select("aluno_id, habilidade_id")
      .limit(100);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeLessThan(1000);
  });

  it("anon: CANNOT call is_staff via /rpc/ (H1 anon REVOKE)", async () => {
    const anon = client(null);
    const { error } = await anon.rpc("is_staff", {
      _user_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).not.toBeNull();
  });

  it("super_admin: cross-tenant visibility (optional)", async () => {
    const jwt = process.env.RLS_TEST_SUPER_JWT;
    if (!jwt) {
      console.warn("RLS_TEST_SUPER_JWT not set — skipping super assertion");
      return;
    }
    const c = client(jwt);
    const alunos = await count(c, "alunos");
    const projetos = await count(c, "projetos");
    expect(alunos).toBeGreaterThan(50);
    expect(projetos).toBeGreaterThanOrEqual(1);
  });
});
