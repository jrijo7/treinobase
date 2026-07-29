import { Exercise, Student, Workout, WorkoutSession, ExerciseHistory } from './types';

export const INITIAL_EXERCISES: Exercise[] = [
  { id: 'ex-1', name: 'Supino Reto com Barra', category: 'Peito', equipment: 'Barra' },
  { id: 'ex-2', name: 'Supino Inclinado com Halteres', category: 'Peito', equipment: 'Halteres' },
  { id: 'ex-3', name: 'Agachamento Livre', category: 'Pernas', equipment: 'Barra' },
  { id: 'ex-4', name: 'Leg Press 45°', category: 'Pernas', equipment: 'Máquina' },
  { id: 'ex-5', name: 'Puxada Alta na Polia', category: 'Costas', equipment: 'Polia' },
  { id: 'ex-6', name: 'Remada Curvada com Barra', category: 'Costas', equipment: 'Barra' },
  { id: 'ex-7', name: 'Rosca Direta com Halteres', category: 'Bíceps', equipment: 'Halteres' },
  { id: 'ex-8', name: 'Tríceps Pulley com Corda', category: 'Tríceps', equipment: 'Polia' },
  { id: 'ex-9', name: 'Elevação Lateral com Halteres', category: 'Ombros', equipment: 'Halteres' },
  { id: 'ex-10', name: 'Cadeira Extensora', category: 'Pernas', equipment: 'Máquina' },
  { id: 'ex-11', name: 'Cadeira Flexora', category: 'Pernas', equipment: 'Máquina' },
  { id: 'ex-12', name: 'Desenvolvimento com Halteres', category: 'Ombros', equipment: 'Halteres' },
  { id: 'ex-13', name: 'Crucifixo Reto com Halteres', category: 'Peito', equipment: 'Halteres' },
  { id: 'ex-14', name: 'Panturrilha em Pé na Máquina', category: 'Pernas', equipment: 'Máquina' },
];

export const INITIAL_WORKOUTS: Workout[] = [
  {
    id: 'w-1',
    name: 'Treino A - Hipertrofia Peito & Costas',
    description: 'Foco em volume progressivo e agrupamentos intensos (Bi-sets).',
    creatorId: 'personal-1',
    createdAt: '2026-07-10T14:30:00Z',
    blocks: [
      {
        id: 'b-1',
        type: 'biset',
        name: 'Bloco 1 - Bi-set Costas (Puxada + Remada)',
        notes: 'Sem descanso entre o exercício 1 e o 2. Descanso de 90s após completar o par.',
        exercises: [
          {
            id: 'ei-1',
            exercise: INITIAL_EXERCISES[4], // Puxada Alta
            sets: [
              { id: 's-1', setNumber: 1, weight: 60, reps: '10', technique: 'none', rest: 0, rpe: 8 },
              { id: 's-2', setNumber: 2, weight: 65, reps: '10', technique: 'none', rest: 0, rpe: 8 },
              { id: 's-3', setNumber: 3, weight: 70, reps: '8', technique: 'none', rest: 0, rpe: 9 },
            ]
          },
          {
            id: 'ei-2',
            exercise: INITIAL_EXERCISES[5], // Remada Curvada
            sets: [
              { id: 's-4', setNumber: 1, weight: 50, reps: '12', technique: 'none', rest: 90, rpe: 8 },
              { id: 's-5', setNumber: 2, weight: 55, reps: '10', technique: 'none', rest: 90, rpe: 8 },
              { id: 's-6', setNumber: 3, weight: 60, reps: '8', technique: 'none', rest: 90, rpe: 9 },
            ]
          }
        ]
      },
      {
        id: 'b-2',
        type: 'straight',
        name: 'Bloco 2 - Supino Reto com Barra',
        notes: 'Série reta com descanso progressivo para ganho de força.',
        exercises: [
          {
            id: 'ei-3',
            exercise: INITIAL_EXERCISES[0], // Supino Reto
            sets: [
              { id: 's-7', setNumber: 1, weight: 80, reps: '10', technique: 'none', rest: 90, rpe: 8 },
              { id: 's-8', setNumber: 2, weight: 85, reps: '8', technique: 'none', rest: 105, rpe: 9 }, // Descanso progressivo
              { id: 's-9', setNumber: 3, weight: 90, reps: '6', technique: 'none', rest: 120, rpe: 10 }, // Descanso progressivo
            ]
          }
        ]
      },
      {
        id: 'b-3',
        type: 'drop',
        name: 'Bloco 3 - Isolador Peito com Drop-set Final',
        notes: 'Última série realizar técnica Drop-set reduzindo 30% da carga após falhar.',
        exercises: [
          {
            id: 'ei-4',
            exercise: INITIAL_EXERCISES[12], // Crucifixo
            sets: [
              { id: 's-10', setNumber: 1, weight: 18, reps: '12', technique: 'none', rest: 60, rpe: 8 },
              { id: 's-11', setNumber: 2, weight: 18, reps: '12', technique: 'none', rest: 60, rpe: 8 },
              { id: 's-12', setNumber: 3, weight: 18, reps: '10', technique: 'drop', rest: 75, rpe: 10 },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'w-2',
    name: 'Treino B - Inferiores & Quadríceps Explosivo',
    description: 'Foco na cadeia anterior, com técnica rest-pause e alta intensidade.',
    creatorId: 'personal-1',
    createdAt: '2026-07-11T09:00:00Z',
    blocks: [
      {
        id: 'b-4',
        type: 'straight',
        name: 'Bloco 1 - Agachamento Livre',
        notes: 'Foco em amplitude máxima.',
        exercises: [
          {
            id: 'ei-5',
            exercise: INITIAL_EXERCISES[2], // Agachamento Livre
            sets: [
              { id: 's-13', setNumber: 1, weight: 100, reps: '10', technique: 'none', rest: 120, rpe: 8 },
              { id: 's-14', setNumber: 2, weight: 110, reps: '8', technique: 'none', rest: 120, rpe: 9 },
              { id: 's-15', setNumber: 3, weight: 120, reps: '6', technique: 'none', rest: 150, rpe: 9.5 },
            ]
          }
        ]
      },
      {
        id: 'b-5',
        type: 'restpause',
        name: 'Bloco 2 - Cadeira Extensora (Rest-Pause)',
        notes: 'Na última série, após falhar, descansar 15s e fazer mais reps com a mesma carga.',
        exercises: [
          {
            id: 'ei-6',
            exercise: INITIAL_EXERCISES[9], // Cadeira Extensora
            sets: [
              { id: 's-16', setNumber: 1, weight: 50, reps: '12', technique: 'none', rest: 60, rpe: 8 },
              { id: 's-17', setNumber: 2, weight: 60, reps: '12', technique: 'none', rest: 60, rpe: 8 },
              { id: 's-18', setNumber: 3, weight: 70, reps: '10', technique: 'rest-pause', rest: 90, rpe: 10 },
            ]
          }
        ]
      }
    ]
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'st-1',
    name: 'Bernardo Silva',
    email: 'bernardo.silva@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    code: 'TB-8843',
    adherence: 92,
    prescribedCount: 12,
    executedCount: 11,
    lastWorkoutDate: '2026-07-11',
    workouts: [INITIAL_WORKOUTS[0]]
  },
  {
    id: 'st-2',
    name: 'Carolina Mendes',
    email: 'carol.mendes@uol.com.br',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    code: 'TB-1205',
    adherence: 83,
    prescribedCount: 12,
    executedCount: 10,
    lastWorkoutDate: '2026-07-12',
    workouts: [INITIAL_WORKOUTS[1]]
  },
  {
    id: 'st-3',
    name: 'Gabriel Costa',
    email: 'gabriel.costa@outlook.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    code: 'TB-4391',
    adherence: 66,
    prescribedCount: 12,
    executedCount: 8,
    lastWorkoutDate: '2026-07-08',
    workouts: []
  },
  {
    id: 'st-4',
    name: 'Daniela Azevedo (Pendente)',
    email: 'dani.azevedo@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    code: 'TB-9218',
    adherence: 0,
    prescribedCount: 0,
    executedCount: 0,
    workouts: []
  }
];

export const INITIAL_HISTORY: ExerciseHistory[] = [
  {
    exerciseId: 'ex-1',
    exerciseName: 'Supino Reto com Barra',
    history: [
      { date: '2026-06-15', maxWeight: 70, volume: 2100, estimated1RM: 93 },
      { date: '2026-06-22', maxWeight: 75, volume: 2250, estimated1RM: 100 },
      { date: '2026-06-29', maxWeight: 80, volume: 2400, estimated1RM: 106 },
      { date: '2026-07-06', maxWeight: 85, volume: 2550, estimated1RM: 113 },
      { date: '2026-07-12', maxWeight: 90, volume: 2700, estimated1RM: 120 },
    ]
  },
  {
    exerciseId: 'ex-3',
    exerciseName: 'Agachamento Livre',
    history: [
      { date: '2026-06-12', maxWeight: 90, volume: 2700, estimated1RM: 120 },
      { date: '2026-06-19', maxWeight: 100, volume: 3000, estimated1RM: 133 },
      { date: '2026-06-26', maxWeight: 105, volume: 3150, estimated1RM: 140 },
      { date: '2026-07-03', maxWeight: 110, volume: 3300, estimated1RM: 146 },
      { date: '2026-07-10', maxWeight: 120, volume: 3600, estimated1RM: 160 },
    ]
  },
  {
    exerciseId: 'ex-5',
    exerciseName: 'Puxada Alta na Polia',
    history: [
      { date: '2026-06-10', maxWeight: 50, volume: 1500, estimated1RM: 66 },
      { date: '2026-06-17', maxWeight: 55, volume: 1650, estimated1RM: 73 },
      { date: '2026-06-24', maxWeight: 60, volume: 1800, estimated1RM: 80 },
      { date: '2026-07-01', maxWeight: 65, volume: 1950, estimated1RM: 86 },
      { date: '2026-07-08', maxWeight: 70, volume: 2100, estimated1RM: 93 },
    ]
  }
];

// Helper to interact with LocalStorage
export function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Error reading localStorage key', key, e);
    return defaultValue;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing localStorage key', key, e);
  }
}
