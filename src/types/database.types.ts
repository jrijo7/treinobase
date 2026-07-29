export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: Database['public']['Enums']['user_role']
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: Database['public']['Enums']['user_role']
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: Database['public']['Enums']['user_role']
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      trainer_invites: {
        Row: {
          id: string
          trainer_id: string
          token: string
          student_email: string | null
          status: 'pending' | 'accepted' | 'revoked' | 'expired'
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          token: string
          student_email?: string | null
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          trainer_id?: string
          token?: string
          student_email?: string | null
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_invites_trainer_id_fkey"
            columns: ["trainer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      personal_aluno: {
        Row: {
          id: string
          created_at: string
          personal_id: string
          aluno_id: string
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          personal_id: string
          aluno_id: string
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          personal_id?: string
          aluno_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_aluno_aluno_id_fkey"
            columns: ["aluno_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_aluno_personal_id_fkey"
            columns: ["personal_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      exercises: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          muscle_group: string | null
          video_url: string | null
          image_url: string | null
          personal_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          muscle_group?: string | null
          video_url?: string | null
          image_url?: string | null
          personal_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          muscle_group?: string | null
          video_url?: string | null
          image_url?: string | null
          personal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_personal_id_fkey"
            columns: ["personal_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      treinos: {
        Row: {
          id: string
          created_at: string
          titulo: string
          descricao: string | null
          personal_id: string
          aluno_id: string | null
          blocos: number | null
          exercicios: number | null
          estrutura: Json | null
          conteudo: Json | null
          data_validade: string | null
          validade_semanas: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          titulo: string
          descricao?: string | null
          personal_id: string
          aluno_id?: string | null
          blocos?: number | null
          exercicios?: number | null
          estrutura?: Json | null
          conteudo?: Json | null
          data_validade?: string | null
          validade_semanas?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          titulo?: string
          descricao?: string | null
          personal_id?: string
          aluno_id?: string | null
          blocos?: number | null
          exercicios?: number | null
          estrutura?: Json | null
          conteudo?: Json | null
          data_validade?: string | null
          validade_semanas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treinos_aluno_id_fkey"
            columns: ["aluno_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_personal_id_fkey"
            columns: ["personal_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      sessoes: {
        Row: {
          id: string
          created_at: string
          aluno_id: string
          treino_id: string | null
          treino_nome: string | null
          started_at: string
          finished_at: string | null
          blocks: Json | null
          completed: boolean
          personal_id: string | null
          data_execucao: string | null
          carga_total_kg: number | null
          duracao_minutos: number | null
          detalhes_execucao: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          aluno_id: string
          treino_id?: string | null
          treino_nome?: string | null
          started_at?: string
          finished_at?: string | null
          blocks?: Json | null
          completed?: boolean
          personal_id?: string | null
          data_execucao?: string | null
          carga_total_kg?: number | null
          duracao_minutos?: number | null
          detalhes_execucao?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          aluno_id?: string
          treino_id?: string | null
          treino_nome?: string | null
          started_at?: string
          finished_at?: string | null
          blocks?: Json | null
          completed?: boolean
          personal_id?: string | null
          data_execucao?: string | null
          carga_total_kg?: number | null
          duracao_minutos?: number | null
          detalhes_execucao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_aluno_id_fkey"
            columns: ["aluno_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'personal' | 'aluno'
      block_type: 'normal' | 'bi_set' | 'tri_set' | 'drop_set' | 'rest_pause' | 'cluster'
    }
  }
}
