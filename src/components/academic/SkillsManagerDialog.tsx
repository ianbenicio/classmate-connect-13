// Janela central de gestão de Habilidades — listar, criar, editar, excluir.
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2, Sparkles, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHabilidades, habilidadesStore } from "@/lib/habilidades-store";
import type { Habilidade } from "@/lib/academic-types";
import { SkillFormDialog } from "./SkillFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkillsManagerDialog({ open, onOpenChange }: Props) {
  const habilidades = useHabilidades();
  const [editing, setEditing] = useState<Habilidade | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Habilidade | null>(null);
  const [filtro, setFiltro] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState<string>("__all__");

  const grupos = Array.from(
    new Set(habilidades.map((h) => h.grupo).filter((g): g is string => !!g)),
  ).sort();

  const lista = habilidades.filter((h) => {
    if (grupoFiltro !== "__all__") {
      if (grupoFiltro === "__none__") {
        if (h.grupo) return false;
      } else if (h.grupo !== grupoFiltro) {
        return false;
      }
    }
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      h.sigla.toLowerCase().includes(q) ||
      (h.nome ?? "").toLowerCase().includes(q) ||
      h.descricao.toLowerCase().includes(q) ||
      (h.grupo ?? "").toLowerCase().includes(q)
    );
  });

  const handleNova = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEditar = (h: Habilidade) => {
    setEditing(h);
    setFormOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Habilidades
            </DialogTitle>
            <DialogDescription>
              Cadastre habilidades. Vincule-as a cursos (até 8) e a atividades (até 5) nos
              respectivos formulários.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar..."
                className="pl-8"
              />
            </div>
            <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os grupos</SelectItem>
                <SelectItem value="__none__">Sem grupo</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleNova}>
              <Plus /> Nova
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
            {lista.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhuma habilidade encontrada.
              </div>
            ) : (
              lista.map((h) => (
                <div
                  key={h.id}
                  className="border rounded-md p-3 flex items-start gap-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-mono">
                        {h.sigla}
                      </Badge>
                      {h.nome && <span className="text-sm font-medium">{h.nome}</span>}
                      {h.grupo && <span className="text-xs text-muted-foreground">{h.grupo}</span>}
                    </div>
                    <p className="text-sm leading-snug text-muted-foreground">{h.descricao}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditar(h)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDelete(h)}
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

      <SkillFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir habilidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A habilidade
              {confirmDelete && ` "${confirmDelete.sigla}"`} será removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) {
                  await habilidadesStore.remove(confirmDelete.id);
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
