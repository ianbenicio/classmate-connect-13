// Histórico de relatórios gerados pelo sistema.
// Persiste em localStorage com pub/sub.
// Cada relatório guarda o conteúdo (JSON serializado) para poder ser
// re-baixado depois — não fica só o registro do clique.

import { useEffect, useState } from "react";

export type RelatorioTipo =
  | "export_completo"
  | "avaliacoes"
  | "frequencia"
  | "outro";

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

const STORAGE_KEY = "app.relatorios";

function readInitial(): Relatorio[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Relatorio[]) : [];
  } catch {
    return [];
  }
}

let relatorios: Relatorio[] = readInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(relatorios));
    } catch {
      // localStorage cheio — silencia
    }
  }
}

function emit() {
  for (const l of listeners) l();
}

export const relatoriosStore = {
  getAll(): Relatorio[] {
    return relatorios;
  },
  add(r: Relatorio) {
    relatorios = [r, ...relatorios];
    persist();
    emit();
  },
  remove(id: string) {
    relatorios = relatorios.filter((r) => r.id !== id);
    persist();
    emit();
  },
  clear() {
    relatorios = [];
    persist();
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useRelatorios(): Relatorio[] {
  const [snap, setSnap] = useState<Relatorio[]>(relatoriosStore.getAll());
  useEffect(() => {
    setSnap(relatoriosStore.getAll());
    const unsub = relatoriosStore.subscribe(() =>
      setSnap(relatoriosStore.getAll()),
    );
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
