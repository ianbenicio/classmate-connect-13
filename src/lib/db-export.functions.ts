// Server function: lê as tabelas do banco (Lovable Cloud) e devolve um snapshot
// completo. Restrito a usuários com role "admin".
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export interface DbExportPayload {
  meta: {
    geradoEm: string;
    versao: 1;
    app: "academia-flow";
    fonte: "lovable-cloud";
    geradoPorUserId: string;
  };
  tabelas: Record<ExportTabela, unknown[]>;
  contagens: Record<ExportTabela, number>;
}

export const exportDbSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DbExportPayload> => {
    // Confere se o usuário tem role admin (via has_role)
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr) {
      throw new Response(`Erro ao validar permissão: ${roleErr.message}`, {
        status: 500,
      });
    }
    if (!isAdmin) {
      throw new Response("Acesso restrito a administradores.", { status: 403 });
    }

    const tabelas = {} as Record<ExportTabela, unknown[]>;
    const contagens = {} as Record<ExportTabela, number>;

    for (const t of TABELAS) {
      // Usa supabaseAdmin (service role) para bypass de RLS — já validamos admin acima.
      const { data, error } = await supabaseAdmin
        .from(t)
        .select("*")
        .limit(50000); // teto de segurança
      if (error) {
        throw new Response(`Erro ao ler ${t}: ${error.message}`, {
          status: 500,
        });
      }
      tabelas[t] = data ?? [];
      contagens[t] = (data ?? []).length;
    }

    return {
      meta: {
        geradoEm: new Date().toISOString(),
        versao: 1,
        app: "academia-flow",
        fonte: "lovable-cloud",
        geradoPorUserId: context.userId,
      },
      tabelas,
      contagens,
    };
  });
