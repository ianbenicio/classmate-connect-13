import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Download,
  FileText,
  Trash2,
  ShieldCheck,
  ArrowLeft,
  Database,
  FileArchive,
  Loader2,
  ClipboardList,
  Users,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import { UsersManagerDialog } from "@/components/admin/UsersManagerDialog";
import { ProfessoresManagerDialog } from "@/components/admin/ProfessoresManagerDialog";
import { DashboardKPIs } from "@/components/admin/DashboardKPIs";
import { AlertasInteligentes } from "@/components/admin/AlertasInteligentes";
import { CheckInRapidoCard } from "@/components/admin/CheckInRapidoCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  downloadRelatorio,
  relatoriosStore,
  useRelatorios,
  type RelatorioTipo,
  RELATORIO_TIPO_LABEL,
} from "@/lib/relatorios-store";
import { downloadExportJSON } from "@/lib/data-export";
import { downloadDbJSON, downloadDbCSVZip } from "@/lib/db-export";
import { toast } from "sonner";

export const Route = createFileRoute("/coordenacao")({
  component: CoordenacaoPage,
});

const TIPO_BADGE: Record<RelatorioTipo, string> = {
  export_completo: "bg-primary/15 text-primary",
  avaliacoes: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  frequencia: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  outro: "bg-muted text-muted-foreground",
};

function CoordenacaoPage() {
  // Se uma rota filha (ex.: /coordenacao/relatorios/extrato-horas-p) estiver
  // ativa, renderiza apenas o Outlet. Caso contrário, mostra o dashboard.
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }
  return <CoordenacaoDashboard />;
}

function CoordenacaoDashboard() {
  const { user: authUser, roles, hasRole, displayName } = useAuth();
  const relatorios = useRelatorios();
  const [filtro, setFiltro] = useState<"all" | RelatorioTipo>("all");
  const [exportandoJson, setExportandoJson] = useState(false);
  const [exportandoCsv, setExportandoCsv] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [professoresOpen, setProfessoresOpen] = useState(false);

  const canAccess = hasRole("admin") || hasRole("coordenacao");
  const isAdmin = hasRole("admin");
  const userNome =
    displayName || (authUser?.user_metadata?.name as string | undefined) || authUser?.email || "—";

  // Hooks DEVEM vir antes de qualquer early return (Rules of Hooks).
  const tiposPresentes = useMemo(() => {
    const set = new Set<RelatorioTipo>();
    for (const r of relatorios) set.add(r.tipo);
    return Array.from(set);
  }, [relatorios]);

  const grupos = useMemo(() => {
    const filtrados = relatorios.filter((r) => filtro === "all" || r.tipo === filtro);
    // Agrupa por tipo
    const byTipo = new Map<RelatorioTipo, typeof relatorios>();
    for (const r of filtrados) {
      const arr = byTipo.get(r.tipo) ?? [];
      arr.push(r);
      byTipo.set(r.tipo, arr);
    }
    // Ordena cada grupo por data desc
    for (const arr of byTipo.values()) {
      arr.sort((a, b) => b.geradoEm.localeCompare(a.geradoEm));
    }
    // Ordena os tipos pelo relatório mais recente
    return Array.from(byTipo.entries()).sort(([, a], [, b]) =>
      b[0].geradoEm.localeCompare(a[0].geradoEm),
    );
  }, [relatorios, filtro]);

  if (!canAccess) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Acesso restrito
            </CardTitle>
            <CardDescription>
              Esta área é exclusiva para usuários com perfil <b>Admin</b> ou <b>Coordenação</b>.
              Você está logado como <b>{userNome}</b>
              {roles.length > 0 && ` (${roles.join(", ")})`}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft /> Voltar ao painel
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const handleGerarAgora = async () => {
    const { sizeBytes, filename } = await downloadExportJSON({
      geradoPorUserId: authUser?.id,
      geradoPorNome: userNome,
    });
    toast.success(`Relatório gerado: ${filename}`, {
      description: `${(sizeBytes / 1024).toFixed(1)} KB`,
    });
  };

  const handleExportDbJson = async () => {
    setExportandoJson(true);
    try {
      const { filename, sizeBytes, payload } = await downloadDbJSON();
      const total = Object.values(payload.contagens).reduce((s, n) => s + n, 0);
      toast.success(`Banco exportado: ${filename}`, {
        description: `${total} registros · ${(sizeBytes / 1024).toFixed(1)} KB`,
      });
    } catch (e) {
      toast.error("Falha ao exportar banco", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExportandoJson(false);
    }
  };

  const handleExportDbCsv = async () => {
    setExportandoCsv(true);
    try {
      const { filename, sizeBytes, payload } = await downloadDbCSVZip();
      const total = Object.values(payload.contagens).reduce((s, n) => s + n, 0);
      toast.success(`CSVs exportados: ${filename}`, {
        description: `${total} registros · ${(sizeBytes / 1024).toFixed(1)} KB`,
      });
    } catch (e) {
      toast.error("Falha ao exportar CSVs", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExportandoCsv(false);
    }
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Coordenação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico de relatórios gerados pelo sistema.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleGerarAgora} variant="outline">
            <FileText /> Snapshot do app (seed)
          </Button>
          <Button onClick={handleExportDbJson} disabled={exportandoJson || exportandoCsv}>
            {exportandoJson ? <Loader2 className="animate-spin" /> : <Database />}
            Exportar banco (JSON)
          </Button>
          <Button
            onClick={handleExportDbCsv}
            disabled={exportandoJson || exportandoCsv}
            variant="secondary"
          >
            {exportandoCsv ? <Loader2 className="animate-spin" /> : <FileArchive />}
            Exportar banco (CSV .zip)
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visão geral</CardTitle>
          <CardDescription className="text-xs">Hoje, esta semana e o mês corrente.</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardKPIs />
        </CardContent>
      </Card>

      <CheckInRapidoCard />

      <AlertasInteligentes />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Atalhos administrativos</CardTitle>
          <CardDescription className="text-xs">
            Áreas restritas a coordenação e admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/formularios">
              <ClipboardList /> Formulários
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/coordenacao/relatorios/extrato-horas-p">
              <BarChart3 /> Extrato de Horas
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/coordenacao/relatorios/comparativo-turmas">
              <BarChart3 /> Comparativo de Turmas
            </Link>
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => setUsersOpen(true)}>
              <Users /> Usuários
            </Button>
          )}
          <Button variant="outline" onClick={() => setProfessoresOpen(true)}>
            <GraduationCap /> Professores
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sobre as exportações</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            <strong>Banco (JSON / CSV):</strong> snapshot ao vivo do Lovable Cloud — todas as
            tabelas (cursos, turmas, alunos, atividades, agendamentos, avaliações, relatórios,
            notificações, habilidades). Use o JSON para reimportar em outro sistema; o ZIP de CSVs
            para abrir no Excel/Sheets/DuckDB. <strong>Snapshot do app:</strong> dados em memória do
            seed — útil só como backup do estado da sessão.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Relatórios</CardTitle>
            <CardDescription>
              {relatorios.length === 0
                ? "Nenhum relatório gerado ainda."
                : `${relatorios.length} no total — classificados por tipo, ordenados por data.`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Todos os tipos</SelectItem>
                {tiposPresentes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {RELATORIO_TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {relatorios.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  if (confirm("Limpar todo o histórico de relatórios?")) {
                    relatoriosStore.clear();
                    toast.success("Histórico limpo.");
                  }
                }}
              >
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-lg p-8 text-center">
              {relatorios.length === 0
                ? "Clique em “Gerar exportação completa” para criar o primeiro relatório."
                : "Nenhum relatório para o filtro selecionado."}
            </p>
          ) : (
            <div className="space-y-6">
              {grupos.map(([tipo, items]) => (
                <section key={tipo} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={TIPO_BADGE[tipo]} variant="secondary">
                      {RELATORIO_TIPO_LABEL[tipo]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? "relatório" : "relatórios"}
                    </span>
                  </div>
                  <ul className="divide-y border rounded-lg">
                    {items.map((r) => (
                      <li
                        key={r.id}
                        className="p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.titulo}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(r.geradoEm), "PPp", { locale: ptBR })}
                            {r.geradoPorNome && ` · ${r.geradoPorNome}`}
                            {" · "}
                            {(r.sizeBytes / 1024).toFixed(1)} KB · {r.formato.toUpperCase()}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => downloadRelatorio(r)}>
                          <Download /> Baixar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Remover"
                          onClick={() => relatoriosStore.remove(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && <UsersManagerDialog open={usersOpen} onOpenChange={setUsersOpen} />}
      <ProfessoresManagerDialog open={professoresOpen} onOpenChange={setProfessoresOpen} />
    </main>
  );
}
