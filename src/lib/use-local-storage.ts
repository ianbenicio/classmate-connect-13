// =====================================================================
// useLocalStorage — useState persistido em localStorage por chave
// =====================================================================
// SSR-safe (TanStack Start): durante render server-side retorna o initial.
// Erros de quota / privacy mode são silenciados.

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return initial;
      return JSON.parse(stored) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota / privacy mode → silencia
    }
  }, [key, value]);

  return [value, setValue];
}
