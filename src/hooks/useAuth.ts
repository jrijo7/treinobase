import { useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

export function useAuth(initialUser: User | null) {
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);

  useEffect(() => {
    const fetchProfile = async (userId: string, email: string) => {
      try {
        const { data: profile } = await authService.getProfile(userId);
          if (profile) {
          const prof = profile as any;
          setCurrentUser({
            id: userId,
            name: prof.full_name || email.split('@')[0],
            role: prof.role as 'personal' | 'aluno',
            baseRole: prof.role as 'personal' | 'aluno',
            email: prof.email,
            avatar: prof.avatar_url || '',
            code: prof.role === 'personal' ? 'TB-PROF-99' : 'TB-ALU-42',
            limite_alunos: prof.limite_alunos,
            status_plano: prof.status_plano
          });
        }
      } catch (err) {
        console.error('Error fetching profile on auth change', err);
      }
    };

    authService.getSession().then(({ data: { session } }) => {
      if (session?.user && !currentUser) {
        fetchProfile(session.user.id, session.user.email || '');
      }
    });

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { currentUser, setCurrentUser };
}

