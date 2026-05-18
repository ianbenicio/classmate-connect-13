// Anchor test: AuthProvider loadProfile race-guard + error paths + loading flag.
// Covers H1 (race), H2 (try/catch), M4 (loading) regressions.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { useAuth, AuthProvider } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────
const toastErrorSpy = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: toastErrorSpy, warning: vi.fn(), success: vi.fn() },
}));

type Listener = (event: string, sess: { user: { id: string } } | null) => void;
const authStateListeners: Listener[] = [];
let getSessionResolver: (s: { user: { id: string } } | null) => void = () => {};
let getSessionPromise: Promise<{ data: { session: { user: { id: string } } | null } }>;

function resetGetSession() {
  getSessionPromise = new Promise((res) => {
    getSessionResolver = (s) => res({ data: { session: s } });
  });
}
resetGetSession();

// Per-call query handlers keyed by table name.
const queryHandlers: Record<string, () => Promise<unknown>> = {};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: Listener) => {
        authStateListeners.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: () => getSessionPromise,
    },
    from: (table: string) => {
      const exec = () => queryHandlers[table]?.() ?? Promise.resolve({ data: null, error: null });
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => exec(),
        then: (r: (v: unknown) => unknown) => exec().then(r),
      };
      return chain;
    },
  },
}));

// Test harness: minimal consumer of useAuth that exposes its state.
let lastSnapshot: ReturnType<typeof useAuth> | null = null;
function Probe() {
  lastSnapshot = useAuth();
  return null;
}

beforeEach(() => {
  toastErrorSpy.mockClear();
  authStateListeners.length = 0;
  resetGetSession();
  Object.keys(queryHandlers).forEach((k) => delete queryHandlers[k]);
  lastSnapshot = null;
});

// ─────────────────────────────────────────────────────────────────────

describe("AuthProvider loading flag (M4)", () => {
  it("flips loading=false after getSession resolves with no session", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(lastSnapshot?.loading).toBe(true);
    await act(async () => {
      getSessionResolver(null);
    });
    await waitFor(() => expect(lastSnapshot?.loading).toBe(false));
  });

  it("flips loading=false after loadProfile finishes (session path)", async () => {
    queryHandlers["profiles"] = () =>
      Promise.resolve({ data: { display_name: "Alice", project_id: null }, error: null });
    queryHandlers["user_roles"] = () => Promise.resolve({ data: [{ role: "aluno" }], error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      getSessionResolver({ user: { id: "user-a" } });
    });
    await waitFor(() => expect(lastSnapshot?.loading).toBe(false));
    expect(lastSnapshot?.displayName).toBe("Alice");
    expect(lastSnapshot?.roles).toEqual(["aluno"]);
  });
});

describe("AuthProvider loadProfile error handling (H2)", () => {
  it("toasts error and still flips loading=false when profile query fails", async () => {
    queryHandlers["profiles"] = () =>
      Promise.resolve({ data: null, error: { message: "rls denied" } });
    queryHandlers["user_roles"] = () => Promise.resolve({ data: [], error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      getSessionResolver({ user: { id: "user-b" } });
    });
    await waitFor(() => expect(lastSnapshot?.loading).toBe(false));
    expect(toastErrorSpy).toHaveBeenCalled();
    expect(String(toastErrorSpy.mock.calls[0][0])).toMatch(/perfil/i);
  });

  it("unhandled throw inside loadProfile is caught and toasted", async () => {
    queryHandlers["profiles"] = () => Promise.reject(new Error("boom"));
    queryHandlers["user_roles"] = () => Promise.resolve({ data: [], error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      getSessionResolver({ user: { id: "user-c" } });
    });
    await waitFor(() => expect(lastSnapshot?.loading).toBe(false));
    expect(toastErrorSpy).toHaveBeenCalled();
  });
});

describe("AuthProvider race-guard (H1)", () => {
  it("discards stale loadProfile result when a newer one resolved first", async () => {
    let slowResolve: (v: unknown) => void = () => {};
    queryHandlers["profiles"] = () =>
      new Promise((res) => {
        slowResolve = (v) => res(v);
      });
    queryHandlers["user_roles"] = () => Promise.resolve({ data: [{ role: "aluno" }], error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      getSessionResolver({ user: { id: "user-old" } });
    });

    // Trigger a newer auth event before the first load resolves.
    queryHandlers["profiles"] = () =>
      Promise.resolve({ data: { display_name: "New", project_id: null }, error: null });
    queryHandlers["user_roles"] = () => Promise.resolve({ data: [{ role: "admin" }], error: null });

    await act(async () => {
      authStateListeners[0]?.("SIGNED_IN", { user: { id: "user-new" } });
      await new Promise((r) => setTimeout(r, 5));
    });
    await waitFor(() => expect(lastSnapshot?.displayName).toBe("New"));
    expect(lastSnapshot?.roles).toEqual(["admin"]);

    // Now resolve the stale (older-gen) load — its writes must be discarded.
    await act(async () => {
      slowResolve({ data: { display_name: "OLD STALE", project_id: null }, error: null });
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(lastSnapshot?.displayName).toBe("New");
    expect(lastSnapshot?.roles).toEqual(["admin"]);
  });
});
