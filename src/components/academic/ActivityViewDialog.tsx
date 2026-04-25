import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FIELD_VISIBILITY,
  type Atividade,
  type Curso,
  type Habilidade,
  type PerfilAcesso,
} from "@/lib/academic-types";

interface Props {
  atividade: Atividade | null;
  curso?: Curso;
  habilidades: Habilidade[];
  perfil: PerfilAcesso;
  onOpenChange: (open: boolean) => void;
}

function canSee(field: keyof typeof FIELD_VISIBILITY, perfil: PerfilAcesso) {
  return FIELD_VISIBILITY[field]?.includes(perfil) ?? true;
}

export function ActivityViewDialog({
  atividade,
  curso,
  habilidades,
  perfil,
  onOpenChange,
}: Props) {
  if (!atividade) return null;
  const isAula = atividade.tipo === 0;

  const habs = habilidades.filter((h) => atividade.habilidadeIds.includes(h.id));

  return (
    <Dialog open={!!atividade} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{isAula ? "Aula" : "Tarefa"}</Badge>
            {canSee("codigo", perfil) && (
              <Badge variant="secondary" className="font-mono">
                {atividade.codigo}
              </Badge>
            )}
            {curso && <Badge variant="outline">{curso.nome}</Badge>}
          </div>
          <DialogTitle>{atividade.nome}</DialogTitle>
          {canSee("descricao", perfil) && atividade.descricao && (
            <DialogDescription>{atividade.descricao}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {canSee("objetivoResultados", perfil) && atividade.objetivoResultados && (
            <Section title="🎯 Objetivo">
              <p className="whitespace-pre-wrap">{atividade.objetivoResultados}</p>
            </Section>
          )}

          {isAula && canSee("resultadosEsperados", perfil) && atividade.resultadosEsperados && (
            <Section title="✨ Resultados Esperados e Benefícios">
              <p className="whitespace-pre-wrap">{atividade.resultadosEsperados}</p>
            </Section>
          )}

          {isAula && canSee("criteriosSucesso", perfil) && atividade.criteriosSucesso && (
            <Section title="✅ Critérios de Sucesso">
              <p className="whitespace-pre-wrap">{atividade.criteriosSucesso}</p>
            </Section>
          )}

          {isAula && canSee("preRequisitos", perfil) && atividade.preRequisitos && (
            <Section title="🧩 Pré-requisitos">
              <p>{atividade.preRequisitos}</p>
            </Section>
          )}

          {canSee("habilidadeIds", perfil) && habs.length > 0 && (
            <Section title="🧠 Habilidades Trabalhadas">
              <div className="flex flex-wrap gap-1">
                {habs.map((h) => (
                  <Badge key={h.id} variant="secondary" className="text-xs">
                    <span className="font-mono mr-1">{h.sigla}</span>
                    {h.descricao}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {isAula && canSee("descricaoConteudo", perfil) && atividade.descricaoConteudo && (
            <Section title="📚 Conteúdo">
              <p className="whitespace-pre-wrap">{atividade.descricaoConteudo}</p>
            </Section>
          )}

          {isAula && canSee("metodologias", perfil) && atividade.metodologias && (
            <Section title="🛠️ Metodologias">
              <p className="whitespace-pre-wrap">{atividade.metodologias}</p>
            </Section>
          )}

          {isAula && canSee("roteiro", perfil) && (atividade.roteiro?.length ?? 0) > 0 && (
            <Section title="📋 Roteiro">
              <ol className="space-y-1 list-decimal list-inside">
                {atividade.roteiro!.map((b) => (
                  <li key={b.id}>
                    <span className="font-medium">{b.titulo}</span>
                    {b.duracaoMin ? (
                      <span className="text-muted-foreground"> · {b.duracaoMin} min</span>
                    ) : null}
                    {b.descricao && (
                      <p className="text-xs text-muted-foreground ml-5">{b.descricao}</p>
                    )}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {isAula && canSee("materiais", perfil) && (atividade.materiais?.length ?? 0) > 0 && (
            <Section title="📦 Materiais">
              <ul className="space-y-1">
                {atividade.materiais!.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{m.tipo}</Badge>
                    {m.url ? (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {m.titulo || m.url}
                      </a>
                    ) : (
                      <span>{m.titulo}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {isAula && canSee("referencias", perfil) && atividade.referencias && (
            <Section title="🔗 Referências">
              <p className="whitespace-pre-wrap">{atividade.referencias}</p>
            </Section>
          )}

          {isAula && canSee("notasInstrutor", perfil) && atividade.notasInstrutor && (
            <Section title="📝 Notas para o Instrutor">
              <p className="whitespace-pre-wrap">{atividade.notasInstrutor}</p>
            </Section>
          )}

          {isAula && canSee("sugestoesPais", perfil) && atividade.sugestoesPais && (
            <Section title="👨‍👩 Sugestões para Pais">
              <p className="whitespace-pre-wrap">{atividade.sugestoesPais}</p>
            </Section>
          )}

          {!isAula && atividade.instrucoes && (
            <Section title="📝 Instruções">
              <p className="whitespace-pre-wrap">{atividade.instrucoes}</p>
            </Section>
          )}

          {canSee("prazo", perfil) && atividade.prazo && (
            <Section title="📅 Prazo de Referência">
              <p>{atividade.prazo}</p>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="text-sm">{children}</div>
      <Separator className="mt-2" />
    </div>
  );
}
