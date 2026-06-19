import { useEffect, useState } from "react";
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
import { KeyRound, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { validatePasswordChangeInput } from "@/lib/password-change";
import type { UserRow } from "@/lib/users-store";
import { updateUserProfessorFields, usersStore } from "@/lib/users-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
}

export function UserProfileEditDialog({ open, onOpenChange, user }: Props) {
  const { user: authUser } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName ?? "",
    telefone: user?.telefone ?? "",
    cpf: user?.cpf ?? "",
    formacao: user?.formacao ?? "",
    bio: user?.bio ?? "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Sincroniza com prop user quando dialog abre ou user muda.
  // Usa useEffect para evitar setState em render.
  useEffect(() => {
    if (user && open) {
      setFormData({
        displayName: user.displayName,
        telefone: user.telefone ?? "",
        cpf: user.cpf ?? "",
        formacao: user.formacao ?? "",
        bio: user.bio ?? "",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user, open]);

  if (!user) return null;

  const canChangeOwnPassword = authUser?.id === user.userId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);

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
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canChangeOwnPassword) {
      toast.error("Voce so pode alterar a senha da propria conta.");
      return;
    }
    if (!authUser?.email) {
      toast.error("Conta sem e-mail de login.");
      return;
    }

    const validationError = validatePasswordChangeInput(passwordData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: passwordData.currentPassword,
      });
      if (signInError) {
        toast.error("Senha atual incorreta.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Senha atualizada com sucesso.");
    } catch (err) {
      console.error("Erro ao atualizar senha:", err);
      toast.error("Erro ao atualizar senha.");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>Atualize suas informações pessoais</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome de exibição */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* CPF */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>

          {/* Formação */}
          <div className="space-y-2">
            <Label htmlFor="formacao">Formação</Label>
            <Input
              id="formacao"
              value={formData.formacao}
              onChange={(e) => setFormData({ ...formData, formacao: e.target.value })}
              placeholder="Ex: Licenciatura em Matemática"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
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
            <Button type="submit" disabled={profileLoading} className="flex-1 gap-2">
              <Save className="h-4 w-4" />
              {profileLoading ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={profileLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {canChangeOwnPassword && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="inline-flex items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4" />
                Trocar senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" variant="secondary" disabled={passwordLoading}>
                  {passwordLoading ? "Atualizando..." : "Atualizar senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
