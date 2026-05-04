// Domain types for the academic management system.

export type AtividadeTipo = 0 | 1; // 0 = Aula, 1 = Tarefa

export interface Habilidade {
  id: string;
  sigla: string;
  /** Nome curto/título da habilidade (ex.: "Disciplina e foco sustentado"). */
  nome?: string;
  descricao: string;
  grupo?: string;
}

export interface Curso {
  id: string;
  cod: string;
  nome: string;
  descricao?: string;
  /** Carga horária total prevista do curso, em minutos. 0 = não controlada. */
  cargaHorariaTotalMin?: number;
  /** Duração padrão de uma aula deste curso, em minutos. Default 60. */
  duracaoAulaMin?: number;
  /**
   * Duração do turno diário de aula (em minutos). Define o tamanho de cada
   * slot semanal da turma. O turno é dividido em N blocos de duracaoAulaMin.
   * Ex.: 150 (2h30) com duracaoAulaMin=75 (1h15) → 2 aulas por dia.
   */
  turnoDiarioMin?: number;
  /** Habilidades gerais do curso (ids). Apresentadas como característica do curso. */
  habilidadeIds?: string[];
}

/** Limite rígido de habilidades por atividade. */
export const MAX_HABILIDADES_POR_ATIVIDADE = 5;
/** Limite rígido de habilidades por curso. */
export const MAX_HABILIDADES_POR_CURSO = 8;

/** Duração padrão de uma aula quando o curso não define `duracaoAulaMin`. */
export const DEFAULT_AULA_MINUTES = 60;

/** Milissegundos por hora — usado nos cálculos de janela de relatório. */
export const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Horas após o fim do slot durante as quais o professor ainda pode registrar
 * o relatório. Altera o estado do slot de "atrasado" para "expirado".
 */
export const REPORT_DEADLINE_HOURS = 24;

/** Helpers de carga horária / blocos. */
export function getDuracaoAulaMin(curso: Pick<Curso, "duracaoAulaMin">): number {
  const v = curso.duracaoAulaMin ?? 0;
  return v > 0 ? v : DEFAULT_AULA_MINUTES;
}

/** Duração do turno diário (em minutos). Default = duracaoAulaMin. */
export function getTurnoDiarioMin(curso: Pick<Curso, "turnoDiarioMin" | "duracaoAulaMin">): number {
  const v = curso.turnoDiarioMin ?? 0;
  return v > 0 ? v : getDuracaoAulaMin(curso);
}

/** Soma minutos a um horário "HH:MM" e retorna "HH:MM". */
export function addMinutesToHHMM(hhmm: string, addMin: number): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const total = h * 60 + m + addMin;
  const hh = Math.floor(total / 60) % 24;
  const mm = ((total % 60) + 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Quantas aulas (blocos) cabem num turno do curso. */
export function blocosPorTurno(curso: Pick<Curso, "turnoDiarioMin" | "duracaoAulaMin">): number {
  const turno = getTurnoDiarioMin(curso);
  const aula = getDuracaoAulaMin(curso);
  if (aula <= 0) return 1;
  return Math.max(1, Math.floor(turno / aula));
}

/** Duração de um slot da turma em minutos. */
export function slotDuracaoMin(slot: Pick<HorarioSlot, "inicio" | "fim">): number {
  const [hi, mi] = slot.inicio.split(":").map((n) => parseInt(n, 10));
  const [hf, mf] = slot.fim.split(":").map((n) => parseInt(n, 10));
  return hf * 60 + mf - (hi * 60 + mi);
}

/** Quantos blocos cabem num slot (arredonda pra baixo). */
export function slotBlocosCount(
  slot: Pick<HorarioSlot, "inicio" | "fim">,
  duracaoAulaMin: number,
): number {
  if (duracaoAulaMin <= 0) return 1;
  return Math.max(1, Math.floor(slotDuracaoMin(slot) / duracaoAulaMin));
}

/** Hora de início do bloco N dentro do slot (HH:MM). */
export function blocoInicio(
  slot: Pick<HorarioSlot, "inicio">,
  blocoIndex: number,
  duracaoAulaMin: number,
): string {
  const [hi, mi] = slot.inicio.split(":").map((n) => parseInt(n, 10));
  const total = hi * 60 + mi + blocoIndex * duracaoAulaMin;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Hora de fim do bloco N (início + duracao). */
export function blocoFim(
  slot: Pick<HorarioSlot, "inicio">,
  blocoIndex: number,
  duracaoAulaMin: number,
): string {
  return blocoInicio(slot, blocoIndex + 1, duracaoAulaMin);
}

/** Quantos blocos uma atividade consome. 0 → 0 (livre, não bloqueia). */
export function atividadeBlocos(cargaHorariaMin: number, duracaoAulaMin: number): number {
  if (!cargaHorariaMin || cargaHorariaMin <= 0) return 0;
  return Math.max(1, Math.ceil(cargaHorariaMin / duracaoAulaMin));
}

/** Formata minutos como "1h15" ou "45min". */
export function formatMinutos(min: number): string {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

// ---------- Grupo / Módulo ----------
// Cada curso tem um conjunto de grupos (módulos). O `cod` é usado na
// composição do código da atividade: `<CURSO_COD><GRUPO_COD><NN>`.
export interface Grupo {
  cod: string;
  nome: string;
}

/**
 * Resolve o nome do grupo (módulo) a partir do cod, dentro de um curso.
 * @param grupos Mapa de grupos por chave de curso (`curso.cod`).
 * @param cursoKey Chave do curso usada como índice do mapa — é `curso.cod`,
 *   NÃO `curso.id`.
 * @param grupoCod Código do grupo a procurar.
 */
export function getGrupoNome(
  grupos: Record<string, Grupo[]>,
  cursoKey: string,
  grupoCod: string,
): string {
  return grupos[cursoKey]?.find((g) => g.cod === grupoCod)?.nome ?? grupoCod;
}

/** Gera código de atividade no padrão `<CURSO><GRUPO><NN>`. */
export function formatCodigoAtividade(cursoCod: string, grupoCod: string, seq: number): string {
  return `${cursoCod}${grupoCod}${String(seq).padStart(2, "0")}`;
}

// ---------- Horários ----------

export type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

export const DIAS_SEMANA: { value: DiaSemana; label: string; full: string }[] = [
  { value: "seg", label: "Seg", full: "Segunda-feira" },
  { value: "ter", label: "Ter", full: "Terça-feira" },
  { value: "qua", label: "Qua", full: "Quarta-feira" },
  { value: "qui", label: "Qui", full: "Quinta-feira" },
  { value: "sex", label: "Sex", full: "Sexta-feira" },
  { value: "sab", label: "Sáb", full: "Sábado" },
  { value: "dom", label: "Dom", full: "Domingo" },
];

export interface HorarioSlot {
  diaSemana: DiaSemana;
  inicio: string; // "HH:MM"
  fim: string; // "HH:MM"
}

export function formatHorarioSlot(slot: HorarioSlot): string {
  const dia = DIAS_SEMANA.find((d) => d.value === slot.diaSemana)?.label ?? "";
  return `${dia} ${slot.inicio}–${slot.fim}`;
}

export function formatHorarios(slots: HorarioSlot[]): string {
  if (!slots?.length) return "—";
  return slots.map(formatHorarioSlot).join(" · ");
}

// JS getDay() => 0=dom..6=sab; mapeia para DiaSemana
export function diaSemanaFromDate(date: Date): DiaSemana {
  const map: DiaSemana[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  return map[date.getDay()];
}

// ---------- Turma ----------

export interface Turma {
  id: string;
  cursoId: string;
  nome: string;
  cod: string;
  data: string; // ISO date — referência da turma
  horarios: HorarioSlot[]; // encontros semanais
  alunosIds: string[];
  descricao?: string;
}

// ---------- Aluno ----------

export interface RegistroAula {
  atividadeId: string;
  presente: boolean;
  observacao?: string;
}

export interface RegistroTrabalho {
  atividadeId: string;
  entregue: boolean;
  nota?: number;
  observacao?: string;
}

export interface Aluno {
  id: string;
  nome: string;
  idade?: number;
  contato: string;
  /** CPF do aluno — opcional, usado para identificação documental */
  cpf?: string;
  cursoId: string;
  turmaId: string;
  habilidadeIds: string[];
  aulas: RegistroAula[];
  trabalhos: RegistroTrabalho[];
  responsavel?: string;
  contatoResp?: string;
  observacao?: string;
}

// ---------- Atividade (template) ----------

/** Perfis que podem visualizar um campo da atividade. */
export type PerfilAcesso = "professor" | "coordenacao" | "aluno" | "pais";

/** Nível-alvo por habilidade para uma aula (escala 1-5 do diagnóstico). */
export interface HabilidadeNivelAlvo {
  habilidadeId: string;
  nivelAlvo: number; // 1..5
}

/** Bloco do roteiro da aula. */
export interface RoteiroBloco {
  id: string;
  titulo: string;
  duracaoMin?: number;
  descricao?: string;
}

/** Material/recurso da aula. */
export interface MaterialAula {
  id: string;
  tipo: "link" | "arquivo" | "software" | "fisico";
  titulo: string;
  url?: string;
  observacao?: string;
}

/** Critério/rubrica de avaliação. */
export interface CriterioAvaliacao {
  id: string;
  descricao: string;
  peso?: number; // opcional
}

/** Configuração de quais formulários a aula dispara. */
export interface FormulariosConfig {
  relatorioProfessor: boolean; // default true
  autoavaliacaoAluno: boolean;
  diagnosticoPre: boolean; // 1ª aula do módulo
  diagnosticoPos: boolean; // última aula do módulo
  perfilAluno: boolean; // disparo manual
}

export interface Atividade {
  id: string;
  tipo: AtividadeTipo;
  nome: string;
  codigo: string; // <CURSO_COD><GRUPO_COD><NN> — ex.: GPCA01
  cursoId: string;
  grupo: string; // cod do grupo (módulo) — ex.: "CA", "GERAL"
  descricao: string;
  objetivoResultados: string;
  prazo: string; // ISO date (referência didática)
  criadoPor: string;
  professor: string; // professor responsável pela atividade (string para compatibilidade)
  /** FK direta para auth.users.id — fonte de verdade do professor. */
  professorUserId?: string;
  habilidadeIds: string[];

  // Aula-only — básico (legado)
  descricaoConteudo?: string;
  sugestoesPais?: string;

  // Aula-only — Pedagógico (novo)
  resultadosEsperados?: string; // benefícios para alunos/pais/instituição
  notasInstrutor?: string; // linguagem, mediação, sensibilidade, conexão família, registro
  preRequisitos?: string; // texto livre / códigos
  niveisAlvo?: HabilidadeNivelAlvo[];
  criteriosSucesso?: string; // o que o aluno deve conseguir fazer

  // Aula-only — Conteúdo & Materiais (novo)
  metodologias?: string; // abordagens/métodos pedagógicos
  roteiro?: RoteiroBloco[];
  materiais?: MaterialAula[];
  referencias?: string; // links/textos

  // Aula-only — Avaliação & Formulários (novo)
  formularios?: FormulariosConfig;
  rubricas?: CriterioAvaliacao[];

  // Tarefa-only
  instrucoes?: string;

  /** Carga horária (em minutos) que a atividade consome ao ser agendada.
   *  0 ou ausente → "livre", não consome blocos do slot. */
  cargaHorariaMin?: number;
}

/** Default seguro para FormulariosConfig (relatório do professor sempre ligado). */
export const DEFAULT_FORMULARIOS: FormulariosConfig = {
  relatorioProfessor: true,
  autoavaliacaoAluno: false,
  diagnosticoPre: false,
  diagnosticoPos: false,
  perfilAluno: false,
};

/** Visibilidade padrão de cada campo da Aula por perfil. */
export const FIELD_VISIBILITY: Record<string, PerfilAcesso[]> = {
  // Identificação
  nome: ["professor", "coordenacao", "aluno", "pais"],
  codigo: ["professor", "coordenacao"],
  professor: ["professor", "coordenacao", "aluno", "pais"],
  prazo: ["professor", "coordenacao", "aluno", "pais"],
  descricao: ["professor", "coordenacao", "aluno", "pais"],
  cargaHorariaMin: ["professor", "coordenacao", "aluno", "pais"],
  // Pedagógico
  objetivoResultados: ["professor", "coordenacao", "aluno", "pais"],
  resultadosEsperados: ["professor", "coordenacao", "aluno", "pais"],
  notasInstrutor: ["professor", "coordenacao"],
  habilidadeIds: ["professor", "coordenacao"],
  niveisAlvo: ["professor", "coordenacao"],
  preRequisitos: ["professor", "coordenacao"],
  criteriosSucesso: ["professor", "coordenacao", "aluno"],
  // Conteúdo & Materiais
  descricaoConteudo: ["professor", "coordenacao", "aluno", "pais"],
  metodologias: ["professor", "coordenacao"],
  roteiro: ["professor", "coordenacao"],
  materiais: ["professor", "coordenacao", "aluno"],
  referencias: ["professor", "coordenacao", "aluno"],
  // Avaliação & Formulários
  formularios: ["professor", "coordenacao"],
  rubricas: ["professor", "coordenacao"],
  // Pais
  sugestoesPais: ["professor", "coordenacao", "pais"],
};

// ---------- Agendamento ----------
// Atribuição de uma ou mais atividades de um curso a uma turma,
// para uma data e slot específicos.

export type StatusAgendamento = "pendente" | "concluido";

export interface Agendamento {
  id: string;
  turmaId: string;
  data: string; // ISO date "YYYY-MM-DD"
  diaSemana: DiaSemana;
  inicio: string; // "HH:MM" — início efetivo do agendamento (já considerando o bloco)
  fim: string; // "HH:MM" — fim efetivo (início + N blocos)
  atividadeIds: string[];
  status: StatusAgendamento;
  criadoEm: string;
  concluidoEm?: string;
  observacao?: string;
  /** Nome do professor (legado / display). Mantido para compatibilidade. */
  professor?: string;
  /** FK direta para auth.users.id — fonte de verdade do professor. */
  professorUserId?: string;
  criadoPorUserId?: string;
  criadoPorNome?: string;

  // ----- Blocos -----
  /** Índice do primeiro bloco ocupado dentro do slot da turma (0 = início). */
  blocoIndex?: number;
  /** Quantidade de blocos consecutivos consumidos neste agendamento. */
  blocosTotal?: number;
  /** Início do slot original da turma (usado p/ calcular ocupação). */
  slotInicio?: string;
  /** Fim do slot original da turma. */
  slotFim?: string;

  // ----- Multi-dia (atividade dividida em várias partes) -----
  /** Id que liga as várias partes da MESMA atividade em dias diferentes. */
  parteGrupoId?: string;
  /** Número desta parte (1-based). */
  parteNum?: number;
  /** Total de partes do grupo. */
  partesTotal?: number;
}

// ---------- Notificação ----------
export interface Notificacao {
  id: string;
  destinatarioTipo: "aluno" | "professor";
  destinatarioId: string; // alunoId ou nome do professor
  titulo: string;
  mensagem: string;
  cursoId: string;
  turmaId: string;
  data: string; // YYYY-MM-DD da aula
  inicio: string;
  fim: string;
  professor?: string;
  atividadeIds: string[];
  criadoEm: string;
  lida: boolean;
  /** marcador para evitar duplicatas geradas pelo varredor */
  kind?: "agendado" | "atrasado" | "expirado" | "concluido";
  /** id do agendamento de origem — usado para dedup no banco. */
  agendamentoId?: string;
}

// ---------- Helpers de janela "agendada" ----------
// Agendamento fica ativo do início do dia até 24h após o término do slot.
export function isAgendamentoAtivo(a: Agendamento, now: Date = new Date()): boolean {
  const expira = endSlotPlus24h(a);
  return now <= expira && a.status !== "concluido";
}

/** Data/hora exata do FIM do slot do agendamento */
export function endSlotDate(a: Pick<Agendamento, "data" | "fim">): Date {
  const [hh, mm] = a.fim.split(":").map((n) => parseInt(n, 10));
  const d = new Date(`${a.data}T00:00:00`);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** Fim do slot + REPORT_DEADLINE_HOURS — limite para registrar relatório */
export function endSlotPlus24h(a: Pick<Agendamento, "data" | "fim">): Date {
  return new Date(endSlotDate(a).getTime() + REPORT_DEADLINE_HOURS * MS_PER_HOUR);
}

/**
 * Estado visual de um slot (turma × data × horário) no calendário.
 * - vazio_passado: slot no passado sem agendamento → CINZA
 * - vazio_futuro: slot ≥ hoje sem agendamento → VERDE
 * - agendado: agendamento pendente, antes do fim do slot → DOCUMENTO
 * - atrasado: passou fim do slot, sem relatório, dentro de 24h → AMARELO
 * - expirado: +24h após fim, sem relatório → CINZA (desabilitado)
 * - concluido: relatório registrado → DOCUMENTO (com check)
 */
export type SlotEstado =
  | "vazio_passado"
  | "vazio_futuro"
  | "agendado"
  | "atrasado"
  | "expirado"
  | "concluido";

export function computeSlotEstado(
  data: string, // YYYY-MM-DD
  fim: string, // HH:MM
  agendamento: Agendamento | undefined,
  now: Date = new Date(),
): SlotEstado {
  if (!agendamento) {
    const slotEnd = endSlotDate({ data, fim });
    return now > slotEnd ? "vazio_passado" : "vazio_futuro";
  }
  if (agendamento.status === "concluido") return "concluido";
  const slotEnd = endSlotDate(agendamento);
  const slotEnd24 = endSlotPlus24h(agendamento);
  if (now <= slotEnd) return "agendado";
  if (now <= slotEnd24) return "atrasado";
  return "expirado";
}
