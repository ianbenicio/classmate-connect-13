// Pure function tests for src/lib/academic-types.ts
// No DOM, no Supabase, no mocks — just input → output.
import { describe, expect, it } from "vitest";
import {
  addMinutesToHHMM,
  atividadeBlocos,
  blocoFim,
  blocoInicio,
  blocosPorTurno,
  computeSlotEstado,
  DEFAULT_AULA_MINUTES,
  diaSemanaFromDate,
  endSlotDate,
  endSlotPlus24h,
  formatCodigoAtividade,
  formatHorarios,
  formatHorarioSlot,
  formatMinutos,
  getDuracaoAulaMin,
  getGrupoNome,
  getTurnoDiarioMin,
  isAgendamentoAtivo,
  slotBlocosCount,
  slotDuracaoMin,
} from "@/lib/academic-types";
import {
  CURSO_MUSICA,
  CURSO_SEM_DURACAO,
  SLOT_SEG_MANHA,
  SLOT_TER_TARDE,
  makeAgendamento,
  makeConcluido,
} from "../helpers/fixtures";

// ── getDuracaoAulaMin ────────────────────────────────────────────────

describe("getDuracaoAulaMin", () => {
  it("returns curso value when defined", () => {
    expect(getDuracaoAulaMin(CURSO_MUSICA)).toBe(50);
  });

  it("returns DEFAULT_AULA_MINUTES when undefined", () => {
    expect(getDuracaoAulaMin(CURSO_SEM_DURACAO)).toBe(DEFAULT_AULA_MINUTES);
  });

  it("returns DEFAULT_AULA_MINUTES when zero", () => {
    expect(getDuracaoAulaMin({ duracaoAulaMin: 0 })).toBe(DEFAULT_AULA_MINUTES);
  });

  it("returns DEFAULT_AULA_MINUTES when negative", () => {
    expect(getDuracaoAulaMin({ duracaoAulaMin: -10 })).toBe(DEFAULT_AULA_MINUTES);
  });
});

// ── getTurnoDiarioMin ────────────────────────────────────────────────

describe("getTurnoDiarioMin", () => {
  it("returns turno when defined", () => {
    expect(getTurnoDiarioMin(CURSO_MUSICA)).toBe(150);
  });

  it("falls back to duracaoAulaMin when turno undefined", () => {
    expect(getTurnoDiarioMin({ duracaoAulaMin: 75 })).toBe(75);
  });

  it("falls back to DEFAULT when both undefined", () => {
    expect(getTurnoDiarioMin(CURSO_SEM_DURACAO)).toBe(DEFAULT_AULA_MINUTES);
  });
});

// ── addMinutesToHHMM ─────────────────────────────────────────────────

describe("addMinutesToHHMM", () => {
  it("adds minutes within same hour", () => {
    expect(addMinutesToHHMM("08:00", 30)).toBe("08:30");
  });

  it("rolls over to next hour", () => {
    expect(addMinutesToHHMM("08:45", 30)).toBe("09:15");
  });

  it("handles midnight rollover", () => {
    expect(addMinutesToHHMM("23:30", 60)).toBe("00:30");
  });

  it("adds zero minutes", () => {
    expect(addMinutesToHHMM("14:00", 0)).toBe("14:00");
  });

  it("handles large addition", () => {
    expect(addMinutesToHHMM("08:00", 150)).toBe("10:30");
  });
});

// ── formatMinutos ────────────────────────────────────────────────────

describe("formatMinutos", () => {
  it("formats zero as dash", () => {
    expect(formatMinutos(0)).toBe("—");
  });

  it("formats negative as dash", () => {
    expect(formatMinutos(-5)).toBe("—");
  });

  it("formats minutes only", () => {
    expect(formatMinutos(45)).toBe("45min");
  });

  it("formats exact hours", () => {
    expect(formatMinutos(60)).toBe("1h");
    expect(formatMinutos(120)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    expect(formatMinutos(90)).toBe("1h30");
    expect(formatMinutos(75)).toBe("1h15");
  });

  it("pads minutes with zero", () => {
    expect(formatMinutos(65)).toBe("1h05");
  });
});

// ── slotDuracaoMin ───────────────────────────────────────────────────

describe("slotDuracaoMin", () => {
  it("calculates 2h30 slot", () => {
    expect(slotDuracaoMin(SLOT_SEG_MANHA)).toBe(150);
  });

  it("calculates 2h slot", () => {
    expect(slotDuracaoMin(SLOT_TER_TARDE)).toBe(120);
  });

  it("calculates 50min slot", () => {
    expect(slotDuracaoMin({ inicio: "08:00", fim: "08:50" })).toBe(50);
  });
});

// ── slotBlocosCount ──────────────────────────────────────────────────

describe("slotBlocosCount", () => {
  it("2h30 slot with 50min blocks = 3", () => {
    expect(slotBlocosCount(SLOT_SEG_MANHA, 50)).toBe(3);
  });

  it("2h slot with 60min blocks = 2", () => {
    expect(slotBlocosCount(SLOT_TER_TARDE, 60)).toBe(2);
  });

  it("returns 1 when block >= slot", () => {
    expect(slotBlocosCount({ inicio: "08:00", fim: "08:50" }, 60)).toBe(1);
  });

  it("returns 1 when duracaoAulaMin is zero", () => {
    expect(slotBlocosCount(SLOT_SEG_MANHA, 0)).toBe(1);
  });

  it("returns 1 when duracaoAulaMin is negative", () => {
    expect(slotBlocosCount(SLOT_SEG_MANHA, -10)).toBe(1);
  });
});

// ── blocoInicio / blocoFim ───────────────────────────────────────────

describe("blocoInicio", () => {
  it("bloco 0 starts at slot start", () => {
    expect(blocoInicio(SLOT_SEG_MANHA, 0, 50)).toBe("08:00");
  });

  it("bloco 1 starts after one duration", () => {
    expect(blocoInicio(SLOT_SEG_MANHA, 1, 50)).toBe("08:50");
  });

  it("bloco 2 starts after two durations", () => {
    expect(blocoInicio(SLOT_SEG_MANHA, 2, 50)).toBe("09:40");
  });
});

describe("blocoFim", () => {
  it("bloco 0 ends at start + duration", () => {
    expect(blocoFim(SLOT_SEG_MANHA, 0, 50)).toBe("08:50");
  });

  it("bloco 1 ends at start + 2*duration", () => {
    expect(blocoFim(SLOT_SEG_MANHA, 1, 50)).toBe("09:40");
  });
});

// ── blocosPorTurno ───────────────────────────────────────────────────

describe("blocosPorTurno", () => {
  it("150min turno / 50min aula = 3 blocos", () => {
    expect(blocosPorTurno(CURSO_MUSICA)).toBe(3);
  });

  it("defaults to 1 bloco when no turno defined", () => {
    expect(blocosPorTurno(CURSO_SEM_DURACAO)).toBe(1);
  });
});

// ── atividadeBlocos ──────────────────────────────────────────────────

describe("atividadeBlocos", () => {
  it("50min carga / 50min aula = 1 bloco", () => {
    expect(atividadeBlocos(50, 50)).toBe(1);
  });

  it("75min carga / 50min aula = 2 blocos (ceil)", () => {
    expect(atividadeBlocos(75, 50)).toBe(2);
  });

  it("zero carga = 0 blocos", () => {
    expect(atividadeBlocos(0, 50)).toBe(0);
  });

  it("negative carga = 0 blocos", () => {
    expect(atividadeBlocos(-10, 50)).toBe(0);
  });
});

// ── diaSemanaFromDate ────────────────────────────────────────────────

describe("diaSemanaFromDate", () => {
  it("Monday → seg", () => {
    expect(diaSemanaFromDate(new Date("2026-05-25T12:00:00"))).toBe("seg");
  });

  it("Tuesday → ter", () => {
    expect(diaSemanaFromDate(new Date("2026-05-26T12:00:00"))).toBe("ter");
  });

  it("Sunday → dom", () => {
    expect(diaSemanaFromDate(new Date("2026-05-31T12:00:00"))).toBe("dom");
  });

  it("Saturday → sab", () => {
    expect(diaSemanaFromDate(new Date("2026-05-30T12:00:00"))).toBe("sab");
  });
});

// ── formatHorarioSlot / formatHorarios ───────────────────────────────

describe("formatHorarioSlot", () => {
  it("formats with day abbreviation", () => {
    expect(formatHorarioSlot(SLOT_SEG_MANHA)).toBe("Seg 08:00–10:30");
  });
});

describe("formatHorarios", () => {
  it("joins multiple slots", () => {
    const result = formatHorarios([SLOT_SEG_MANHA, SLOT_TER_TARDE]);
    expect(result).toBe("Seg 08:00–10:30 · Ter 14:00–16:00");
  });

  it("returns dash for empty array", () => {
    expect(formatHorarios([])).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatHorarios(undefined as unknown as [])).toBe("—");
  });
});

// ── getGrupoNome ─────────────────────────────────────────────────────

describe("getGrupoNome", () => {
  const grupos = {
    MP: [
      { cod: "C", nome: "Cordas" },
      { cod: "P", nome: "Percussão" },
    ],
  };

  it("finds grupo nome by cod", () => {
    expect(getGrupoNome(grupos, "MP", "C")).toBe("Cordas");
  });

  it("falls back to cod when not found", () => {
    expect(getGrupoNome(grupos, "MP", "X")).toBe("X");
  });

  it("falls back when curso not in map", () => {
    expect(getGrupoNome(grupos, "ZZ", "C")).toBe("C");
  });
});

// ── formatCodigoAtividade ────────────────────────────────────────────

describe("formatCodigoAtividade", () => {
  it("formats with zero-padded sequence", () => {
    expect(formatCodigoAtividade("MP", "C", 1)).toBe("MPC01");
    expect(formatCodigoAtividade("MP", "C", 12)).toBe("MPC12");
  });
});

// ── endSlotDate / endSlotPlus24h ─────────────────────────────────────

describe("endSlotDate", () => {
  it("parses date + fim to Date object", () => {
    const d = endSlotDate({ data: "2026-05-26", fim: "10:30" });
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // May = 4
    expect(d.getDate()).toBe(26);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(30);
  });
});

describe("endSlotPlus24h", () => {
  it("adds 24 hours to slot end", () => {
    const base = endSlotDate({ data: "2026-05-26", fim: "10:30" });
    const plus24 = endSlotPlus24h({ data: "2026-05-26", fim: "10:30" });
    expect(plus24.getTime() - base.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

// ── isAgendamentoAtivo ───────────────────────────────────────────────

describe("isAgendamentoAtivo", () => {
  const ag = makeAgendamento({ data: "2026-05-26", fim: "08:50" });

  it("active before slot end", () => {
    expect(isAgendamentoAtivo(ag, new Date("2026-05-26T08:00:00"))).toBe(true);
  });

  it("active within 24h after slot end", () => {
    expect(isAgendamentoAtivo(ag, new Date("2026-05-26T20:00:00"))).toBe(true);
  });

  it("inactive after 24h past slot end", () => {
    expect(isAgendamentoAtivo(ag, new Date("2026-05-28T00:00:00"))).toBe(false);
  });

  it("inactive when concluido", () => {
    const concluido = makeConcluido({ data: "2026-05-26", fim: "08:50" });
    expect(isAgendamentoAtivo(concluido, new Date("2026-05-26T08:00:00"))).toBe(false);
  });
});

// ── computeSlotEstado ────────────────────────────────────────────────

describe("computeSlotEstado", () => {
  const data = "2026-05-26";
  const fim = "10:30";

  it("vazio_futuro: no agendamento, slot in future", () => {
    expect(computeSlotEstado(data, fim, undefined, new Date("2026-05-26T08:00:00"))).toBe(
      "vazio_futuro",
    );
  });

  it("vazio_passado: no agendamento, slot in past", () => {
    expect(computeSlotEstado(data, fim, undefined, new Date("2026-05-27T00:00:00"))).toBe(
      "vazio_passado",
    );
  });

  it("concluido: agendamento with status concluido", () => {
    const ag = makeConcluido({ data, fim });
    expect(computeSlotEstado(data, fim, ag, new Date("2026-05-26T08:00:00"))).toBe("concluido");
  });

  it("agendado: before slot end", () => {
    const ag = makeAgendamento({ data, fim });
    expect(computeSlotEstado(data, fim, ag, new Date("2026-05-26T09:00:00"))).toBe("agendado");
  });

  it("agendado: exactly at slot end", () => {
    const ag = makeAgendamento({ data, fim });
    expect(computeSlotEstado(data, fim, ag, new Date("2026-05-26T10:30:00"))).toBe("agendado");
  });

  it("atrasado: after slot end, within 24h", () => {
    const ag = makeAgendamento({ data, fim });
    expect(computeSlotEstado(data, fim, ag, new Date("2026-05-26T12:00:00"))).toBe("atrasado");
  });

  it("expirado: more than 24h after slot end", () => {
    const ag = makeAgendamento({ data, fim });
    expect(computeSlotEstado(data, fim, ag, new Date("2026-05-28T00:00:00"))).toBe("expirado");
  });

  it("boundary: exactly 24h after slot end → atrasado (<=)", () => {
    const ag = makeAgendamento({ data, fim });
    expect(computeSlotEstado(data, fim, ag, new Date("2026-05-27T10:30:00"))).toBe("atrasado");
  });

  it("boundary: 1ms after 24h deadline → expirado", () => {
    const ag = makeAgendamento({ data, fim });
    const deadline = endSlotPlus24h({ data, fim });
    const after = new Date(deadline.getTime() + 1);
    expect(computeSlotEstado(data, fim, ag, after)).toBe("expirado");
  });
});
