// =====================================================================
// UserPerfilDialog — Detalhe de um usuário (read-only)
// =====================================================================
// Mostra dados do usuário: nome, email, papéis, conta criada em,
// e link para o registro de professor se vinculado.

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, User, ShieldCheck, GraduationCap, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UserRow } from "@/lib/users-store";
import { useProfessores } from "@/lib/professores-store";
import { APP_ROLE_LABELS } from "@/lib/auth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
  /** Se quiser que clicar em "Ver perfil de professor" abra outro dialog. */
  onOpenProfessorProfile?: (professorId: string) => void;
}

export function UserPerfilDialog({
  open,
  onOpenChange,
  user,
  onOpenProfessorProfile,
}: Props) {
  if (!user) return null;

  const allProfs = useProfessores();
  const linkedProf = useMemo(
    () => allProfs.find((p) => p.userId === user.userId) ?? null,
    [allProfs, user.userId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {user.displayName || "(sem nome)"}
          </DialogTitle>
          <DialogDescription>Detalhes do usuário</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações básicas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="text-sm">{user.email ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Conta criada</p>
                  <p className="text-sm">
                    {user.criadoEm
                      ? format(parseISO(user.criadoEm), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Papéis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Papéis ({user.roles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Sem papéis atribuídos.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map((r) => (
                    <Badge key={r} variant="secondary">
                      {APP_ROLE_LABELS[r]}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vínculo com professor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base inline-flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Registro de Professor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linkedProf ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{linkedProf.nome}</p>
                      {linkedProf.formacao && (
                        <p className="text-xs text-muted-foreground">
                          {linkedProf.formacao}
                        </p>
                      )}
                    </div>
                    <Badge variant={linkedProf.ativo ? "default" : "secondary"}>
                      {linkedProf.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {onOpenProfessorProfile && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => onOpenProfessorProfile(linkedProf.id)}
                    >
                      Ver perfil completo do professor
                    </Button>
                  )}
                </div>
              ) : user.roles.includes("professor") ? (
                <p className="text-sm text-muted-foreground italic">
                  Este usuário tem papel "Professor" mas ainda não há registro
                  vinculado em Professores. Abra a janela de Professores — o
                  sync automático vai criar o registro.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Não vinculado a um registro de professor.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metadados */}
          <div className="space-y-1 text-xs text-muted-foreground p-3 rounded-md bg-muted/30">
            <p>
              ID: <span className="font-mono">{user.userId}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
