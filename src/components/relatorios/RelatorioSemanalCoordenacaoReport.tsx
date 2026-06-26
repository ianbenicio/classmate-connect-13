import { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Clock,
  Download,
  FileCheck2,
  GraduationCap,
  AlertTriangle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAlunos } from "@/lib/alunos-store";
import { useAtividades } from "@/lib/atividades-store";
import { useAulaEvidencias } from "@/lib/aula-evidencias-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useAuth } from "@/lib/auth";
import { useCursos } from "@/lib/cursos-store";
import { useHabilidades } from "@/lib/habilidades-store";
import { useLocalStorage } from "@/lib/use-local-storage";
import { useNotificacoes } from "@/lib/notificacoes-store";
import {
  calcularJanelaRelatorio,
  DEFAULT_RELATORIO_CRONOGRAMA,
  formatarHorasMin,
  gerarRelatorioSemanalCoordenacao,
  type RelatorioCronogramaConfig,
  type RelatorioSemanalCoordenacaoPayload,
} from "@/lib/relatorio-semanal-coordenacao";
import { downloadRelatorio, relatoriosStore, type Relatorio } from "@/lib/relatorios-store";
import { useProfessorAvaliacoes } from "@/lib/professores-store";
import { useTurmas } from "@/lib/turmas-store";
import { useUsersByRole } from "@/lib/users-store";

const STORAGE_KEY = "classmate.relatorio-coordenacao.cronograma";

export function RelatorioSemanalCoordenacaoReport() {
  const cursos = useCursos();
  const turmas = useTurmas();
  const alunos = useAlunos();
  const atividades = useAtividades();
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const evidencias = useAulaEvidencias();
  const notificacoes = useNotificacoes();
  const professores = useUsersByRole("professor");
  const professorAvaliacoes = useProfessorAvaliacoes();
  const habilidades = useHabilidades();
  const { user, displayName } = useAuth();
  const hoje = toIsoDate(new Date());
  const [cronograma, setCronograma] = useLocalStorage<RelatorioCronogramaConfig>(STORAGE_KEY, {
    ...DEFAULT_RELATORIO_CRONOGRAMA,
    anchorDate: hoje,
  });

  const janela = useMemo(
    () => calcularJanelaRelatorio({ ...cronograma, anchorDate: cronograma.anchorDate || hoje }),
    [cronograma, hoje],
  );
  const [inicio, setInicio] = useState(janela.inicio);
  const [fim, setFim] = useState(janela.fim);
  const [registrando, setRegistrando] = useState(false);

  const payload = useMemo(
    () =>
      gerarRelatorioSemanalCoordenacao({
        periodo: { inicio, fim },
        cursos,
        turmas,
        alunos,
        atividades,
        agendamentos,
        avaliacoes,
        evidencias,
        notificacoes,
        professores,
        professorAvaliacoes,
        habilidades,
      }),
    [
      inicio,
      fim,
      cursos,
      turmas,
      alunos,
      atividades,
      agendamentos,
      avaliacoes,
      evidencias,
      notificacoes,
      professores,
      professorAvaliacoes,
      habilidades,
    ],
  );

  const handleUseCronograma = () => {
    setInicio(janela.inicio);
    setFim(janela.fim);
    if (!cronograma.anchorDate) {
      setCronograma((current) => ({ ...current, anchorDate: janela.fim }));
    }
  };

  const handleGerar = async () => {
    if (inicio > fim) {
      toast.error("A data inicial nao pode ser maior que a data final.");
      return;
    }
    setRegistrando(true);
    try {
      const relatorio = buildRelatorioExport(payload, {
        userId: user?.id,
        nome: displayName || user?.email || "Coordenacao",
      });
      await relatoriosStore.add(relatorio);
      downloadRelatorio(relatorio);
      setCronograma((current) => ({ ...current, anchorDate: fim }));
      toast.success("Relatorio consolidado gerado e registrado.");
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Relatorio consolidado da coordenacao
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aulas finalizadas, evidencias, professores, alunos, frequencia e avaliacoes por periodo.
          </p>
        </div>
        <Button onClick={handleGerar} disabled={registrando || !inicio || !fim}>
          <Download className="h-4 w-4" />
          Gerar e registrar
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cronograma de geracao</CardTitle>
          <CardDescription className="text-xs">
            O app usa este cronograma para sugerir a janela do relatorio. A geracao automatica real
            pode ser conectada depois via cron no backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Frequencia</Label>
            <Select
              value={cronograma.frequencia}
              onValueChange={(value) =>
                setCronograma((current) => ({
                  ...current,
                  frequencia: value as RelatorioCronogramaConfig["frequencia"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="quinzenal">Quinzenal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dias</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={cronograma.intervaloDias}
              disabled={cronograma.frequencia !== "personalizado"}
              onChange={(event) =>
                setCronograma((current) => ({
                  ...current,
                  intervaloDias: Number(event.target.value || 1),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Inicio</Label>
            <Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fim</Label>
            <Input type="date" value={fim} onChange={(event) => setFim(event.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={handleUseCronograma}>
            Usar cronograma
          </Button>
          <div className="md:col-span-5 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Janela sugerida: {janela.inicio} a {janela.fim}. Proxima geracao sugerida:{" "}
            {janela.proximaGeracao}.
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <ResumoCard
          label="Aulas finalizadas"
          value={payload.resumo.aulasFinalizadas}
          icon={<FileCheck2 className="h-4 w-4" />}
        />
        <ResumoCard
          label="Horas de professores"
          value={formatarHorasMin(payload.professores.reduce((acc, p) => acc + p.horasMin, 0))}
          icon={<Clock className="h-4 w-4" />}
        />
        <ResumoCard
          label="Presencas"
          value={`${payload.resumo.presencas}/${payload.resumo.presencas + payload.resumo.faltas}`}
          icon={<Users className="h-4 w-4" />}
        />
        <ResumoCard
          label="Notificacoes"
          value={`${payload.resumo.notificacoesNaoLidas}/${payload.resumo.notificacoes}`}
          icon={<Bell className="h-4 w-4" />}
        />
        <ResumoCard
          label="Criticas"
          value={payload.resumo.pontosCritica}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <ResumoCard
          label="Punicoes"
          value={payload.resumo.punicoes}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Evidencias das aulas finalizadas</CardTitle>
          <CardDescription className="text-xs">
            Plano, chamada, relatorios e presencas registrados por aula.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aula</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Chamada</TableHead>
                  <TableHead>Rel. prof.</TableHead>
                  <TableHead>Rel. alunos</TableHead>
                  <TableHead>Presencas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.aulas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma aula finalizada no periodo.
                    </TableCell>
                  </TableRow>
                ) : (
                  payload.aulas.map((aula) => (
                    <TableRow key={aula.agendamentoId}>
                      <TableCell>
                        <div className="font-medium">{aula.atividadeCodigos.join(", ")}</div>
                        <div className="text-xs text-muted-foreground">
                          {aula.data} {aula.inicio}-{aula.fim}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{aula.turmaCod}</div>
                        <div className="text-xs text-muted-foreground">{aula.cursoCod}</div>
                      </TableCell>
                      <TableCell className="text-sm">{aula.professorNome}</TableCell>
                      <StatusBadge
                        ok={aula.planoRegistrado}
                        dispensa={aula.requisitosDispensados}
                      />
                      <StatusBadge
                        ok={aula.chamadaRegistrada}
                        dispensa={aula.requisitosDispensados}
                      />
                      <StatusBadge
                        ok={aula.relatorioProfessorRegistrado}
                        dispensa={aula.requisitosDispensados}
                      />
                      <TableCell className="text-sm tabular-nums">
                        {aula.relatoriosAlunoRespondidos}/{aula.relatoriosAlunoEsperados}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {aula.presencas}/{aula.presencas + aula.faltas}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Professores</CardTitle>
          <CardDescription className="text-xs">
            Aulas dadas, horas, notificacoes e avaliacoes do periodo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Professor</TableHead>
                  <TableHead>Aulas</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Relatorios</TableHead>
                  <TableHead>Avaliacao alunos</TableHead>
                  <TableHead>Avaliacao direta</TableHead>
                  <TableHead>Notificacoes</TableHead>
                  <TableHead>Criticas</TableHead>
                  <TableHead>Punicoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.professores.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum professor com movimento no periodo.
                    </TableCell>
                  </TableRow>
                ) : (
                  payload.professores.map((professor) => (
                    <TableRow key={professor.professorUserId}>
                      <TableCell className="font-medium">{professor.professorNome}</TableCell>
                      <TableCell>{professor.aulasDadas}</TableCell>
                      <TableCell>{professor.horasFormatadas}</TableCell>
                      <TableCell className="text-sm">
                        Prof. {professor.relatoriosProfessor} | Alunos {professor.relatoriosAluno}
                      </TableCell>
                      <ScoreCell value={professor.mediaAvaliacaoAlunos} />
                      <ScoreCell value={professor.mediaAvaliacaoDireta} />
                      <TableCell>
                        {professor.notificacoesNaoLidas}/{professor.notificacoes}
                      </TableCell>
                      <TableCell>{professor.pontosCritica}</TableCell>
                      <TableCell>{professor.punicoes}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold inline-flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Alunos por curso e turma
          </h2>
          <p className="text-sm text-muted-foreground">
            Frequencia, progressao de aulas e avaliacoes de habilidades.
          </p>
        </div>
        {payload.cursos.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum curso com turma encontrado.
            </CardContent>
          </Card>
        ) : (
          payload.cursos.map((curso) => (
            <Card key={curso.cursoId}>
              <CardHeader>
                <CardTitle className="text-base">
                  {curso.cursoCod} - {curso.cursoNome}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {curso.turmas.map((turma) => (
                  <div key={turma.turmaId} className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-medium">
                          {turma.turmaCod} - {turma.turmaNome}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {turma.alunosComUsuario}/{turma.alunosTotal} alunos com usuario |{" "}
                          {turma.aulasFinalizadas} aula(s) finalizada(s)
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <MetricBadge label="Frequencia" value={`${turma.frequenciaPct}%`} />
                        <MetricBadge label="Rel. alunos" value={`${turma.relatoriosAlunoPct}%`} />
                        <MetricBadge
                          label="Habilidades"
                          value={scoreLabel(turma.mediaHabilidades)}
                        />
                      </div>
                    </div>
                    <Progress value={turma.progressoAulasPct} />
                    {turma.pendencias.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {turma.pendencias.map((pendencia) => (
                          <Badge key={pendencia} variant="outline" className="border-amber-500/40">
                            {pendencia}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Aluno</TableHead>
                            <TableHead>Frequencia</TableHead>
                            <TableHead>Relatorios</TableHead>
                            <TableHead>Checklists</TableHead>
                            <TableHead>Habilidades</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {turma.alunos.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="py-6 text-center text-sm text-muted-foreground"
                              >
                                Nenhum aluno nesta turma.
                              </TableCell>
                            </TableRow>
                          ) : (
                            turma.alunos.map((aluno) => (
                              <TableRow key={aluno.alunoId}>
                                <TableCell>
                                  <div className="font-medium">{aluno.alunoNome}</div>
                                  {!aluno.userId && (
                                    <Badge variant="outline" className="mt-1 border-amber-500/40">
                                      sem usuario
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {aluno.frequenciaPct}% ({aluno.presencas}/{aluno.aulasEsperadas})
                                </TableCell>
                                <TableCell>{aluno.relatoriosAluno}</TableCell>
                                <TableCell>{aluno.checklists}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {scoreLabel(aluno.mediaHabilidades)}
                                  </div>
                                  {aluno.habilidades.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {aluno.habilidades.slice(0, 4).map((habilidade) => (
                                        <Badge
                                          key={habilidade.habilidadeId}
                                          variant="secondary"
                                          className="text-[10px]"
                                        >
                                          {habilidade.sigla}: {habilidade.media}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function buildRelatorioExport(
  payload: RelatorioSemanalCoordenacaoPayload,
  geradoPor: { userId?: string; nome: string },
): Relatorio {
  const conteudo = JSON.stringify(payload, null, 2);
  const sizeBytes = new Blob([conteudo]).size;
  return {
    id: crypto.randomUUID(),
    tipo: "outro",
    titulo: `Relatorio consolidado da coordenacao (${payload.periodo.inicio} a ${payload.periodo.fim})`,
    geradoEm: new Date().toISOString(),
    geradoPorUserId: geradoPor.userId,
    geradoPorNome: geradoPor.nome,
    formato: "json",
    sizeBytes,
    filename: `relatorio-coordenacao-${payload.periodo.inicio}-${payload.periodo.fim}.json`,
    conteudo,
  };
}

function ResumoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ ok, dispensa }: { ok: boolean; dispensa?: boolean }) {
  return (
    <TableCell>
      <Badge variant={ok ? "secondary" : "outline"} className={!ok ? "border-amber-500/40" : ""}>
        {dispensa ? "dispensado" : ok ? "registrado" : "pendente"}
      </Badge>
    </TableCell>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  return <TableCell>{scoreLabel(value)}</TableCell>;
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <Badge variant="outline" className="gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </Badge>
  );
}

function scoreLabel(value: number | null): string {
  return value === null ? "sem dados" : `${value}/5`;
}

function toIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
