export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agendamentos: {
        Row: {
          atividade_ids: Json;
          bloco_index: number;
          blocos_total: number;
          concluido_em: string | null;
          created_at: string;
          criado_por_nome: string | null;
          criado_por_user_id: string | null;
          data: string;
          dia_semana: Database["public"]["Enums"]["dia_semana"];
          fim: string;
          id: string;
          inicio: string;
          meta: Json;
          observacao: string | null;
          pais_notificados_em: string | null;
          parte_grupo_id: string | null;
          parte_num: number;
          partes_total: number;
          professor: string | null;
          professor_user_id: string | null;
          project_id: string;
          recursos_drive_path: string | null;
          recursos_entregues_em: string | null;
          status: Database["public"]["Enums"]["status_agendamento"];
          turma_id: string;
          updated_at: string;
        };
        Insert: {
          atividade_ids?: Json;
          bloco_index?: number;
          blocos_total?: number;
          concluido_em?: string | null;
          created_at?: string;
          criado_por_nome?: string | null;
          criado_por_user_id?: string | null;
          data: string;
          dia_semana: Database["public"]["Enums"]["dia_semana"];
          fim: string;
          id?: string;
          inicio: string;
          meta?: Json;
          observacao?: string | null;
          pais_notificados_em?: string | null;
          parte_grupo_id?: string | null;
          parte_num?: number;
          partes_total?: number;
          professor?: string | null;
          professor_user_id?: string | null;
          project_id?: string;
          recursos_drive_path?: string | null;
          recursos_entregues_em?: string | null;
          status?: Database["public"]["Enums"]["status_agendamento"];
          turma_id: string;
          updated_at?: string;
        };
        Update: {
          atividade_ids?: Json;
          bloco_index?: number;
          blocos_total?: number;
          concluido_em?: string | null;
          created_at?: string;
          criado_por_nome?: string | null;
          criado_por_user_id?: string | null;
          data?: string;
          dia_semana?: Database["public"]["Enums"]["dia_semana"];
          fim?: string;
          id?: string;
          inicio?: string;
          meta?: Json;
          observacao?: string | null;
          pais_notificados_em?: string | null;
          parte_grupo_id?: string | null;
          parte_num?: number;
          partes_total?: number;
          professor?: string | null;
          professor_user_id?: string | null;
          project_id?: string;
          recursos_drive_path?: string | null;
          recursos_entregues_em?: string | null;
          status?: Database["public"]["Enums"]["status_agendamento"];
          turma_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      aluno_habilidades: {
        Row: { aluno_id: string; habilidade_id: string };
        Insert: { aluno_id: string; habilidade_id: string };
        Update: { aluno_id?: string; habilidade_id?: string };
        Relationships: [];
      };
      alunos: {
        Row: {
          contato: string | null;
          contato_resp: string | null;
          cpf: string | null;
          created_at: string;
          curso_id: string | null;
          email: string | null;
          id: string;
          idade: number | null;
          nome: string;
          observacao: string | null;
          project_id: string;
          responsavel: string | null;
          turma_id: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          contato?: string | null;
          contato_resp?: string | null;
          cpf?: string | null;
          created_at?: string;
          curso_id?: string | null;
          email?: string | null;
          id?: string;
          idade?: number | null;
          nome: string;
          observacao?: string | null;
          project_id?: string;
          responsavel?: string | null;
          turma_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          contato?: string | null;
          contato_resp?: string | null;
          cpf?: string | null;
          created_at?: string;
          curso_id?: string | null;
          email?: string | null;
          id?: string;
          idade?: number | null;
          nome?: string;
          observacao?: string | null;
          project_id?: string;
          responsavel?: string | null;
          turma_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      atividades: {
        Row: {
          carga_horaria_min: number;
          codigo: string;
          created_at: string;
          criado_por: string | null;
          criterios_sucesso: string | null;
          curso_id: string;
          descricao: string | null;
          descricao_conteudo: string | null;
          formularios: Json | null;
          grupo: string;
          habilidade_ids: Json;
          id: string;
          instrucoes: string | null;
          materiais: Json | null;
          metodologias: string | null;
          niveis_alvo: Json | null;
          nome: string;
          notas_instrutor: string | null;
          objetivo_resultados: string | null;
          prazo: string | null;
          pre_requisitos: string | null;
          professor: string | null;
          professor_user_id: string | null;
          project_id: string;
          referencias: string | null;
          resultados_esperados: string | null;
          roteiro: Json | null;
          rubricas: Json | null;
          sugestoes_pais: string | null;
          tipo: Database["public"]["Enums"]["atividade_tipo"];
          updated_at: string;
        };
        Insert: {
          carga_horaria_min?: number;
          codigo: string;
          created_at?: string;
          criado_por?: string | null;
          criterios_sucesso?: string | null;
          curso_id: string;
          descricao?: string | null;
          descricao_conteudo?: string | null;
          formularios?: Json | null;
          grupo: string;
          habilidade_ids?: Json;
          id?: string;
          instrucoes?: string | null;
          materiais?: Json | null;
          metodologias?: string | null;
          niveis_alvo?: Json | null;
          nome: string;
          notas_instrutor?: string | null;
          objetivo_resultados?: string | null;
          prazo?: string | null;
          pre_requisitos?: string | null;
          professor?: string | null;
          professor_user_id?: string | null;
          project_id?: string;
          referencias?: string | null;
          resultados_esperados?: string | null;
          roteiro?: Json | null;
          rubricas?: Json | null;
          sugestoes_pais?: string | null;
          tipo: Database["public"]["Enums"]["atividade_tipo"];
          updated_at?: string;
        };
        Update: {
          carga_horaria_min?: number;
          codigo?: string;
          created_at?: string;
          criado_por?: string | null;
          criterios_sucesso?: string | null;
          curso_id?: string;
          descricao?: string | null;
          descricao_conteudo?: string | null;
          formularios?: Json | null;
          grupo?: string;
          habilidade_ids?: Json;
          id?: string;
          instrucoes?: string | null;
          materiais?: Json | null;
          metodologias?: string | null;
          niveis_alvo?: Json | null;
          nome?: string;
          notas_instrutor?: string | null;
          objetivo_resultados?: string | null;
          prazo?: string | null;
          pre_requisitos?: string | null;
          professor?: string | null;
          professor_user_id?: string | null;
          project_id?: string;
          referencias?: string | null;
          resultados_esperados?: string | null;
          roteiro?: Json | null;
          rubricas?: Json | null;
          sugestoes_pais?: string | null;
          tipo?: Database["public"]["Enums"]["atividade_tipo"];
          updated_at?: string;
        };
        Relationships: [];
      };
      avaliacoes: {
        Row: {
          agendamento_id: string | null;
          aluno_id: string | null;
          atividade_id: string | null;
          created_at: string;
          criado_por_user_id: string | null;
          dados: Json;
          id: string;
          project_id: string;
          tipo: string;
          updated_at: string;
        };
        Insert: {
          agendamento_id?: string | null;
          aluno_id?: string | null;
          atividade_id?: string | null;
          created_at?: string;
          criado_por_user_id?: string | null;
          dados?: Json;
          id?: string;
          project_id?: string;
          tipo: string;
          updated_at?: string;
        };
        Update: {
          agendamento_id?: string | null;
          aluno_id?: string | null;
          atividade_id?: string | null;
          created_at?: string;
          criado_por_user_id?: string | null;
          dados?: Json;
          id?: string;
          project_id?: string;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comportamento_tags: {
        Row: {
          ativo: boolean;
          criado_em: string;
          descricao: string | null;
          emoji: string;
          id: string;
          label: string;
          ordem: number;
          project_id: string | null;
          tom: string;
          value: string;
        };
        Insert: {
          ativo?: boolean;
          criado_em?: string;
          descricao?: string | null;
          emoji?: string;
          id?: string;
          label: string;
          ordem?: number;
          project_id?: string | null;
          tom?: string;
          value: string;
        };
        Update: {
          ativo?: boolean;
          criado_em?: string;
          descricao?: string | null;
          emoji?: string;
          id?: string;
          label?: string;
          ordem?: number;
          project_id?: string | null;
          tom?: string;
          value?: string;
        };
        Relationships: [];
      };
      cursos: {
        Row: {
          carga_horaria_total_min: number;
          cod: string;
          created_at: string;
          descricao: string | null;
          duracao_aula_min: number;
          habilidade_ids: Json;
          id: string;
          nome: string;
          project_id: string;
          turno_diario_min: number;
          updated_at: string;
        };
        Insert: {
          carga_horaria_total_min?: number;
          cod: string;
          created_at?: string;
          descricao?: string | null;
          duracao_aula_min?: number;
          habilidade_ids?: Json;
          id?: string;
          nome: string;
          project_id?: string;
          turno_diario_min?: number;
          updated_at?: string;
        };
        Update: {
          carga_horaria_total_min?: number;
          cod?: string;
          created_at?: string;
          descricao?: string | null;
          duracao_aula_min?: number;
          habilidade_ids?: Json;
          id?: string;
          nome?: string;
          project_id?: string;
          turno_diario_min?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      formularios: {
        Row: {
          created_at: string;
          criado_por_user_id: string | null;
          descricao: string | null;
          destinatario: string;
          estrutura: Json;
          id: string;
          is_system: boolean;
          nome: string;
          project_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          criado_por_user_id?: string | null;
          descricao?: string | null;
          destinatario: string;
          estrutura?: Json;
          id?: string;
          is_system?: boolean;
          nome: string;
          project_id?: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          criado_por_user_id?: string | null;
          descricao?: string | null;
          destinatario?: string;
          estrutura?: Json;
          id?: string;
          is_system?: boolean;
          nome?: string;
          project_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      grupos: {
        Row: {
          cod: string;
          created_at: string;
          curso_id: string;
          id: string;
          nome: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          cod: string;
          created_at?: string;
          curso_id: string;
          id?: string;
          nome: string;
          project_id?: string;
          updated_at?: string;
        };
        Update: {
          cod?: string;
          created_at?: string;
          curso_id?: string;
          id?: string;
          nome?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habilidades: {
        Row: {
          created_at: string;
          descricao: string;
          grupo: string | null;
          id: string;
          nome: string | null;
          project_id: string | null;
          sigla: string;
          tipo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descricao: string;
          grupo?: string | null;
          id?: string;
          nome?: string | null;
          project_id?: string | null;
          sigla: string;
          tipo?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string;
          grupo?: string | null;
          id?: string;
          nome?: string | null;
          project_id?: string | null;
          sigla?: string;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notificacoes: {
        Row: {
          agendamento_id: string | null;
          atividade_ids: Json | null;
          created_at: string;
          curso_id: string | null;
          data: string | null;
          destinatario_ref: string | null;
          destinatario_tipo: string;
          destinatario_user_id: string | null;
          fim: string | null;
          id: string;
          inicio: string | null;
          kind: string | null;
          lida: boolean;
          mensagem: string;
          professor: string | null;
          professor_user_id: string | null;
          project_id: string;
          titulo: string;
          turma_id: string | null;
        };
        Insert: {
          agendamento_id?: string | null;
          atividade_ids?: Json | null;
          created_at?: string;
          curso_id?: string | null;
          data?: string | null;
          destinatario_ref?: string | null;
          destinatario_tipo: string;
          destinatario_user_id?: string | null;
          fim?: string | null;
          id?: string;
          inicio?: string | null;
          kind?: string | null;
          lida?: boolean;
          mensagem: string;
          professor?: string | null;
          professor_user_id?: string | null;
          project_id?: string;
          titulo: string;
          turma_id?: string | null;
        };
        Update: {
          agendamento_id?: string | null;
          atividade_ids?: Json | null;
          created_at?: string;
          curso_id?: string | null;
          data?: string | null;
          destinatario_ref?: string | null;
          destinatario_tipo?: string;
          destinatario_user_id?: string | null;
          fim?: string | null;
          id?: string;
          inicio?: string | null;
          kind?: string | null;
          lida?: boolean;
          mensagem?: string;
          professor?: string | null;
          professor_user_id?: string | null;
          project_id?: string;
          titulo?: string;
          turma_id?: string | null;
        };
        Relationships: [];
      };
      presencas: {
        Row: {
          agendamento_id: string | null;
          aluno_id: string;
          atividade_id: string;
          created_at: string;
          id: string;
          observacao: string | null;
          presente: boolean;
          project_id: string;
          registrado_por_user_id: string | null;
          updated_at: string;
        };
        Insert: {
          agendamento_id?: string | null;
          aluno_id: string;
          atividade_id: string;
          created_at?: string;
          id?: string;
          observacao?: string | null;
          presente?: boolean;
          project_id?: string;
          registrado_por_user_id?: string | null;
          updated_at?: string;
        };
        Update: {
          agendamento_id?: string | null;
          aluno_id?: string;
          atividade_id?: string;
          created_at?: string;
          id?: string;
          observacao?: string | null;
          presente?: boolean;
          project_id?: string;
          registrado_por_user_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      professor_avaliacoes: {
        Row: {
          agendamento_id: string | null;
          avaliador_tipo: string;
          avaliador_user_id: string;
          comentario: string | null;
          criado_em: string;
          id: string;
          notas: Json;
          professor_user_id: string;
          project_id: string;
          tags: string[];
        };
        Insert: {
          agendamento_id?: string | null;
          avaliador_tipo: string;
          avaliador_user_id: string;
          comentario?: string | null;
          criado_em?: string;
          id?: string;
          notas?: Json;
          professor_user_id: string;
          project_id?: string;
          tags?: string[];
        };
        Update: {
          agendamento_id?: string | null;
          avaliador_tipo?: string;
          avaliador_user_id?: string;
          comentario?: string | null;
          criado_em?: string;
          id?: string;
          notas?: Json;
          professor_user_id?: string;
          project_id?: string;
          tags?: string[];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          ativo: boolean | null;
          bio: string | null;
          carga_horaria_semanal_min: number | null;
          cpf: string | null;
          created_at: string;
          display_name: string;
          email: string | null;
          formacao: string | null;
          foto_url: string | null;
          habilidades_ids: string[] | null;
          id: string;
          project_id: string | null;
          telefone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ativo?: boolean | null;
          bio?: string | null;
          carga_horaria_semanal_min?: number | null;
          cpf?: string | null;
          created_at?: string;
          display_name: string;
          email?: string | null;
          formacao?: string | null;
          foto_url?: string | null;
          habilidades_ids?: string[] | null;
          id?: string;
          project_id?: string | null;
          telefone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ativo?: boolean | null;
          bio?: string | null;
          carga_horaria_semanal_min?: number | null;
          cpf?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          formacao?: string | null;
          foto_url?: string | null;
          habilidades_ids?: string[] | null;
          id?: string;
          project_id?: string | null;
          telefone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      projetos: {
        Row: {
          cor_primaria: string | null;
          criado_em: string;
          id: string;
          logo_url: string | null;
          nome: string;
          slug: string;
        };
        Insert: {
          cor_primaria?: string | null;
          criado_em?: string;
          id?: string;
          logo_url?: string | null;
          nome: string;
          slug: string;
        };
        Update: {
          cor_primaria?: string | null;
          criado_em?: string;
          id?: string;
          logo_url?: string | null;
          nome?: string;
          slug?: string;
        };
        Relationships: [];
      };
      relatorios: {
        Row: {
          agendamento_id: string;
          conteudo: string | null;
          created_at: string;
          criado_por_user_id: string | null;
          dados: Json | null;
          id: string;
          observacoes: string | null;
          professor: string | null;
          project_id: string;
          turma_id: string;
          updated_at: string;
        };
        Insert: {
          agendamento_id: string;
          conteudo?: string | null;
          created_at?: string;
          criado_por_user_id?: string | null;
          dados?: Json | null;
          id?: string;
          observacoes?: string | null;
          professor?: string | null;
          project_id?: string;
          turma_id: string;
          updated_at?: string;
        };
        Update: {
          agendamento_id?: string;
          conteudo?: string | null;
          created_at?: string;
          criado_por_user_id?: string | null;
          dados?: Json | null;
          id?: string;
          observacoes?: string | null;
          professor?: string | null;
          project_id?: string;
          turma_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      relatorios_exportados: {
        Row: {
          conteudo: string;
          created_at: string;
          filename: string;
          formato: string;
          gerado_em: string;
          gerado_por_nome: string | null;
          gerado_por_user_id: string | null;
          id: string;
          project_id: string;
          size_bytes: number;
          tipo: string;
          titulo: string;
        };
        Insert: {
          conteudo: string;
          created_at?: string;
          filename: string;
          formato?: string;
          gerado_em?: string;
          gerado_por_nome?: string | null;
          gerado_por_user_id?: string | null;
          id?: string;
          project_id?: string;
          size_bytes?: number;
          tipo: string;
          titulo: string;
        };
        Update: {
          conteudo?: string;
          created_at?: string;
          filename?: string;
          formato?: string;
          gerado_em?: string;
          gerado_por_nome?: string | null;
          gerado_por_user_id?: string | null;
          id?: string;
          project_id?: string;
          size_bytes?: number;
          tipo?: string;
          titulo?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          category: string;
          description: string | null;
          input_type: string;
          key: string;
          label: string;
          project_id: string | null;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          category: string;
          description?: string | null;
          input_type: string;
          key: string;
          label: string;
          project_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          category?: string;
          description?: string | null;
          input_type?: string;
          key?: string;
          label?: string;
          project_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      tarefas_alunos: {
        Row: {
          agendamento_id: string;
          aluno_id: string;
          atividade_id: string;
          completou: boolean;
          observacao: string | null;
          project_id: string;
          registrado_em: string;
        };
        Insert: {
          agendamento_id: string;
          aluno_id: string;
          atividade_id: string;
          completou?: boolean;
          observacao?: string | null;
          project_id?: string;
          registrado_em?: string;
        };
        Update: {
          agendamento_id?: string;
          aluno_id?: string;
          atividade_id?: string;
          completou?: boolean;
          observacao?: string | null;
          project_id?: string;
          registrado_em?: string;
        };
        Relationships: [];
      };
      turmas: {
        Row: {
          cod: string;
          created_at: string;
          curso_id: string;
          data: string;
          descricao: string | null;
          horarios: Json;
          id: string;
          nome: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          cod: string;
          created_at?: string;
          curso_id: string;
          data: string;
          descricao?: string | null;
          horarios?: Json;
          id?: string;
          nome: string;
          project_id?: string;
          updated_at?: string;
        };
        Update: {
          cod?: string;
          created_at?: string;
          curso_id?: string;
          data?: string;
          descricao?: string | null;
          horarios?: Json;
          id?: string;
          nome?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      viewer_dependentes: {
        Row: {
          aluno_id: string;
          created_at: string;
          id: string;
          viewer_user_id: string;
        };
        Insert: {
          aluno_id: string;
          created_at?: string;
          id?: string;
          viewer_user_id: string;
        };
        Update: {
          aluno_id?: string;
          created_at?: string;
          id?: string;
          viewer_user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      current_project_id: { Args: Record<string, never>; Returns: string };
      get_projeto_javis_id: { Args: Record<string, never>; Returns: string };
      has_project_access: { Args: { p: string }; Returns: boolean };
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      is_viewer_of: { Args: { _aluno_id: string; _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "coordenacao" | "professor" | "aluno" | "viewer" | "super_admin";
      atividade_tipo: "aula" | "tarefa";
      dia_semana: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
      status_agendamento: "pendente" | "concluido";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coordenacao", "professor", "aluno", "viewer", "super_admin"],
      atividade_tipo: ["aula", "tarefa"],
      dia_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
      status_agendamento: ["pendente", "concluido"],
    },
  },
} as const;
