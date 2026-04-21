// Exportador consolidado de dados do app para análise externa.
// Gera um JSON único com tudo que o coordenador pode usar para
// montar relatórios futuros: cursos, turmas, alunos, atividades,
// agendamentos, notificações e avaliações enviadas pelos alunos.

import {
  SEED_CURSOS,
  SEED_TURMAS,
  SEED_ATIVIDADES,
  SEED_GRUPOS,
} from "./academic-seed";
import { alunosStore } from "./alunos-store";
import { agendamentosStore } from "./agendamentos-store";
import { notificacoesStore } from "./notificacoes-store";
import { avaliacoesStore } from "./avaliacoes-store";
import { computeSlotEstado } from "./academic-types";

export interface ExportPayload {
  meta: {
    geradoEm: string;
    versao: 1;
    app: "academia-flow";
  };
  cursos: typeof SEED_CURSOS;
  grupos: typeof SEED_GRUPOS;
  turmas: typeof SEED_TURMAS;
  atividades: typeof SEED_ATIVIDADES;
  alunos: ReturnType<typeof alunosStore.getAll>;
  agendamentos: Array<
    ReturnType<typeof agendamentosStore.getAll>[number] & {
      estadoAtual: ReturnType<typeof computeSlotEstado>;
    }
  >;
  notificacoes: ReturnType<typeof notificacoesStore.getAll>;
  avaliacoes: ReturnType<typeof avaliacoesStore.getAll>;
}

export function buildExportPayload(): ExportPayload {
  const now = new Date();
  const ags = agendamentosStore.getAll().map((a) => ({
    ...a,
    estadoAtual: computeSlotEstado(a.data, a.fim, a, now),
  }));

  return {
    meta: {
      geradoEm: now.toISOString(),
      versao: 1,
      app: "academia-flow",
    },
    cursos: SEED_CURSOS,
    grupos: SEED_GRUPOS,
    turmas: SEED_TURMAS,
    atividades: SEED_ATIVIDADES,
    alunos: alunosStore.getAll(),
    agendamentos: ags,
    notificacoes: notificacoesStore.getAll(),
    avaliacoes: avaliacoesStore.getAll(),
  };
}

/** Dispara download no navegador com um JSON minificado (menor tamanho).
 *  Também registra o relatório no histórico (relatoriosStore). */
export function downloadExportJSON(opts?: {
  geradoPorUserId?: string;
  geradoPorNome?: string;
}) {
  const payload = buildExportPayload();
  const json = JSON.stringify(payload); // sem indentação → menor
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `academia-flow-${ts}.json`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Registra no histórico de relatórios
  // Import dinâmico evita ciclo de dependências em SSR.
  import("./relatorios-store").then(({ relatoriosStore }) => {
    relatoriosStore.add({
      id: crypto.randomUUID(),
      tipo: "export_completo",
      titulo: "Exportação completa do sistema",
      geradoEm: payload.meta.geradoEm,
      geradoPorUserId: opts?.geradoPorUserId,
      geradoPorNome: opts?.geradoPorNome,
      formato: "json",
      sizeBytes: blob.size,
      filename,
      conteudo: json,
    });
  });

  return { sizeBytes: blob.size, filename };
}

