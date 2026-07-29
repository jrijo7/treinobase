export interface User {
  id: string;
  name: string;
  role: 'personal' | 'aluno';
  baseRole?: 'personal' | 'aluno';
  email: string;
  avatar?: string;
  code?: string; // Invitation code for linking
  personalId?: string;
  personalName?: string;
  personalPhone?: string;
  personalAvatar?: string;
  weeklyGoal?: number;
  limite_alunos?: number;
  status_plano?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  code: string;
  adherence: number; // percentage of prescribed workouts completed
  prescribedCount: number;
  executedCount: number;
  lastWorkoutDate?: string;
  workouts: Workout[];
}

export interface Exercise {
  id: string;
  name: string;
  category: string; // Peito, Costas, Quadríceps, Bíceps, etc.
  equipment: string; // Halter, Barra, Polia, Máquina, Peso Corporal
  isCustom?: boolean;
}

export type BlockType = 'straight' | 'superset' | 'biset' | 'triset' | 'drop' | 'restpause' | 'circuit' | 'pyramid';

export interface SetItem {
  id: string;
  setNumber: number;
  weight: number; // prescribed weight in kg
  reps: string; // prescribed reps (e.g. "8-12", "10", "Até a falha")
  technique: 'none' | 'drop' | 'rest-pause' | 'cluster' | 'myo-reps' | 'partial' | 'isometry';
  rest: number; // rest time in seconds (supporting progressive rest per set)
  rpe?: number; // Rate of Perceived Exertion (1-10) or RIR (reps in reserve)
  completed?: boolean;
  executedWeight?: number;
  executedReps?: number;
}

export interface ExerciseItem {
  id: string;
  exercise: Exercise;
  sets: SetItem[];
}

export interface WorkoutBlock {
  id: string;
  type: BlockType;
  name: string; // E.g., "Bloco A - Bi-set Costas"
  exercises: ExerciseItem[];
  notes?: string;
}

export interface Workout {
  id: string;
  name: string; // E.g., "Treino A - Superiores"
  description?: string;
  blocks?: WorkoutBlock[]; // Retido para retrocompatibilidade
  creatorId: string;
  createdAt: string;
  estrutura?: any;
  conteudo?: any;
  blocos?: number;
  exercicios?: number;
  aluno_id?: string | null;
  data_validade?: string | null;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  blocks?: WorkoutBlock[];
  completed: boolean;
  carga_total_kg?: number;
  detalhes_execucao?: string | any;
  data_execucao?: string;
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  history: {
    date: string;
    maxWeight: number;
    volume: number; // sum of weight * reps
    estimated1RM: number; // maxWeight * (1 + reps/30) or similar formula
  }[];
}
