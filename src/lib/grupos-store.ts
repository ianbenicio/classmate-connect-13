// Singleton store de Grupos (módulos) com persistência no Supabase.
// Usa createStoreBase para eliminar boilerplate de init/pub-sub.
//
// Os grupos são entregues no formato `Record<cursoCod, Grupo[]>`, que é
// a chave esperada por `getGrupoNome(map, curso.cod, grupoCod)` e pelos
// consumidores que recebiam SEED_GRUPOS.
import { useEffect, useState } from "react";
import type { Grupo } from "./academic-types";
import { supabase } from "@/integrations/supabase/client";
import { cursosStore } from "./cursos-store";
import { requireProjectIdForWrite } from "./current-project";
import { createStoreBase } from "./store-base";
import { toast } from "sonner";

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

// ── Base (init + pub/sub) ────────────────────────────────────────────

async function loadFromDb(): Promise<GrupoFull[]> {
  await cursosStore.ensureInit();
  const { data, error } = await supabase.from("grupos").select("*").order("cod");
  if (error) {
    console.error("[grupos] load error", error);
    return [];
  }
  return ((data ?? []) as GrupoRow[]).map((r) => ({
    id: r.id,
    cursoId: r.curso_id,
    cod: r.cod,
    nome: r.nome,
  }));
}

const base = createStoreBase<GrupoFull[]>(async (set) => {
  const data = await loadFromDb();
  set(data);
  // Reage a mudanças de cursos (novo curso → eventualmente novos grupos).
  cursosStore.subscribe(() => {
    void loadFromDb().then((d) => {
      set(d);
      base.emit();
    });
  });
}, []);

// ── Derived helpers ──────────────────────────────────────────────────

function buildMapByCursoCod(): Record<string, Grupo[]> {
  const cursos = cursosStore.getAll();
  const cursoIdToCod = new Map(cursos.map((c) => [c.id, c.cod]));
  const map: Record<string, Grupo[]> = {};
  for (const g of base.get()) {
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

// ── Public store ─────────────────────────────────────────────────────

export const gruposStore = {
  getAll(): GrupoFull[] {
    return base.get();
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
  /** Cria novo grupo/módulo vinculado a um curso. Retorna o grupo criado ou null em erro. */
  async add(cursoId: string, cod: string, nome: string): Promise<GrupoFull | null> {
    const id = crypto.randomUUID();
    const local: GrupoFull = { id, cursoId, cod, nome };
    const snap = base.get();
    base.set([...snap, local]);
    base.emit();
    const { error } = await supabase.from("grupos").insert({
      id,
      curso_id: cursoId,
      cod,
      nome,
      project_id: requireProjectIdForWrite() ?? undefined,
    });
    if (error) {
      base.set(snap);
      base.emit();
      console.error("[grupos] add error", error);
      if (error.code === "23505") {
        toast.error(`Código "${cod}" já existe neste curso.`);
      } else {
        toast.error(`Erro ao criar grupo: ${error.message}`);
      }
      return null;
    }
    toast.success(`Grupo "${nome}" criado com sucesso.`);
    return local;
  },
  /** Atualiza cod/nome de um grupo. Optimistic + rollback. */
  async update(id: string, cod: string, nome: string): Promise<boolean> {
    const snap = base.get();
    base.set(snap.map((g) => (g.id === id ? { ...g, cod, nome } : g)));
    base.emit();
    const { error } = await supabase.from("grupos").update({ cod, nome }).eq("id", id);
    if (error) {
      base.set(snap);
      base.emit();
      console.error("[grupos] update error", error);
      if (error.code === "23505") {
        toast.error(`Código "${cod}" já existe neste curso.`);
      } else {
        toast.error(`Erro ao atualizar grupo: ${error.message}`);
      }
      return false;
    }
    toast.success("Grupo atualizado.");
    return true;
  },
  /** Remove um grupo. Optimistic + rollback. */
  async remove(id: string): Promise<boolean> {
    const snap = base.get();
    const alvo = snap.find((g) => g.id === id);
    base.set(snap.filter((g) => g.id !== id));
    base.emit();
    const { error } = await supabase.from("grupos").delete().eq("id", id);
    if (error) {
      base.set(snap);
      base.emit();
      console.error("[grupos] remove error", error);
      toast.error(`Erro ao remover grupo: ${error.message}`);
      return false;
    }
    toast.success(`Grupo "${alvo?.nome ?? ""}" removido.`);
    return true;
  },
  subscribe: base.subscribe.bind(base),
  ensureInit: base.ensureInit.bind(base),
};

// ── Hooks ────────────────────────────────────────────────────────────

/** Hook que expõe `Record<cursoCod, Grupo[]>` reagindo a mudanças. */
export function useGruposByCursoCod(): Record<string, Grupo[]> {
  const [snap, setSnap] = useState<Record<string, Grupo[]>>(() => buildMapByCursoCod());
  useEffect(() => {
    void base.ensureInit();
    const unsubGrupos = base.subscribe(() => setSnap(buildMapByCursoCod()));
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
