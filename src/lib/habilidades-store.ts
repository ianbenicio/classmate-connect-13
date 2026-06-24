// Singleton store de Habilidades — entidades independentes.
// Habilidades são associadas a cursos via `cursos.habilidade_ids` e a
// atividades via `atividades.habilidade_ids` (relação N-N).
// Usa createStoreBase para eliminar boilerplate.
import { useEffect, useState } from "react";
import type { Habilidade } from "./academic-types";
import { supabase } from "@/integrations/supabase/client";
import { requireProjectIdForWrite } from "./current-project";
import { createStoreBase } from "./store-base";
import { toast } from "sonner";

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

async function loadFromDb(): Promise<Habilidade[]> {
  const { data, error } = await supabase.from("habilidades").select("*").order("sigla");
  if (error) {
    console.error("[habilidades] load error", error);
    return [];
  }
  const rows = (data ?? []) as unknown as HabilidadeRow[];
  return rows.map(rowToHabilidade);
}

// ── Base ─────────────────────────────────────────────────────────────

const base = createStoreBase<Habilidade[]>(async (set) => {
  set(await loadFromDb());
}, []);

// ── Public store ─────────────────────────────────────────────────────

export const habilidadesStore = {
  getAll(): Habilidade[] {
    return base.get();
  },
  async upsert(h: Habilidade) {
    // IDs runtime já são UUIDs — construir row direto, sem toUuid.
    const row = {
      id: h.id,
      sigla: h.sigla,
      nome: h.nome?.trim() ? h.nome.trim() : null,
      descricao: h.descricao,
      grupo: h.grupo ?? null,
      tipo: "curso" as string,
      project_id: requireProjectIdForWrite() ?? undefined,
    };
    const local: Habilidade = { ...h };
    const all = base.get();
    const exists = all.some((x) => x.id === h.id);
    const snap = all;
    base.set(exists ? all.map((x) => (x.id === h.id ? local : x)) : [...all, local]);
    base.emit();
    const { error } = await supabase.from("habilidades").upsert(row, { onConflict: "id" });
    if (error) {
      base.set(snap);
      base.emit();
      console.error("[habilidades] upsert error", error);
      toast.error(`Erro ao salvar habilidade: ${error.message}`);
    }
  },
  async remove(id: string) {
    // IDs runtime já são UUIDs — usar direto.
    const snap = base.get();
    base.set(snap.filter((x) => x.id !== id));
    base.emit();
    const { error } = await supabase.from("habilidades").delete().eq("id", id);
    if (error) {
      base.set(snap);
      base.emit();
      console.error("[habilidades] remove error", error);
      toast.error(`Erro ao remover habilidade: ${error.message}`);
    }
  },
  subscribe: base.subscribe.bind(base),
  ensureInit: base.ensureInit.bind(base),
};

export function useHabilidades(): Habilidade[] {
  const [snap, setSnap] = useState<Habilidade[]>(habilidadesStore.getAll());
  useEffect(() => {
    void base.ensureInit();
    const unsub = base.subscribe(() => setSnap([...base.get()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
