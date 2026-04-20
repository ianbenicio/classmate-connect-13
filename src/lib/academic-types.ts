// Domain types for the academic management system.

export type AtividadeTipo = 0 | 1; // 0 = Aula, 1 = Tarefa

export interface Habilidade {
  id: string;
  sigla: string;
  descricao: string;
  grupo?: string;
}

export interface Curso {
  id: string;
  cod: string;
  nome: string;
  descricao?: string;
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
  contato: string;
  cursoId: string;
  turmaId: string;
  habilidadeIds: string[];
  aulas: RegistroAula[];
  trabalhos: RegistroTrabalho[];
  observacao?: string;
}

// ---------- Atividade (template) ----------

export interface Atividade {
  id: string;
  tipo: AtividadeTipo;
  nome: string;
  codigo: string; // SIGLA_CURSO + GRUPO + sequencial
  cursoId: string;
  grupo: string;
  descricao: string;
  objetivoResultados: string;
  prazo: string; // ISO date (referência didática)
  criadoPor: string;
  professor: string; // professor responsável pela atividade
  habilidadeIds: string[];

  // Aula-only
  descricaoConteudo?: string;
  sugestoesPais?: string;

  // Tarefa-only
  instrucoes?: string;
}

// ---------- Agendamento ----------
// Atribuição de uma ou mais atividades de um curso a uma turma,
// para uma data e slot específicos.

export type StatusAgendamento = "pendente" | "concluido";

export interface Agendamento {
  id: string;
  turmaId: string;
  data: string; // ISO date "YYYY-MM-DD"
  diaSemana: DiaSemana;
  inicio: string; // "HH:MM"
  fim: string; // "HH:MM"
  atividadeIds: string[];
  status: StatusAgendamento;
  criadoEm: string; // ISO datetime
  concluidoEm?: string; // ISO datetime
  observacao?: string;
  professor?: string; // snapshot do professor responsável
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
}

// ---------- Helpers de janela "agendada" ----------
// Agendamento fica ativo do início do dia até 24h após o término do slot.
export function isAgendamentoAtivo(a: Agendamento, now: Date = new Date()): boolean {
  const [hh, mm] = a.fim.split(":").map((n) => parseInt(n, 10));
  const fimDate = new Date(`${a.data}T00:00:00`);
  fimDate.setHours(hh, mm, 0, 0);
  const expira = new Date(fimDate.getTime() + 24 * 60 * 60 * 1000);
  return now <= expira && a.status !== "concluido";
}
