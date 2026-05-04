// Singleton store de Grupos (módulos) com persistência no Supabase.
// Read-only no que diz respeito ao seed: o top-up de grupos é feito por
// cursos-store.topUpGrupos (depende de cursos já carregados). Aqui só
// expomos a leitura para a UI, evitando que componentes leiam SEED_GRUPOS
// diretamente.
//
// Os grupos são entregues no formato `Record<cursoCod, Grupo[]>`, que é
// a chave esperada por `getGrupoNome(map, curso.cod, grupoCod)` e pelos
// consumidores que recebiam SEED_GRUPOS.
import { useEffect, useState } from "react";
import type { Grupo } from "./academic-types";
import { supabase } from "@/integrations/supabase/client";
import { cursosStore } from "./cursos-store";

type GrupoRow = {
  id: string;
  curso_id: string;
  cod: string;
  nome: string;
};

interface GrupoFull extends Grupo {
  id: string;
  cursoId: string;
}

let grupos: GrupoFull[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadFromDb() {
  // Garante que cursos foram carregados (e o top-up de grupos rodou).
  await cursosStore.ensureInit();
  const { data, error } = await supabase.from("grupos").select("*").order("cod");
  if (error) {
    console.error("[grupos] load error", error);
    grupos = [];
    return;
  }
  const rows = (data ?? []) as GrupoRow[];
  grupos = rows.map((r) => ({
    id: r.id,
    cursoId: r.curso_id,
    cod: r.cod,
    nome: r.nome,
  }));
}

async function ensureInit(): Promise<void> {
  if (initialized) {
    await loadFromDb();
    emit();
    return;
  }
  if (!initPromise) {
    initPromise = loadFromDb().then(() => {
      initialized = true;
      // Reage a mudanças de cursos (novo curso → eventualmente novos grupos).
      cursosStore.subscribe(() => {
        void loadFromDb().then(emit);
      });
      emit();
    });
  }
  return initPromise;
}

function buildMapByCursoCod(): Record<string, Grupo[]> {
  const cursos = cursosStore.getAll();
  const cursoIdToCod = new Map(cursos.map((c) => [c.id, c.cod]));
  const map: Record<string, Grupo[]> = {};
  for (const g of grupos) {
    const cod = cursoIdToCod.get(g.cursoId);
    if (!cod) continue;
    if (!map[cod]) map[cod] = [];
    map[cod].push({ cod: g.cod, nome: g.nome });
  }
  // Espelha em curso.id também — alguns chamadores antigos passam o id.
  for (const c of cursos) {
    if (map[c.cod] && !map[c.id]) {
      map[c.id] = map[c.cod];
    }
  }
  return map;
}

export const gruposStore = {
  getAll(): GrupoFull[] {
    return grupos;
  },
  /** Retorna `Record<cursoCod, Grupo[]>` — drop-in para SEED_GRUPOS. */
  getByCursoCod(): Record<string, Grupo[]> {
    return buildMapByCursoCod();
  },
  getDoCurso(curso: { id: string; cod: string } | null | undefined): Grupo[] {
    if (!curso) return [];
    const map = buildMapByCursoCod();
    return map[curso.cod] ?? map[curso.id] ?? [];
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

/** Hook que expõe `Record<cursoCod, Grupo[]>` reagindo a mudanças. */
export function useGruposByCursoCod(): Record<string, Grupo[]> {
  const [snap, setSnap] = useState<Record<string, Grupo[]>>(() => buildMapByCursoCod());
  useEffect(() => {
    void ensureInit();
    const unsubGrupos = gruposStore.subscribe(() => setSnap(buildMapByCursoCod()));
    const unsubCursos = cursosStore.subscribe(() => setSnap(buildMapByCursoCod()));
    return () => {
      unsubGrupos();
      unsubCursos();
    };
  }, []);
  return snap;
}

/** Hook reativo que devolve grupos de um curso específico. */
export function useGruposDoCurso(curso: { id: string; cod: string } | null | undefined): Grupo[] {
  const map = useGruposByCursoCod();
  if (!curso) return [];
  return map[curso.cod] ?? map[curso.id] ?? [];
}
