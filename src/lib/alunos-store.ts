// Singleton store de Alunos com persistência no Supabase.
import { useEffect, useState } from "react";
import type { Aluno } from "./academic-types";
import { SEED_ALUNOS } from "./academic-seed";
import { supabase } from "@/integrations/supabase/client";
import { toUuid } from "./db-mapping";
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
    curso_id: a.cursoId ? toUuid(a.cursoId) : null,
    turma_id: a.turmaId ? toUuid(a.turmaId) : null,
    responsavel: a.responsavel ?? null,
    contato_resp: a.contatoResp ?? null,
    observacao: a.observacao ?? null,
  };
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
  console.info(`[alunos] top-up: +${missing.length} linhas do seed`);
  return true;
}

async function loadFromDb() {
  // Paginar presenças para contornar o limite padrão de 1000 linhas do PostgREST.
  async function fetchAllPresencas() {
    const pageSize = 1000;
    // Cap absoluto (~500k linhas) — proteção contra loop infinito caso o
    // backend retorne `pageSize` linhas indefinidamente. Em produção real
    // qualquer dataset que se aproxime disso deveria mudar para fetch lazy.
    const MAX_PAGES = 500;
    const all: Array<{ aluno_id: string; atividade_id: string; presente: boolean; observacao: string | null }> = [];
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
    console.warn(`[alunos] presencas: atingiu cap de ${MAX_PAGES} páginas (${MAX_PAGES * pageSize} linhas) — possível dataset truncado.`);
    return { data: all, error: null as null };
  }
  const [{ data, error }, { data: presData, error: presErr }] = await Promise.all([
    supabase.from("alunos").select("*").order("nome"),
    fetchAllPresencas(),
  ]);
  if (error) {
    console.error("[alunos] load error", error);
    return;
  }
  if (presErr) {
    console.error("[presencas] load error", presErr);
  }
  let alunosRows = (data ?? []) as AlunoRow[];
  const existingIds = new Set(alunosRows.map((r) => r.id));
  const inserted = await topUpAlunos(existingIds);
  if (inserted) {
    const { data: data2 } = await supabase.from("alunos").select("*").order("nome");
    alunosRows = (data2 ?? []) as AlunoRow[];
  }
  const presByAluno = new Map<string, { atividadeId: string; presente: boolean; observacao?: string }[]>();
  for (const p of (presData ?? []) as Array<{ aluno_id: string; atividade_id: string; presente: boolean; observacao: string | null }>) {
    const arr = presByAluno.get(p.aluno_id) ?? [];
    arr.push({ atividadeId: p.atividade_id, presente: !!p.presente, observacao: p.observacao ?? undefined });
    presByAluno.set(p.aluno_id, arr);
  }
  alunos = alunosRows.map((r) => {
    const a = rowToAluno(r);
    a.aulas = presByAluno.get(r.id) ?? [];
    return a;
  });
}

async function ensureInit(): Promise<void> {
  if (initialized) {
    await loadFromDb();
    emit();
    return;
  }
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
    const row = alunoToRow(a);
    const local: Aluno = { ...a, id: row.id };
    alunos = [local, ...alunos];
    emit();
    const { error } = await supabase.from("alunos").insert(row);
    if (error) {
      console.error("[alunos] add error", error);
      toast.error(`Erro ao salvar aluno: ${error.message}`);
    }
  },
  async update(id: string, patch: Partial<Aluno>) {
    const dbId = toUuid(id);
    const current = alunos.find((x) => x.id === dbId || x.id === id);
    if (!current) return;
    const merged: Aluno = { ...current, ...patch, id: dbId };
    alunos = alunos.map((x) => (x.id === dbId ? merged : x));
    emit();
    const row = alunoToRow(merged);
    const { error } = await supabase.from("alunos").update(row).eq("id", dbId);
    if (error) {
      console.error("[alunos] update error", error);
      toast.error(`Erro ao atualizar aluno: ${error.message}`);
    }
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    alunos = alunos.filter((x) => x.id !== dbId && x.id !== id);
    emit();
    const { error } = await supabase.from("alunos").delete().eq("id", dbId);
    if (error) {
      console.error("[alunos] remove error", error);
      toast.error(`Erro ao remover aluno: ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
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
