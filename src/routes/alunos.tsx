import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GraduationCap, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { SEED_CURSOS, SEED_TURMAS } from "@/lib/academic-seed";
import { alunosStore, useAlunos } from "@/lib/alunos-store";
import { AlunoFormDialog } from "@/components/academic/AlunoFormDialog";
import type { Aluno } from "@/lib/academic-types";
import { toast } from "sonner";

export const Route = createFileRoute("/alunos")({
  head: () => ({
    meta: [
      { title: "Alunos — Sistema Acadêmico" },
      {
        name: "description",
        content:
          "Listagem completa de alunos com filtros por curso e turma, edição e remoção.",
      },
      { property: "og:title", content: "Alunos — Sistema Acadêmico" },
      {
        property: "og:description",
        content:
          "Gerencie alunos: filtre por curso e turma, edite ou remova cadastros.",
      },
    ],
  }),
  component: AlunosPage,
});

function AlunosPage() {
  const alunos = useAlunos();
  const cursos = SEED_CURSOS;
  const turmas = SEED_TURMAS;

  const [busca, setBusca] = useState("");
  const [cursoFiltro, setCursoFiltro] = useState<string>("todos");
  const [turmaFiltro, setTurmaFiltro] = useState<string>("todas");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Aluno | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<Aluno | null>(null);

  const cursoMap = useMemo(
    () => new Map(cursos.map((c) => [c.id, c])),
    [cursos],
  );
  const turmaMap = useMemo(
    () => new Map(turmas.map((t) => [t.id, t])),
    [turmas],
  );

  const turmasDisponiveis = useMemo(
    () =>
      cursoFiltro === "todos"
        ? turmas
        : turmas.filter((t) => t.cursoId === cursoFiltro),
    [cursoFiltro, turmas],
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alunos.filter((a) => {
      if (cursoFiltro !== "todos" && a.cursoId !== cursoFiltro) return false;
      if (turmaFiltro !== "todas" && a.turmaId !== turmaFiltro) return false;
      if (!q) return true;
      return (
        a.nome.toLowerCase().includes(q) ||
        a.contato.toLowerCase().includes(q) ||
        (a.cpf ?? "").toLowerCase().includes(q) ||
        (a.responsavel ?? "").toLowerCase().includes(q)
      );
    });
  }, [alunos, busca, cursoFiltro, turmaFiltro]);

  const handleSave = (a: Aluno) => {
    const exists = alunos.some((x) => x.id === a.id);
    if (exists) alunosStore.update(a.id, a);
    else alunosStore.add(a);
  };

  const handleDelete = (a: Aluno) => {
    alunosStore.remove(a.id);
    toast.success(`Aluno ${a.nome} removido`);
    setConfirmDelete(null);
  };

  const limparFiltros = () => {
    setBusca("");
    setCursoFiltro("todos");
    setTurmaFiltro("todas");
  };

  const filtrosAtivos =
    busca.trim() !== "" ||
    cursoFiltro !== "todos" ||
    turmaFiltro !== "todas";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight inline-flex items-center gap-2">
              <GraduationCap className="h-7 w-7" />
              Alunos
            </h1>
            <p className="text-muted-foreground mt-1">
              {alunos.length} alunos cadastrados
              {filtrosAtivos && ` · ${filtrados.length} no filtro atual`}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo aluno
          </Button>
        </header>

        {/* Filtros */}
        <div className="bg-card border rounded-lg p-3 mb-4 flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, contato, CPF…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="min-w-[180px]">
            <Select
              value={cursoFiltro}
              onValueChange={(v) => {
                setCursoFiltro(v);
                setTurmaFiltro("todas");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cursos</SelectItem>
                {cursos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.cod} — {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as turmas</SelectItem>
                {turmasDisponiveis.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.cod} — {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtrosAtivos && (
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Curso</TableHead>
                <TableHead className="hidden md:table-cell">Turma</TableHead>
                <TableHead className="hidden lg:table-cell">Contato</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Responsável
                </TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    {filtrosAtivos
                      ? "Nenhum aluno corresponde aos filtros."
                      : "Nenhum aluno cadastrado."}
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((a) => {
                  const curso = cursoMap.get(a.cursoId);
                  const turma = turmaMap.get(a.turmaId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.nome}</div>
                        {a.idade != null && (
                          <div className="text-xs text-muted-foreground">
                            {a.idade} anos
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {curso ? (
                          <Badge variant="outline" className="font-mono">
                            {curso.cod}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {turma ? (
                          <span className="text-sm">{turma.cod}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {a.contato || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {a.responsavel || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(a);
                              setFormOpen(true);
                            }}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDelete(a)}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlunoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        cursos={cursos}
        turmas={turmas}
        onSave={handleSave}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              O aluno <strong>{confirmDelete?.nome}</strong> será removido
              permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
