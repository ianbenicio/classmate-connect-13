// Janela central de gestão de Tags de Comportamento — listar, criar, editar,
// ativar/desativar e excluir. Modela o mesmo padrão do SkillsManagerDialog.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog as InnerDialog,
  DialogContent as InnerDialogContent,
  DialogFooter as InnerDialogFooter,
  DialogHeader as InnerDialogHeader,
  DialogTitle as InnerDialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, SmilePlus, Search, EyeOff, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  comportamentoTagsStore,
  useComportamentoTags,
  type ComportamentoTagEntry,
} from "@/lib/comportamento-tags-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// -----------------------------------------------------------------------
// Formulário inline de criação / edição de uma tag
// -----------------------------------------------------------------------
function TagFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ComportamentoTagEntry | null;
}) {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("");
  const [tom, setTom] = useState<"pos" | "neg">("pos");
  const [ordem, setOrdem] = useState(0);

  useEffect(() => {
    if (open) {
      setValue(editing?.value ?? "");
      setLabel(editing?.label ?? "");
      setEmoji(editing?.emoji ?? "");
      setTom(editing?.tom ?? "pos");
      setOrdem(editing?.ordem ?? 0);
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    const v = value.trim().toLowerCase().replace(/\s+/g, "_");
    if (!v) { toast.error("Valor (slug) é obrigatório."); return; }
    if (!label.trim()) { toast.error("Rótulo é obrigatório."); return; }

    const entry: ComportamentoTagEntry = {
      id: editing?.id ?? crypto.randomUUID(),
      value: v,
      label: label.trim(),
      emoji: emoji.trim(),
      tom,
      ordem,
      ativo: editing?.ativo ?? true,
    };
    await comportamentoTagsStore.upsert(entry);
    toast.success(editing ? "Tag atualizada." : "Tag criada.");
    onOpenChange(false);
  };

  return (
    <InnerDialog open={open} onOpenChange={onOpenChange}>
      <InnerDialogContent className="max-w-sm">
        <InnerDialogHeader>
          <InnerDialogTitle>
            {editing ? "Editar tag" : "Nova tag de comportamento"}
          </InnerDialogTitle>
        </InnerDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tag-value">Slug / valor *</Label>
            <Input
              id="tag-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ex.: curioso"
              disabled={!!editing} // slug imutável — preserva dados históricos
            />
            {editing && (
              <p className="text-[11px] text-muted-foreground">
                O slug não pode ser alterado — ele está salvo em avaliações
                existentes.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tag-label">Rótulo exibido *</Label>
            <Input
              id="tag-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex.: Curioso"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tag-emoji">Emoji</Label>
              <Input
                id="tag-emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🔍"
                className="text-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tom</Label>
              <Select value={tom} onValueChange={(v) => setTom(v as "pos" | "neg")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pos">Positivo 🟢</SelectItem>
                  <SelectItem value="neg">Negativo 🟡</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tag-ordem">Ordem de exibição</Label>
            <Input
              id="tag-ordem"
              type="number"
              value={ordem}
              onChange={(e) => setOrdem(Number(e.target.value))}
              min={0}
              className="w-24"
            />
          </div>
        </div>

        <InnerDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editing ? "Salvar" : "Criar tag"}
          </Button>
        </InnerDialogFooter>
      </InnerDialogContent>
    </InnerDialog>
  );
}

// -----------------------------------------------------------------------
// Dialog principal de gestão
// -----------------------------------------------------------------------
export function TagsManagerDialog({ open, onOpenChange }: Props) {
  const allTags = useComportamentoTags();
  const [editing, setEditing] = useState<ComportamentoTagEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ComportamentoTagEntry | null>(null);
  const [filtro, setFiltro] = useState("");
  const [tomFiltro, setTomFiltro] = useState<"__all__" | "pos" | "neg">("__all__");

  const lista = allTags.filter((t) => {
    if (tomFiltro !== "__all__" && t.tom !== tomFiltro) return false;
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      t.value.includes(q) ||
      t.label.toLowerCase().includes(q)
    );
  });

  const handleNova = () => { setEditing(null); setFormOpen(true); };
  const handleEditar = (t: ComportamentoTagEntry) => { setEditing(t); setFormOpen(true); };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <SmilePlus className="h-5 w-5 text-primary" />
              Tags de Comportamento
            </DialogTitle>
            <DialogDescription>
              Gerencie as tags usadas no Checklist Individual do aluno. Novas
              tags aparecem imediatamente no formulário do professor. O slug
              nunca muda — apenas o rótulo e o emoji podem ser editados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar..."
                className="pl-8"
              />
            </div>
            <Select
              value={tomFiltro}
              onValueChange={(v) => setTomFiltro(v as typeof tomFiltro)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os tons</SelectItem>
                <SelectItem value="pos">Positivo 🟢</SelectItem>
                <SelectItem value="neg">Negativo 🟡</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleNova}>
              <Plus /> Nova
            </Button>
          </div>

          {/* Legenda de tone */}
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" /> Positivo
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Negativo
            </span>
            <span className="inline-flex items-center gap-1">
              <EyeOff className="h-3 w-3" /> Desativada (oculta no checklist)
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
            {lista.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhuma tag encontrada.
              </div>
            ) : (
              lista.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "border rounded-md p-3 flex items-center gap-3 hover:border-primary/40 transition-colors",
                    !t.ativo && "opacity-50",
                  )}
                >
                  {/* Chip de prévia */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs shrink-0",
                      t.tom === "pos"
                        ? "border-primary/40 bg-primary/10"
                        : "border-amber-500/50 bg-amber-500/10",
                    )}
                  >
                    {t.emoji && <span>{t.emoji}</span>}
                    <span className="font-medium">{t.label}</span>
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {t.value}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          t.tom === "pos"
                            ? "text-primary"
                            : "text-amber-600",
                        )}
                      >
                        {t.tom === "pos" ? "Positivo" : "Negativo"}
                      </Badge>
                      {!t.ativo && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          <EyeOff className="h-2.5 w-2.5 mr-0.5" />
                          Desativada
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ordem: {t.ordem}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      title={t.ativo ? "Desativar" : "Ativar"}
                      onClick={() => comportamentoTagsStore.toggleAtivo(t.id)}
                    >
                      {t.ativo
                        ? <Eye className="h-4 w-4 text-muted-foreground" />
                        : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditar(t)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDelete(t)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TagFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
            <AlertDialogDescription>
              A tag <strong>"{confirmDelete?.label}"</strong> (slug:{" "}
              <code>{confirmDelete?.value}</code>) será removida do banco.
              Avaliações já registradas com esse slug não são afetadas, mas a
              tag não aparecerá mais nos checklists novos.
              <br />
              <br />
              Prefira <strong>Desativar</strong> se quiser preservar o histórico
              com melhor UX.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) {
                  await comportamentoTagsStore.remove(confirmDelete.id);
                  setConfirmDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
