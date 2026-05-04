// Hook de autenticação real (Supabase) com sistema de papéis.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "coordenacao" | "professor" | "aluno" | "viewer";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  coordenacao: "Coordenador",
  professor: "Professor",
  aluno: "Aluno",
  viewer: "Viewer",
};

/**
 * Papéis que têm acesso à área de staff (back-office).
 * Adicionar um novo papel aqui propaga automaticamente para toda a lógica
 * que usa `isStaff()` — sem precisar tocar em condicionais espalhados.
 */
export const STAFF_ROLES = [
  "admin",
  "coordenacao",
  "professor",
] as const satisfies readonly AppRole[];

export interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  displayName: string;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AppRole) => boolean;
  isStaff: () => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setDisplayName(profile?.display_name ?? "");
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    // Listener PRIMEIRO
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer fetch to avoid deadlocks
        setTimeout(() => void loadProfile(sess.user.id), 0);
      } else {
        setRoles([]);
        setDisplayName("");
      }
    });

    // Depois sessão atual
    void supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) void loadProfile(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    user,
    session,
    roles,
    displayName,
    loading,
    isAuthenticated: !!user,
    hasRole: (r) => roles.includes(r),
    isStaff: () => roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r)),
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: async () => {
      if (user) await loadProfile(user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
