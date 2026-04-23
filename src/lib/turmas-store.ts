// Singleton in-memory store para Turmas com pub/sub.
import { useEffect, useState } from "react";
import type { Turma } from "./academic-types";
import { SEED_TURMAS } from "./academic-seed";

let turmas: Turma[] = [...SEED_TURMAS];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const turmasStore = {
  getAll(): Turma[] {
    return turmas;
  },
  upsert(t: Turma) {
    const exists = turmas.some((x) => x.id === t.id);
    turmas = exists ? turmas.map((x) => (x.id === t.id ? t : x)) : [...turmas, t];
    emit();
  },
  update(id: string, patch: Partial<Turma>) {
    turmas = turmas.map((x) => (x.id === id ? { ...x, ...patch } : x));
    emit();
  },
  setMany(next: Turma[]) {
    turmas = next;
    emit();
  },
  remove(id: string) {
    turmas = turmas.filter((x) => x.id !== id);
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useTurmas(): Turma[] {
  const [snap, setSnap] = useState(turmasStore.getAll());
  useEffect(() => {
    const unsub = turmasStore.subscribe(() => setSnap(turmasStore.getAll()));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
