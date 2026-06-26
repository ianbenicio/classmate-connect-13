import { describe, expect, it } from "vitest";
import type { AulaEvidencia } from "@/lib/aula-evidencias";
import { calcularPendencias } from "@/lib/pendencias";
import { makeAgendamento, makeConcluido } from "../helpers/fixtures";

function planoValido(agendamentoId: string): AulaEvidencia {
  return {
    id: `ev-${agendamentoId}`,
    agendamentoId,
    tipo: "plano_aula",
    status: "valido",
  } as AulaEvidencia;
}

describe("calcularPendencias", () => {
  it("retorna vazio sem agendamentos", () => {
    expect(calcularPendencias({ agendamentos: [], evidencias: [] })).toEqual([]);
  });

  it("ignora agendamento concluido", () => {
    const ag = makeConcluido({ data: "2026-05-26", fim: "08:50" });
    expect(
      calcularPendencias({
        agendamentos: [ag],
        evidencias: [],
        now: new Date("2026-05-28T00:00:00"),
      }),
    ).toEqual([]);
  });

  it("ignora agendamento da coordenacao com requisitos dispensados", () => {
    const ag = makeAgendamento({
      data: "2026-05-26",
      inicio: "08:00",
      fim: "08:50",
      origem: "coordenacao",
      requisitosDispensados: true,
    });
    expect(
      calcularPendencias({
        agendamentos: [ag],
        evidencias: [],
        now: new Date("2026-05-28T00:00:00"),
      }),
    ).toEqual([]);
  });

  it("gera plano_pendente quando nao ha plano valido", () => {
    const ag = makeAgendamento({ id: "ag-1", data: "2026-05-26", inicio: "08:00", fim: "08:50" });
    const pend = calcularPendencias({
      agendamentos: [ag],
      evidencias: [],
      now: new Date("2026-05-26T07:00:00"),
    });
    expect(pend).toHaveLength(1);
    expect(pend[0]).toMatchObject({ agendamentoId: "ag-1", kind: "plano_pendente" });
  });

  it("nao gera plano_pendente quando o plano e valido", () => {
    const ag = makeAgendamento({ id: "ag-1", data: "2026-05-26", fim: "10:30" });
    const pend = calcularPendencias({
      agendamentos: [ag],
      evidencias: [planoValido("ag-1")],
      now: new Date("2026-05-26T09:00:00"),
    });
    expect(pend).toEqual([]);
  });

  it("gera atrasado apos o fim do slot, dentro de 24h", () => {
    const ag = makeAgendamento({ id: "ag-1", data: "2026-05-26", fim: "10:30" });
    const pend = calcularPendencias({
      agendamentos: [ag],
      evidencias: [planoValido("ag-1")],
      now: new Date("2026-05-26T12:00:00"),
    });
    expect(pend).toEqual([{ agendamentoId: "ag-1", kind: "atrasado", agendamento: ag }]);
  });

  it("gera expirado apos 24h do fim do slot", () => {
    const ag = makeAgendamento({ id: "ag-1", data: "2026-05-26", fim: "10:30" });
    const pend = calcularPendencias({
      agendamentos: [ag],
      evidencias: [planoValido("ag-1")],
      now: new Date("2026-05-28T12:00:00"),
    });
    expect(pend).toEqual([{ agendamentoId: "ag-1", kind: "expirado", agendamento: ag }]);
  });

  it("gera plano_pendente E atrasado para o mesmo agendamento", () => {
    const ag = makeAgendamento({ id: "ag-1", data: "2026-05-26", fim: "10:30" });
    const pend = calcularPendencias({
      agendamentos: [ag],
      evidencias: [],
      now: new Date("2026-05-26T12:00:00"),
    });
    expect(pend.map((p) => p.kind).sort()).toEqual(["atrasado", "plano_pendente"]);
  });
});
