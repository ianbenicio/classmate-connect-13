import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import type { Agendamento, Atividade } from "@/lib/academic-types";
import { agendamentoDispensaRequisitos, isAtividadeAvulsa } from "@/lib/academic-types";
import { agendamentosStore, useAgendamentos } from "@/lib/agendamentos-store";
import {
  buildAgendamentoCoordenacao,
  buildPatchStatusCoordenacao,
  getAgendamentoReferenciaCronograma,
  getAgendamentosDaAula,
  getStatusCronogramaAula,
  type CronogramaAulaStatus,
} from "@/lib/cronograma-aulas";
import { useAtividades } from "@/lib/atividades-store";
import { useAuth } from "@/lib/auth";
import { useCursos } from "@/lib/cursos-store";
import { useGruposByCursoCod } from "@/lib/grupos-store";
import { useTurmas } from "@/lib/turmas-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<CronogramaAulaStatus, string> = {
  livre: "Livre",
  agendada: "Agendada",
  finalizada: "Finalizada",
};

const STATUS_CLASS: Record<CronogramaAulaStatus, string> = {
  livre: "border-muted-foreground/30 text-muted-foreground",
  agendada: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  finalizada: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function CronogramaAulasDialog({ open, onOpenChange }: Props) {
  const cursos = useCursos();
  const turmas = useTurmas();
  const atividades = useAtividades();
  const agendamentos = useAgendamentos();
  const gruposByCursoCod = useGruposByCursoCod();
  const { user, displayName } = useAuth();
  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCursoId((current) =>
      cursos.some((curso) => curso.id === current) ? current : (cursos[0]?.id ?? ""),
    );
  }, [cursos, open]);

  const cursoSelecionado = useMemo(
    () => cursos.find((curso) => curso.id === cursoId) ?? null,
    [cursoId, cursos],
  );

  const turmasDoCurso = useMemo(
    () =>
      cursoSelecionado
        ? turmas
            .filter((turma) => turma.cursoId === cursoSelecionado.id)
            .sort((a, b) => a.cod.localeCompare(b.cod))
        : [],
    [cursoSelecionado, turmas],
  );

  useEffect(() => {
    if (!open) return;
    setTurmaId((current) =>
      turmasDoCurso.some((turma) => turma.id === current) ? current : (turmasDoCurso[0]?.id ?? ""),
    );
  }, [open, turmasDoCurso]);

  const turmaSelecionada = useMemo(
    () => turmasDoCurso.find((turma) => turma.id === turmaId) ?? null,
    [turmaId, turmasDoCurso],
  );

  const aulas = useMemo(
    () =>
      cursoSelecionado
        ? atividades
            .filter(
              (atividade) =>
                atividade.cursoId === cursoSelecionado.id &&
                atividade.tipo === 0 &&
                !isAtividadeAvulsa(atividade),
            )
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
        : [],
    [atividades, cursoSelecionado],
  );

  const gruposDoCurso = useMemo(() => {
    if (!cursoSelecionado) return new Map<string, string>();
    return new Map(
      (gruposByCursoCod[cursoSelecionado.cod] ?? []).map((grupo) => [grupo.cod, grupo.nome]),
    );
  }, [cursoSelecionado, gruposByCursoCod]);

  const linhas = useMemo(
    () =>
      aulas.map((aula) => {
        const ags = turmaSelecionada
          ? getAgendamentosDaAula(agendamentos, turmaSelecionada.id, aula.id)
          : [];
        const referencia = getAgendamentoReferenciaCronograma(ags);
        const status = getStatusCronogramaAula(ags);
        return { aula, agendamentos: ags, referencia, status };
      }),
    [agendamentos, aulas, turmaSelecionada],
  );

  const stats = useMemo(
    () =>
      linhas.reduce(
        (acc, linha) => {
          acc[linha.status] += 1;
          return acc;
        },
        { livre: 0, agendada: 0, finalizada: 0 } satisfies Record<CronogramaAulaStatus, number>,
      ),
    [linhas],
  );

  const actor = useMemo(
    () => ({
      userId: user?.id,
      nome: displayName || user?.email || "Coordenacao",
    }),
    [displayName, user?.email, user?.id],
  );

  const handleStatusChange = async (
    aula: Atividade,
    ags: Agendamento[],
    status: CronogramaAulaStatus,
  ) => {
    if (!turmaSelecionada) return;
    const current = getStatusCronogramaAula(ags);
    if (current === status) return;
    const key = `${aula.id}:${status}`;
    setBusyKey(key);
    try {
      if (status === "livre") {
        if (
          ags.length > 0 &&
          !confirm(`Liberar a aula ${aula.codigo} desta turma? O status voltara para livre.`)
        ) {
          return;
        }
        for (const agendamento of ags) {
          await liberarAulaDoAgendamento(agendamento, aula.id);
        }
        toast.success(`Aula ${aula.codigo} marcada como livre.`);
        return;
      }

      const referencia = getAgendamentoReferenciaCronograma(ags);
      if (referencia) {
        await agendamentosStore.update(
          referencia.id,
          buildPatchStatusCoordenacao({ atividade: aula, status, actor }),
        );
        for (const extra of ags.filter((agendamento) => agendamento.id !== referencia.id)) {
          await liberarAulaDoAgendamento(extra, aula.id);
        }
      } else {
        await agendamentosStore.add(
          buildAgendamentoCoordenacao({
            atividade: aula,
            turma: turmaSelecionada,
            status,
            actor,
          }),
        );
      }
      toast.success(`Aula ${aula.codigo} marcada como ${STATUS_LABEL[status].toLowerCase()}.`);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Cronograma de aulas
          </DialogTitle>
          <DialogDescription>
            Selecione curso e turma para revisar ou definir o status das aulas.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Curso</Label>
            <Select value={cursoId} onValueChange={setCursoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um curso" />
              </SelectTrigger>
              <SelectContent>
                {cursos.map((curso) => (
                  <SelectItem key={curso.id} value={curso.id}>
                    {curso.cod} - {curso.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Turma</Label>
            <Select
              value={turmaId}
              onValueChange={setTurmaId}
              disabled={turmasDoCurso.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                {turmasDoCurso.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.cod} - {turma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusCount status="livre" value={stats.livre} />
            <StatusCount status="agendada" value={stats.agendada} />
            <StatusCount status="finalizada" value={stats.finalizada} />
          </div>
        </section>

        {!cursoSelecionado ? (
          <EmptyState text="Nenhum curso cadastrado." />
        ) : !turmaSelecionada ? (
          <EmptyState text="Nenhuma turma cadastrada para este curso." />
        ) : aulas.length === 0 ? (
          <EmptyState text="Nenhuma aula cadastrada para este curso." />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Codigo</TableHead>
                  <TableHead>Aula</TableHead>
                  <TableHead className="w-[140px]">Modulo</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[180px]">Responsavel</TableHead>
                  <TableHead className="w-[160px]">Registro</TableHead>
                  <TableHead className="w-[260px] text-right">Definir status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map(({ aula, agendamentos: ags, referencia, status }) => (
                  <TableRow key={aula.id}>
                    <TableCell className="font-mono text-xs">{aula.codigo}</TableCell>
                    <TableCell>
                      <div className="font-medium">{aula.nome}</div>
                      {aula.descricao && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {aula.descricao}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {aula.grupo}
                      </Badge>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {gruposDoCurso.get(aula.grupo) ?? aula.grupo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[11px]", STATUS_CLASS[status])}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {referencia && agendamentoDispensaRequisitos(referencia)
                        ? "Coordenação"
                        : (referencia?.professor ?? "Coordenação")}
                      {referencia && agendamentoDispensaRequisitos(referencia) && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          requisitos dispensados
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {referencia ? (
                        agendamentoDispensaRequisitos(referencia) ? (
                          <>
                            manual
                            <br />
                            {referencia.statusDefinidoEm?.slice(0, 10) ?? referencia.data}
                          </>
                        ) : (
                          <>
                            {referencia.data}
                            <br />
                            {referencia.inicio}-{referencia.fim}
                          </>
                        )
                      ) : (
                        "sem registro"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <StatusButton
                          icon={<Circle className="h-3.5 w-3.5" />}
                          label="Livre"
                          active={status === "livre"}
                          busy={busyKey === `${aula.id}:livre`}
                          onClick={() => handleStatusChange(aula, ags, "livre")}
                        />
                        <StatusButton
                          icon={<CalendarClock className="h-3.5 w-3.5" />}
                          label="Agendada"
                          active={status === "agendada"}
                          busy={busyKey === `${aula.id}:agendada`}
                          onClick={() => handleStatusChange(aula, ags, "agendada")}
                        />
                        <StatusButton
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          label="Finalizada"
                          active={status === "finalizada"}
                          busy={busyKey === `${aula.id}:finalizada`}
                          onClick={() => handleStatusChange(aula, ags, "finalizada")}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

async function liberarAulaDoAgendamento(agendamento: Agendamento, atividadeId: string) {
  const nextAtividadeIds = agendamento.atividadeIds.filter((id) => id !== atividadeId);
  if (nextAtividadeIds.length === 0) {
    await agendamentosStore.remove(agendamento.id);
    return;
  }
  await agendamentosStore.update(agendamento.id, { atividadeIds: nextAtividadeIds });
}

function StatusCount({ status, value }: { status: CronogramaAulaStatus; value: number }) {
  return (
    <Badge variant="outline" className={cn("h-9 px-3", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}: <span className="ml-1 font-semibold tabular-nums">{value}</span>
    </Badge>
  );
}

function StatusButton({
  icon,
  label,
  active,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "outline"}
      className="h-8 text-xs"
      disabled={active || busy}
      onClick={onClick}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </Button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">{text}</div>
  );
}
