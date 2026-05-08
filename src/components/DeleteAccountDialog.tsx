import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { UserRow } from "@/lib/users-store";
import { usersStore } from "@/lib/users-store";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
}

export function DeleteAccountDialog({ open, onOpenChange, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  async function handleDelete() {
    if (!confirmed) {
      toast.error("Você precisa confirmar para continuar");
      return;
    }

    setLoading(true);

    try {
      await usersStore.removeUser(user.userId);

      toast.success("Conta removida com sucesso. Histórico de atividades preservado.");
      onOpenChange(false);

      setTimeout(() => {
        void navigate({ to: "/auth" });
      }, 500);
    } catch (err) {
      console.error("Erro ao deletar conta:", err);
      toast.error("Erro ao remover conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive inline-flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Excluir Conta
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Aviso Importante</AlertTitle>
            <AlertDescription>
              Ao excluir sua conta:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Seu perfil será removido do sistema</li>
                <li>Seu histórico de atividades será preservado</li>
                <li>Você não poderá recuperar sua conta</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Confirmation checkbox */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              disabled={loading}
            />
            <Label
              htmlFor="confirm"
              className="text-sm cursor-pointer flex-1"
            >
              Entendo que minha conta será removida permanentemente, mas meu histórico de
              atividades será mantido no sistema
            </Label>
          </div>

          {/* Account info */}
          <div className="p-3 bg-muted/30 rounded-md space-y-1 text-xs text-muted-foreground">
            <p>
              <strong>Conta a ser removida:</strong>
            </p>
            <p>{user.displayName}</p>
            <p className="font-mono">{user.email}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmed || loading}
              className="flex-1 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? "Removendo..." : "Remover Conta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
