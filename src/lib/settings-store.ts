// =====================================================================
// settings-store — Configurações dinâmicas do sistema (Fase G)
// =====================================================================
// Single source of truth para variáveis do sistema editadas pela
// coordenação via SettingsDialog. Substitui constantes hardcoded.
//
// Tabela: system_settings (key text PK, value jsonb, ...)
// RLS: staff lê, admin/coord escreve.
//
// USO:
//   const pattern = useSetting("integration.drive.tarefas_folder_pattern", "");
//   await settingsStore.set(key, newValue);

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

let settings: Setting[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .order("category")
    .order("key");
  if (error) {
    if (error.code !== "PGRST301" && error.code !== "42501") {
      console.error("[settings] load error", error);
    }
    settings = [];
    return;
  }
  settings = ((data ?? []) as unknown as Row[]).map(rowTo);
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

export const settingsStore = {
  getAll(): Setting[] {
    return settings;
  },
  /** Lookup sync após init. Devolve fallback se key não existe. */
  get<T>(key: string, fallback: T): T {
    const s = settings.find((x) => x.key === key);
    if (!s) return fallback;
    return s.value as T;
  },
  /** Lista settings de uma categoria (para render da UI). */
  byCategory(category: string): Setting[] {
    return settings.filter((s) => s.category === category);
  },
  /** Lista categorias distintas em ordem alfabética. */
  categories(): string[] {
    return Array.from(new Set(settings.map((s) => s.category))).sort();
  },
  /**
   * Atualiza valor. Optimistic + revert em erro.
   * `value` é serializado como jsonb pelo Supabase.
   */
  async set(key: string, value: unknown): Promise<void> {
    const snap = settings;
    settings = settings.map((s) =>
      s.key === key ? { ...s, value, updatedAt: new Date().toISOString() } : s,
    );
    emit();

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
      settings = snap;
      emit();
      console.error("[settings] set error", error);
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useSettings(): Setting[] {
  const [snapshot, setSnapshot] = useState(settingsStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = settingsStore.subscribe(() => setSnapshot([...settingsStore.getAll()]));
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
