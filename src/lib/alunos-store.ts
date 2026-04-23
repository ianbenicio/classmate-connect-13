// Singleton store de Alunos com persistência no Supabase.
import { useEffect, useState } from "react";
import type { Aluno } from "./academic-types";
import { supabase } from "@/integrations/supabase/client";
import { toUuid } from "./db-mapping";
import { toast } from "sonner";

let alunos: Aluno[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type AlunoRow = {
  id: string;
  nome: string;
  idade: number | null;
  contato: string | null;
  cpf: string | null;
  curso_id: string | null;
  turma_id: string | null;
  responsavel: string | null;
  contato_resp: string | null;
  observacao: string | null;
};

function rowToAluno(r: AlunoRow): Aluno {
  return {
    id: r.id,
    nome: r.nome,
    idade: r.idade ?? undefined,
    contato: r.contato ?? "",
    cpf: r.cpf ?? undefined,
    cursoId: r.curso_id ?? "",
    turmaId: r.turma_id ?? "",
    habilidadeIds: [],
    aulas: [],
    trabalhos: [],
    responsavel: r.responsavel ?? undefined,
    contatoResp: r.contato_resp ?? undefined,
    observacao: r.observacao ?? undefined,
  };
}

function alunoToRow(a: Aluno) {
  return {
    id: toUuid(a.id),
    nome: a.nome,
    idade: a.idade ?? null,
    contato: a.contato || null,
    cpf: a.cpf ?? null,
    curso_id: a.cursoId ? toUuid(a.cursoId) : null,
    turma_id: a.turmaId ? toUuid(a.turmaId) : null,
    responsavel: a.responsavel ?? null,
    contato_resp: a.contatoResp ?? null,
    observacao: a.observacao ?? null,
  };
}

async function loadFromDb() {
  const { data, error } = await supabase.from("alunos").select("*").order("nome");
  if (error) {
    console.error("[alunos] load error", error);
    return;
  }
  alunos = (data ?? []).map(rowToAluno);
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
      emit();
    });
  }
  return initPromise;
}

export const alunosStore = {
  getAll(): Aluno[] {
    return alunos;
  },
  async add(a: Aluno) {
    const row = alunoToRow(a);
    const local: Aluno = { ...a, id: row.id };
    alunos = [local, ...alunos];
    emit();
    const { error } = await supabase.from("alunos").insert(row);
    if (error) {
      console.error("[alunos] add error", error);
      toast.error(`Erro ao salvar aluno: ${error.message}`);
    }
  },
  async update(id: string, patch: Partial<Aluno>) {
    const dbId = toUuid(id);
    const current = alunos.find((x) => x.id === dbId || x.id === id);
    if (!current) return;
    const merged: Aluno = { ...current, ...patch, id: dbId };
    alunos = alunos.map((x) => (x.id === dbId ? merged : x));
    emit();
    const row = alunoToRow(merged);
    const { error } = await supabase.from("alunos").update(row).eq("id", dbId);
    if (error) {
      console.error("[alunos] update error", error);
      toast.error(`Erro ao atualizar aluno: ${error.message}`);
    }
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    alunos = alunos.filter((x) => x.id !== dbId && x.id !== id);
    emit();
    const { error } = await supabase.from("alunos").delete().eq("id", dbId);
    if (error) {
      console.error("[alunos] remove error", error);
      toast.error(`Erro ao remover aluno: ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useAlunos(): Aluno[] {
  const [snap, setSnap] = useState<Aluno[]>(alunosStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = alunosStore.subscribe(() => setSnap([...alunosStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
