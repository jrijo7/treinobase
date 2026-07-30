import { supabase } from './supabaseClient';
import { Workout, WorkoutSession } from '../types';

export const treinoService = {
  async getWorkoutsByStudent(studentId: string) {
    return await supabase
      .from('treinos')
      .select('*')
      .eq('aluno_id', studentId);
  },

  async getSessionsByStudent(studentId: string) {
    return await supabase
      .from('sessoes')
      .select('*')
      .eq('aluno_id', studentId);
  },

  async saveWorkout(workoutData: any) {
    return await supabase
      .from('treinos')
      .upsert(workoutData)
      .select()
      .single();
  },

  async deleteWorkout(workoutId: string) {
    return await supabase
      .from('treinos')
      .delete()
      .eq('id', workoutId);
  }
};
