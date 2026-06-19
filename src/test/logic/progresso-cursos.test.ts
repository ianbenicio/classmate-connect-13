import { describe, expect, it } from "vitest";
import { gerarProgressoCursos } from "@/lib/progresso-cursos";
import type { Agendamento, Aluno, Atividade, Curso, Turma } from "@/lib/academic-types";
import type { AvaliacaoRecord } from "@/lib/avaliacoes-types";

const curso: Curso = {
  id: "curso-1",
  cod: "GP",
  nome: "Games",
  descricao: "",
  cargaHorariaTotalMin: 0,
  duracaoAulaMin: 60,
  habilidadeIds: [],
};

const turma: Turma = {
  id: "turma-1",
  cursoId: "curso-1",
  nome: "Turma A",
  cod: "GPA",
  data: "2026-01-01",
  horarios: [],
  alunosIds: [],
};

const alunoUsuario: Aluno = {
  id: "aluno-1",
  nome: "Aluno Usuario",
  contato: "",
  userId: "user-1",
  cursoId: "curso-1",
  turmaId: "turma-1",
  habilidadeIds: [],
  aulas: [],
  trabalhos: [],
};

const alunoLegado: Aluno = {
  ...alunoUsuario,
  id: "aluno-2",
  nome: "Aluno Legado",
  userId: undefined,
};

const atividade: Atividade = {
  id: "atividade-1",
  tipo: 0,
  nome: "Aula 1",
  codigo: "GP01",
  cursoId: "curso-1",
  grupo: "GERAL",
  descricao: "",
  objetivoResultados: "",
  prazo: "2026-01-10",
  criadoPor: "Coord",
  professor: "Prof",
  habilidadeIds: [],
};

const agendamento: Agendamento = {
  id: "agendamento-1",
  turmaId: "turma-1",
  data: "2026-01-10",
  diaSemana: "sab",
  inicio: "10:00",
  fim: "11:00",
  atividadeIds: ["atividade-1"],
  status: "concluido",
  criadoEm: "2026-01-01T00:00:00.000Z",
  professorUserId: "prof-1",
};

describe("gerarProgressoCursos", () => {
  it("organiza progresso por curso e turma usando apenas alunos com usuario nas coberturas", () => {
    const avaliacoes: AvaliacaoRecord[] = [
      {
        id: "av-prof",
        agendamentoId: "agendamento-1",
        alunoId: null,
        atividadeId: null,
        tipo: "relatorio_prof",
        dados: {},
        criadoEm: "2026-01-10T12:00:00.000Z",
      },
      {
        id: "av-aluno",
        agendamentoId: "agendamento-1",
        alunoId: "aluno-1",
        atividadeId: null,
        tipo: "relatorio_aluno",
        dados: {},
        criadoEm: "2026-01-10T12:10:00.000Z",
      },
      {
        id: "checklist",
        agendamentoId: "agendamento-1",
        alunoId: "aluno-1",
        atividadeId: null,
        tipo: "checklist_aluno",
        dados: {},
        criadoEm: "2026-01-10T12:20:00.000Z",
      },
    ];

    const payload = gerarProgressoCursos({
      cursos: [curso],
      turmas: [turma],
      alunos: [alunoUsuario, alunoLegado],
      atividades: [atividade],
      agendamentos: [agendamento],
      avaliacoes,
    });

    expect(payload.cursos).toHaveLength(1);
    expect(payload.alunosSemUsuario).toBe(1);

    const progressoTurma = payload.cursos[0].turmas[0];
    expect(progressoTurma.alunosTotal).toBe(2);
    expect(progressoTurma.alunosUsuarios).toBe(1);
    expect(progressoTurma.avaliacoesAlunoPossiveis).toBe(1);
    expect(progressoTurma.avaliacoesAlunoPct).toBe(100);
    expect(progressoTurma.checklistsAlunoPct).toBe(100);
    expect(progressoTurma.progressoAtividadesPct).toBe(100);
    expect(progressoTurma.pendencias).toContain("1 aluno(s) sem usuario");
  });

  it("marca pendencia quando aula concluida nao tem relatorio do professor", () => {
    const payload = gerarProgressoCursos({
      cursos: [curso],
      turmas: [turma],
      alunos: [alunoUsuario],
      atividades: [atividade],
      agendamentos: [agendamento],
      avaliacoes: [],
    });

    const progressoTurma = payload.cursos[0].turmas[0];
    expect(progressoTurma.relatoriosProfPendentes).toBe(1);
    expect(progressoTurma.relatoriosProfPct).toBe(0);
    expect(progressoTurma.pendencias).toContain("1 relatorio(s) de professor pendente(s)");
  });
});
