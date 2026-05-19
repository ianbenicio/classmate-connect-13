// =====================================================================
// AuditHistoricoDialog — Histórico de Alterações (A3.3)
// =====================================================================
// Paginação SERVER-SIDE · filtros por ação/entidade/datas/usuário
// Export CSV da página atual ou de todos os registros filtrados.

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAuditPage,
  downloadAuditCsv,
  type AuditEvent,
  type AuditFilter,
  type AuditAction,
  PAGE_SIZE,
} from "@/lib/audit-store";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABELS: Record<AuditAction | "", string> = {
  "": "Todas",
  insert: "Inserção",
  update: "Atualização",
  delete: "Exclusão",
  login: "Login",
  logout: "Logout",
  consent: "Consentimento",
  export: "Exportação",
  custom: "Customizado",
};

const ACTION_BADGE: Record<AuditAction, string> = {
  insert: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  update: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  delete: "bg-red-500/15 text-red-700 dark:text-red-300",
  login: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  logout: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  consent: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  export: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  custom: "bg-muted text-muted-foreground",
};

function fmtTs(ts: string) {
  try {
    return format(new Date(ts), "dd/MM/yy HH:mm", { locale: ptBR });
  } catch {
    return ts;
  }
}

function shortUuid(id: string | null) {
  if (!id) return "—";
  return id.slice(0, 8) + "…";
}

export function AuditHistoricoDialog({ open, onOpenChange }: Props) {
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  // Filtros
  const [action, setAction] = useState<AuditAction | "">("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const buildFilter = useCallback(
    (): AuditFilter => ({
      action: action || undefined,
      entity_type: entityType || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      user_search: userSearch || undefined,
    }),
    [action, entityType, dateFrom, dateTo, userSearch],
  );

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAuditPage(p, buildFilter());
        setRows(result.rows);
        setTotal(result.total);
        setPage(p);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao carregar audit log";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [buildFilter],
  );

  useEffect(() => {
    if (open) void load(0);
  }, [open, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExportPage = () => {
    if (!rows.length) return;
    downloadAuditCsv(rows);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const allRows: AuditEvent[] = [];
      let p = 0;
      const MAX = 5000;
      while (allRows.length < Math.min(total, MAX)) {
        const result = await fetchAuditPage(p, buildFilter());
        allRows.push(...result.rows);
        if (result.rows.length < PAGE_SIZE) break;
        p++;
      }
      downloadAuditCsv(allRows);
    } catch (e) {
      toast.error("Erro ao exportar: " + (e instanceof Error ? e.message : ""));
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription>
            Log auditável de todas as ações sensíveis do sistema.{" "}
            <strong>{total.toLocaleString("pt-BR")}</strong> registros encontrados.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="px-6 py-3 border-b bg-muted/30 flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Ação</span>
            <Select
              value={action}
              onValueChange={(v) => setAction(v as AuditAction | "")}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTION_LABELS) as Array<AuditAction | "">) .map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {ACTION_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Entidade</span>
            <Input
              className="w-32 h-8 text-xs"
              placeholder="alunos, profiles…"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">De</span>
            <Input
              type="date"
              className="w-36 h-8 text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Até</span>
            <Input
              type="date"
              className="w-36 h-8 text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Usuário</span>
            <Input
              className="w-36 h-8 text-xs"
              placeholder="nome ou email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => void load(0)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Filtrar
          </Button>

          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleExportPage}
              disabled={!rows.length || loading}
            >
              <Download className="h-3.5 w-3.5" />
              Página CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => void handleExportAll()}
              disabled={!total || loading || exportingAll}
            >
              {exportingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Tudo CSV
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <ScrollArea className="flex-1 min-h-0">
          {error ? (
            <div className="p-8 text-center text-sm text-destructive">{error}</div>
          ) : loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado com os filtros aplicados.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-32">
                    Data/Hora
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-24">
                    Ação
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-28">
                    Entidade
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-24">
                    ID
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Usuário
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground w-28">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={
                      i % 2 === 0
                        ? "bg-background hover:bg-muted/40"
                        : "bg-muted/20 hover:bg-muted/40"
                    }
                  >
                    <td className="px-4 py-1.5 tabular-nums text-muted-foreground">
                      {fmtTs(r.ts)}
                    </td>
                    <td className="px-4 py-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${ACTION_BADGE[r.action] ?? ACTION_BADGE.custom}`}
                      >
                        {ACTION_LABELS[r.action] ?? r.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-1.5 font-mono">{r.entity_type}</td>
                    <td className="px-4 py-1.5 font-mono text-muted-foreground">
                      {shortUuid(r.entity_id)}
                    </td>
                    <td
                      className="px-4 py-1.5 max-w-[140px] truncate"
                      title={r.user_display ?? ""}
                    >
                      {r.user_display ?? "—"}
                    </td>
                    <td className="px-4 py-1.5 font-mono text-muted-foreground">
                      {r.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>

        {/* Paginação */}
        <div className="px-6 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Página {page + 1} de {totalPages} · {total.toLocaleString("pt-BR")} total
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={page === 0 || loading}
              onClick={() => void load(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => void load(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
