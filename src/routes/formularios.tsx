import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Eye, Lock, Pencil, Plus, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  formulariosStore,
  useFormularios,
  type FormularioDestinatario,
  type FormularioTemplate,
} from "@/lib/formularios-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/formularios")({
  component: FormulariosPage,
});

function FormulariosPage() {
  const formularios = useFormularios();
  const { isStaff: isStaffFn } = useAuth();
  const isStaff = isStaffFn();

  const [editing, setEditing] = useState<FormularioTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<FormularioTemplate | null>(null);
  const [viewing, setViewing] = useState<FormularioTemplate | null>(null);

  const grupos = useMemo(() => {
    const sistema = formularios.filter((f) => f.isSystem);
    const personalizados = formularios.filter((f) => !f.isSystem);
    return { sistema, personalizados };
  }, [formularios]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Formulários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Templates reutilizados para gerar tarefas de avaliação por aula.
          </p>
        </div>
        {isStaff && (
          <Button onClick={() => setCreating(true)}>
            <Plus /> Novo formulário
          </Button>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Do sistema
        </h2>
        {grupos.sistema.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum formulário do sistema.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {grupos.sistema.map((f) => (
              <FormularioCard
                key={f.id}
                f={f}
                isStaff={isStaff}
                onView={() => setViewing(f)}
                onEdit={() => setEditing(f)}
                onDelete={() => setDeleting(f)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Personalizados
        </h2>
        {grupos.personalizados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum formulário personalizado ainda.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {grupos.personalizados.map((f) => (
              <FormularioCard
                key={f.id}
                f={f}
                isStaff={isStaff}
                onView={() => setViewing(f)}
                onEdit={() => setEditing(f)}
                onDelete={() => setDeleting(f)}
              />
            ))}
          </div>
        )}
      </section>

      <FormularioPreviewDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        formulario={viewing}
      />

      <FormularioFormDialog open={creating} onOpenChange={setCreating} initial={null} />
      <FormularioFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template <strong>{deleting?.nome}</strong> será
              removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) {
                  await formulariosStore.remove(deleting.id);
                  toast.success("Formulário excluído.");
                  setDeleting(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function FormularioCard({
  f,
  isStaff,
  onView,
  onEdit,
  onDelete,
}: {
  f: FormularioTemplate;
  isStaff: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const blocos = (f.estrutura as { blocos?: unknown[] }).blocos ?? [];
  const totalPerguntas = blocos.reduce<number>((acc, b) => {
    const perguntas = (b as { perguntas?: unknown[] }).perguntas ?? [];
    return acc + perguntas.length;
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{f.nome}</h3>
              {f.isSystem && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Lock className="h-3 w-3" /> Sistema
                </Badge>
              )}
            </div>
            <code className="text-[11px] text-muted-foreground">{f.slug}</code>
          </div>
          <Badge variant="secondary" className="gap-1 shrink-0">
            {f.destinatario === "professor" ? (
              <>
                <User className="h-3 w-3" /> Professor
              </>
            ) : (
              <>
                <Users className="h-3 w-3" /> Aluno
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {f.descricao && <p className="text-sm text-muted-foreground">{f.descricao}</p>}
        <div className="text-xs text-muted-foreground">
          {blocos.length} bloco{blocos.length === 1 ? "" : "s"} · {totalPerguntas} pergunta
          {totalPerguntas === 1 ? "" : "s"}
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onView}>
            <Eye /> Visualizar
          </Button>
          {isStaff && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil /> Editar
            </Button>
          )}
          {isStaff && !f.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 /> Excluir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FormularioFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: FormularioTemplate | null;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [destinatario, setDestinatario] = useState<FormularioDestinatario>("professor");
  const [estruturaJson, setEstruturaJson] = useState('{\n  "blocos": []\n}');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(initial?.nome ?? "");
    setDescricao(initial?.descricao ?? "");
    setDestinatario(initial?.destinatario ?? "professor");
    setEstruturaJson(JSON.stringify(initial?.estrutura ?? { blocos: [] }, null, 2));
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    let estrutura: Record<string, unknown>;
    try {
      estrutura = JSON.parse(estruturaJson);
    } catch (e) {
      toast.error("Estrutura JSON inválida.");
      return;
    }
    setSaving(true);
    if (initial) {
      await formulariosStore.update(initial.id, {
        nome,
        descricao,
        destinatario,
        estrutura,
      });
      toast.success("Formulário atualizado.");
    } else {
      const novo = await formulariosStore.create({
        nome,
        descricao,
        destinatario,
        estrutura,
      });
      if (novo) toast.success("Formulário criado.");
    }
    setSaving(false);
    onOpenChange(false);
  };

  const isSystem = !!initial?.isSystem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar formulário" : "Novo formulário"}</DialogTitle>
          <DialogDescription>
            {isSystem
              ? "Formulário do sistema — você pode ajustar a estrutura, mas o slug é fixo."
              : "Templates reutilizados para gerar tarefas de avaliação."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="form-nome">Nome</Label>
            <Input
              id="form-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Avaliação semanal"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="form-desc">Descrição</Label>
            <Textarea
              id="form-desc"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Para que serve este formulário?"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Destinatário</Label>
            <Select
              value={destinatario}
              onValueChange={(v) => setDestinatario(v as FormularioDestinatario)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="aluno">Aluno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="form-estrutura">Estrutura (JSON)</Label>
            <Textarea
              id="form-estrutura"
              rows={14}
              value={estruturaJson}
              onChange={(e) => setEstruturaJson(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Edição avançada via JSON. Em breve, editor visual de blocos e perguntas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Salvando…" : initial ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Rótulos amigáveis para os tipos de pergunta usados em `estrutura.blocos[].perguntas[].tipo`.
const PERGUNTA_TIPO_LABELS: Record<string, string> = {
  texto_curto: "Texto curto",
  texto_longo: "Texto longo",
  escala_1_5: "Escala 1-5",
  escala_1_10: "Escala 1-10",
  sim_nao: "Sim / Não",
  multipla_escolha: "Múltipla escolha",
  numero: "Número",
  data: "Data",
};

interface PreviewPergunta {
  id?: string;
  tipo?: string;
  label?: string;
  obrigatorio?: boolean;
  opcoes?: string[];
}

interface PreviewBloco {
  titulo?: string;
  descricao?: string;
  perguntas?: PreviewPergunta[];
}

function FormularioPreviewDialog({
  open,
  onOpenChange,
  formulario,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  formulario: FormularioTemplate | null;
}) {
  if (!formulario) return null;
  const blocos = (formulario.estrutura as { blocos?: PreviewBloco[] }).blocos ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {formulario.nome}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">{formulario.descricao || "Sem descrição."}</span>
            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {formulario.destinatario === "professor" ? (
                  <>
                    <User className="h-3 w-3" /> Professor
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" /> Aluno
                  </>
                )}
              </Badge>
              {formulario.isSystem && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Lock className="h-3 w-3" /> Sistema
                </Badge>
              )}
              <code className="text-[11px] text-muted-foreground">{formulario.slug}</code>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {blocos.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Este formulário ainda não tem blocos.
            </p>
          ) : (
            blocos.map((bloco, bi) => {
              const perguntas = bloco.perguntas ?? [];
              return (
                <section key={bi} className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <header className="space-y-0.5">
                    <h4 className="text-sm font-semibold">{bloco.titulo || `Bloco ${bi + 1}`}</h4>
                    {bloco.descricao && (
                      <p className="text-xs text-muted-foreground">{bloco.descricao}</p>
                    )}
                  </header>
                  {perguntas.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma pergunta neste bloco.
                    </p>
                  ) : (
                    <ol className="space-y-2 list-decimal list-inside text-sm">
                      {perguntas.map((p, pi) => (
                        <li key={p.id ?? pi} className="space-y-1">
                          <div className="inline-flex items-start gap-2">
                            <span className="font-medium">{p.label || "(sem enunciado)"}</span>
                            {p.obrigatorio && (
                              <span className="text-destructive font-bold" title="Obrigatória">
                                *
                              </span>
                            )}
                          </div>
                          <div className="ml-5 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {PERGUNTA_TIPO_LABELS[p.tipo ?? ""] ?? p.tipo ?? "—"}
                            </Badge>
                            {p.opcoes && p.opcoes.length > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                {p.opcoes.length} opç
                                {p.opcoes.length === 1 ? "ão" : "ões"}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
