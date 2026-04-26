// Singleton store de Atividades com persistência no Supabase.
import { useEffect, useState } from "react";
import type {
  Atividade,
  AtividadeTipo,
  CriterioAvaliacao,
  FormulariosConfig,
  HabilidadeNivelAlvo,
  MaterialAula,
  RoteiroBloco,
} from "./academic-types";
import { SEED_ATIVIDADES } from "./academic-seed";
import { supabase } from "@/integrations/supabase/client";
import { toUuid, toUuidArray } from "./db-mapping";
import { toast } from "sonner";
import { devInfo } from "./dev-log";

let atividades: Atividade[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type AtividadeRow = {
  id: string;
  tipo: "aula" | "tarefa";
  nome: string;
  codigo: string;
  curso_id: string;
  grupo: string;
  descricao: string | null;
  objetivo_resultados: string | null;
  prazo: string | null;
  criado_por: string | null;
  professor: string | null;
  professor_id: string | null; // NOVO — Fase 6 FK to professores
  habilidade_ids: unknown;
  descricao_conteudo: string | null;
  sugestoes_pais: string | null;
  resultados_esperados: string | null;
  notas_instrutor: string | null;
  pre_requisitos: string | null;
  niveis_alvo: unknown;
  criterios_sucesso: string | null;
  metodologias: string | null;
  roteiro: unknown;
  materiais: unknown;
  referencias: string | null;
  formularios: unknown;
  rubricas: unknown;
  instrucoes: string | null;
  carga_horaria_min: number;
};

function tipoToEnum(t: AtividadeTipo): "aula" | "tarefa" {
  return t === 0 ? "aula" : "tarefa";
}
function tipoFromEnum(t: "aula" | "tarefa"): AtividadeTipo {
  return t === "aula" ? 0 : 1;
}

function rowToAtividade(r: AtividadeRow): Atividade {
  return {
    id: r.id,
    tipo: tipoFromEnum(r.tipo),
    nome: r.nome,
    codigo: r.codigo,
    cursoId: r.curso_id,
    grupo: r.grupo,
    descricao: r.descricao ?? "",
    objetivoResultados: r.objetivo_resultados ?? "",
    prazo: r.prazo ?? "",
    criadoPor: r.criado_por ?? "",
    professor: r.professor ?? "",
    professorId: r.professor_id ?? undefined,
    habilidadeIds: toUuidArray(
      (Array.isArray(r.habilidade_ids) ? r.habilidade_ids : []) as string[],
    ),
    descricaoConteudo: r.descricao_conteudo ?? undefined,
    sugestoesPais: r.sugestoes_pais ?? undefined,
    resultadosEsperados: r.resultados_esperados ?? undefined,
    notasInstrutor: r.notas_instrutor ?? undefined,
    preRequisitos: r.pre_requisitos ?? undefined,
    niveisAlvo: (Array.isArray(r.niveis_alvo) ? r.niveis_alvo : [])
      .map((n) => ({
        habilidadeId: toUuid((n as HabilidadeNivelAlvo).habilidadeId),
        nivelAlvo: (n as HabilidadeNivelAlvo).nivelAlvo,
      })) as HabilidadeNivelAlvo[],
    criteriosSucesso: r.criterios_sucesso ?? undefined,
    metodologias: r.metodologias ?? undefined,
    roteiro: (Array.isArray(r.roteiro) ? r.roteiro : []) as RoteiroBloco[],
    materiais: (Array.isArray(r.materiais) ? r.materiais : []) as MaterialAula[],
    referencias: r.referencias ?? undefined,
    formularios: (r.formularios ?? undefined) as FormulariosConfig | undefined,
    rubricas: (Array.isArray(r.rubricas) ? r.rubricas : []) as CriterioAvaliacao[],
    instrucoes: r.instrucoes ?? undefined,
    cargaHorariaMin: r.carga_horaria_min,
  };
}

function atividadeToRow(a: Atividade) {
  return {
    id: toUuid(a.id),
    tipo: tipoToEnum(a.tipo),
    nome: a.nome,
    codigo: a.codigo,
    curso_id: toUuid(a.cursoId),
    grupo: a.grupo,
    descricao: a.descricao || null,
    objetivo_resultados: a.objetivoResultados || null,
    prazo: a.prazo || null,
    criado_por: a.criadoPor || null,
    professor: a.professor || null,
    professor_id: a.professorId ? toUuid(a.professorId) : null,
    habilidade_ids: toUuidArray(a.habilidadeIds) as never,
    descricao_conteudo: a.descricaoConteudo ?? null,
    sugestoes_pais: a.sugestoesPais ?? null,
    resultados_esperados: a.resultadosEsperados ?? null,
    notas_instrutor: a.notasInstrutor ?? null,
    pre_requisitos: a.preRequisitos ?? null,
    niveis_alvo: ((a.niveisAlvo ?? []).map((n) => ({
      habilidadeId: toUuid(n.habilidadeId),
      nivelAlvo: n.nivelAlvo,
    }))) as never,
    criterios_sucesso: a.criteriosSucesso ?? null,
    metodologias: a.metodologias ?? null,
    roteiro: (a.roteiro ?? []) as never,
    materiais: (a.materiais ?? []) as never,
    referencias: a.referencias ?? null,
    formularios: (a.formularios ?? null) as never,
    rubricas: (a.rubricas ?? []) as never,
    instrucoes: a.instrucoes ?? null,
    carga_horaria_min: a.cargaHorariaMin ?? 0,
  };
}

// Top-up: insere as linhas do seed que ainda não existem no banco (sem
// sobrescrever edições existentes). Necessário porque a versão anterior só
// semeava quando a tabela estava *totalmente* vazia — se um chunk falhou no
// primeiro seed, grupos inteiros ficavam faltando sem nunca serem recuperados.
async function topUpSeed(
  existingIds: Set<string>,
  existingCodigos: Set<string>,
) {
  // Filtra também por `codigo` (UNIQUE) — sem isso, um id de seed novo
  // para um codigo já existente quebrava o upsert com 409 a cada load.
  const missing = SEED_ATIVIDADES.filter(
    (a) => !existingIds.has(toUuid(a.id)) && !existingCodigos.has(a.codigo),
  );
  if (missing.length === 0) return false;
  const rows = missing.map(atividadeToRow);
  // Continua em chunks pra evitar payload grande, mas agora cada chunk é
  // independente — uma falha não para os outros.
  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("atividades")
      .upsert(chunk, { onConflict: "id", ignoreDuplicates: true });
    if (error) {
      console.error("[atividades] top-up error (chunk)", error);
      continue;
    }
    inserted += chunk.length;
  }
  if (inserted > 0) {
    devInfo(`[atividades] top-up: +${inserted} linhas do seed`);
  }
  return inserted > 0;
}

async function loadFromDb() {
  const { data, error } = await supabase.from("atividades").select("*").order("codigo");
  if (error) {
    console.error("[atividades] load error", error);
    atividades = [...SEED_ATIVIDADES];
    return;
  }
  const rows = (data ?? []) as AtividadeRow[];
  const existingIds = new Set(rows.map((r) => r.id));
  const existingCodigos = new Set(rows.map((r) => r.codigo));
  const inserted = await topUpSeed(existingIds, existingCodigos);
  if (inserted) {
    const { data: data2 } = await supabase.from("atividades").select("*").order("codigo");
    atividades = (data2 ?? []).map((r) => rowToAtividade(r as AtividadeRow));
  } else {
    atividades = rows.map((r) => rowToAtividade(r));
  }
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

export const atividadesStore = {
  getAll(): Atividade[] {
    return atividades;
  },
  async upsert(a: Atividade) {
    const row = atividadeToRow(a);
    const local: Atividade = {
      ...a,
      id: row.id,
      cursoId: row.curso_id,
      habilidadeIds: toUuidArray(a.habilidadeIds),
    };
    const exists = atividades.some((x) => x.id === local.id);
    atividades = exists
      ? atividades.map((x) => (x.id === local.id ? local : x))
      : [local, ...atividades];
    emit();
    const { error } = await supabase.from("atividades").upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[atividades] upsert error", error);
      toast.error(`Erro ao salvar atividade: ${error.message}`);
    }
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    atividades = atividades.filter((x) => x.id !== dbId && x.id !== id);
    emit();
    const { error } = await supabase.from("atividades").delete().eq("id", dbId);
    if (error) {
      console.error("[atividades] remove error", error);
      toast.error(`Erro ao remover atividade: ${error.message}`);
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useAtividades(): Atividade[] {
  const [snap, setSnap] = useState<Atividade[]>(atividadesStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = atividadesStore.subscribe(() => setSnap([...atividadesStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
