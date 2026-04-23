// Singleton in-memory store para Cursos com pub/sub.
// Necessário para que edições feitas em /cursos sejam refletidas
// nas demais rotas (Painel, Atividades, etc.) e persistam entre
// re-montagens de componente dentro da mesma sessão.
import { useEffect, useState } from "react";
import type { Curso } from "./academic-types";
import { SEED_CURSOS } from "./academic-seed";

let cursos: Curso[] = [...SEED_CURSOS];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const cursosStore = {
  getAll(): Curso[] {
    return cursos;
  },
  upsert(c: Curso) {
    const exists = cursos.some((x) => x.id === c.id);
    cursos = exists ? cursos.map((x) => (x.id === c.id ? c : x)) : [...cursos, c];
    emit();
  },
  update(id: string, patch: Partial<Curso>) {
    cursos = cursos.map((x) => (x.id === id ? { ...x, ...patch } : x));
    emit();
  },
  remove(id: string) {
    cursos = cursos.filter((x) => x.id !== id);
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useCursos(): Curso[] {
  const [snap, setSnap] = useState(cursosStore.getAll());
  useEffect(() => {
    const unsub = cursosStore.subscribe(() => setSnap(cursosStore.getAll()));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
