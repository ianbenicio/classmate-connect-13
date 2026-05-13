// =====================================================================
// pdf-relatorios — Geração de PDFs de relatórios de aula (prof + aluno)
// =====================================================================
// Usa jspdf (já no projeto). Função pura: recebe avaliações + contexto,
// produz documento e dispara download.
//
// Funções:
//   - gerarPdfRelatorioProf(rec, ctx)  — 1 relatório do professor
//   - gerarPdfRelatorioAluno(rec, ctx) — 1 relatório do aluno
//   - gerarPdfRelatoriosLote(opts)     — Coletânea Coordenação:
//       agrupa por turma → ordena por data → adiciona síntese estatística

import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Agendamento, Aluno, Atividade, Curso, Turma } from "./academic-types";
import type { RelatorioProfessorDados, RelatorioAlunoDados } from "./formularios-types";
import type { AvaliacaoRecord } from "./avaliacoes-types";

export interface PdfCtx {
  cursos: Curso[];
  turmas: Turma[];
  atividades: Atividade[];
  alunos: Aluno[];
  agendamentos: Agendamento[];
}

// =====================================================================
// helpers
// =====================================================================
function buildHelpers(pdf: jsPDF) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  const newPage = () => {
    pdf.addPage();
    y = margin;
  };
  const ensure = (h: number) => {
    if (y + h > pageHeight - margin) newPage();
  };
  const addText = (text: string, opts?: { size?: number; bold?: boolean; color?: number[] }) => {
    const size = opts?.size ?? 10;
    pdf.setFontSize(size);
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    if (opts?.color) pdf.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
    else pdf.setTextColor(20, 20, 20);
    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineH = size * 0.45;
    ensure(lines.length * lineH);
    pdf.text(lines, margin, y);
    y += lines.length * lineH + 2;
  };
  const addHr = () => {
    ensure(2);
    pdf.setDrawColor(180, 180, 180);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 3;
  };
  const addKV = (k: string, v: string | number | null | undefined) => {
    const str = v == null || v === "" ? "—" : String(v);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(80, 80, 80);
    const kWidth = pdf.getTextWidth(`${k}: `);
    ensure(5);
    pdf.text(`${k}:`, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(20, 20, 20);
    const lines = pdf.splitTextToSize(str, contentWidth - kWidth - 4);
    pdf.text(lines, margin + kWidth + 2, y);
    y += Math.max(5, lines.length * 4.5) + 1;
  };
  const addH1 = (text: string) => {
    ensure(10);
    addText(text, { size: 16, bold: true });
    y += 1;
  };
  const addH2 = (text: string) => {
    ensure(8);
    addText(text, { size: 13, bold: true, color: [40, 40, 120] });
  };
  const addH3 = (text: string) => {
    ensure(6);
    addText(text, { size: 11, bold: true, color: [60, 60, 60] });
  };
  return {
    pdf,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    get y() {
      return y;
    },
    setY(v: number) {
      y = v;
    },
    newPage,
    addText,
    addKV,
    addHr,
    addH1,
    addH2,
    addH3,
  };
}

function fmtData(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}
function fmtDataHora(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}
function nota(n: number | null | undefined): string {
  return n == null ? "—" : `${n}/5`;
}

// =====================================================================
// Relatório do professor — section
// =====================================================================
function renderRelatorioProfSection(
  h: ReturnType<typeof buildHelpers>,
  rec: AvaliacaoRecord,
  ctx: PdfCtx,
) {
  const dados = rec.dados as RelatorioProfessorDados;
  const ag = ctx.agendamentos.find((a) => a.id === rec.agendamentoId);
  const turma = ag ? ctx.turmas.find((t) => t.id === ag.turmaId) : null;
  const curso = turma ? ctx.cursos.find((c) => c.id === turma.cursoId) : null;
  const ativs = ag
    ? ag.atividadeIds.map((id) => ctx.atividades.find((a) => a.id === id)).filter(Boolean)
    : [];

  h.addH2("📋 Relatório da Aula (Professor)");
  h.addKV("Data da aula", ag ? `${fmtData(ag.data)} · ${ag.inicio}–${ag.fim}` : "—");
  h.addKV("Curso", curso ? `${curso.cod} — ${curso.nome}` : "—");
  h.addKV("Turma", turma?.cod ?? "—");
  h.addKV("Professor", ag?.professor ?? "—");
  if (ativs.length > 0) {
    h.addKV(
      "Atividades",
      ativs.map((a) => `${a?.codigo} — ${a?.nome}`).join(" | "),
    );
  }
  h.addKV("Registrado em", fmtDataHora(rec.criadoEm));
  h.addHr();

  h.addH3("Resumo da aula");
  h.addText(dados.resumo || "—");
  h.addH3("Avaliação geral");
  h.addKV("Engajamento da turma", nota(dados.engajamentoTurma));
  h.addKV("Cumprimento do plano", nota(dados.cumprimentoPlano));

  if (dados.destaques?.trim()) {
    h.addH3("Destaques");
    h.addText(dados.destaques);
  }
  if (dados.dificuldades?.trim()) {
    h.addH3("Dificuldades");
    h.addText(dados.dificuldades);
  }
  if (dados.sugestoes?.trim()) {
    h.addH3("Sugestões para próxima aula");
    h.addText(dados.sugestoes);
  }
  if (dados.sugestoesPais?.trim()) {
    h.addH3("Sugestões para os pais");
    h.addText(dados.sugestoesPais);
  }

  const presencas = dados.presencas ?? {};
  const alunosTurma = turma ? ctx.alunos.filter((a) => a.turmaId === turma.id) : [];
  if (alunosTurma.length > 0) {
    const presentes = Object.values(presencas).filter(Boolean).length;
    h.addH3(`Chamada — ${presentes}/${alunosTurma.length} presentes`);
    const linhas = alunosTurma.map(
      (al) => `${presencas[al.id] === false ? "[ ] Faltou" : "[X] Presente"} — ${al.nome}`,
    );
    h.addText(linhas.join("\n"), { size: 9 });
  }
}

export function gerarPdfRelatorioProf(rec: AvaliacaoRecord, ctx: PdfCtx, filename?: string): void {
  const pdf = new jsPDF();
  const h = buildHelpers(pdf);
  h.addH1("Relatório de Aula — Professor");
  h.addHr();
  renderRelatorioProfSection(h, rec, ctx);
  pdf.save(filename ?? `relatorio-prof-${fmtData(rec.criadoEm)}.pdf`);
}

// =====================================================================
// Relatório do aluno — section
// =====================================================================
function renderRelatorioAlunoSection(
  h: ReturnType<typeof buildHelpers>,
  rec: AvaliacaoRecord,
  ctx: PdfCtx,
) {
  const dados = rec.dados as RelatorioAlunoDados;
  const ag = ctx.agendamentos.find((a) => a.id === rec.agendamentoId);
  const turma = ag ? ctx.turmas.find((t) => t.id === ag.turmaId) : null;
  const curso = turma ? ctx.cursos.find((c) => c.id === turma.cursoId) : null;
  const aluno = ctx.alunos.find((a) => a.id === rec.alunoId);

  h.addH2("✨ Como foi sua aula? (Aluno)");
  h.addKV("Aluno", aluno?.nome ?? "—");
  h.addKV("Data da aula", ag ? `${fmtData(ag.data)} · ${ag.inicio}–${ag.fim}` : "—");
  h.addKV("Curso", curso ? `${curso.cod} — ${curso.nome}` : "—");
  h.addKV("Turma", turma?.cod ?? "—");
  h.addKV("Professor", ag?.professor ?? "—");
  h.addKV("Respondido em", fmtDataHora(rec.criadoEm));
  h.addHr();

  h.addH3("Validação do conteúdo");
  h.addKV("Entendi a aula", nota(dados.entendeuConteudo));
  h.addH3("Sobre a aula");
  h.addKV("Foi interessante", nota(dados.aula?.interessante));
  h.addKV("Ritmo bom", nota(dados.aula?.ritmoBom));
  h.addKV("Materiais OK", nota(dados.aula?.materiaisOk));
  h.addH3("Sobre o professor");
  h.addKV("Explica bem", nota(dados.professor?.explicaBem));
  h.addKV("Ajuda quando trava", nota(dados.professor?.ajudaQuandoTrava));
  h.addKV("Respeito", nota(dados.professor?.respeito));
  h.addH3("Eu na aula");
  h.addKV("Participei", nota(dados.euNaAula?.participei));
  h.addKV("Aprendi algo novo", nota(dados.euNaAula?.aprendiAlgoNovo));

  if (dados.destaqueDoDia?.trim()) {
    h.addH3("Destaque do dia");
    h.addText(dados.destaqueDoDia);
  }
  if (dados.oQueMudaria?.trim()) {
    h.addH3("O que mudaria");
    h.addText(dados.oQueMudaria);
  }
}

export function gerarPdfRelatorioAluno(rec: AvaliacaoRecord, ctx: PdfCtx, filename?: string): void {
  const pdf = new jsPDF();
  const h = buildHelpers(pdf);
  h.addH1("Relatório de Aula — Aluno");
  h.addHr();
  renderRelatorioAlunoSection(h, rec, ctx);
  pdf.save(filename ?? `relatorio-aluno-${fmtData(rec.criadoEm)}.pdf`);
}

// =====================================================================
// Lote agregado (Coordenação)
// =====================================================================
export interface LoteFiltros {
  cursoId?: string;
  turmaId?: string;
  alunoId?: string;
  professorUserId?: string;
  professorNome?: string;
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;
  incluirRelatorioProf?: boolean;
  incluirRelatorioAluno?: boolean;
}

export interface LoteEstatisticas {
  totalRelatoriosProf: number;
  totalRelatoriosAluno: number;
  totalAulasCobertas: number;
  totalAlunosEnvolvidos: number;
  totalPresentes: number;
  totalFaltas: number;
  mediaEngajamentoTurma: number | null;
  mediaCumprimentoPlano: number | null;
  mediaEntendeuConteudoAluno: number | null;
}

function computaEstatisticas(profs: AvaliacaoRecord[], alunos: AvaliacaoRecord[]): LoteEstatisticas {
  const aulasSet = new Set<string>();
  const alunosSet = new Set<string>();
  let presentes = 0;
  let faltas = 0;
  let engSum = 0;
  let engN = 0;
  let cumSum = 0;
  let cumN = 0;

  for (const p of profs) {
    if (p.agendamentoId) aulasSet.add(p.agendamentoId);
    const d = p.dados as RelatorioProfessorDados;
    if (d.engajamentoTurma != null) {
      engSum += d.engajamentoTurma;
      engN++;
    }
    if (d.cumprimentoPlano != null) {
      cumSum += d.cumprimentoPlano;
      cumN++;
    }
    for (const [, presente] of Object.entries(d.presencas ?? {})) {
      if (presente) presentes++;
      else faltas++;
    }
  }
  let entSum = 0;
  let entN = 0;
  for (const a of alunos) {
    if (a.alunoId) alunosSet.add(a.alunoId);
    if (a.agendamentoId) aulasSet.add(a.agendamentoId);
    const d = a.dados as RelatorioAlunoDados;
    if (d.entendeuConteudo != null) {
      entSum += d.entendeuConteudo;
      entN++;
    }
  }
  return {
    totalRelatoriosProf: profs.length,
    totalRelatoriosAluno: alunos.length,
    totalAulasCobertas: aulasSet.size,
    totalAlunosEnvolvidos: alunosSet.size,
    totalPresentes: presentes,
    totalFaltas: faltas,
    mediaEngajamentoTurma: engN > 0 ? engSum / engN : null,
    mediaCumprimentoPlano: cumN > 0 ? cumSum / cumN : null,
    mediaEntendeuConteudoAluno: entN > 0 ? entSum / entN : null,
  };
}

export function filtrarAvaliacoes(
  todas: AvaliacaoRecord[],
  filtros: LoteFiltros,
  ctx: PdfCtx,
): { profs: AvaliacaoRecord[]; alunos: AvaliacaoRecord[] } {
  const incluirProf = filtros.incluirRelatorioProf !== false;
  const incluirAluno = filtros.incluirRelatorioAluno !== false;
  const result = { profs: [] as AvaliacaoRecord[], alunos: [] as AvaliacaoRecord[] };
  const agMap = new Map(ctx.agendamentos.map((a) => [a.id, a]));
  const turmaMap = new Map(ctx.turmas.map((t) => [t.id, t]));

  for (const av of todas) {
    if (!av.agendamentoId) continue;
    const ag = agMap.get(av.agendamentoId);
    if (!ag) continue;
    const turma = turmaMap.get(ag.turmaId);
    if (!turma) continue;

    if (filtros.cursoId && turma.cursoId !== filtros.cursoId) continue;
    if (filtros.turmaId && ag.turmaId !== filtros.turmaId) continue;
    if (filtros.professorUserId && ag.professorUserId !== filtros.professorUserId) continue;
    if (
      filtros.professorNome &&
      (ag.professor ?? "").trim().toLowerCase() !== filtros.professorNome.trim().toLowerCase()
    ) {
      continue;
    }
    if (filtros.dataInicio && ag.data < filtros.dataInicio) continue;
    if (filtros.dataFim && ag.data > filtros.dataFim) continue;

    if (av.tipo === "relatorio_prof" && incluirProf) {
      if (filtros.alunoId) continue; // filtro por aluno não aplica a relatorio_prof
      result.profs.push(av);
    } else if (av.tipo === "relatorio_aluno" && incluirAluno) {
      if (filtros.alunoId && av.alunoId !== filtros.alunoId) continue;
      result.alunos.push(av);
    }
  }
  const cmp = (a: AvaliacaoRecord, b: AvaliacaoRecord) => {
    const aa = agMap.get(a.agendamentoId ?? "");
    const bb = agMap.get(b.agendamentoId ?? "");
    return `${aa?.data ?? ""} ${aa?.inicio ?? ""}`.localeCompare(
      `${bb?.data ?? ""} ${bb?.inicio ?? ""}`,
    );
  };
  result.profs.sort(cmp);
  result.alunos.sort(cmp);
  return result;
}

export function gerarPdfRelatoriosLote(opts: {
  titulo: string;
  subtitulo?: string;
  filtros: LoteFiltros;
  avaliacoes: AvaliacaoRecord[];
  ctx: PdfCtx;
  filename?: string;
}): { profs: number; alunos: number } {
  const { profs, alunos } = filtrarAvaliacoes(opts.avaliacoes, opts.filtros, opts.ctx);
  const pdf = new jsPDF();
  const h = buildHelpers(pdf);

  // Capa
  h.addH1(opts.titulo);
  if (opts.subtitulo) h.addText(opts.subtitulo, { size: 11, color: [80, 80, 80] });
  h.addText(`Gerado em ${fmtDataHora(new Date().toISOString())}`, {
    size: 9,
    color: [120, 120, 120],
  });
  h.addText(`${profs.length} relatório(s) do professor · ${alunos.length} relatório(s) do aluno`, {
    size: 9,
    color: [120, 120, 120],
  });
  h.addHr();

  // Filtros aplicados
  const f = opts.filtros;
  const filtroLines: string[] = [];
  if (f.cursoId) {
    const c = opts.ctx.cursos.find((x) => x.id === f.cursoId);
    if (c) filtroLines.push(`Curso: ${c.cod} — ${c.nome}`);
  }
  if (f.turmaId) {
    const t = opts.ctx.turmas.find((x) => x.id === f.turmaId);
    if (t) filtroLines.push(`Turma: ${t.cod}`);
  }
  if (f.alunoId) {
    const a = opts.ctx.alunos.find((x) => x.id === f.alunoId);
    if (a) filtroLines.push(`Aluno: ${a.nome}`);
  }
  if (f.professorNome) filtroLines.push(`Professor: ${f.professorNome}`);
  if (f.dataInicio || f.dataFim) {
    filtroLines.push(
      `Período: ${f.dataInicio ? fmtData(f.dataInicio) : "início"} → ${f.dataFim ? fmtData(f.dataFim) : "hoje"}`,
    );
  }
  if (filtroLines.length > 0) {
    h.addH3("Filtros aplicados");
    h.addText(filtroLines.join("\n"), { size: 9 });
    h.addHr();
  }

  // Agrupa por turma
  const agMap = new Map(opts.ctx.agendamentos.map((a) => [a.id, a]));
  const turmaMap = new Map(opts.ctx.turmas.map((t) => [t.id, t]));
  const cursoMap = new Map(opts.ctx.cursos.map((c) => [c.id, c]));
  const porTurma = new Map<
    string,
    { turma: Turma; curso: Curso | null; profs: AvaliacaoRecord[]; alunos: AvaliacaoRecord[] }
  >();
  const include = (rec: AvaliacaoRecord, kind: "prof" | "aluno") => {
    const ag = agMap.get(rec.agendamentoId ?? "");
    const turma = ag ? turmaMap.get(ag.turmaId) : null;
    if (!turma) return;
    const curso = cursoMap.get(turma.cursoId) ?? null;
    if (!porTurma.has(turma.id)) {
      porTurma.set(turma.id, { turma, curso, profs: [], alunos: [] });
    }
    porTurma.get(turma.id)![kind === "prof" ? "profs" : "alunos"].push(rec);
  };
  for (const r of profs) include(r, "prof");
  for (const r of alunos) include(r, "aluno");

  const turmasOrdenadas = Array.from(porTurma.values()).sort((a, b) =>
    a.turma.cod.localeCompare(b.turma.cod),
  );

  for (const grupo of turmasOrdenadas) {
    h.newPage();
    h.addH1(`Turma ${grupo.turma.cod}`);
    if (grupo.curso) h.addText(`Curso: ${grupo.curso.cod} — ${grupo.curso.nome}`, { size: 10 });
    h.addText(
      `${grupo.profs.length} relatório(s) do professor · ${grupo.alunos.length} relatório(s) do aluno`,
      { size: 9, color: [120, 120, 120] },
    );
    h.addHr();

    if (grupo.profs.length > 0) {
      h.addH2("Relatórios do Professor");
      for (let i = 0; i < grupo.profs.length; i++) {
        if (i > 0) h.addHr();
        renderRelatorioProfSection(h, grupo.profs[i], opts.ctx);
      }
    }
    if (grupo.alunos.length > 0) {
      h.newPage();
      h.addH2("Relatórios dos Alunos");
      for (let i = 0; i < grupo.alunos.length; i++) {
        if (i > 0) h.addHr();
        renderRelatorioAlunoSection(h, grupo.alunos[i], opts.ctx);
      }
    }
  }

  // Síntese estatística no final
  h.newPage();
  h.addH1("Síntese Estatística");
  h.addHr();
  const stats = computaEstatisticas(profs, alunos);
  h.addH3("Volumes");
  h.addKV("Total de relatórios do professor", stats.totalRelatoriosProf);
  h.addKV("Total de relatórios do aluno", stats.totalRelatoriosAluno);
  h.addKV("Aulas distintas cobertas", stats.totalAulasCobertas);
  h.addKV("Alunos distintos com avaliação", stats.totalAlunosEnvolvidos);
  h.addH3("Frequência (a partir dos relatórios do professor)");
  h.addKV("Total de presenças", stats.totalPresentes);
  h.addKV("Total de faltas", stats.totalFaltas);
  const totalCham = stats.totalPresentes + stats.totalFaltas;
  if (totalCham > 0) {
    const pct = Math.round((stats.totalPresentes / totalCham) * 100);
    h.addKV("Taxa de presença", `${pct}%`);
  }
  h.addH3("Qualidade (médias 1–5)");
  h.addKV(
    "Engajamento da turma (média)",
    stats.mediaEngajamentoTurma != null ? stats.mediaEngajamentoTurma.toFixed(2) : "—",
  );
  h.addKV(
    "Cumprimento do plano (média)",
    stats.mediaCumprimentoPlano != null ? stats.mediaCumprimentoPlano.toFixed(2) : "—",
  );
  h.addKV(
    "Entendimento do conteúdo pelos alunos (média)",
    stats.mediaEntendeuConteudoAluno != null ? stats.mediaEntendeuConteudoAluno.toFixed(2) : "—",
  );

  pdf.save(opts.filename ?? `relatorios-${new Date().toISOString().slice(0, 10)}.pdf`);
  return { profs: profs.length, alunos: alunos.length };
}
