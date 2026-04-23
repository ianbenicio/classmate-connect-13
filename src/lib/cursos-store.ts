// Singleton store de Cursos com persistência no Supabase.
// - Carrega do banco no primeiro uso (useCursos chama ensureInit).
// - Se a tabela estiver vazia, semeia com SEED_CURSOS.
// - upsert/remove gravam no banco e atualizam cache + listeners.
import { useEffect, useState } from "react";
import type { Curso } from "./academic-types";
import { SEED_CURSOS } from "./academic-seed";
import { supabase } from "@/integrations/supabase/client";
import { toUuid } from "./db-mapping";
import { toast } from "sonner";

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
  };
}

async function seedIfEmpty() {
  const rows = SEED_CURSOS.map(cursoToRow);
  const { error } = await supabase.from("cursos").upsert(rows, { onConflict: "id" });
  if (error) console.error("[cursos] seed error", error);
}

async function loadFromDb() {
  const { data, error } = await supabase.from("cursos").select("*").order("cod");
  if (error) {
    console.error("[cursos] load error", error);
    cursos = [...SEED_CURSOS];
    return;
  }
  if (!data || data.length === 0) {
    await seedIfEmpty();
    const { data: data2 } = await supabase.from("cursos").select("*").order("cod");
    cursos = (data2 ?? []).map(rowToCurso);
  } else {
    cursos = data.map(rowToCurso);
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
    cursos = exists
      ? cursos.map((x) => (x.id === local.id ? local : x))
      : [...cursos, local];
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
