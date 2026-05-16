// Hook de autenticação real (Supabase) com sistema de papéis + tenant (projeto).
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setCurrentProjectId, setIsSuperAdmin } from "./current-project";

export type AppRole = "super_admin" | "admin" | "coordenacao" | "professor" | "aluno" | "viewer";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  coordenacao: "Coordenador",
  professor: "Professor",
  aluno: "Aluno",
  viewer: "Viewer",
};

/** Tenant ativo do usuário logado. NULL quando super_admin sem vínculo. */
export interface Projeto {
  id: string;
  slug: string;
  nome: string;
  logoUrl?: string | null;
  corPrimaria?: string | null;
}

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
  /** Projeto/tenant ativo. NULL pra super_admin sem vínculo. */
  currentProject: Projeto | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AppRole) => boolean;
  /** Super-admin cross-project (você, Ian). */
  isSuperAdmin: () => boolean;
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
  const [currentProject, setCurrentProject] = useState<Projeto | null>(null);
  const [loading, setLoading] = useState(true);

  // H1: race-guard. Auth events can fire concurrently (initial getSession +
  // onAuthStateChange burst). Track the most-recent load uid; older completions
  // are discarded so stale data never overwrites fresh state.
  const loadGenRef = useRef(0);
  const lastUidRef = useRef<string | null>(null);

  const loadProfile = async (uid: string) => {
    const gen = ++loadGenRef.current;
    lastUidRef.current = uid;
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("display_name, project_id").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    // Stale guard: newer load fired or user switched mid-flight → drop result.
    if (gen !== loadGenRef.current || lastUidRef.current !== uid) return;
    setDisplayName(profile?.display_name ?? "");
    const parsedRoles = (roleRows ?? []).map((r) => r.role as AppRole);
    setRoles(parsedRoles);
    setIsSuperAdmin(parsedRoles.includes("super_admin"));

    // Carrega projeto vinculado (NULL para super_admin sem vínculo).
    const projectId = (profile as { project_id?: string | null } | null)?.project_id ?? null;
    if (projectId) {
      const { data: proj } = await supabase
        .from("projetos")
        .select("id, slug, nome, logo_url, cor_primaria")
        .eq("id", projectId)
        .maybeSingle();
      if (gen !== loadGenRef.current || lastUidRef.current !== uid) return;
      if (proj) {
        const p: Projeto = {
          id: proj.id,
          slug: proj.slug,
          nome: proj.nome,
          logoUrl: proj.logo_url,
          corPrimaria: proj.cor_primaria,
        };
        setCurrentProject(p);
        setCurrentProjectId(p.id);
        // Aplica cor primária como CSS variable (branding leve)
        if (typeof document !== "undefined" && p.corPrimaria) {
          document.documentElement.style.setProperty("--brand-primary", p.corPrimaria);
        }
      } else {
        setCurrentProject(null);
        setCurrentProjectId(null);
      }
    } else {
      setCurrentProject(null);
      setCurrentProjectId(null);
    }
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
        setCurrentProject(null);
        setCurrentProjectId(null);
        setIsSuperAdmin(false);
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
    currentProject,
    loading,
    isAuthenticated: !!user,
    hasRole: (r) => roles.includes(r),
    isSuperAdmin: () => roles.includes("super_admin"),
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
