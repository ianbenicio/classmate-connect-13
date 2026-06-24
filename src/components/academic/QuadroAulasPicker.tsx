// Picker em grade para escolher uma aula disponível no agendamento.
// Mostra todas as aulas (tipo=0) do curso como células coloridas:
//   - verde  = concluída (agendamento concluido)   → NÃO selecionável
//   - amarelo = agendada (agendamento pendente)     → NÃO selecionável
//   - cinza  = disponível                           → selecionável
// Clique numa célula disponível para selecionar; botão OK confirma.
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { getGrupoNome, isAtividadeAvulsa, type Atividade, type Curso } from "@/lib/academic-types";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { getStatusAulasDaTurma } from "@/lib/cronograma-aulas";
import { useGruposByCursoCod } from "@/lib/grupos-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CelulaStatus = "concluida" | "agendada" | "disponivel";

type CelulaAula = {
  atividade: Atividade;
  status: CelulaStatus;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: Curso;
  atividades: Atividade[];
  /** Turma alvo — define quais aulas já estão agendadas/concluídas. */
  turmaId: string | undefined;
  /** Chamado com o id da aula selecionada ao confirmar. */
  onSelect: (aulaId: string) => void;
}

const STATUS_CLASSES: Record<CelulaStatus, string> = {
  concluida:
    "bg-emerald-500/20 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 cursor-not-allowed",
  agendada:
    "bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-300 cursor-not-allowed",
  disponivel:
    "bg-muted border-border text-foreground hover:border-primary hover:bg-accent cursor-pointer",
};

const STATUS_LABEL: Record<CelulaStatus, string> = {
  concluida: "Concluída",
  agendada: "Agendada",
  disponivel: "Disponível",
};

export function QuadroAulasPicker({
  open,
  onOpenChange,
  curso,
  atividades,
  turmaId,
  onSelect,
}: Props) {
  const todosAgendamentos = useAgendamentos();
  const gruposByCursoCod = useGruposByCursoCod();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grupoFiltro, setGrupoFiltro] = useState<string>("__all__");

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setGrupoFiltro("__all__");
    }
  }, [open]);

  const gruposDoCurso = useMemo(
    () => gruposByCursoCod[curso.cod] ?? [],
    [curso.cod, gruposByCursoCod],
  );
  const grupoOrder = useMemo(
    () => new Map(gruposDoCurso.map((grupo, index) => [grupo.cod, index])),
    [gruposDoCurso],
  );

  const aulasCurso = useMemo(
    () =>
      atividades
        .filter((a) => a.cursoId === curso.id && a.tipo === 0 && !isAtividadeAvulsa(a))
        .sort((a, b) => {
          const orderA = grupoOrder.get(a.grupo) ?? Number.MAX_SAFE_INTEGER;
          const orderB = grupoOrder.get(b.grupo) ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          if (a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo);
          return a.codigo.localeCompare(b.codigo);
        }),
    [atividades, curso.id, grupoOrder],
  );

  // Aulas já concluídas/agendadas para a turma (cancelados liberam).
  const { aulasConcluidasIds, aulasAgendadasIds } = useMemo(
    () => getStatusAulasDaTurma(todosAgendamentos, turmaId, aulasCurso),
    [aulasCurso, todosAgendamentos, turmaId],
  );

  const celulas = useMemo<CelulaAula[]>(
    () =>
      aulasCurso.map((a) => {
        let status: CelulaStatus = "disponivel";
        if (aulasConcluidasIds.has(a.id)) status = "concluida";
        else if (aulasAgendadasIds.has(a.id)) status = "agendada";
        return { atividade: a, status };
      }),
    [aulasCurso, aulasConcluidasIds, aulasAgendadasIds],
  );

  const gruposVisiveis = useMemo(() => {
    const map = new Map<string, CelulaAula[]>();
    for (const celula of celulas) {
      if (grupoFiltro !== "__all__" && celula.atividade.grupo !== grupoFiltro) continue;
      const grupo = celula.atividade.grupo || "__sem_grupo__";
      const list = map.get(grupo) ?? [];
      list.push(celula);
      map.set(grupo, list);
    }
    return Array.from(map.entries()).map(([grupo, items]) => ({
      grupo,
      label:
        grupo === "__sem_grupo__" ? "Sem modulo" : getGrupoNome(gruposByCursoCod, curso.cod, grupo),
      items,
      stats: items.reduce(
        (acc, item) => {
          acc[item.status]++;
          return acc;
        },
        { concluida: 0, agendada: 0, disponivel: 0 } as Record<CelulaStatus, number>,
      ),
    }));
  }, [celulas, curso.cod, grupoFiltro, gruposByCursoCod]);

  const gruposFiltroOpcoes = useMemo(
    () =>
      Array.from(new Set(aulasCurso.map((aula) => aula.grupo).filter(Boolean))).map((grupo) => ({
        value: grupo,
        label: getGrupoNome(gruposByCursoCod, curso.cod, grupo),
      })),
    [aulasCurso, curso.cod, gruposByCursoCod],
  );

  const stats = useMemo(() => {
    const c = { concluida: 0, agendada: 0, disponivel: 0 };
    for (const cel of celulas) c[cel.status]++;
    return c;
  }, [celulas]);

  const handleConfirm = () => {
    if (!selectedId) return;
    onSelect(selectedId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Selecione uma aula
          </DialogTitle>
          <DialogDescription>
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {curso.cod}
              </Badge>
              <span>{curso.nome}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 text-xs">
          <LegendDot color="bg-muted-foreground/40" label={`Disponível (${stats.disponivel})`} />
          <LegendDot color="bg-amber-500" label={`Agendada (${stats.agendada})`} />
          <LegendDot color="bg-emerald-500" label={`Concluída (${stats.concluida})`} />
        </div>

        {gruposFiltroOpcoes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
              <SelectTrigger className="h-9 w-full text-xs sm:w-[240px]">
                <SelectValue placeholder="Modulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os modulos</SelectItem>
                {gruposFiltroOpcoes.map((grupo) => (
                  <SelectItem key={grupo.value} value={grupo.value}>
                    {grupo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {aulasCurso.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            Este curso ainda não tem aulas cadastradas.
          </p>
        ) : (
          <div className="space-y-4">
            {gruposVisiveis.map(({ grupo, label, items, stats: grupoStats }) => (
              <section key={grupo} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">
                      {items.length} aula{items.length !== 1 ? "s" : ""} no modulo
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                    <Badge variant="outline">{grupoStats.disponivel} livres</Badge>
                    <Badge variant="outline">{grupoStats.agendada} agendadas</Badge>
                    <Badge variant="outline">{grupoStats.concluida} concluidas</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(86px,1fr))] gap-2">
                  {items.map(({ atividade, status }) => {
                    const selectable = status === "disponivel";
                    const isSelected = selectedId === atividade.id;
                    return (
                      <button
                        key={atividade.id}
                        type="button"
                        disabled={!selectable}
                        title={`${atividade.codigo} — ${atividade.nome} · ${STATUS_LABEL[status]}`}
                        onClick={() => selectable && setSelectedId(atividade.id)}
                        className={`relative aspect-square border-2 rounded-md flex items-center justify-center px-1 text-center font-mono text-[11px] font-semibold transition-all ${STATUS_CLASSES[status]} ${
                          isSelected ? "ring-2 ring-primary ring-offset-1 border-primary" : ""
                        }`}
                      >
                        <span className="break-all">{atividade.codigo}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedId}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
