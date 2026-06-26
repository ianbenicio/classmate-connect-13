import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PendenciaKind } from "./pendencias";

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

function vazio(): ResumoPendencias {
  return { critical: 0, urgent: 0, warning: 0, info: 0 };
}

function normalizarResumo(raw: unknown): ResumoPendencias {
  if (!raw || typeof raw !== "object") return vazio();
  const obj = raw as Record<string, unknown>;
  return {
    critical: Number(obj.critical ?? 0),
    urgent: Number(obj.urgent ?? 0),
    warning: Number(obj.warning ?? 0),
    info: Number(obj.info ?? 0),
  };
}

interface UsePendenciasDerivadasOptions {
  enabled?: boolean;
  listar?: boolean;
}

/**
 * Pendências derivadas do usuário, sem persistência.
 * Fonte primária: RPC `get_pendencias` (server-truth, RLS multi-tenant).
 * O badge usa apenas `get_pendencias_resumo`; a lista completa só é buscada
 * quando `listar=true`. Não há fallback client-side aqui: carregar stores
 * inteiros no header reabre o problema de 503 por excesso de consultas.
 * Ver docs/design/notificacoes-arquitetura.md.
 */
export function usePendenciasDerivadas(options: UsePendenciasDerivadasOptions = {}): {
  pendencias: PendenciaDerivada[];
  resumo: ResumoPendencias;
  loading: boolean;
  fonte: "rpc" | "client";
} {
  const { enabled = true, listar = true } = options;
  const [pendencias, setPendencias] = useState<PendenciaDerivada[]>([]);
  const [resumo, setResumo] = useState<ResumoPendencias>(vazio);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setPendencias([]);
      setResumo(vazio());
      return;
    }

    let cancel = false;
    const fetchRpc = async () => {
      setLoading(true);
      // Os nomes das RPCs ainda não estão nos tipos gerados do Supabase.
      const [resumoResp, listaResp] = await Promise.all([
        supabase.rpc("get_pendencias_resumo" as never),
        listar ? supabase.rpc("get_pendencias" as never) : Promise.resolve(null),
      ]);
      if (cancel) return;

      if (resumoResp.error) {
        console.error("[pendencias] resumo rpc error", resumoResp.error);
        setResumo(vazio());
      } else {
        setResumo(normalizarResumo(resumoResp.data));
      }

      if (listar && listaResp) {
        if (listaResp.error) {
          console.error("[pendencias] lista rpc error", listaResp.error);
          setPendencias([]);
        } else {
          const rows = ((listaResp.data as unknown as RpcRow[] | null) ?? []).map((r) => ({
            agendamentoId: r.agendamento_id,
            kind: r.kind as PendenciaKind,
            severidade: r.severidade as Severidade,
            data: r.data,
            inicio: r.inicio,
            fim: r.fim,
            professor: r.professor,
          }));
          setPendencias(rows);
        }
      } else {
        setPendencias([]);
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
  }, [enabled, listar]);

  return { pendencias, resumo, loading, fonte: "rpc" };
}
