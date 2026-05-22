// =====================================================================
// Preferências / Cancelar inscrição — landing pública (C3.2)
// =====================================================================
// Route: /preferencias?token=<unsubscribe_token>
// Pública — responsável não precisa estar logado.
// Permite opt-out one-click ou ajuste granular de preferências.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Mail, MessageSquare, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/preferencias")({
  component: PreferenciasPage,
});

interface Preferencias {
  digest: boolean;
  alertas: boolean;
  mensagens: boolean;
}

type PageState = "loading" | "form" | "unsubscribed" | "error";

function PreferenciasPage() {
  const search = Route.useSearch() as { token?: string };
  const token = search.token;
  const [pageState, setPageState] = useState<PageState>("loading");
  const [nome, setNome] = useState<string>("");
  const [prefs, setPrefs] = useState<Preferencias>({
    digest: true,
    alertas: true,
    mensagens: true,
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("Token de acesso não encontrado. Verifique o link do e-mail.");
      setPageState("error");
      return;
    }

    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await (supabase as any).rpc("get_responsavel_prefs", {
        p_token: token,
      })) as {
        data: {
          ok: boolean;
          nome?: string;
          email_status?: string;
          preferencias?: Preferencias;
          reason?: string;
        } | null;
        error: unknown;
      };

      if (error || !data?.ok) {
        setErrorMsg(
          data?.reason === "token_not_found"
            ? "Link inválido ou expirado. Entre em contato com a escola."
            : "Erro ao carregar preferências.",
        );
        setPageState("error");
        return;
      }

      if (data.email_status === "unsubscribed") {
        setNome(data.nome ?? "");
        setPageState("unsubscribed");
        return;
      }

      setNome(data.nome ?? "");
      setPrefs({ ...{ digest: true, alertas: true, mensagens: true }, ...data.preferencias });
      setPageState("form");
    })();
  }, [token]);

  const handleOptOut = async () => {
    if (!token) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await (supabase as any).rpc("opt_out_responsavel", {
        p_token: token,
      })) as { data: { ok: boolean } | null; error: unknown };

      if (error || !data?.ok) throw new Error("Falha ao cancelar inscrição.");
      setPageState("unsubscribed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
            <p className="font-medium">{errorMsg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "unsubscribed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
            <p className="text-lg font-semibold">Inscrição cancelada</p>
            {nome && (
              <p className="text-sm text-muted-foreground">
                {nome}, você não receberá mais e-mails desta escola.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Para reativar as notificações, acesse o Portal do Responsável e ative nas
              Preferências.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Preferências de notificação
          </CardTitle>
          {nome && (
            <CardDescription>Olá, {nome}. Configure quais e-mails deseja receber.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <Label htmlFor="pref-digest" className="text-sm font-medium cursor-pointer">
                    Resumo semanal
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Email domingo com presença e atividades da semana.
                  </p>
                </div>
              </div>
              <Switch
                id="pref-digest"
                checked={prefs.digest}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, digest: v }))}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <Bell className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <Label htmlFor="pref-alertas" className="text-sm font-medium cursor-pointer">
                    Alertas de ausência
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notificação imediata quando uma falta é registrada.
                  </p>
                </div>
              </div>
              <Switch
                id="pref-alertas"
                checked={prefs.alertas}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, alertas: v }))}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <Label htmlFor="pref-mensagens" className="text-sm font-medium cursor-pointer">
                    Mensagens da escola
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Comunicados gerais e avisos da coordenação.
                  </p>
                </div>
              </div>
              <Switch
                id="pref-mensagens"
                checked={prefs.mensagens}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, mensagens: v }))}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Para cancelar todos os e-mails de uma vez, use o botão abaixo.
          </p>

          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
            onClick={() => void handleOptOut()}
            disabled={saving}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Cancelar todos os e-mails
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
