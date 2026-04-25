// Singleton store de Habilidades — entidades independentes.
// Habilidades são associadas a cursos via `cursos.habilidade_ids` e a
// atividades via `atividades.habilidade_ids` (relação N-N).
import { useEffect, useState } from "react";
import type { Habilidade } from "./academic-types";
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
  nome: string | null;
  descricao: string;
  grupo: string | null;
};

function rowToHabilidade(r: HabilidadeRow): Habilidade {
  return {
    id: r.id,
    sigla: r.sigla,
    nome: r.nome ?? undefined,
    descricao: r.descricao,
    grupo: r.grupo ?? undefined,
  };
}

function habilidadeToRow(h: Habilidade) {
  return {
    id: toUuid(h.id),
    sigla: h.sigla,
    nome: h.nome?.trim() ? h.nome.trim() : null,
    descricao: h.descricao,
    grupo: h.grupo ?? null,
    // coluna `tipo` ainda existe no DB (NOT NULL com default) — mandamos
    // valor neutro pra satisfazer o schema sem expor isso na UI.
    tipo: "curso" as string,
  };
}

// Top-up: insere as habilidades do seed que ainda não existem no banco.
// O store antes só lia do DB, então se a tabela estivesse vazia ficaria
// vazia pra sempre — agora converge para SEED_HABILIDADES em cada load.
async function topUpHabilidades(existingIds: Set<string>) {
  const missing = SEED_HABILIDADES.filter((h) => !existingIds.has(toUuid(h.id)));
  if (missing.length === 0) return false;
  const rows = missing.map(habilidadeToRow);
  const { error } = await supabase
    .from("habilidades")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    console.error("[habilidades] top-up error", error);
    return false;
  }
  console.info(`[habilidades] top-up: +${missing.length} linhas do seed`);
  return true;
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
  const rows = (data ?? []) as unknown as HabilidadeRow[];
  const existingIds = new Set(rows.map((r) => r.id));
  const inserted = await topUpHabilidades(existingIds);
  if (inserted) {
    const { data: data2 } = await supabase
      .from("habilidades")
      .select("*")
      .order("sigla");
    habilidades = ((data2 ?? []) as unknown as HabilidadeRow[]).map(rowToHabilidade);
  } else {
    habilidades = rows.map(rowToHabilidade);
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
