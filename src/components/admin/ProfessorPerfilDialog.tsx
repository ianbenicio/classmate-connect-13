// =====================================================================
// ProfessorPerfilDialog — Visualização de perfil do professor (Fase 4)
// =====================================================================
// Exibe informações detalhadas de um professor: dados pessoais, status,
// vínculo com usuário, resumo de avaliações, e estatísticas de carga horária.
//
// É uma visualização read-only. Para editar, use ProfessorFormDialog.

import { useMemo, useState } from "react";
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
import { X, Mail, Phone, BookOpen, GraduationCap, Eye, Calendar, Star } from "lucide-react";
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
import { useNotificacoes } from "@/lib/notificacoes-store";
import { useComportamentoTags } from "@/lib/comportamento-tags-store";
import { Progress } from "@/components/ui/progress";
import { startOfWeek, endOfWeek, parseISO, format, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, ChevronRight } from "lucide-react";

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
  // Notificações endereçadas a este professor (#4)
  const allNotificacoes = useNotificacoes();
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);

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

  // #2 — Aulas desta Semana
  const aulasSemana = useMemo(() => {
    const hoje = new Date();
    const inicioSemana = startOfWeek(hoje, { weekStartsOn: 1 }); // segunda
    const fimSemana = endOfWeek(hoje, { weekStartsOn: 1 }); // domingo
    const profNomeKey = professor.nome.trim().toLowerCase();
    return agendamentos
      .filter((ag) => {
        const isProf =
          ag.professor?.trim().toLowerCase() === profNomeKey ||
          (ag as any).professor_id === professor.id;
        if (!isProf) return false;
        // ag.data é "YYYY-MM-DD"; parseISO trata como meia-noite UTC,
        // mas pra comparar dia inteiro isso basta.
        const dataAg = parseISO(ag.data);
        return isWithinInterval(dataAg, { start: inicioSemana, end: fimSemana });
      })
      .sort((a, b) => {
        const cmp = a.data.localeCompare(b.data);
        return cmp !== 0 ? cmp : a.inicio.localeCompare(b.inicio);
      });
  }, [agendamentos, professor]);

  // #2.4 — Tags de comportamento recebidas pelo professor, agregadas
  const allTags = useComportamentoTags();
  const tagsAgregadas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of avaliacoesProfessor) {
      for (const t of a.tags ?? []) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([slug, count]) => {
        const meta = allTags.find((t) => t.value === slug);
        return { slug, count, meta };
      })
      .sort((a, b) => b.count - a.count);
  }, [avaliacoesProfessor, allTags]);

  // #4 — Notificações endereçadas ao professor (filtro por nome)
  const notificacoesProfessor = useMemo(() => {
    const profNomeKey = professor.nome.trim().toLowerCase();
    return allNotificacoes
      .filter(
        (n) =>
          n.destinatarioTipo === "professor" &&
          n.destinatarioId.trim().toLowerCase() === profNomeKey,
      )
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [allNotificacoes, professor.nome]);

  // #3 — scores divididos por tipo de avaliador (alunos vs coordenacao/admin)
  const scoresAlunos = useMemo(
    () => calcularScores(avaliacoesProfessor.filter((a) => a.avaliadorTipo === "aluno")),
    [avaliacoesProfessor],
  );
  const scoresStaff = useMemo(
    () =>
      calcularScores(
        avaliacoesProfessor.filter(
          (a) => a.avaliadorTipo === "coordenacao" || a.avaliadorTipo === "admin",
        ),
      ),
    [avaliacoesProfessor],
  );

  const horasTrabalhadasTotal = Math.round(carga.totalMin / 60 * 10) / 10;
  const horasTrabalhadasConcluidas = Math.round(carga.concluidasMin / 60 * 10) / 10;
  const horasPendentes = Math.round(carga.pendentesMin / 60 * 10) / 10;
  const cargaHorariaSemanalHoras = Math.round(professor.cargaHorariaSemanalMin / 60 * 10) / 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {professor.nome}
          </DialogTitle>
          <DialogDescription>
            Perfil do professor · {professor.ativo ? "Ativo" : "Inativo"}
          </DialogDescription>
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

          {/* ========== Aulas desta Semana (#2) ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Aulas desta Semana
              </CardTitle>
              <CardDescription>
                {aulasSemana.length === 0
                  ? "Nenhuma aula agendada esta semana."
                  : `${aulasSemana.length} aula(s) entre seg–dom`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aulasSemana.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Sem agendamentos para a semana atual.
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {aulasSemana.map((ag) => {
                    const dataObj = parseISO(ag.data);
                    return (
                      <li
                        key={ag.id}
                        className="flex items-center justify-between p-2 text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium capitalize">
                            {format(dataObj, "EEE, dd/MM", { locale: ptBR })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {ag.inicio} – {ag.fim}
                            {ag.observacao ? ` · ${ag.observacao}` : ""}
                          </span>
                        </div>
                        <Badge
                          variant={
                            ag.status === "concluido"
                              ? "default"
                              : ag.status === "cancelado"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {ag.status}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

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

          {/* ========== Avaliações Recebidas (#3) ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base inline-flex items-center gap-2">
                <Star className="h-4 w-4" />
                Avaliações Recebidas
              </CardTitle>
              <CardDescription>
                {avaliacoesProfessor.length === 0
                  ? "Nenhuma avaliação registrada ainda."
                  : `${scores.total} avaliação(ões) — ${scoresAlunos.total} de alunos · ${scoresStaff.total} de staff`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {avaliacoesProfessor.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aguardando avaliações de alunos e coordenação.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Média geral consolidada */}
                  {scores.geral !== null && (
                    <ScoreBar
                      label="Média Geral"
                      value={scores.geral}
                      bold
                    />
                  )}

                  {/* Por avaliador: alunos */}
                  {scoresAlunos.total > 0 && (
                    <SourceBlock
                      title="Alunos"
                      count={scoresAlunos.total}
                      scores={scoresAlunos}
                      tone="blue"
                    />
                  )}

                  {/* Por avaliador: coordenação/admin */}
                  {scoresStaff.total > 0 && (
                    <SourceBlock
                      title="Coordenação / Admin"
                      count={scoresStaff.total}
                      scores={scoresStaff}
                      tone="purple"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== Tags de Comportamento Recebidas (#2.4) ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base inline-flex items-center gap-2">
                <Star className="h-4 w-4" />
                Tags de Comportamento
              </CardTitle>
              <CardDescription>
                {tagsAgregadas.length === 0
                  ? "Nenhuma tag atribuída ainda."
                  : `${tagsAgregadas.length} tag(s) — atribuídas por alunos, coordenação e admin`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tagsAgregadas.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aguardando avaliações com tags. Ao avaliar, alunos e coordenação
                  podem marcar atributos como "didático", "pontual", etc.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tagsAgregadas.map(({ slug, count, meta }) => {
                    const tone = meta?.tom ?? "pos";
                    return (
                      <span
                        key={slug}
                        title={meta?.descricao ?? undefined}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs",
                          tone === "pos"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                        )}
                      >
                        {meta?.emoji && <span>{meta.emoji}</span>}
                        <span className="font-medium">
                          {meta?.label ?? slug}
                        </span>
                        <span
                          className={cn(
                            "ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-semibold",
                            tone === "pos"
                              ? "bg-emerald-500/20"
                              : "bg-amber-500/20",
                          )}
                        >
                          {count}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== Notificações (#4) ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base inline-flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificações
              </CardTitle>
              <CardDescription>
                {notificacoesProfessor.length === 0
                  ? "Sem notificações para este professor."
                  : `${notificacoesProfessor.length} item(ns) — clique para ver detalhes`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificacoesProfessor.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nada pendente. Tarefas, formulários e relatórios de aula aparecerão aqui.
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {notificacoesProfessor.map((n) => {
                    const expanded = expandedNotifId === n.id;
                    return (
                      <li key={n.id} className="text-sm">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedNotifId(expanded ? null : n.id)
                          }
                          className="w-full flex items-start gap-2 p-2 hover:bg-muted/40 text-left transition-colors"
                        >
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 shrink-0 mt-0.5 transition-transform",
                              expanded && "rotate-90",
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "font-medium truncate",
                                  !n.lida && "text-foreground",
                                )}
                              >
                                {n.titulo}
                              </span>
                              {n.kind && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize"
                                >
                                  {n.kind}
                                </Badge>
                              )}
                              {!n.lida && (
                                <Badge
                                  variant="default"
                                  className="text-[10px]"
                                >
                                  nova
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(n.criadoEm), "dd/MM HH:mm", {
                                locale: ptBR,
                              })}
                              {n.data && ` · aula ${n.data}`}
                            </p>
                          </div>
                        </button>
                        {expanded && (
                          <div className="px-9 pb-3 pt-1 space-y-1 border-t bg-muted/20">
                            <p className="text-xs whitespace-pre-wrap">
                              {n.mensagem}
                            </p>
                            {(n.data || n.inicio || n.fim) && (
                              <p className="text-xs text-muted-foreground">
                                <strong>Quando:</strong> {n.data}
                                {n.inicio && ` ${n.inicio}`}
                                {n.fim && `–${n.fim}`}
                              </p>
                            )}
                            {n.atividadeIds.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                <strong>Atividades:</strong> {n.atividadeIds.length} item(ns)
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
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

// =====================================================================
// Helpers de UI para avaliações (#3)
// =====================================================================

/** Barra horizontal de 0..5 com rótulo e valor numérico. */
function ScoreBar({
  label,
  value,
  bold = false,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: "blue" | "purple";
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const colorClass =
    tone === "blue"
      ? "[&>div]:bg-blue-500"
      : tone === "purple"
        ? "[&>div]:bg-purple-500"
        : "";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("text-muted-foreground capitalize", bold && "font-semibold text-foreground")}>
          {label}
        </span>
        <span className={cn("font-mono", bold ? "text-base font-semibold" : "text-xs")}>
          {value.toFixed(1)}/5
        </span>
      </div>
      <Progress value={pct} className={cn("h-2", colorClass)} />
    </div>
  );
}

/** Bloco de scores agrupado por fonte (alunos, staff). */
function SourceBlock({
  title,
  count,
  scores,
  tone,
}: {
  title: string;
  count: number;
  scores: { geral: number | null; porCriterio: Record<string, number> };
  tone: "blue" | "purple";
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "avaliação" : "avaliações"}
        </span>
      </div>
      {scores.geral !== null && (
        <ScoreBar label="Média" value={scores.geral} tone={tone} />
      )}
      {Object.entries(scores.porCriterio).map(([criterio, score]) => (
        <ScoreBar key={criterio} label={criterio} value={score} tone={tone} />
      ))}
    </div>
  );
}
