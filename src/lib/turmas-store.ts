// Singleton store de Turmas com persistência no Supabase.
import { useEffect, useState } from "react";
import type { HorarioSlot, Turma } from "./academic-types";
import { SEED_TURMAS } from "./academic-seed";
import { supabase } from "@/integrations/supabase/client";
import { toUuid } from "./db-mapping";
import { toast } from "sonner";
import { alunosStore } from "./alunos-store";
import { devInfo } from "./dev-log";

let turmas: Turma[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type TurmaRow = {
  id: string;
  curso_id: string;
  nome: string;
  cod: string;
  data: string;
  horarios: unknown;
  descricao: string | null;
};

function alunosIdsForTurma(turmaUuid: string): string[] {
  return alunosStore
    .getAll()
    .filter((a) => a.turmaId === turmaUuid)
    .map((a) => a.id);
}

function rowToTurma(r: TurmaRow): Turma {
  return {
    id: r.id,
    cursoId: r.curso_id,
    nome: r.nome,
    cod: r.cod,
    data: r.data,
    horarios: (Array.isArray(r.horarios) ? r.horarios : []) as HorarioSlot[],
    alunosIds: alunosIdsForTurma(r.id),
    descricao: r.descricao ?? undefined,
  };
}

function turmaToRow(t: Turma) {
  return {
    id: toUuid(t.id),
    curso_id: toUuid(t.cursoId),
    nome: t.nome,
    cod: t.cod,
    data: t.data,
    horarios: t.horarios as never,
    descricao: t.descricao ?? null,
  };
}

// Top-up: insere apenas linhas do seed que ainda não existem no banco.
// Substitui o seed-if-empty antigo, que ficava inerte se o primeiro seed
// falhasse parcialmente.
//
// Filtros adicionais para evitar erros recorrentes no console:
// - `cod` é UNIQUE — sem checar isso o upsert tropeçava quando o UUID do
//   seed mudava entre deploys.
// - `curso_id` é FK NOT NULL — se o curso pai ainda não existe, o INSERT
//   quebra com 23503. Pulamos a turma órfã em vez de derrubar o batch.
async function topUpTurmas(existingIds: Set<string>, existingCods: Set<string>) {
  const { data: cursoRows } = await supabase.from("cursos").select("id");
  const validCursoIds = new Set((cursoRows ?? []).map((r: { id: string }) => r.id));

  const missing = SEED_TURMAS.filter(
    (t) =>
      !existingIds.has(toUuid(t.id)) &&
      !existingCods.has(t.cod) &&
      validCursoIds.has(toUuid(t.cursoId)),
  );
  if (missing.length === 0) return false;
  const rows = missing.map(turmaToRow);
  const { error } = await supabase
    .from("turmas")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("[turmas] top-up error", error);
    return false;
  }
  devInfo(`[turmas] top-up: +${missing.length} linhas do seed`);
  return true;
}

async function loadFromDb() {
  const { data, error } = await supabase.from("turmas").select("*").order("cod");
  if (error) {
    console.error("[turmas] load error", error);
    turmas = [...SEED_TURMAS];
    return;
  }
  const rows = (data ?? []) as TurmaRow[];
  const existingIds = new Set(rows.map((r) => r.id));
  const existingCods = new Set(rows.map((r) => r.cod));
  const inserted = await topUpTurmas(existingIds, existingCods);
  if (inserted) {
    const { data: data2 } = await supabase.from("turmas").select("*").order("cod");
    turmas = (data2 ?? []).map(rowToTurma);
  } else {
    turmas = rows.map(rowToTurma);
  }
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
      // Recalcula alunosIds de cada turma sempre que alunos mudarem.
      alunosStore.subscribe(() => {
        turmas = turmas.map((t) => ({ ...t, alunosIds: alunosIdsForTurma(t.id) }));
        emit();
      });
      emit();
    });
  }
  return initPromise;
}

export const turmasStore = {
  getAll(): Turma[] {
    return turmas;
  },
  async upsert(t: Turma) {
    const row = turmaToRow(t);
    const local: Turma = { ...t, id: row.id, cursoId: row.curso_id };
    const exists = turmas.some((x) => x.id === local.id);
    turmas = exists ? turmas.map((x) => (x.id === local.id ? local : x)) : [...turmas, local];
    emit();
    const { error } = await supabase.from("turmas").upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[turmas] upsert error", error);
      toast.error(`Erro ao salvar turma: ${error.message}`);
    }
  },
  update(id: string, patch: Partial<Turma>) {
    const dbId = toUuid(id);
    const current = turmas.find((x) => x.id === dbId || x.id === id);
    if (!current) return;
    void this.upsert({ ...current, ...patch, id: dbId });
  },
  setMany(next: Turma[]) {
    // Apenas em memória — operação em massa não persiste.
    turmas = next;
    emit();
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    turmas = turmas.filter((x) => x.id !== dbId && x.id !== id);
    emit();
    const { error } = await supabase.from("turmas").delete().eq("id", dbId);
    if (error) {
      console.error("[turmas] remove error", error);
      toast.error(`Erro ao remover turma: ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useTurmas(): Turma[] {
  const [snap, setSnap] = useState<Turma[]>(turmasStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = turmasStore.subscribe(() => setSnap([...turmasStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
