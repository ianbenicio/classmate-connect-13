// Pure function tests for src/lib/agendamento-permissions.ts
// Tests canManageAgendamento and canDeleteAgendamento authorization rules.
import { describe, expect, it } from "vitest";
import {
  canManageAgendamento,
  canDeleteAgendamento,
  type AgendamentoActor,
} from "@/lib/agendamento-permissions";

// ── Actors ───────────────────────────────────────────────────────────

const admin: AgendamentoActor = { userId: "u-admin", isStaff: true };
const creator: AgendamentoActor = { userId: "u-creator", isStaff: false };
const professor: AgendamentoActor = { userId: "u-prof", isStaff: false };
const outsider: AgendamentoActor = { userId: "u-outsider", isStaff: false };
const anonymous: AgendamentoActor = { userId: null, isStaff: false };

// ── Agendamento stubs ────────────────────────────────────────────────

const agendamento = {
  criadoPorUserId: "u-creator",
  professorUserId: "u-prof",
};

// ── canManageAgendamento ─────────────────────────────────────────────

describe("canManageAgendamento", () => {
  it("admin/staff can always manage", () => {
    expect(canManageAgendamento(admin, agendamento)).toBe(true);
  });

  it("creator can manage", () => {
    expect(canManageAgendamento(creator, agendamento)).toBe(true);
  });

  it("professor of the lesson can manage", () => {
    expect(canManageAgendamento(professor, agendamento)).toBe(true);
  });

  it("outsider cannot manage", () => {
    expect(canManageAgendamento(outsider, agendamento)).toBe(false);
  });

  it("anonymous (null userId) cannot manage", () => {
    expect(canManageAgendamento(anonymous, agendamento)).toBe(false);
  });

  it("professor can manage even when they didnt create it", () => {
    const ag = { criadoPorUserId: "u-someone-else", professorUserId: "u-prof" };
    expect(canManageAgendamento(professor, ag)).toBe(true);
  });
});

// ── canDeleteAgendamento ─────────────────────────────────────────────

describe("canDeleteAgendamento", () => {
  it("admin/staff can always delete", () => {
    expect(canDeleteAgendamento(admin, agendamento)).toBe(true);
  });

  it("creator can delete", () => {
    expect(canDeleteAgendamento(creator, agendamento)).toBe(true);
  });

  it("professor CANNOT delete (stricter rule)", () => {
    expect(canDeleteAgendamento(professor, agendamento)).toBe(false);
  });

  it("outsider cannot delete", () => {
    expect(canDeleteAgendamento(outsider, agendamento)).toBe(false);
  });

  it("anonymous cannot delete", () => {
    expect(canDeleteAgendamento(anonymous, agendamento)).toBe(false);
  });

  it("professor who is also creator CAN delete", () => {
    const profCreator: AgendamentoActor = { userId: "u-creator", isStaff: false };
    expect(canDeleteAgendamento(profCreator, agendamento)).toBe(true);
  });
});
