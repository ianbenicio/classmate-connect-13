export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          atividade_ids: Json
          bloco_index: number
          blocos_total: number
          concluido_em: string | null
          created_at: string
          criado_por_nome: string | null
          criado_por_user_id: string | null
          data: string
          dia_semana: Database["public"]["Enums"]["dia_semana"]
          fim: string
          id: string
          inicio: string
          observacao: string | null
          parte_grupo_id: string | null
          parte_num: number
          partes_total: number
          professor: string | null
          status: Database["public"]["Enums"]["status_agendamento"]
          turma_id: string
          updated_at: string
        }
        Insert: {
          atividade_ids?: Json
          bloco_index?: number
          blocos_total?: number
          concluido_em?: string | null
          created_at?: string
          criado_por_nome?: string | null
          criado_por_user_id?: string | null
          data: string
          dia_semana: Database["public"]["Enums"]["dia_semana"]
          fim: string
          id?: string
          inicio: string
          observacao?: string | null
          parte_grupo_id?: string | null
          parte_num?: number
          partes_total?: number
          professor?: string | null
          status?: Database["public"]["Enums"]["status_agendamento"]
          turma_id: string
          updated_at?: string
        }
        Update: {
          atividade_ids?: Json
          bloco_index?: number
          blocos_total?: number
          concluido_em?: string | null
          created_at?: string
          criado_por_nome?: string | null
          criado_por_user_id?: string | null
          data?: string
          dia_semana?: Database["public"]["Enums"]["dia_semana"]
          fim?: string
          id?: string
          inicio?: string
          observacao?: string | null
          parte_grupo_id?: string | null
          parte_num?: number
          partes_total?: number
          professor?: string | null
          status?: Database["public"]["Enums"]["status_agendamento"]
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      aluno_habilidades: {
        Row: {
          aluno_id: string
          habilidade_id: string
        }
        Insert: {
          aluno_id: string
          habilidade_id: string
        }
        Update: {
          aluno_id?: string
          habilidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aluno_habilidades_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_habilidades_habilidade_id_fkey"
            columns: ["habilidade_id"]
            isOneToOne: false
            referencedRelation: "habilidades"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          contato: string | null
          contato_resp: string | null
          cpf: string | null
          created_at: string
          curso_id: string | null
          id: string
          idade: number | null
          nome: string
          observacao: string | null
          responsavel: string | null
          turma_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contato?: string | null
          contato_resp?: string | null
          cpf?: string | null
          created_at?: string
          curso_id?: string | null
          id?: string
          idade?: number | null
          nome: string
          observacao?: string | null
          responsavel?: string | null
          turma_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contato?: string | null
          contato_resp?: string | null
          cpf?: string | null
          created_at?: string
          curso_id?: string | null
          id?: string
          idade?: number | null
          nome?: string
          observacao?: string | null
          responsavel?: string | null
          turma_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          carga_horaria_min: number
          codigo: string
          created_at: string
          criado_por: string | null
          criterios_sucesso: string | null
          curso_id: string
          descricao: string | null
          descricao_conteudo: string | null
          formularios: Json | null
          grupo: string
          habilidade_ids: Json
          id: string
          instrucoes: string | null
          materiais: Json | null
          metodologias: string | null
          niveis_alvo: Json | null
          nome: string
          notas_instrutor: string | null
          objetivo_resultados: string | null
          prazo: string | null
          pre_requisitos: string | null
          professor: string | null
          referencias: string | null
          resultados_esperados: string | null
          roteiro: Json | null
          rubricas: Json | null
          sugestoes_pais: string | null
          tipo: Database["public"]["Enums"]["atividade_tipo"]
          updated_at: string
        }
        Insert: {
          carga_horaria_min?: number
          codigo: string
          created_at?: string
          criado_por?: string | null
          criterios_sucesso?: string | null
          curso_id: string
          descricao?: string | null
          descricao_conteudo?: string | null
          formularios?: Json | null
          grupo: string
          habilidade_ids?: Json
          id?: string
          instrucoes?: string | null
          materiais?: Json | null
          metodologias?: string | null
          niveis_alvo?: Json | null
          nome: string
          notas_instrutor?: string | null
          objetivo_resultados?: string | null
          prazo?: string | null
          pre_requisitos?: string | null
          professor?: string | null
          referencias?: string | null
          resultados_esperados?: string | null
          roteiro?: Json | null
          rubricas?: Json | null
          sugestoes_pais?: string | null
          tipo: Database["public"]["Enums"]["atividade_tipo"]
          updated_at?: string
        }
        Update: {
          carga_horaria_min?: number
          codigo?: string
          created_at?: string
          criado_por?: string | null
          criterios_sucesso?: string | null
          curso_id?: string
          descricao?: string | null
          descricao_conteudo?: string | null
          formularios?: Json | null
          grupo?: string
          habilidade_ids?: Json
          id?: string
          instrucoes?: string | null
          materiais?: Json | null
          metodologias?: string | null
          niveis_alvo?: Json | null
          nome?: string
          notas_instrutor?: string | null
          objetivo_resultados?: string | null
          prazo?: string | null
          pre_requisitos?: string | null
          professor?: string | null
          referencias?: string | null
          resultados_esperados?: string | null
          roteiro?: Json | null
          rubricas?: Json | null
          sugestoes_pais?: string | null
          tipo?: Database["public"]["Enums"]["atividade_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          agendamento_id: string | null
          aluno_id: string | null
          atividade_id: string | null
          created_at: string
          criado_por_user_id: string | null
          dados: Json
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          agendamento_id?: string | null
          aluno_id?: string | null
          atividade_id?: string | null
          created_at?: string
          criado_por_user_id?: string | null
          dados?: Json
          id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          agendamento_id?: string | null
          aluno_id?: string | null
          atividade_id?: string | null
          created_at?: string
          criado_por_user_id?: string | null
          dados?: Json
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          carga_horaria_total_min: number
          cod: string
          created_at: string
          descricao: string | null
          duracao_aula_min: number
          id: string
          nome: string
          turno_diario_min: number
          updated_at: string
        }
        Insert: {
          carga_horaria_total_min?: number
          cod: string
          created_at?: string
          descricao?: string | null
          duracao_aula_min?: number
          id?: string
          nome: string
          turno_diario_min?: number
          updated_at?: string
        }
        Update: {
          carga_horaria_total_min?: number
          cod?: string
          created_at?: string
          descricao?: string | null
          duracao_aula_min?: number
          id?: string
          nome?: string
          turno_diario_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      grupos: {
        Row: {
          cod: string
          created_at: string
          curso_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cod: string
          created_at?: string
          curso_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cod?: string
          created_at?: string
          curso_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      habilidades: {
        Row: {
          atividade_id: string | null
          created_at: string
          curso_id: string | null
          descricao: string
          grupo: string | null
          id: string
          sigla: string
          tipo: string
          updated_at: string
        }
        Insert: {
          atividade_id?: string | null
          created_at?: string
          curso_id?: string | null
          descricao: string
          grupo?: string | null
          id?: string
          sigla: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          atividade_id?: string | null
          created_at?: string
          curso_id?: string | null
          descricao?: string
          grupo?: string | null
          id?: string
          sigla?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habilidades_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habilidades_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          atividade_ids: Json | null
          created_at: string
          curso_id: string | null
          data: string | null
          destinatario_ref: string | null
          destinatario_tipo: string
          destinatario_user_id: string | null
          fim: string | null
          id: string
          inicio: string | null
          kind: string | null
          lida: boolean
          mensagem: string
          professor: string | null
          titulo: string
          turma_id: string | null
        }
        Insert: {
          atividade_ids?: Json | null
          created_at?: string
          curso_id?: string | null
          data?: string | null
          destinatario_ref?: string | null
          destinatario_tipo: string
          destinatario_user_id?: string | null
          fim?: string | null
          id?: string
          inicio?: string | null
          kind?: string | null
          lida?: boolean
          mensagem: string
          professor?: string | null
          titulo: string
          turma_id?: string | null
        }
        Update: {
          atividade_ids?: Json | null
          created_at?: string
          curso_id?: string | null
          data?: string | null
          destinatario_ref?: string | null
          destinatario_tipo?: string
          destinatario_user_id?: string | null
          fim?: string | null
          id?: string
          inicio?: string | null
          kind?: string | null
          lida?: boolean
          mensagem?: string
          professor?: string | null
          titulo?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      presencas: {
        Row: {
          agendamento_id: string | null
          aluno_id: string
          atividade_id: string
          created_at: string
          id: string
          observacao: string | null
          presente: boolean
          registrado_por_user_id: string | null
          updated_at: string
        }
        Insert: {
          agendamento_id?: string | null
          aluno_id: string
          atividade_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          presente?: boolean
          registrado_por_user_id?: string | null
          updated_at?: string
        }
        Update: {
          agendamento_id?: string | null
          aluno_id?: string
          atividade_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          presente?: boolean
          registrado_por_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presencas_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relatorios: {
        Row: {
          agendamento_id: string
          conteudo: string | null
          created_at: string
          criado_por_user_id: string | null
          dados: Json | null
          id: string
          observacoes: string | null
          professor: string | null
          turma_id: string
          updated_at: string
        }
        Insert: {
          agendamento_id: string
          conteudo?: string | null
          created_at?: string
          criado_por_user_id?: string | null
          dados?: Json | null
          id?: string
          observacoes?: string | null
          professor?: string | null
          turma_id: string
          updated_at?: string
        }
        Update: {
          agendamento_id?: string
          conteudo?: string | null
          created_at?: string
          criado_por_user_id?: string | null
          dados?: Json | null
          id?: string
          observacoes?: string | null
          professor?: string | null
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          cod: string
          created_at: string
          curso_id: string
          data: string
          descricao: string | null
          horarios: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cod: string
          created_at?: string
          curso_id: string
          data: string
          descricao?: string | null
          horarios?: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cod?: string
          created_at?: string
          curso_id?: string
          data?: string
          descricao?: string | null
          horarios?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viewer_dependentes: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          viewer_user_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          viewer_user_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewer_dependentes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_viewer_of: {
        Args: { _aluno_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordenacao" | "professor" | "aluno" | "viewer"
      atividade_tipo: "aula" | "tarefa"
      dia_semana: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom"
      status_agendamento: "pendente" | "concluido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coordenacao", "professor", "aluno", "viewer"],
      atividade_tipo: ["aula", "tarefa"],
      dia_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
      status_agendamento: ["pendente", "concluido"],
    },
  },
} as const
