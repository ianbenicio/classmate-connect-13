// =====================================================================
// ResponsavelPreferenciasDialog — Preferências de notificação (C3.1)
// =====================================================================
// Permite ao responsável (viewer) configurar opt-in/out por tipo.
// Persiste em responsaveis.preferencias_json.

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Preferencias {
  digest: boolean;
  alertas: boolean;
  mensagens: boolean;
}

const DEFAULT_PREFS: Preferencias = {
  digest: true,
  alertas: true,
  mensagens: true,
};

export function ResponsavelPreferenciasDialog({ open, onOpenChange }: Props) {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Preferencias>(DEFAULT_PREFS);
  const [responsavelId, setResponsavelId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !authUser) return;

    void (async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from("responsaveis")
          .select("id, preferencias_json")
          .eq("user_id", authUser.id)
          .maybeSingle() as { data: { id: string; preferencias_json: Preferencias } | null };

        if (data) {
          setResponsavelId(data.id);
          setPrefs({ ...DEFAULT_PREFS, ...data.preferencias_json });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, authUser]);

  const handleSave = async () => {
    if (!responsavelId) {
      toast.error("Perfil de responsável não encontrado.");
      return;
    }
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("responsaveis")
        .update({ preferencias_json: prefs })
        .eq("id", responsavelId);

      if (error) throw error;
      toast.success("Preferências salvas.");
      onOpenChange(false);
    } catch (e) {
      toast.error("Falha ao salvar: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Preferencias) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Preferências de notificação
          </DialogTitle>
          <DialogDescription>
            Escolha quais comunicações deseja receber por email.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {!responsavelId && (
              <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md p-3">
                Perfil de responsável não encontrado. Aceite o convite enviado pela escola primeiro.
              </p>
            )}

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
                  onCheckedChange={() => toggle("digest")}
                  disabled={!responsavelId}
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
                  onCheckedChange={() => toggle("alertas")}
                  disabled={!responsavelId}
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
                  onCheckedChange={() => toggle("mensagens")}
                  disabled={!responsavelId}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Para cancelar todos os emails, desative as três opções acima.
            </p>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || !responsavelId}
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
