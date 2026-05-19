// =====================================================================
// SettingsDialog — Janela de configurações dinâmicas (Fase G)
// =====================================================================
// Visível para admin/coordenacao. Lê + edita system_settings via store.
// Renderiza um Tab por categoria, com input apropriado por inputType.
//
// Hoje só existe a categoria "integration" com o Drive Folder Pattern,
// mas a UI já é genérica — basta INSERIR mais settings no DB que aparecem.

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, Info, KeyRound, HardDrive } from "lucide-react";
import { GoogleServiceDialog } from "./GoogleServiceDialog";
import { useAuth } from "@/lib/auth";
import type { StorageProvider } from "@/lib/storage-interface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { settingsStore, useSettings, useSetting, type Setting } from "@/lib/settings-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  integration: "🔌 Integrações",
  windows: "⏱️ Janelas",
  limits: "📏 Limites",
  branding: "🎨 Branding",
  pos_aula: "📋 Pós-aula",
  notifications: "🔔 Notificações",
  audit: "🗄️ Auditoria",
};

// Keys com UI customizada — ocultas da listagem genérica.
const CUSTOM_UI_KEYS = new Set<string>([
  "integration.drive.service_account_json",
  "integration.drive.service_account_email",
  "integration.drive.last_validated_at",
  "integration.drive.root_folder_id",
  "integration.storage.provider", // gerenciado pelo radio de provider
]);

const STORAGE_PROVIDERS: { value: StorageProvider; label: string; desc: string }[] = [
  { value: "google", label: "Google Drive", desc: "Service Account via JWT." },
  { value: "onedrive", label: "OneDrive (M365)", desc: "OAuth2 MS Graph — Sprint E2." },
  { value: "none", label: "Nenhum", desc: "Desabilita verificação de entrega." },
];

export function SettingsDialog({ open, onOpenChange }: Props) {
  const settings = useSettings();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const categories = Array.from(new Set(settings.map((s) => s.category))).sort();
  const [activeTab, setActiveTab] = useState<string>(categories[0] ?? "integration");
  const [googleOpen, setGoogleOpen] = useState(false);
  const storedProvider = useSetting<StorageProvider>("integration.storage.provider", "google");
  const [storageProvider, setStorageProvider] = useState<StorageProvider>(storedProvider);
  const [savingProvider, setSavingProvider] = useState(false);

  // Sync provider when settings load/change externally.
  useEffect(() => {
    setStorageProvider(storedProvider);
  }, [storedProvider]);

  useEffect(() => {
    if (open && categories.length > 0 && !categories.includes(activeTab)) {
      setActiveTab(categories[0]);
    }
  }, [open, categories, activeTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" /> Configurações do sistema
          </DialogTitle>
          <DialogDescription>
            Variáveis dinâmicas editáveis pela coordenação. As mudanças têm efeito imediato.
          </DialogDescription>
        </DialogHeader>

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-md p-6 text-center">
            Nenhuma configuração cadastrada ainda.
          </p>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex-wrap h-auto">
              {categories.map((c) => (
                <TabsTrigger key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((c) => (
              <TabsContent key={c} value={c} className="space-y-4 pt-2">
                {/* ---- Bloco especial de integração (apenas tab integration) ---- */}
                {c === "integration" && (
                  <>
                    {/* Provider de armazenamento (E3.1 / E3.2) */}
                    <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                      <div className="text-sm font-medium inline-flex items-center gap-1.5">
                        <HardDrive className="h-4 w-4 text-primary" /> Provider de armazenamento
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Backend usado para verificar entrega de tarefas. Mude com cuidado — exige
                        reconfiguração de credenciais.
                      </p>
                      <div className="flex flex-wrap gap-3" role="radiogroup">
                        {STORAGE_PROVIDERS.map((p) => (
                          <label
                            key={p.value}
                            className="inline-flex items-start gap-2 text-xs cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="storage-provider"
                              value={p.value}
                              checked={storageProvider === p.value}
                              onChange={() => setStorageProvider(p.value)}
                              className="mt-0.5 h-3.5 w-3.5 accent-primary"
                              disabled={!isAdmin}
                            />
                            <span>
                              <span className={storageProvider === p.value ? "font-medium" : "text-muted-foreground"}>
                                {p.label}
                              </span>
                              <span className="block text-muted-foreground">{p.desc}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {storageProvider !== storedProvider && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setStorageProvider(storedProvider)}
                            disabled={savingProvider}
                          >
                            Reverter
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              setSavingProvider(true);
                              try {
                                await settingsStore.set("integration.storage.provider", storageProvider);
                              } finally {
                                setSavingProvider(false);
                              }
                            }}
                            disabled={savingProvider}
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            {savingProvider ? "Salvando…" : "Salvar"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Configuração Google Drive — visível só se provider = google */}
                    {storageProvider === "google" && (
                      <div className="border rounded-md p-3 flex items-center justify-between gap-3 bg-muted/30">
                        <div className="min-w-0">
                          <div className="text-sm font-medium inline-flex items-center gap-1.5">
                            <KeyRound className="h-4 w-4 text-primary" /> Service Google (Drive)
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Cadastre a Service Account + ID da pasta raiz para verificar entrega de
                            tarefas no Drive.
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setGoogleOpen(true)}
                          disabled={!isAdmin}
                          title={isAdmin ? "Configurar" : "Apenas admin pode editar credenciais"}
                        >
                          Configurar
                        </Button>
                      </div>
                    )}

                    {/* Placeholder OneDrive — Sprint E2 */}
                    {storageProvider === "onedrive" && (
                      <div className="border rounded-md p-3 bg-amber-50 dark:bg-amber-950/20 text-sm text-amber-700 dark:text-amber-400">
                        🚧 OneDrive estará disponível no Sprint E2. Por enquanto, as verificações
                        de entrega estão desativadas para este provider.
                      </div>
                    )}

                    {/* None */}
                    {storageProvider === "none" && (
                      <div className="border rounded-md p-3 bg-muted/20 text-sm text-muted-foreground">
                        Verificação de entrega de tarefas desativada. Alunos e professores não verão
                        status de drive.
                      </div>
                    )}
                  </>
                )}
                {/* Settings genéricas (exclui keys com UI customizada) */}
                {settingsStore
                  .byCategory(c)
                  .filter((s) => !CUSTOM_UI_KEYS.has(s.key))
                  .map((s) => (
                    <SettingRow key={s.key} setting={s} />
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      <GoogleServiceDialog open={googleOpen} onOpenChange={setGoogleOpen} />
    </Dialog>
  );
}

// =====================================================================
// Editor de uma setting individual
// =====================================================================
function SettingRow({ setting }: { setting: Setting }) {
  const [draft, setDraft] = useState<unknown>(setting.value);
  const [saving, setSaving] = useState(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(setting.value);

  // Sincroniza com mudanças externas (ex.: outro admin edita)
  useEffect(() => {
    setDraft(setting.value);
  }, [setting.value]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsStore.set(setting.key, draft);
      toast.success(`"${setting.label}" salvo.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-medium">{setting.label}</Label>
          <div className="text-[10px] font-mono text-muted-foreground truncate">{setting.key}</div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {setting.inputType}
        </Badge>
      </div>

      {setting.description && (
        <p className="text-xs text-muted-foreground inline-flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{setting.description}</span>
        </p>
      )}

      <SettingInput setting={setting} value={draft} onChange={setDraft} />

      {isDirty && (
        <div className="flex justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDraft(setting.value)}
            disabled={saving}
          >
            Reverter
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Render por inputType
// =====================================================================
interface InputProps {
  setting: Setting;
  value: unknown;
  onChange: (v: unknown) => void;
}

function SettingInput({ setting, value, onChange }: InputProps) {
  switch (setting.inputType) {
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={!!value}
            onCheckedChange={(v) => onChange(v)}
            id={`set-${setting.key}`}
          />
          <Label htmlFor={`set-${setting.key}`} className="text-xs">
            {value ? "Ativado" : "Desativado"}
          </Label>
        </div>
      );
    case "number":
      return (
        <Input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "json":
      return (
        <Textarea
          rows={4}
          value={typeof value === "string" ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          className="font-mono text-xs"
        />
      );
    case "color":
      return (
        <Input
          type="color"
          value={typeof value === "string" ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-24"
        />
      );
    case "url":
    case "text":
    default:
      return (
        <Input
          type={setting.inputType === "url" ? "url" : "text"}
          value={typeof value === "string" ? value : String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
