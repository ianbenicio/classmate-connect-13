// Dialog para gerenciar grupos/módulos de todos os cursos.
// Permite adicionar, editar e remover grupos organizados por curso.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { gruposStore } from "@/lib/grupos-store";
import { useCursos } from "@/lib/cursos-store";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GruposManagerDialog({ open, onOpenChange }: Props) {
  const cursos = useCursos();
  const allGrupos = gruposStore.getAll();

  // Inline add
  const [addingForCurso, setAddingForCurso] = useState<string | null>(null);
  const [newCod, setNewCod] = useState("");
  const [newNome, setNewNome] = useState("");

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCod, setEditCod] = useState("");
  const [editNome, setEditNome] = useState("");

  // Force re-render on store changes
  const [, setTick] = useState(0);
  useEffect(() => {
    void gruposStore.ensureInit();
    const unsub = gruposStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    if (!open) {
      setAddingForCurso(null);
      setEditingId(null);
    }
  }, [open]);

  const handleAdd = async (cursoId: string) => {
    if (!newCod.trim() || !newNome.trim()) {
      toast.error("Código e nome são obrigatórios.");
      return;
    }
    const result = await gruposStore.add(cursoId, newCod.trim().toUpperCase(), newNome.trim());
    if (result) {
      setNewCod("");
      setNewNome("");
      setAddingForCurso(null);
    }
  };

  const handleEdit = async (grupoId: string) => {
    if (!editCod.trim() || !editNome.trim()) {
      toast.error("Código e nome são obrigatórios.");
      return;
    }
    const { error } = await supabase
      .from("grupos")
      .update({ cod: editCod.trim().toUpperCase(), nome: editNome.trim() })
      .eq("id", grupoId);
    if (error) {
      console.error("[grupos] update error", error);
      if (error.code === "23505") {
        toast.error("Código já existe neste curso.");
      } else {
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
      return;
    }
    toast.success("Grupo atualizado.");
    setEditingId(null);
    // Force reload
    void gruposStore.ensureInit();
  };

  const handleRemove = async (grupoId: string, nome: string) => {
    if (!confirm(`Remover grupo "${nome}"? Atividades perderão o vínculo com este grupo.`)) return;
    const { error } = await supabase.from("grupos").delete().eq("id", grupoId);
    if (error) {
      console.error("[grupos] remove error", error);
      toast.error(`Erro ao remover: ${error.message}`);
      return;
    }
    toast.success(`Grupo "${nome}" removido.`);
    void gruposStore.ensureInit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Gerenciar Grupos / Módulos
          </DialogTitle>
        </DialogHeader>

        {cursos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum curso cadastrado.
          </p>
        ) : (
          <div className="space-y-6">
            {cursos.map((curso) => {
              const gruposDoCurso = allGrupos.filter((g) => g.cursoId === curso.id);
              return (
                <section key={curso.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {curso.cod}
                      </Badge>
                      <span className="font-medium text-sm">{curso.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        ({gruposDoCurso.length} grupo{gruposDoCurso.length !== 1 ? "s" : ""})
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingForCurso(addingForCurso === curso.id ? null : curso.id);
                        setNewCod("");
                        setNewNome("");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {gruposDoCurso.length === 0 && addingForCurso !== curso.id && (
                    <p className="text-xs text-muted-foreground italic pl-2">
                      Nenhum grupo cadastrado.
                    </p>
                  )}

                  <div className="space-y-1">
                    {gruposDoCurso.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-1.5 bg-muted/20"
                      >
                        {editingId === g.id ? (
                          <>
                            <Input
                              value={editCod}
                              onChange={(e) => setEditCod(e.target.value)}
                              className="w-20 font-mono uppercase h-7 text-xs"
                              maxLength={10}
                            />
                            <Input
                              value={editNome}
                              onChange={(e) => setEditNome(e.target.value)}
                              className="flex-1 h-7 text-xs"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleEdit(g.id)}
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="font-mono text-xs font-semibold w-16">{g.cod}</span>
                            <span className="flex-1 text-sm">{g.nome}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingId(g.id);
                                setEditCod(g.cod);
                                setEditNome(g.nome);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleRemove(g.id, g.nome)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {addingForCurso === curso.id && (
                    <div className="flex items-end gap-2 pl-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Código</Label>
                        <Input
                          value={newCod}
                          onChange={(e) => setNewCod(e.target.value)}
                          className="w-20 font-mono uppercase h-8 text-xs"
                          placeholder="EX"
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-[10px]">Nome</Label>
                        <Input
                          value={newNome}
                          onChange={(e) => setNewNome(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Nome do grupo"
                        />
                      </div>
                      <Button size="sm" className="h-8" onClick={() => handleAdd(curso.id)}>
                        Criar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setAddingForCurso(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
