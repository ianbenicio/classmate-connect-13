import { describe, expect, it } from "vitest";
import type { Aluno, Atividade, Habilidade } from "@/lib/academic-types";
import type { AulaEvidencia } from "@/lib/aula-evidencias";
import type { AvaliacaoRecord } from "@/lib/avaliacoes-types";
import {
  calcularJanelaRelatorio,
  gerarRelatorioSemanalCoordenacao,
} from "@/lib/relatorio-semanal-coordenacao";
import type { ProfessorAvaliacao } from "@/lib/professores-store";
import { CURSO_MUSICA, TURMA_A, makeConcluido } from "../helpers/fixtures";

const aula: Atividade = {
  id: "at001",
  tipo: 0,
  nome: "Aula de ritmos",
  codigo: "MPCA01",
  cursoId: CURSO_MUSICA.id,
  grupo: "CA",
  descricao: "Ritmo e pulso",
  objetivoResultados: "",
  prazo: "2026-06-15",
  criadoPor: "Coord",
  professor: "Prof. Ana",
  professorUserId: "u-prof-001",
  habilidadeIds: ["h001"],
};

const habilidades: Habilidade[] = [
  {
    id: "h001",
    sigla: "FOCO",
    nome: "Foco sustentado",
    descricao: "Mantem atencao na atividade",
  },
];

const alunos: Aluno[] = [
  {
    id: "a001",
    nome: "Aluno Um",
    contato: "",
    userId: "u-aluno-1",
    cursoId: CURSO_MUSICA.id,
    turmaId: TURMA_A.id,
    habilidadeIds: [],
    aulas: [],
    trabalhos: [],
  },
  {
    id: "a002",
    nome: "Aluno Dois",
    contato: "",
    userId: "u-aluno-2",
    cursoId: CURSO_MUSICA.id,
    turmaId: TURMA_A.id,
    habilidadeIds: [],
    aulas: [],
    trabalhos: [],
  },
];

describe("relatorio-semanal-coordenacao", () => {
  it("calcula janela semanal e personalizada", () => {
    expect(
      calcularJanelaRelatorio(
        { frequencia: "semanal", intervaloDias: 99, anchorDate: "2026-06-19" },
        new Date("2026-06-19T12:00:00"),
      ),
    ).toMatchObject({
      inicio: "2026-06-13",
      fim: "2026-06-19",
      proximaGeracao: "2026-06-26",
      intervaloDias: 7,
    });

    expect(
      calcularJanelaRelatorio(
        { frequencia: "personalizado", intervaloDias: 3, anchorDate: "2026-06-19" },
        new Date("2026-06-19T12:00:00"),
      ),
    ).toMatchObject({
      inicio: "2026-06-17",
      fim: "2026-06-19",
      proximaGeracao: "2026-06-22",
      intervaloDias: 3,
    });
  });

  it("consolida aulas, evidencias, professores e alunos por curso/turma", () => {
    const agendamento = makeConcluido({
      id: "ag-001",
      data: "2026-06-15",
      inicio: "08:00",
      fim: "08:50",
      atividadeIds: [aula.id],
      habilidadeIds: ["h001"],
      professor: "Prof. Ana",
      professorUserId: "u-prof-001",
    });

    const avaliacoes: AvaliacaoRecord[] = [
      {
        id: "av-prof",
        tipo: "relatorio_prof",
        agendamentoId: agendamento.id,
        alunoId: null,
        atividadeId: null,
        criadoEm: "2026-06-15T10:00:00Z",
        dados: {
          resumo: "Aula concluida",
          engajamentoTurma: 4,
          cumprimentoPlano: 5,
          sugestoesPais: "Treinar ritmo em casa",
          presencas: { a001: true, a002: false },
        },
      },
      {
        id: "av-aluno",
        tipo: "relatorio_aluno",
        agendamentoId: agendamento.id,
        alunoId: "a001",
        atividadeId: null,
        criadoEm: "2026-06-15T11:00:00Z",
        dados: {
          entendeuConteudo: 5,
          aula: { interessante: 5, ritmoBom: 4, materiaisOk: 5 },
          professor: { explicaBem: 5, ajudaQuandoTrava: 4, respeito: 5 },
          euNaAula: { participei: 5, aprendiAlgoNovo: 5 },
        },
      },
      {
        id: "av-checklist",
        tipo: "checklist_aluno",
        agendamentoId: agendamento.id,
        alunoId: "a001",
        atividadeId: null,
        criadoEm: "2026-06-15T11:30:00Z",
        dados: {
          habilidadesNotas: { h001: 4 },
          comportamento: [],
          engajamento: 4,
        },
      },
    ];

    const evidencias: AulaEvidencia[] = [
      {
        id: "ev-plano",
        agendamentoId: agendamento.id,
        tipo: "plano_aula",
        status: "valido",
      },
      {
        id: "ev-chamada",
        agendamentoId: agendamento.id,
        tipo: "chamada_arquivo",
        status: "encontrado",
      },
    ];

    const professorAvaliacoes: ProfessorAvaliacao[] = [
      {
        id: "pa-1",
        professorId: "u-prof-001",
        professorUserId: "u-prof-001",
        avaliadorUserId: "u-coord",
        avaliadorTipo: "coordenacao",
        agendamentoId: agendamento.id,
        notas: { didatica: 5, pontualidade: 4 },
        comentario: null,
        tags: [],
        criadoEm: "2026-06-15T12:00:00Z",
      },
    ];

    const payload = gerarRelatorioSemanalCoordenacao({
      periodo: { inicio: "2026-06-13", fim: "2026-06-19" },
      cursos: [CURSO_MUSICA],
      turmas: [TURMA_A],
      alunos,
      atividades: [aula],
      agendamentos: [agendamento],
      avaliacoes,
      evidencias,
      notificacoes: [
        {
          id: "n-1",
          destinatarioTipo: "professor",
          destinatarioId: "u-prof-001",
          destinatarioUserId: "u-prof-001",
          titulo: "Plano pendente",
          mensagem: "",
          cursoId: CURSO_MUSICA.id,
          turmaId: TURMA_A.id,
          data: "2026-06-15",
          inicio: "08:00",
          fim: "08:50",
          professor: "Prof. Ana",
          atividadeIds: [aula.id],
          criadoEm: "2026-06-15T07:00:00Z",
          lida: false,
        },
      ],
      professores: [{ userId: "u-prof-001", displayName: "Prof. Ana" }],
      professorAvaliacoes,
      habilidades,
      geradoEm: "2026-06-19T12:00:00Z",
    });

    expect(payload.resumo.aulasFinalizadas).toBe(1);
    expect(payload.resumo.aulasComPlano).toBe(1);
    expect(payload.resumo.aulasComChamada).toBe(1);
    expect(payload.resumo.presencas).toBe(1);
    expect(payload.resumo.faltas).toBe(1);
    expect(payload.professores[0]).toMatchObject({
      professorNome: "Prof. Ana",
      aulasDadas: 1,
      horasMin: 50,
      relatoriosProfessor: 1,
      relatoriosAluno: 1,
      checklistsAluno: 1,
      notificacoesNaoLidas: 1,
      mediaAvaliacaoAlunos: 4.7,
      mediaAvaliacaoDireta: 4.5,
    });
    const alunoUm = payload.cursos[0].turmas[0].alunos.find(
      (aluno) => aluno.alunoNome === "Aluno Um",
    );
    const alunoDois = payload.cursos[0].turmas[0].alunos.find(
      (aluno) => aluno.alunoNome === "Aluno Dois",
    );

    expect(alunoUm).toMatchObject({
      alunoNome: "Aluno Um",
      presencas: 1,
      relatoriosAluno: 1,
      mediaHabilidades: 4,
    });
    expect(alunoDois).toMatchObject({
      alunoNome: "Aluno Dois",
      faltas: 1,
      relatoriosAluno: 0,
    });
  });
});
