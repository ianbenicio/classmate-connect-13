import { describe, expect, it } from "vitest";
import type { Atividade } from "@/lib/academic-types";
import type { AulaEvidencia } from "@/lib/aula-evidencias";
import type { AvaliacaoRecord } from "@/lib/avaliacoes-types";
import { gerarResumoCriticasProfessores } from "@/lib/professor-criticas";
import { CURSO_MUSICA, makeAgendamento } from "../helpers/fixtures";

const aula: Atividade = {
  id: "at001",
  tipo: 0,
  nome: "Aula de teste",
  codigo: "MPCA01",
  cursoId: CURSO_MUSICA.id,
  grupo: "CA",
  descricao: "",
  objetivoResultados: "",
  prazo: "2026-06-20",
  criadoPor: "Coord",
  professor: "Prof. Ana",
  professorUserId: "u-prof-001",
  habilidadeIds: [],
};

describe("professor-criticas", () => {
  it("conta plano ausente no dia da aula e converte 3 criticas em 1 punicao", () => {
    const agendamentos = [
      makeAgendamento({
        id: "ag-001",
        data: "2026-06-20",
        inicio: "08:00",
        fim: "08:50",
        atividadeIds: [aula.id],
      }),
      makeAgendamento({
        id: "ag-002",
        data: "2026-06-19",
        inicio: "08:00",
        fim: "08:50",
        atividadeIds: [aula.id],
      }),
      makeAgendamento({
        id: "ag-003",
        data: "2026-06-30",
        inicio: "08:00",
        fim: "08:50",
        atividadeIds: [aula.id],
      }),
    ];

    const resumo = gerarResumoCriticasProfessores({
      agendamentos,
      atividades: [aula],
      evidencias: [],
      avaliacoes: [],
      now: new Date("2026-06-20T09:00:00"),
    });

    expect(resumo).toHaveLength(1);
    expect(resumo[0]).toMatchObject({
      professorUserId: "u-prof-001",
      pontosCritica: 3,
      punicoes: 1,
      saldoCriticas: 0,
    });
    expect(resumo[0].criticas.map((critica) => critica.tipo).sort()).toEqual([
      "plano_aula_nao_enviado",
      "plano_aula_nao_enviado",
      "relatorio_professor_nao_enviado",
    ]);
  });

  it("ignora plano e relatorio validos", () => {
    const agendamento = makeAgendamento({
      id: "ag-ok",
      data: "2026-06-18",
      inicio: "08:00",
      fim: "08:50",
      atividadeIds: [aula.id],
    });
    const evidencias: AulaEvidencia[] = [
      {
        id: "ev-plano",
        agendamentoId: agendamento.id,
        tipo: "plano_aula",
        status: "valido",
      },
    ];
    const avaliacoes: AvaliacaoRecord[] = [
      {
        id: "av-prof",
        tipo: "relatorio_prof",
        agendamentoId: agendamento.id,
        alunoId: null,
        atividadeId: null,
        criadoEm: "2026-06-18T10:00:00Z",
        dados: {},
      },
    ];

    const resumo = gerarResumoCriticasProfessores({
      agendamentos: [agendamento],
      atividades: [aula],
      evidencias,
      avaliacoes,
      now: new Date("2026-06-20T09:00:00"),
    });

    expect(resumo).toEqual([]);
  });
});
