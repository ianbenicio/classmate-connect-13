// =====================================================================
// GoogleServiceDialog — Configurar Service Account Google Drive
// =====================================================================
// Visível apenas para admin. Permite colar JSON da SA + ID da pasta raiz,
// validar via Edge Function `validate-google-sa`, e salvar.
//
// Edge Function valida:
//   1. JSON SA tem client_email + private_key
//   2. JWT assinado autentica em oauth2.googleapis.com
//   3. Drive API lista pasta com `parents=root_folder_id`
//
// ATENÇÃO: o JSON da SA contém private_key sensível. RLS específica
// restringe leitura/escrita a admin APENAS (policy "Admin only SA secret").

import { useEffect, useState } from "react";
import {
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Folder,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { settingsStore, useSetting } from "@/lib/settings-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleServiceDialog({ open, onOpenChange }: Props) {
  const savedJson = useSetting<string>("integration.drive.service_account_json", "");
  const savedFolder = useSetting<string>("integration.drive.root_folder_id", "");
  const savedEmail = useSetting<string>("integration.drive.service_account_email", "");
  const lastValidated = useSetting<string | null>("integration.drive.last_validated_at", null);

  const [jsonText, setJsonText] = useState("");
  const [folderId, setFolderId] = useState("");
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; email: string; fileCount: number; sample: { id: string; name: string }[] }
    | { ok: false; error: string; detail?: string }
    | null
  >(null);

  // Hidrata estado ao abrir
  useEffect(() => {
    if (open) {
      setJsonText(savedJson ?? "");
      setFolderId(savedFolder ?? "");
      setResult(null);
    }
  }, [open, savedJson, savedFolder]);

  // Email inferido localmente do JSON (preview antes de validar)
  const previewEmail = (() => {
    try {
      const obj = JSON.parse(jsonText);
      return typeof obj?.client_email === "string" ? obj.client_email : null;
    } catch {
      return null;
    }
  })();

  const handleValidar = async () => {
    if (!jsonText.trim()) {
      toast.error("Cole o JSON da Service Account.");
      return;
    }
    if (!folderId.trim()) {
      toast.error("Informe o ID da pasta raiz do Drive.");
      return;
    }
    setValidating(true);
    setResult(null);
    try {
      // 1) Salva no banco PRIMEIRO (Edge Function lê de lá como fallback)
      await settingsStore.set("integration.drive.service_account_json", jsonText.trim());
      await settingsStore.set("integration.drive.root_folder_id", folderId.trim());

      // 2) Chama Edge Function
      const { data, error } = await supabase.functions.invoke("validate-google-sa", {
        body: { serviceAccountJson: jsonText.trim(), rootFolderId: folderId.trim() },
      });
      if (error) {
        setResult({ ok: false, error: "invoke_failed", detail: error.message });
        toast.error(`Validação falhou: ${error.message}`);
        return;
      }
      if (data?.ok) {
        setResult(data);
        toast.success(
          `Conectado! ${data.fileCount ?? 0} arquivo(s)/pasta(s) visível(eis) na raiz.`,
        );
      } else {
        setResult(data ?? { ok: false, error: "unknown" });
        toast.error(`Validação falhou: ${data?.error ?? "erro desconhecido"}`);
      }
    } finally {
      setValidating(false);
    }
  };

  const handleLimpar = async () => {
    if (!confirm("Remover credencial Service Account? A integração será desativada.")) return;
    await settingsStore.set("integration.drive.service_account_json", "");
    await settingsStore.set("integration.drive.service_account_email", "");
    await settingsStore.set("integration.drive.last_validated_at", null);
    setJsonText("");
    setResult(null);
    toast.success("Credencial removida.");
  };

  const conectado = !!savedEmail && !!lastValidated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Service Google (Drive)
          </DialogTitle>
          <DialogDescription>
            Vincula uma Service Account do Google Cloud para o sistema verificar entrega de tarefas
            no Drive.
          </DialogDescription>
        </DialogHeader>

        {/* Status atual */}
        <div className="border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {conectado ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="h-3 w-3 mr-1" /> Não configurado
              </Badge>
            )}
          </div>
          {savedEmail && (
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              <span className="font-mono">{savedEmail}</span>
            </div>
          )}
          {lastValidated && (
            <div className="text-[10px] text-muted-foreground">
              Última validação: {new Date(lastValidated).toLocaleString("pt-BR")}
            </div>
          )}
        </div>

        {/* Instruções */}
        <div className="rounded-md bg-muted/40 border p-3 text-xs space-y-1">
          <div className="font-medium">Como obter a credencial:</div>
          <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
            <li>Google Cloud Console → IAM & Admin → Service Accounts</li>
            <li>Crie SA → role "Drive File Viewer" (ou superior)</li>
            <li>Aba Keys → Add Key → Create new key → JSON → download</li>
            <li>Compartilhe a pasta do Drive com o email da SA (read access)</li>
            <li>Cole o conteúdo do .json e o ID da pasta abaixo, e clique Validar</li>
          </ol>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gsa-folder" className="inline-flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5" /> ID da pasta raiz no Drive *
            </Label>
            <Input
              id="gsa-folder"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="ex: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456"
            />
            <p className="text-[10px] text-muted-foreground">
              Encontre na URL: drive.google.com/drive/folders/<strong>ESSE_ID</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gsa-json">JSON da Service Account *</Label>
            <Textarea
              id="gsa-json"
              rows={8}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{ "type": "service_account", "project_id": "...", "client_email": "...", "private_key": "..." }'
              className="font-mono text-[10px]"
            />
            {previewEmail && (
              <p className="text-[10px] text-emerald-600 inline-flex items-center gap-1">
                <Mail className="h-2.5 w-2.5" /> Email detectado: {previewEmail}
              </p>
            )}
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div
            className={
              "border rounded-md p-3 text-sm " +
              (result.ok
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-destructive/40 bg-destructive/5")
            }
          >
            {result.ok ? (
              <div className="space-y-1">
                <div className="font-medium inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Conexão válida
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.email} · {result.fileCount} item(ns) na raiz
                </p>
                {result.sample.length > 0 && (
                  <ul className="text-[10px] font-mono text-muted-foreground pl-4 list-disc">
                    {result.sample.map((f) => (
                      <li key={f.id}>{f.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-medium inline-flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Falha
                </div>
                <p className="text-xs">{result.error}</p>
                {result.detail && (
                  <p className="text-[10px] text-muted-foreground font-mono break-all">
                    {result.detail}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aviso security */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-700 dark:text-amber-300 inline-flex items-start gap-1.5">
          <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            O JSON contém a chave privada da SA. A leitura é restrita a administradores via RLS.
            Para máxima segurança em produção, considere usar Supabase Vault ou env vars da Edge
            Function.
          </span>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          {savedJson && (
            <Button variant="outline" onClick={handleLimpar} className="sm:mr-auto">
              Remover credencial
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleValidar} disabled={validating}>
            {validating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Validando…
              </>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5 mr-1" />
                Salvar e validar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
