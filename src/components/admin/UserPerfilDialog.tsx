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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, User, ShieldCheck, GraduationCap, Calendar, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UserRow } from "@/lib/users-store";
// Fase 8: professor é apenas user com role "professor" — sem store separada.
import { APP_ROLE_LABELS } from "@/lib/auth";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useAlunos } from "@/lib/alunos-store";
import { useCursos } from "@/lib/cursos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useAtividades } from "@/lib/atividades-store";
import { useNotificacoes } from "@/lib/notificacoes-store";
import { useComportamentoTags } from "@/lib/comportamento-tags-store";
import { gerarExtratoHoras, formatarHoras } from "@/lib/relatorio-extrato-horas";
import type { ChecklistAlunoDados } from "@/lib/formularios-types";
import { Bell, CheckCircle2, XCircle, Phone, BookOpen, CalendarDays } from "lucide-react";
import { formatHorarios } from "@/lib/academic-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
  /** Se quiser que clicar em "Ver perfil de professor" abra outro dialog. */
  onOpenProfessorProfile?: (professorId: string) => void;
}

export function UserPerfilDialog({ open, onOpenChange, user, onOpenProfessorProfile }: Props) {
  // Hooks DEVEM ser chamados antes de qualquer early return (Rules of Hooks).
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const todosAlunos = useAlunos();
  const cursos = useCursos();
  const turmas = useTurmas();
  const atividades = useAtividades();
  const notificacoes = useNotificacoes();
  const tagsComportamento = useComportamentoTags();

  // Aluno linkado: aluno.user_id === user.userId
  const isAluno = !!user && user.roles.includes("aluno");
  const linkedAluno = useMemo(
    () => (isAluno && user ? todosAlunos.find((a) => a.userId === user.userId) : null),
    [isAluno, user, todosAlunos],
  );
  const alunoCurso = useMemo(
    () => (linkedAluno ? cursos.find((c) => c.id === linkedAluno.cursoId) : null),
    [linkedAluno, cursos],
  );
  const alunoTurma = useMemo(
    () => (linkedAluno ? turmas.find((t) => t.id === linkedAluno.turmaId) : null),
    [linkedAluno, turmas],
  );

  // Agendamentos da turma do aluno (todas aulas que ele recebe).
  const alunoAgendamentos = useMemo(
    () => (linkedAluno ? agendamentos.filter((g) => g.turmaId === linkedAluno.turmaId) : []),
    [linkedAluno, agendamentos],
  );

  // Frequência — total agendamentos passados vs presenças marcadas.
  const alunoFrequencia = useMemo(() => {
    if (!linkedAluno) return { total: 0, presentes: 0, faltas: 0 };
    const presencaMap = new Map(linkedAluno.aulas.map((r) => [r.atividadeId, r.presente]));
    let presentes = 0;
    let faltas = 0;
    let total = 0;
    for (const ag of alunoAgendamentos) {
      for (const ativId of ag.atividadeIds) {
        if (!presencaMap.has(ativId)) continue;
        total++;
        if (presencaMap.get(ativId)) presentes++;
        else faltas++;
      }
    }
    return { total, presentes, faltas };
  }, [linkedAluno, alunoAgendamentos]);

  // Notificações do aluno (via destinatario_user_id canônico ou aluno.id legado).
  const alunoNotifs = useMemo(() => {
    if (!linkedAluno || !user) return [];
    return notificacoes.filter(
      (n) =>
        n.destinatarioTipo === "aluno" &&
        (n.destinatarioUserId === user.userId || n.destinatarioId === linkedAluno.id),
    );
  }, [linkedAluno, user, notificacoes]);

  // Tags de comportamento agregadas dos checklists do aluno.
  const alunoTags = useMemo(() => {
    if (!linkedAluno) return [] as Array<{ slug: string; count: number; label?: string; emoji?: string }>;
    const counts = new Map<string, number>();
    for (const av of avaliacoes) {
      if (av.alunoId !== linkedAluno.id) continue;
      if (av.tipo !== "checklist_aluno") continue;
      const dados = av.dados as { comportamento?: string[] } | null;
      for (const slug of dados?.comportamento ?? []) {
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([slug, count]) => {
        const meta = tagsComportamento.find((t) => t.value === slug);
        return { slug, count, label: meta?.label, emoji: meta?.emoji };
      })
      .sort((a, b) => b.count - a.count);
  }, [linkedAluno, avaliacoes, tagsComportamento]);

  // Médias por habilidade — agregado dos checklists do aluno.
  const alunoMediasHab = useMemo(() => {
    if (!linkedAluno) return new Map<string, { media: number; n: number }>();
    const buckets = new Map<string, number[]>();
    for (const av of avaliacoes) {
      if (av.alunoId !== linkedAluno.id) continue;
      if (av.tipo !== "checklist_aluno") continue;
      const dados = av.dados as ChecklistAlunoDados | null;
      const notas = dados?.habilidadesNotas ?? {};
      for (const [hid, n] of Object.entries(notas)) {
        if (typeof n !== "number" || n < 1 || n > 5) continue;
        if (!buckets.has(hid)) buckets.set(hid, []);
        buckets.get(hid)!.push(n);
      }
    }
    const out = new Map<string, { media: number; n: number }>();
    for (const [hid, vals] of buckets) {
      out.set(hid, { media: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length });
    }
    return out;
  }, [linkedAluno, avaliacoes]);

  // Fase 8: usuário "é" professor se tem a role. Dados estão no próprio user.
  const isProfessor = !!user && user.roles.includes("professor");
  const linkedProf = useMemo(
    () =>
      isProfessor && user
        ? {
            id: user.userId, // id === userId agora
            userId: user.userId,
            nome: user.displayName,
            formacao: user.formacao ?? null,
            ativo: user.ativo ?? true,
          }
        : null,
    [isProfessor, user],
  );

  // Calcula horas de aula do professor baseado em agendamentos e avaliações
  const professorHours = useMemo(() => {
    if (!user || !isProfessor || !linkedProf) return null;

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

  if (!user) return null;

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
                <p className="text-sm text-muted-foreground italic">Sem papéis atribuídos.</p>
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
                    <p className="text-2xl font-bold">{professorHours.totalAulas}</p>
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

          {/* Registro do Aluno — visível quando user tem role aluno */}
          {isAluno && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base inline-flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Registro do Aluno
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!linkedAluno ? (
                  <p className="text-sm text-muted-foreground italic">
                    Este usuário tem papel "Aluno" mas ainda não há registro vinculado em Alunos.
                  </p>
                ) : (
                  <>
                    {/* Identificação aluno */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Telefone:</span>
                        <span>{linkedAluno.contato || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Idade: </span>
                        <span>{linkedAluno.idade != null ? `${linkedAluno.idade} anos` : "—"}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Responsável: </span>
                        <span>
                          {linkedAluno.responsavel || "—"}
                          {linkedAluno.contatoResp && ` (${linkedAluno.contatoResp})`}
                        </span>
                      </div>
                    </div>

                    {/* Curso + Turma */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="border rounded-md p-2 bg-background">
                        <div className="text-[10px] uppercase text-muted-foreground mb-1 inline-flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> Curso
                        </div>
                        <div className="text-sm font-medium">
                          {alunoCurso ? (
                            <>
                              <Badge variant="outline" className="mr-1">
                                {alunoCurso.cod}
                              </Badge>
                              {alunoCurso.nome}
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                      <div className="border rounded-md p-2 bg-background">
                        <div className="text-[10px] uppercase text-muted-foreground mb-1 inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> Turma
                        </div>
                        <div className="text-sm font-medium">
                          {alunoTurma ? (
                            <>
                              <Badge variant="outline" className="mr-1">
                                {alunoTurma.cod}
                              </Badge>
                              {alunoTurma.nome}
                              {alunoTurma.horarios.length > 0 && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {formatHorarios(alunoTurma.horarios)}
                                </div>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Frequência */}
                    <div className="border rounded-md p-3">
                      <div className="text-[10px] uppercase text-muted-foreground mb-2">
                        Frequência
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xl font-bold">{alunoFrequencia.total}</div>
                          <div className="text-[10px] text-muted-foreground">Registradas</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-emerald-600 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> {alunoFrequencia.presentes}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Presenças</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-amber-600 inline-flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> {alunoFrequencia.faltas}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Faltas</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-2 text-center">
                        Total de {alunoAgendamentos.length} aula(s) atribuída(s) à turma.
                      </div>
                    </div>

                    {/* Avaliações por habilidade */}
                    {alunoMediasHab.size > 0 && (
                      <div className="border rounded-md p-3">
                        <div className="text-[10px] uppercase text-muted-foreground mb-2">
                          Habilidades (média)
                        </div>
                        <div className="space-y-1 text-xs">
                          {Array.from(alunoMediasHab.entries()).map(([hid, v]) => (
                            <div key={hid} className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] text-muted-foreground truncate">
                                {hid}
                              </span>
                              <span className="font-medium">
                                {v.media.toFixed(1)}/5{" "}
                                <span className="text-muted-foreground text-[10px]">
                                  ({v.n}x)
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags de comportamento */}
                    {alunoTags.length > 0 && (
                      <div className="border rounded-md p-3">
                        <div className="text-[10px] uppercase text-muted-foreground mb-2">
                          Comportamento (tags acumuladas)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {alunoTags.map((t) => (
                            <Badge key={t.slug} variant="secondary" className="text-[11px]">
                              {t.emoji && `${t.emoji} `}
                              {t.label ?? t.slug} · {t.count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notificações */}
                    <div className="border rounded-md p-3">
                      <div className="text-[10px] uppercase text-muted-foreground mb-2 inline-flex items-center gap-1">
                        <Bell className="h-3 w-3" /> Notificações ({alunoNotifs.length})
                      </div>
                      {alunoNotifs.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sem notificações.</p>
                      ) : (
                        <ul className="space-y-1 text-xs max-h-32 overflow-y-auto">
                          {alunoNotifs.slice(0, 10).map((n) => (
                            <li key={n.id} className="flex items-center gap-1.5">
                              <span
                                className={
                                  n.lida
                                    ? "text-muted-foreground"
                                    : "text-foreground font-medium"
                                }
                              >
                                {n.titulo}
                              </span>
                              {!n.lida && (
                                <Badge variant="secondary" className="text-[9px] px-1">
                                  nova
                                </Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vínculo com professor — só mostra se user é professor */}
          {isProfessor && (
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
                        <p className="text-xs text-muted-foreground">{linkedProf.formacao}</p>
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
                  Este usuário tem papel "Professor" mas ainda não há registro vinculado em
                  Professores. Abra a janela de Professores — o sync automático vai criar o
                  registro.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Não vinculado a um registro de professor.
                </p>
              )}
            </CardContent>
          </Card>
          )}

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
