import { describe, expect, it } from "vitest";
import type { Agendamento, Atividade, Curso, Turma } from "@/lib/academic-types";
import {
  getNomesEsperadosEvidencia,
  getNomeArquivoChamadaUpload,
  getPastaAulaDrivePath,
  getPrazoPlanoAula,
  inferirHabilidadesIdsDoPlano,
  isPlanoAulaAtrasado,
  montarDadosDocumentoEstudo,
  montarPlanoAulaInicial,
  resumirConformidadeAula,
  validarArquivoEvidencia,
  type AulaEvidenciaContext,
} from "@/lib/aula-evidencias";

const curso: Pick<Curso, "cod" | "nome"> = {
  cod: "GAME",
  nome: "Game Academy",
};

const turma: Pick<Turma, "cod" | "nome"> = {
  cod: "TURMA-A",
  nome: "Turma A",
};

const atividade: Atividade = {
  id: "atividade-1",
  tipo: 0,
  codigo: "GCA01",
  nome: "Introducao a controladores",
  cursoId: "curso-1",
  grupo: "CA",
  descricao: "Descricao da ementa.",
  objetivoResultados: "Entender controladores basicos.",
  prazo: "2026-06-19",
  criadoPor: "Coord",
  professor: "Ian",
  habilidadeIds: ["hab-1", "hab-2"],
  descricaoConteudo: "Conteudo estruturado.",
  roteiro: [{ id: "r1", titulo: "Abertura", duracaoMin: 15, descricao: "Contexto da aula" }],
  materiais: [{ id: "m1", tipo: "link", titulo: "Slide", url: "https://example.com" }],
  criteriosSucesso: "Aluno explica o circuito.",
  rubricas: [{ id: "rub-1", descricao: "Clareza na explicacao" }],
  sugestoesPais: "Perguntar ao aluno o que foi montado.",
};

const agendamento: Pick<
  Agendamento,
  "id" | "data" | "inicio" | "fim" | "atividadeIds" | "professor" | "professorUserId"
> = {
  id: "agendamento-1",
  data: "2026-06-19",
  inicio: "14:00",
  fim: "15:00",
  atividadeIds: ["atividade-1"],
  professor: "Ian",
  professorUserId: "prof-user-1",
};

const ctx: AulaEvidenciaContext = {
  curso,
  turma,
  agendamento,
  atividades: [atividade],
};

describe("aula-evidencias", () => {
  it("gera pasta no padrao curso/turma/codigo_data/agendamento", () => {
    expect(getPastaAulaDrivePath(ctx)).toBe("GAME/TURMA-A/GCA01_2026-06-19/agendamento-1/");
  });

  it("gera nomes esperados para plano e chamada", () => {
    expect(getNomesEsperadosEvidencia(ctx, "plano_aula")).toEqual([
      "GCA01_2026-06-19_plano-aula",
      "GCA01_2026-06-19_plano-aula.docx",
    ]);
    expect(getNomesEsperadosEvidencia(ctx, "chamada_arquivo")).toEqual([
      "GCA01_2026-06-19_chamada.jpg",
      "GCA01_2026-06-19_chamada.jpeg",
      "GCA01_2026-06-19_chamada.png",
      "GCA01_2026-06-19_chamada.pdf",
    ]);
  });

  it("valida tipo e nomenclatura dos arquivos", () => {
    expect(
      validarArquivoEvidencia(ctx, "plano_aula", {
        name: "GCA01_2026-06-19_plano-aula.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }).valido,
    ).toBe(true);

    expect(
      validarArquivoEvidencia(ctx, "chamada_arquivo", {
        name: "GCA01_2026-06-19_chamada.png",
        mimeType: "image/png",
      }).valido,
    ).toBe(true);

    expect(
      validarArquivoEvidencia(ctx, "chamada_arquivo", {
        name: "foto-chamada.png",
        mimeType: "image/png",
      }).valido,
    ).toBe(false);
  });

  it("gera nome padronizado para upload manual da chamada", () => {
    expect(
      getNomeArquivoChamadaUpload(ctx, {
        name: "IMG_1234.jpeg",
        mimeType: "image/jpeg",
      }),
    ).toBe("GCA01_2026-06-19_chamada.jpeg");
    expect(
      getNomeArquivoChamadaUpload(ctx, {
        name: "chamada.pdf",
        mimeType: "application/pdf",
      }),
    ).toBe("GCA01_2026-06-19_chamada.pdf");
  });

  it("calcula prazo do plano duas horas antes da aula", () => {
    expect(getPrazoPlanoAula(ctx).toISOString()).toBe("2026-06-19T15:00:00.000Z");
    expect(isPlanoAulaAtrasado(ctx, new Date("2026-06-19T15:01:00.000Z"))).toBe(true);
  });

  it("resume conformidade da aula completa", () => {
    const resumo = resumirConformidadeAula({
      evidencias: [
        { id: "ev-1", agendamentoId: "agendamento-1", tipo: "plano_aula", status: "valido" },
        {
          id: "ev-2",
          agendamentoId: "agendamento-1",
          tipo: "chamada_arquivo",
          status: "aprovado_manual",
        },
      ],
      chamadaDigitalRegistrada: true,
      relatorioProfessorRegistrado: true,
      relatoriosAlunoRespondidos: 2,
      relatoriosAlunoEsperados: 2,
      checklistsRespondidos: 2,
      checklistsEsperados: 2,
    });

    expect(resumo.completa).toBe(true);
    expect(resumo.pendencias).toEqual([]);
  });

  it("monta plano inicial herdando ementa, habilidades e sugestao aos pais", () => {
    const plano = montarPlanoAulaInicial(ctx);
    expect(plano.objetivos).toContain("Entender controladores");
    expect(plano.conteudoEmenta).toContain("Conteudo estruturado");
    expect(plano.preparacaoProfessor).toBe("");
    expect(plano.roteiro).toContain("Abertura");
    expect(plano.materiais).toContain("Slide");
    expect(plano.habilidadesIds).toEqual(["hab-1", "hab-2"]);
    expect(plano.habilidades).toContain("Aluno explica o circuito");
    expect(plano.formaAvaliacao).toContain("Clareza");
    expect(plano.sugestaoPais).toContain("Perguntar ao aluno");
  });

  it("infere habilidades vinculadas ou mencionadas na ementa do plano", () => {
    const ids = inferirHabilidadesIdsDoPlano(
      ctx,
      [
        {
          id: "hab-1",
          sigla: "H1",
          nome: "Controle motor",
          descricao: "Controladores basicos",
        },
        {
          id: "hab-extra",
          sigla: "FOCO",
          nome: "Foco sustentado",
          descricao: "Atencao durante desafios longos",
        },
      ],
      {
        conteudoEmenta: "A aula trabalha FOCO sustentado durante a montagem.",
        habilidades: "Professor organiza a dinamica em pequenos desafios.",
      },
    );

    expect(ids).toEqual(expect.arrayContaining(["hab-1", "hab-2", "hab-extra"]));
  });

  it("monta metadados do documento interno com codigo, data e professor", () => {
    const plano = montarPlanoAulaInicial(ctx);
    const dados = montarDadosDocumentoEstudo(
      ctx,
      { ...plano, preparacaoProfessor: "Estudo da ementa e materiais." },
      "Ian",
    );
    expect(dados.documentoTipo).toBe("plano_aula_interno");
    expect(dados.codigoAula).toBe("GCA01");
    expect(dados.dataAula).toBe("2026-06-19");
    expect(dados.professorTag).toBe("Ian");
    expect(dados.turmaCodigo).toBe("TURMA-A");
  });
});
