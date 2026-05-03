// =====================================================================
// UserPerfilDialog — Detalhe de um usuário (read-only)
// =====================================================================
// Mostra dados do usuário: nome, email, papéis, conta criada em,
// e link para o registro de professor se vinculado.
// Para professores, exibe também suas horas de aula baseado em avaliações.

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
import { Mail, User, ShieldCheck, GraduationCap, Calendar, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UserRow } from "@/lib/users-store";
// Fase 8: professor é apenas user com role "professor" — sem store separada.
import { APP_ROLE_LABELS } from "@/lib/auth";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { gerarExtratoHoras, formatarHoras } from "@/lib/relatorio-extrato-horas";

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

  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();

  // Fase 8: usuário "é" professor se tem a role. Dados estão no próprio user.
  const isProfessor = user.roles.includes("professor");
  const linkedProf = useMemo(
    () =>
      isProfessor
        ? {
            id: user.userId, // id === userId agora
            userId: user.userId,
            nome: user.displayName,
            formacao: user.formacao ?? null,
            ativo: user.ativo ?? true,
          }
        : null,
    [isProfessor, user.userId, user.displayName, user.formacao, user.ativo],
  );

  // Calcula horas de aula do professor baseado em agendamentos e avaliações
  const professorHours = useMemo(() => {
    if (!isProfessor || !linkedProf) return null;

    // Usa o display name do usuário como identificador do professor
    const professorName = user.displayName || "";

    // Filtra agendamentos do professor
    const professorAgendamentos = agendamentos.filter(
      (ag) => ag.professor === professorName || ag.professorUserId === user.userId,
    );

    if (professorAgendamentos.length === 0) {
      return { totalHoras: 0, totalAulas: 0, aulasAvaliadas: 0 };
    }

    // Gera relatório para calcular horas
    const relatorio = gerarExtratoHoras(professorAgendamentos, avaliacoes, [user]);
    const profData = relatorio.professores[0];

    return {
      totalHoras: profData?.totalHoras ?? 0,
      totalAulas: profData?.totalClasses ?? 0,
      aulasAvaliadas: profData?.classesAvaliadas ?? 0,
    };
  }, [isProfessor, linkedProf, user, agendamentos, avaliacoes]);

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

          {/* Carga Horária — Para Professores */}
          {isProfessor && professorHours && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Carga Horária
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {formatarHoras(professorHours.totalHoras)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total de Horas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {professorHours.totalAulas}
                    </p>
                    <p className="text-xs text-muted-foreground">Aulas Totais</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      {professorHours.aulasAvaliadas}
                    </p>
                    <p className="text-xs text-muted-foreground">Avaliadas</p>
                  </div>
                </div>
                {professorHours.totalAulas === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Sem aulas concluídas com avaliações registradas.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

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
