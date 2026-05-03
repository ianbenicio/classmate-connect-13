// =====================================================================
// CheckInRapidoCard — Frequência rápida das aulas de hoje (#10)
// =====================================================================
// Exibe aulas com status='agendado' cuja data === hoje. Para cada aula,
// lista os alunos da turma com botões P (presente) / F (falta).
//
// Comportamento:
// - Click salva incrementalmente via avaliacoesStore.marcarPresenca
// - Estado local mantém o que foi marcado nesta sessão
// - Estado inicial vem de aluno.aulas (sincronizado com tabela presencas)
// - Mostra contador "X/N marcados"
//
// Visibilidade:
// - Staff (admin/coord): vê todas as aulas de hoje
// - Professor: vê só as aulas onde o nome dele bate com ag.professor
// - Aluno/viewer: não renderiza (return null)

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Check, X as XIcon, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAlunos } from "@/lib/alunos-store";
import { useTurmas } from "@/lib/turmas-store";
import { avaliacoesStore } from "@/lib/avaliacoes-store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Agendamento, Aluno } from "@/lib/academic-types";
import { toast } from "sonner";

export function CheckInRapidoCard() {
  const { displayName, hasRole } = useAuth();
  const agendamentos = useAgendamentos();
  const alunos = useAlunos();
  const turmas = useTurmas();

  const isStaff = hasRole("admin") || hasRole("coordenacao");
  const isProfessor = hasRole("professor");

  const aulasHoje = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let lista = agendamentos.filter(
      (ag) => ag.status === "pendente" && ag.data === todayKey,
    );
    // Se for só professor (não staff), filtra pelas aulas dele
    if (!isStaff && isProfessor && displayName) {
      const myKey = displayName.trim().toLowerCase();
      lista = lista.filter(
        (ag) => ag.professor?.trim().toLowerCase() === myKey,
      );
    }
    return lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [agendamentos, isStaff, isProfessor, displayName]);

  // Early returns (DEPOIS de todos os hooks)
  if (!isStaff && !isProfessor) return null; // alunos/viewers
  if (aulasHoje.length === 0) return null; // sem aulas hoje, não polui

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Aulas de hoje — Check-in rápido
          <Badge variant="secondary" className="text-[10px]">
            {aulasHoje.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Marque presença ou falta direto. Cada clique salva.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {aulasHoje.map((ag) => (
          <AulaRow
            key={ag.id}
            agendamento={ag}
            alunos={alunos.filter((a) => a.turmaId === ag.turmaId)}
            turmaNome={
              turmas.find((t) => t.id === ag.turmaId)?.nome ??
              ag.turmaId.slice(0, 8)
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Linha de uma aula — colapsável
// ---------------------------------------------------------------------
function AulaRow({
  agendamento,
  alunos,
  turmaNome,
}: {
  agendamento: Agendamento;
  alunos: Aluno[];
  turmaNome: string;
}) {
  const [open, setOpen] = useState(false);
  // Estado local: alunoId -> "p" | "f" | undefined
  // undefined = não marcado nesta sessão. Inicia lendo aluno.aulas (banco).
  const [marcas, setMarcas] = useState<Record<string, "p" | "f">>(() => {
    const out: Record<string, "p" | "f"> = {};
    for (const a of alunos) {
      // Pega qualquer registro de aulas que case com uma das atividades
      // do agendamento. Se houver `presente=true`, marca P; se houver
      // `presente=false`, marca F. Se não houver registro, fica undefined.
      const aIds = new Set(agendamento.atividadeIds);
      const reg = a.aulas.find((r) => aIds.has(r.atividadeId));
      if (reg) {
        out[a.id] = reg.presente ? "p" : "f";
      }
    }
    return out;
  });
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});

  const marcar = async (alunoId: string, status: "p" | "f") => {
    // Optimistic — atualiza UI antes de salvar
    setMarcas((prev) => ({ ...prev, [alunoId]: status }));
    setSalvando((prev) => ({ ...prev, [alunoId]: true }));
    try {
      await avaliacoesStore.marcarPresenca(
        agendamento.id,
        alunoId,
        status === "p",
      );
    } catch (e) {
      toast.error("Erro ao salvar presença");
      // Reverte
      setMarcas((prev) => {
        const copy = { ...prev };
        delete copy[alunoId];
        return copy;
      });
    } finally {
      setSalvando((prev) => {
        const copy = { ...prev };
        delete copy[alunoId];
        return copy;
      });
    }
  };

  const totalMarcados = Object.keys(marcas).length;
  const semAtividades = agendamento.atividadeIds.length === 0;

  let dataLabel = agendamento.data;
  try {
    dataLabel = format(parseISO(agendamento.data), "dd/MM", { locale: ptBR });
  } catch {
    /* keep raw */
  }

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{turmaNome}</span>
            <span className="text-xs text-muted-foreground">
              {dataLabel} · {agendamento.inicio}–{agendamento.fim}
            </span>
            {agendamento.professor && (
              <span className="text-xs text-muted-foreground">
                · {agendamento.professor}
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {totalMarcados}/{alunos.length}
        </Badge>
      </button>

      {open && (
        <div className="border-t px-3 py-2 space-y-1 bg-muted/10">
          {semAtividades && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
              ⚠ Esta aula não tem atividades cadastradas. Adicione atividades
              antes de marcar presença (presença é por atividade × aluno).
            </p>
          )}
          {alunos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Sem alunos na turma.
            </p>
          ) : (
            <ul className="divide-y">
              {alunos.map((a) => {
                const m = marcas[a.id];
                const sav = salvando[a.id];
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 py-1.5 text-sm"
                  >
                    <span className="flex-1 truncate">{a.nome}</span>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant={m === "p" ? "default" : "outline"}
                        className={cn(
                          "h-7 px-2",
                          m === "p" &&
                            "bg-emerald-500 hover:bg-emerald-600 text-white",
                        )}
                        disabled={sav || semAtividades}
                        onClick={() => marcar(a.id, "p")}
                        title="Presente"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant={m === "f" ? "destructive" : "outline"}
                        className="h-7 px-2"
                        disabled={sav || semAtividades}
                        onClick={() => marcar(a.id, "f")}
                        title="Falta"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
