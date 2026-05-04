import { useEffect, useMemo, useState } from "react";
import { useHabilidades } from "@/lib/habilidades-store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DIAS_SEMANA,
  addMinutesToHHMM,
  blocosPorTurno,
  formatMinutos,
  getDuracaoAulaMin,
  getTurnoDiarioMin,
  type Curso,
  type DiaSemana,
  type HorarioSlot,
  type Turma,
} from "@/lib/academic-types";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cursoId: string;
  curso?: Curso;
  editing?: Turma;
  onSave: (turma: Turma) => void;
}

export function TurmaFormDialog({ open, onOpenChange, cursoId, curso, editing, onSave }: Props) {
  const [nome, setNome] = useState("");
  const [cod, setCod] = useState("");
  const [data, setData] = useState("");
  const [horarios, setHorarios] = useState<HorarioSlot[]>([]);
  const [descricao, setDescricao] = useState("");

  const turnoMin = curso ? getTurnoDiarioMin(curso) : 0;
  const aulaMin = curso ? getDuracaoAulaMin(curso) : 0;
  const blocosDia = curso ? blocosPorTurno(curso) : 0;
  const cargaTotal = curso?.cargaHorariaTotalMin ?? 0;
  const cursoOk = !!curso && turnoMin > 0;

  const todasHabilidades = useHabilidades();
  const habilidadesDoCurso = useMemo(() => {
    const ids = new Set(curso?.habilidadeIds ?? []);
    return todasHabilidades.filter((h) => ids.has(h.id));
  }, [todasHabilidades, curso]);

  /** Recalcula `fim` baseado em `inicio + turnoMin` do curso. */
  const ajustarFim = useMemo(
    () =>
      (slot: Pick<HorarioSlot, "inicio" | "fim" | "diaSemana">): HorarioSlot => ({
        ...slot,
        fim: turnoMin > 0 ? addMinutesToHHMM(slot.inicio, turnoMin) : slot.fim,
      }),
    [turnoMin],
  );

  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setCod(editing?.cod ?? "");
    setData(editing?.data ?? "");
    // Cada `horario` é um ENCONTRO (turno do curso, ex: 2h30).
    // Dentro de cada encontro, o calendário renderiza N sub-blocos (slots/aulas).
    // ajustarFim garante que `fim = inicio + turnoMin` (respeitando turno do curso).
    const base = editing?.horarios ?? [];
    setHorarios(turnoMin > 0 ? base.map(ajustarFim) : base);
    setDescricao(editing?.descricao ?? "");
  }, [open, editing, turnoMin, ajustarFim]);

  const addHorario = () => {
    const novo: HorarioSlot = ajustarFim({
      diaSemana: "seg",
      inicio: "08:00",
      fim: "09:00",
    });
    setHorarios((prev) => [...prev, novo]);
  };

  const updateHorario = (i: number, patch: Partial<HorarioSlot>) =>
    setHorarios((prev) =>
      prev.map((h, idx) => {
        if (idx !== i) return h;
        const merged = { ...h, ...patch };
        // Se mudou início, recalcula fim.
        if (patch.inicio !== undefined && turnoMin > 0) {
          merged.fim = addMinutesToHHMM(merged.inicio, turnoMin);
        }
        return merged;
      }),
    );

  const removeHorario = (i: number) => setHorarios((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoOk) {
      toast.error("Defina o 'Turno diário' do curso antes de cadastrar turmas.");
      return;
    }
    if (!nome.trim() || !cod.trim()) {
      toast.error("Nome e Cod são obrigatórios.");
      return;
    }
    if (horarios.some((h) => !h.inicio)) {
      toast.error("Preencha o horário de início de todos os slots.");
      return;
    }
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      cursoId,
      nome: nome.trim(),
      cod: cod.trim().toUpperCase(),
      data: data || new Date().toISOString().slice(0, 10),
      horarios: horarios.map(ajustarFim),
      alunosIds: editing?.alunosIds ?? [],
      descricao: descricao.trim() || undefined,
    });
    toast.success(editing ? "Turma atualizada!" : "Turma criada!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Turma" : "Nova Turma"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!cursoOk && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              ⚠️ Este curso ainda não tem o <strong>Turno diário</strong> definido. Edite o curso e
              configure o turno antes de criar turmas.
            </div>
          )}
          {cursoOk && (
            <div className="rounded-md border bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-2">
              <div>
                Turno: <strong>{formatMinutos(turnoMin)}</strong> ·{" "}
                <strong>{blocosDia} aula(s)</strong> de <strong>{formatMinutos(aulaMin)}</strong>
                {cargaTotal > 0 && (
                  <>
                    {" "}
                    · Carga total: <strong>{formatMinutos(cargaTotal)}</strong>
                  </>
                )}
              </div>
              {habilidadesDoCurso.length > 0 && (
                <div>
                  <span className="inline-flex items-center gap-1 mb-1">
                    <Star className="h-3 w-3" /> Habilidades do curso:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {habilidadesDoCurso.map((h) => (
                      <Badge
                        key={h.id}
                        variant="secondary"
                        className="text-[10px] font-normal"
                        title={h.descricao}
                      >
                        {h.sigla}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Nome *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Design 2026/A"
              />
            </div>
            <div className="space-y-2">
              <Label>Cod *</Label>
              <Input
                value={cod}
                onChange={(e) => setCod(e.target.value)}
                placeholder="Ex.: DSG-26A"
                maxLength={12}
              />
            </div>
            <div className="space-y-2">
              <Label>Data início</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>

            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label>Horários semanais</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addHorario}
                  disabled={!cursoOk}
                >
                  <Plus /> Adicionar
                </Button>
              </div>
              {horarios.length === 0 ? (
                <p className="text-xs text-muted-foreground border rounded-md p-3 text-center">
                  Nenhum horário cadastrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {horarios.map((h, i) => (
                    <div key={i} className="flex items-end gap-2 rounded-md border p-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <Label className="text-[10px] uppercase text-muted-foreground">Dia</Label>
                        <Select
                          value={h.diaSemana}
                          onValueChange={(v) => updateHorario(i, { diaSemana: v as DiaSemana })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIAS_SEMANA.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          Início
                        </Label>
                        <Input
                          type="time"
                          value={h.inicio}
                          onChange={(e) => updateHorario(i, { inicio: e.target.value })}
                          className="w-[110px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          Fim (auto)
                        </Label>
                        <Input
                          type="time"
                          value={h.fim}
                          readOnly
                          disabled
                          className="w-[110px] bg-muted/50"
                          title={`Calculado: início + ${formatMinutos(turnoMin)}`}
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeHorario(i)}
                        aria-label="Remover horário"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!cursoOk}>
              💾 Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
