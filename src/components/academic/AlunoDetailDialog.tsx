import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  ClipboardList,
  Check,
  X,
  User,
  Phone,
  IdCard,
  Sparkles,
  Lock,
  Activity,
  Award,
  MessageSquare,
} from "lucide-react";
import { useCurrentUser } from "@/lib/auth-store";
import { isCoordenacao } from "@/lib/users";
import {
  formatHorarios,
  type Aluno,
  type Atividade,
  type Curso,
  type Turma,
} from "@/lib/academic-types";

interface Props {
  aluno: Aluno | null;
  curso?: Curso;
  turma?: Turma;
  atividades: Atividade[];
  onOpenChange: (o: boolean) => void;
}

export function AlunoDetailDialog({
  aluno,
  curso,
  turma,
  atividades,
  onOpenChange,
}: Props) {
  const currentUser = useCurrentUser();
  const canSeePerfil = isCoordenacao(currentUser);

  const atividadeMap = useMemo(
    () => new Map(atividades.map((a) => [a.id, a])),
    [atividades],
  );

  // Templates do curso
  const aulasCurso = useMemo(
    () =>
      curso ? atividades.filter((a) => a.cursoId === curso.id && a.tipo === 0) : [],
    [atividades, curso],
  );
  const tarefasCurso = useMemo(
    () =>
      curso ? atividades.filter((a) => a.cursoId === curso.id && a.tipo === 1) : [],
    [atividades, curso],
  );

  // Mapas de registros do aluno
  const aulasMap = useMemo(() => {
    const m = new Map<string, { presente: boolean; observacao?: string }>();
    if (aluno)
      for (const r of aluno.aulas)
        m.set(r.atividadeId, { presente: r.presente, observacao: r.observacao });
    return m;
  }, [aluno]);

  const tarefasMap = useMemo(() => {
    const m = new Map<
      string,
      { entregue: boolean; nota?: number; observacao?: string }
    >();
    if (aluno)
      for (const r of aluno.trabalhos)
        m.set(r.atividadeId, {
          entregue: r.entregue,
          nota: r.nota,
          observacao: r.observacao,
        });
    return m;
  }, [aluno]);

  // Estatísticas
  const freqStats = useMemo(() => {
    if (!aluno) return { presentes: 0, faltas: 0, total: 0, pct: 0 };
    let p = 0;
    let f = 0;
    for (const r of aluno.aulas) {
      if (r.presente) p++;
      else f++;
    }
    const total = p + f;
    return {
      presentes: p,
      faltas: f,
      total,
      pct: total > 0 ? Math.round((p / total) * 100) : 0,
    };
  }, [aluno]);

  const tarefasStats = useMemo(() => {
    if (!aluno) return { entregues: 0, pendentes: 0, total: 0, pct: 0 };
    let e = 0;
    let p = 0;
    for (const r of aluno.trabalhos) {
      if (r.entregue) e++;
      else p++;
    }
    const total = e + p;
    return {
      entregues: e,
      pendentes: p,
      total,
      pct: total > 0 ? Math.round((e / total) * 100) : 0,
    };
  }, [aluno]);

  // Progresso geral do Acompanhamento (média entre frequência e atividades)
  const acompanhamentoPct = useMemo(() => {
    const partes: number[] = [];
    if (freqStats.total > 0) partes.push(freqStats.pct);
    if (tarefasStats.total > 0) partes.push(tarefasStats.pct);
    if (partes.length === 0) return 0;
    return Math.round(partes.reduce((a, b) => a + b, 0) / partes.length);
  }, [freqStats, tarefasStats]);

  // Tarefas com nota (Avaliações)
  const tarefasComNota = useMemo(() => {
    if (!aluno) return [];
    return aluno.trabalhos
      .filter((t) => t.nota != null)
      .map((t) => ({ reg: t, atividade: atividadeMap.get(t.atividadeId) }));
  }, [aluno, atividadeMap]);

  // Observações consolidadas
  const observacoes = useMemo(() => {
    if (!aluno) return [];
    const list: { origem: string; texto: string }[] = [];
    for (const r of aluno.aulas) {
      if (r.observacao?.trim()) {
        const a = atividadeMap.get(r.atividadeId);
        list.push({
          origem: a ? `Aula ${a.codigo}` : "Aula",
          texto: r.observacao.trim(),
        });
      }
    }
    for (const r of aluno.trabalhos) {
      if (r.observacao?.trim()) {
        const a = atividadeMap.get(r.atividadeId);
        list.push({
          origem: a ? `Tarefa ${a.codigo}` : "Tarefa",
          texto: r.observacao.trim(),
        });
      }
    }
    return list;
  }, [aluno, atividadeMap]);

  return (
    <Dialog open={!!aluno} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {aluno?.nome}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Perfil do aluno
          </DialogDescription>
        </DialogHeader>

        {aluno && (
          <>
            {/* ============================================================ */}
            {/* SETOR 1 — IDENTIFICAÇÃO                                      */}
            {/* ============================================================ */}
            <section className="border rounded-lg p-4 bg-muted/20">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Identificação
              </h3>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <IdCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">CPF:</span>
                  <span className="font-mono">{aluno.cpf || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Idade:</span>
                  <span>
                    {aluno.idade != null ? `${aluno.idade} anos` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Contato:</span>
                  <span>{aluno.contato || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Responsável:</span>
                  <span>
                    {aluno.responsavel || "—"}
                    {aluno.contatoResp && ` (${aluno.contatoResp})`}
                  </span>
                </div>
              </div>

              {aluno.observacao && (
                <p className="mt-3 text-sm text-muted-foreground border-t pt-2">
                  <span className="font-medium text-foreground">Obs:</span>{" "}
                  {aluno.observacao}
                </p>
              )}

              {/* Curso & Turma — dentro de Identificação */}
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <div className="border rounded-md p-3 bg-background">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Curso
                  </div>
                  {curso ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {curso.cod}
                      </Badge>
                      <span className="font-medium">{curso.nome}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
                <div className="border rounded-md p-3 bg-background">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Turma
                  </div>
                  {turma ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {turma.cod}
                        </Badge>
                        <span className="font-medium">{turma.nome}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        🕐 {formatHorarios(turma.horarios)}
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* SETOR 2 — ACOMPANHAMENTO                                     */}
            {/* ============================================================ */}
            <section className="border rounded-lg p-4 mt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Acompanhamento
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  {acompanhamentoPct}%
                </span>
              </div>
              <Progress value={acompanhamentoPct} className="h-2 mb-4" />

              <div className="grid md:grid-cols-2 gap-4">
                {/* Coluna FREQUÊNCIA */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      Frequência
                    </h4>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {freqStats.presentes}/{freqStats.total || aulasCurso.length}
                    </span>
                  </div>
                  <Progress value={freqStats.pct} className="h-1 mb-2" />
                  {aulasCurso.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma aula no curso.
                    </p>
                  ) : (
                    <ul className="divide-y border rounded-md max-h-72 overflow-y-auto">
                      {aulasCurso.map((a) => {
                        const reg = aulasMap.get(a.id);
                        return (
                          <li
                            key={a.id}
                            className="px-2 py-1.5 flex items-center gap-2 text-xs"
                          >
                            <span className="font-mono text-muted-foreground w-14 shrink-0">
                              {a.codigo}
                            </span>
                            <span className="flex-1 min-w-0 truncate">
                              {a.nome}
                            </span>
                            {reg === undefined ? (
                              <span className="text-muted-foreground/60 text-[10px]">
                                —
                              </span>
                            ) : reg.presente ? (
                              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <X className="h-4 w-4 text-destructive shrink-0" />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Coluna ATIVIDADES */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Atividades
                    </h4>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {tarefasStats.entregues}/
                      {tarefasStats.total || tarefasCurso.length}
                    </span>
                  </div>
                  <Progress value={tarefasStats.pct} className="h-1 mb-2" />
                  {tarefasCurso.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma tarefa no curso.
                    </p>
                  ) : (
                    <ul className="divide-y border rounded-md max-h-72 overflow-y-auto">
                      {tarefasCurso.map((a) => {
                        const reg = tarefasMap.get(a.id);
                        return (
                          <li
                            key={a.id}
                            className="px-2 py-1.5 flex items-center gap-2 text-xs"
                          >
                            <span className="font-mono text-muted-foreground w-14 shrink-0">
                              {a.codigo}
                            </span>
                            <span className="flex-1 min-w-0 truncate">
                              {a.nome}
                            </span>
                            {reg === undefined ? (
                              <span className="text-muted-foreground/60 text-[10px]">
                                —
                              </span>
                            ) : reg.entregue ? (
                              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <X className="h-4 w-4 text-destructive shrink-0" />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* SETOR 3 — AVALIAÇÕES                                         */}
            {/* ============================================================ */}
            <section className="border rounded-lg p-4 mt-3 space-y-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                Avaliações
              </h3>

              {/* Habilidades */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2">
                  Habilidades
                </h4>
                {aluno.habilidadeIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma habilidade vinculada.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {aluno.habilidadeIds.map((id) => (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {id}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Tarefas com nota */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2">
                  Tarefas avaliadas
                </h4>
                {tarefasComNota.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Sem notas registradas.
                  </p>
                ) : (
                  <ul className="divide-y border rounded-md">
                    {tarefasComNota.map(({ reg, atividade }) => (
                      <li
                        key={reg.atividadeId}
                        className="px-3 py-2 flex items-center gap-3 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">
                          {atividade?.codigo ??
                            reg.atividadeId.slice(0, 6)}
                        </span>
                        <span className="flex-1 min-w-0 truncate">
                          {atividade?.nome ?? "—"}
                        </span>
                        <Badge variant="outline" className="font-mono">
                          {reg.nota}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Observações dos professores */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Observações
                </h4>
                {observacoes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Sem observações registradas.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {observacoes.map((o, i) => (
                      <li
                        key={i}
                        className="text-xs border-l-2 border-muted pl-3 py-1"
                      >
                        <span className="font-mono text-muted-foreground">
                          {o.origem}:
                        </span>{" "}
                        <span>{o.texto}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Perfil IA — só coordenação/admin */}
              {canSeePerfil && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Perfil descritivo (IA)
                    </h4>
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Lock className="h-3 w-3" />
                      Coordenação
                    </Badge>
                  </div>
                  <div className="border rounded-md p-3 bg-muted/30 text-sm text-muted-foreground">
                    <p className="mb-1">
                      Perfil descritivo será gerado a partir de presença, notas,
                      habilidades, observações dos professores e retorno dos
                      pais.
                    </p>
                    <p className="text-xs italic">
                      Geração por IA disponível após ativação do Lovable Cloud.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
