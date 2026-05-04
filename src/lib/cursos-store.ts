// Singleton store de Cursos com persistência no Supabase.
// - Carrega do banco no primeiro uso (useCursos chama ensureInit).
// - Se a tabela estiver vazia, semeia com SEED_CURSOS.
// - upsert/remove gravam no banco e atualizam cache + listeners.
import { useEffect, useState } from "react";
import type { Curso } from "./academic-types";
import { SEED_CURSOS, SEED_GRUPOS } from "./academic-seed";
import { supabase } from "@/integrations/supabase/client";
import { toUuid, toUuidArray } from "./db-mapping";
import { toast } from "sonner";
import { devInfo } from "./dev-log";

let cursos: Curso[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type CursoRow = {
  id: string;
  cod: string;
  nome: string;
  descricao: string | null;
  carga_horaria_total_min: number;
  duracao_aula_min: number;
  turno_diario_min: number;
  habilidade_ids?: unknown;
};

function rowToCurso(r: CursoRow): Curso {
  return {
    id: r.id,
    cod: r.cod,
    nome: r.nome,
    descricao: r.descricao ?? undefined,
    cargaHorariaTotalMin: r.carga_horaria_total_min,
    duracaoAulaMin: r.duracao_aula_min,
    turnoDiarioMin: r.turno_diario_min,
    // Normaliza para UUID — habilidades-store guarda tudo como UUID
    // (toUuid de seed-id). Linhas legadas com seed-ids ficam corrigidas no
    // momento da leitura (toUuid é idempotente p/ UUIDs).
    habilidadeIds: toUuidArray(
      Array.isArray(r.habilidade_ids) ? (r.habilidade_ids as string[]) : [],
    ),
  };
}

function cursoToRow(c: Curso) {
  return {
    id: toUuid(c.id),
    cod: c.cod,
    nome: c.nome,
    descricao: c.descricao ?? null,
    carga_horaria_total_min: c.cargaHorariaTotalMin ?? 0,
    duracao_aula_min: c.duracaoAulaMin ?? 60,
    turno_diario_min: c.turnoDiarioMin ?? c.duracaoAulaMin ?? 60,
    habilidade_ids: toUuidArray(c.habilidadeIds) as never,
  };
}

// Top-up: insere linhas do seed que ainda não existem no banco. Evita o
// problema do seed-if-empty, que só rodava com tabela 100% vazia — se um
// chunk do primeiro seed falhasse, as linhas perdidas nunca seriam
// recuperadas. Agora cada load converge para o seed.
//
// Importante: ignoramos linhas cujo `cod` JÁ existe no banco (mesmo com
// `id` diferente). Sem isso, o upsert com onConflict:"id" tropeçava no
// UNIQUE de `cod` e gerava 409 a cada page-load. O caso surge quando o
// UUID determinístico mudou entre deploys ou quando o registro foi
// semeado por outro caminho.
async function topUpCursos(existingIds: Set<string>, existingCods: Set<string>) {
  const missing = SEED_CURSOS.filter(
    (c) => !existingIds.has(toUuid(c.id)) && !existingCods.has(c.cod),
  );
  if (missing.length === 0) return false;
  const rows = missing.map(cursoToRow);
  const { error } = await supabase
    .from("cursos")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("[cursos] top-up error", error);
    return false;
  }
  devInfo(`[cursos] top-up: +${missing.length} linhas do seed`);
  return true;
}

// Semeia public.grupos a partir de SEED_GRUPOS. Usa lookup por curso.cod
// (chave canônica) pra não depender de UUIDs determinísticos.
async function topUpGrupos(cursosNoBanco: Curso[]) {
  const expectedRows: { id: string; curso_id: string; cod: string; nome: string }[] = [];
  for (const curso of cursosNoBanco) {
    const gruposDoCurso = SEED_GRUPOS[curso.cod] ?? SEED_GRUPOS[curso.id] ?? [];
    for (const g of gruposDoCurso) {
      expectedRows.push({
        id: toUuid(`grupo-${curso.cod}-${g.cod}`),
        curso_id: curso.id,
        cod: g.cod,
        nome: g.nome,
      });
    }
  }
  if (expectedRows.length === 0) return;

  // Descobre quais já existem.
  const { data: existing, error: selErr } = await supabase.from("grupos").select("id");
  if (selErr) {
    console.error("[grupos] select error", selErr);
    return;
  }
  const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));
  const missing = expectedRows.filter((r) => !existingIds.has(r.id));
  if (missing.length === 0) return;

  const { error } = await supabase
    .from("grupos")
    .upsert(missing, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("[grupos] top-up error", error);
    return;
  }
  devInfo(`[grupos] top-up: +${missing.length} linhas do seed`);
}

async function loadFromDb() {
  const { data, error } = await supabase.from("cursos").select("*").order("cod");
  if (error) {
    console.error("[cursos] load error", error);
    cursos = [...SEED_CURSOS];
    return;
  }
  const rows = (data ?? []) as CursoRow[];
  const existingIds = new Set(rows.map((r) => r.id));
  const existingCods = new Set(rows.map((r) => r.cod));
  const inserted = await topUpCursos(existingIds, existingCods);
  if (inserted) {
    const { data: data2 } = await supabase.from("cursos").select("*").order("cod");
    cursos = (data2 ?? []).map(rowToCurso);
  } else {
    cursos = rows.map(rowToCurso);
  }
  // Top-up de grupos depende dos cursos já carregados (precisa do curso.id
  // real do banco, que pode ser UUID arbitrário).
  await topUpGrupos(cursos);
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

export const cursosStore = {
  getAll(): Curso[] {
    return cursos;
  },
  async upsert(c: Curso) {
    const row = cursoToRow(c);
    const local: Curso = { ...c, id: row.id };
    const exists = cursos.some((x) => x.id === local.id);
    cursos = exists ? cursos.map((x) => (x.id === local.id ? local : x)) : [...cursos, local];
    emit();
    const { error } = await supabase.from("cursos").upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[cursos] upsert error", error);
      toast.error(`Erro ao salvar curso: ${error.message}`);
    }
  },
  update(id: string, patch: Partial<Curso>) {
    const dbId = toUuid(id);
    const current = cursos.find((x) => x.id === dbId || x.id === id);
    if (!current) return;
    void this.upsert({ ...current, ...patch, id: dbId });
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    cursos = cursos.filter((x) => x.id !== dbId && x.id !== id);
    emit();
    const { error } = await supabase.from("cursos").delete().eq("id", dbId);
    if (error) {
      console.error("[cursos] remove error", error);
      toast.error(`Erro ao remover curso: ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useCursos(): Curso[] {
  const [snap, setSnap] = useState<Curso[]>(cursosStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = cursosStore.subscribe(() => setSnap([...cursosStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
