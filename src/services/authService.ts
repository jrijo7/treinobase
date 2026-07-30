import { supabase } from './supabaseClient';

export const authService = {
  async getSession() {
    return await supabase.auth.getSession();
  },

  async getProfile(userId: string) {
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async signOut() {
    return await supabase.auth.signOut();
  }
};
