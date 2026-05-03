// Singleton store de Tags de Comportamento.
// Tags são exibidas no ChecklistAlunoDialog e gerenciadas no TagsManagerDialog.
// Fonte de verdade: tabela `public.comportamento_tags` no Supabase.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { devInfo } from "./dev-log";

// -----------------------------------------------------------------------
// Tipo público
// -----------------------------------------------------------------------
export interface ComportamentoTagEntry {
  id: string;
  value: string;      // slug persistido em avaliacoes.dados (ex.: "participativo")
  label: string;      // rótulo da UI (pode ser renomeado sem quebrar histórico)
  emoji: string;
  tom: "pos" | "neg"; // positivo (verde) ou negativo (âmbar)
  ordem: number;
  ativo: boolean;
  descricao: string | null; // explicação livre da tag, exibida na UI
}

// -----------------------------------------------------------------------
// Tipo de linha do banco
// -----------------------------------------------------------------------
type TagRow = {
  id: string;
  value: string;
  label: string;
  emoji: string;
  tom: string;
  ordem: number;
  ativo: boolean;
  descricao: string | null;
};

// -----------------------------------------------------------------------
// Converters
// -----------------------------------------------------------------------
function rowToEntry(r: TagRow): ComportamentoTagEntry {
  return {
    id: r.id,
    value: r.value,
    label: r.label,
    emoji: r.emoji,
    tom: r.tom === "neg" ? "neg" : "pos",
    ordem: r.ordem,
    ativo: r.ativo,
    descricao: r.descricao ?? null,
  };
}

function entryToRow(e: ComportamentoTagEntry): Omit<TagRow, never> {
  return {
    id: e.id,
    value: e.value,
    label: e.label,
    emoji: e.emoji,
    tom: e.tom,
    ordem: e.ordem,
    ativo: e.ativo,
    descricao: e.descricao,
  };
}

// -----------------------------------------------------------------------
// Seed — espelha as tags hardcoded originais de formularios-types.ts.
// O store insere as que faltarem no primeiro load (top-up idempotente).
// -----------------------------------------------------------------------
const SEED_TAGS: Omit<ComportamentoTagEntry, "id" | "ativo">[] = [
  { value: "participativo", label: "Participativo", emoji: "🙋", tom: "pos", ordem:  1, descricao: "" },
  { value: "colaborativo",  label: "Colaborativo",  emoji: "🤝", tom: "pos", ordem:  2, descricao: "" },
  { value: "concentrado",   label: "Concentrado",   emoji: "🎯", tom: "pos", ordem:  3, descricao: "" },
  { value: "criativo",      label: "Criativo",      emoji: "💡", tom: "pos", ordem:  4, descricao: "" },
  { value: "lider",         label: "Liderança",     emoji: "⭐", tom: "pos", ordem:  5, descricao: "" },
  { value: "disperso",      label: "Disperso",      emoji: "🌀", tom: "neg", ordem:  6, descricao: "" },
  { value: "agitado",       label: "Agitado",       emoji: "⚡", tom: "neg", ordem:  7, descricao: "" },
  { value: "tímido",        label: "Tímido",        emoji: "🙊", tom: "neg", ordem:  8, descricao: "" },
  { value: "ausente",       label: "Apático",       emoji: "😶", tom: "neg", ordem:  9, descricao: "" },
  { value: "frustrado",     label: "Frustrado",     emoji: "😤", tom: "neg", ordem: 10, descricao: "" },
];

// -----------------------------------------------------------------------
// Estado singleton
// -----------------------------------------------------------------------
let tags: ComportamentoTagEntry[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// -----------------------------------------------------------------------
// Top-up: insere as tags do seed que ainda não existem no banco.
// Usa `value` como chave natural (UNIQUE) — não depende de UUIDs fixos.
// -----------------------------------------------------------------------
async function topUpSeed(existingValues: Set<string>) {
  const missing = SEED_TAGS.filter((t) => !existingValues.has(t.value));
  if (missing.length === 0) return false;
  const rows = missing.map((t) => ({
    value: t.value,
    label: t.label,
    emoji: t.emoji,
    tom: t.tom,
    ordem: t.ordem,
    ativo: true,
  }));
  const { error } = await supabase
    .from("comportamento_tags")
    .upsert(rows, { onConflict: "value", ignoreDuplicates: true });
  if (error) {
    console.error("[comportamento-tags] top-up error", error);
    return false;
  }
  devInfo(`[comportamento-tags] top-up: +${missing.length} tags do seed`);
  return true;
}

// -----------------------------------------------------------------------
// Carrega todas as tags do banco, ordena por `ordem`.
// -----------------------------------------------------------------------
async function loadFromDb() {
  const { data, error } = await supabase
    .from("comportamento_tags")
    .select("*")
    .order("ordem");
  if (error) {
    console.error("[comportamento-tags] load error", error);
    tags = [];
    return;
  }
  const rows = (data ?? []) as unknown as TagRow[];
  const existingValues = new Set(rows.map((r) => r.value));
  const inserted = await topUpSeed(existingValues);
  if (inserted) {
    const { data: data2 } = await supabase
      .from("comportamento_tags")
      .select("*")
      .order("ordem");
    tags = ((data2 ?? []) as unknown as TagRow[]).map(rowToEntry);
  } else {
    tags = rows.map(rowToEntry);
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

// -----------------------------------------------------------------------
// Store público
// -----------------------------------------------------------------------
export const comportamentoTagsStore = {
  getAll(): ComportamentoTagEntry[] {
    return tags;
  },

  /** Retorna apenas as tags ativas (usadas no checklist). */
  getAtivas(): ComportamentoTagEntry[] {
    return tags.filter((t) => t.ativo);
  },

  async upsert(entry: ComportamentoTagEntry) {
    const row = entryToRow(entry);
    const exists = tags.some((x) => x.id === entry.id);
    tags = exists
      ? tags.map((x) => (x.id === entry.id ? entry : x))
      : [...tags, entry].sort((a, b) => a.ordem - b.ordem);
    emit();
    const { error } = await supabase
      .from("comportamento_tags")
      .upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[comportamento-tags] upsert error", error);
      toast.error(`Erro ao salvar tag: ${error.message}`);
    }
  },

  async remove(id: string) {
    tags = tags.filter((x) => x.id !== id);
    emit();
    const { error } = await supabase
      .from("comportamento_tags")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[comportamento-tags] remove error", error);
      toast.error(`Erro ao remover tag: ${error.message}`);
    }
  },

  /** Alterna o campo `ativo` sem apagar a tag (preserva dados históricos). */
  async toggleAtivo(id: string) {
    const tag = tags.find((t) => t.id === id);
    if (!tag) return;
    await comportamentoTagsStore.upsert({ ...tag, ativo: !tag.ativo });
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  ensureInit,
};

// -----------------------------------------------------------------------
// Hook React
// -----------------------------------------------------------------------
export function useComportamentoTags(): ComportamentoTagEntry[] {
  const [snap, setSnap] = useState<ComportamentoTagEntry[]>(
    comportamentoTagsStore.getAll(),
  );
  useEffect(() => {
    void ensureInit();
    const unsub = comportamentoTagsStore.subscribe(() =>
      setSnap([...comportamentoTagsStore.getAll()]),
    );
    return unsub;
  }, []);
  return snap;
}
