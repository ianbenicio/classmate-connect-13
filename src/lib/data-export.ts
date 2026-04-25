// Exportador consolidado de dados do app para análise externa.
// Gera um JSON único com tudo que o coordenador pode usar para
// montar relatórios futuros: cursos, turmas, alunos, atividades,
// agendamentos, notificações e avaliações enviadas pelos alunos.
//
// Lê tudo dos stores (DB-backed via Supabase). Antes lia direto do
// SEED, o que congelava a exportação no estado inicial e ignorava
// qualquer edição feita no app.

import { cursosStore } from "./cursos-store";
import { gruposStore } from "./grupos-store";
import { turmasStore } from "./turmas-store";
import { atividadesStore } from "./atividades-store";
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
  cursos: ReturnType<typeof cursosStore.getAll>;
  grupos: ReturnType<typeof gruposStore.getByCursoCod>;
  turmas: ReturnType<typeof turmasStore.getAll>;
  atividades: ReturnType<typeof atividadesStore.getAll>;
  alunos: ReturnType<typeof alunosStore.getAll>;
  agendamentos: Array<
    ReturnType<typeof agendamentosStore.getAll>[number] & {
      estadoAtual: ReturnType<typeof computeSlotEstado>;
    }
  >;
  notificacoes: ReturnType<typeof notificacoesStore.getAll>;
  avaliacoes: ReturnType<typeof avaliacoesStore.getAll>;
}

/** Garante que todos os stores estejam inicializados antes de exportar. */
export async function ensureStoresLoaded(): Promise<void> {
  await Promise.all([
    cursosStore.ensureInit(),
    gruposStore.ensureInit(),
    turmasStore.ensureInit(),
    atividadesStore.ensureInit(),
    alunosStore.ensureInit(),
    agendamentosStore.ensureInit(),
    notificacoesStore.ensureInit(),
    avaliacoesStore.ensureInit(),
  ]);
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
    cursos: cursosStore.getAll(),
    grupos: gruposStore.getByCursoCod(),
    turmas: turmasStore.getAll(),
    atividades: atividadesStore.getAll(),
    alunos: alunosStore.getAll(),
    agendamentos: ags,
    notificacoes: notificacoesStore.getAll(),
    avaliacoes: avaliacoesStore.getAll(),
  };
}

/** Dispara download no navegador com um JSON minificado (menor tamanho).
 *  Também registra o relatório no histórico (relatoriosStore). */
export async function downloadExportJSON(opts?: {
  geradoPorUserId?: string;
  geradoPorNome?: string;
}) {
  await ensureStoresLoaded();
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
