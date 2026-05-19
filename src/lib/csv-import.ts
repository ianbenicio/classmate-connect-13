// =====================================================================
// csv-import — Parse, validate e upsert CSV de alunos e turmas (B2)
// =====================================================================
// Usa papaparse (client-side) + zod para validação.
// Upsert em chunks de 50 com callback de progresso.

import Papa from "papaparse";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireProjectIdForWrite, getCurrentProjectId } from "./current-project";
import { alunosStore } from "./alunos-store";
import { turmasStore } from "./turmas-store";

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

export const AlunoRowSchema = z.object({
  nome: z.string().min(2, "Nome muito curto"),
  email_aluno: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.union([z.literal(""), z.string().email("Email do aluno inválido")]))
    .optional()
    .default(""),
  email_responsavel: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.union([z.literal(""), z.string().email("Email do responsável inválido")]))
    .optional()
    .default(""),
  idade: z
    .string()
    .optional()
    .default("")
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || (!isNaN(v) && v >= 3 && v <= 99), {
      message: "Idade deve ser 3–99",
    }),
  turma_cod: z.string().optional().default(""),
});

export type AlunoRowParsed = z.output<typeof AlunoRowSchema>;

export const TurmaRowSchema = z.object({
  nome: z.string().min(2, "Nome da turma muito curto"),
  cod: z.string().min(1, "Código obrigatório"),
  curso_cod: z.string().min(1, "Código do curso obrigatório"),
});

export type TurmaRowParsed = z.output<typeof TurmaRowSchema>;

// ---------------------------------------------------------------------------
// Tipos de resultado
// ---------------------------------------------------------------------------

export interface ParsedRow<T> {
  row: number;
  data: T | null;
  errors: string[];
  raw: Record<string, string>;
}

export interface ParseResult<T> {
  valid: ParsedRow<T>[];
  invalid: ParsedRow<T>[];
  all: ParsedRow<T>[];
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const ALUNO_TEMPLATE_HEADERS = [
  "nome",
  "email_aluno",
  "email_responsavel",
  "idade",
  "turma_cod",
];

export const TURMA_TEMPLATE_HEADERS = ["nome", "cod", "curso_cod"];

export function generateAlunoTemplate(): string {
  const header = ALUNO_TEMPLATE_HEADERS.join(",");
  const example = "Maria Silva,maria@escola.com,mae@email.com,12,T2024A";
  return `${header}\n${example}\n`;
}

export function generateTurmaTemplate(): string {
  const header = TURMA_TEMPLATE_HEADERS.join(",");
  const example = "Turma A — 2024,T2024A,FUNDAMENTAL2";
  return `${header}\n${example}\n`;
}

export function downloadTemplate(type: "alunos" | "turmas") {
  const content = type === "alunos" ? generateAlunoTemplate() : generateTurmaTemplate();
  const filename = `template-${type}.csv`;
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

function parseCsv<T>(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<T, any, any>,
): ParseResult<T> {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const all: ParsedRow<T>[] = result.data.map((raw, i) => {
    const parsed = schema.safeParse(raw);
    if (parsed.success) {
      return { row: i + 2, data: parsed.data, errors: [], raw };
    }
    return {
      row: i + 2,
      data: null,
      errors: parsed.error.issues.map(
        (e) => `${String(e.path.join(".") || "campo")}: ${e.message}`,
      ),
      raw,
    };
  });

  return {
    all,
    valid: all.filter((r) => r.errors.length === 0),
    invalid: all.filter((r) => r.errors.length > 0),
  };
}

export function parseAlunoCsv(text: string): ParseResult<AlunoRowParsed> {
  return parseCsv<AlunoRowParsed>(text, AlunoRowSchema);
}

export function parseTurmaCsv(text: string): ParseResult<TurmaRowParsed> {
  return parseCsv<TurmaRowParsed>(text, TurmaRowSchema);
}

// ---------------------------------------------------------------------------
// Upsert em chunks
// ---------------------------------------------------------------------------

export interface ImportProgress {
  done: number;
  total: number;
  errors: number;
}

type ProgressCallback = (p: ImportProgress) => void;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function importAlunos(
  rows: AlunoRowParsed[],
  onProgress?: ProgressCallback,
): Promise<{ done: number; errors: number }> {
  const projectId = requireProjectIdForWrite() ?? getCurrentProjectId();
  if (!projectId) throw new Error("Nenhum projeto ativo. Selecione um projeto.");

  await turmasStore.ensureInit();
  const turmas = turmasStore.getAll();
  const turmasByCod = new Map(turmas.map((t) => [t.cod.toLowerCase(), t.id]));

  let done = 0;
  let errors = 0;
  const chunks = chunk(rows, 50);

  for (const batch of chunks) {
    const insertRows = batch.map((r) => {
      const turmaId = r.turma_cod ? (turmasByCod.get(r.turma_cod.toLowerCase()) ?? null) : null;
      return {
        nome: r.nome,
        email: r.email_aluno || null,
        contato_resp: r.email_responsavel || null,
        idade: r.idade ?? null,
        turma_id: turmaId,
        project_id: projectId,
      };
    });

    const { error } = await supabase.from("alunos").insert(insertRows);
    if (error) {
      console.error("[csv-import] alunos batch error", error);
      errors += batch.length;
    } else {
      done += batch.length;
    }
    onProgress?.({ done: done + errors, total: rows.length, errors });
  }

  // Força reload do store
  void alunosStore.ensureInit();

  return { done, errors };
}

export async function importTurmas(
  rows: TurmaRowParsed[],
  onProgress?: ProgressCallback,
): Promise<{ done: number; errors: number }> {
  const projectId = requireProjectIdForWrite() ?? getCurrentProjectId();
  if (!projectId) throw new Error("Nenhum projeto ativo. Selecione um projeto.");

  const { data: cursoRows } = await supabase
    .from("cursos")
    .select("id, cod")
    .eq("project_id", projectId);

  const cursosByCod = new Map(
    (cursoRows ?? []).map((c: { id: string; cod: string }) => [c.cod.toLowerCase(), c.id]),
  );

  let done = 0;
  let errors = 0;
  const today = new Date().toISOString().slice(0, 10);
  const chunks = chunk(rows, 50);

  for (const batch of chunks) {
    const insertRows = batch
      .map((r) => {
        const cursoId = cursosByCod.get(r.curso_cod.toLowerCase());
        if (!cursoId) return null;
        return {
          nome: r.nome,
          cod: r.cod,
          curso_id: cursoId,
          data: today,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          horarios: [] as any,
          project_id: projectId,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const skipped = batch.length - insertRows.length;
    errors += skipped;

    if (insertRows.length > 0) {
      const { error } = await supabase.from("turmas").insert(insertRows);
      if (error) {
        console.error("[csv-import] turmas batch error", error);
        errors += insertRows.length;
      } else {
        done += insertRows.length;
      }
    }
    onProgress?.({ done: done + errors, total: rows.length, errors });
  }

  return { done, errors };
}

// ---------------------------------------------------------------------------
// Export alunos atuais como CSV (B2.5)
// ---------------------------------------------------------------------------

export async function exportAlunosCsv(projectId: string): Promise<void> {
  const { data, error } = await supabase
    .from("alunos")
    .select("nome, email, contato_resp, idade, turma_id, turmas(cod)")
    .eq("project_id", projectId)
    .order("nome");

  if (error) throw error;

  type Row = {
    nome: string;
    email: string | null;
    contato_resp: string | null;
    idade: number | null;
    turma_id: string | null;
    turmas: { cod: string } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headers = ALUNO_TEMPLATE_HEADERS;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [r.nome, r.email, r.contato_resp, r.idade, r.turmas?.cod ?? r.turma_id].map(escape).join(","),
    ),
  ];

  const csv = lines.join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
