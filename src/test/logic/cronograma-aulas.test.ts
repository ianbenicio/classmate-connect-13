import { describe, expect, it } from "vitest";
import type { Atividade } from "@/lib/academic-types";
import {
  buildAgendamentoCoordenacao,
  buildPatchStatusCoordenacao,
  getAgendamentoReferenciaCronograma,
  getAgendamentosDaAula,
  getStatusCronogramaAula,
} from "@/lib/cronograma-aulas";
import { TURMA_A, makeAgendamento, makeConcluido } from "../helpers/fixtures";

const aula: Atividade = {
  id: "at001",
  tipo: 0,
  nome: "Aula de teste",
  codigo: "MPCA01",
  cursoId: "c0000000-0000-0000-0000-000000000001",
  grupo: "CA",
  descricao: "",
  objetivoResultados: "",
  prazo: "2026-06-19",
  criadoPor: "Coord",
  professor: "Prof",
  habilidadeIds: ["hab-1"],
};

describe("cronograma-aulas", () => {
  it("deriva status livre, agendada e finalizada por aula/turma", () => {
    expect(getStatusCronogramaAula([])).toBe("livre");
    expect(getStatusCronogramaAula([makeAgendamento()])).toBe("agendada");
    expect(getStatusCronogramaAula([makeAgendamento(), makeConcluido()])).toBe("finalizada");
  });

  it("filtra agendamentos da aula selecionada", () => {
    const alvo = makeAgendamento({ id: "ag-1", turmaId: TURMA_A.id, atividadeIds: [aula.id] });
    const outro = makeAgendamento({
      id: "ag-2",
      turmaId: TURMA_A.id,
      atividadeIds: ["outra-aula"],
    });

    expect(getAgendamentosDaAula([alvo, outro], TURMA_A.id, aula.id)).toEqual([alvo]);
  });

  it("prioriza agendamento concluido como referencia visual", () => {
    const pendente = makeAgendamento({ id: "ag-pendente" });
    const concluido = makeConcluido({ id: "ag-concluido" });

    expect(getAgendamentoReferenciaCronograma([pendente, concluido])?.id).toBe("ag-concluido");
  });

  it("cria agendamento manual da coordenacao com requisitos dispensados", () => {
    const agendamento = buildAgendamentoCoordenacao({
      atividade: aula,
      turma: TURMA_A,
      status: "finalizada",
      actor: { userId: "coord-1", nome: "Coord" },
      now: new Date("2026-06-19T12:00:00.000Z"),
    });

    expect(agendamento.status).toBe("concluido");
    expect(agendamento.data).toBe(TURMA_A.data);
    expect(agendamento.professor).toBe("Coordenacao");
    expect(agendamento.professorUserId).toBeUndefined();
    expect(agendamento.origem).toBe("coordenacao");
    expect(agendamento.requisitosDispensados).toBe(true);
    expect(agendamento.atividadeIds).toEqual([aula.id]);
    expect(agendamento.habilidadeIds).toEqual(["hab-1"]);
  });

  it("patch de status nao remove tarefas vinculadas do agendamento existente", () => {
    const patch = buildPatchStatusCoordenacao({
      atividade: aula,
      status: "agendada",
      actor: { userId: "coord-1", nome: "Coord" },
      now: new Date("2026-06-19T12:00:00.000Z"),
    });

    expect(patch.atividadeIds).toBeUndefined();
    expect(patch.status).toBe("pendente");
    expect(patch.concluidoEm).toBeUndefined();
    expect(patch.requisitosDispensados).toBe(true);
  });
});
