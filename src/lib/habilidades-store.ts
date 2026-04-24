// Singleton store de Habilidades — entidades independentes.
// O campo `tipo` ('curso' | 'atividade') é apenas classificação visual.
// As habilidades são associadas a cursos via `cursos.habilidade_ids` e
// a atividades via `atividades.habilidade_ids` (relação N-N).
import { useEffect, useState } from "react";
import type { Habilidade, HabilidadeTipo } from "./academic-types";
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
};

function rowToHabilidade(r: HabilidadeRow): Habilidade {
  return {
    id: r.id,
    sigla: r.sigla,
    descricao: r.descricao,
    grupo: r.grupo ?? undefined,
    tipo: (r.tipo as HabilidadeTipo) ?? "curso",
  };
}

function habilidadeToRow(h: Habilidade) {
  return {
    id: toUuid(h.id),
    sigla: h.sigla,
    descricao: h.descricao,
    grupo: h.grupo ?? null,
    tipo: (h.tipo ?? "curso") as string,
  };
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("habilidades")
    .select("*")
    .order("sigla");
  if (error) {
    console.error("[habilidades] load error", error);
    habilidades = [];
    return;
  }
  habilidades = ((data ?? []) as unknown as HabilidadeRow[]).map(rowToHabilidade);
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
  byTipo(tipo: HabilidadeTipo): Habilidade[] {
    return habilidades.filter((h) => (h.tipo ?? "curso") === tipo);
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
