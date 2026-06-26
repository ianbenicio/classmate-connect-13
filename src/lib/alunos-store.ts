// Singleton store de Alunos com persistência no Supabase.
import { useEffect, useState } from "react";
import type { Aluno } from "./academic-types";
import { SEED_ALUNOS } from "./academic-seed";
import { devInfo } from "./dev-log";
import { supabase } from "@/integrations/supabase/client";
import { toUuid } from "./db-mapping";
import { requireProjectIdForWrite } from "./current-project";
import { toast } from "sonner";

let alunos: Aluno[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type AlunoRow = {
  id: string;
  nome: string;
  idade: number | null;
  contato: string | null;
  cpf: string | null;
  email: string | null;
  user_id: string | null;
  curso_id: string | null;
  turma_id: string | null;
  responsavel: string | null;
  contato_resp: string | null;
  observacao: string | null;
};

function rowToAluno(r: AlunoRow): Aluno {
  return {
    id: r.id,
    nome: r.nome,
    idade: r.idade ?? undefined,
    contato: r.contato ?? "",
    cpf: r.cpf ?? undefined,
    email: r.email ?? undefined,
    userId: r.user_id ?? undefined,
    cursoId: r.curso_id ?? "",
    turmaId: r.turma_id ?? "",
    habilidadeIds: [],
    aulas: [],
    trabalhos: [],
    responsavel: r.responsavel ?? undefined,
    contatoResp: r.contato_resp ?? undefined,
    observacao: r.observacao ?? undefined,
  };
}

function alunoToRow(a: Aluno) {
  return {
    id: toUuid(a.id),
    nome: a.nome,
    idade: a.idade ?? null,
    contato: a.contato || null,
    cpf: a.cpf ?? null,
    email: a.email?.trim().toLowerCase() || null,
    user_id: a.userId ?? null,
    curso_id: a.cursoId ? toUuid(a.cursoId) : null,
    turma_id: a.turmaId ? toUuid(a.turmaId) : null,
    responsavel: a.responsavel ?? null,
    contato_resp: a.contatoResp ?? null,
    observacao: a.observacao ?? null,
    project_id: requireProjectIdForWrite() ?? undefined,
  };
}

export type InviteResult =
  | { ok: true; status: "invited" | "linked_existing"; userId: string }
  | { ok: false; error: string; detail?: string; hint?: string };

/**
 * Dispara a Edge Function `invite-aluno-user` para o aluno.
 * Pré-condições (verificadas server-side): email + curso_id + turma_id + sem user_id.
 * v2 da Edge Function retorna 200 com body.error quando falha conhecida.
 */
async function inviteAlunoUser(alunoId: string): Promise<InviteResult> {
  const { data, error } = await supabase.functions.invoke("invite-aluno-user", {
    body: { alunoId },
  });
  if (error) {
    console.error("[alunos] invite invoke error", error);
    return { ok: false, error: "invoke_failed", detail: error.message };
  }
  // Body com error: falha conhecida (200 OK mas erro semântico).
  if (data && typeof data === "object" && "error" in data && !("status" in data)) {
    const errObj = data as { error: string; detail?: string; hint?: string };
    console.error("[alunos] invite error body", errObj);
    return { ok: false, error: errObj.error, detail: errObj.detail, hint: errObj.hint };
  }
  const result = data as { status: "invited" | "linked_existing"; userId: string };
  if (!result?.userId) {
    return { ok: false, error: "no_user_id_returned" };
  }
  // Atualiza snapshot in-memory para UI refletir vínculo imediato.
  patchAlunoUserId(alunoId, result.userId);
  return { ok: true, status: result.status, userId: result.userId };
}

/**
 * Após invite bem-sucedido, atualiza snapshot in-memory com o userId.
 * Chamado pelo UI (AlunoFormDialog Exportar / AlunoDetailDialog).
 */
function patchAlunoUserId(alunoId: string, userId: string): void {
  alunos = alunos.map((x) => (x.id === alunoId ? { ...x, userId } : x));
  emit();
}

// Top-up: insere os alunos do seed ainda ausentes. O store não tinha
// mecanismo de seed — SEED_ALUNOS existia mas nunca era persistido.
//
// FKs (curso_id, turma_id) são ON DELETE SET NULL no schema, mas o INSERT
// ainda exige que o pai exista. Antes a função tentava inserir cegamente e
// quebrava com 23503 quando o seed referenciava um curso/turma que ainda
// não estava no banco (acontecia em primeiros loads ou após resets parciais).
// Solução: pré-buscamos os ids válidos e anulamos referências órfãs em vez
// de derrubar o batch inteiro.
async function topUpAlunos(existingIds: Set<string>) {
  const missing = SEED_ALUNOS.filter((a) => !existingIds.has(toUuid(a.id)));
  if (missing.length === 0) return false;

  const [{ data: cursoRows }, { data: turmaRows }] = await Promise.all([
    supabase.from("cursos").select("id"),
    supabase.from("turmas").select("id"),
  ]);
  const validCursoIds = new Set((cursoRows ?? []).map((r: { id: string }) => r.id));
  const validTurmaIds = new Set((turmaRows ?? []).map((r: { id: string }) => r.id));

  const rows = missing.map((a) => {
    const row = alunoToRow(a);
    if (row.curso_id && !validCursoIds.has(row.curso_id)) row.curso_id = null;
    if (row.turma_id && !validTurmaIds.has(row.turma_id)) row.turma_id = null;
    return row;
  });
  const { error } = await supabase
    .from("alunos")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("[alunos] top-up error", error);
    return false;
  }
  devInfo(`[alunos] top-up: +${missing.length} linhas do seed`);
  return true;
}

// Paginar presenças — extraído para reuso em reloadPresencas.
async function fetchAllPresencas() {
  const pageSize = 1000;
  // Cap absoluto (~500k linhas) — proteção contra loop infinito caso o
  // backend retorne `pageSize` linhas indefinidamente. Em produção real
  // qualquer dataset que se aproxime disso deveria mudar para fetch lazy.
  const MAX_PAGES = 500;
  const all: Array<{
    aluno_id: string;
    atividade_id: string;
    presente: boolean;
    observacao: string | null;
  }> = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("presencas")
      .select("aluno_id, atividade_id, presente, observacao")
      .range(from, from + pageSize - 1);
    if (error) return { data: all, error };
    const rows = (data ?? []) as typeof all;
    all.push(...rows);
    if (rows.length < pageSize) return { data: all, error: null as null };
  }
  console.warn(
    `[alunos] presencas: atingiu cap de ${MAX_PAGES} páginas (${MAX_PAGES * pageSize} linhas) — possível dataset truncado.`,
  );
  return { data: all, error: null as null };
}

/** Constrói mapa alunoId → RegistroAula[] a partir dos dados de presencas. */
function buildPresencaMap(
  presData: Array<{
    aluno_id: string;
    atividade_id: string;
    presente: boolean;
    observacao: string | null;
  }> | null,
) {
  const presByAluno = new Map<
    string,
    { atividadeId: string; presente: boolean; observacao?: string }[]
  >();
  for (const p of (presData ?? []) as Array<{
    aluno_id: string;
    atividade_id: string;
    presente: boolean;
    observacao: string | null;
  }>) {
    const arr = presByAluno.get(p.aluno_id) ?? [];
    arr.push({
      atividadeId: p.atividade_id,
      presente: !!p.presente,
      observacao: p.observacao ?? undefined,
    });
    presByAluno.set(p.aluno_id, arr);
  }
  return presByAluno;
}

// Carrega alunos primeiro (rápido) e DEFERE as presenças para segundo plano.
// Presenças (paginadas, pesadas) saem do burst de boot; `aluno.aulas` é
// populado logo depois, com novo emit (consumidores re-renderizam via subscribe).
async function loadFromDb() {
  const { data, error } = await supabase.from("alunos").select("*").order("nome");
  if (error) {
    console.error("[alunos] load error", error);
    return;
  }
  let alunosRows = (data ?? []) as AlunoRow[];
  const existingIds = new Set(alunosRows.map((r) => r.id));
  const inserted = await topUpAlunos(existingIds);
  if (inserted) {
    const { data: data2, error: err2 } = await supabase.from("alunos").select("*").order("nome");
    if (err2) console.error("[alunos] reload error", err2);
    alunosRows = (data2 ?? []) as AlunoRow[];
  }
  alunos = alunosRows.map((r) => {
    const a = rowToAluno(r);
    a.aulas = [];
    return a;
  });
  // Presenças fora do caminho crítico do boot — popula `aulas` quando chegar.
  void loadPresencasBackground();
}

async function loadPresencasBackground() {
  const { data: presData, error } = await fetchAllPresencas();
  if (error) {
    console.error("[presencas] load error", error);
    return;
  }
  const presByAluno = buildPresencaMap(presData);
  alunos = alunos.map((a) => ({ ...a, aulas: presByAluno.get(a.id) ?? [] }));
  emit();
}

async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = loadFromDb().then(() => {
      initialized = true;
      emit();
    });
  }
  return initPromise;
}

export const alunosStore = {
  getAll(): Aluno[] {
    return alunos;
  },
  async add(a: Aluno) {
    // IDs runtime já são UUIDs — construir row direto, sem toUuid.
    const row = {
      id: a.id,
      nome: a.nome,
      idade: a.idade ?? null,
      contato: a.contato || null,
      cpf: a.cpf ?? null,
      email: a.email?.trim().toLowerCase() || null,
      user_id: a.userId ?? null,
      curso_id: a.cursoId ?? null,
      turma_id: a.turmaId ?? null,
      responsavel: a.responsavel ?? null,
      contato_resp: a.contatoResp ?? null,
      observacao: a.observacao ?? null,
      project_id: requireProjectIdForWrite() ?? undefined,
    };
    const local: Aluno = { ...a };
    const snap = alunos;
    alunos = [local, ...alunos];
    emit();
    const { error } = await supabase.from("alunos").insert(row);
    if (error) {
      alunos = snap;
      emit();
      console.error("[alunos] add error", error);
      toast.error(`Erro ao salvar aluno: ${error.message}`);
      throw error;
    }
  },
  async update(id: string, patch: Partial<Aluno>) {
    // IDs runtime já são UUIDs — usar direto.
    const current = alunos.find((x) => x.id === id);
    if (!current) return;
    const merged: Aluno = { ...current, ...patch, id };
    const snap = alunos;
    alunos = alunos.map((x) => (x.id === id ? merged : x));
    emit();
    const row = {
      id: merged.id,
      nome: merged.nome,
      idade: merged.idade ?? null,
      contato: merged.contato || null,
      cpf: merged.cpf ?? null,
      email: merged.email?.trim().toLowerCase() || null,
      user_id: merged.userId ?? null,
      curso_id: merged.cursoId ?? null,
      turma_id: merged.turmaId ?? null,
      responsavel: merged.responsavel ?? null,
      contato_resp: merged.contatoResp ?? null,
      observacao: merged.observacao ?? null,
      project_id: requireProjectIdForWrite() ?? undefined,
    };
    const { error } = await supabase.from("alunos").update(row).eq("id", id);
    if (error) {
      alunos = snap;
      emit();
      console.error("[alunos] update error", error);
      toast.error(`Erro ao atualizar aluno: ${error.message}`);
      throw error;
    }
  },
  async remove(id: string) {
    // IDs runtime já são UUIDs — usar direto.
    const snap = alunos;
    alunos = alunos.filter((x) => x.id !== id);
    emit();
    const { error } = await supabase.from("alunos").delete().eq("id", id);
    if (error) {
      alunos = snap;
      emit();
      console.error("[alunos] remove error", error);
      toast.error(`Erro ao remover aluno: ${error.message}`);
    }
  },
  /**
   * Recarrega presenças do banco e atualiza `aluno.aulas` em memória.
   * Chamar após syncPresencas para que QuadroAulas reflita mudanças sem F5.
   */
  async reloadPresencas() {
    const { data: presData, error } = await fetchAllPresencas();
    if (error) {
      console.error("[presencas] reload error", error);
      return;
    }
    const presByAluno = buildPresencaMap(presData);
    alunos = alunos.map((a) => ({
      ...a,
      aulas: presByAluno.get(a.id) ?? a.aulas,
    }));
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
  /** Reenvia/dispara o convite manualmente (botão "Reenviar convite"). */
  invite: inviteAlunoUser,
};

export function useAlunos(): Aluno[] {
  const [snap, setSnap] = useState<Aluno[]>(alunosStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = alunosStore.subscribe(() => setSnap([...alunosStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
