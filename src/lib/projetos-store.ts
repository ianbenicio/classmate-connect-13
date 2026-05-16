// =====================================================================
// projetos-store — Tenant manager (Fase J.4)
// =====================================================================
// CRUD da tabela `projetos`. RLS server-side:
//   - SELECT: super_admin lê tudo; outros só o próprio projeto
//   - ALL writes: apenas super_admin

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProjetoRow {
  id: string;
  slug: string;
  nome: string;
  logoUrl?: string | null;
  corPrimaria?: string | null;
  criadoEm: string;
}

type Row = {
  id: string;
  slug: string;
  nome: string;
  logo_url: string | null;
  cor_primaria: string | null;
  criado_em: string;
};

function rowTo(r: Row): ProjetoRow {
  return {
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    logoUrl: r.logo_url,
    corPrimaria: r.cor_primaria,
    criadoEm: r.criado_em,
  };
}

let projetos: ProjetoRow[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadFromDb() {
  const { data, error } = await supabase.from("projetos").select("*").order("nome");
  if (error) {
    if (error.code !== "PGRST301" && error.code !== "42501") {
      console.error("[projetos] load error", error);
    }
    projetos = [];
    return;
  }
  projetos = ((data ?? []) as unknown as Row[]).map(rowTo);
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

export const projetosStore = {
  getAll(): ProjetoRow[] {
    return projetos;
  },
  /** Cria projeto novo. Slug deve ser kebab-case unique. */
  async create(input: Omit<ProjetoRow, "id" | "criadoEm">): Promise<ProjetoRow | null> {
    const { data, error } = await supabase
      .from("projetos")
      .insert({
        slug: input.slug.trim().toLowerCase(),
        nome: input.nome.trim(),
        logo_url: input.logoUrl ?? null,
        cor_primaria: input.corPrimaria ?? null,
      })
      .select()
      .maybeSingle();
    if (error) {
      console.error("[projetos] create error", error);
      toast.error(`Erro ao criar projeto: ${error.message}`);
      return null;
    }
    if (!data) return null;
    const novo = rowTo(data as unknown as Row);
    projetos = [...projetos, novo].sort((a, b) => a.nome.localeCompare(b.nome));
    emit();
    return novo;
  },
  /** Atualiza nome/cor/logo. Slug fica imutável (estabilidade de URLs). */
  async update(
    id: string,
    patch: Partial<Pick<ProjetoRow, "nome" | "logoUrl" | "corPrimaria">>,
  ): Promise<void> {
    const dbPatch: Record<string, unknown> = {};
    if (patch.nome !== undefined) dbPatch.nome = patch.nome.trim();
    if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl;
    if (patch.corPrimaria !== undefined) dbPatch.cor_primaria = patch.corPrimaria;
    if (Object.keys(dbPatch).length === 0) return;

    const snap = projetos;
    projetos = projetos.map((p) =>
      p.id === id
        ? {
            ...p,
            ...(patch.nome !== undefined ? { nome: patch.nome } : {}),
            ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
            ...(patch.corPrimaria !== undefined ? { corPrimaria: patch.corPrimaria } : {}),
          }
        : p,
    );
    emit();
    const { error } = await supabase.from("projetos").update(dbPatch).eq("id", id);
    if (error) {
      projetos = snap;
      emit();
      console.error("[projetos] update error", error);
      toast.error(`Erro ao atualizar projeto: ${error.message}`);
    }
  },
  /** Deleta. FK ON DELETE bloqueia se houver rows escopadas. */
  async remove(id: string): Promise<void> {
    const snap = projetos;
    projetos = projetos.filter((p) => p.id !== id);
    emit();
    const { error } = await supabase.from("projetos").delete().eq("id", id);
    if (error) {
      projetos = snap;
      emit();
      console.error("[projetos] remove error", error);
      toast.error(`Não foi possível remover (existem dados vinculados): ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useProjetos(): ProjetoRow[] {
  const [snapshot, setSnapshot] = useState(projetosStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = projetosStore.subscribe(() => setSnapshot([...projetosStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snapshot;
}
