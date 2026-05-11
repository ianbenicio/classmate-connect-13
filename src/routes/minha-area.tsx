// /minha-area — Dashboard do aluno-usuário.
// Resolve o aluno linkado via `aluno.userId === auth.user.id`. Mostra
// perfil, próximas aulas, histórico/presença e avaliações recebidas.
//
// Notificações continuam no sino global (NotificationsBell) — já filtra
// por role "aluno" e userId.

import { useMemo } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  User,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useAlunos } from "@/lib/alunos-store";
import { useCursos } from "@/lib/cursos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useAtividades } from "@/lib/atividades-store";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import type { ChecklistAlunoDados } from "@/lib/formularios-types";

export const Route = createFileRoute("/minha-area")({
  head: () => ({
    meta: [
      { title: "Minha área — Sistema Acadêmico" },
      {
        name: "description",
        content: "Sua área pessoal: perfil, aulas, presença e avaliações.",
      },
    ],
  }),
  component: MinhaAreaPage,
});

function MinhaAreaPage() {
  const { user, loading, hasRole } = useAuth();
  const alunos = useAlunos();
  const cursos = useCursos();
  const turmas = useTurmas();
  const atividades = useAtividades();
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();

  // Hooks declared above (always called) — gates below only affect render output.
  const aluno = useMemo(
    () => (user ? alunos.find((a) => a.userId === user.id) : undefined),
    [alunos, user],
  );

  const minhasAgendamentos = useMemo(
    () => (aluno ? agendamentos.filter((g) => g.turmaId === aluno.turmaId) : []),
    [agendamentos, aluno],
  );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeIso = format(hoje, "yyyy-MM-dd");

  const proximas = useMemo(
    () =>
      minhasAgendamentos
        .filter((g) => g.data >= hojeIso && g.status !== "concluido")
        .sort((a, b) => `${a.data} ${a.inicio}`.localeCompare(`${b.data} ${b.inicio}`)),
    [minhasAgendamentos, hojeIso],
  );

  const historico = useMemo(
    () =>
      minhasAgendamentos
        .filter((g) => g.data < hojeIso || g.status === "concluido")
        .sort((a, b) => `${b.data} ${b.inicio}`.localeCompare(`${a.data} ${a.inicio}`))
        .slice(0, 30),
    [minhasAgendamentos, hojeIso],
  );

  const presencaPorAtividade = useMemo(() => {
    const m = new Map<string, { presente: boolean; observacao?: string }>();
    if (aluno) for (const r of aluno.aulas) m.set(r.atividadeId, r);
    return m;
  }, [aluno]);

  const meusChecklists = useMemo(
    () =>
      aluno
        ? avaliacoes
            .filter((a) => a.alunoId === aluno.id && a.tipo === "checklist_aluno")
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
            .slice(0, 20)
        : [],
    [avaliacoes, aluno],
  );

  const ativsById = useMemo(() => new Map(atividades.map((a) => [a.id, a])), [atividades]);

  // ---------- Guards de render ----------
  if (!loading && !hasRole("aluno")) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Conta ainda não vinculada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Sua conta de aluno ainda não foi vinculada a um cadastro. Peça à coordenação ou a um
              professor para fazer o vínculo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const curso = cursos.find((c) => c.id === aluno.cursoId);
  const turma = turmas.find((t) => t.id === aluno.turmaId);

  const fmtData = (iso: string) => format(parseISO(iso), "dd 'de' MMM", { locale: ptBR });

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Minha área
        </h1>
        <p className="text-sm text-muted-foreground">
          Olá, <strong>{aluno.nome}</strong>! Aqui ficam suas aulas, presenças e avaliações.
        </p>
      </header>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-2">
            <User className="h-4 w-4" /> Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[11px] uppercase text-muted-foreground">Nome</div>
            <div className="font-medium">{aluno.nome}</div>
          </div>
          {aluno.email && (
            <div>
              <div className="text-[11px] uppercase text-muted-foreground inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </div>
              <div className="font-medium">{aluno.email}</div>
            </div>
          )}
          {aluno.contato && (
            <div>
              <div className="text-[11px] uppercase text-muted-foreground inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> Telefone
              </div>
              <div className="font-medium">{aluno.contato}</div>
            </div>
          )}
          {curso && (
            <div>
              <div className="text-[11px] uppercase text-muted-foreground">Curso</div>
              <div className="font-medium">
                <Badge variant="outline" className="mr-1">
                  {curso.cod}
                </Badge>
                {curso.nome}
              </div>
            </div>
          )}
          {turma && (
            <div>
              <div className="text-[11px] uppercase text-muted-foreground">Turma</div>
              <div className="font-medium">
                <Badge variant="outline" className="mr-1">
                  {turma.cod}
                </Badge>
                {turma.nome}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximas aulas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Próximas aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem aulas agendadas no momento.</p>
          ) : (
            <ul className="divide-y">
              {proximas.map((ag) => {
                const ativs = ag.atividadeIds.map((id) => ativsById.get(id)).filter(Boolean);
                return (
                  <li key={ag.id} className="py-2 flex items-start gap-3">
                    <div className="text-xs tabular-nums text-muted-foreground w-20 shrink-0 pt-0.5">
                      {fmtData(ag.data)}
                      <div className="inline-flex items-center gap-0.5 text-[10px]">
                        <Clock className="h-2.5 w-2.5" /> {ag.inicio}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      {ativs.length > 0 ? (
                        ativs.map((a) =>
                          a ? (
                            <div key={a.id} className="text-sm">
                              <span className="font-mono text-[10px] text-muted-foreground mr-1">
                                {a.codigo}
                              </span>
                              {a.nome}
                            </div>
                          ) : null,
                        )
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          Aula sem atividade detalhada
                        </div>
                      )}
                      {ag.professor && (
                        <div className="text-[11px] text-muted-foreground">
                          Professor: {ag.professor}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Histórico + presença */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Histórico de aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem aulas anteriores ainda.</p>
          ) : (
            <ul className="divide-y">
              {historico.map((ag) => {
                const ativs = ag.atividadeIds.map((id) => ativsById.get(id)).filter(Boolean);
                let presenca: { presente: boolean; observacao?: string } | null = null;
                for (const ativId of ag.atividadeIds) {
                  const p = presencaPorAtividade.get(ativId);
                  if (p) {
                    presenca = p;
                    break;
                  }
                }
                return (
                  <li key={ag.id} className="py-2 flex items-start gap-3">
                    <div className="text-xs tabular-nums text-muted-foreground w-20 shrink-0 pt-0.5">
                      {fmtData(ag.data)}
                      <div className="inline-flex items-center gap-0.5 text-[10px]">
                        <Clock className="h-2.5 w-2.5" /> {ag.inicio}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      {ativs.length > 0 ? (
                        ativs.map((a) =>
                          a ? (
                            <div key={a.id} className="text-sm">
                              <span className="font-mono text-[10px] text-muted-foreground mr-1">
                                {a.codigo}
                              </span>
                              {a.nome}
                            </div>
                          ) : null,
                        )
                      ) : (
                        <div className="text-sm text-muted-foreground italic">Aula</div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {presenca ? (
                        presenca.presente ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Presente
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-amber-700 dark:text-amber-300"
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Faltou
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          —
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Avaliações individuais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Minhas avaliações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meusChecklists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma avaliação registrada ainda. Após cada aula, o professor pode lançar suas notas
              de habilidades e comportamento aqui.
            </p>
          ) : (
            <ul className="space-y-3">
              {meusChecklists.map((rec) => {
                const dados = rec.dados as ChecklistAlunoDados | null;
                const notas = dados?.habilidadesNotas ?? {};
                const eng = dados?.engajamento ?? null;
                const obs = dados?.observacao;
                return (
                  <li key={rec.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(rec.criadoEm), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </div>
                      {eng && (
                        <Badge variant="secondary" className="text-[10px]">
                          Engajamento: {eng}/5
                        </Badge>
                      )}
                    </div>
                    {Object.keys(notas).length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {Object.entries(notas)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </div>
                    )}
                    {obs && <p className="text-xs mt-1 italic">{obs}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
