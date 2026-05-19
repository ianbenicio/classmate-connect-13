// =====================================================================
// curso-templates — 3 templates pré-prontos de curso (B3)
// =====================================================================
// Templates são clonados (INSERT novo uuid) para o tenant ativo.
// Edições no clone não afetam outros tenants — cópia completa.

import { requireProjectIdForWrite } from "./current-project";
import { cursosStore } from "./cursos-store";
import type { Curso } from "./academic-types";

export interface CursoTemplate {
  id: string; // identificador estável do template (não é UUID de DB)
  nome: string;
  cod: string;
  descricao: string;
  duracaoAulaMin: number;
  turnoDiarioMin: number;
  cargaHorariaTotalMin: number;
  tag: "anos_iniciais" | "fundamental2" | "medio";
}

export const CURSO_TEMPLATES: CursoTemplate[] = [
  {
    id: "tpl-anos-iniciais",
    nome: "Anos Iniciais (1º ao 5º ano)",
    cod: "ANOSINI",
    descricao:
      "Estrutura base para turmas do Ensino Fundamental I. Aulas de 50 min, turno matutino de 200 min (~4 aulas/dia).",
    duracaoAulaMin: 50,
    turnoDiarioMin: 200,
    cargaHorariaTotalMin: 800,
    tag: "anos_iniciais",
  },
  {
    id: "tpl-fundamental2",
    nome: "Fundamental II (6º ao 9º ano)",
    cod: "FUND2",
    descricao:
      "Estrutura base para turmas do Ensino Fundamental II. Aulas de 50 min, turno integral de 300 min (~6 aulas/dia).",
    duracaoAulaMin: 50,
    turnoDiarioMin: 300,
    cargaHorariaTotalMin: 1200,
    tag: "fundamental2",
  },
  {
    id: "tpl-medio",
    nome: "Ensino Médio (1ª à 3ª série)",
    cod: "MEDIO",
    descricao:
      "Estrutura base para turmas do Ensino Médio. Aulas de 50 min, turno integral de 300 min, carga anual ≈ 1.600 h.",
    duracaoAulaMin: 50,
    turnoDiarioMin: 300,
    cargaHorariaTotalMin: 1600,
    tag: "medio",
  },
];

/**
 * Clona o template para o tenant ativo com um novo UUID e cod único.
 * Salva via cursosStore.upsert() — edições no clone não afetam outros tenants.
 */
export async function cloneTemplate(tpl: CursoTemplate): Promise<Curso> {
  const projectId = requireProjectIdForWrite();
  if (!projectId) throw new Error("Nenhum projeto ativo. Selecione um projeto.");

  await cursosStore.ensureInit();
  const existingCods = new Set(cursosStore.getAll().map((c) => c.cod.toUpperCase()));

  let cod = tpl.cod;
  if (existingCods.has(cod)) {
    cod = `${cod}_${Date.now().toString(36).toUpperCase()}`;
  }

  const clone: Curso = {
    id: crypto.randomUUID(),
    cod,
    nome: tpl.nome,
    descricao: tpl.descricao,
    duracaoAulaMin: tpl.duracaoAulaMin,
    turnoDiarioMin: tpl.turnoDiarioMin,
    cargaHorariaTotalMin: tpl.cargaHorariaTotalMin,
    habilidadeIds: [],
  };

  await cursosStore.upsert(clone);
  return clone;
}
