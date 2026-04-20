// Singleton in-memory store para Agendamentos com pub/sub.
// Permite que dialogs e páginas compartilhem estado sem prop drilling
// e sem precisar de Lovable Cloud nesta etapa.

import { useEffect, useState } from "react";
import type { Agendamento } from "./academic-types";
import { SEED_AGENDAMENTOS } from "./academic-seed";

let agendamentos: Agendamento[] = [...SEED_AGENDAMENTOS];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const agendamentosStore = {
  getAll(): Agendamento[] {
    return agendamentos;
  },
  add(a: Agendamento) {
    agendamentos = [a, ...agendamentos];
    emit();
  },
  update(id: string, patch: Partial<Agendamento>) {
    agendamentos = agendamentos.map((x) =>
      x.id === id ? { ...x, ...patch } : x,
    );
    emit();
  },
  remove(id: string) {
    agendamentos = agendamentos.filter((x) => x.id !== id);
    emit();
  },
  marcarConcluido(id: string) {
    this.update(id, {
      status: "concluido",
      concluidoEm: new Date().toISOString(),
    });
  },
  reabrir(id: string) {
    agendamentos = agendamentos.map((x) =>
      x.id === id
        ? { ...x, status: "pendente", concluidoEm: undefined }
        : x,
    );
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useAgendamentos(): Agendamento[] {
  const [snapshot, setSnapshot] = useState(agendamentosStore.getAll());
  useEffect(() => {
    return agendamentosStore.subscribe(() =>
      setSnapshot(agendamentosStore.getAll()),
    );
  }, []);
  return snapshot;
}
