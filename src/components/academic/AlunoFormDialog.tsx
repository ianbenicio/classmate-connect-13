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
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Aluno;
  cursos: Curso[];
  turmas: Turma[];
  onSave: (a: Aluno) => void;
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

  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : empty());
  }, [open, editing]);

  const turmasDoCurso = turmas.filter((t) => t.cursoId === form.cursoId);

  const update = <K extends keyof Aluno>(k: K, v: Aluno[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome do aluno.");
    if (!form.cursoId) return toast.error("Selecione um curso.");
    if (!form.turmaId) return toast.error("Selecione uma turma.");
    const emailTrim = (form.email ?? "").trim();
    if (emailTrim && !EMAIL_RE.test(emailTrim)) return toast.error("Email inválido.");
    // Email obrigatório para criar novo aluno (futuro: convite auto-enviado).
    if (!editing && !emailTrim) return toast.error("Informe o email do aluno.");
    onSave({ ...form, email: emailTrim || undefined });
    toast.success(editing ? "Aluno atualizado" : "Aluno cadastrado");
    onOpenChange(false);
  };

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
              Email *{" "}
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
              placeholder="aluno@exemplo.com"
              autoComplete="email"
            />
            {!editing && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Ao salvar, será enviado um email de convite para definição de senha.
              </p>
            )}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
