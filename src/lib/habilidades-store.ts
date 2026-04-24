// Singleton store de Habilidades com persistência no Supabase.
// - Carrega do banco no primeiro uso (ensureInit).
// - Se a tabela estiver vazia, semeia com SEED_HABILIDADES.
// - upsert/remove gravam no banco e atualizam cache + listeners.
import { useEffect, useState } from "react";
import type { Habilidade, HabilidadeTipo } from "./academic-types";
import { SEED_HABILIDADES } from "./academic-seed";
import { supabase } from "@/integrations/supabase/client";
import { toUuid } from "./db-mapping";
import { toast } from "sonner";

let habilidades: Habilidade[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type HabilidadeRow = {
  id: string;
  sigla: string;
  descricao: string;
  grupo: string | null;
  tipo: string;
  curso_id: string | null;
  atividade_id: string | null;
};

function rowToHabilidade(r: HabilidadeRow): Habilidade {
  return {
    id: r.id,
    sigla: r.sigla,
    descricao: r.descricao,
    grupo: r.grupo ?? undefined,
    tipo: (r.tipo as HabilidadeTipo) ?? "geral",
    cursoId: r.curso_id ?? undefined,
    atividadeId: r.atividade_id ?? undefined,
  };
}

function habilidadeToRow(h: Habilidade) {
  const tipo: HabilidadeTipo = h.tipo ?? "geral";
  return {
    id: toUuid(h.id),
    sigla: h.sigla,
    descricao: h.descricao,
    grupo: h.grupo ?? null,
    tipo,
    curso_id: tipo === "geral" && h.cursoId ? toUuid(h.cursoId) : null,
    atividade_id:
      tipo === "especifica" && h.atividadeId ? toUuid(h.atividadeId) : null,
  };
}

async function seedIfEmpty() {
  // Só semeia se houver pelo menos 1 curso (regra do trigger exige curso_id em geral).
  const { data: cursos } = await supabase.from("cursos").select("id").limit(1);
  if (!cursos || cursos.length === 0) return;
  const cursoId = cursos[0].id;
  const rows = SEED_HABILIDADES.map((h) =>
    habilidadeToRow({ ...h, tipo: "geral", cursoId }),
  );
  const { error } = await supabase
    .from("habilidades")
    .upsert(rows, { onConflict: "id" });
  if (error) console.error("[habilidades] seed error", error);
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("habilidades")
    .select("*")
    .order("sigla");
  if (error) {
    console.error("[habilidades] load error", error);
    habilidades = [...SEED_HABILIDADES];
    return;
  }
  if (!data || data.length === 0) {
    await seedIfEmpty();
    const { data: data2 } = await supabase
      .from("habilidades")
      .select("*")
      .order("sigla");
    habilidades = ((data2 ?? []) as HabilidadeRow[]).map(rowToHabilidade);
  } else {
    habilidades = (data as HabilidadeRow[]).map(rowToHabilidade);
  }
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

export const habilidadesStore = {
  getAll(): Habilidade[] {
    return habilidades;
  },
  byCurso(cursoId: string): Habilidade[] {
    const id = toUuid(cursoId);
    return habilidades.filter(
      (h) => h.tipo === "geral" && (h.cursoId === id || h.cursoId === cursoId),
    );
  },
  byAtividade(atividadeId: string): Habilidade[] {
    const id = toUuid(atividadeId);
    return habilidades.filter(
      (h) =>
        h.tipo === "especifica" &&
        (h.atividadeId === id || h.atividadeId === atividadeId),
    );
  },
  async upsert(h: Habilidade) {
    const row = habilidadeToRow(h);
    const local: Habilidade = { ...h, id: row.id };
    const exists = habilidades.some((x) => x.id === local.id);
    habilidades = exists
      ? habilidades.map((x) => (x.id === local.id ? local : x))
      : [...habilidades, local];
    emit();
    const { error } = await supabase
      .from("habilidades")
      .upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[habilidades] upsert error", error);
      toast.error(`Erro ao salvar habilidade: ${error.message}`);
    }
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    habilidades = habilidades.filter((x) => x.id !== dbId && x.id !== id);
    emit();
    const { error } = await supabase.from("habilidades").delete().eq("id", dbId);
    if (error) {
      console.error("[habilidades] remove error", error);
      toast.error(`Erro ao remover habilidade: ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useHabilidades(): Habilidade[] {
  const [snap, setSnap] = useState<Habilidade[]>(habilidadesStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = habilidadesStore.subscribe(() =>
      setSnap([...habilidadesStore.getAll()]),
    );
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
