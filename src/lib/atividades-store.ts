// Singleton in-memory store para Atividades com pub/sub.
import { useEffect, useState } from "react";
import type { Atividade } from "./academic-types";
import { SEED_ATIVIDADES } from "./academic-seed";

let atividades: Atividade[] = [...SEED_ATIVIDADES];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const atividadesStore = {
  getAll(): Atividade[] {
    return atividades;
  },
  upsert(a: Atividade) {
    const exists = atividades.some((x) => x.id === a.id);
    atividades = exists
      ? atividades.map((x) => (x.id === a.id ? a : x))
      : [a, ...atividades];
    emit();
  },
  remove(id: string) {
    atividades = atividades.filter((x) => x.id !== id);
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useAtividades(): Atividade[] {
  const [snap, setSnap] = useState(atividadesStore.getAll());
  useEffect(() => {
    const unsub = atividadesStore.subscribe(() =>
      setSnap(atividadesStore.getAll()),
    );
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
