// Janela admin de gestão de usuários: lista profiles + papéis, agrupando
// por papel. Permite editar display_name e adicionar/remover papéis.
//
// Design: cada usuário aparece em todos os grupos a que pertence. Usuários
// sem papel ficam em "Sem papel". O usuário logado não pode remover seu
// próprio papel admin (proteção contra self-lockout).
import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Pencil, Save, ShieldCheck, X, Search, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useUsers,
  usersStore,
  type UserRow,
} from "@/lib/users-store";
import { APP_ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Ordem de exibição dos grupos no acordeon.
const ROLE_ORDER: AppRole[] = [
  "admin",
  "coordenacao",
  "professor",
  "aluno",
  "viewer",
];

export function UsersManagerDialog({ open, onOpenChange }: Props) {
  const all = useUsers();
  const { user: authUser } = useAuth();
  const [filtro, setFiltro] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  // Reload ao abrir — papéis podem ter mudado em outra sessão.
  useEffect(() => {
    if (open) void usersStore.refresh();
  }, [open]);

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q),
    );
  }, [all, filtro]);

  // Buckets por papel + "sem papel".
  const buckets: Record<string, UserRow[]> = useMemo(() => {
    const out: Record<string, UserRow[]> = {
      admin: [],
      coordenacao: [],
      professor: [],
      aluno: [],
      viewer: [],
      sem_papel: [],
    };
    for (const u of filtered) {
      if (u.roles.length === 0) {
        out.sem_papel.push(u);
        continue;
      }
      for (const r of u.roles) out[r]?.push(u);
    }
    return out;
  }, [filtered]);

  const startEdit = (u: UserRow) => {
    setEditingId(u.userId);
    setDraftName(u.displayName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
  };

  const saveEdit = async (u: UserRow) => {
    if (draftName.trim() === u.displayName) {
      cancelEdit();
      return;
    }
    await usersStore.updateDisplayName(u.userId, draftName);
    toast.success("Nome atualizado.");
    cancelEdit();
  };

  const toggleRole = async (u: UserRow, role: AppRole, want: boolean) => {
    // Trava: admin não pode remover o próprio papel admin.
    if (
      !want &&
      role === "admin" &&
      authUser?.id === u.userId
    ) {
      toast.error("Você não pode remover seu próprio papel de admin.");
      return;
    }
    if (want) {
      await usersStore.addRole(u.userId, role);
      toast.success(`Papel ${APP_ROLE_LABELS[role]} atribuído.`);
    } else {
      await usersStore.removeRole(u.userId, role);
      toast.success(`Papel ${APP_ROLE_LABELS[role]} removido.`);
    }
  };

  const renderUser = (u: UserRow) => {
    const isEditing = editingId === u.userId;
    const isSelf = authUser?.id === u.userId;
    return (
      <div
        key={u.userId}
        className="rounded-lg border p-3 flex flex-col gap-3 bg-background"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            {isEditing ? (
              <Input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveEdit(u);
                  if (e.key === "Escape") cancelEdit();
                }}
                className="h-8 text-sm"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {u.displayName || <em className="text-muted-foreground">sem nome</em>}
                </span>
                {isSelf && (
                  <Badge variant="outline" className="text-[10px]">
                    você
                  </Badge>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground truncate">
              {u.email ?? "—"}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {isEditing ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => void saveEdit(u)}
                  title="Salvar"
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={cancelEdit}
                  title="Cancelar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => startEdit(u)}
                title="Editar nome"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1 border-t">
          {ROLE_ORDER.map((r) => {
            const checked = u.roles.includes(r);
            // Self-lockout: admin não pode desmarcar o próprio admin.
            const isProtected = checked && r === "admin" && isSelf;
            return (
              <label
                key={r}
                className="inline-flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  disabled={isProtected}
                  onCheckedChange={(v) => void toggleRole(u, r, !!v)}
                />
                <span
                  className={
                    checked ? "font-medium" : "text-muted-foreground"
                  }
                >
                  {APP_ROLE_LABELS[r]}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Gestão de Usuários
          </DialogTitle>
          <DialogDescription>
            Edite nomes e papéis. Cada usuário aparece em todos os grupos
            aos quais pertence.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <ScrollArea className="max-h-[60vh] -mx-2 px-2">
          {all.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12 flex flex-col items-center gap-2">
              <UsersIcon className="h-8 w-8 opacity-40" />
              Nenhum usuário cadastrado.
            </div>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={[
                "admin",
                "coordenacao",
                "professor",
                "aluno",
                "viewer",
              ]}
              className="w-full"
            >
              {ROLE_ORDER.map((r) => {
                const list = buckets[r];
                return (
                  <AccordionItem key={r} value={r}>
                    <AccordionTrigger className="text-sm">
                      <span className="flex items-center gap-2">
                        {APP_ROLE_LABELS[r]}
                        <Badge variant="secondary" className="ml-1">
                          {list.length}
                        </Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {list.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 px-1">
                          Nenhum usuário neste grupo.
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {list.map(renderUser)}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}

              {buckets.sem_papel.length > 0 && (
                <AccordionItem value="sem_papel">
                  <AccordionTrigger className="text-sm">
                    <span className="flex items-center gap-2">
                      Sem papel
                      <Badge variant="secondary" className="ml-1">
                        {buckets.sem_papel.length}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2">
                      {buckets.sem_papel.map(renderUser)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </ScrollArea>

        <p className="text-[11px] text-muted-foreground pt-2 border-t">
          <Label className="inline">Importante:</Label> esta janela altera
          papéis e nomes de exibição. E-mail de login e senha são
          gerenciados pelo Supabase Auth e não podem ser editados aqui.
        </p>
      </DialogContent>
    </Dialog>
  );
}
