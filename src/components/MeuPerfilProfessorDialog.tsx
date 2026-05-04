// =====================================================================
// MeuPerfilProfessorDialog — Wrapper para o professor logado ver o
// próprio perfil pelo menu do header.
// =====================================================================
// Reusa ProfessorPerfilDialog, mas resolve `professor`, `avaliacoes` e
// `agendamentos` automaticamente a partir do usuário autenticado.

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfessorPerfilDialog } from "@/components/admin/ProfessorPerfilDialog";
import { useAuth } from "@/lib/auth";
import { useProfessores, useProfessorAvaliacoes } from "@/lib/professores-store";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { GraduationCap } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeuPerfilProfessorDialog({ open, onOpenChange }: Props) {
  const { user, displayName } = useAuth();
  const professores = useProfessores();
  const agendamentos = useAgendamentos();

  // Resolve o registro de Professor pelo userId do auth.
  const professor = useMemo(() => {
    if (!user?.id) return null;
    return professores.find((p) => p.userId === user.id) ?? null;
  }, [professores, user?.id]);

  // Avaliações específicas deste professor (filtradas pelo store).
  const avaliacoes = useProfessorAvaliacoes(professor?.id);

  // Caso o usuário tenha role "professor" mas o registro ainda não exista
  // (ex.: trigger de sync atrasou), exibe um placeholder amigável em vez
  // de não renderizar nada — assim o usuário entende o estado.
  if (!professor) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Meu perfil
            </DialogTitle>
            <DialogDescription>
              Ainda não há registro de professor vinculado à sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Sua conta tem o papel <strong>Professor</strong>, mas o registro detalhado ainda
              não foi criado. Peça à coordenação para abrir a janela de Professores — o sync
              automático vai criar o registro.
            </p>
            <p className="text-xs">
              Conta: <strong>{displayName || user?.email || "—"}</strong>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ProfessorPerfilDialog
      open={open}
      onOpenChange={onOpenChange}
      professor={professor}
      avaliacoes={avaliacoes}
      agendamentos={agendamentos}
      userName={displayName || user?.email || undefined}
    />
  );
}
