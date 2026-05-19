// =====================================================================
// aceitar-convite — Landing page do convite de responsável (C2.1)
// =====================================================================
// URL: /aceitar-convite/:token
// Fluxo:
//   1. lookup_invite(token) — valida e retorna dados do convite
//   2. Usuário preenche nome + senha
//   3. signUp com email do convite (ou login se já existe)
//   4. accept_invite(token, user_id) — marca aceito, upsert responsavel
//   5. Redirect para /

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/aceitar-convite/$token")({
  component: AceitarConvitePage,
});

interface InviteInfo {
  id: string;
  email: string;
  nome: string | null;
  aluno_id: string | null;
  project_id: string;
  expires_at: string;
  accepted: boolean;
}

type PageState = "loading" | "form" | "done" | "error";

function AceitarConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Lookup invite on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc("lookup_invite", {
          p_token: token,
        });

        if (error) {
          setErrorMsg("Erro ao verificar convite.");
          setState("error");
          return;
        }

        // lookup_invite returns SETOF — data is array
        const row = Array.isArray(data) ? data[0] : data;

        if (!row) {
          setErrorMsg("Convite inválido, expirado ou já aceito.");
          setState("error");
          return;
        }

        setInvite(row as InviteInfo);
        setState("form");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Erro desconhecido");
        setState("error");
      }
    })();
  }, [token]);

  // ---------------------------------------------------------------------------
  // Submit: signUp + accept_invite
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!invite) return;

    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") ?? "").trim();
    const senha = String(fd.get("senha") ?? "");
    const senhaConf = String(fd.get("senha_conf") ?? "");

    if (senha.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (senha !== senhaConf) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);

    try {
      let userId: string | undefined;

      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: invite.email,
        password: senha,
        options: {
          data: { name: nome || invite.nome || invite.email },
        },
      });

      if (signUpErr) {
        // Conta já existe — tenta login com a senha fornecida
        if (signUpErr.message.toLowerCase().includes("already registered")) {
          const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email: invite.email,
            password: senha,
          });
          if (loginErr) {
            toast.error("Email já cadastrado. Verifique a senha ou use recuperação de senha.");
            return;
          }
          userId = loginData.user?.id;
        } else {
          toast.error(signUpErr.message);
          return;
        }
      } else {
        userId = authData.user?.id;
      }

      if (!userId) {
        toast.error("Falha ao obter usuário. Tente novamente.");
        return;
      }

      // Marca convite aceito e cria responsavel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: acceptResult } = (await (supabase as any).rpc("accept_invite", {
        p_token: token,
        p_user_id: userId,
      })) as { data: { ok: boolean; error?: string } | null };

      if (!acceptResult?.ok) {
        toast.warning("Acesso configurado, mas houve um erro ao vincular o convite.");
      }

      setState("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Convite inválido
            </CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Se você acredita que este é um erro, entre em contato com a escola.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" /> Acesso configurado!
            </CardTitle>
            <CardDescription>
              Bem-vindo ao Javis. Você já pode acompanhar o progresso do(a) seu(sua) filho(a).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => void navigate({ to: "/" })}>
              Ir para o painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎓</span>
            <span className="font-bold text-lg">Javis Game Academy</span>
          </div>
          <CardTitle>Configure seu acesso</CardTitle>
          <CardDescription>
            Convite para <strong>{invite?.email}</strong>. Crie uma senha para acompanhar
            {invite?.aluno_id ? " o(a) aluno(a)" : " seus dependentes"} na plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ci-nome">Seu nome</Label>
              <Input
                id="ci-nome"
                name="nome"
                type="text"
                placeholder="Nome completo"
                defaultValue={invite?.nome ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-email">E-mail</Label>
              <Input
                id="ci-email"
                name="email"
                type="email"
                value={invite?.email ?? ""}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-senha">Senha</Label>
              <Input
                id="ci-senha"
                name="senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-senha-conf">Confirmar senha</Label>
              <Input
                id="ci-senha-conf"
                name="senha_conf"
                type="password"
                placeholder="Repita a senha"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {submitting ? "Configurando…" : "Criar acesso"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
