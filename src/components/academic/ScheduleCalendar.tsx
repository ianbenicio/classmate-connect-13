import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, FileText, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  computeSlotEstado,
  diaSemanaFromDate,
  getDuracaoAulaMin,
  slotBlocosCount,
  blocoInicio,
  blocoFim,
  type Agendamento,
  type Curso,
  type DiaSemana,
  type SlotEstado,
  type Turma,
} from "@/lib/academic-types";
import { useCurrentUser } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

interface SlotClickPayload {
  turma: Turma;
  date: Date;
  inicio: string;
  fim: string;
  diaSemana: DiaSemana;
  estado: SlotEstado;
  agendamento?: Agendamento;
  blocoIndex?: number;
}

interface CellHeaderClickPayload {
  turma: Turma;
  date: Date;
  inicio: string;
  fim: string;
  diaSemana: DiaSemana;
}

interface Props {
  turmas: Turma[];
  cursos: Curso[];
  agendamentos: Agendamento[];
  onSlotClick?: (payload: SlotClickPayload) => void;
  onRegistrarRelatorio?: (agendamento: Agendamento, turma: Turma) => void;
  onCellHeaderClick?: (payload: CellHeaderClickPayload) => void;
  onRemoverAgendamento?: (agendamento: Agendamento, turma: Turma) => void;
}

function turmasNoDia(turmas: Turma[], date: Date) {
  const ds = diaSemanaFromDate(date);
  const items: { turma: Turma; inicio: string; fim: string }[] = [];
  for (const t of turmas) {
    for (const h of t.horarios) {
      if (h.diaSemana === ds) {
        items.push({ turma: t, inicio: h.inicio, fim: h.fim });
      }
    }
  }
  return items.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function ScheduleCalendar({ turmas, cursos, agendamentos, onSlotClick, onRegistrarRelatorio }: Props) {
  const [refDate, setRefDate] = useState(new Date());

  const cursoMap = useMemo(
    () => new Map(cursos.map((c) => [c.id, c])),
    [cursos],
  );

  return (
    <Tabs defaultValue="semana" className="w-full">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <TabsList>
          <TabsTrigger value="mes">Mês</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setRefDate((d) => subMonths(d, 1))}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRefDate(new Date())}>
            Hoje
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setRefDate((d) => addMonths(d, 1))}
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TabsContent value="mes">
        <MonthView
          refDate={refDate}
          turmas={turmas}
          cursoMap={cursoMap}
          agendamentos={agendamentos}
          onDayClick={(d) => setRefDate(d)}
          onSlotClick={onSlotClick}
          onRegistrarRelatorio={onRegistrarRelatorio}
        />
      </TabsContent>

      <TabsContent value="semana">
        <WeekView
          refDate={refDate}
          turmas={turmas}
          cursoMap={cursoMap}
          agendamentos={agendamentos}
          onSlotClick={onSlotClick}
          onRegistrarRelatorio={onRegistrarRelatorio}
        />
      </TabsContent>

      <Legend />
    </Tabs>
  );
}

// ---------- Cores por curso (usado só na legenda) ----------
const CURSO_COLORS: Record<string, string> = {
  "c-mp": "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  "c-gp":
    "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  "c-ad":
    "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  "c-rb":
    "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-300",
};
function cursoChipClass(cursoId: string) {
  return CURSO_COLORS[cursoId] || "bg-muted text-foreground border-border";
}

// ---------- Estados visuais por estado de slot ----------
const ESTADO_LABEL: Record<SlotEstado, string> = {
  vazio_futuro: "Pronta para receber atividade",
  vazio_passado: "Slot passado — não pode mais agendar",
  agendado: "Atividade agendada",
  atrasado: "Relatório atrasado (24h)",
  expirado: "Prazo expirado — sem relatório",
  concluido: "Relatório registrado",
};

function StateBadge({ estado }: { estado: SlotEstado }) {
  switch (estado) {
    case "vazio_futuro":
      return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-label="Pronta" />;
    case "vazio_passado":
      return <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50" aria-label="Indisponível" />;
    case "agendado":
      return <FileText className="h-3 w-3 text-primary" aria-label="Agendada" />;
    case "concluido":
      return <FileText className="h-3 w-3 text-emerald-600" aria-label="Relatório registrado" />;
    case "atrasado":
      return <span className="inline-block w-2 h-2 rounded-full bg-amber-500" aria-label="Atrasada" />;
    case "expirado":
      return <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" aria-label="Expirada" />;
  }
}

function slotChipClasses(estado: SlotEstado, cursoId: string) {
  switch (estado) {
    case "agendado":
      return "border-primary/50 bg-primary/10 text-foreground";
    case "concluido":
      return "border-emerald-500/40 bg-emerald-500/10 text-foreground";
    case "atrasado":
      return "border-amber-500/50 bg-amber-500/10 text-foreground";
    case "expirado":
      return "border-muted-foreground/30 bg-muted/40 text-muted-foreground";
    case "vazio_passado":
      return "border-muted bg-muted/30 text-muted-foreground";
    case "vazio_futuro":
    default:
      return cursoChipClass(cursoId);
  }
}

function isClickable(estado: SlotEstado) {
  // expirado e vazio_passado são desabilitados
  return estado !== "expirado" && estado !== "vazio_passado";
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        Pronta
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FileText className="h-3 w-3 text-primary" />
        Agendada
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
        Relatório atrasado
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />
        Expirada / indisponível
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FileText className="h-3 w-3 text-emerald-600" />
        Relatório registrado
      </span>
    </div>
  );
}

// helper pra achar TODOS os agendamentos de um slot (turma × data × slotInicio)
function findAgsDoSlot(
  ags: Agendamento[],
  turmaId: string,
  dataKey: string,
  slotInicioRef: string,
): Agendamento[] {
  return ags.filter(
    (a) =>
      a.turmaId === turmaId &&
      a.data === dataKey &&
      (a.slotInicio ?? a.inicio) === slotInicioRef,
  );
}

// ====================================================================
// SlotChip — chip do calendário com cabeçalho + 1 coluna por bloco
// ====================================================================
function SlotChip({
  turma,
  curso,
  date,
  slotInicio,
  slotFim,
  diaSemana,
  agsDoSlot,
  compact = false,
  onSlotClick,
  onRegistrarRelatorio,
}: {
  turma: Turma;
  curso: Curso | undefined;
  date: Date;
  slotInicio: string;
  slotFim: string;
  diaSemana: DiaSemana;
  agsDoSlot: Agendamento[];
  compact?: boolean;
  onSlotClick?: (p: SlotClickPayload) => void;
  onRegistrarRelatorio?: (a: Agendamento, t: Turma) => void;
}) {
  const currentUser = useCurrentUser();
  const now = new Date();
  const dataKey = format(date, "yyyy-MM-dd");
  const duracaoAulaMin = curso ? getDuracaoAulaMin(curso) : 60;
  const totalBlocos = slotBlocosCount(
    { inicio: slotInicio, fim: slotFim },
    duracaoAulaMin,
  );

  // Mapa blocoIndex → agendamento que ocupa aquele bloco
  const agByBloco = new Map<number, Agendamento>();
  for (const a of agsDoSlot) {
    const start = a.blocoIndex ?? 0;
    const len = Math.max(1, a.blocosTotal ?? 1);
    for (let k = 0; k < len; k++) agByBloco.set(start + k, a);
  }

  const headerEstadoSrc =
    agsDoSlot.find((a) => a.status !== "concluido") ?? agsDoSlot[0];
  const headerEstado = computeSlotEstado(
    dataKey,
    slotFim,
    headerEstadoSrc,
    now,
  );
  const headerClass = slotChipClasses(headerEstado, turma.cursoId);

  return (
    <div
      className={cn(
        "rounded-md border p-1 space-y-1",
        headerClass,
        compact && "p-0.5 space-y-0.5",
      )}
      title={`${turma.cod} · ${slotInicio}–${slotFim} — ${ESTADO_LABEL[headerEstado]}`}
    >
      {/* Cabeçalho: indicador + cod turma + horário */}
      <div className="flex items-center gap-1 px-0.5">
        <StateBadge estado={headerEstado} />
        <span className={cn("font-semibold truncate", compact ? "text-[10px]" : "text-xs")}>
          {turma.cod}
        </span>
        <span className={cn("ml-auto opacity-70 shrink-0", compact ? "text-[9px]" : "text-[10px]")}>
          {slotInicio}
        </span>
      </div>

      {/* Grid de blocos: 1 coluna por bloco */}
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${totalBlocos}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalBlocos }).map((_, idx) => {
          const ag = agByBloco.get(idx);
          const blocoStart = blocoInicio({ inicio: slotInicio }, idx, duracaoAulaMin);
          const blocoEnd = blocoFim({ inicio: slotInicio }, idx, duracaoAulaMin);

          // Estado deste bloco específico
          const estadoBloco = computeSlotEstado(dataKey, blocoEnd, ag, now);
          const clickable = isClickable(estadoBloco);

          // Se tem agendamento, mostra prof + botão relatório
          if (ag) {
            const isOwner =
              currentUser.role === "admin" ||
              ag.criadoPorUserId === currentUser.id;
            const podeRegistrar =
              isOwner &&
              (estadoBloco === "agendado" || estadoBloco === "atrasado");
            const profLabel = ag.criadoPorNome ?? ag.professor ?? "—";

            return (
              <div
                key={idx}
                className={cn(
                  "rounded border flex items-center gap-1 px-1 py-0.5 min-w-0",
                  estadoBloco === "concluido"
                    ? "bg-emerald-500/20 border-emerald-500/40"
                    : estadoBloco === "atrasado"
                      ? "bg-amber-500/20 border-amber-500/40"
                      : estadoBloco === "expirado"
                        ? "bg-muted border-muted-foreground/30 opacity-70"
                        : "bg-primary/15 border-primary/40",
                )}
                title={`${blocoStart}–${blocoEnd} · ${profLabel} — ${ESTADO_LABEL[estadoBloco]}`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!clickable) return;
                    onSlotClick?.({
                      turma,
                      date,
                      inicio: slotInicio,
                      fim: slotFim,
                      diaSemana,
                      estado: estadoBloco,
                      agendamento: ag,
                      blocoIndex: idx,
                    });
                  }}
                  className="flex items-center gap-1 min-w-0 flex-1 text-left hover:brightness-110"
                >
                  <FileText
                    className={cn(
                      "h-3 w-3 shrink-0",
                      estadoBloco === "concluido"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-primary",
                    )}
                  />
                  <span className={cn("truncate", compact ? "text-[9px]" : "text-[10px]")}>
                    {profLabel}
                  </span>
                </button>
                {podeRegistrar && onRegistrarRelatorio && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegistrarRelatorio(ag, turma);
                    }}
                    className="shrink-0 inline-flex items-center justify-center h-4 w-4 rounded hover:bg-foreground/10"
                    aria-label="Registrar relatório"
                    title="Registrar relatório"
                  >
                    <Send className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          }

          // Bloco vazio — clicável para agendar (ou desabilitado se passou)
          return (
            <button
              key={idx}
              type="button"
              disabled={!clickable}
              onClick={(e) => {
                e.stopPropagation();
                if (!clickable) return;
                onSlotClick?.({
                  turma,
                  date,
                  inicio: slotInicio,
                  fim: slotFim,
                  diaSemana,
                  estado: estadoBloco,
                  agendamento: undefined,
                  blocoIndex: idx,
                });
              }}
              className={cn(
                "rounded border border-dashed bg-background/40 hover:bg-background/70 transition-colors min-h-[18px]",
                !clickable && "opacity-50 cursor-not-allowed",
              )}
              title={`${blocoStart}–${blocoEnd} — ${ESTADO_LABEL[estadoBloco]}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ====================================================================
// Mês
// ====================================================================
function MonthView({
  refDate,
  turmas,
  cursoMap,
  agendamentos,
  onDayClick,
  onSlotClick,
  onRegistrarRelatorio,
}: {
  refDate: Date;
  turmas: Turma[];
  cursoMap: Map<string, Curso>;
  agendamentos: Agendamento[];
  onDayClick: (d: Date) => void;
  onSlotClick?: (p: SlotClickPayload) => void;
  onRegistrarRelatorio?: (a: Agendamento, t: Turma) => void;
}) {
  const monthStart = startOfMonth(refDate);
  const monthEnd = endOfMonth(refDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold capitalize">
          {format(refDate, "MMMM yyyy", { locale: ptBR })}
        </h3>
      </div>
      <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {weekdayLabels.map((w) => (
          <div key={w} className="px-2 py-2 text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const items = turmasNoDia(turmas, d);
          const isCurMonth = isSameMonth(d, refDate);
          const isToday = isSameDay(d, new Date());
          const dayKey = format(d, "yyyy-MM-dd");
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDayClick(d)}
              className={cn(
                "min-h-[88px] border-b border-r p-1.5 text-left flex flex-col gap-1 transition-colors hover:bg-muted/40",
                !isCurMonth && "bg-muted/20 text-muted-foreground",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-medium inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(d, "d")}
                </span>
              </div>
              <div className="space-y-1 overflow-hidden">
                {items.slice(0, 3).map((it, i) => {
                  const ags = findAgsDoSlot(agendamentos, it.turma.id, dayKey, it.inicio);
                  return (
                    <SlotChip
                      key={i}
                      turma={it.turma}
                      curso={cursoMap.get(it.turma.cursoId)}
                      date={d}
                      slotInicio={it.inicio}
                      slotFim={it.fim}
                      diaSemana={diaSemanaFromDate(d)}
                      agsDoSlot={ags}
                      compact
                      onSlotClick={onSlotClick}
                      onRegistrarRelatorio={onRegistrarRelatorio}
                    />
                  );
                })}
                {items.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{items.length - 3}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ====================================================================
// Semana — grid horários × dias
// ====================================================================
const WEEK_DAYS: { value: DiaSemana; label: string }[] = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
];

function WeekView({
  refDate,
  turmas,
  cursoMap,
  agendamentos,
  onSlotClick,
  onRegistrarRelatorio,
}: {
  refDate: Date;
  turmas: Turma[];
  cursoMap: Map<string, Curso>;
  agendamentos: Agendamento[];
  onSlotClick?: (p: SlotClickPayload) => void;
  onRegistrarRelatorio?: (a: Agendamento, t: Turma) => void;
}) {
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekDates = WEEK_DAYS.map((_, i) => addDays(weekStart, i));

  const { startHour, endHour } = useMemo(() => {
    let min = 24,
      max = 0;
    for (const t of turmas) {
      for (const h of t.horarios) {
        const sh = parseInt(h.inicio.split(":")[0], 10);
        const eh = parseInt(h.fim.split(":")[0], 10);
        const em = parseInt(h.fim.split(":")[1], 10);
        if (sh < min) min = sh;
        const endRound = em > 0 ? eh + 1 : eh;
        if (endRound > max) max = endRound;
      }
    }
    if (min === 24) min = 8;
    if (max === 0) max = 18;
    return { startHour: Math.max(0, min), endHour: Math.min(24, max) };
  }, [turmas]);

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  const byDay = useMemo(() => {
    const map = new Map<DiaSemana, { turma: Turma; inicio: string; fim: string }[]>();
    for (const d of WEEK_DAYS) map.set(d.value, []);
    for (const t of turmas) {
      for (const h of t.horarios) {
        map.get(h.diaSemana)!.push({ turma: t, inicio: h.inicio, fim: h.fim });
      }
    }
    return map;
  }, [turmas]);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold">
          Semana de {format(weekStart, "dd 'de' MMM", { locale: ptBR })}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px]" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
          <div className="border-b border-r bg-muted/30" />
          {WEEK_DAYS.map((d, i) => {
            const date = weekDates[i];
            const isToday = isSameDay(date, new Date());
            return (
              <div
                key={d.value}
                className={cn(
                  "border-b border-r px-2 py-2 text-center text-xs font-medium",
                  isToday && "bg-primary/10",
                )}
              >
                <div className="text-muted-foreground">{d.label}</div>
                <div className={cn("font-semibold", isToday && "text-primary")}>
                  {format(date, "dd/MM")}
                </div>
              </div>
            );
          })}

          {hours.map((h) => (
            <FragmentRow
              key={h}
              hour={h}
              weekDates={weekDates}
              byDay={byDay}
              cursoMap={cursoMap}
              agendamentos={agendamentos}
              onSlotClick={onSlotClick}
              onRegistrarRelatorio={onRegistrarRelatorio}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  hour,
  weekDates,
  byDay,
  cursoMap,
  agendamentos,
  onSlotClick,
  onRegistrarRelatorio,
}: {
  hour: number;
  weekDates: Date[];
  byDay: Map<DiaSemana, { turma: Turma; inicio: string; fim: string }[]>;
  cursoMap: Map<string, Curso>;
  agendamentos: Agendamento[];
  onSlotClick?: (p: SlotClickPayload) => void;
  onRegistrarRelatorio?: (a: Agendamento, t: Turma) => void;
}) {
  const hh = String(hour).padStart(2, "0");
  return (
    <>
      <div className="border-b border-r px-1.5 py-1 text-[10px] text-muted-foreground bg-muted/20 text-right">
        {hh}:00
      </div>
      {WEEK_DAYS.map((d, i) => {
        const date = weekDates[i];
        const dayKey = format(date, "yyyy-MM-dd");
        const items = (byDay.get(d.value) ?? []).filter((it) => {
          const ih = parseInt(it.inicio.split(":")[0], 10);
          return ih === hour;
        });
        return (
          <div
            key={d.value}
            className="border-b border-r p-1 min-h-[44px] space-y-1"
          >
            {items.map((it, idx) => {
              const ags = findAgsDoSlot(agendamentos, it.turma.id, dayKey, it.inicio);
              return (
                <SlotChip
                  key={idx}
                  turma={it.turma}
                  curso={cursoMap.get(it.turma.cursoId)}
                  date={date}
                  slotInicio={it.inicio}
                  slotFim={it.fim}
                  diaSemana={d.value}
                  agsDoSlot={ags}
                  onSlotClick={onSlotClick}
                  onRegistrarRelatorio={onRegistrarRelatorio}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}
