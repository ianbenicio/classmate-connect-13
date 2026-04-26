// =====================================================================
// ProfessorPerfilDialog — Visualização de perfil do professor (Fase 4)
// =====================================================================
// Exibe informações detalhadas de um professor: dados pessoais, status,
// vínculo com usuário, resumo de avaliações, e estatísticas de carga horária.
//
// É uma visualização read-only. Para editar, use ProfessorFormDialog.

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { X, Mail, Phone, BookOpen, GraduationCap, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Professor } from "@/lib/professores-store";
import {
  calcularScores,
  type ProfessorAvaliacao,
  calcularCargaTrabalhada,
  calcularDesempenhoHabilidades,
} from "@/lib/professores-store";
import { formatMinutos } from "@/lib/academic-types";
import type { Agendamento } from "@/lib/academic-types";
import { useAvaliacoes } from "@/lib/avaliacoes-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor: Professor | null;
  avaliacoes: ProfessorAvaliacao[];
  agendamentos: Agendamento[];
  userName?: string; // display_name do usuário vinculado (se houver)
}

export function ProfessorPerfilDialog({
  open,
  onOpenChange,
  professor,
  avaliacoes,
  agendamentos,
  userName,
}: Props) {
  if (!professor) return null;

  // Get all avaliacoes from store (for skill performance calculation)
  const allAvaliacoes = useAvaliacoes();

  // Avaliações específicas deste professor
  const avaliacoesProfessor = useMemo(
    () => avaliacoes.filter((a) => a.professorId === professor.id),
    [avaliacoes, professor.id],
  );

  // Scores agregados
  const scores = useMemo(
    () => calcularScores(avaliacoesProfessor),
    [avaliacoesProfessor],
  );

  // Carga horária trabalhada (filtra agendamentos deste professor)
  const carga = useMemo(() => {
    // Nota: agendamentos.professor é string (nome), agendamentos.professor_id seria o FK
    // Para compatibilidade, procuramos ambos
    const agendsDoProf = agendamentos.filter(
      (ag) =>
        ag.professor?.trim().toLowerCase() === professor.nome.trim().toLowerCase() ||
        (ag as any).professor_id === professor.id,
    );
    return calcularCargaTrabalhada(professor, agendsDoProf);
  }, [agendamentos, professor]);

  // Desempenho em habilidades (baseado em avaliacoes de alunos)
  const desempenhoHabilidades = useMemo(() => {
    if (professor.habilidadesIds.length === 0) {
      return {};
    }
    return calcularDesempenhoHabilidades(professor, allAvaliacoes, agendamentos);
  }, [professor, allAvaliacoes, agendamentos]);

  const horasTrabalhadasTotal = Math.round(carga.totalMin / 60 * 10) / 10;
  const horasTrabalhadasConcluidas = Math.round(carga.concluidasMin / 60 * 10) / 10;
  const horasPendentes = Math.round(carga.pendentesMin / 60 * 10) / 10;
  const cargaHorariaSemanalHoras = Math.round(professor.cargaHorariaSemanalMin / 60 * 10) / 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <DialogTitle className="inline-flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {professor.nome}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Perfil do professor · {professor.ativo ? "Ativo" : "Inativo"}
              </DialogDescription>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* ========== Informações Básicas ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {professor.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="text-sm">{professor.email}</p>
                    </div>
                  </div>
                )}
                {professor.telefone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm">{professor.telefone}</p>
                    </div>
                  </div>
                )}
              </div>

              {professor.cpf && (
                <div>
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="text-sm font-mono">{professor.cpf}</p>
                </div>
              )}

              {professor.formacao && (
                <div>
                  <p className="text-xs text-muted-foreground">Formação</p>
                  <p className="text-sm">{professor.formacao}</p>
                </div>
              )}

              {professor.bio && (
                <div>
                  <p className="text-xs text-muted-foreground">Bio</p>
                  <p className="text-sm whitespace-pre-wrap">{professor.bio}</p>
                </div>
              )}

              {professor.userId && (
                <div className="pt-2 border-t">
                  <Badge variant="secondary" className="gap-1">
                    🔗 Vinculado a usuário
                  </Badge>
                  {userName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Usuário: <strong>{userName}</strong>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== Especialidades ========== */}
          {professor.habilidadesIds.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Especialidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {professor.habilidadesIds.map((id) => (
                    <Badge key={id} variant="outline" className="text-xs font-mono">
                      {id.slice(0, 8)}…
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {professor.habilidadesIds.length} especialidade(s)
                </p>
              </CardContent>
            </Card>
          )}

          {/* ========== Carga Horária ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Carga Horária</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm">Limite semanal:</p>
                  <p className="text-sm font-medium">
                    {cargaHorariaSemanalHoras}h
                    {professor.cargaHorariaSemanalMin === 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (sem limite)
                      </span>
                    )}
                  </p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm mb-2">Trabalhadas:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">{horasTrabalhadasTotal}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Concluídas:</span>
                      <span className="text-green-600 font-medium">
                        {horasTrabalhadasConcluidas}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pendentes:</span>
                      <span className="text-amber-600 font-medium">
                        {horasPendentes}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ========== Desempenho em Habilidades ========== */}
          {professor.habilidadesIds.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Desempenho em Habilidades</CardTitle>
                <CardDescription>
                  {Object.keys(desempenhoHabilidades).length === 0
                    ? "Aguardando avaliações de alunos"
                    : `Baseado em avaliações de alunos`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(desempenhoHabilidades).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Sem avaliações de habilidades registradas ainda.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {professor.habilidadesIds.map((habilidadeId) => {
                      const desempenho = desempenhoHabilidades[habilidadeId];
                      if (!desempenho) return null;

                      // Determine color based on average score
                      const isRed = desempenho.media < 3;
                      const isYellow =
                        desempenho.media >= 3 && desempenho.media < 4;
                      const isGreen = desempenho.media >= 4;

                      const barColor = isRed
                        ? "bg-red-500"
                        : isYellow
                          ? "bg-yellow-500"
                          : "bg-green-500";

                      return (
                        <div key={habilidadeId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium font-mono">
                              {habilidadeId}
                            </p>
                            <p className="text-sm font-semibold">
                              {desempenho.media.toFixed(1)}/5
                            </p>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={cn("h-2 rounded-full transition-all", barColor)}
                              style={{
                                width: `${(desempenho.media / 5) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {desempenho.count}{" "}
                            {desempenho.count === 1
                              ? "avaliação"
                              : "avaliações"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ========== Avaliações ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Avaliações</CardTitle>
              <CardDescription>
                {avaliacoesProfessor.length === 0
                  ? "Sem avaliações registradas (Fase 5 ativa)"
                  : `${scores.total} avaliação(ões)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {avaliacoesProfessor.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  As avaliações serão registradas através de Fase 5 (alunos e staff)
                </p>
              ) : (
                <div className="space-y-3">
                  {scores.geral !== null && (
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <p className="text-sm">Média Geral:</p>
                      <p className="text-lg font-semibold">
                        {scores.geral.toFixed(1)}/5
                      </p>
                    </div>
                  )}

                  {Object.entries(scores.porCriterio).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        Por Critério:
                      </p>
                      {Object.entries(scores.porCriterio).map(([criterio, score]) => (
                        <div key={criterio} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{criterio}:</span>
                          <span className="font-medium">{score.toFixed(1)}/5</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== Metadados ========== */}
          <div className="space-y-1 text-xs text-muted-foreground p-3 rounded-md bg-muted/30">
            <p>
              ID: <span className="font-mono">{professor.id}</span>
            </p>
            <p>Criado em: {new Date(professor.criadoEm).toLocaleString("pt-BR")}</p>
            <p>
              Atualizado em: {new Date(professor.atualizadoEm).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
