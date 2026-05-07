import jsPDF from "jspdf";
import {
  type Atividade,
  type Curso,
  type Habilidade,
  type RoteiroBloco,
  type MaterialAula,
  type FormulariosConfig,
  type CriterioAvaliacao,
  type HabilidadeNivelAlvo,
  FIELD_VISIBILITY,
  type PerfilAcesso,
} from "./academic-types";

/**
 * Gera PDF a partir dos dados do formulário de edição (ActivityFormDialog).
 * Cria capítulos para cada aba: Identificação, Pedagógico, Conteúdo, Avaliação, Pais
 */
export function generateAulaPDFFromForm(
  // Identificação
  tipo: 0 | 1,
  nome: string,
  codigo: string,
  curso: Curso | undefined,
  grupo: string,
  prazo: string,
  descricao: string,
  professor: string,
  cargaHoras: string,
  cargaMin: string,

  // Pedagógico
  objetivoResultados: string,
  resultadosEsperados: string,
  notasInstrutor: string,
  habilidadeIds: string[],
  habilidades: Habilidade[],
  niveisAlvo: HabilidadeNivelAlvo[],
  preRequisitos: string,
  criteriosSucesso: string,

  // Conteúdo
  descricaoConteudo: string,
  metodologias: string,
  roteiro: RoteiroBloco[],
  materiais: MaterialAula[],
  referencias: string,

  // Avaliação
  formularios: FormulariosConfig,
  rubricas: CriterioAvaliacao[],

  // Pais/Tarefa
  sugestoesPais: string,
  instrucoes: string,
) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Helper: add text with wrapping
  function addWrappedText(text: string, fontSize: number = 11, isBold: boolean = false) {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont(undefined, "bold");
    }
    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.4;
    const textHeight = lines.length * lineHeight;

    if (yPos + textHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.text(lines, margin, yPos);
    yPos += textHeight + 3;
    pdf.setFont(undefined, "normal");
  }

  // Helper: add chapter title
  function addChapterTitle(title: string) {
    if (yPos > margin + 20) {
      pdf.addPage();
      yPos = margin;
    }
    pdf.setFontSize(16);
    pdf.setFont(undefined, "bold");
    const titleLines = pdf.splitTextToSize(title, contentWidth);
    pdf.text(titleLines, margin, yPos);
    yPos += titleLines.length * 6 + 8;
    pdf.setFont(undefined, "normal");
  }

  // Helper: add section
  function addSection(sectionTitle: string, content: string | null | undefined) {
    if (!content) return;

    pdf.setFontSize(12);
    pdf.setFont(undefined, "bold");

    if (yPos + 10 > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }

    const sectionLines = pdf.splitTextToSize(sectionTitle, contentWidth);
    pdf.text(sectionLines, margin, yPos);
    yPos += sectionLines.length * 5 + 3;

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(10);

    const contentStr = String(content);
    const contentLines = pdf.splitTextToSize(contentStr, contentWidth);
    const lineHeight = 4;
    const contentHeight = contentLines.length * lineHeight;

    if (yPos + contentHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.text(contentLines, margin, yPos);
    yPos += contentHeight + 6;
  }

  // ========== COVER PAGE ==========
  pdf.setFontSize(24);
  pdf.setFont(undefined, "bold");
  const titleLines = pdf.splitTextToSize(nome, contentWidth);
  pdf.text(titleLines, margin, 40);

  yPos = 40 + titleLines.length * 8 + 15;

  pdf.setFontSize(12);
  pdf.setFont(undefined, "normal");
  addWrappedText(`Tipo: ${tipo === 0 ? "Aula" : "Tarefa"}`);
  if (curso) {
    addWrappedText(`Curso: ${curso.nome} (${curso.cod})`);
  }
  addWrappedText(`Código: ${codigo}`);
  addWrappedText(`Grupo: ${grupo}`);
  if (professor) {
    addWrappedText(`Professor: ${professor}`);
  }
  if (prazo) {
    addWrappedText(`Prazo: ${prazo}`);
  }

  // ========== CHAPTER 1: IDENTIFICATION ==========
  pdf.addPage();
  yPos = margin;

  addChapterTitle("1. Identificação");

  if (descricao) {
    addSection("Descrição", descricao);
  }

  const cargaTotal = (parseInt(cargaHoras || "0", 10) || 0) * 60 + (parseInt(cargaMin || "0", 10) || 0);
  if (cargaTotal > 0) {
    const h = Math.floor(cargaTotal / 60);
    const m = cargaTotal % 60;
    const cargaStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    addSection("Carga Horária", cargaStr);
  }

  // ========== CHAPTER 2: PEDAGOGICAL ==========
  pdf.addPage();
  yPos = margin;

  addChapterTitle("2. Pedagógico");

  if (objetivoResultados) {
    addSection("Objetivo", objetivoResultados);
  }

  if (tipo === 0) {
    // Aula
    if (resultadosEsperados) {
      addSection("Resultados Esperados e Benefícios", resultadosEsperados);
    }

    if (criteriosSucesso) {
      addSection("Critérios de Sucesso", criteriosSucesso);
    }

    if (preRequisitos) {
      addSection("Pré-requisitos", preRequisitos);
    }
  }

  // Skills
  if (habilidadeIds.length > 0) {
    const habs = habilidades.filter((h) => habilidadeIds.includes(h.id));
    if (habs.length > 0) {
      const habsList = habs.map((h) => `${h.sigla}: ${h.descricao}`).join("\n");
      addSection("Habilidades Trabalhadas", habsList);
    }
  }

  if (notasInstrutor) {
    addSection("Notas para o Instrutor", notasInstrutor);
  }

  // ========== CHAPTER 3: CONTENT ==========
  if (tipo === 0) {
    // Aula only
    pdf.addPage();
    yPos = margin;

    addChapterTitle("3. Conteúdo");

    if (descricaoConteudo) {
      addSection("Descrição de Conteúdo", descricaoConteudo);
    }

    if (metodologias) {
      addSection("Metodologias", metodologias);
    }

    if (roteiro && roteiro.length > 0) {
      const roteiroText = roteiro
        .map(
          (b, i) =>
            `${i + 1}. ${b.titulo}${b.duracaoMin ? ` (${b.duracaoMin} min)` : ""}${b.descricao ? `\n   ${b.descricao}` : ""}`,
        )
        .join("\n\n");
      addSection("Roteiro", roteiroText);
    }

    if (materiais && materiais.length > 0) {
      const materiaisText = materiais
        .map((m) => `• [${m.tipo}] ${m.titulo}${m.url ? ` - ${m.url}` : ""}`)
        .join("\n");
      addSection("Materiais", materiaisText);
    }

    if (referencias) {
      addSection("Referências", referencias);
    }
  }

  // ========== CHAPTER 4: EVALUATION ==========
  if (tipo === 0) {
    // Aula only
    pdf.addPage();
    yPos = margin;

    addChapterTitle("4. Avaliação");

    if (rubricas && rubricas.length > 0) {
      const rubricasText = rubricas
        .map((r) => `• ${r.descricao} (Peso: ${r.peso})`)
        .join("\n");
      addSection("Rubricas", rubricasText);
    } else {
      addWrappedText("Nenhuma rubrica definida.");
    }

    if (formularios) {
      const formsInfo = [];
      if (formularios.relatorioProfessor) formsInfo.push("• Relatório do Professor");
      if (formularios.autoavaliacaoAluno) formsInfo.push("• Autoavaliação do Aluno");
      if (formularios.avaliacaoPares) formsInfo.push("• Avaliação entre Pares");
      if (formularios.avaliacaoProfessor) formsInfo.push("• Avaliação do Professor");

      if (formsInfo.length > 0) {
        addSection("Formulários Configurados", formsInfo.join("\n"));
      }
    }
  }

  // ========== CHAPTER 5: PARENTS ==========
  if (tipo === 0) {
    // Aula only
    pdf.addPage();
    yPos = margin;

    addChapterTitle("5. Pais");

    if (sugestoesPais) {
      addSection("Sugestões para Pais", sugestoesPais);
    } else {
      addWrappedText("Nenhuma sugestão para pais definida.");
    }
  }

  // Task instructions (for tarefas)
  if (tipo === 1 && instrucoes) {
    pdf.addPage();
    yPos = margin;

    addChapterTitle("Instruções");
    addSection("Detalhes", instrucoes);
  }

  // Save
  const filename = `${codigo}_${nome.replace(/[^a-z0-9]/gi, "_")}.pdf`;
  pdf.save(filename);
}

/**
 * Gera PDF a partir de um objeto Atividade (backward compatibility)
 */
export function generateAulaPDF(
  atividade: Atividade,
  curso: Curso | undefined,
  habilidades: Habilidade[],
  perfil: PerfilAcesso,
) {
  const cargaHoras = String(Math.floor((atividade.cargaHorariaMin ?? 0) / 60));
  const cargaMin = String((atividade.cargaHorariaMin ?? 0) % 60);

  generateAulaPDFFromForm(
    atividade.tipo,
    atividade.nome,
    atividade.codigo,
    curso,
    atividade.grupo,
    atividade.prazo,
    atividade.descricao,
    atividade.professor ?? "",
    cargaHoras,
    cargaMin,
    atividade.objetivoResultados,
    atividade.resultadosEsperados ?? "",
    atividade.notasInstrutor ?? "",
    atividade.habilidadeIds,
    habilidades,
    atividade.niveisAlvo ?? [],
    atividade.preRequisitos ?? "",
    atividade.criteriosSucesso ?? "",
    atividade.descricaoConteudo ?? "",
    atividade.metodologias ?? "",
    atividade.roteiro ?? [],
    atividade.materiais ?? [],
    atividade.referencias ?? "",
    atividade.formularios ?? { relatorioProfessor: true, autoavaliacaoAluno: true },
    atividade.rubricas ?? [],
    atividade.sugestoesPais ?? "",
    atividade.instrucoes ?? "",
  );
}
