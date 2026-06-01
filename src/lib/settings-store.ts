// =====================================================================
// settings-store — Configurações dinâmicas do sistema (Fase G)
// =====================================================================
// Usa createStoreBase para eliminar boilerplate.
// Tabela: system_settings (key text PK, value jsonb, ...)

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createStoreBase } from "./store-base";
import { toast } from "sonner";

export type SettingInputType = "text" | "number" | "boolean" | "url" | "json" | "color";

export interface Setting {
  key: string;
  value: unknown;
  category: string;
  label: string;
  description?: string;
  inputType: SettingInputType;
  updatedAt: string;
}

type Row = {
  key: string;
  value: unknown;
  category: string;
  label: string;
  description: string | null;
  input_type: SettingInputType;
  updated_at: string;
};

function rowTo(r: Row): Setting {
  return {
    key: r.key,
    value: r.value,
    category: r.category,
    label: r.label,
    description: r.description ?? undefined,
    inputType: r.input_type,
    updatedAt: r.updated_at,
  };
}

// ── Base ─────────────────────────────────────────────────────────────

const base = createStoreBase<Setting[]>(async (set) => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .order("category")
    .order("key");
  if (error) {
    if (error.code !== "PGRST301" && error.code !== "42501") {
      console.error("[settings] load error", error);
    }
    set([]);
    return;
  }
  set(((data ?? []) as unknown as Row[]).map(rowTo));
}, []);

// ── Public store ─────────────────────────────────────────────────────

export const settingsStore = {
  getAll(): Setting[] {
    return base.get();
  },
  /** Lookup sync após init. Devolve fallback se key não existe. */
  get<T>(key: string, fallback: T): T {
    const s = base.get().find((x) => x.key === key);
    if (!s) return fallback;
    return s.value as T;
  },
  /** Lista settings de uma categoria (para render da UI). */
  byCategory(category: string): Setting[] {
    return base.get().filter((s) => s.category === category);
  },
  /** Lista categorias distintas em ordem alfabética. */
  categories(): string[] {
    return Array.from(new Set(base.get().map((s) => s.category))).sort();
  },
  async set(key: string, value: unknown): Promise<void> {
    const snap = base.get();
    base.set(snap.map((s) =>
      s.key === key ? { ...s, value, updatedAt: new Date().toISOString() } : s,
    ));
    base.emit();

    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("system_settings")
      .update({
        value: value as never,
        updated_by: authData?.user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key);
    if (error) {
      base.set(snap);
      base.emit();
      console.error("[settings] set error", error);
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    }
  },
  subscribe: base.subscribe.bind(base),
  ensureInit: base.ensureInit.bind(base),
};

export function useSettings(): Setting[] {
  const [snapshot, setSnapshot] = useState(settingsStore.getAll());
  useEffect(() => {
    void base.ensureInit();
    const unsub = base.subscribe(() => setSnapshot([...base.get()]));
    return () => {
      unsub();
    };
  }, []);
  return snapshot;
}

/** Hook reativo para uma setting específica. */
export function useSetting<T>(key: string, fallback: T): T {
  const all = useSettings();
  const s = all.find((x) => x.key === key);
  return s ? (s.value as T) : fallback;
}
