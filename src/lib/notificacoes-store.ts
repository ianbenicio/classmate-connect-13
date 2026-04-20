// Singleton in-memory store para Notificações com pub/sub.
import { useEffect, useState } from "react";
import type { Notificacao } from "./academic-types";

let notificacoes: Notificacao[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const notificacoesStore = {
  getAll(): Notificacao[] {
    return notificacoes;
  },
  addMany(items: Notificacao[]) {
    notificacoes = [...items, ...notificacoes];
    emit();
  },
  marcarLida(id: string) {
    notificacoes = notificacoes.map((n) =>
      n.id === id ? { ...n, lida: true } : n,
    );
    emit();
  },
  marcarTodasLidas() {
    notificacoes = notificacoes.map((n) => ({ ...n, lida: true }));
    emit();
  },
  remove(id: string) {
    notificacoes = notificacoes.filter((n) => n.id !== id);
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useNotificacoes(): Notificacao[] {
  const [snap, setSnap] = useState(notificacoesStore.getAll());
  useEffect(() => {
    const unsub = notificacoesStore.subscribe(() =>
      setSnap(notificacoesStore.getAll()),
    );
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
