// =====================================================================
// ProfessoresManagerDialog — CRUD de professores (Fase 2).
// =====================================================================
// Acessado pela rota /coordenacao. Visível apenas para admin/coordenação
// (a UI já é guardada pelo isAdmin/isCoord no botão da rota; aqui replicamos
// a checagem só por defesa-em-profundidade).
//
// Padrões visuais herdados de TagsManagerDialog/SkillsManagerDialog para
// consistência: lista com filtro, botão "Nova", form inline em outro Dialog,
// AlertDialog de confirmação de exclusão, toggle ativo/desativado.
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Dialog as InnerDialog,
  DialogContent as InnerDialogContent,
  DialogFooter as InnerDialogFooter,
  DialogHeader as InnerDialogHeader,
  DialogTitle as InnerDialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Pencil,
  Trash2,
  Search,
  EyeOff,
  Eye,
  Mail,
  Phone,
  Star,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useHabilidades } from "@/lib/habilidades-store";
import { useAvailableProfessorsUsers, usersStore, useUsers } from "@/lib/users-store";
import {
  professoresStore,
  useProfessores,
  useProfessorAvaliacoes,
  type Professor,
} from "@/lib/professores-store";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { formatMinutos } from "@/lib/academic-types";
import { ProfessorPerfilDialog } from "./ProfessorPerfilDialog";
import { ProfessorAvaliacaoDialog } from "@/components/academic/ProfessorAvaliacaoDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =====================================================================
// Form interno (criar / editar)
// =====================================================================
function ProfessorFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Professor | null;
}) {
  const { user: authUser } = useAuth();
  const habilidades = useHabilidades();
  const availableUsers = useAvailableProfessorsUsers();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [formacao, setFormacao] = useState("");
  const [bio, setBio] = useState("");
  const [cargaHoras, setCargaHoras] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [habilidadesSel, setHabilidadesSel] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setEmail(editing?.email ?? "");
    setTelefone(editing?.telefone ?? "");
    setCpf(editing?.cpf ?? "");
    setFormacao(editing?.formacao ?? "");
    setBio(editing?.bio ?? "");
    // UI usa horas; banco persiste minutos. Convertemos nas duas pontas.
    setCargaHoras(editing ? Math.round(editing.cargaHorariaSemanalMin / 60) : 0);
    setUserId(editing?.userId ?? null);
    setHabilidadesSel(editing?.habilidadesIds ?? []);
  }, [open, editing]);

  const toggleHab = (id: string) => {
    setHabilidadesSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    // Professores devem sempre estar vinculados a um usuário
    if (!userId) {
      toast.error("Professor deve estar vinculado a uma conta de usuário.");
      return;
    }
    const entry: Professor = {
      id: editing?.id ?? crypto.randomUUID(),
      userId: userId ?? null,
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      cpf: cpf.trim() || null,
      formacao: formacao.trim() || null,
      bio: bio.trim() || null,
      fotoUrl: editing?.fotoUrl ?? null,
      cargaHorariaSemanalMin: Math.max(0, Math.round(cargaHoras * 60)),
      habilidadesIds: habilidadesSel,
      ativo: editing?.ativo ?? true,
      criadoEm: editing?.criadoEm ?? new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      criadoPorUserId: editing?.criadoPorUserId ?? authUser?.id ?? null,
    };
    await professoresStore.upsert(entry);
    // Sync reverso: se o professor está vinculado a um usuário, garante que
    // esse usuário tenha o papel "professor" (idempotente).
    if (entry.userId) {
      await usersStore.addRole(entry.userId, "professor");
    }
    toast.success("Professor atualizado.");
    onOpenChange(false);
  };

  return (
    <InnerDialog open={open} onOpenChange={onOpenChange}>
      <InnerDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <InnerDialogHeader>
          <InnerDialogTitle>Editar professor</InnerDialogTitle>
        </InnerDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="prof-nome">Nome *</Label>
            <Input
              id="prof-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-user">Vínculo com usuário (opcional)</Label>
            <Select
              value={userId ?? "__unlinked"}
              onValueChange={(v) => setUserId(v === "__unlinked" ? null : v)}
            >
              <SelectTrigger id="prof-user">
                <SelectValue
                  placeholder={
                    availableUsers.length === 0
                      ? "Sem usuários disponíveis"
                      : "Selecionar usuário..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unlinked">(Sem conta / Desvinculado)</SelectItem>
                {availableUsers.map((u) => (
                  <SelectItem key={u.userId} value={u.userId}>
                    {u.displayName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Vinculação com conta de login para acesso ao sistema.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prof-email">E-mail</Label>
              <Input
                id="prof-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prof@exemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-tel">Telefone</Label>
              <Input
                id="prof-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 9..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prof-cpf">CPF</Label>
              <Input
                id="prof-cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-carga">Carga semanal (h)</Label>
              <Input
                id="prof-carga"
                type="number"
                min={0}
                max={80}
                value={cargaHoras}
                onChange={(e) => setCargaHoras(Number(e.target.value))}
                placeholder="0 = sem limite"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-formacao">Formação</Label>
            <Input
              id="prof-formacao"
              value={formacao}
              onChange={(e) => setFormacao(e.target.value)}
              placeholder="Ex.: Pedagogia, Educação Física..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-bio">Bio (opcional)</Label>
            <Textarea
              id="prof-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Breve apresentação."
            />
          </div>

          {/* Especialidades — habilidades do banco */}
          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" /> Especialidades
            </Label>
            {habilidades.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Cadastre habilidades primeiro (header → Habilidades).
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border rounded-md p-2">
                {habilidades.map((h) => {
                  const sel = habilidadesSel.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHab(h.id)}
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                        sel
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border hover:border-primary/40",
                      )}
                      title={h.descricao}
                    >
                      {h.sigla}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              {habilidadesSel.length} selecionada(s)
            </p>
          </div>
        </div>

        <InnerDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </InnerDialogFooter>
      </InnerDialogContent>
    </InnerDialog>
  );
}

// =====================================================================
// Dialog principal
// =====================================================================
export function ProfessoresManagerDialog({ open, onOpenChange }: Props) {
  const all = useProfessores();
  const habilidades = useHabilidades();
  const users = useUsers();
  const avaliacoes = useProfessorAvaliacoes();
  const agendamentos = useAgendamentos();

  const habMap = useMemo(() => new Map(habilidades.map((h) => [h.id, h])), [habilidades]);

  const [editing, setEditing] = useState<Professor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Professor | null>(null);
  const [perfilAberto, setPerfilAberto] = useState<Professor | null>(null);
  const [avaliarProfId, setAvaliarProfId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativos" | "inativos">("ativos");

  // Sync automático bidirecional ao abrir:
  //   1. Cada usuário com papel "professor" → garante registro em `professores`
  //   2. Cada professor com userId → garante papel "professor" no user
  // Ambos idempotentes.
  useEffect(() => {
    if (!open) return;
    if (users.length === 0) return; // ainda carregando
    let cancelled = false;
    (async () => {
      const created = await professoresStore.syncFromUsers(users);
      // Backfill reverso: para cada professor já vinculado a um user,
      // garante que esse user tenha o papel "professor".
      let rolesAdded = 0;
      const userById = new Map(users.map((u) => [u.userId, u]));
      for (const p of all) {
        if (!p.userId) continue;
        const u = userById.get(p.userId);
        if (u && !u.roles.includes("professor")) {
          await usersStore.addRole(p.userId, "professor");
          rolesAdded++;
        }
      }
      if (!cancelled) {
        if (created > 0) {
          toast.success(`${created} professor(es) sincronizado(s) a partir de Usuários.`);
        }
        if (rolesAdded > 0) {
          toast.success(`${rolesAdded} usuário(s) ganharam o papel "professor".`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, users, all]);

  const lista = useMemo(() => {
    return all.filter((p) => {
      // Mostrar apenas professores vinculados a usuários
      if (!p.userId) return false;
      if (statusFiltro === "ativos" && !p.ativo) return false;
      if (statusFiltro === "inativos" && p.ativo) return false;
      if (!filtro) return true;
      const q = filtro.toLowerCase();
      return (
        p.nome.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.formacao ?? "").toLowerCase().includes(q)
      );
    });
  }, [all, filtro, statusFiltro]);
  const handleEditar = (p: Professor) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Professores
            </DialogTitle>
            <DialogDescription>
              Professores sincronizados de usuários com papel "professor". Edite perfil,
              especialidades e avaliações.
            </DialogDescription>
          </DialogHeader>

          {/* Filtros + ação primária */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar nome, e-mail, formação..."
                className="pl-8"
              />
            </div>
            <Select
              value={statusFiltro}
              onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resultado */}
          <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
            {lista.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {all.filter((p) => p.userId).length === 0
                  ? "Nenhum professor vinculado a usuário. Crie usuários com papel 'professor' na tela de Usuários."
                  : "Nenhum resultado para o filtro atual."}
              </div>
            ) : (
              lista.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "border rounded-md p-3 hover:border-primary/40 transition-colors",
                    !p.ativo && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{p.nome}</span>
                        {!p.ativo && (
                          <Badge variant="outline" className="text-[10px]">
                            <EyeOff className="h-2.5 w-2.5 mr-0.5" />
                            Inativo
                          </Badge>
                        )}
                        {p.userId && (
                          <Badge variant="secondary" className="text-[10px]">
                            🔗 vinculado
                          </Badge>
                        )}
                      </div>
                      {(p.email || p.telefone) && (
                        <div className="flex gap-3 text-[11px] text-muted-foreground mt-1">
                          {p.email && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" /> {p.email}
                            </span>
                          )}
                          {p.telefone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" /> {p.telefone}
                            </span>
                          )}
                        </div>
                      )}
                      {p.formacao && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{p.formacao}</p>
                      )}
                      {p.cargaHorariaSemanalMin > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Carga: {formatMinutos(p.cargaHorariaSemanalMin)}/sem
                        </p>
                      )}
                      {p.habilidadesIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.habilidadesIds.map((id) => {
                            const h = habMap.get(id);
                            if (!h) return null;
                            return (
                              <Badge
                                key={id}
                                variant="secondary"
                                className="text-[10px] font-mono"
                                title={h.descricao}
                              >
                                {h.sigla}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        title={p.ativo ? "Desativar" : "Ativar"}
                        onClick={() => professoresStore.toggleAtivo(p.id)}
                      >
                        {p.ativo ? (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Ver perfil"
                        onClick={() => setPerfilAberto(p)}
                        aria-label="Ver perfil"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Avaliar professor"
                        onClick={() => setAvaliarProfId(p.id)}
                        aria-label="Avaliar"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditar(p)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmDelete(p)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProfessorFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir professor?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{confirmDelete?.nome}"</strong> será removido do banco. Avaliações vinculadas
              a esse professor também serão removidas (CASCADE). Atividades e agendamentos antigos
              preservam o nome do professor como string para compatibilidade.
              <br />
              <br />
              Prefira <strong>Desativar</strong> para preservar o histórico completo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) {
                  await professoresStore.remove(confirmDelete.id);
                  setConfirmDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Perfil do professor (Fase 4) */}
      <ProfessorPerfilDialog
        open={!!perfilAberto}
        onOpenChange={(o) => !o && setPerfilAberto(null)}
        professor={perfilAberto}
        avaliacoes={avaliacoes}
        agendamentos={agendamentos}
        userName={
          perfilAberto?.userId
            ? users.find((u) => u.userId === perfilAberto.userId)?.displayName
            : undefined
        }
      />

      {/* Avaliar professor (Fase 5) */}
      <ProfessorAvaliacaoDialog
        open={!!avaliarProfId}
        onOpenChange={(o) => !o && setAvaliarProfId(null)}
        defaultProfessorId={avaliarProfId ?? undefined}
      />
    </>
  );
}
