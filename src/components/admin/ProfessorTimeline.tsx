// =====================================================================
// ProfessorTimeline — linha do tempo cronológica de eventos do professor
// =====================================================================
// Simétrico ao AlunoTimeline, mas pra eventos do professor:
// - Aulas concluídas dele
// - Avaliações recebidas (com avaliador tipo)
// - Tags ganhas

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Star, MessageSquare } from "lucide-react";
import type { Agendamento } from "@/lib/academic-types";
import type { Professor, ProfessorAvaliacao } from "@/lib/professores-store";

type Evento = {
  id: string;
  data: Date;
  tipo: "aula" | "avaliacao" | "tag";
  titulo: string;
  detalhe?: string;
};

const AVALIADOR_LABEL: Record<string, string> = {
  aluno: "aluno",
  coordenacao: "coordenação",
  admin: "admin",
  autoavaliacao: "auto-avaliação",
};

interface Props {
  professor: Professor;
  agendamentos: Agendamento[];
  avaliacoes: ProfessorAvaliacao[];
}

export function ProfessorTimeline({ professor, agendamentos, avaliacoes }: Props) {
  const eventos = useMemo<Evento[]>(() => {
    const profKey = professor.nome.trim().toLowerCase();
    const out: Evento[] = [];

    // Aulas concluídas
    for (const ag of agendamentos) {
      if (ag.status !== "concluido") continue;
      const isProf =
        ag.professorUserId === professor.userId || ag.professor?.trim().toLowerCase() === profKey;
      if (!isProf) continue;
      let d: Date | null = null;
      try {
        d = parseISO(ag.data);
      } catch {
        continue;
      }
      out.push({
        id: `aula-${ag.id}`,
        data: d,
        tipo: "aula",
        titulo: `Aula concluída · ${ag.inicio}–${ag.fim}`,
      });
    }

    // Avaliações recebidas
    for (const av of avaliacoes) {
      if (av.professorId !== professor.id) continue;
      let d: Date | null = null;
      try {
        d = parseISO(av.criadoEm);
      } catch {
        continue;
      }
      const fonte = AVALIADOR_LABEL[av.avaliadorTipo] ?? av.avaliadorTipo;
      const criterios = Object.keys(av.notas ?? {}).length;
      const tagsCount = (av.tags ?? []).length;
      const detalhes: string[] = [];
      if (criterios > 0) detalhes.push(`${criterios} critério(s)`);
      if (tagsCount > 0) detalhes.push(`${tagsCount} tag(s)`);
      if (av.comentario) detalhes.push("comentário");
      out.push({
        id: `aval-${av.id}`,
        data: d,
        tipo: "avaliacao",
        titulo: `Avaliação recebida — ${fonte}`,
        detalhe: detalhes.length > 0 ? detalhes.join(" · ") : undefined,
      });
    }

    return out.sort((a, b) => b.data.getTime() - a.data.getTime());
  }, [professor, agendamentos, avaliacoes]);

  if (eventos.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sem eventos registrados ainda.</p>;
  }

  return (
    <ol className="relative border-l border-border pl-4 space-y-3 max-h-80 overflow-y-auto">
      {eventos.slice(0, 50).map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
          <div className="flex items-center gap-2 flex-wrap">
            <TipoIcon tipo={e.tipo} />
            <span className="text-xs font-medium">{e.titulo}</span>
            <Badge variant="outline" className="text-[10px]">
              {format(e.data, "dd/MM/yy HH:mm", { locale: ptBR })}
            </Badge>
          </div>
          {e.detalhe && <p className="text-[11px] text-muted-foreground mt-0.5">{e.detalhe}</p>}
        </li>
      ))}
      {eventos.length > 50 && (
        <li className="text-[10px] text-muted-foreground italic pl-1">
          + {eventos.length - 50} evento(s) anterior(es).
        </li>
      )}
    </ol>
  );
}

function TipoIcon({ tipo }: { tipo: Evento["tipo"] }) {
  const className = "h-3.5 w-3.5";
  switch (tipo) {
    case "aula":
      return <CalendarCheck className={`${className} text-emerald-500`} />;
    case "avaliacao":
      return <Star className={`${className} text-amber-500`} />;
    case "tag":
      return <MessageSquare className={`${className} text-blue-500`} />;
  }
}
