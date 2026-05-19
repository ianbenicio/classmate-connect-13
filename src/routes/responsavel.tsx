// =====================================================================
// Portal Pais — Dashboard do responsável (D2 MVP + C3.1)
// =====================================================================
// Route: /responsavel
// Role: viewer
// Exibe: filhos vinculados, últimas presenças, preferências de notificação.

import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, GraduationCap, Bell, CheckCircle2, XCircle } from "lucide-react";
import { ResponsavelPreferenciasDialog } from "@/components/responsavel/ResponsavelPreferenciasDialog";

export const Route = createFileRoute("/responsavel")({
  component: ResponsavelPortalPage,
});

interface AlunoVinculado {
  id: string;
  nome: string;
  turma_nome: string | null;
  curso_nome: string | null;
  presencas_recentes: { presente: boolean; data: string }[];
}

function ResponsavelPortalPage() {
  const { user: authUser, loading: authLoading, hasRole } = useAuth();
  const [alunos, setAlunos] = useState<AlunoVinculado[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const isViewer = hasRole("viewer");

  useEffect(() => {
    if (!authUser || !isViewer) return;

    void (async () => {
      setLoadingData(true);
      try {
        type VdRow = {
          aluno_id: string;
          alunos: {
            id: string;
            nome: string;
            turmas: { nome: string; cursos: { nome: string } | null } | null;
          } | null;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: vdRows } = await (supabase as any)
          .from("viewer_dependentes")
          .select("aluno_id, alunos(id, nome, turmas(nome, cursos(nome)))")
          .eq("viewer_user_id", authUser.id) as { data: VdRow[] | null };

        type PRow = { presente: boolean; atividades: { data: string } | null };

        const alunosData: AlunoVinculado[] = await Promise.all(
          (vdRows ?? []).map(async (vd) => {
            const a = vd.alunos;
            if (!a) return null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: pRows } = await (supabase as any)
              .from("presencas")
              .select("presente, atividades(data)")
              .eq("aluno_id", a.id)
              .order("created_at", { ascending: false })
              .limit(10) as { data: PRow[] | null };

            return {
              id: a.id,
              nome: a.nome,
              turma_nome: a.turmas?.nome ?? null,
              curso_nome: a.turmas?.cursos?.nome ?? null,
              presencas_recentes: (pRows ?? []).map((p) => ({
                presente: p.presente,
                data: p.atividades?.data ?? "",
              })),
            } satisfies AlunoVinculado;
          }),
        ).then((r) => r.filter((x): x is AlunoVinculado => x !== null));

        setAlunos(alunosData);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [authUser, isViewer]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isViewer) return <Navigate to="/" />;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Portal do Responsável
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe a evolução dos seus dependentes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPrefsOpen(true)}>
          <Bell className="h-4 w-4 mr-1" />
          Preferências
        </Button>
      </header>

      {loadingData ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : alunos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum aluno vinculado à sua conta.</p>
            <p className="text-xs mt-1">Solicite à escola que envie o convite de responsável.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alunos.map((aluno) => {
            const total = aluno.presencas_recentes.length;
            const presentes = aluno.presencas_recentes.filter((p) => p.presente).length;
            const taxaPresenca = total > 0 ? Math.round((presentes / total) * 100) : null;

            return (
              <Card key={aluno.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-xl">🎓</span>
                    {aluno.nome}
                    {taxaPresenca !== null && (
                      <Badge
                        variant="outline"
                        className={
                          taxaPresenca >= 75
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ml-auto"
                            : "bg-red-500/15 text-red-700 dark:text-red-300 ml-auto"
                        }
                      >
                        {taxaPresenca}% presença
                      </Badge>
                    )}
                  </CardTitle>
                  {(aluno.curso_nome || aluno.turma_nome) && (
                    <CardDescription className="text-xs">
                      {[aluno.curso_nome, aluno.turma_nome].filter(Boolean).join(" · ")}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {aluno.presencas_recentes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Sem registros de presença ainda.
                    </p>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Últimas {aluno.presencas_recentes.length} aulas:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {aluno.presencas_recentes.map((p, i) => (
                          <div
                            key={i}
                            title={p.data || `Aula ${i + 1}`}
                            className="flex items-center justify-center w-7 h-7 rounded-md border"
                          >
                            {p.presente ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ResponsavelPreferenciasDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </main>
  );
}
