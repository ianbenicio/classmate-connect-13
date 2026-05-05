# Sistema de Contexto para Formulários

## 📋 Visão Geral

Quando um formulário é preenchido (por alunos ou professores), ele deve ser rastreado com **metadados invisíveis** que identificam:

- **Educacional**: Curso, turma, agendamento
- **Pessoas**: Quem respondeu, quem aplicou
- **Temporal**: Quando foi respondido
- **Local**: Onde foi respondido

Esses dados são **armazenados automaticamente** junto com as respostas, sem precisar estar visíveis no formulário.

---

## 🏗️ Estrutura de Dados

### ContextoFormulario

```typescript
{
  id: "ctx_1715000000000_abc123def",
  
  // Identificadores educacionais
  cursoId: "curso_001",
  cursoCodigo: "GPCA",
  cursoNome: "Desenvolvimento Web",
  
  turmaId: "turma_001", 
  turmaCodigo: "CA-2025-A",
  
  // Agendamento (se aplicável)
  agendamentoId: "ag_001",
  
  // Respondente
  respondeuId: "aluno_001",
  respondeuNome: "João Silva",
  respondeuTipo: "aluno",
  
  // Aplicador
  aplicadoPorId: "user_prof_001",
  aplicadoPorNome: "Prof. Maria",
  
  // Temporal
  respondidoEm: "2025-05-05T14:30:00Z",
  
  // Adicional
  local: "Sala 101",
  tags: ["módulo_1", "presencial"],
  notas: "Respondeu com calma"
}
```

### RespostaFormulario

```typescript
{
  id: "resp_001",
  formularioId: "form_001",
  formularioSlug: "autoavaliacao_aluno",
  
  contexto: { /* ContextoFormulario acima */ },
  
  respostas: {
    "pergunta_1": 4,           // Escala 1-5
    "pergunta_2": "Gostei",    // Texto
    "pergunta_3": ["A", "C"],  // Múltipla escolha
  },
  
  criadoEm: "2025-05-05T14:30:00Z",
  completo: true,
  validado: true
}
```

---

## 💻 Como Usar

### 1. Criar Contexto (ao abrir formulário)

```typescript
import { ContextoFormularioBuilder, extrairContextoDeAgendamento } from "@/lib/formularios-context";

// Opção A: Criar manualmente
const contexto = new ContextoFormularioBuilder(
  cursoId,           // ID do curso
  turmaId,           // ID da turma
  alunoId,           // Quem respondeu
  alunoNome,         // Nome do respondente
  "aluno",           // Tipo (aluno/professor)
  professorUserId,   // Quem aplicou
  professorNome      // Nome de quem aplicou
)
  .withCursoInfo("GPCA", "Desenvolvimento Web")
  .withTurmaInfo("CA-2025-A")
  .withLocal("Sala 101")
  .withAgendamento(agendamentoId)
  .withTags(["modulo_1", "presencial"])
  .build();

// Opção B: Extrair de um agendamento
const parcialContexto = await extrairContextoDeAgendamento(
  agendamentoId,
  agendamentos,
  turmas,
  cursos
);

const contexto = new ContextoFormularioBuilder(...)
  .withCursoInfo(parcialContexto.cursoCodigo, parcialContexto.cursoNome)
  .withTurmaInfo(parcialContexto.turmaCodigo)
  .build();
```

### 2. Armazenar Resposta com Contexto

```typescript
// Ao salvar as respostas
const respostaComContexto: RespostaFormulario = {
  id: uuidv4(),
  formularioId: formulario.id,
  formularioSlug: formulario.slug,
  contexto,  // Metadados capturados acima
  respostas: {
    "pergunta_1": 4,
    "pergunta_2": "Ótima aula!",
  },
  criadoEm: new Date().toISOString(),
  completo: true,
};

// Salvar no banco
await respostasStore.save(respostaComContexto);
```

### 3. Consultar Respostas por Contexto

```typescript
// Todas as respostas de um aluno
const respostasAluno = respostas.filter(
  r => r.contexto.respondeuId === alunoId
);

// Todas as respostas de um curso
const respostasCurso = respostas.filter(
  r => r.contexto.cursoId === cursoId
);

// Todas as respostas aplicadas por um professor
const respostasAplicadas = respostas.filter(
  r => r.contexto.aplicadoPorId === professorId
);

// Respostas de um agendamento
const respostasAgendamento = respostas.filter(
  r => r.contexto.agendamentoId === agendamentoId
);

// Respostas do último mês
const respostasRecentes = respostas.filter(
  r => new Date(r.respondidoEm) > dataUmMesAtras
);
```

---

## 🎯 Casos de Uso

### Caso 1: Aluno preenche "Como foi sua aula?" 

```
Contexto capturado automaticamente:
- Curso: Desenvolvimento Web
- Turma: CA-2025-A  
- Agendamento: Aula de 2025-05-05 14:00
- Respondeu: João Silva (aluno_001)
- Aplicado por: Prof. Maria (prof_001)
- Horário: 14:30
- Local: Sala 101
```

Depois você pode:
- Ver todas as respostas desta aula
- Ver histórico de respostas deste aluno
- Comparar respostas da turma
- Gerar relatório da aula

### Caso 2: Professor preenche "Relatório da Aula"

```
Contexto:
- Curso: Desenvolvimento Web
- Turma: CA-2025-A
- Agendamento: Aula de 2025-05-05 14:00
- Respondeu: Prof. Maria (prof_001)
- Aplicado por: Prof. Maria (prof_001) [auto]
- Horário: 14:45
- Local: Sala 101
```

Depois você pode:
- Ver relatórios do professor por período
- Comparar seu feedback com avaliações dos alunos
- Gerar carga horária trabalhada

### Caso 3: Pesquisa/Diagnóstico fora de agendamento

```
Contexto:
- Curso: Desenvolvimento Web
- Turma: CA-2025-A
- Respondeu: Todos da turma
- Aplicado por: Prof. Coordenador
- Horário: 2025-05-06 10:00
- Local: Laboratório
- Tags: ["diagnóstico", "pré-módulo_2"]
```

---

## 🔍 Relatórios Possíveis

Com esse sistema você pode gerar:

### 📊 Por Aluno
- Histórico completo de respostas
- Evolução em um curso
- Tendências de engajamento

### 👥 Por Turma
- Média de avaliação da aula
- Feedback agregado do professor
- Comparativo entre alunos

### 📚 Por Curso
- Aulas mais bem avaliadas
- Tópicos com dificuldade
- Performance dos professores

### 🎓 Por Professor
- Horas trabalhadas (baseado em agendamentos com contexto)
- Avaliações recebidas
- Relatórios preenchidos

### 📅 Por Período
- Respostas do mês
- Tendências temporais
- Sazonalidade

---

## 🛠️ Implementação no Componente

Quando criar um componente que exibe um formulário para preenchimento:

```typescript
interface FormularioPreenchimentoProps {
  formulario: FormularioTemplate;
  contexto: ContextoFormulario; // ← Passado automaticamente
  onSubmit: (respostas: RespostaFormulario) => Promise<void>;
}

export function FormularioPreenchimento({ 
  formulario, 
  contexto, 
  onSubmit 
}: FormularioPreenchimentoProps) {
  const [respostas, setRespostas] = useState({});

  const handleSubmit = async () => {
    const resposta: RespostaFormulario = {
      id: uuidv4(),
      formularioId: formulario.id,
      formularioSlug: formulario.slug,
      contexto,  // Metadados invisíveis
      respostas,
      criadoEm: new Date().toISOString(),
      completo: true,
    };
    await onSubmit(resposta);
  };

  return (
    // Renderizar formulário normalmente
    // Contexto fica invisível para o usuário
  );
}
```

---

## ✅ Vantagens

✔️ **Rastreabilidade completa** — saber exatamente quando/onde/quem respondeu  
✔️ **Invisível para usuário** — sem poluir a interface  
✔️ **Flexível** — metadados adicionais via tags/notas  
✔️ **Reutilizável** — mesmo formulário em múltiplos contextos  
✔️ **Análise profunda** — cruzar dados por múltiplas dimensões  

