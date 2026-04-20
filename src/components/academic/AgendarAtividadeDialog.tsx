import { useEffect, useMemo, useState } from "react";
import { format, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  diaSemanaFromDate,
  formatHorarioSlot,
  getGrupoNome,
  type Atividade,
  type Curso,
  type HorarioSlot,
  type Turma,
} from "@/lib/academic-types";
import { agendamentosStore } from "@/lib/agendamentos-store";
import { notificacoesStore } from "@/lib/notificacoes-store";
import { SEED_ALUNOS, SEED_GRUPOS } from "@/lib/academic-seed";
import { authStore } from "@/lib/auth-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: Curso;
  /** Atividades disponíveis (do curso) */
  atividades: Atividade[];
  /** Turmas do curso */
  turmas: Turma[];
  /** Atividades pré-selecionadas */
  defaultAtividadeIds?: string[];
  /** Turma pré-selecionada */
  defaultTurmaId?: string;
  /** Data e slot pré-selecionados (vindo do calendário) */
  defaultData?: string; // YYYY-MM-DD
  defaultSlot?: HorarioSlot;
}

export function AgendarAtividadeDialog({
  open,
  onOpenChange,
  curso,
  atividades,
  turmas,
  defaultAtividadeIds = [],
  defaultTurmaId,
  defaultData,
  defaultSlot,
}: Props) {
  const [turmaId, setTurmaId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [slotIdx, setSlotIdx] = useState<string>("");
  const [grupo, setGrupo] = useState<string>("");
  const [atividadeIds, setAtividadeIds] =
    useState<string[]>(defaultAtividadeIds);
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!open) return;
    setTurmaId(defaultTurmaId ?? turmas[0]?.id ?? "");
    setDate(defaultData ? parse(defaultData, "yyyy-MM-dd", new Date()) : undefined);
    setSlotIdx("");
    setGrupo("");
    setAtividadeIds(defaultAtividadeIds);
    setObservacao("");
    // defaultAtividadeIds intencionalmente fora para evitar loop quando pai passa array novo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTurmaId, defaultData, turmas]);

  const turmaSelecionada = turmas.find((t) => t.id === turmaId);

  // Slots disponíveis = horários da turma cujo diaSemana corresponde à data escolhida
  const slotsDisponiveis = useMemo(() => {
    if (!turmaSelecionada || !date) return [];
    const dia = diaSemanaFromDate(date);
    return turmaSelecionada.horarios
      .map((h, i) => ({ slot: h, idx: i }))
      .filter(({ slot }) => slot.diaSemana === dia);
  }, [turmaSelecionada, date]);

  // Pré-seleciona slot pelo defaultSlot na abertura
  useEffect(() => {
    if (!open || !defaultSlot || !turmaSelecionada) return;
    const idx = turmaSelecionada.horarios.findIndex(
      (h) =>
        h.diaSemana === defaultSlot.diaSemana &&
        h.inicio === defaultSlot.inicio &&
        h.fim === defaultSlot.fim,
    );
    if (idx >= 0) setSlotIdx(String(idx));
  }, [open, defaultSlot, turmaSelecionada]);

  // Auto-seleciona se há um único slot disponível
  useEffect(() => {
    if (slotsDisponiveis.length === 1) {
      setSlotIdx(String(slotsDisponiveis[0].idx));
    }
  }, [slotsDisponiveis]);

  const ativsDoCurso = useMemo(
    () => atividades.filter((a) => a.cursoId === curso.id),
    [atividades, curso.id],
  );

  const grupos = useMemo(() => {
    const set = new Set<string>();
    for (const a of ativsDoCurso) if (a.grupo) set.add(a.grupo);
    return Array.from(set).sort();
  }, [ativsDoCurso]);

  const ativsDoGrupo = useMemo(
    () => (grupo ? ativsDoCurso.filter((a) => a.grupo === grupo) : []),
    [ativsDoCurso, grupo],
  );

  const aulasDoGrupo = useMemo(
    () => ativsDoGrupo.filter((a) => a.tipo === 0),
    [ativsDoGrupo],
  );
  const tarefasDoGrupo = useMemo(
    () => ativsDoGrupo.filter((a) => a.tipo === 1),
    [ativsDoGrupo],
  );

  const aulaId = atividadeIds.find((id) =>
    aulasDoGrupo.some((a) => a.id === id),
  ) ?? "";
  const tarefaId = atividadeIds.find((id) =>
    tarefasDoGrupo.some((a) => a.id === id),
  ) ?? "";

  // Reseta seleção ao trocar grupo
  useEffect(() => {
    setAtividadeIds([]);
  }, [grupo]);

  const setAula = (id: string) => {
    setAtividadeIds((prev) => {
      const semAulas = prev.filter(
        (x) => !aulasDoGrupo.some((a) => a.id === x),
      );
      return id ? [...semAulas, id] : semAulas;
    });
  };
  const setTarefa = (id: string) => {
    setAtividadeIds((prev) => {
      const semTarefas = prev.filter(
        (x) => !tarefasDoGrupo.some((a) => a.id === x),
      );
      return id ? [...semTarefas, id] : semTarefas;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSelecionada) return toast.error("Selecione uma turma.");
    if (!date) return toast.error("Selecione uma data.");
    if (date < startOfDay(new Date()))
      return toast.error("Não é possível agendar em datas passadas.");
    if (slotIdx === "") return toast.error("Selecione um horário.");
    if (!grupo) return toast.error("Selecione um grupo.");
    if (atividadeIds.length === 0)
      return toast.error("Escolha ao menos uma atividade (aula ou tarefa).");

    const slot = turmaSelecionada.horarios[Number(slotIdx)];
    const dataIso = format(date, "yyyy-MM-dd");
    // Professor vem da(s) atividade(s) selecionada(s) — turma não tem professor.
    const ativsSelPrev = atividades.filter((a) => atividadeIds.includes(a.id));
    const professoresUnicos = Array.from(
      new Set(ativsSelPrev.map((a) => a.professor).filter(Boolean)),
    ) as string[];
    const professor = professoresUnicos.join(" / ") || undefined;

    const currentUser = authStore.get();
    agendamentosStore.add({
      id: crypto.randomUUID(),
      turmaId: turmaSelecionada.id,
      data: dataIso,
      diaSemana: slot.diaSemana,
      inicio: slot.inicio,
      fim: slot.fim,
      atividadeIds,
      status: "pendente",
      criadoEm: new Date().toISOString(),
      observacao: observacao.trim() || undefined,
      professor,
      criadoPorUserId: currentUser.id,
      criadoPorNome: currentUser.nome,
    });

    // Notificações: alunos da turma + professor
    const ativsSel = atividades.filter((a) => atividadeIds.includes(a.id));
    const partes = ativsSel
      .map((a) => `${a.tipo === 0 ? "Aula" : "Tarefa"}: ${a.nome}`)
      .join(" · ");
    const titulo = `Atividade agendada — ${turmaSelecionada.cod}`;
    const mensagem = `${curso.nome} · ${turmaSelecionada.nome} · ${format(
      date,
      "PPP",
      { locale: ptBR },
    )} ${slot.inicio}–${slot.fim}${professor ? ` · ${professor}` : ""}${
      partes ? ` — ${partes}` : ""
    }`;
    const base = {
      titulo,
      mensagem,
      cursoId: curso.id,
      turmaId: turmaSelecionada.id,
      data: dataIso,
      inicio: slot.inicio,
      fim: slot.fim,
      professor,
      atividadeIds,
      criadoEm: new Date().toISOString(),
      lida: false,
    };
    const alunosDaTurma = SEED_ALUNOS.filter(
      (al) => al.turmaId === turmaSelecionada.id,
    );
    const notifs = [
      ...alunosDaTurma.map((al) => ({
        ...base,
        id: crypto.randomUUID(),
        destinatarioTipo: "aluno" as const,
        destinatarioId: al.id,
      })),
      ...(professor
        ? [
            {
              ...base,
              id: crypto.randomUUID(),
              destinatarioTipo: "professor" as const,
              destinatarioId: professor,
            },
          ]
        : []),
    ];
    notificacoesStore.addMany(notifs);

    toast.success(
      `Atividade agendada! ${notifs.length} notificação(ões) gerada(s).`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar atividade</DialogTitle>
          <DialogDescription>
            Curso: <strong>{curso.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Turma *</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} · {t.cod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {turmas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este curso ainda não possui turmas cadastradas.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon />
                    {date
                      ? format(date, "PPP", { locale: ptBR })
                      : "Escolher data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < startOfDay(new Date())}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Horário *</Label>
              {!turmaSelecionada ? (
                <p className="text-xs text-muted-foreground">
                  Selecione a turma.
                </p>
              ) : !date ? (
                <p className="text-xs text-muted-foreground">
                  Selecione a data.
                </p>
              ) : slotsDisponiveis.length === 0 ? (
                <p className="text-xs text-destructive">
                  A turma não tem horário neste dia da semana.
                </p>
              ) : (
                <Select value={slotIdx} onValueChange={setSlotIdx}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {slotsDisponiveis.map(({ slot, idx }) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {formatHorarioSlot(slot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Grupo *</Label>
            {ativsDoCurso.length === 0 ? (
              <p className="text-xs text-muted-foreground border rounded-md p-3">
                Nenhuma atividade cadastrada neste curso ainda.
              </p>
            ) : grupos.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum grupo disponível.
              </p>
            ) : (
              <Select value={grupo} onValueChange={setGrupo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((g) => (
                    <SelectItem key={g} value={g}>
                      <span className="font-mono text-xs mr-2">{g}</span>
                      {getGrupoNome(SEED_GRUPOS, curso.id, g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {grupo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Aula</Label>
                <Select
                  value={aulaId || "__none__"}
                  onValueChange={(v) => setAula(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem aula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {aulasDoGrupo.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.codigo} · {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aulasDoGrupo.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sem aulas neste grupo.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tarefa</Label>
                <Select
                  value={tarefaId || "__none__"}
                  onValueChange={(v) => setTarefa(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem tarefa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {tarefasDoGrupo.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.codigo} · {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tarefasDoGrupo.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sem tarefas neste grupo.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Opcional"
            />
          </div>

          {turmaSelecionada && date && slotIdx !== "" && (
            <div className="rounded-md bg-muted/40 border p-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground mb-1">
                Resumo
              </div>
              <div className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(date, "PPP", { locale: ptBR })} ·{" "}
                {formatHorarioSlot(turmaSelecionada.horarios[Number(slotIdx)])}{" "}
                · {turmaSelecionada.nome}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">📅 Agendar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
