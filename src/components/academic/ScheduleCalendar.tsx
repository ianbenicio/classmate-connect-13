import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CircleAlert, FileText, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  computeSlotEstado,
  diaSemanaFromDate,
  formatMinutos,
  getDuracaoAulaMin,
  MS_PER_HOUR,
  REPORT_DEADLINE_HOURS,
  agendamentoDispensaRequisitos,
  slotBlocosCount,
  blocoInicio,
  blocoFim,
  type Agendamento,
  type Atividade,
  type Curso,
  type DiaSemana,
  type SlotEstado,
  type Turma,
} from "@/lib/academic-types";
import { useAuth } from "@/lib/auth";
import { canDeleteAgendamento, canManageAgendamento } from "@/lib/agendamento-permissions";
import {
  evidenciaEstaValida,
  getEvidenciaPorTipo,
  type AulaEvidencia,
} from "@/lib/aula-evidencias";
import { getInicioDiaAula } from "@/lib/professor-criticas";
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
  evidencias?: AulaEvidencia[];
  atividades?: Atividade[];
  onSlotClick?: (payload: SlotClickPayload) => void;
  onRegistrarRelatorio?: (agendamento: Agendamento, turma: Turma) => void;
  onCellHeaderClick?: (payload: CellHeaderClickPayload) => void;
  onRemoverAgendamento?: (agendamento: Agendamento, turma: Turma) => void;
}

function turmasNoDia(turmas: Turma[], date: Date, agendamentos: Agendamento[] = []) {
  const ds = diaSemanaFromDate(date);
  const dataKey = format(date, "yyyy-MM-dd");
  const turmaMap = new Map(turmas.map((turma) => [turma.id, turma]));
  const items: { turma: Turma; inicio: string; fim: string }[] = [];
  const seen = new Set<string>();
  for (const t of turmas) {
    for (const h of t.horarios) {
      if (h.diaSemana === ds) {
        seen.add(`${t.id}|${h.inicio}|${h.fim}`);
        items.push({ turma: t, inicio: h.inicio, fim: h.fim });
      }
    }
  }
  for (const agendamento of agendamentos) {
    if (agendamento.data !== dataKey) continue;
    const turma = turmaMap.get(agendamento.turmaId);
    if (!turma) continue;
    const inicio = agendamento.slotInicio ?? agendamento.inicio;
    const fim = agendamento.slotFim ?? agendamento.fim;
    const key = `${turma.id}|${inicio}|${fim}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ turma, inicio, fim });
  }
  return items.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function ScheduleCalendar({
  turmas,
  cursos,
  agendamentos,
  evidencias = [],
  atividades = [],
  onSlotClick,
  onRegistrarRelatorio,
  onCellHeaderClick,
  onRemoverAgendamento,
}: Props) {
  const [refDate, setRefDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"mes" | "semana">("semana");

  const cursoMap = useMemo(() => new Map(cursos.map((c) => [c.id, c])), [cursos]);
  const atividadeById = useMemo(
    () => new Map(atividades.map((atividade) => [atividade.id, atividade])),
    [atividades],
  );
  const evidenciasByAgendamento = useMemo(() => {
    const map = new Map<string, AulaEvidencia[]>();
    for (const evidencia of evidencias) {
      const list = map.get(evidencia.agendamentoId) ?? [];
      list.push(evidencia);
      map.set(evidencia.agendamentoId, list);
    }
    return map;
  }, [evidencias]);

  const handlePrev = () =>
    setRefDate((d) => (activeTab === "semana" ? subWeeks(d, 1) : subMonths(d, 1)));
  const handleNext = () =>
    setRefDate((d) => (activeTab === "semana" ? addWeeks(d, 1) : addMonths(d, 1)));

  return (
    <Tabs
      defaultValue="semana"
      className="w-full"
      onValueChange={(v) => setActiveTab(v as "mes" | "semana")}
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <TabsList>
          <TabsTrigger value="mes">Mês</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={handlePrev} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRefDate(new Date())}>
            Hoje
          </Button>
          <Button size="icon" variant="outline" onClick={handleNext} aria-label="Próximo">
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
          evidenciasByAgendamento={evidenciasByAgendamento}
          atividadeById={atividadeById}
          onDayClick={(d) => setRefDate(d)}
          onSlotClick={onSlotClick}
          onRegistrarRelatorio={onRegistrarRelatorio}
          onCellHeaderClick={onCellHeaderClick}
          onRemoverAgendamento={onRemoverAgendamento}
        />
      </TabsContent>

      <TabsContent value="semana">
        <WeekView
          refDate={refDate}
          turmas={turmas}
          cursoMap={cursoMap}
          agendamentos={agendamentos}
          evidenciasByAgendamento={evidenciasByAgendamento}
          atividadeById={atividadeById}
          onSlotClick={onSlotClick}
          onRegistrarRelatorio={onRegistrarRelatorio}
          onCellHeaderClick={onCellHeaderClick}
          onRemoverAgendamento={onRemoverAgendamento}
        />
      </TabsContent>

      <Legend />
    </Tabs>
  );
}

// ---------- Cores por CURSO + variação por TURMA ----------
// Cada curso tem um "hue" base. As turmas do mesmo curso recebem variações
// determinísticas de matiz/saturação/luminosidade derivadas do hash do id.
const CURSO_HUES: Record<string, number> = {
  MP: 220, // azul
  GP: 150, // verde
  AD: 35, // âmbar
  RB: 295, // fúcsia
};
const FALLBACK_HUES = [0, 200, 270, 110, 50, 320, 180, 25];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function cursoHue(curso: { id: string; cod?: string } | undefined, fallbackId: string): number {
  if (curso?.cod && CURSO_HUES[curso.cod] !== undefined) return CURSO_HUES[curso.cod];
  const key = curso?.id ?? fallbackId;
  return FALLBACK_HUES[hashStr(key) % FALLBACK_HUES.length];
}

/** Estilos inline para chip de turma — base do curso + variação por turma. */
function turmaColor(turma: { id: string; cursoId: string }, curso?: { id: string; cod?: string }) {
  const hue = cursoHue(curso, turma.cursoId);
  const h = hashStr(turma.id);
  const dh = (h % 25) - 12; // -12..+12 matiz
  const dl = ((h >> 5) % 31) - 15; // -15..+15 luminosidade
  const ds = ((h >> 10) % 21) - 10; // -10..+10 saturação
  const finalHue = (hue + dh + 360) % 360;
  const sat = Math.max(45, Math.min(85, 65 + ds));
  const lum = Math.max(40, Math.min(70, 55 + dl));
  return {
    bar: { backgroundColor: `hsl(${finalHue} ${sat}% ${lum}%)` } as React.CSSProperties,
    chip: {
      backgroundColor: `hsl(${finalHue} ${sat}% ${lum}% / 0.15)`,
      borderColor: `hsl(${finalHue} ${sat}% ${lum}% / 0.5)`,
      color: `hsl(${finalHue} ${Math.min(90, sat + 10)}% ${Math.max(28, lum - 22)}%)`,
    } as React.CSSProperties,
  };
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
      return (
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-label="Pronta" />
      );
    case "vazio_passado":
      return (
        <span
          className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50"
          aria-label="Indisponível"
        />
      );
    case "agendado":
      return <FileText className="h-3 w-3 text-primary" aria-label="Agendada" />;
    case "concluido":
      return <FileText className="h-3 w-3 text-emerald-600" aria-label="Relatório registrado" />;
    case "atrasado":
      return (
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" aria-label="Atrasada" />
      );
    case "expirado":
      return (
        <span
          className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40"
          aria-label="Expirada"
        />
      );
  }
}

/** Classe (apenas estados especiais). vazio_futuro/passado usam cor inline da turma. */
function slotChipClasses(estado: SlotEstado): string {
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
      return "";
  }
}

function isClickable(estado: SlotEstado) {
  // expirado e vazio_passado são desabilitados
  return estado !== "expirado" && estado !== "vazio_passado";
}

function isPlanoPendenteNoCalendario(
  agendamento: Agendamento,
  evidencias: AulaEvidencia[],
  atividadeById: Map<string, Atividade>,
) {
  if (agendamentoDispensaRequisitos(agendamento)) return false;
  const temAula = agendamento.atividadeIds.some(
    (atividadeId) => atividadeById.get(atividadeId)?.tipo === 0,
  );
  if (!temAula) return false;
  return !evidenciaEstaValida(getEvidenciaPorTipo(evidencias, "plano_aula"));
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
      <span className="inline-flex items-center gap-1.5">
        <CircleAlert className="h-3 w-3 text-amber-600" />
        Plano pendente
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
      a.turmaId === turmaId && a.data === dataKey && (a.slotInicio ?? a.inicio) === slotInicioRef,
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
  evidenciasByAgendamento,
  atividadeById,
  compact = false,
  onSlotClick,
  onRegistrarRelatorio,
  onCellHeaderClick,
  onRemoverAgendamento,
}: {
  turma: Turma;
  curso: Curso | undefined;
  date: Date;
  slotInicio: string;
  slotFim: string;
  diaSemana: DiaSemana;
  agsDoSlot: Agendamento[];
  evidenciasByAgendamento: Map<string, AulaEvidencia[]>;
  atividadeById: Map<string, Atividade>;
  compact?: boolean;
  onSlotClick?: (p: SlotClickPayload) => void;
  onRegistrarRelatorio?: (a: Agendamento, t: Turma) => void;
  onCellHeaderClick?: (p: CellHeaderClickPayload) => void;
  onRemoverAgendamento?: (a: Agendamento, t: Turma) => void;
}) {
  const { user: authUser, hasRole } = useAuth();
  const now = new Date();
  const dataKey = format(date, "yyyy-MM-dd");
  const duracaoAulaMin = curso ? getDuracaoAulaMin(curso) : 60;
  const totalBlocos = slotBlocosCount({ inicio: slotInicio, fim: slotFim }, duracaoAulaMin);

  const agByBloco = new Map<number, Agendamento>();
  for (const a of agsDoSlot) {
    const start = a.blocoIndex ?? 0;
    const len = Math.max(1, a.blocosTotal ?? 1);
    for (let k = 0; k < len; k++) agByBloco.set(start + k, a);
  }

  const headerEstadoSrc = agsDoSlot.find((a) => a.status !== "concluido") ?? agsDoSlot[0];
  const headerEstado = computeSlotEstado(dataKey, slotFim, headerEstadoSrc, now);
  const headerClass = slotChipClasses(headerEstado);
  const colors = turmaColor(turma, curso);
  // Aplica a cor da turma só quando o estado não tem cor própria (vazio_futuro).
  const useTurmaColor = headerEstado === "vazio_futuro";

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCellHeaderClick?.({
      turma,
      date,
      inicio: slotInicio,
      fim: slotFim,
      diaSemana,
    });
  };

  return (
    <div
      className={cn(
        "relative rounded-md border p-1 pl-1.5 space-y-1 overflow-hidden",
        headerClass,
        compact && "p-0.5 pl-1 space-y-0.5",
      )}
      style={useTurmaColor ? colors.chip : undefined}
      title={`${turma.cod} · ${slotInicio}–${slotFim} — ${ESTADO_LABEL[headerEstado]}`}
    >
      {/* Barra lateral identificadora da turma (cor do curso + variação) */}
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1" style={colors.bar} />
      {/* Cabeçalho clicável: abre dialog de detalhes da turma/dia */}
      <button
        type="button"
        onClick={handleHeaderClick}
        className="w-full flex flex-col gap-0.5 px-0.5 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-1 w-full">
          <StateBadge estado={headerEstado} />
          <span className={cn("font-semibold truncate", compact ? "text-[10px]" : "text-xs")}>
            {turma.cod}
          </span>
          <span
            className={cn("ml-auto opacity-70 shrink-0", compact ? "text-[9px]" : "text-[10px]")}
          >
            {slotInicio}–{slotFim}
          </span>
        </div>
        <span className={cn("text-muted-foreground pl-3", compact ? "text-[8px]" : "text-[9px]")}>
          {totalBlocos} {totalBlocos === 1 ? "aula" : "aulas"} · {formatMinutos(duracaoAulaMin)}{" "}
          cada
        </span>
      </button>

      {/* Stack vertical de blocos: 1 linha por bloco (estende altura da célula) */}
      <div className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
        {Array.from({ length: totalBlocos }).map((_, idx) => {
          const ag = agByBloco.get(idx);
          const blocoStart = blocoInicio({ inicio: slotInicio }, idx, duracaoAulaMin);
          const blocoEnd = blocoFim({ inicio: slotInicio }, idx, duracaoAulaMin);
          const estadoBloco = computeSlotEstado(dataKey, blocoEnd, ag, now);
          const clickable = isClickable(estadoBloco);

          if (ag) {
            // Permissoes vindas do helper centralizado.
            // - podeGerenciar: cobre relatorio/checkin (admin, criador, OU professor titular).
            // - podeRemover: estrita (admin OU criador) — professor titular nao pode deletar
            //   aula montada por outro.
            const actor = {
              userId: authUser?.id ?? null,
              isStaff: hasRole("admin"),
            };
            const podeGerenciar = canManageAgendamento(actor, ag);
            const podeRemover = canDeleteAgendamento(actor, ag);
            const startOfDay = new Date(`${dataKey}T00:00:00`);
            const slotEnd24 = new Date(
              new Date(`${dataKey}T${blocoEnd}:00`).getTime() + REPORT_DEADLINE_HOURS * MS_PER_HOUR,
            );
            const dentroJanelaRelatorio = now >= startOfDay && now <= slotEnd24;
            const podeRegistrar =
              podeGerenciar && dentroJanelaRelatorio && ag.status !== "concluido";
            // Só o primeiro nome para caber nas células estreitas do calendário.
            // O nome completo continua no `title` do bloco (tooltip).
            const profFullName = ag.professor ?? ag.criadoPorNome ?? "—";
            const profLabel = profFullName.trim().split(/\s+/)[0] || profFullName;
            // Código resumido da 1ª atividade
            const codigoAula = ag.atividadeIds[0]?.slice(0, 8) ?? "";
            const planoPendente = isPlanoPendenteNoCalendario(
              ag,
              evidenciasByAgendamento.get(ag.id) ?? [],
              atividadeById,
            );
            const planoCritico = planoPendente && now >= getInicioDiaAula(ag);

            return (
              <div
                key={idx}
                className={cn(
                  "rounded border flex flex-col gap-0.5 p-1 min-w-0",
                  estadoBloco === "concluido"
                    ? "bg-emerald-500/20 border-emerald-500/40"
                    : estadoBloco === "atrasado"
                      ? "bg-amber-500/20 border-amber-500/40"
                      : estadoBloco === "expirado"
                        ? "bg-muted border-muted-foreground/30 opacity-70"
                        : "bg-primary/15 border-primary/40",
                )}
                title={`${blocoStart}–${blocoEnd} · ${profFullName} — ${ESTADO_LABEL[estadoBloco]}`}
              >
                <button
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
                      agendamento: ag,
                      blocoIndex: idx,
                    });
                  }}
                  className={cn(
                    "flex items-center gap-1 min-w-0 text-left",
                    clickable && "hover:brightness-110",
                  )}
                >
                  <FileText
                    className={cn(
                      "h-3 w-3 shrink-0",
                      estadoBloco === "concluido"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-primary",
                    )}
                  />
                  <span
                    className={cn("truncate font-medium", compact ? "text-[9px]" : "text-[10px]")}
                  >
                    {profLabel}
                  </span>
                  {planoPendente && (
                    <CircleAlert
                      className={cn(
                        "h-3 w-3 shrink-0",
                        planoCritico ? "text-destructive" : "text-amber-600",
                      )}
                      aria-label={planoCritico ? "Plano ausente com critica" : "Plano pendente"}
                    />
                  )}
                </button>
                {!compact && codigoAula && (
                  <span className="text-[9px] font-mono text-muted-foreground truncate px-0.5">
                    {codigoAula}
                  </span>
                )}
                {podeRegistrar && onRegistrarRelatorio && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegistrarRelatorio(ag, turma);
                    }}
                    className={cn(
                      "mt-0.5 inline-flex items-center justify-center gap-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-1 py-0.5 font-medium",
                      compact ? "text-[8px]" : "text-[9px]",
                    )}
                    aria-label="Registrar Relatório de Aula"
                    title="Registrar Relatório de Aula"
                  >
                    <Send className="h-2.5 w-2.5" />
                    Relatório
                  </button>
                )}
                {podeRemover && estadoBloco !== "concluido" && onRemoverAgendamento && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoverAgendamento(ag, turma);
                    }}
                    className={cn(
                      "inline-flex items-center justify-center rounded border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors px-1 py-0.5",
                      compact ? "text-[8px]" : "text-[9px]",
                    )}
                    aria-label="Remover agendamento"
                    title="Remover agendamento (libera o slot)"
                  >
                    Remover
                  </button>
                )}
              </div>
            );
          }

          // Bloco vazio — clicável para agendar
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
                "rounded border border-dashed bg-background/40 hover:bg-background/70 transition-colors flex items-center justify-center",
                compact ? "min-h-[18px]" : "min-h-[44px]",
                !clickable && "opacity-50 cursor-not-allowed",
              )}
              title={`${blocoStart}–${blocoEnd} — Disponível`}
            >
              {!compact && (
                <span className="text-[9px] text-muted-foreground">+ Aula {idx + 1}</span>
              )}
            </button>
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
  evidenciasByAgendamento,
  atividadeById,
  onDayClick,
  onSlotClick,
  onRegistrarRelatorio,
  onCellHeaderClick,
  onRemoverAgendamento,
}: {
  refDate: Date;
  turmas: Turma[];
  cursoMap: Map<string, Curso>;
  agendamentos: Agendamento[];
  evidenciasByAgendamento: Map<string, AulaEvidencia[]>;
  atividadeById: Map<string, Atividade>;
  onDayClick: (d: Date) => void;
  onSlotClick?: (p: SlotClickPayload) => void;
  onRegistrarRelatorio?: (a: Agendamento, t: Turma) => void;
  onCellHeaderClick?: (p: CellHeaderClickPayload) => void;
  onRemoverAgendamento?: (a: Agendamento, t: Turma) => void;
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
          const items = turmasNoDia(turmas, d, agendamentos);
          const isCurMonth = isSameMonth(d, refDate);
          const isToday = isSameDay(d, new Date());
          const dayKey = format(d, "yyyy-MM-dd");
          return (
            <div
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              className={cn(
                "min-h-[88px] border-b border-r p-1.5 text-left flex flex-col gap-1 transition-colors hover:bg-muted/40 cursor-pointer",
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
              <div className="space-y-1">
                {items.map((it, i) => {
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
                      evidenciasByAgendamento={evidenciasByAgendamento}
                      atividadeById={atividadeById}
                      compact
                      onSlotClick={onSlotClick}
                      onRegistrarRelatorio={onRegistrarRelatorio}
                      onCellHeaderClick={onCellHeaderClick}
                      onRemoverAgendamento={onRemoverAgendamento}
                    />
                  );
                })}
              </div>
            </div>
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
  evidenciasByAgendamento,
  atividadeById,
  onSlotClick,
  onRegistrarRelatorio,
  onCellHeaderClick,
  onRemoverAgendamento,
}: {
  refDate: Date;
  turmas: Turma[];
  cursoMap: Map<string, Curso>;
  agendamentos: Agendamento[];
  evidenciasByAgendamento: Map<string, AulaEvidencia[]>;
  atividadeById: Map<string, Atividade>;
  onSlotClick?: (p: SlotClickPayload) => void;
  onRegistrarRelatorio?: (a: Agendamento, t: Turma) => void;
  onCellHeaderClick?: (p: CellHeaderClickPayload) => void;
  onRemoverAgendamento?: (a: Agendamento, t: Turma) => void;
}) {
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekDates = WEEK_DAYS.map((_, i) => addDays(weekStart, i));

  const { startHour, endHour } = useMemo(() => {
    let min = 24,
      max = 0;
    const weekDateKeys = new Set(weekDates.map((date) => format(date, "yyyy-MM-dd")));
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
    for (const agendamento of agendamentos) {
      if (!weekDateKeys.has(agendamento.data)) continue;
      const sh = parseInt((agendamento.slotInicio ?? agendamento.inicio).split(":")[0], 10);
      const [ehRaw, emRaw] = (agendamento.slotFim ?? agendamento.fim)
        .split(":")
        .map((part) => parseInt(part, 10));
      if (sh < min) min = sh;
      const endRound = emRaw > 0 ? ehRaw + 1 : ehRaw;
      if (endRound > max) max = endRound;
    }
    if (min === 24) min = 8;
    if (max === 0) max = 18;
    return { startHour: Math.max(0, min), endHour: Math.min(24, max) };
  }, [agendamentos, turmas, weekDates]);

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

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
              turmas={turmas}
              cursoMap={cursoMap}
              agendamentos={agendamentos}
              evidenciasByAgendamento={evidenciasByAgendamento}
              atividadeById={atividadeById}
              onSlotClick={onSlotClick}
              onRegistrarRelatorio={onRegistrarRelatorio}
              onCellHeaderClick={onCellHeaderClick}
              onRemoverAgendamento={onRemoverAgendamento}
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
  turmas,
  cursoMap,
  agendamentos,
  evidenciasByAgendamento,
  atividadeById,
  onSlotClick,
  onRegistrarRelatorio,
  onCellHeaderClick,
  onRemoverAgendamento,
}: {
  hour: number;
  weekDates: Date[];
  turmas: Turma[];
  cursoMap: Map<string, Curso>;
  agendamentos: Agendamento[];
  evidenciasByAgendamento: Map<string, AulaEvidencia[]>;
  atividadeById: Map<string, Atividade>;
  onSlotClick?: (p: SlotClickPayload) => void;
  onRegistrarRelatorio?: (a: Agendamento, t: Turma) => void;
  onCellHeaderClick?: (p: CellHeaderClickPayload) => void;
  onRemoverAgendamento?: (a: Agendamento, t: Turma) => void;
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
        const items = turmasNoDia(turmas, date, agendamentos).filter((it) => {
          const ih = parseInt(it.inicio.split(":")[0], 10);
          return ih === hour;
        });
        return (
          <div key={d.value} className="border-b border-r p-1 min-h-[44px] space-y-1">
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
                  evidenciasByAgendamento={evidenciasByAgendamento}
                  atividadeById={atividadeById}
                  onSlotClick={onSlotClick}
                  onRegistrarRelatorio={onRegistrarRelatorio}
                  onCellHeaderClick={onCellHeaderClick}
                  onRemoverAgendamento={onRemoverAgendamento}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}
