// =====================================================================
// OnboardingWizardDialog — Wizard primeiro uso (B1)
// =====================================================================
// 4 passos: Escola → Alunos CSV → 1ª Turma → Concluir
// Skip em qualquer passo. onboarding.completed em system_settings.
// Banner persiste na coordenação até onboarding concluído.

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileUp,
  GraduationCap,
  Loader2,
  PartyPopper,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { settingsStore } from "@/lib/settings-store";
import {
  parseAlunoCsv,
  importAlunos,
  downloadTemplate,
  ALUNO_TEMPLATE_HEADERS,
  type ParseResult,
  type AlunoRowParsed,
} from "@/lib/csv-import";
import { cursosStore, useCursos } from "@/lib/cursos-store";
import { requireProjectIdForWrite } from "@/lib/current-project";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

const STEPS = [
  { id: "escola", label: "Escola", Icon: Building2 },
  { id: "alunos", label: "Alunos", Icon: Users },
  { id: "turma", label: "Turma", Icon: GraduationCap },
  { id: "done", label: "Concluir", Icon: PartyPopper },
] as const;

// ---------------------------------------------------------------------------
// Step 1 — Escola
// ---------------------------------------------------------------------------

function StepEscola({ onNext }: { onNext: () => void }) {
  const [nome, setNome] = useState(() => settingsStore.get<string>("escola.nome", ""));
  const [logoUrl, setLogoUrl] = useState(() => settingsStore.get<string>("escola.logo_url", ""));
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (!nome.trim()) { toast.error("Nome da escola é obrigatório."); return; }
    setSaving(true);
    try {
      await Promise.all([
        settingsStore.set("escola.nome", nome.trim()),
        settingsStore.set("escola.logo_url", logoUrl.trim()),
      ]);
      onNext();
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure as informações básicas da escola. Editável depois em{" "}
        <b>Configurações</b>.
      </p>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="wiz-nome">Nome da escola *</Label>
          <Input
            id="wiz-nome"
            placeholder="Ex.: Escola Municipal Dom Bosco"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wiz-logo">URL do logotipo (opcional)</Label>
          <Input
            id="wiz-logo"
            placeholder="https://..."
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Link público PNG ou SVG.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void handleNext()} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <ArrowRight className="h-4 w-4" /> Próximo
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Alunos CSV
// ---------------------------------------------------------------------------

function StepAlunos({ onNext }: { onNext: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ParseResult<AlunoRowParsed> | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { toast.error("Arquivo deve ser .csv"); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setResult(parseAlunoCsv(e.target?.result as string));
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    if (!result?.valid.length) return;
    setImporting(true);
    try {
      const { done: d, errors: e } = await importAlunos(result.valid.map((r) => r.data!));
      setDone(true);
      if (e === 0) toast.success(`${d} aluno(s) importado(s).`);
      else toast.warning(`${d} importados, ${e} erros.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na importação");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Importe sua lista de alunos via CSV. Baixe o template, preencha e faça o upload.
        Pode pular e importar depois em <b>Importar CSV</b>.
      </p>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => downloadTemplate("alunos")}>
          <FileUp className="h-3.5 w-3.5" /> Baixar Template
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={done}>
          <Upload className="h-3.5 w-3.5" /> Selecionar CSV
        </Button>
      </div>

      {result && !done && (
        <div className="border rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-muted flex items-center gap-2 text-xs">
            <span className="font-medium truncate">{fileName}</span>
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ml-auto gap-1">
              <CheckCircle2 className="h-3 w-3" /> {result.valid.length} válidos
            </Badge>
            {result.invalid.length > 0 && (
              <Badge variant="outline" className="bg-red-500/15 text-red-700 dark:text-red-300 gap-1">
                <AlertCircle className="h-3 w-3" /> {result.invalid.length} inválidos
              </Badge>
            )}
          </div>
          <ScrollArea className="max-h-32">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {ALUNO_TEMPLATE_HEADERS.map((h) => (
                    <th key={h} className="px-2 py-1 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.all.slice(0, 4).map((r) => (
                  <tr key={r.row} className={r.errors.length ? "text-red-500" : ""}>
                    {ALUNO_TEMPLATE_HEADERS.map((h) => (
                      <td key={h} className="px-2 py-1 truncate max-w-[80px]">{r.raw[h] || "—"}</td>
                    ))}
                  </tr>
                ))}
                {result.all.length > 4 && (
                  <tr>
                    <td colSpan={ALUNO_TEMPLATE_HEADERS.length} className="px-2 py-1 text-muted-foreground italic">
                      ...e mais {result.all.length - 4} linhas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
          {result.valid.length > 0 && (
            <div className="px-3 py-2 border-t flex justify-end">
              <Button size="sm" onClick={() => void handleImport()} disabled={importing}>
                {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Upload className="h-3.5 w-3.5" /> Importar {result.valid.length} aluno(s)
              </Button>
            </div>
          )}
        </div>
      )}

      {done && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ Alunos importados com sucesso.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} variant={done ? "default" : "outline"}>
          <ArrowRight className="h-4 w-4" />
          {done ? "Próximo" : "Pular por agora"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Primeira Turma
// ---------------------------------------------------------------------------

function StepTurma({ onNext }: { onNext: () => void }) {
  const cursos = useCursos();
  const [nome, setNome] = useState("");
  const [cod, setCod] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleCreate = async () => {
    if (!nome.trim() || !cod.trim()) { toast.error("Nome e código são obrigatórios."); return; }
    const projectId = requireProjectIdForWrite();
    if (!projectId) { toast.error("Nenhum projeto ativo."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("turmas").insert({
        nome: nome.trim(),
        cod: cod.trim().toUpperCase(),
        curso_id: cursoId || (cursos[0]?.id ?? null),
        data: new Date().toISOString().slice(0, 10),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        horarios: [] as any,
        project_id: projectId,
      });
      if (error) throw error;
      setDone(true);
      toast.success(`Turma "${nome.trim()}" criada.`);
    } catch (e) {
      toast.error("Erro: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Crie sua primeira turma. Pode pular e criar depois em <b>Cursos &amp; Turmas</b>.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="wiz-turma-nome">Nome da turma *</Label>
          <Input id="wiz-turma-nome" placeholder="Turma A — 2024" value={nome}
            onChange={(e) => setNome(e.target.value)} disabled={done} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wiz-turma-cod">Código *</Label>
          <Input id="wiz-turma-cod" placeholder="T2024A" value={cod}
            onChange={(e) => setCod(e.target.value.toUpperCase())} disabled={done} />
        </div>
        {cursos.length > 0 && (
          <div className="space-y-1 col-span-2">
            <Label htmlFor="wiz-turma-curso">Curso</Label>
            <select id="wiz-turma-curso"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={cursoId} onChange={(e) => setCursoId(e.target.value)} disabled={done}>
              <option value="">Selecione…</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} ({c.cod})</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {done && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ Turma criada com sucesso.
        </p>
      )}
      <div className="flex justify-end gap-2">
        {!done ? (
          <>
            <Button variant="outline" onClick={onNext}>Pular por agora</Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar turma
            </Button>
          </>
        ) : (
          <Button onClick={onNext}><ArrowRight className="h-4 w-4" /> Próximo</Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Concluir
// ---------------------------------------------------------------------------

function StepDone({ onDone }: { onDone: () => void }) {
  const [saving, setSaving] = useState(false);

  const handleDone = async () => {
    setSaving(true);
    try {
      await settingsStore.set("onboarding.completed", true);
      onDone();
    } catch {
      toast.error("Erro ao marcar onboarding como concluído.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <PartyPopper className="h-14 w-14 text-primary opacity-80" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Tudo pronto! 🎉</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Sua escola está configurada e pronta para usar o Javis.
        </p>
      </div>
      <div className="bg-muted/40 rounded-lg p-4 text-left space-y-1.5">
        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Próximos passos
        </p>
        <p className="text-sm">👩‍🏫 <b>Convidar professores</b> em Usuários</p>
        <p className="text-sm">📋 <b>Registrar aulas</b> como professor</p>
        <p className="text-sm">📊 <b>Acompanhar turmas</b> no dashboard</p>
      </div>
      <Button className="w-full" onClick={() => void handleDone()} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Começar a usar o Javis
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wizard principal
// ---------------------------------------------------------------------------

export function OnboardingWizardDialog({ open, onOpenChange, onDone }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    void settingsStore.ensureInit();
    void cursosStore.ensureInit();
  }, []);

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);
  const curr = STEPS[step];

  const handleDone = () => {
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          {/* Step indicators */}
          <div className="flex items-center gap-0.5 mb-1">
            {STEPS.map((s, i) => {
              const Icon = s.Icon;
              return (
                <span key={s.id} className="flex items-center">
                  <span className={`flex items-center gap-1 text-xs font-medium ${
                    i === step ? "text-primary" : i < step ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="text-muted-foreground/30 mx-1.5 text-xs">›</span>
                  )}
                </span>
              );
            })}
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <DialogTitle className="mt-3 flex items-center gap-2">
            <curr.Icon className="h-5 w-5 text-primary" />
            {step === 0 && "Configure sua escola"}
            {step === 1 && "Importe seus alunos"}
            {step === 2 && "Crie sua primeira turma"}
            {step === 3 && "Configuração concluída"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {step === 0 && <StepEscola onNext={() => setStep(1)} />}
          {step === 1 && <StepAlunos onNext={() => setStep(2)} />}
          {step === 2 && <StepTurma onNext={() => setStep(3)} />}
          {step === 3 && <StepDone onDone={handleDone} />}
        </div>

        {step > 0 && step < 3 && (
          <div className="mt-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
