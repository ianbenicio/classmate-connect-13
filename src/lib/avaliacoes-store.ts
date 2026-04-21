// Singleton in-memory store para Avaliações de Aula (preenchidas pelo aluno).
// Persiste em localStorage para sobreviver ao reload durante o protótipo.
import { useEffect, useState } from "react";
import type { AvaliacaoAula } from "./avaliacoes-types";

const STORAGE_KEY = "app.avaliacoesAula";

function readInitial(): AvaliacaoAula[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AvaliacaoAula[]) : [];
  } catch {
    return [];
  }
}

let avaliacoes: AvaliacaoAula[] = readInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(avaliacoes));
  }
}

function emit() {
  for (const l of listeners) l();
}

export const avaliacoesStore = {
  getAll(): AvaliacaoAula[] {
    return avaliacoes;
  },
  byAgendamentoAluno(agendamentoId: string, alunoId: string): AvaliacaoAula | undefined {
    return avaliacoes.find(
      (a) => a.agendamentoId === agendamentoId && a.alunoId === alunoId,
    );
  },
  upsert(av: AvaliacaoAula) {
    const idx = avaliacoes.findIndex(
      (x) => x.agendamentoId === av.agendamentoId && x.alunoId === av.alunoId,
    );
    if (idx >= 0) {
      avaliacoes = avaliacoes.map((x, i) => (i === idx ? av : x));
    } else {
      avaliacoes = [av, ...avaliacoes];
    }
    persist();
    emit();
  },
  remove(id: string) {
    avaliacoes = avaliacoes.filter((a) => a.id !== id);
    persist();
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useAvaliacoes(): AvaliacaoAula[] {
  const [snap, setSnap] = useState<AvaliacaoAula[]>(avaliacoesStore.getAll());
  useEffect(() => {
    setSnap(avaliacoesStore.getAll());
    const unsub = avaliacoesStore.subscribe(() =>
      setSnap(avaliacoesStore.getAll()),
    );
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
