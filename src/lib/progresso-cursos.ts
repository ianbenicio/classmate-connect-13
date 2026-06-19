import type { Agendamento, Aluno, Atividade, Curso, Turma } from "./academic-types";
import type { AvaliacaoRecord } from "./avaliacoes-types";

export interface ProgressoTurma {
  cursoId: string;
  turmaId: string;
  turmaNome: string;
  turmaCod: string;
  alunosTotal: number;
  alunosUsuarios: number;
  alunosSemUsuario: number;
  atividadesPlanejadas: number;
  atividadesExecutadas: number;
  progressoAtividadesPct: number;
  aulasAgendadas: number;
  aulasConcluidas: number;
  aulasPendentes: number;
  relatoriosProf: number;
  relatoriosProfPendentes: number;
  relatoriosProfPct: number;
  avaliacoesAluno: number;
  avaliacoesAlunoPossiveis: number;
  avaliacoesAlunoPct: number;
  checklistsAluno: number;
  checklistsAlunoPossiveis: number;
  checklistsAlunoPct: number;
  pendencias: string[];
}

export interface ProgressoCurso {
  cursoId: string;
  cursoNome: string;
  cursoCod: string;
  turmas: ProgressoTurma[];
  alunosTotal: number;
  alunosUsuarios: number;
  alunosSemUsuario: number;
  atividadesPlanejadas: number;
  atividadesExecutadas: number;
  progressoAtividadesPct: number;
  aulasAgendadas: number;
  aulasConcluidas: number;
  aulasPendentes: number;
  relatoriosProf: number;
  relatoriosProfPendentes: number;
  relatoriosProfPct: number;
  avaliacoesAluno: number;
  avaliacoesAlunoPossiveis: number;
  avaliacoesAlunoPct: number;
  checklistsAluno: number;
  checklistsAlunoPossiveis: number;
  checklistsAlunoPct: number;
  pendencias: string[];
}

export interface ProgressoCursosPayload {
  cursos: ProgressoCurso[];
  totalCursos: number;
  totalTurmas: number;
  alunosSemUsuario: number;
  aulasConcluidas: number;
  relatoriosProfPendentes: number;
}

export interface ProgressoCursosInput {
  cursos: Curso[];
  turmas: Turma[];
  alunos: Aluno[];
  atividades: Atividade[];
  agendamentos: Agendamento[];
  avaliacoes: AvaliacaoRecord[];
}

function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + pick(item), 0);
}

function avaliacaoPairSet(avaliacoes: AvaliacaoRecord[], tipo: string): Set<string> {
  const out = new Set<string>();
  for (const av of avaliacoes) {
    if (av.tipo !== tipo) continue;
    if (!av.agendamentoId || !av.alunoId) continue;
    out.add(`${av.agendamentoId}:${av.alunoId}`);
  }
  return out;
}

export function gerarProgressoCursos({
  cursos,
  turmas,
  alunos,
  atividades,
  agendamentos,
  avaliacoes,
}: ProgressoCursosInput): ProgressoCursosPayload {
  const relatoriosProfIds = new Set(
    avaliacoes
      .filter((av) => av.tipo === "relatorio_prof" && av.agendamentoId)
      .map((av) => av.agendamentoId as string),
  );
  const relatoriosAlunoPairs = avaliacaoPairSet(avaliacoes, "relatorio_aluno");
  const checklistPairs = avaliacaoPairSet(avaliacoes, "checklist_aluno");

  const cursosOut: ProgressoCurso[] = cursos
    .map((curso) => {
      const turmasCurso = turmas
        .filter((turma) => turma.cursoId === curso.id)
        .sort((a, b) => a.cod.localeCompare(b.cod));
      const atividadesCurso = atividades.filter((atividade) => atividade.cursoId === curso.id);
      const atividadesPlanejadasPorTurma = atividadesCurso.length;
      const atividadesCursoIds = new Set(atividadesCurso.map((atividade) => atividade.id));

      const turmasOut: ProgressoTurma[] = turmasCurso.map((turma) => {
        const alunosTurma = alunos.filter((aluno) => aluno.turmaId === turma.id);
        const alunosUsuarios = alunosTurma.filter((aluno) => !!aluno.userId);
        const alunosUsuariosIds = new Set(alunosUsuarios.map((aluno) => aluno.id));
        const agendamentosTurma = agendamentos.filter(
          (agendamento) => agendamento.turmaId === turma.id,
        );
        const concluidos = agendamentosTurma.filter(
          (agendamento) => agendamento.status === "concluido",
        );
        const atividadeExecutadaIds = new Set<string>();

        for (const agendamento of concluidos) {
          for (const atividadeId of agendamento.atividadeIds) {
            if (atividadesCursoIds.has(atividadeId)) {
              atividadeExecutadaIds.add(atividadeId);
            }
          }
        }

        const relatoriosProf = concluidos.filter((agendamento) =>
          relatoriosProfIds.has(agendamento.id),
        ).length;

        let avaliacoesAluno = 0;
        let checklistsAluno = 0;
        for (const agendamento of concluidos) {
          for (const alunoId of alunosUsuariosIds) {
            if (relatoriosAlunoPairs.has(`${agendamento.id}:${alunoId}`)) avaliacoesAluno++;
            if (checklistPairs.has(`${agendamento.id}:${alunoId}`)) checklistsAluno++;
          }
        }

        const avaliacoesPossiveis = concluidos.length * alunosUsuarios.length;
        const pendencias: string[] = [];
        const alunosSemUsuario = alunosTurma.length - alunosUsuarios.length;
        const relatoriosProfPendentes = concluidos.length - relatoriosProf;

        if (alunosSemUsuario > 0) pendencias.push(`${alunosSemUsuario} aluno(s) sem usuario`);
        if (relatoriosProfPendentes > 0) {
          pendencias.push(`${relatoriosProfPendentes} relatorio(s) de professor pendente(s)`);
        }
        if (concluidos.length > 0 && pct(avaliacoesAluno, avaliacoesPossiveis) < 50) {
          pendencias.push("baixa resposta dos alunos");
        }

        return {
          cursoId: curso.id,
          turmaId: turma.id,
          turmaNome: turma.nome,
          turmaCod: turma.cod,
          alunosTotal: alunosTurma.length,
          alunosUsuarios: alunosUsuarios.length,
          alunosSemUsuario,
          atividadesPlanejadas: atividadesPlanejadasPorTurma,
          atividadesExecutadas: atividadeExecutadaIds.size,
          progressoAtividadesPct: pct(atividadeExecutadaIds.size, atividadesPlanejadasPorTurma),
          aulasAgendadas: agendamentosTurma.length,
          aulasConcluidas: concluidos.length,
          aulasPendentes: agendamentosTurma.length - concluidos.length,
          relatoriosProf,
          relatoriosProfPendentes,
          relatoriosProfPct: pct(relatoriosProf, concluidos.length),
          avaliacoesAluno,
          avaliacoesAlunoPossiveis: avaliacoesPossiveis,
          avaliacoesAlunoPct: pct(avaliacoesAluno, avaliacoesPossiveis),
          checklistsAluno,
          checklistsAlunoPossiveis: avaliacoesPossiveis,
          checklistsAlunoPct: pct(checklistsAluno, avaliacoesPossiveis),
          pendencias,
        };
      });

      const atividadesPlanejadas = sum(turmasOut, (turma) => turma.atividadesPlanejadas);
      const atividadesExecutadas = sum(turmasOut, (turma) => turma.atividadesExecutadas);
      const aulasConcluidas = sum(turmasOut, (turma) => turma.aulasConcluidas);
      const relatoriosProf = sum(turmasOut, (turma) => turma.relatoriosProf);
      const avaliacoesAluno = sum(turmasOut, (turma) => turma.avaliacoesAluno);
      const avaliacoesAlunoPossiveis = sum(turmasOut, (turma) => turma.avaliacoesAlunoPossiveis);
      const checklistsAluno = sum(turmasOut, (turma) => turma.checklistsAluno);
      const checklistsAlunoPossiveis = sum(turmasOut, (turma) => turma.checklistsAlunoPossiveis);
      const pendencias = turmasOut.flatMap((turma) =>
        turma.pendencias.map((item) => `${turma.turmaCod}: ${item}`),
      );

      return {
        cursoId: curso.id,
        cursoNome: curso.nome,
        cursoCod: curso.cod,
        turmas: turmasOut,
        alunosTotal: sum(turmasOut, (turma) => turma.alunosTotal),
        alunosUsuarios: sum(turmasOut, (turma) => turma.alunosUsuarios),
        alunosSemUsuario: sum(turmasOut, (turma) => turma.alunosSemUsuario),
        atividadesPlanejadas,
        atividadesExecutadas,
        progressoAtividadesPct: pct(atividadesExecutadas, atividadesPlanejadas),
        aulasAgendadas: sum(turmasOut, (turma) => turma.aulasAgendadas),
        aulasConcluidas,
        aulasPendentes: sum(turmasOut, (turma) => turma.aulasPendentes),
        relatoriosProf,
        relatoriosProfPendentes: aulasConcluidas - relatoriosProf,
        relatoriosProfPct: pct(relatoriosProf, aulasConcluidas),
        avaliacoesAluno,
        avaliacoesAlunoPossiveis,
        avaliacoesAlunoPct: pct(avaliacoesAluno, avaliacoesAlunoPossiveis),
        checklistsAluno,
        checklistsAlunoPossiveis,
        checklistsAlunoPct: pct(checklistsAluno, checklistsAlunoPossiveis),
        pendencias,
      };
    })
    .sort((a, b) => a.cursoCod.localeCompare(b.cursoCod));

  return {
    cursos: cursosOut,
    totalCursos: cursosOut.length,
    totalTurmas: sum(cursosOut, (curso) => curso.turmas.length),
    alunosSemUsuario: sum(cursosOut, (curso) => curso.alunosSemUsuario),
    aulasConcluidas: sum(cursosOut, (curso) => curso.aulasConcluidas),
    relatoriosProfPendentes: sum(cursosOut, (curso) => curso.relatoriosProfPendentes),
  };
}
