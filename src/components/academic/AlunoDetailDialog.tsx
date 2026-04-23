import { useMemo, useState } from "react";
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
  Bell,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth-store";
import { isCoordenacao } from "@/lib/users";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAlunos } from "@/lib/alunos-store";
import { SkillsRadarChart } from "./SkillsRadarChart";
import { StarRating } from "./StarRating";
import { AvaliacaoAulaDialog } from "./AvaliacaoAulaDialog";
import { QuadroAulasDialog } from "./QuadroAulasDialog";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import {
  endSlotDate,
  endSlotPlus24h,
  formatHorarios,
  type Agendamento,
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
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const todosAlunos = useAlunos();
  const [avaliarAg, setAvaliarAg] = useState<Agendamento | null>(null);
  const [quadroOpen, setQuadroOpen] = useState(false);

  const atividadeMap = useMemo(
    () => new Map(atividades.map((a) => [a.id, a])),
    [atividades],
  );

  /** Aulas pendentes de avaliação para este aluno (dentro da janela de 24h pós-fim). */
  const pendentesAvaliacao = useMemo(() => {
    if (!aluno) return [] as { ag: Agendamento; expiraEm: Date }[];
    const now = new Date();
    return agendamentos
      .filter((g) => g.turmaId === aluno.turmaId)
      .filter((g) => {
        const fim = endSlotDate(g);
        const expira = endSlotPlus24h(g);
        // janela: depois do fim da aula, até 24h depois
        return now >= fim && now <= expira;
      })
      .filter(
        (g) =>
          !avaliacoes.some(
            (av) => av.agendamentoId === g.id && av.alunoId === aluno.id,
          ),
      )
      .map((g) => ({ ag: g, expiraEm: endSlotPlus24h(g) }))
      .sort((a, b) => a.expiraEm.getTime() - b.expiraEm.getTime());
  }, [agendamentos, aluno, avaliacoes]);

  /** Mapa atividadeId → primeira data agendada para a turma do aluno (YYYY-MM-DD). */
  const dataPorAtividade = useMemo(() => {
    const m = new Map<string, string>();
    if (!aluno) return m;
    const ags = agendamentos
      .filter((g) => g.turmaId === aluno.turmaId)
      .sort((a, b) => a.data.localeCompare(b.data));
    for (const g of ags) {
      for (const aid of g.atividadeIds) {
        if (!m.has(aid)) m.set(aid, g.data);
      }
    }
    return m;
  }, [agendamentos, aluno]);

  const formatData = (iso?: string) => {
    if (!iso) return "";
    const [y, mo, d] = iso.split("-");
    return `${d}/${mo}/${y.slice(2)}`;
  };

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

  // Aulas que a turma do aluno já recebeu (alguma presen\u00e7a=true entre os colegas).
  const aulasDadasTurmaIds = useMemo(() => {
    const set = new Set<string>();
    if (!aluno?.turmaId) return set;
    const aulaIds = new Set(aulasCurso.map((a) => a.id));
    for (const al of todosAlunos) {
      if (al.turmaId !== aluno.turmaId) continue;
      for (const r of al.aulas ?? []) {
        if (r.presente && aulaIds.has(r.atividadeId)) set.add(r.atividadeId);
      }
    }
    return set;
  }, [aluno, todosAlunos, aulasCurso]);

  // Estatísticas — denominador = total de aulas do curso.
  const freqStats = useMemo(() => {
    if (!aluno) return { presentes: 0, faltas: 0, total: 0, pct: 0 };
    let p = 0;
    let f = 0;
    for (const r of aluno.aulas) {
      if (r.presente) p++;
      else f++;
    }
    const totalCurso = aulasCurso.length;
    return {
      presentes: p,
      faltas: f,
      total: totalCurso,
      pct: totalCurso > 0 ? Math.round((p / totalCurso) * 100) : 0,
    };
  }, [aluno, aulasCurso]);

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
            {/* SETOR 1.2 — NOTIFICAÇÕES (resumo de pendências do aluno)     */}
            {/* ============================================================ */}
            {(() => {
              const tarefasPend = tarefasStats.pendentes;
              const faltas = freqStats.faltas;
              const avaliacoesPend = pendentesAvaliacao.length;
              const mensagens = 0; // placeholder — futuro: integração de mensagens
              const total =
                tarefasPend + faltas + avaliacoesPend + mensagens;

              const items: {
                key: string;
                icon: typeof Bell;
                label: string;
                count: number;
                tone: "primary" | "warning" | "danger" | "muted";
              }[] = [
                { key: "msg", icon: Mail, label: "Mensagens", count: mensagens, tone: "primary" },
                { key: "tar", icon: ClipboardList, label: "Tarefas pendentes", count: tarefasPend, tone: "warning" },
                { key: "falt", icon: AlertTriangle, label: "Faltas", count: faltas, tone: "danger" },
                { key: "av", icon: CheckCircle2, label: "Avaliações de aula", count: avaliacoesPend, tone: "primary" },
              ];

              const toneClass = (tone: string, active: boolean) => {
                if (!active) return "bg-muted/30 text-muted-foreground border-transparent";
                switch (tone) {
                  case "danger":
                    return "bg-destructive/10 text-destructive border-destructive/30";
                  case "warning":
                    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
                  case "primary":
                    return "bg-primary/10 text-primary border-primary/30";
                  default:
                    return "bg-muted text-foreground border-border";
                }
              };

              return (
                <section className="border rounded-lg p-4 mt-3 bg-muted/10">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5" />
                    Notificações
                    {total > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        {total}
                      </Badge>
                    )}
                  </h3>

                  {total === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nada pendente — tudo em dia! 🎉
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {items.map((it) => {
                        const Icon = it.icon;
                        const active = it.count > 0;
                        return (
                          <div
                            key={it.key}
                            className={`relative border rounded-md p-2 flex flex-col items-center justify-center gap-1 text-center transition-colors ${toneClass(it.tone, active)}`}
                            title={`${it.label}: ${it.count}`}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium leading-tight">
                              {it.label}
                            </span>
                            {active && (
                              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow">
                                {it.count}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* ============================================================ */}
            {/* SETOR 1.5 — PENDÊNCIAS DO ALUNO (avaliações de aula)         */}
            {/* ============================================================ */}
            {pendentesAvaliacao.length > 0 && (
              <section className="border border-primary/40 rounded-lg p-4 mt-3 bg-primary/5">
                <h3 className="text-xs font-medium uppercase tracking-wide flex items-center gap-1.5 mb-3 text-primary">
                  <Bell className="h-3.5 w-3.5" />
                  Avaliações pendentes
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {pendentesAvaliacao.length}
                  </Badge>
                </h3>
                <ul className="space-y-2">
                  {pendentesAvaliacao.map(({ ag, expiraEm }) => {
                    const horasRestantes = Math.max(
                      0,
                      Math.round((expiraEm.getTime() - Date.now()) / 3600000),
                    );
                    const [y, mo, d] = ag.data.split("-");
                    return (
                      <li
                        key={ag.id}
                        className="flex items-center gap-3 bg-background border rounded-md px-3 py-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            Avalie a aula de {d}/{mo}/{y.slice(2)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {ag.inicio}–{ag.fim}
                            {ag.professor && ` · ${ag.professor}`} · expira em{" "}
                            {horasRestantes}h
                          </div>
                        </div>
                        <Button size="sm" onClick={() => setAvaliarAg(ag)}>
                          Avaliar
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ============================================================ */}
            {/* SETOR 2 — ACOMPANHAMENTO                                     */}
            {/* ============================================================ */}
            <section className="border rounded-lg p-4 mt-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Activity className="h-3.5 w-3.5" />
                Acompanhamento
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Coluna FREQUÊNCIA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      Frequência
                    </h4>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {freqStats.presentes}/{freqStats.total || aulasCurso.length} · {freqStats.pct}%
                    </span>
                  </div>
                  <Progress value={freqStats.pct} className="h-2 mb-2" />
                  {aulasCurso.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma aula no curso.
                    </p>
                  ) : (
                    <ul className="divide-y border rounded-md max-h-72 overflow-y-auto">
                      {aulasCurso.map((a) => {
                        const reg = aulasMap.get(a.id);
                        const data = dataPorAtividade.get(a.id);
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
                            {data && (
                              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                {formatData(data)}
                              </span>
                            )}
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
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Atividades
                    </h4>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {tarefasStats.entregues}/{tarefasStats.total || tarefasCurso.length} · {tarefasStats.pct}%
                    </span>
                  </div>
                  <Progress value={tarefasStats.pct} className="h-2 mb-2" />
                  {tarefasCurso.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma tarefa no curso.
                    </p>
                  ) : (
                    <ul className="divide-y border rounded-md max-h-72 overflow-y-auto">
                      {tarefasCurso.map((a) => {
                        const reg = tarefasMap.get(a.id);
                        const data = dataPorAtividade.get(a.id);
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
                            {data && (
                              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                {formatData(data)}
                              </span>
                            )}
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
            {/* SETOR 3 — AVALIAÇÕES (Habilidades | Tarefas)                 */}
            {/* ============================================================ */}
            <section className="border rounded-lg p-4 mt-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Award className="h-3.5 w-3.5" />
                Avaliações
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Coluna HABILIDADES — gráfico spiderweb */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2">
                    Habilidades
                  </h4>
                  <SkillsRadarChart
                    axes={[
                      { label: "Foco", value: 0 },
                      { label: "Criatividade", value: 0 },
                      { label: "Equipe", value: 0 },
                      { label: "Técnica", value: 0 },
                      { label: "Comunicação", value: 0 },
                    ]}
                  />
                  <p className="text-[10px] text-muted-foreground italic text-center mt-1">
                    Habilidades a definir.
                  </p>
                </div>

                {/* Coluna TAREFAS AVALIADAS — 5 estrelas */}
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
                            {atividade?.codigo ?? reg.atividadeId.slice(0, 6)}
                          </span>
                          <span className="flex-1 min-w-0 truncate">
                            {atividade?.nome ?? "—"}
                          </span>
                          <StarRating value={reg.nota ?? 0} max={10} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* ============================================================ */}
            {/* SETOR 4 — OBSERVAÇÕES (comentários do professor)             */}
            {/* ============================================================ */}
            <section className="border rounded-lg p-4 mt-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <MessageSquare className="h-3.5 w-3.5" />
                Observações
              </h3>
              {observacoes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Sem observações registradas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {observacoes.slice(0, 3).map((o, i) => (
                    <li
                      key={i}
                      className="text-xs border-l-2 border-primary/40 pl-3 py-1"
                    >
                      <span className="font-mono text-muted-foreground">
                        {o.origem}:
                      </span>{" "}
                      <span>{o.texto}</span>
                    </li>
                  ))}
                  {observacoes.length > 3 && (
                    <li className="text-[10px] text-muted-foreground italic pl-3">
                      + {observacoes.length - 3} observação(ões) adicional(is).
                    </li>
                  )}
                </ul>
              )}
            </section>

            {/* ============================================================ */}
            {/* SETOR 5 — PERFIL IA (somente coordenação)                    */}
            {/* ============================================================ */}
            {canSeePerfil && (
              <section className="border rounded-lg p-4 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Perfil descritivo (IA)
                  </h3>
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
              </section>
            )}
          </>
        )}
      </DialogContent>

      {aluno && curso && turma && avaliarAg && (
        <AvaliacaoAulaDialog
          open={!!avaliarAg}
          onOpenChange={(o) => !o && setAvaliarAg(null)}
          agendamento={avaliarAg}
          aluno={aluno}
          turma={turma}
          curso={curso}
        />
      )}
    </Dialog>
  );
}
