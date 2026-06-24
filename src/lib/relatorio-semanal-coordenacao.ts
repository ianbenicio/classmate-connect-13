import type {
  Agendamento,
  Aluno,
  Atividade,
  Curso,
  Habilidade,
  Notificacao,
  Turma,
} from "./academic-types";
import { agendamentoDispensaRequisitos, isAtividadeAvulsa } from "./academic-types";
import type { AulaEvidencia } from "./aula-evidencias";
import type { AvaliacaoRecord } from "./avaliacoes-types";
import type {
  ChecklistAlunoDados,
  RelatorioAlunoDados,
  RelatorioProfessorDados,
} from "./formularios-types";
import type { ProfessorAvaliacao } from "./professores-store";

export type RelatorioFrequencia = "semanal" | "quinzenal" | "mensal" | "personalizado";

export interface RelatorioCronogramaConfig {
  frequencia: RelatorioFrequencia;
  intervaloDias: number;
  anchorDate: string;
}

export interface RelatorioPeriodo {
  inicio: string;
  fim: string;
}

export interface RelatorioJanela extends RelatorioPeriodo {
  proximaGeracao: string;
  intervaloDias: number;
}

export interface ProfessorRelatorioInput {
  userId: string;
  displayName?: string;
  nome?: string;
  email?: string | null;
}

export interface RelatorioSemanalCoordenacaoInput {
  periodo: RelatorioPeriodo;
  cursos: Curso[];
  turmas: Turma[];
  alunos: Aluno[];
  atividades: Atividade[];
  agendamentos: Agendamento[];
  avaliacoes: AvaliacaoRecord[];
  evidencias: AulaEvidencia[];
  notificacoes: Notificacao[];
  professores: ProfessorRelatorioInput[];
  professorAvaliacoes: ProfessorAvaliacao[];
  habilidades: Habilidade[];
  geradoEm?: string;
}

export interface AulaConsolidada {
  agendamentoId: string;
  data: string;
  inicio: string;
  fim: string;
  cursoId: string;
  cursoCod: string;
  cursoNome: string;
  turmaId: string;
  turmaCod: string;
  turmaNome: string;
  professorUserId?: string;
  professorNome: string;
  atividadeCodigos: string[];
  atividadeNomes: string[];
  habilidades: string[];
  requisitosDispensados: boolean;
  planoRegistrado: boolean;
  planoValido: boolean;
  chamadaRegistrada: boolean;
  chamadaValida: boolean;
  relatorioProfessorRegistrado: boolean;
  relatoriosAlunoRespondidos: number;
  relatoriosAlunoEsperados: number;
  checklistsRespondidos: number;
  checklistsEsperados: number;
  presencas: number;
  faltas: number;
}

export interface ProfessorConsolidado {
  professorUserId: string;
  professorNome: string;
  aulasDadas: number;
  horasMin: number;
  horasFormatadas: string;
  relatoriosProfessor: number;
  relatoriosAluno: number;
  checklistsAluno: number;
  notificacoes: number;
  notificacoesNaoLidas: number;
  mediaAvaliacaoAlunos: number | null;
  mediaAvaliacaoDireta: number | null;
}

export interface AlunoConsolidado {
  alunoId: string;
  alunoNome: string;
  userId?: string;
  aulasEsperadas: number;
  presencas: number;
  faltas: number;
  frequenciaPct: number;
  relatoriosAluno: number;
  checklists: number;
  mediaHabilidades: number | null;
  habilidades: HabilidadeResumo[];
}

export interface HabilidadeResumo {
  habilidadeId: string;
  sigla: string;
  nome: string;
  media: number;
  avaliacoes: number;
}

export interface TurmaConsolidada {
  turmaId: string;
  turmaCod: string;
  turmaNome: string;
  alunosTotal: number;
  alunosComUsuario: number;
  alunosSemUsuario: number;
  aulasAgendadas: number;
  aulasFinalizadas: number;
  aulasComPlano: number;
  aulasComChamada: number;
  aulasComRelatorioProfessor: number;
  presencas: number;
  faltas: number;
  frequenciaPct: number;
  relatoriosAlunoPct: number;
  checklistsPct: number;
  progressoAulasPct: number;
  mediaHabilidades: number | null;
  habilidades: HabilidadeResumo[];
  alunos: AlunoConsolidado[];
  pendencias: string[];
}

export interface CursoConsolidado {
  cursoId: string;
  cursoCod: string;
  cursoNome: string;
  turmas: TurmaConsolidada[];
}

export interface RelatorioSemanalCoordenacaoPayload {
  tipo: "relatorio_consolidado_coordenacao";
  versao: 1;
  geradoEm: string;
  periodo: RelatorioPeriodo;
  resumo: {
    aulasFinalizadas: number;
    aulasAgendadas: number;
    aulasComPlano: number;
    aulasComChamada: number;
    aulasComRelatorioProfessor: number;
    relatoriosAluno: number;
    checklistsAluno: number;
    presencas: number;
    faltas: number;
    notificacoes: number;
    notificacoesNaoLidas: number;
    professoresComAula: number;
    cursos: number;
    turmas: number;
    alunos: number;
  };
  aulas: AulaConsolidada[];
  professores: ProfessorConsolidado[];
  cursos: CursoConsolidado[];
}

export const DEFAULT_RELATORIO_CRONOGRAMA: RelatorioCronogramaConfig = {
  frequencia: "semanal",
  intervaloDias: 7,
  anchorDate: "",
};

export function intervaloDiasRelatorio(config: RelatorioCronogramaConfig): number {
  if (config.frequencia === "semanal") return 7;
  if (config.frequencia === "quinzenal") return 14;
  if (config.frequencia === "mensal") return 30;
  return Math.max(1, Math.min(365, Math.round(config.intervaloDias || 7)));
}

export function calcularJanelaRelatorio(
  config: RelatorioCronogramaConfig,
  now: Date = new Date(),
): RelatorioJanela {
  const intervaloDias = intervaloDiasRelatorio(config);
  const fim = toIsoDate(now);
  const inicio = addDaysIso(fim, -(intervaloDias - 1));
  return {
    inicio,
    fim,
    proximaGeracao: addDaysIso(config.anchorDate || fim, intervaloDias),
    intervaloDias,
  };
}

export function gerarRelatorioSemanalCoordenacao({
  periodo,
  cursos,
  turmas,
  alunos,
  atividades,
  agendamentos,
  avaliacoes,
  evidencias,
  notificacoes,
  professores,
  professorAvaliacoes,
  habilidades,
  geradoEm = new Date().toISOString(),
}: RelatorioSemanalCoordenacaoInput): RelatorioSemanalCoordenacaoPayload {
  const cursoById = new Map(cursos.map((curso) => [curso.id, curso]));
  const turmaById = new Map(turmas.map((turma) => [turma.id, turma]));
  const atividadeById = new Map(atividades.map((atividade) => [atividade.id, atividade]));
  const habilidadeById = new Map(habilidades.map((habilidade) => [habilidade.id, habilidade]));
  const alunosByTurma = groupBy(alunos, (aluno) => aluno.turmaId);
  const avaliacoesByAgendamento = groupBy(
    avaliacoes.filter((avaliacao) => !!avaliacao.agendamentoId),
    (avaliacao) => avaliacao.agendamentoId ?? "",
  );
  const evidenciasByAgendamento = groupBy(evidencias, (evidencia) => evidencia.agendamentoId);

  const agendamentosPeriodo = agendamentos.filter((agendamento) =>
    inPeriodo(agendamento.data, periodo),
  );
  const aulasFinalizadas = agendamentosPeriodo.filter(
    (agendamento) => agendamento.status === "concluido",
  );
  const aulasComRequisitos = aulasFinalizadas.filter(
    (agendamento) => !agendamentoDispensaRequisitos(agendamento),
  );

  const aulas = aulasFinalizadas.map((agendamento) =>
    consolidarAula({
      agendamento,
      cursoById,
      turmaById,
      atividadeById,
      habilidadeById,
      alunosByTurma,
      avaliacoes: avaliacoesByAgendamento.get(agendamento.id) ?? [],
      evidencias: evidenciasByAgendamento.get(agendamento.id) ?? [],
    }),
  );

  const professoresOut = consolidarProfessores({
    professores,
    aulas: aulas.filter((aula) => !aula.requisitosDispensados),
    aulasFinalizadas: aulasComRequisitos,
    avaliacoes,
    notificacoes: notificacoes.filter((notificacao) =>
      inPeriodo(toIsoDateFromDateTime(notificacao.criadoEm), periodo),
    ),
    professorAvaliacoes: professorAvaliacoes.filter((avaliacao) =>
      inPeriodo(toIsoDateFromDateTime(avaliacao.criadoEm), periodo),
    ),
  });

  const cursosOut = cursos
    .map((curso) => {
      const turmasCurso = turmas.filter((turma) => turma.cursoId === curso.id);
      return {
        cursoId: curso.id,
        cursoCod: curso.cod,
        cursoNome: curso.nome,
        turmas: turmasCurso.map((turma) =>
          consolidarTurma({
            curso,
            turma,
            alunos: alunosByTurma.get(turma.id) ?? [],
            aulas: aulas.filter((aula) => aula.turmaId === turma.id),
            atividades,
            avaliacoes,
            habilidadeById,
          }),
        ),
      };
    })
    .filter((curso) => curso.turmas.length > 0);

  const resumo = {
    aulasFinalizadas: aulas.length,
    aulasAgendadas: agendamentosPeriodo.length,
    aulasComPlano: aulas.filter((aula) => aula.planoRegistrado).length,
    aulasComChamada: aulas.filter((aula) => aula.chamadaRegistrada).length,
    aulasComRelatorioProfessor: aulas.filter((aula) => aula.relatorioProfessorRegistrado).length,
    relatoriosAluno: sum(aulas, (aula) => aula.relatoriosAlunoRespondidos),
    checklistsAluno: sum(aulas, (aula) => aula.checklistsRespondidos),
    presencas: sum(aulas, (aula) => aula.presencas),
    faltas: sum(aulas, (aula) => aula.faltas),
    notificacoes: notificacoes.filter((notificacao) =>
      inPeriodo(toIsoDateFromDateTime(notificacao.criadoEm), periodo),
    ).length,
    notificacoesNaoLidas: notificacoes.filter(
      (notificacao) =>
        !notificacao.lida && inPeriodo(toIsoDateFromDateTime(notificacao.criadoEm), periodo),
    ).length,
    professoresComAula: professoresOut.filter((professor) => professor.aulasDadas > 0).length,
    cursos: cursosOut.length,
    turmas: cursosOut.reduce((acc, curso) => acc + curso.turmas.length, 0),
    alunos: alunos.length,
  };

  return {
    tipo: "relatorio_consolidado_coordenacao",
    versao: 1,
    geradoEm,
    periodo,
    resumo,
    aulas,
    professores: professoresOut,
    cursos: cursosOut,
  };
}

function consolidarAula({
  agendamento,
  cursoById,
  turmaById,
  atividadeById,
  habilidadeById,
  alunosByTurma,
  avaliacoes,
  evidencias,
}: {
  agendamento: Agendamento;
  cursoById: Map<string, Curso>;
  turmaById: Map<string, Turma>;
  atividadeById: Map<string, Atividade>;
  habilidadeById: Map<string, Habilidade>;
  alunosByTurma: Map<string, Aluno[]>;
  avaliacoes: AvaliacaoRecord[];
  evidencias: AulaEvidencia[];
}): AulaConsolidada {
  const turma = turmaById.get(agendamento.turmaId);
  const curso = turma ? cursoById.get(turma.cursoId) : undefined;
  const atividades = agendamento.atividadeIds
    .map((atividadeId) => atividadeById.get(atividadeId))
    .filter((atividade): atividade is Atividade => !!atividade);
  const alunosUsuarios = (alunosByTurma.get(agendamento.turmaId) ?? []).filter(
    (aluno) => !!aluno.userId,
  );
  const relProf = avaliacoes.find((avaliacao) => avaliacao.tipo === "relatorio_prof");
  const relAlunos = avaliacoes.filter((avaliacao) => avaliacao.tipo === "relatorio_aluno");
  const checklists = avaliacoes.filter((avaliacao) => avaliacao.tipo === "checklist_aluno");
  const presencas = ((relProf?.dados as RelatorioProfessorDados | undefined)?.presencas ??
    {}) as Record<string, boolean>;
  const alunosPresentesUsuariosIds = new Set(
    alunosUsuarios.filter((aluno) => presencas[aluno.id] === true).map((aluno) => aluno.id),
  );
  const plano = evidencias.find((evidencia) => evidencia.tipo === "plano_aula");
  const chamada = evidencias.find((evidencia) => evidencia.tipo === "chamada_arquivo");
  const requisitosDispensados = agendamentoDispensaRequisitos(agendamento);

  return {
    agendamentoId: agendamento.id,
    data: agendamento.data,
    inicio: agendamento.inicio,
    fim: agendamento.fim,
    cursoId: curso?.id ?? "",
    cursoCod: curso?.cod ?? "",
    cursoNome: curso?.nome ?? "Curso nao encontrado",
    turmaId: turma?.id ?? agendamento.turmaId,
    turmaCod: turma?.cod ?? "",
    turmaNome: turma?.nome ?? "Turma nao encontrada",
    professorUserId: agendamento.professorUserId,
    professorNome: agendamento.professor ?? "Sem professor",
    atividadeCodigos: atividades.map((atividade) => atividade.codigo),
    atividadeNomes: atividades.map((atividade) => atividade.nome),
    habilidades: (agendamento.habilidadeIds ?? [])
      .map((id) => habilidadeLabel(habilidadeById.get(id), id))
      .sort(),
    requisitosDispensados,
    planoRegistrado: requisitosDispensados || !!plano,
    planoValido: requisitosDispensados || evidenciaValida(plano),
    chamadaRegistrada: requisitosDispensados || !!chamada,
    chamadaValida: requisitosDispensados || evidenciaValida(chamada),
    relatorioProfessorRegistrado: requisitosDispensados || !!relProf,
    relatoriosAlunoRespondidos: relAlunos.filter(
      (avaliacao) => avaliacao.alunoId && alunosPresentesUsuariosIds.has(avaliacao.alunoId),
    ).length,
    relatoriosAlunoEsperados:
      requisitosDispensados || !relProf ? 0 : alunosPresentesUsuariosIds.size,
    checklistsRespondidos: checklists.filter(
      (avaliacao) => avaliacao.alunoId && alunosPresentesUsuariosIds.has(avaliacao.alunoId),
    ).length,
    checklistsEsperados: requisitosDispensados || !relProf ? 0 : alunosPresentesUsuariosIds.size,
    presencas: Object.values(presencas).filter(Boolean).length,
    faltas: Object.values(presencas).filter((presente) => presente === false).length,
  };
}

function consolidarProfessores({
  professores,
  aulas,
  aulasFinalizadas,
  avaliacoes,
  notificacoes,
  professorAvaliacoes,
}: {
  professores: ProfessorRelatorioInput[];
  aulas: AulaConsolidada[];
  aulasFinalizadas: Agendamento[];
  avaliacoes: AvaliacaoRecord[];
  notificacoes: Notificacao[];
  professorAvaliacoes: ProfessorAvaliacao[];
}): ProfessorConsolidado[] {
  const professoresMap = new Map<string, ProfessorRelatorioInput>();
  for (const professor of professores) professoresMap.set(professor.userId, professor);
  for (const aula of aulas) {
    if (!aula.professorUserId || professoresMap.has(aula.professorUserId)) continue;
    professoresMap.set(aula.professorUserId, {
      userId: aula.professorUserId,
      displayName: aula.professorNome,
    });
  }

  return Array.from(professoresMap.values())
    .map((professor) => {
      const professorNome =
        professor.displayName || professor.nome || professor.email || professor.userId;
      const aulasProfessor = aulas.filter(
        (aula) =>
          aula.professorUserId === professor.userId ||
          aula.professorNome.trim().toLowerCase() === professorNome.trim().toLowerCase(),
      );
      const agsProfessor = aulasFinalizadas.filter(
        (agendamento) =>
          agendamento.professorUserId === professor.userId ||
          agendamento.professor?.trim().toLowerCase() === professorNome.trim().toLowerCase(),
      );
      const agIds = new Set(agsProfessor.map((agendamento) => agendamento.id));
      const avaliacoesAulasProfessor = avaliacoes.filter(
        (avaliacao) => avaliacao.agendamentoId && agIds.has(avaliacao.agendamentoId),
      );
      const relatoriosAluno = avaliacoesAulasProfessor.filter(
        (avaliacao) => avaliacao.tipo === "relatorio_aluno",
      );
      const checklistsAluno = avaliacoesAulasProfessor.filter(
        (avaliacao) => avaliacao.tipo === "checklist_aluno",
      );
      const relatoriosProfessor = avaliacoesAulasProfessor.filter(
        (avaliacao) => avaliacao.tipo === "relatorio_prof",
      );
      const notificacoesProfessor = notificacoes.filter(
        (notificacao) =>
          notificacao.destinatarioUserId === professor.userId ||
          notificacao.destinatarioId === professor.userId ||
          notificacao.professor?.trim().toLowerCase() === professorNome.trim().toLowerCase(),
      );
      const avaliacoesDiretas = professorAvaliacoes.filter(
        (avaliacao) => avaliacao.professorUserId === professor.userId,
      );

      return {
        professorUserId: professor.userId,
        professorNome,
        aulasDadas: aulasProfessor.length,
        horasMin: sum(agsProfessor, (agendamento) =>
          duracaoMin(agendamento.inicio, agendamento.fim),
        ),
        horasFormatadas: formatarHorasMin(
          sum(agsProfessor, (agendamento) => duracaoMin(agendamento.inicio, agendamento.fim)),
        ),
        relatoriosProfessor: relatoriosProfessor.length,
        relatoriosAluno: relatoriosAluno.length,
        checklistsAluno: checklistsAluno.length,
        notificacoes: notificacoesProfessor.length,
        notificacoesNaoLidas: notificacoesProfessor.filter((notificacao) => !notificacao.lida)
          .length,
        mediaAvaliacaoAlunos: mediaRelatoriosAlunoProfessor(relatoriosAluno),
        mediaAvaliacaoDireta: mediaProfessorAvaliacoes(avaliacoesDiretas),
      };
    })
    .filter(
      (professor) =>
        professor.aulasDadas > 0 ||
        professor.notificacoes > 0 ||
        professor.mediaAvaliacaoDireta !== null,
    )
    .sort((a, b) => b.horasMin - a.horasMin || a.professorNome.localeCompare(b.professorNome));
}

function consolidarTurma({
  curso,
  turma,
  alunos,
  aulas,
  atividades,
  avaliacoes,
  habilidadeById,
}: {
  curso: Curso;
  turma: Turma;
  alunos: Aluno[];
  aulas: AulaConsolidada[];
  atividades: Atividade[];
  avaliacoes: AvaliacaoRecord[];
  habilidadeById: Map<string, Habilidade>;
}): TurmaConsolidada {
  const alunosUsuarios = alunos.filter((aluno) => !!aluno.userId);
  const aulasComRequisitos = aulas.filter((aula) => !aula.requisitosDispensados);
  const agendamentoIds = new Set(aulas.map((aula) => aula.agendamentoId));
  const avaliacoesTurma = avaliacoes.filter(
    (avaliacao) => avaliacao.agendamentoId && agendamentoIds.has(avaliacao.agendamentoId),
  );
  const checklists = avaliacoesTurma.filter((avaliacao) => avaliacao.tipo === "checklist_aluno");
  const relatoriosAluno = avaliacoesTurma.filter(
    (avaliacao) => avaliacao.tipo === "relatorio_aluno",
  );
  const habilidades = consolidarHabilidades(checklists, habilidadeById);
  const alunosOut = alunos
    .map((aluno) =>
      consolidarAluno({
        aluno,
        aulas: aulasComRequisitos,
        avaliacoes: avaliacoesTurma,
        habilidadeById,
      }),
    )
    .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome));
  const atividadesPlanejadas = atividades.filter(
    (atividade) =>
      atividade.cursoId === curso.id && atividade.tipo === 0 && !isAtividadeAvulsa(atividade),
  );
  const atividadeIdsFinalizadas = new Set(
    aulas.flatMap((aula) =>
      aula.atividadeCodigos.flatMap((codigo) =>
        atividadesPlanejadas
          .filter((atividade) => atividade.codigo === codigo)
          .map((atividade) => atividade.id),
      ),
    ),
  );
  const presencas = sum(aulas, (aula) => aula.presencas);
  const faltas = sum(aulas, (aula) => aula.faltas);
  const pendencias: string[] = [];
  const planosPendentes = aulasComRequisitos.filter((aula) => !aula.planoRegistrado).length;
  const chamadasPendentes = aulasComRequisitos.filter((aula) => !aula.chamadaRegistrada).length;
  const relProfPendentes = aulasComRequisitos.filter(
    (aula) => !aula.relatorioProfessorRegistrado,
  ).length;
  if (planosPendentes > 0) pendencias.push(`${planosPendentes} plano(s) pendente(s)`);
  if (chamadasPendentes > 0) pendencias.push(`${chamadasPendentes} chamada(s) pendente(s)`);
  if (relProfPendentes > 0) pendencias.push(`${relProfPendentes} relatorio(s) prof. pendente(s)`);
  if (alunos.filter((aluno) => !aluno.userId).length > 0) {
    pendencias.push(`${alunos.filter((aluno) => !aluno.userId).length} aluno(s) sem usuario`);
  }

  return {
    turmaId: turma.id,
    turmaCod: turma.cod,
    turmaNome: turma.nome,
    alunosTotal: alunos.length,
    alunosComUsuario: alunosUsuarios.length,
    alunosSemUsuario: alunos.length - alunosUsuarios.length,
    aulasAgendadas: aulas.length,
    aulasFinalizadas: aulas.length,
    aulasComPlano: aulas.filter((aula) => aula.planoRegistrado).length,
    aulasComChamada: aulas.filter((aula) => aula.chamadaRegistrada).length,
    aulasComRelatorioProfessor: aulas.filter((aula) => aula.relatorioProfessorRegistrado).length,
    presencas,
    faltas,
    frequenciaPct: pct(presencas, presencas + faltas, 100),
    relatoriosAlunoPct: pct(
      relatoriosAluno.length,
      aulasComRequisitos.length * alunosUsuarios.length,
      100,
    ),
    checklistsPct: pct(checklists.length, aulasComRequisitos.length * alunosUsuarios.length, 100),
    progressoAulasPct: pct(atividadeIdsFinalizadas.size, atividadesPlanejadas.length, 0),
    mediaHabilidades: media(habilidades.map((habilidade) => habilidade.media)),
    habilidades,
    alunos: alunosOut,
    pendencias,
  };
}

function consolidarAluno({
  aluno,
  aulas,
  avaliacoes,
  habilidadeById,
}: {
  aluno: Aluno;
  aulas: AulaConsolidada[];
  avaliacoes: AvaliacaoRecord[];
  habilidadeById: Map<string, Habilidade>;
}): AlunoConsolidado {
  const relatoriosAluno = avaliacoes.filter(
    (avaliacao) => avaliacao.tipo === "relatorio_aluno" && avaliacao.alunoId === aluno.id,
  );
  const checklists = avaliacoes.filter(
    (avaliacao) => avaliacao.tipo === "checklist_aluno" && avaliacao.alunoId === aluno.id,
  );
  const presentes = aulas.filter(
    (aula) =>
      (
        avaliacoes.find(
          (avaliacao) =>
            avaliacao.tipo === "relatorio_prof" && avaliacao.agendamentoId === aula.agendamentoId,
        )?.dados as RelatorioProfessorDados | undefined
      )?.presencas?.[aluno.id],
  ).length;
  const faltas = aulas.filter(
    (aula) =>
      (
        avaliacoes.find(
          (avaliacao) =>
            avaliacao.tipo === "relatorio_prof" && avaliacao.agendamentoId === aula.agendamentoId,
        )?.dados as RelatorioProfessorDados | undefined
      )?.presencas?.[aluno.id] === false,
  ).length;
  const habilidades = consolidarHabilidades(checklists, habilidadeById);
  return {
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    userId: aluno.userId,
    aulasEsperadas: aulas.length,
    presencas: presentes,
    faltas,
    frequenciaPct: pct(presentes, presentes + faltas, 100),
    relatoriosAluno: relatoriosAluno.length,
    checklists: checklists.length,
    mediaHabilidades: media(habilidades.map((habilidade) => habilidade.media)),
    habilidades,
  };
}

function consolidarHabilidades(
  checklists: AvaliacaoRecord[],
  habilidadeById: Map<string, Habilidade>,
): HabilidadeResumo[] {
  const notas = new Map<string, number[]>();
  for (const checklist of checklists) {
    const dados = checklist.dados as ChecklistAlunoDados | undefined;
    for (const [habilidadeId, nota] of Object.entries(dados?.habilidadesNotas ?? {})) {
      if (typeof nota !== "number") continue;
      const arr = notas.get(habilidadeId) ?? [];
      arr.push(nota);
      notas.set(habilidadeId, arr);
    }
  }
  return Array.from(notas.entries())
    .map(([habilidadeId, values]) => {
      const habilidade = habilidadeById.get(habilidadeId);
      return {
        habilidadeId,
        sigla: habilidade?.sigla ?? habilidadeId,
        nome: habilidade?.nome || habilidade?.descricao || habilidadeId,
        media: round1(sum(values, (value) => value) / values.length),
        avaliacoes: values.length,
      };
    })
    .sort((a, b) => b.media - a.media || a.sigla.localeCompare(b.sigla));
}

function mediaRelatoriosAlunoProfessor(avaliacoes: AvaliacaoRecord[]): number | null {
  const values = avaliacoes.flatMap((avaliacao) => {
    const dados = avaliacao.dados as RelatorioAlunoDados | undefined;
    return [
      dados?.professor?.explicaBem,
      dados?.professor?.ajudaQuandoTrava,
      dados?.professor?.respeito,
    ].filter((value): value is number => typeof value === "number");
  });
  return media(values);
}

function mediaProfessorAvaliacoes(avaliacoes: ProfessorAvaliacao[]): number | null {
  const values = avaliacoes.flatMap((avaliacao) =>
    Object.values(avaliacao.notas ?? {}).filter(
      (value): value is number => typeof value === "number",
    ),
  );
  return media(values);
}

function evidenciaValida(evidencia: AulaEvidencia | undefined): boolean {
  if (!evidencia) return false;
  return ["encontrado", "valido", "aprovado_manual"].includes(evidencia.status);
}

function habilidadeLabel(habilidade: Habilidade | undefined, fallback: string): string {
  if (!habilidade) return fallback;
  return habilidade.nome ? `${habilidade.sigla} - ${habilidade.nome}` : habilidade.sigla;
}

function inPeriodo(dateIso: string, periodo: RelatorioPeriodo): boolean {
  return dateIso >= periodo.inicio && dateIso <= periodo.fim;
}

function toIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toIsoDateFromDateTime(value: string): string {
  return value.slice(0, 10);
}

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function duracaoMin(inicio: string, fim: string): number {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);
  return Math.max(0, hf * 60 + mf - (hi * 60 + mi));
}

export function formatarHorasMin(totalMin: number): string {
  const horas = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${horas}h${String(min).padStart(2, "0")}`;
}

function pct(done: number, total: number, emptyValue: number): number {
  if (total <= 0) return emptyValue;
  return Math.round((done / total) * 100);
}

function media(values: number[]): number | null {
  if (values.length === 0) return null;
  return round1(sum(values, (value) => value) / values.length);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function sum<T>(items: T[], getter: (item: T) => number): number {
  return items.reduce((acc, item) => acc + getter(item), 0);
}

function groupBy<T>(items: T[], getter: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const key = getter(item);
    const arr = out.get(key) ?? [];
    arr.push(item);
    out.set(key, arr);
  }
  return out;
}
