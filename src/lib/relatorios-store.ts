// Histórico de relatórios/exportações geradas pelo sistema, persistido em
// Supabase (tabela `relatorios_exportados`).
//
// Importante: NÃO é a tabela `relatorios` (relatórios de aula/agendamento).
// São conceitos diferentes que coincidem no nome — esta store guarda o
// histórico de arquivos JSON baixados, com conteúdo serializado para
// permitir re-download.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RelatorioTipo = "export_completo" | "avaliacoes" | "frequencia" | "outro";

export const RELATORIO_TIPO_LABEL: Record<RelatorioTipo, string> = {
  export_completo: "Exportação completa",
  avaliacoes: "Avaliações de aula",
  frequencia: "Frequência",
  outro: "Outro",
};

export interface Relatorio {
  id: string;
  tipo: RelatorioTipo;
  titulo: string;
  geradoEm: string; // ISO
  geradoPorUserId?: string;
  geradoPorNome?: string;
  formato: "json";
  sizeBytes: number;
  filename: string;
  conteudo: string; // JSON serializado (string) — permite re-download
}

type Row = {
  id: string;
  tipo: string;
  titulo: string;
  gerado_em: string;
  gerado_por_user_id: string | null;
  gerado_por_nome: string | null;
  formato: string;
  size_bytes: number;
  filename: string;
  conteudo: string;
};

function rowTo(r: Row): Relatorio {
  return {
    id: r.id,
    tipo: (r.tipo as RelatorioTipo) ?? "outro",
    titulo: r.titulo,
    geradoEm: r.gerado_em,
    geradoPorUserId: r.gerado_por_user_id ?? undefined,
    geradoPorNome: r.gerado_por_nome ?? undefined,
    formato: "json",
    sizeBytes: r.size_bytes,
    filename: r.filename,
    conteudo: r.conteudo,
  };
}

function toRow(r: Relatorio) {
  return {
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo,
    gerado_em: r.geradoEm,
    gerado_por_user_id: r.geradoPorUserId ?? null,
    gerado_por_nome: r.geradoPorNome ?? null,
    formato: r.formato,
    size_bytes: r.sizeBytes,
    filename: r.filename,
    conteudo: r.conteudo,
  };
}

let relatorios: Relatorio[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("relatorios_exportados")
    .select("*")
    .order("gerado_em", { ascending: false });
  if (error) {
    console.error("[relatorios] load error", error);
    return;
  }
  relatorios = ((data ?? []) as unknown as Row[]).map(rowTo);
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

export const relatoriosStore = {
  getAll(): Relatorio[] {
    return relatorios;
  },
  async add(r: Relatorio) {
    relatorios = [r, ...relatorios];
    emit();
    const { error } = await supabase.from("relatorios_exportados").insert(toRow(r));
    if (error) {
      console.error("[relatorios] add error", error);
      toast.error(`Erro ao registrar relatório: ${error.message}`);
    }
  },
  async remove(id: string) {
    relatorios = relatorios.filter((r) => r.id !== id);
    emit();
    const { error } = await supabase.from("relatorios_exportados").delete().eq("id", id);
    if (error) {
      console.error("[relatorios] remove error", error);
      toast.error(`Erro ao remover relatório: ${error.message}`);
    }
  },
  async clear() {
    const ids = relatorios.map((r) => r.id);
    relatorios = [];
    emit();
    if (ids.length === 0) return;
    const { error } = await supabase.from("relatorios_exportados").delete().in("id", ids);
    if (error) {
      console.error("[relatorios] clear error", error);
      toast.error(`Erro ao limpar relatórios: ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useRelatorios(): Relatorio[] {
  const [snap, setSnap] = useState<Relatorio[]>(relatoriosStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = relatoriosStore.subscribe(() => setSnap([...relatoriosStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}

/** Faz o download de um relatório já registrado. */
export function downloadRelatorio(r: Relatorio) {
  const blob = new Blob([r.conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = r.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
