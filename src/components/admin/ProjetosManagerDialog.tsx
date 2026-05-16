// =====================================================================
// ProjetosManagerDialog — Gestão de tenants (Fase J.4)
// =====================================================================
// Visível apenas para super_admin. CRUD básico: lista, cria, edita
// (nome/cor), remove (bloqueado se houver dados vinculados via FK).

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Save, Pencil, X } from "lucide-react";
import { useProjetos, projetosStore, type ProjetoRow } from "@/lib/projetos-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function ProjetosManagerDialog({ open, onOpenChange }: Props) {
  const projetos = useProjetos();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState("#3b82f6");
  const [novoOpen, setNovoOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setEditingId(null);
      setNovoOpen(false);
    }
  }, [open]);

  const startEdit = (p: ProjetoRow) => {
    setEditingId(p.id);
    setEditNome(p.nome);
    setEditCor(p.corPrimaria ?? "#3b82f6");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editNome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    await projetosStore.update(editingId, { nome: editNome, corPrimaria: editCor });
    setEditingId(null);
  };

  const remove = async (p: ProjetoRow) => {
    if (
      !confirm(
        `Remover projeto "${p.nome}"? Esta ação só funciona se não houver dados vinculados.`,
      )
    )
      return;
    await projetosStore.remove(p.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Projetos (tenants)
          </DialogTitle>
          <DialogDescription>
            Cada projeto é um cliente isolado. Slug é imutável após criação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {projetos.length} projeto(s) cadastrado(s).
          </p>
          <Button size="sm" onClick={() => setNovoOpen(true)} disabled={novoOpen}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo projeto
          </Button>
        </div>

        {novoOpen && <NovoProjetoForm onClose={() => setNovoOpen(false)} />}

        <ul className="border rounded-md divide-y max-h-[55vh] overflow-y-auto">
          {projetos.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted-foreground">
              Nenhum projeto. Crie o primeiro acima.
            </li>
          ) : (
            projetos.map((p) => (
              <li key={p.id} className="p-3">
                {editingId === p.id ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {p.slug}
                    </Badge>
                    <Input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="color"
                      value={editCor}
                      onChange={(e) => setEditCor(e.target.value)}
                      className="h-8 w-12 p-1"
                    />
                    <Button size="sm" onClick={saveEdit}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                        {p.slug}
                      </Badge>
                      <span className="text-sm font-medium truncate">{p.nome}</span>
                      {p.corPrimaria && (
                        <span
                          className="inline-block w-4 h-4 rounded border shrink-0"
                          style={{ backgroundColor: p.corPrimaria }}
                          title={p.corPrimaria}
                        />
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(p)}
                        title="Editar nome/cor"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove(p)}
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoProjetoForm({ onClose }: { onClose: () => void }) {
  const [slug, setSlug] = useState("");
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#3b82f6");
  const [salvando, setSalvando] = useState(false);

  const handleSave = async () => {
    if (!slug.trim() || !nome.trim()) {
      toast.error("Slug e nome são obrigatórios.");
      return;
    }
    if (!SLUG_RE.test(slug)) {
      toast.error("Slug inválido. Use kebab-case (ex: cliente-novo).");
      return;
    }
    setSalvando(true);
    const novo = await projetosStore.create({ slug, nome, corPrimaria: cor });
    setSalvando(false);
    if (novo) {
      toast.success(`Projeto "${novo.nome}" criado.`);
      onClose();
    }
  };

  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="np-slug" className="text-xs">
            Slug *
          </Label>
          <Input
            id="np-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="cliente-novo"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="np-nome" className="text-xs">
            Nome *
          </Label>
          <Input
            id="np-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Cliente Novo Ltda."
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Cor primária</Label>
          <Input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-8 w-16 p-1"
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onClose} disabled={salvando}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={salvando}>
          {salvando ? "Salvando…" : "Criar"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Slug fica imutável após criação. Use letras minúsculas, números e hífen.
      </p>
    </div>
  );
}
