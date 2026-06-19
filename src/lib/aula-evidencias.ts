import type { Agendamento, Atividade, Curso, Habilidade, Turma } from "./academic-types";
import { pathSafe } from "./drive-pattern";

export type AulaEvidenciaTipo = "plano_aula" | "chamada_arquivo";

export type AulaEvidenciaStatus =
  | "pendente"
  | "encontrado"
  | "valido"
  | "invalido"
  | "aprovado_manual";

export interface PlanoAulaDados {
  objetivos: string;
  conteudoEmenta: string;
  preparacaoProfessor: string;
  roteiro: string;
  materiais: string;
  habilidadesIds: string[];
  habilidades: string;
  formaAvaliacao: string;
  observacoesProfessor: string;
  sugestaoPais: string;
}

export interface AulaRegistroDados {
  documentoTipo: "plano_aula_interno";
  codigoAula: string;
  dataAula: string;
  inicio: string;
  fim: string;
  professorTag?: string;
  professorUserId?: string;
  cursoCodigo: string;
  cursoNome: string;
  turmaCodigo: string;
  turmaNome: string;
  versao: number;
}

export type AulaEvidenciaDados =
  | (Partial<PlanoAulaDados> & Partial<AulaRegistroDados> & Record<string, unknown>)
  | Record<string, unknown>;

export interface AulaEvidencia {
  id: string;
  agendamentoId: string;
  tipo: AulaEvidenciaTipo;
  status: AulaEvidenciaStatus;
  arquivoNome?: string;
  arquivoMimeType?: string;
  arquivoUrl?: string;
  driveFileId?: string;
  driveFolderId?: string;
  submetidoPorUserId?: string;
  submetidoPorNome?: string;
  aprovadoPorUserId?: string;
  aprovadoEm?: string;
  verificadoEm?: string;
  observacao?: string;
  dados?: AulaEvidenciaDados;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface AulaEvidenciaContext {
  curso: Pick<Curso, "cod" | "nome">;
  turma: Pick<Turma, "cod" | "nome">;
  agendamento: Pick<
    Agendamento,
    "id" | "data" | "inicio" | "fim" | "atividadeIds" | "professor" | "professorUserId"
  >;
  atividades: Pick<
    Atividade,
    | "id"
    | "codigo"
    | "nome"
    | "descricao"
    | "descricaoConteudo"
    | "objetivoResultados"
    | "roteiro"
    | "materiais"
    | "habilidadeIds"
    | "rubricas"
    | "sugestoesPais"
    | "criteriosSucesso"
  >[];
}

export interface EvidenciaArquivoCandidato {
  name: string;
  mimeType?: string;
}

export interface AulaConformidadeInput {
  evidencias: AulaEvidencia[];
  relatorioProfessorRegistrado: boolean;
  chamadaDigitalRegistrada: boolean;
  relatoriosAlunoRespondidos: number;
  relatoriosAlunoEsperados: number;
  checklistsRespondidos: number;
  checklistsEsperados: number;
}

export interface AulaConformidadeResumo {
  completa: boolean;
  planoOk: boolean;
  chamadaArquivoOk: boolean;
  chamadaDigitalOk: boolean;
  relatorioProfessorOk: boolean;
  relatorioAlunoOk: boolean;
  checklistOk: boolean;
  pendencias: string[];
}

const PLANO_MIME_TYPES = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const CHAMADA_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

const VALID_STATUS = new Set<AulaEvidenciaStatus>(["valido", "aprovado_manual"]);

export const AULA_EVIDENCIAS_OBRIGATORIAS: AulaEvidenciaTipo[] = ["plano_aula", "chamada_arquivo"];

export function getAtividadePrincipal(ctx: AulaEvidenciaContext) {
  return (
    ctx.agendamento.atividadeIds
      .map((id) => ctx.atividades.find((a) => a.id === id))
      .find(Boolean) ?? null
  );
}

export function getCodigoAula(ctx: AulaEvidenciaContext): string {
  return getAtividadePrincipal(ctx)?.codigo ?? "AULA";
}

export function getPastaAulaDrivePath(ctx: AulaEvidenciaContext): string {
  const curso = pathSafe(ctx.curso.cod || ctx.curso.nome || "curso");
  const turma = pathSafe(ctx.turma.cod || ctx.turma.nome || "turma");
  const aula = pathSafe(`${getCodigoAula(ctx)}_${ctx.agendamento.data}`);
  return `${curso}/${turma}/${aula}/${ctx.agendamento.id}/`;
}

export function getNomeBaseEvidencia(ctx: AulaEvidenciaContext, tipo: AulaEvidenciaTipo): string {
  const suffix = tipo === "plano_aula" ? "plano-aula" : "chamada";
  return `${pathSafe(getCodigoAula(ctx))}_${ctx.agendamento.data}_${suffix}`;
}

export function getNomesEsperadosEvidencia(
  ctx: AulaEvidenciaContext,
  tipo: AulaEvidenciaTipo,
): string[] {
  const base = getNomeBaseEvidencia(ctx, tipo);
  if (tipo === "plano_aula") return [base, `${base}.docx`];
  return [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.pdf`];
}

export function getExtensaoChamadaArquivo(file: EvidenciaArquivoCandidato): string | null {
  const name = file.name.trim().toLowerCase();
  const ext = name.match(/\.([a-z0-9]+)$/)?.[1];
  const mime = file.mimeType?.toLowerCase();

  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return ext === "jpeg" ? "jpeg" : "jpg";

  if (ext && ["jpg", "jpeg", "png", "pdf"].includes(ext)) return ext;
  return null;
}

export function getNomeArquivoChamadaUpload(
  ctx: AulaEvidenciaContext,
  file: EvidenciaArquivoCandidato,
): string {
  const ext = getExtensaoChamadaArquivo(file) ?? "jpg";
  return `${getNomeBaseEvidencia(ctx, "chamada_arquivo")}.${ext}`;
}

export function getPrazoPlanoAula(ctx: AulaEvidenciaContext): Date {
  const start = new Date(`${ctx.agendamento.data}T${ctx.agendamento.inicio}:00`);
  return new Date(start.getTime() - 2 * 60 * 60 * 1000);
}

export function isPlanoAulaAtrasado(ctx: AulaEvidenciaContext, now: Date = new Date()): boolean {
  return now > getPrazoPlanoAula(ctx);
}

export function validarArquivoEvidencia(
  ctx: AulaEvidenciaContext,
  tipo: AulaEvidenciaTipo,
  file: EvidenciaArquivoCandidato,
): { valido: boolean; motivo?: string } {
  const expectedNames = getNomesEsperadosEvidencia(ctx, tipo).map((n) => n.toLowerCase());
  const name = file.name.trim().toLowerCase();
  if (!expectedNames.includes(name)) {
    return {
      valido: false,
      motivo: `Nome esperado: ${getNomesEsperadosEvidencia(ctx, tipo).join(" ou ")}`,
    };
  }

  const mime = file.mimeType?.toLowerCase();
  if (!mime) return { valido: true };

  if (tipo === "plano_aula" && !PLANO_MIME_TYPES.has(mime)) {
    return { valido: false, motivo: "Plano de aula deve ser Google Docs ou DOCX." };
  }
  if (tipo === "chamada_arquivo" && !CHAMADA_MIME_TYPES.has(mime)) {
    return { valido: false, motivo: "Chamada deve ser JPG, PNG ou PDF." };
  }
  return { valido: true };
}

export function evidenciaEstaValida(evidencia?: AulaEvidencia): boolean {
  return !!evidencia && VALID_STATUS.has(evidencia.status);
}

export function getEvidenciaPorTipo(
  evidencias: AulaEvidencia[],
  tipo: AulaEvidenciaTipo,
): AulaEvidencia | undefined {
  return evidencias
    .filter((e) => e.tipo === tipo)
    .sort((a, b) => (b.atualizadoEm ?? "").localeCompare(a.atualizadoEm ?? ""))[0];
}

export function resumirConformidadeAula(input: AulaConformidadeInput): AulaConformidadeResumo {
  const planoOk = evidenciaEstaValida(getEvidenciaPorTipo(input.evidencias, "plano_aula"));
  const chamadaArquivoOk = evidenciaEstaValida(
    getEvidenciaPorTipo(input.evidencias, "chamada_arquivo"),
  );
  const chamadaDigitalOk = input.chamadaDigitalRegistrada;
  const relatorioProfessorOk = input.relatorioProfessorRegistrado;
  const relatorioAlunoOk =
    input.relatoriosAlunoEsperados <= 0 ||
    input.relatoriosAlunoRespondidos >= input.relatoriosAlunoEsperados;
  const checklistOk =
    input.checklistsEsperados <= 0 || input.checklistsRespondidos >= input.checklistsEsperados;

  const pendencias: string[] = [];
  if (!planoOk) pendencias.push("Plano de aula valido pendente");
  if (!chamadaDigitalOk) pendencias.push("Chamada digital pendente");
  if (!chamadaArquivoOk) pendencias.push("Arquivo/foto da chamada pendente");
  if (!relatorioProfessorOk) pendencias.push("Relatorio do professor pendente");
  if (!relatorioAlunoOk) {
    pendencias.push(
      `Relatorio do aluno incompleto (${input.relatoriosAlunoRespondidos}/${input.relatoriosAlunoEsperados})`,
    );
  }
  if (!checklistOk) {
    pendencias.push(
      `Checklists incompletos (${input.checklistsRespondidos}/${input.checklistsEsperados})`,
    );
  }

  return {
    completa:
      planoOk &&
      chamadaArquivoOk &&
      chamadaDigitalOk &&
      relatorioProfessorOk &&
      relatorioAlunoOk &&
      checklistOk,
    planoOk,
    chamadaArquivoOk,
    chamadaDigitalOk,
    relatorioProfessorOk,
    relatorioAlunoOk,
    checklistOk,
    pendencias,
  };
}

export function montarDadosDocumentoEstudo(
  ctx: AulaEvidenciaContext,
  plano: PlanoAulaDados,
  submetidoPorNome?: string | null,
): AulaEvidenciaDados {
  return {
    ...plano,
    documentoTipo: "plano_aula_interno",
    codigoAula: getCodigoAula(ctx),
    dataAula: ctx.agendamento.data,
    inicio: ctx.agendamento.inicio,
    fim: ctx.agendamento.fim,
    professorTag: ctx.agendamento.professor ?? submetidoPorNome ?? undefined,
    professorUserId: ctx.agendamento.professorUserId,
    cursoCodigo: ctx.curso.cod,
    cursoNome: ctx.curso.nome,
    turmaCodigo: ctx.turma.cod,
    turmaNome: ctx.turma.nome,
    versao: 1,
  };
}

function normalizarTextoBusca(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function textoContemTermo(texto: string, termo: string | undefined | null): boolean {
  const normalized = normalizarTextoBusca(termo).trim();
  if (normalized.length < 2) return false;
  return texto.includes(normalized);
}

export function inferirHabilidadesIdsDoPlano(
  ctx: AulaEvidenciaContext,
  habilidades: Pick<Habilidade, "id" | "sigla" | "nome" | "descricao">[],
  plano?: Pick<PlanoAulaDados, "conteudoEmenta" | "habilidades">,
): string[] {
  const idsDaAula = new Set(
    ctx.agendamento.atividadeIds
      .map((id) => ctx.atividades.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .flatMap((a) => a.habilidadeIds ?? []),
  );

  const textoPlano = normalizarTextoBusca(
    [
      plano?.conteudoEmenta,
      plano?.habilidades,
      ...ctx.atividades.map((a) => a.descricaoConteudo || a.descricao),
    ].join("\n"),
  );

  for (const habilidade of habilidades) {
    if (
      textoContemTermo(textoPlano, habilidade.sigla) ||
      textoContemTermo(textoPlano, habilidade.nome) ||
      textoContemTermo(textoPlano, habilidade.descricao)
    ) {
      idsDaAula.add(habilidade.id);
    }
  }

  return Array.from(idsDaAula);
}

export function montarPlanoAulaInicial(ctx: AulaEvidenciaContext): PlanoAulaDados {
  const atividades = ctx.agendamento.atividadeIds
    .map((id) => ctx.atividades.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  const join = (values: Array<string | undefined>) =>
    values
      .map((v) => v?.trim())
      .filter((v): v is string => !!v)
      .join("\n\n---\n\n");

  const materiais = atividades.flatMap((a) =>
    (a.materiais ?? []).map((m) => [m.titulo, m.url, m.observacao].filter(Boolean).join(" - ")),
  );
  const roteiro = atividades.flatMap((a) =>
    (a.roteiro ?? []).map((r) =>
      [r.titulo, r.duracaoMin ? `${r.duracaoMin}min` : "", r.descricao].filter(Boolean).join(" - "),
    ),
  );
  const rubricas = atividades.flatMap((a) => (a.rubricas ?? []).map((r) => r.descricao));
  const habilidadesIds = Array.from(new Set(atividades.flatMap((a) => a.habilidadeIds ?? [])));

  return {
    objetivos: join(atividades.map((a) => a.objetivoResultados)) || "",
    conteudoEmenta: join(atividades.map((a) => a.descricaoConteudo || a.descricao)) || "",
    preparacaoProfessor: "",
    roteiro: roteiro.join("\n") || join(atividades.map((a) => a.criteriosSucesso)) || "",
    materiais: materiais.join("\n"),
    habilidadesIds,
    habilidades: join(atividades.map((a) => a.metodologias || a.criteriosSucesso)) || "",
    formaAvaliacao: rubricas.join("\n") || join(atividades.map((a) => a.criteriosSucesso)) || "",
    observacoesProfessor: "",
    sugestaoPais: join(atividades.map((a) => a.sugestoesPais || a.descricao)) || "",
  };
}
