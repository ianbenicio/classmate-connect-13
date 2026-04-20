// Singleton in-memory store para Alunos com pub/sub.
import { useEffect, useState } from "react";
import type { Aluno } from "./academic-types";
import { SEED_ALUNOS } from "./academic-seed";

let alunos: Aluno[] = [...SEED_ALUNOS];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const alunosStore = {
  getAll(): Aluno[] {
    return alunos;
  },
  add(a: Aluno) {
    alunos = [a, ...alunos];
    emit();
  },
  update(id: string, patch: Partial<Aluno>) {
    alunos = alunos.map((x) => (x.id === id ? { ...x, ...patch } : x));
    emit();
  },
  remove(id: string) {
    alunos = alunos.filter((x) => x.id !== id);
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useAlunos(): Aluno[] {
  const [snap, setSnap] = useState(alunosStore.getAll());
  useEffect(() => {
    const unsub = alunosStore.subscribe(() => setSnap(alunosStore.getAll()));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
