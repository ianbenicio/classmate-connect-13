import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import type { Aluno, Curso, Turma } from "@/lib/academic-types";
import { alunosStore } from "@/lib/alunos-store";
import { toast } from "sonner";
import { Send, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Aluno;
  cursos: Curso[];
  turmas: Turma[];
  /** Salva o aluno. Pode ser sync ou async; o dialog faz await. */
  onSave: (a: Aluno) => void | Promise<void>;
}

const empty = (): Aluno => ({
  id: crypto.randomUUID(),
  nome: "",
  email: "",
  contato: "",
  cursoId: "",
  turmaId: "",
  habilidadeIds: [],
  aulas: [],
  trabalhos: [],
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AlunoFormDialog({ open, onOpenChange, editing, cursos, turmas, onSave }: Props) {
  const [form, setForm] = useState<Aluno>(empty());
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : empty());
      setExportando(false);
    }
  }, [open, editing]);

  const turmasDoCurso = turmas.filter((t) => t.cursoId === form.cursoId);

  const update = <K extends keyof Aluno>(k: K, v: Aluno[K]) => setForm((f) => ({ ...f, [k]: v }));

  /** Valida e devolve aluno normalizado (email trim+lower) ou null se inválido. */
  const validar = (): Aluno | null => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do aluno.");
      return null;
    }
    if (!form.cursoId) {
      toast.error("Selecione um curso.");
      return null;
    }
    if (!form.turmaId) {
      toast.error("Selecione uma turma.");
      return null;
    }
    const emailTrim = (form.email ?? "").trim();
    if (emailTrim && !EMAIL_RE.test(emailTrim)) {
      toast.error("Email inválido.");
      return null;
    }
    return { ...form, email: emailTrim || undefined };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const aluno = validar();
    if (!aluno) return;
    try {
      await onSave(aluno);
    } catch {
      // onSave já emitiu toast de erro — mantém dialog aberto.
      return;
    }
    toast.success(editing ? "Aluno atualizado" : "Aluno cadastrado");
    onOpenChange(false);
  };

  // Exportar: salva + dispara Edge Function pra criar/linkar auth user.
  const handleExportar = async () => {
    const aluno = validar();
    if (!aluno) return;
    if (!aluno.email) {
      toast.error("Email obrigatório para exportar como usuário.");
      return;
    }
    setExportando(true);
    try {
      try {
        await onSave(aluno);
      } catch {
        // onSave já emitiu toast de erro (ex.: 23505 email duplicado).
        // Aborta antes de invocar o invite com aluno desatualizado.
        return;
      }
      const result = await alunosStore.invite(aluno.id);
      if (!result.ok) {
        const friendly =
          result.error === "aluno_already_linked"
            ? "Este aluno já tem conta vinculada."
            : result.error === "aluno_missing_email"
              ? "Aluno sem email — preencha e salve antes."
              : result.error === "aluno_missing_curso_or_turma"
                ? "Vincule curso e turma antes de exportar."
                : result.error === "invalid_email_format"
                  ? "Email inválido."
                  : result.error === "invite_failed"
                    ? "Convite falhou no Supabase Auth — verifique SMTP/quota."
                    : result.error === "invoke_failed"
                      ? "Edge Function não respondeu — tente novamente."
                      : `Aluno salvo, mas falha ao criar usuário (${result.error}).`;
        const extra = result.detail ?? result.hint;
        toast.error(extra ? `${friendly} ${extra}` : friendly);
        return;
      }
      if (result.status === "invited") {
        toast.success("Aluno salvo e convite enviado por email.");
      } else {
        toast.success("Aluno salvo e conta vinculada (email já existia).");
      }
      onOpenChange(false);
    } finally {
      setExportando(false);
    }
  };

  // Estado do botão Exportar
  const emailOk = !!(form.email ?? "").trim() && EMAIL_RE.test((form.email ?? "").trim());
  const podeExportar = emailOk && !!form.cursoId && !!form.turmaId && !form.userId;
  const jaVinculado = !!form.userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar aluno" : "Novo aluno"}</DialogTitle>
          <DialogDescription>Dados cadastrais e vínculo com curso e turma.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="idade">Idade</Label>
              <Input
                id="idade"
                type="number"
                value={form.idade ?? ""}
                onChange={(e) =>
                  update("idade", e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
              />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={form.cpf ?? ""}
                onChange={(e) => update("cpf", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">
              Email{" "}
              {form.userId && (
                <span className="ml-2 inline-flex items-center rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-medium">
                  Conta vinculada
                </span>
              )}
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value)}
              placeholder="aluno@exemplo.com (opcional)"
              autoComplete="email"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Opcional. Necessário apenas para "Exportar como usuário" (cria conta de login).
            </p>
          </div>

          <div>
            <Label htmlFor="contato">Telefone</Label>
            <Input
              id="contato"
              value={form.contato}
              onChange={(e) => update("contato", e.target.value)}
              placeholder="(DDD) número"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Curso *</Label>
              <Select
                value={form.cursoId}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, cursoId: v, turmaId: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {cursos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cod} — {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Turma *</Label>
              <Select
                value={form.turmaId}
                onValueChange={(v) => update("turmaId", v)}
                disabled={!form.cursoId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {turmasDoCurso.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.cod} — {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="resp">Responsável</Label>
              <Input
                id="resp"
                value={form.responsavel ?? ""}
                onChange={(e) => update("responsavel", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contatoResp">Contato resp.</Label>
              <Input
                id="contatoResp"
                value={form.contatoResp ?? ""}
                onChange={(e) => update("contatoResp", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="obs">Observação</Label>
            <Textarea
              id="obs"
              rows={2}
              value={form.observacao ?? ""}
              onChange={(e) => update("observacao", e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="secondary" disabled={exportando}>
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
            {jaVinculado ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 px-3">
                <CheckCircle2 className="h-4 w-4" /> Conta vinculada
              </span>
            ) : (
              <Button
                type="button"
                onClick={handleExportar}
                disabled={!podeExportar || exportando}
                title={
                  podeExportar
                    ? "Salva e cria conta de usuário (envia email de convite)"
                    : "Preencha email + curso + turma para exportar"
                }
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {exportando ? "Exportando…" : "Exportar como usuário"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
