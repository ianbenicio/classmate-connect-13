// Anchor test: current-project singleton + requireProjectIdForWrite semantics.
// Covers H2 + C1 surface. No React, no Supabase — pure module behaviour.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastErrorSpy = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorSpy(...args),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

async function loadModule() {
  vi.resetModules();
  return import("@/lib/current-project");
}

beforeEach(() => {
  toastErrorSpy.mockClear();
  if (typeof localStorage !== "undefined") localStorage.clear();
});

afterEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});

describe("current-project singleton", () => {
  it("getCurrentProjectId returns null before setCurrentProjectId", async () => {
    const m = await loadModule();
    expect(m.getCurrentProjectId()).toBeNull();
  });

  it("setCurrentProjectId is reflected by getCurrentProjectId", async () => {
    const m = await loadModule();
    m.setCurrentProjectId("11111111-1111-1111-1111-111111111111");
    expect(m.getCurrentProjectId()).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("non-super-admin: override is ignored even if localStorage set", async () => {
    localStorage.setItem("javis:super_project_override", "22222222-2222-2222-2222-222222222222");
    const m = await loadModule();
    m.setCurrentProjectId("11111111-1111-1111-1111-111111111111");
    expect(m.getCurrentProjectId()).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("super-admin: override takes priority over currentProjectId", async () => {
    const m = await loadModule();
    m.setIsSuperAdmin(true);
    m.setCurrentProjectId("11111111-1111-1111-1111-111111111111");
    m.setSuperAdminOverride("22222222-2222-2222-2222-222222222222");
    expect(m.getCurrentProjectId()).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("super-admin: clearing override returns to currentProjectId", async () => {
    const m = await loadModule();
    m.setIsSuperAdmin(true);
    m.setCurrentProjectId("11111111-1111-1111-1111-111111111111");
    m.setSuperAdminOverride("22222222-2222-2222-2222-222222222222");
    m.setSuperAdminOverride(null);
    expect(m.getCurrentProjectId()).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("setSuperAdminOverride persists to localStorage", async () => {
    const m = await loadModule();
    m.setSuperAdminOverride("33333333-3333-3333-3333-333333333333");
    expect(localStorage.getItem("javis:super_project_override")).toBe(
      "33333333-3333-3333-3333-333333333333",
    );
  });

  it("setSuperAdminOverride(null) removes localStorage key", async () => {
    localStorage.setItem("javis:super_project_override", "abc");
    const m = await loadModule();
    m.setSuperAdminOverride(null);
    expect(localStorage.getItem("javis:super_project_override")).toBeNull();
  });
});

describe("requireProjectIdForWrite", () => {
  it("returns currentProjectId for normal user, no toast", async () => {
    const m = await loadModule();
    m.setCurrentProjectId("11111111-1111-1111-1111-111111111111");
    const id = m.requireProjectIdForWrite();
    expect(id).toBe("11111111-1111-1111-1111-111111111111");
    expect(toastErrorSpy).not.toHaveBeenCalled();
  });

  it("super-admin with override: returns override, no toast", async () => {
    const m = await loadModule();
    m.setIsSuperAdmin(true);
    m.setCurrentProjectId(null);
    m.setSuperAdminOverride("22222222-2222-2222-2222-222222222222");
    const id = m.requireProjectIdForWrite();
    expect(id).toBe("22222222-2222-2222-2222-222222222222");
    expect(toastErrorSpy).not.toHaveBeenCalled();
  });

  it("super-admin WITHOUT override: returns null AND fires toast.error", async () => {
    const m = await loadModule();
    m.setIsSuperAdmin(true);
    m.setCurrentProjectId(null);
    const id = m.requireProjectIdForWrite();
    expect(id).toBeNull();
    expect(toastErrorSpy).toHaveBeenCalledTimes(1);
    expect(String(toastErrorSpy.mock.calls[0][0])).toMatch(/super-admin/i);
  });

  it("non-super-admin without project: returns null silently (no toast)", async () => {
    const m = await loadModule();
    m.setCurrentProjectId(null);
    const id = m.requireProjectIdForWrite();
    expect(id).toBeNull();
    expect(toastErrorSpy).not.toHaveBeenCalled();
  });
});
