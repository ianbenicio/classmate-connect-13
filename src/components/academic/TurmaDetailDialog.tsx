import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Mail } from "lucide-react";
import type { Aluno, Curso, Turma } from "@/lib/academic-types";

interface Props {
  turma: Turma | null;
  curso?: Curso;
  alunos: Aluno[];
  onOpenChange: (open: boolean) => void;
}

export function TurmaDetailDialog({ turma, curso, alunos, onOpenChange }: Props) {
  const alunosDaTurma = turma
    ? alunos.filter((a) => a.turmaId === turma.id)
    : [];

  return (
    <Dialog open={!!turma} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">
              {turma?.cod}
            </Badge>
            <DialogTitle>{turma?.nome}</DialogTitle>
          </div>
          {curso && (
            <DialogDescription>
              Curso: <strong>{curso.nome}</strong>
            </DialogDescription>
          )}
        </DialogHeader>

        <section className="grid grid-cols-2 gap-3 py-3 border-y text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Data</div>
            <div className="font-medium">{turma?.data || "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Horário
            </div>
            <div className="font-medium">{turma?.horario || "—"}</div>
          </div>
          {turma?.descricao && (
            <div className="col-span-2">
              <div className="text-xs uppercase text-muted-foreground">
                Descrição
              </div>
              <div>{turma.descricao}</div>
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Alunos ({alunosDaTurma.length})
          </h3>

          {alunosDaTurma.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-md p-6 text-center">
              Nenhum aluno cadastrado nesta turma.
            </p>
          ) : (
            <ul className="border rounded-lg divide-y">
              {alunosDaTurma.map((al) => {
                const presencas = al.aulas.filter((r) => r.presente).length;
                const entregas = al.trabalhos.filter((t) => t.entregue).length;
                return (
                  <li key={al.id} className="p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{al.nome}</div>
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {al.contato}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {presencas} presenças
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {entregas} entregas
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {al.habilidadeIds.length} habilidades
                        </Badge>
                      </div>
                    </div>
                    {al.observacao && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {al.observacao}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
