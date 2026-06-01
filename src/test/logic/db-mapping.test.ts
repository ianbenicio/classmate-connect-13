// Pure function tests for src/lib/db-mapping.ts
// Validates deterministic UUID conversion and array mapping.
import { describe, expect, it } from "vitest";
import { toUuid, toUuidArray } from "@/lib/db-mapping";
import { validate as uuidValidate } from "uuid";

describe("toUuid", () => {
  it("returns valid UUID for seed string", () => {
    const result = toUuid("MPC01");
    expect(uuidValidate(result)).toBe(true);
  });

  it("is deterministic — same input always same output", () => {
    expect(toUuid("MPC01")).toBe(toUuid("MPC01"));
  });

  it("different inputs produce different UUIDs", () => {
    expect(toUuid("MPC01")).not.toBe(toUuid("MPC02"));
  });

  it("returns valid UUID even if input is already a UUID string", () => {
    const uuid = "11111111-1111-1111-1111-111111111111";
    const result = toUuid(uuid);
    expect(uuidValidate(result)).toBe(true);
  });

  it("returns empty string for empty input", () => {
    expect(toUuid("")).toBe("");
  });

  it("handles special characters in seed", () => {
    const result = toUuid("turma-alpha/2026");
    expect(uuidValidate(result)).toBe(true);
  });
});

describe("toUuidArray", () => {
  it("maps array of seed strings to UUIDs", () => {
    const result = toUuidArray(["a", "b", "c"]);
    expect(result).toHaveLength(3);
    result.forEach((r) => expect(uuidValidate(r)).toBe(true));
  });

  it("returns empty array for null", () => {
    expect(toUuidArray(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(toUuidArray(undefined)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(toUuidArray([])).toEqual([]);
  });

  it("produces valid UUIDs even for UUID-formatted input", () => {
    const uuid = "22222222-2222-2222-2222-222222222222";
    const result = toUuidArray([uuid]);
    expect(result).toHaveLength(1);
    expect(uuidValidate(result[0])).toBe(true);
  });

  it("is consistent with toUuid for each element", () => {
    const ids = ["seed1", "seed2"];
    const result = toUuidArray(ids);
    expect(result[0]).toBe(toUuid("seed1"));
    expect(result[1]).toBe(toUuid("seed2"));
  });
});
