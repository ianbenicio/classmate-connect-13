import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import type { UserRow } from "@/lib/users-store";
import { updateUserProfessorFields, usersStore } from "@/lib/users-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
}

export function UserProfileEditDialog({ open, onOpenChange, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName ?? "",
    telefone: user?.telefone ?? "",
    cpf: user?.cpf ?? "",
    formacao: user?.formacao ?? "",
    bio: user?.bio ?? "",
  });

  // Sincroniza com prop user quando muda
  if (user && open && formData.displayName !== user.displayName) {
    setFormData({
      displayName: user.displayName,
      telefone: user.telefone ?? "",
      cpf: user.cpf ?? "",
      formacao: user.formacao ?? "",
      bio: user.bio ?? "",
    });
  }

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Atualizar displayName se mudou
      if (formData.displayName !== user.displayName) {
        await usersStore.updateDisplayName(user.userId, formData.displayName);
      }

      // Atualizar campos de professor se existem
      await updateUserProfessorFields(user.userId, {
        telefone: formData.telefone || null,
        cpf: formData.cpf || null,
        formacao: formData.formacao || null,
        bio: formData.bio || null,
      });

      toast.success("Perfil atualizado com sucesso!");
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome de exibição */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              placeholder="Seu nome completo"
              required
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              type="tel"
              value={formData.telefone}
              onChange={(e) =>
                setFormData({ ...formData, telefone: e.target.value })
              }
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* CPF */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) =>
                setFormData({ ...formData, cpf: e.target.value })
              }
              placeholder="000.000.000-00"
            />
          </div>

          {/* Formação */}
          <div className="space-y-2">
            <Label htmlFor="formacao">Formação</Label>
            <Input
              id="formacao"
              value={formData.formacao}
              onChange={(e) =>
                setFormData({ ...formData, formacao: e.target.value })
              }
              placeholder="Ex: Licenciatura em Matemática"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              placeholder="Uma breve descrição sobre você"
              className="resize-none"
              rows={4}
            />
          </div>

          {/* Info read-only */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Informações de Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>
                E-mail: <span className="font-mono">{user.email ?? "—"}</span>
              </p>
              <p>
                ID: <span className="font-mono">{user.userId.slice(0, 8)}…</span>
              </p>
            </CardContent>
          </Card>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
