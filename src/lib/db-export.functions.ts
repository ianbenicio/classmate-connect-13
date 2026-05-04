// Cliente: lê as tabelas do banco e devolve um snapshot completo.
// Restrito a usuários com role "admin" — verificação no servidor via has_role()
// e RLS. Originalmente era uma server function (TanStack Start), convertido
// para chamada direta do client após migração para SPA estático.
import { supabase } from "@/integrations/supabase/client";

const TABELAS = [
  "cursos",
  "grupos",
  "turmas",
  "habilidades",
  "atividades",
  "alunos",
  "aluno_habilidades",
  "agendamentos",
  "avaliacoes",
  "relatorios",
  "notificacoes",
] as const;

export type ExportTabela = (typeof TABELAS)[number];

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface DbExportPayload {
  meta: {
    geradoEm: string;
    versao: 1;
    app: "academia-flow";
    fonte: "lovable-cloud";
    geradoPorUserId: string;
  };
  tabelas: { [k in ExportTabela]: { [key: string]: JsonValue }[] };
  contagens: { [k in ExportTabela]: number };
}

/**
 * Exporta snapshot do banco. Requer usuário admin (validado via RPC has_role
 * e enforçado por RLS). As leituras passam pelo client comum — RLS retorna
 * apenas o que o admin pode ver, que para tabelas sem restrição específica
 * é o conjunto inteiro.
 */
export async function exportDbSnapshot(): Promise<DbExportPayload> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (roleErr) {
    throw new Error(`Erro ao validar permissão: ${roleErr.message}`);
  }
  if (!isAdmin) {
    throw new Error("Acesso restrito a administradores.");
  }

  const tabelas = {} as DbExportPayload["tabelas"];
  const contagens = {} as DbExportPayload["contagens"];

  for (const t of TABELAS) {
    const { data, error } = await supabase.from(t).select("*").limit(50000); // teto de segurança
    if (error) {
      throw new Error(`Erro ao ler ${t}: ${error.message}`);
    }
    const linhas = (data ?? []) as { [key: string]: JsonValue }[];
    tabelas[t] = linhas;
    contagens[t] = linhas.length;
  }

  return {
    meta: {
      geradoEm: new Date().toISOString(),
      versao: 1,
      app: "academia-flow",
      fonte: "lovable-cloud",
      geradoPorUserId: user.id,
    },
    tabelas,
    contagens,
  };
}
