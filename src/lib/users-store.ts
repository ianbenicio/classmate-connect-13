// Store administrativa para gestão de usuários. Acessível apenas para
// admins (RLS no banco bloqueia leitura/escrita para os demais papéis).
//
// Modelo: cada usuário é uma linha em `profiles` (1:1 com auth.users) +
// 0..N papéis em `user_roles`. Aqui agregamos as duas tabelas em um único
// objeto `UserRow` para a UI.
//
// Limitações:
// - email exibido vem de `profiles.email` (sincronizado pelo trigger do
//   Supabase no signup). Editar essa coluna NÃO altera o e-mail de login;
//   por isso a UI o trata como read-only.
// - Não criamos/deletamos usuários daqui (precisa service role key, que
//   não pode rodar no client). Onboarding continua via página /auth.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppRole } from "./auth";

export interface UserRow {
  userId: string;
  displayName: string;
  email: string | null;
  roles: AppRole[];
  criadoEm: string;
}

let users: UserRow[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadFromDb(): Promise<void> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, email, created_at")
      .order("display_name", { ascending: true }),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesRes.error) {
    console.error("[users] load profiles error", profilesRes.error);
    toast.error(`Erro ao carregar usuários: ${profilesRes.error.message}`);
    return;
  }
  if (rolesRes.error) {
    console.error("[users] load roles error", rolesRes.error);
    toast.error(`Erro ao carregar papéis: ${rolesRes.error.message}`);
    return;
  }

  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of rolesRes.data ?? []) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role as AppRole);
    rolesByUser.set(r.user_id, arr);
  }

  users = (profilesRes.data ?? []).map((p) => ({
    userId: p.user_id,
    displayName: p.display_name ?? "",
    email: p.email,
    roles: rolesByUser.get(p.user_id) ?? [],
    criadoEm: p.created_at,
  }));
}

async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = loadFromDb().then(() => {
      initialized = true;
      emit();
    });
  }
  return initPromise;
}

export const usersStore = {
  getAll(): UserRow[] {
    return users;
  },

  /** Força reload do banco — útil quando o admin abre o diálogo. */
  async refresh(): Promise<void> {
    await loadFromDb();
    emit();
  },

  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("Nome não pode ficar vazio.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", userId);
    if (error) {
      console.error("[users] updateDisplayName error", error);
      toast.error(`Erro ao salvar: ${error.message}`);
      return;
    }
    users = users.map((u) =>
      u.userId === userId ? { ...u, displayName: trimmed } : u,
    );
    emit();
  },

  async addRole(userId: string, role: AppRole): Promise<void> {
    const target = users.find((u) => u.userId === userId);
    if (target?.roles.includes(role)) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (error) {
      console.error("[users] addRole error", error);
      toast.error(`Erro ao atribuir papel: ${error.message}`);
      return;
    }
    users = users.map((u) =>
      u.userId === userId ? { ...u, roles: [...u.roles, role] } : u,
    );
    emit();
  },

  /**
   * Remove o usuário do app: apaga linhas em `user_roles` e `profiles`.
   *
   * IMPORTANTE: a linha em `auth.users` permanece — apagar usuários do
   * sistema de auth exige a service role key, que só roda em ambiente
   * server-side (Edge Function). Após este remove, o usuário ainda
   * consegue logar com e-mail/senha, mas o trigger `handle_new_user`
   * NÃO recria perfil em login (só roda em INSERT). Resultado: ele entra
   * sem perfil/papéis, ficando efetivamente sem acesso a dados.
   *
   * Para apagar de verdade, o admin precisa removê-lo no painel do
   * Supabase ou via Edge Function dedicada.
   */
  async removeUser(userId: string): Promise<void> {
    // Ordem: roles → profile (FK lógica via user_id; sem cascade SQL).
    const { error: rolesErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesErr) {
      console.error("[users] removeUser roles error", rolesErr);
      toast.error(`Erro ao remover papéis: ${rolesErr.message}`);
      return;
    }
    const { error: profErr } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", userId);
    if (profErr) {
      console.error("[users] removeUser profile error", profErr);
      toast.error(`Erro ao remover perfil: ${profErr.message}`);
      return;
    }
    users = users.filter((u) => u.userId !== userId);
    emit();
  },

  async removeRole(userId: string, role: AppRole): Promise<void> {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) {
      console.error("[users] removeRole error", error);
      toast.error(`Erro ao remover papel: ${error.message}`);
      return;
    }
    users = users.map((u) =>
      u.userId === userId
        ? { ...u, roles: u.roles.filter((r) => r !== role) }
        : u,
    );
    emit();
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  ensureInit,
};

export function useUsers(): UserRow[] {
  const [snap, setSnap] = useState<UserRow[]>(usersStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = usersStore.subscribe(() =>
      setSnap([...usersStore.getAll()]),
    );
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
