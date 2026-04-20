import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  diaSemanaFromDate,
  isAgendamentoAtivo,
  type Curso,
  type Turma,
  type DiaSemana,
} from "@/lib/academic-types";
import type { Agendamento } from "@/lib/academic-types";
import { cn } from "@/lib/utils";

interface SlotClickPayload {
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
}

// Gera ocorrências semanais (dia da semana + slot) para uma data
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

export function ScheduleCalendar({ turmas, cursos, agendamentos, onSlotClick }: Props) {
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
        />
      </TabsContent>

      <TabsContent value="semana">
        <WeekView
          refDate={refDate}
          turmas={turmas}
          cursoMap={cursoMap}
          agendamentos={agendamentos}
          onSlotClick={onSlotClick}
        />
      </TabsContent>
    </Tabs>
  );
}

// ---------- Cores por curso ----------
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
  return (
    CURSO_COLORS[cursoId] ||
    "bg-muted text-foreground border-border"
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
}: {
  refDate: Date;
  turmas: Turma[];
  cursoMap: Map<string, Curso>;
  agendamentos: Agendamento[];
  onDayClick: (d: Date) => void;
  onSlotClick?: (p: SlotClickPayload) => void;
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
          const ags = agendamentos.filter((a) => a.data === dayKey);
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
                {ags.length > 0 && (
                  <span className="text-[10px] text-primary font-semibold">
                    ●
                  </span>
                )}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {items.slice(0, 3).map((it, i) => {
                  const dayKey = format(d, "yyyy-MM-dd");
                  const ag = ags.find(
                    (a) => a.turmaId === it.turma.id && a.inicio === it.inicio,
                  );
                  const ativa = ag ? isAgendamentoAtivo(ag) : false;
                  const isPast = startOfDay(d) < startOfDay(new Date());
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isPast}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPast) return;
                        onSlotClick?.({
                          turma: it.turma,
                          date: d,
                          inicio: it.inicio,
                          fim: it.fim,
                          diaSemana: diaSemanaFromDate(d),
                        });
                      }}
                      className={cn(
                        "text-[10px] leading-tight px-1 py-0.5 rounded border truncate w-full text-left hover:brightness-110",
                        cursoChipClass(it.turma.cursoId),
                        isPast && "opacity-40 cursor-not-allowed hover:brightness-100",
                        ativa && "ring-1 ring-primary",
                      )}
                      title={
                        isPast
                          ? `${it.turma.cod} · ${it.inicio}–${it.fim} — data passada`
                          : `${it.turma.cod} · ${it.inicio}–${it.fim} — clique para agendar`
                      }
                    >
                      {ativa && "● "}
                      {it.inicio} {it.turma.cod}
                    </button>
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
}: {
  refDate: Date;
  turmas: Turma[];
  cursoMap: Map<string, Curso>;
  agendamentos: Agendamento[];
  onSlotClick?: (p: SlotClickPayload) => void;
}) {
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekDates = WEEK_DAYS.map((_, i) => addDays(weekStart, i));

  // calcula faixa de horas a exibir a partir das turmas
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

  // Index turmas por dia da semana
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

  const agByKey = useMemo(() => {
    const set = new Set<string>();
    for (const a of agendamentos) {
      set.add(`${a.data}|${a.inicio}`);
    }
    return set;
  }, [agendamentos]);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold">
          Semana de {format(weekStart, "dd 'de' MMM", { locale: ptBR })}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px]" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
          {/* cabeçalho */}
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

          {/* linhas de horas */}
          {hours.map((h) => (
            <FragmentRow
              key={h}
              hour={h}
              weekDates={weekDates}
              byDay={byDay}
              cursoMap={cursoMap}
              agByKey={agByKey}
              onSlotClick={onSlotClick}
            />
          ))}
        </div>
      </div>
      <div className="px-4 py-2 border-t flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />
          Slot com agendamento
        </span>
        {[...cursoMap.values()].map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1">
            <span
              className={cn(
                "inline-block w-2.5 h-2.5 rounded border",
                cursoChipClass(c.id),
              )}
            />
            {c.cod}
          </span>
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  hour,
  weekDates,
  byDay,
  cursoMap,
  agByKey,
  onSlotClick,
}: {
  hour: number;
  weekDates: Date[];
  byDay: Map<DiaSemana, { turma: Turma; inicio: string; fim: string }[]>;
  cursoMap: Map<string, Curso>;
  agByKey: Set<string>;
  onSlotClick?: (p: SlotClickPayload) => void;
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
              const hasAg = agByKey.has(`${dayKey}|${it.inicio}`);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    onSlotClick?.({
                      turma: it.turma,
                      date,
                      inicio: it.inicio,
                      fim: it.fim,
                      diaSemana: d.value,
                    })
                  }
                  className={cn(
                    "text-[10px] leading-tight px-1.5 py-1 rounded border truncate relative w-full text-left hover:brightness-110 cursor-pointer",
                    cursoChipClass(it.turma.cursoId),
                  )}
                  title={`${it.turma.cod} · ${it.inicio}–${it.fim} — clique para agendar`}
                >
                  <span className="font-semibold">{it.turma.cod}</span>
                  <span className="opacity-70 ml-1">
                    {it.inicio}–{it.fim}
                  </span>
                  {hasAg && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
