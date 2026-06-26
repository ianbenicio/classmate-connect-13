import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgendamentos } from "./agendamentos-store";
import { useAulaEvidencias } from "./aula-evidencias-store";
import { calcularPendencias, type Pendencia, type PendenciaKind } from "./pendencias";

export type Severidade = "critical" | "urgent" | "warning" | "info";

export interface PendenciaDerivada {
  agendamentoId: string;
  kind: PendenciaKind;
  severidade: Severidade;
  data: string;
  inicio: string;
  fim: string;
  professor: string | null;
}

export interface ResumoPendencias {
  critical: number;
  urgent: number;
  warning: number;
  info: number;
}

interface RpcRow {
  agendamento_id: string;
  kind: string;
  severidade: string;
  data: string;
  inicio: string;
  fim: string;
  professor: string | null;
}

// Mapa de severidade — espelha a migration F3 (get_pendencias).
function severidadeDe(p: Pendencia, now: Date): Severidade {
  if (p.kind === "expirado") return "critical";
  if (p.kind === "atrasado") return "urgent";
  // plano_pendente: urgent quando o dia da aula já chegou (BRT), senão warning.
  const diaAula = new Date(`${p.agendamento.data}T00:00:00-03:00`);
  return now >= diaAula ? "urgent" : "warning";
}

function vazio(): ResumoPendencias {
  return { critical: 0, urgent: 0, warning: 0, info: 0 };
}

/**
 * Pendências derivadas do usuário, sem persistência.
 * Fonte primária: RPC `get_pendencias` (server-truth, RLS multi-tenant).
 * Fallback: `calcularPendencias` client-side (stores já carregados) se a RPC
 * falhar. Sem polling — refaz no mount e ao focar a aba.
 * Ver docs/design/notificacoes-arquitetura.md.
 */
export function usePendenciasDerivadas(): {
  pendencias: PendenciaDerivada[];
  resumo: ResumoPendencias;
  loading: boolean;
  fonte: "rpc" | "client";
} {
  const agendamentos = useAgendamentos();
  const evidencias = useAulaEvidencias();
  const [rpc, setRpc] = useState<PendenciaDerivada[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    const fetchRpc = async () => {
      // O nome da RPC ainda não está nos tipos gerados do Supabase (regenerar
      // com `supabase gen types` após o merge da migration F3).
      const { data, error } = await supabase.rpc("get_pendencias" as never);
      if (cancel) return;
      const rows = (data as unknown as RpcRow[] | null) ?? null;
      if (error || !rows) {
        setRpc(null); // cai pro fallback client
      } else {
        setRpc(
          rows.map((r) => ({
            agendamentoId: r.agendamento_id,
            kind: r.kind as PendenciaKind,
            severidade: r.severidade as Severidade,
            data: r.data,
            inicio: r.inicio,
            fim: r.fim,
            professor: r.professor,
          })),
        );
      }
      setLoading(false);
    };
    void fetchRpc();
    const onFocus = () => void fetchRpc();
    window.addEventListener("focus", onFocus);
    return () => {
      cancel = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Fallback client (best-effort; a RPC é a fonte autoritativa de escopo).
  const fallback = useMemo<PendenciaDerivada[]>(() => {
    const now = new Date();
    return calcularPendencias({ agendamentos, evidencias, now }).map((p) => ({
      agendamentoId: p.agendamentoId,
      kind: p.kind,
      severidade: severidadeDe(p, now),
      data: p.agendamento.data,
      inicio: p.agendamento.inicio,
      fim: p.agendamento.fim,
      professor: p.agendamento.professor ?? null,
    }));
  }, [agendamentos, evidencias]);

  const pendencias = rpc ?? fallback;
  const fonte: "rpc" | "client" = rpc ? "rpc" : "client";

  const resumo = useMemo<ResumoPendencias>(() => {
    const r = vazio();
    for (const p of pendencias) r[p.severidade]++;
    return r;
  }, [pendencias]);

  return { pendencias, resumo, loading, fonte };
}
