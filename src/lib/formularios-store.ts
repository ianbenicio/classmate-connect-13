// Store de templates de Formulários (tabela `formularios`).
// Templates reutilizáveis usados para gerar tarefas de avaliação por aula.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FormularioDestinatario = "professor" | "aluno";

export interface FormularioTemplate {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  destinatario: FormularioDestinatario;
  estrutura: Record<string, unknown>;
  isSystem: boolean;
  criadoPorUserId: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

type Row = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  destinatario: string;
  estrutura: unknown;
  is_system: boolean;
  criado_por_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowTo(r: Row): FormularioTemplate {
  return {
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    descricao: r.descricao,
    destinatario: (r.destinatario as FormularioDestinatario) ?? "professor",
    estrutura: (r.estrutura ?? {}) as Record<string, unknown>,
    isSystem: !!r.is_system,
    criadoPorUserId: r.criado_por_user_id,
    criadoEm: r.created_at,
    atualizadoEm: r.updated_at,
  };
}

let registros: FormularioTemplate[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("formularios")
    .select("*")
    .order("nome", { ascending: true });
  if (error) {
    console.error("[formularios] load error", error);
    return;
  }
  registros = (data as Row[] | null ?? []).map(rowTo);
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export const formulariosStore = {
  getAll(): FormularioTemplate[] {
    return registros;
  },
  bySlug(slug: string): FormularioTemplate | undefined {
    return registros.find((f) => f.slug === slug);
  },
  byId(id: string): FormularioTemplate | undefined {
    return registros.find((f) => f.id === id);
  },

  async create(input: {
    nome: string;
    descricao?: string;
    destinatario: FormularioDestinatario;
    estrutura?: Record<string, unknown>;
    slug?: string;
  }): Promise<FormularioTemplate | null> {
    const slug = (input.slug?.trim() || slugify(input.nome)) || `form_${Date.now()}`;
    const row = {
      slug,
      nome: input.nome.trim(),
      descricao: input.descricao?.trim() || null,
      destinatario: input.destinatario,
      estrutura: (input.estrutura ?? { blocos: [] }) as never,
      is_system: false,
    };
    const { data, error } = await supabase
      .from("formularios")
      .insert(row)
      .select("*")
      .single();
    if (error) {
      console.error("[formularios] create error", error);
      toast.error(`Erro ao criar formulário: ${error.message}`);
      return null;
    }
    const novo = rowTo(data as Row);
    registros = [...registros, novo].sort((a, b) => a.nome.localeCompare(b.nome));
    emit();
    return novo;
  },

  async update(
    id: string,
    patch: Partial<Pick<FormularioTemplate, "nome" | "descricao" | "destinatario" | "estrutura">>,
  ): Promise<void> {
    const dbPatch: Record<string, unknown> = {};
    if (patch.nome !== undefined) dbPatch.nome = patch.nome.trim();
    if (patch.descricao !== undefined) dbPatch.descricao = patch.descricao?.trim() || null;
    if (patch.destinatario !== undefined) dbPatch.destinatario = patch.destinatario;
    if (patch.estrutura !== undefined) dbPatch.estrutura = patch.estrutura;
    const { error } = await supabase
      .from("formularios")
      .update(dbPatch as never)
      .eq("id", id);
    if (error) {
      console.error("[formularios] update error", error);
      toast.error(`Erro ao atualizar: ${error.message}`);
      return;
    }
    registros = registros.map((f) =>
      f.id === id ? { ...f, ...patch, atualizadoEm: new Date().toISOString() } : f,
    );
    emit();
  },

  async remove(id: string): Promise<void> {
    const f = this.byId(id);
    if (f?.isSystem) {
      toast.error("Formulários do sistema não podem ser excluídos.");
      return;
    }
    const { error } = await supabase.from("formularios").delete().eq("id", id);
    if (error) {
      console.error("[formularios] remove error", error);
      toast.error(`Erro ao excluir: ${error.message}`);
      return;
    }
    registros = registros.filter((f) => f.id !== id);
    emit();
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  ensureInit,
};

export function useFormularios(): FormularioTemplate[] {
  const [snap, setSnap] = useState<FormularioTemplate[]>(formulariosStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = formulariosStore.subscribe(() =>
      setSnap([...formulariosStore.getAll()]),
    );
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
