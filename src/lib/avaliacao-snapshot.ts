// Snapshot de contexto congelado no momento do envio da avaliação.
// Garante que relatórios futuros não mudem se cadastros forem editados depois.
import { agendamentosStore } from "./agendamentos-store";
import { turmasStore } from "./turmas-store";
import { cursosStore } from "./cursos-store";
import { atividadesStore } from "./atividades-store";
import { habilidadesStore } from "./habilidades-store";

export interface AvaliacaoSnapshot {
  capturadoEm: string; // ISO
  agendamento?: {
    data: string;
    diaSemana: string;
    inicio: string;
    fim: string;
    professor: string | null;
  };
  turma?: { id: string; cod: string; nome: string };
  curso?: { id: string; cod: string; nome: string };
  atividades?: { id: string; codigo: string; nome: string }[];
  habilidades?: { id: string; sigla: string; nome: string | null; descricao: string }[];
}

/**
 * Constrói um snapshot estável dos dados de contexto da avaliação.
 * Recolhe IDs e descritivos a partir dos stores locais (já carregados).
 */
export function buildAvaliacaoSnapshot(
  agendamentoId: string | null,
  habilidadeIds: string[] = [],
): AvaliacaoSnapshot {
  const snap: AvaliacaoSnapshot = { capturadoEm: new Date().toISOString() };
  if (!agendamentoId) return snap;

  const ag = agendamentosStore
    .getAll()
    .find((g) => g.id === agendamentoId);
  if (!ag) return snap;

  snap.agendamento = {
    data: ag.data,
    diaSemana: ag.diaSemana,
    inicio: ag.inicio,
    fim: ag.fim,
    professor: ag.professor ?? null,
  };

  const turma = turmasStore.getAll().find((t) => t.id === ag.turmaId);
  if (turma) {
    snap.turma = { id: turma.id, cod: turma.cod, nome: turma.nome };
    const curso = cursosStore.getAll().find((c) => c.id === turma.cursoId);
    if (curso) {
      snap.curso = { id: curso.id, cod: curso.cod, nome: curso.nome };
    }
  }

  const ativs = atividadesStore
    .getAll()
    .filter((a) => ag.atividadeIds.includes(a.id));
  if (ativs.length > 0) {
    snap.atividades = ativs.map((a) => ({
      id: a.id,
      codigo: a.codigo,
      nome: a.nome,
    }));
  }

  if (habilidadeIds.length > 0) {
    const todas = habilidadesStore.getAll();
    snap.habilidades = todas
      .filter((h) => habilidadeIds.includes(h.id))
      .map((h) => ({
        id: h.id,
        sigla: h.sigla,
        nome: h.nome ?? null,
        descricao: h.descricao,
      }));
  }
  return snap;
}
