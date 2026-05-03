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
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import type { AppRole } from "./auth";
import { useProfessores } from "./professores-store";

/**
 * Cliente Supabase efêmero para signUp pelo admin: não persiste sessão nem
 * faz auto-refresh, então o token do admin no localStorage continua intacto.
 * Sem isso, `signUp` faria login automático do novo usuário e expulsaria
 * o admin da própria sessão.
 */
function makeIsolatedClient() {
  const url =
    import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ausentes.");
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storage: undefined,
    },
  });
}

export interface UserRow {
  userId: string;
  displayName: string;
  email: string | null;
  roles: AppRole[];
  criadoEm: string;

  // Campos migrados de professores → profiles (Fase 7)
  // Relevantes apenas para usuários com role "professor", mas presentes em todos.
  telefone?: string | null;
  cpf?: string | null;
  formacao?: string | null;
  bio?: string | null;
  fotoUrl?: string | null;
  cargaHorariaSemanalMin?: number;
  habilidadesIds?: string[];
  ativo?: boolean;
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
      .select(
        "user_id, display_name, email, created_at, telefone, cpf, formacao, bio, foto_url, carga_horaria_semanal_min, habilidades_ids, ativo",
      )
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

  users = (profilesRes.data ?? []).map((p) => {
    // p tem campos novos do schema estendido (Fase 7); usa optional chaining
    // para tolerar tipagens antigas até o regen do Database type.
    const ext = p as unknown as {
      telefone?: string | null;
      cpf?: string | null;
      formacao?: string | null;
      bio?: string | null;
      foto_url?: string | null;
      carga_horaria_semanal_min?: number | null;
      habilidades_ids?: string[] | null;
      ativo?: boolean | null;
    };
    return {
      userId: p.user_id,
      displayName: p.display_name ?? "",
      email: p.email,
      roles: rolesByUser.get(p.user_id) ?? [],
      criadoEm: p.created_at,
      telefone: ext.telefone ?? null,
      cpf: ext.cpf ?? null,
      formacao: ext.formacao ?? null,
      bio: ext.bio ?? null,
      fotoUrl: ext.foto_url ?? null,
      cargaHorariaSemanalMin: ext.carga_horaria_semanal_min ?? 0,
      habilidadesIds: ext.habilidades_ids ?? [],
      ativo: ext.ativo ?? true,
    };
  });
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

  /**
   * Cria um novo usuário via signUp em cliente isolado (não afeta a sessão
   * do admin). O trigger `handle_new_user` no banco cria a linha em
   * `profiles` automaticamente, com display_name extraído do
   * `raw_user_meta_data`. Os papéis informados são inseridos em seguida
   * pelo cliente principal (RLS de admin permite).
   *
   * Observação sobre confirmação de email:
   * - Se o projeto Supabase exigir email-confirm, o novo usuário só
   *   conseguirá logar após clicar no link recebido. Este método retorna
   *   sucesso mesmo nesse caso (a conta foi criada).
   *
   * @returns userId criado, ou null em erro.
   */
  async createUser(input: {
    email: string;
    password: string;
    displayName: string;
    roles: AppRole[];
  }): Promise<string | null> {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    if (!email || !input.password || !displayName) {
      toast.error("Email, senha e nome são obrigatórios.");
      return null;
    }
    if (input.password.length < 6) {
      toast.error("Senha precisa de pelo menos 6 caracteres.");
      return null;
    }

    const ephemeral = makeIsolatedClient();
    const { data, error } = await ephemeral.auth.signUp({
      email,
      password: input.password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      console.error("[users] createUser signUp error", error);
      toast.error(`Erro ao criar usuário: ${error.message}`);
      return null;
    }
    const newUserId = data.user?.id;
    if (!newUserId) {
      toast.error("Usuário criado, mas o ID não foi retornado.");
      return null;
    }

    // Atribui papéis solicitados (RLS admin permite escrever em user_roles).
    if (input.roles.length > 0) {
      const rows = input.roles.map((role) => ({
        user_id: newUserId,
        role,
      }));
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert(rows);
      if (roleErr) {
        console.error("[users] createUser addRoles error", roleErr);
        toast.error(`Usuário criado, mas falhou ao atribuir papéis: ${roleErr.message}`);
      }
    }

    // Recarrega lista do banco (o trigger handle_new_user cria o profile).
    await loadFromDb();
    emit();
    toast.success(
      `Usuário ${email} criado.${
        data.user?.email_confirmed_at
          ? ""
          : " Pode ser necessário confirmar o e-mail antes do primeiro login."
      }`,
    );
    return newUserId;
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

/**
 * Hook que retorna apenas usuários com um papel específico.
 * Útil para listar professores, alunos, coordenadores, etc.
 *
 * @example
 * const professores = useUsersByRole("professor");
 * const admins = useUsersByRole("admin");
 */
export function useUsersByRole(role: AppRole): UserRow[] {
  const all = useUsers();
  return all.filter((u) => u.roles.includes(role));
}

/**
 * Hook que retorna usuários com role "professor" e ativo=true.
 * Substituto direto de `useProfessores` da antiga professores-store.
 */
export function useProfessoresAtivos(): UserRow[] {
  const profs = useUsersByRole("professor");
  return profs.filter((u) => u.ativo !== false);
}

/**
 * Atualiza os campos estendidos de um usuário (antes específicos de Professor).
 * Usado pela tela de gestão de professores e edição de perfil.
 */
export async function updateUserProfessorFields(
  userId: string,
  fields: Partial<{
    telefone: string | null;
    cpf: string | null;
    formacao: string | null;
    bio: string | null;
    fotoUrl: string | null;
    cargaHorariaSemanalMin: number;
    habilidadesIds: string[];
    ativo: boolean;
  }>,
): Promise<void> {
  const dbFields: Record<string, unknown> = {};
  if (fields.telefone !== undefined) dbFields.telefone = fields.telefone;
  if (fields.cpf !== undefined) dbFields.cpf = fields.cpf;
  if (fields.formacao !== undefined) dbFields.formacao = fields.formacao;
  if (fields.bio !== undefined) dbFields.bio = fields.bio;
  if (fields.fotoUrl !== undefined) dbFields.foto_url = fields.fotoUrl;
  if (fields.cargaHorariaSemanalMin !== undefined)
    dbFields.carga_horaria_semanal_min = fields.cargaHorariaSemanalMin;
  if (fields.habilidadesIds !== undefined)
    dbFields.habilidades_ids = fields.habilidadesIds;
  if (fields.ativo !== undefined) dbFields.ativo = fields.ativo;

  const { error } = await supabase
    .from("profiles")
    .update(dbFields as never)
    .eq("user_id", userId);

  if (error) {
    console.error("[users] updateUserProfessorFields error", error);
    toast.error(`Erro ao atualizar perfil: ${error.message}`);
    return;
  }

  // Atualiza memória local
  users = users.map((u) =>
    u.userId === userId
      ? {
          ...u,
          ...(fields.telefone !== undefined && { telefone: fields.telefone }),
          ...(fields.cpf !== undefined && { cpf: fields.cpf }),
          ...(fields.formacao !== undefined && { formacao: fields.formacao }),
          ...(fields.bio !== undefined && { bio: fields.bio }),
          ...(fields.fotoUrl !== undefined && { fotoUrl: fields.fotoUrl }),
          ...(fields.cargaHorariaSemanalMin !== undefined && {
            cargaHorariaSemanalMin: fields.cargaHorariaSemanalMin,
          }),
          ...(fields.habilidadesIds !== undefined && {
            habilidadesIds: fields.habilidadesIds,
          }),
          ...(fields.ativo !== undefined && { ativo: fields.ativo }),
        }
      : u,
  );
  emit();
}

/**
 * Hook que retorna usuários disponíveis para serem vinculados como professores.
 * Exclui usuários já vinculados a um professor (professor.user_id é UNIQUE).
 * Retorna ordenado por displayName.
 */
export function useAvailableProfessorsUsers(): UserRow[] {
  // professores-store só importa UserRow como type (apagado no build),
  // então não há ciclo em runtime — import estático é seguro.
  const allUsers = useUsers();
  const allProfessores = useProfessores();

  // Cria um Set de userId já vinculados a professores
  const linkedUserIds = new Set<string>();
  for (const prof of allProfessores) {
    if (prof.userId) {
      linkedUserIds.add(prof.userId);
    }
  }

  // Retorna usuários não vinculados, ordenados por displayName
  return allUsers
    .filter((u) => !linkedUserIds.has(u.userId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
