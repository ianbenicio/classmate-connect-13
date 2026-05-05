import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { v4 as uuidv4 } from "uuid";

export interface Pergunta {
  id: string;
  tipo: "texto_curto" | "texto_longo" | "escala_1_5" | "escala_1_10" | "sim_nao" | "multipla_escolha" | "numero" | "data";
  label: string;
  descricao?: string;
  obrigatorio?: boolean;
  opcoes?: string[];
}

export interface Bloco {
  titulo: string;
  descricao?: string;
  perguntas: Pergunta[];
}

const PERGUNTA_TIPOS = [
  { valor: "texto_curto", label: "Texto curto" },
  { valor: "texto_longo", label: "Texto longo" },
  { valor: "escala_1_5", label: "Escala 1-5" },
  { valor: "escala_1_10", label: "Escala 1-10" },
  { valor: "sim_nao", label: "Sim / Não" },
  { valor: "multipla_escolha", label: "Múltipla escolha" },
  { valor: "numero", label: "Número" },
  { valor: "data", label: "Data" },
] as const;

const TIPOS_COM_OPCOES = ["multipla_escolha"];

interface FormularioBlocoEditorProps {
  blocos: Bloco[];
  onChange: (blocos: Bloco[]) => void;
}

export function FormularioBlocoEditor({ blocos, onChange }: FormularioBlocoEditorProps) {
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set([0]));

  const toggleBloco = (index: number) => {
    const novo = new Set(expandidos);
    if (novo.has(index)) {
      novo.delete(index);
    } else {
      novo.add(index);
    }
    setExpandidos(novo);
  };

  const addBloco = () => {
    const novoBlocos = [
      ...blocos,
      {
        titulo: `Bloco ${blocos.length + 1}`,
        descricao: "",
        perguntas: [],
      },
    ];
    const newExpandidos = new Set(expandidos);
    newExpandidos.add(blocos.length);
    setExpandidos(newExpandidos);
    onChange(novoBlocos);
  };

  const removeBloco = (index: number) => {
    const novoBlocos = blocos.filter((_, i) => i !== index);
    onChange(novoBlocos);
  };

  const updateBloco = (index: number, updates: Partial<Bloco>) => {
    const novoBlocos = [...blocos];
    novoBlocos[index] = { ...novoBlocos[index], ...updates };
    onChange(novoBlocos);
  };

  const addPergunta = (blocoIndex: number) => {
    const novoBlocos = [...blocos];
    novoBlocos[blocoIndex].perguntas.push({
      id: uuidv4(),
      tipo: "texto_curto",
      label: "",
      obrigatorio: false,
    });
    onChange(novoBlocos);
  };

  const removePergunta = (blocoIndex: number, perguntaIndex: number) => {
    const novoBlocos = [...blocos];
    novoBlocos[blocoIndex].perguntas = novoBlocos[blocoIndex].perguntas.filter(
      (_, i) => i !== perguntaIndex
    );
    onChange(novoBlocos);
  };

  const updatePergunta = (blocoIndex: number, perguntaIndex: number, updates: Partial<Pergunta>) => {
    const novoBlocos = [...blocos];
    novoBlocos[blocoIndex].perguntas[perguntaIndex] = {
      ...novoBlocos[blocoIndex].perguntas[perguntaIndex],
      ...updates,
    };
    onChange(novoBlocos);
  };

  const addOpcao = (blocoIndex: number, perguntaIndex: number) => {
    const novoBlocos = [...blocos];
    const pergunta = novoBlocos[blocoIndex].perguntas[perguntaIndex];
    if (!pergunta.opcoes) pergunta.opcoes = [];
    pergunta.opcoes.push(`Opção ${pergunta.opcoes.length + 1}`);
    onChange(novoBlocos);
  };

  const removeOpcao = (blocoIndex: number, perguntaIndex: number, opcaoIndex: number) => {
    const novoBlocos = [...blocos];
    const pergunta = novoBlocos[blocoIndex].perguntas[perguntaIndex];
    if (pergunta.opcoes) {
      pergunta.opcoes = pergunta.opcoes.filter((_, i) => i !== opcaoIndex);
    }
    onChange(novoBlocos);
  };

  const updateOpcao = (blocoIndex: number, perguntaIndex: number, opcaoIndex: number, valor: string) => {
    const novoBlocos = [...blocos];
    const pergunta = novoBlocos[blocoIndex].perguntas[perguntaIndex];
    if (pergunta.opcoes) {
      pergunta.opcoes[opcaoIndex] = valor;
    }
    onChange(novoBlocos);
  };

  return (
    <div className="space-y-3">
      {blocos.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">Nenhum bloco adicionado ainda.</p>
        </div>
      ) : (
        blocos.map((bloco, blocoIndex) => (
          <Card key={blocoIndex}>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleBloco(blocoIndex)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  {expandidos.has(blocoIndex) ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-base">{bloco.titulo}</CardTitle>
                    {bloco.descricao && (
                      <CardDescription className="text-xs">{bloco.descricao}</CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">{bloco.perguntas.length} pergunta(s)</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBloco(blocoIndex);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {expandidos.has(blocoIndex) && (
              <CardContent className="space-y-4">
                <div className="space-y-2 pb-3 border-b">
                  <Label htmlFor={`bloco-titulo-${blocoIndex}`} className="text-xs">
                    Título do bloco
                  </Label>
                  <Input
                    id={`bloco-titulo-${blocoIndex}`}
                    value={bloco.titulo}
                    onChange={(e) => updateBloco(blocoIndex, { titulo: e.target.value })}
                    placeholder="Ex.: Sobre a aula"
                  />
                </div>

                <div className="space-y-2 pb-3 border-b">
                  <Label htmlFor={`bloco-desc-${blocoIndex}`} className="text-xs">
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id={`bloco-desc-${blocoIndex}`}
                    value={bloco.descricao ?? ""}
                    onChange={(e) => updateBloco(blocoIndex, { descricao: e.target.value })}
                    placeholder="Descrição do bloco"
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Perguntas</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addPergunta(blocoIndex)}
                    >
                      <Plus className="h-4 w-4" /> Adicionar pergunta
                    </Button>
                  </div>

                  {bloco.perguntas.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Nenhuma pergunta neste bloco
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bloco.perguntas.map((pergunta, perguntaIndex) => (
                        <div
                          key={pergunta.id}
                          className="border rounded-lg p-3 space-y-3 bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Pergunta {perguntaIndex + 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePergunta(blocoIndex, perguntaIndex)}
                              className="text-destructive hover:text-destructive h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`pergunta-label-${blocoIndex}-${perguntaIndex}`} className="text-xs">
                              Pergunta / Enunciado
                            </Label>
                            <Input
                              id={`pergunta-label-${blocoIndex}-${perguntaIndex}`}
                              value={pergunta.label}
                              onChange={(e) =>
                                updatePergunta(blocoIndex, perguntaIndex, { label: e.target.value })
                              }
                              placeholder="Ex.: Como você avalia a aula?"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`pergunta-desc-${blocoIndex}-${perguntaIndex}`} className="text-xs">
                              Descrição (opcional)
                            </Label>
                            <Textarea
                              id={`pergunta-desc-${blocoIndex}-${perguntaIndex}`}
                              value={pergunta.descricao ?? ""}
                              onChange={(e) =>
                                updatePergunta(blocoIndex, perguntaIndex, { descricao: e.target.value })
                              }
                              placeholder="Descrição ou instrução adicional"
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`pergunta-tipo-${blocoIndex}-${perguntaIndex}`} className="text-xs">
                              Tipo de resposta
                            </Label>
                            <Select
                              value={pergunta.tipo}
                              onValueChange={(valor) =>
                                updatePergunta(blocoIndex, perguntaIndex, {
                                  tipo: valor as Pergunta["tipo"],
                                  opcoes: TIPOS_COM_OPCOES.includes(valor) ? pergunta.opcoes ?? [] : undefined,
                                })
                              }
                            >
                              <SelectTrigger id={`pergunta-tipo-${blocoIndex}-${perguntaIndex}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PERGUNTA_TIPOS.map((t) => (
                                  <SelectItem key={t.valor} value={t.valor}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Checkbox
                              id={`pergunta-obrigatorio-${blocoIndex}-${perguntaIndex}`}
                              checked={pergunta.obrigatorio ?? false}
                              onCheckedChange={(checked) =>
                                updatePergunta(blocoIndex, perguntaIndex, { obrigatorio: !!checked })
                              }
                            />
                            <Label
                              htmlFor={`pergunta-obrigatorio-${blocoIndex}-${perguntaIndex}`}
                              className="text-xs cursor-pointer"
                            >
                              Pergunta obrigatória
                            </Label>
                          </div>

                          {TIPOS_COM_OPCOES.includes(pergunta.tipo) && (
                            <div className="space-y-2 pt-2 border-t">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Opções de resposta</Label>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addOpcao(blocoIndex, perguntaIndex)}
                                >
                                  <Plus className="h-3 w-3" /> Opção
                                </Button>
                              </div>
                              {pergunta.opcoes && pergunta.opcoes.length > 0 ? (
                                <div className="space-y-2">
                                  {pergunta.opcoes.map((opcao, opcaoIndex) => (
                                    <div key={opcaoIndex} className="flex items-center gap-2">
                                      <Input
                                        value={opcao}
                                        onChange={(e) =>
                                          updateOpcao(blocoIndex, perguntaIndex, opcaoIndex, e.target.value)
                                        }
                                        placeholder={`Opção ${opcaoIndex + 1}`}
                                        className="text-xs"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOpcao(blocoIndex, perguntaIndex, opcaoIndex)}
                                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-2 text-muted-foreground text-xs">
                                  Nenhuma opção adicionada
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))
      )}

      <Button onClick={addBloco} className="w-full" variant="outline">
        <Plus className="h-4 w-4" /> Adicionar bloco
      </Button>
    </div>
  );
}
