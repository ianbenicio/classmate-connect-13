// Tests for src/lib/agendamento-scanner.ts — runScanner()
// Mocks all 5 stores to isolate scanner logic.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Agendamento, Aluno, Curso, Notificacao, Turma } from "@/lib/academic-types";
import type { AulaEvidencia } from "@/lib/aula-evidencias";

type AlunoMock = Pick<Aluno, "id" | "turmaId" | "nome"> & {
  userId: string | null | undefined;
};

// ── Mock stores before import ──────────────────────────────────────────

const {
  mockAgendamentos,
  mockTurmas,
  mockCursos,
  mockAlunos,
  mockEvidencias,
  addManySpy,
  ensureEvidenciasInitSpy,
} = vi.hoisted(() => ({
  mockAgendamentos: [] as Agendamento[],
  mockTurmas: [] as Turma[],
  mockCursos: [] as Curso[],
  mockAlunos: [] as AlunoMock[],
  mockEvidencias: [] as AulaEvidencia[],
  addManySpy: vi.fn<(notificacoes: Notificacao[]) => void>(),
  ensureEvidenciasInitSpy: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/agendamentos-store", () => ({
  agendamentosStore: { getAll: () => mockAgendamentos },
}));
vi.mock("@/lib/turmas-store", () => ({
  turmasStore: { getAll: () => mockTurmas },
}));
vi.mock("@/lib/cursos-store", () => ({
  cursosStore: { getAll: () => mockCursos },
}));
vi.mock("@/lib/alunos-store", () => ({
  alunosStore: { getAll: () => mockAlunos },
}));
vi.mock("@/lib/notificacoes-store", () => ({
  notificacoesStore: { addMany: addManySpy },
}));
vi.mock("@/lib/aula-evidencias-store", () => ({
  aulaEvidenciasStore: {
    getAll: () => mockEvidencias,
    ensureInit: ensureEvidenciasInitSpy,
  },
}));

// Must import AFTER vi.mock declarations
import { runScanner } from "@/lib/agendamento-scanner";
import { CURSO_MUSICA, TURMA_A, makeAgendamento, makeConcluido } from "../helpers/fixtures";

// ── Helpers ─────────────────────────────────────────────────────────────

function seedStores(agendamentos: Agendamento[], evidencias?: AulaEvidencia[]) {
  mockAgendamentos.length = 0;
  mockAgendamentos.push(...agendamentos);

  mockTurmas.length = 0;
  mockTurmas.push(TURMA_A);

  mockCursos.length = 0;
  mockCursos.push(CURSO_MUSICA);

  mockAlunos.length = 0;
  mockAlunos.push(
    { id: "a001", turmaId: TURMA_A.id, nome: "Ana", userId: "u-ana" },
    { id: "a002", turmaId: TURMA_A.id, nome: "Bob", userId: null },
  );

  mockEvidencias.length = 0;
  if (evidencias) {
    mockEvidencias.push(...evidencias);
  } else {
    mockEvidencias.push(
      ...agendamentos.map((ag) => ({
        id: `ev-plano-${ag.id}`,
        agendamentoId: ag.id,
        tipo: "plano_aula",
        status: "valido",
      })),
    );
  }
}

// ── Tests ───────────────────────────────────────────────────────────────

beforeEach(() => {
  addManySpy.mockClear();
  mockAgendamentos.length = 0;
  mockTurmas.length = 0;
  mockCursos.length = 0;
  mockAlunos.length = 0;
  mockEvidencias.length = 0;
  ensureEvidenciasInitSpy.mockClear();
});

describe("runScanner", () => {
  it("does nothing when no agendamentos exist", () => {
    runScanner(new Date("2026-05-26T12:00:00"));
    expect(addManySpy).not.toHaveBeenCalled();
  });

  it("skips concluido agendamentos", () => {
    const ag = makeConcluido({ data: "2026-05-26", fim: "08:50" });
    seedStores([ag]);
    // Even if time is past slot — concluido is skipped
    runScanner(new Date("2026-05-28T00:00:00"));
    expect(addManySpy).not.toHaveBeenCalled();
  });

  it("skips agendado state (before slot end)", () => {
    const ag = makeAgendamento({ data: "2026-05-26", fim: "10:30" });
    seedStores([ag]);
    // 09:00 is before 10:30 → agendado, no notifs
    runScanner(new Date("2026-05-26T09:00:00"));
    expect(addManySpy).not.toHaveBeenCalled();
  });

  it("generates plano_pendente notif after plan deadline when evidence is missing", () => {
    const ag = makeAgendamento({ data: "2026-05-26", inicio: "08:00", fim: "08:50" });
    seedStores([ag], []);
    // 07:00 is before class end, but after the 06:00 plan deadline.
    runScanner(new Date("2026-05-26T07:00:00"));
    expect(addManySpy).toHaveBeenCalledOnce();
    const notifs = addManySpy.mock.calls[0][0];
    expect(notifs).toHaveLength(1);
    expect(notifs[0].kind).toBe("plano_pendente");
    expect(notifs[0].destinatarioTipo).toBe("professor");
    expect(notifs[0].agendamentoId).toBe(ag.id);
  });

  it("generates atrasado notifs after slot end, within 24h", () => {
    const ag = makeAgendamento({ data: "2026-05-26", fim: "10:30" });
    seedStores([ag]);
    // 12:00 same day → atrasado
    runScanner(new Date("2026-05-26T12:00:00"));
    expect(addManySpy).toHaveBeenCalledOnce();
    const notifs = addManySpy.mock.calls[0][0];
    // 2 alunos + 1 professor = 3 notifs
    expect(notifs).toHaveLength(3);
    expect(notifs.every((n) => n.kind === "atrasado")).toBe(true);
  });

  it("generates expirado notifs after 24h past slot end", () => {
    const ag = makeAgendamento({ data: "2026-05-26", fim: "10:30" });
    seedStores([ag]);
    // 2 days later → expirado
    runScanner(new Date("2026-05-28T12:00:00"));
    expect(addManySpy).toHaveBeenCalledOnce();
    const notifs = addManySpy.mock.calls[0][0];
    expect(notifs).toHaveLength(3);
    expect(notifs.every((n) => n.kind === "expirado")).toBe(true);
  });

  it("professor notif has correct titulo for atrasado", () => {
    const ag = makeAgendamento({ data: "2026-05-26", fim: "10:30" });
    seedStores([ag]);
    runScanner(new Date("2026-05-26T12:00:00"));
    const notifs = addManySpy.mock.calls[0][0];
    const profNotif = notifs.find((n) => n.destinatarioTipo === "professor");
    expect(profNotif.titulo).toBe("Relatório pendente");
  });

  it("aluno notif has correct titulo for atrasado", () => {
    const ag = makeAgendamento({ data: "2026-05-26", fim: "10:30" });
    seedStores([ag]);
    runScanner(new Date("2026-05-26T12:00:00"));
    const notifs = addManySpy.mock.calls[0][0];
    const alunoNotifs = notifs.filter((n) => n.destinatarioTipo === "aluno");
    expect(alunoNotifs).toHaveLength(2);
    expect(alunoNotifs[0].titulo).toBe("Avalie a aula");
  });

  it("notif includes agendamentoId for dedup", () => {
    const ag = makeAgendamento({ data: "2026-05-26", fim: "10:30" });
    seedStores([ag]);
    runScanner(new Date("2026-05-26T12:00:00"));
    const notifs = addManySpy.mock.calls[0][0];
    expect(notifs.every((n) => n.agendamentoId === ag.id)).toBe(true);
  });

  it("skips notifs when turma not found", () => {
    const ag = makeAgendamento({
      data: "2026-05-26",
      fim: "10:30",
      turmaId: "nonexistent-turma",
    });
    seedStores([ag]);
    // Override turmas to not include the turma
    mockTurmas.length = 0;
    runScanner(new Date("2026-05-26T12:00:00"));
    expect(addManySpy).not.toHaveBeenCalled();
  });

  it("handles multiple agendamentos in one scan", () => {
    const ag1 = makeAgendamento({
      id: "ag-1",
      data: "2026-05-26",
      fim: "08:50",
    });
    const ag2 = makeAgendamento({
      id: "ag-2",
      data: "2026-05-25",
      fim: "10:30",
    });
    seedStores([ag1, ag2]);
    // Both are atrasado at this time
    runScanner(new Date("2026-05-26T12:00:00"));
    expect(addManySpy).toHaveBeenCalledOnce();
    const notifs = addManySpy.mock.calls[0][0];
    // 2 agendamentos × 3 notifs each = 6
    expect(notifs).toHaveLength(6);
  });

  it("aluno without userId still gets notif with null destinatarioUserId", () => {
    const ag = makeAgendamento({ data: "2026-05-26", fim: "10:30" });
    seedStores([ag]);
    runScanner(new Date("2026-05-26T12:00:00"));
    const notifs = addManySpy.mock.calls[0][0];
    const bobNotif = notifs.find((n) => n.destinatarioId === "a002");
    expect(bobNotif).toBeDefined();
    expect(bobNotif.destinatarioUserId).toBeNull();
  });
});
