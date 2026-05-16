// =====================================================================
// drive-pattern — Resolver de placeholders para caminho Drive
// =====================================================================
// Pattern dinâmico vem de settings (key `integration.drive.tarefas_folder_pattern`).
// Default: "{professor}/{turma}/{data}-{aula_codigo}/{aluno}/"
//
// Placeholders suportados:
//   {professor}     — nome do professor
//   {professor_id}  — uuid do professor user
//   {turma}         — cod da turma (ex: AD_T1)
//   {turma_id}      — uuid da turma
//   {curso}         — cod do curso
//   {curso_id}      — uuid do curso
//   {data}          — YYYY-MM-DD do agendamento
//   {ano} {mes} {dia} — partes da data
//   {aula_codigo}   — código da atividade (ex: ADIA02)
//   {aula_nome}     — nome da atividade
//   {atividade_id}  — uuid da atividade
//   {aluno}         — nome do aluno
//   {aluno_id}      — uuid do aluno
//
// Função pura — testável, sem side effects.

import { settingsStore } from "./settings-store";

export interface DrivePatternContext {
  professor?: { nome: string; userId?: string | null };
  turma?: { cod: string; id: string; cursoCod?: string; cursoId?: string };
  agendamentoData?: string; // YYYY-MM-DD
  atividade?: { codigo: string; nome: string; id: string };
  aluno?: { nome: string; id: string };
}

const DEFAULT_PATTERN = "{professor}/{turma}/{data}-{aula_codigo}/{aluno}/";

/**
 * Normaliza string para uso em path: remove diacríticos, troca espaços
 * por `-`, remove chars não-safe. Preserva `_` e `-`.
 */
export function pathSafe(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Pega o pattern atual de settings ou usa o default. */
export function getCurrentPattern(): string {
  return settingsStore.get<string>("integration.drive.tarefas_folder_pattern", DEFAULT_PATTERN);
}

/**
 * Resolve um pattern substituindo placeholders pelo contexto fornecido.
 * Placeholders sem dado disponível ficam como "_" pra evitar barras vazias.
 */
export function resolveDrivePattern(pattern: string, ctx: DrivePatternContext): string {
  const data = ctx.agendamentoData ?? "";
  const [ano = "", mes = "", dia = ""] = data.split("-");

  const substitutions: Record<string, string> = {
    professor: pathSafe(ctx.professor?.nome ?? "_"),
    professor_id: ctx.professor?.userId ?? "_",
    turma: pathSafe(ctx.turma?.cod ?? "_"),
    turma_id: ctx.turma?.id ?? "_",
    curso: pathSafe(ctx.turma?.cursoCod ?? "_"),
    curso_id: ctx.turma?.cursoId ?? "_",
    data: data || "_",
    ano,
    mes,
    dia,
    aula_codigo: pathSafe(ctx.atividade?.codigo ?? "_"),
    aula_nome: pathSafe(ctx.atividade?.nome ?? "_"),
    atividade_id: ctx.atividade?.id ?? "_",
    aluno: pathSafe(ctx.aluno?.nome ?? "_"),
    aluno_id: ctx.aluno?.id ?? "_",
  };

  return pattern.replace(/\{([a-z_]+)\}/g, (_match, key: string) => {
    return substitutions[key] ?? `{${key}}`;
  });
}

/** Conveniência: resolve usando o pattern current de settings. */
export function resolveTarefaDrivePath(ctx: DrivePatternContext): string {
  return resolveDrivePattern(getCurrentPattern(), ctx);
}
