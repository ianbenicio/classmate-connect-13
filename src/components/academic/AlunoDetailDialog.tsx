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

  // Aulas do curso (templates)
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

  // Mapas de registro do aluno
  const aulasMap = useMemo(() => {
    const m = new Map<string, boolean>();
    if (aluno) for (const r of aluno.aulas) m.set(r.atividadeId, r.presente);
    return m;
  }, [aluno]);

  const tarefasMap = useMemo(() => {
    const m = new Map<string, { entregue: boolean; nota?: number }>();
    if (aluno)
      for (const r of aluno.trabalhos)
        m.set(r.atividadeId, { entregue: r.entregue, nota: r.nota });
    return m;
  }, [aluno]);

  // Estatísticas de frequência: considera apenas aulas com registro
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

  return (
    <Dialog open={!!aluno} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            {/* Identificação */}
            <section className="grid sm:grid-cols-2 gap-3 py-3 border-b text-sm">
              <div className="flex items-center gap-2">
                <IdCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">CPF:</span>
                <span className="font-mono">{aluno.cpf || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Idade:</span>
                <span>{aluno.idade != null ? `${aluno.idade} anos` : "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
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
              {aluno.observacao && (
                <div className="sm:col-span-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Obs:</span>{" "}
                  {aluno.observacao}
                </div>
              )}
            </section>

            {/* Curso & Turma */}
            <section className="py-3 border-b">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Curso & Turma
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="border rounded-md p-3 bg-muted/30">
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
                <div className="border rounded-md p-3 bg-muted/30">
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

            {/* Frequência */}
            <section className="py-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Frequência
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  {freqStats.presentes}P · {freqStats.faltas}F ({freqStats.pct}%)
                </span>
              </div>
              {freqStats.total > 0 && (
                <Progress value={freqStats.pct} className="h-1.5 mb-3" />
              )}
              {aulasCurso.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma aula no curso.
                </p>
              ) : (
                <ul className="divide-y border rounded-md">
                  {aulasCurso.map((a) => {
                    const reg = aulasMap.get(a.id);
                    const status =
                      reg === undefined
                        ? "sem-registro"
                        : reg
                          ? "presente"
                          : "falta";
                    return (
                      <li
                        key={a.id}
                        className="px-3 py-2 flex items-center gap-3 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                          {a.codigo}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{a.nome}</span>
                        {status === "presente" && (
                          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white">
                            <Check className="h-3 w-3" />P
                          </Badge>
                        )}
                        {status === "falta" && (
                          <Badge variant="destructive" className="gap-1">
                            <X className="h-3 w-3" />F
                          </Badge>
                        )}
                        {status === "sem-registro" && (
                          <Badge variant="outline" className="text-muted-foreground">
                            —
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {/* Aulas registradas que não pertencem ao curso atual */}
              {(() => {
                const extras = aluno.aulas.filter(
                  (r) => !aulasCurso.find((a) => a.id === r.atividadeId),
                );
                if (extras.length === 0) return null;
                return (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                      Outras aulas registradas
                    </p>
                    <ul className="divide-y border rounded-md">
                      {extras.map((r, i) => {
                        const a = atividadeMap.get(r.atividadeId);
                        return (
                          <li
                            key={`${r.atividadeId}-${i}`}
                            className="px-3 py-2 flex items-center gap-3 text-sm"
                          >
                            <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                              {a?.codigo ?? r.atividadeId.slice(0, 8)}
                            </span>
                            <span className="flex-1 min-w-0 truncate">
                              {a?.nome ?? "—"}
                            </span>
                            {r.presente ? (
                              <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white">
                                <Check className="h-3 w-3" />P
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <X className="h-3 w-3" />F
                              </Badge>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </section>

            {/* Tarefas */}
            <section className="py-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Tarefas
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  {tarefasStats.entregues}E · {tarefasStats.pendentes}P (
                  {tarefasStats.pct}%)
                </span>
              </div>
              {tarefasStats.total > 0 && (
                <Progress value={tarefasStats.pct} className="h-1.5 mb-3" />
              )}
              {tarefasCurso.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa no curso.
                </p>
              ) : (
                <ul className="divide-y border rounded-md">
                  {tarefasCurso.map((a) => {
                    const reg = tarefasMap.get(a.id);
                    return (
                      <li
                        key={a.id}
                        className="px-3 py-2 flex items-center gap-3 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                          {a.codigo}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{a.nome}</span>
                        {reg?.nota != null && (
                          <span className="text-xs font-mono text-muted-foreground">
                            nota {reg.nota}
                          </span>
                        )}
                        {reg === undefined ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            —
                          </Badge>
                        ) : reg.entregue ? (
                          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white">
                            <Check className="h-3 w-3" />Entregue
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <X className="h-3 w-3" />Pendente
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
