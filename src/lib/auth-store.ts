// Sessão local do usuário "logado" (mock). Persiste em localStorage.
import { useEffect, useState } from "react";
import { USERS, type AppUser } from "./users";

const STORAGE_KEY = "app.currentUserId";
const DEFAULT_ID = "u-celso";

function readInitial(): AppUser {
  if (typeof window === "undefined") return USERS.find((u) => u.id === DEFAULT_ID)!;
  const id = window.localStorage.getItem(STORAGE_KEY);
  return USERS.find((u) => u.id === id) ?? USERS.find((u) => u.id === DEFAULT_ID)!;
}

let current: AppUser = readInitial();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const authStore = {
  get(): AppUser {
    return current;
  },
  setById(id: string) {
    const u = USERS.find((x) => x.id === id);
    if (!u) return;
    current = u;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useCurrentUser(): AppUser {
  const [user, setUser] = useState<AppUser>(current);
  useEffect(() => {
    // Sincroniza valor inicial no client (caso SSR tenha retornado outro).
    setUser(authStore.get());
    const unsub = authStore.subscribe(() => setUser(authStore.get()));
    return () => {
      unsub();
    };
  }, []);
  return user;
}
