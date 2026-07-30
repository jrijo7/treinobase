import { supabase } from './supabaseClient';
import { User, Student } from '../types';

export const userService = {
  async getStudentsByPersonal(personalId: string) {
    return await supabase
      .from('personal_aluno')
      .select('aluno_id')
      .eq('personal_id', personalId)
      .eq('status', 'ativo');
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    return await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
  }
};
