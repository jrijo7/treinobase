import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, Home as HomeIcon, TrendingUp, Users, UserPlus, 
  Settings, Award, RefreshCw, Layers, Sparkles 
} from 'lucide-react';
import { User, Workout, WorkoutSession, Student } from './types';
import { INITIAL_WORKOUTS, INITIAL_STUDENTS, getStoredData, setStoredData } from './mockData';

// Component Imports
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import BlockEditor from './components/BlockEditor';
import WorkoutExecution from './pages/WorkoutExecution';
import ProgressDashboard from './pages/ProgressDashboard';
import PersonalDashboard from './pages/PersonalDashboard';
import InvitationVincular from './pages/InvitationVincular';
import SettingsDropdown from './components/SettingsDropdown';
import { supabase } from './services/supabaseClient';

export default function App() {
  // State variables synchronized with LocalStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getStoredData<User | null>('tb_user', null);
  });

  const [workouts, setWorkouts] = useState<Workout[]>(() => {
    return getStoredData<Workout[]>('tb_workouts', INITIAL_WORKOUTS);
  });

  const [sessions, setSessions] = useState<WorkoutSession[]>(() => {
    return getStoredData<WorkoutSession[]>('tb_sessions', []);
  });

  const [students, setStudents] = useState<Student[]>(() => {
    return getStoredData<Student[]>('tb_students', INITIAL_STUDENTS);
  });

  // Navigation states
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' ? 'home' : location.pathname.substring(1);
  const [currentView, setCurrentView] = useState<'app' | 'editor' | 'execution'>('app');

  // Active workout to edit / execute
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [executingWorkout, setExecutingWorkout] = useState<Workout | null>(null);

  // Sync to LocalStorage on updates
  useEffect(() => {
    setStoredData('tb_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    setStoredData('tb_workouts', workouts);
  }, [workouts]);

  useEffect(() => {
    setStoredData('tb_sessions', sessions);
  }, [sessions]);

  useEffect(() => {
    setStoredData('tb_students', students);
  }, [students]);

  // Global Auth State Listener
  useEffect(() => {
    const fetchProfile = async (userId: string, email: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          setCurrentUser({
            id: userId,
            name: profile.full_name || email.split('@')[0],
            role: profile.role as 'personal' | 'aluno',
            baseRole: profile.role as 'personal' | 'aluno',
            email: profile.email,
            avatar: profile.avatar_url || '',
            code: profile.role === 'personal' ? 'TB-PROF-99' : 'TB-ALU-42',
          });
        }
      } catch (err) {
        console.error('Error fetching profile on auth change', err);
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !currentUser) {
        fetchProfile(session.user.id, session.user.email || '');
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

  // Handle onboarding completion
  const handleOnboardingComplete = (user: User) => {
    if (user.role === 'aluno' && !user.personalId) {
      user.personalId = 'personal-mock-123';
      user.personalName = 'JoÃ£o Profissional';
      user.personalPhone = '5511999999999';
      user.personalAvatar = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=200';
      user.weeklyGoal = 4;
    }
    setCurrentUser(user);
    navigate('/');
    setCurrentView('app');
  };

  // Switch role directly from UI (Pragmatic trainer/athlete dual-nature)
  const handleToggleRole = () => {
    if (!currentUser) return;
    const newRole = currentUser.role === 'personal' ? 'aluno' : 'personal';
    setCurrentUser({
      ...currentUser,
      role: newRole
    });
    navigate('/');
  };

  // Workout Editor handlers
  const handleOpenEditorNew = () => {
    setEditingWorkout(null);
    setCurrentView('editor');
  };

  const handleOpenEditorEdit = (workout: Workout) => {
    setEditingWorkout(workout);
    setCurrentView('editor');
  };

  const handleSaveWorkout = (savedWorkout: Workout) => {
    // Check if editing or creating
    const exists = workouts.some(w => w.id === savedWorkout.id);
    if (exists) {
      setWorkouts(workouts.map(w => w.id === savedWorkout.id ? savedWorkout : w));
    } else {
      setWorkouts([...workouts, savedWorkout]);
    }
    
    // If assigned to a student, link it there
    setEditingWorkout(null);
    setCurrentView('app');
  };

  const handleDeleteWorkout = (id: string) => {
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  // Workout Execution handlers
  const handleStartWorkout = (workout: Workout) => {
    navigate(`/treino/${workout.id}/executar`, { state: { workout } });
  };

  const handleFinishWorkoutExecution = (completedSession: WorkoutSession) => {
    // Add completed session to logs list
    setSessions([...sessions, completedSession]);

    // Update the corresponding student's completed stats if the current user is an Aluno linked
    if (currentUser && currentUser.role === 'aluno') {
      // Simulate adding 1 count to executed
      const updatedStudents = students.map(st => {
        if (st.code === currentUser.code || st.id === 'st-1') {
          const newCount = st.executedCount + 1;
          const ratio = st.prescribedCount > 0 ? Math.round((newCount / st.prescribedCount) * 100) : 100;
          return {
            ...st,
            executedCount: newCount,
            adherence: Math.min(100, ratio),
            lastWorkoutDate: new Date().toISOString().split('T')[0]
          };
        }
        return st;
      });
      setStudents(updatedStudents);
    }

    setExecutingWorkout(null);
    setCurrentView('app');
    navigate('/'); // return to homepage
  };

  // Personal trainer student prescription routing
  const handlePrescribeToStudent = (student: Student) => {
    // Create pre-named workout for student
    const defaultWorkout: Workout = {
      id: `w-${Date.now()}`,
      name: `Treino Prescrito p/ ${student.name.split(' ')[0]}`,
      description: `PeriodizaÃ§Ã£o de treino montada pelo Prof. ${currentUser?.name.split(' ')[0]}.`,
      creatorId: currentUser?.id || 'personal-1',
      createdAt: new Date().toISOString(),
      blocks: [
        {
          id: `b-${Date.now()}`,
          type: 'straight',
          name: 'Bloco 1 - Base de ForÃ§a',
          exercises: []
        }
      ]
    };
    setEditingWorkout(defaultWorkout);
    setCurrentView('editor');
  };

  // Add linked student by code on personal view
  const handleAddNewStudent = (code: string) => {
    // Find if student is already in list (or pendings) and toggle activation
    const updated = students.map(st => {
      if (st.code === code) {
        return {
          ...st,
          name: st.name.replace(' (Pendente)', ''),
          adherence: 75, // initial healthy average
          prescribedCount: 8,
          executedCount: 6
        };
      }
      return st;
    });
    setStudents(updated);
  };

  // Link trainer on student view
  const handleLinkTrainer = (trainerCode: string) => {
    // Simulates accepting the link from student dashboard
  };

  // Logout/Reset data helper
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error', e);
    }
    localStorage.clear();
    setCurrentUser(null);
    setWorkouts(INITIAL_WORKOUTS);
    setSessions([]);
    setStudents(INITIAL_STUDENTS);
    navigate('/');
    setCurrentView('app');
  };

  // Render correct view based on App states
  if (!currentUser) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div id="app-root" className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-lime-500 selection:text-zinc-950 relative flex flex-col justify-between w-full">
      
      {/* 1. CORE VIEWS SWITCH */}
      {currentView === 'editor' ? (
        <BlockEditor 
          workoutToEdit={editingWorkout}
          onSave={handleSaveWorkout}
          onCancel={() => {
            setEditingWorkout(null);
            setCurrentView('app');
          }}
        />
      ) : (
        /* STANDARD APP TAB SHELL WITH RESPONSIVE TOP BAR AND MOBILE BOTTOM FOOTER */
        <>
          {/* Top Global Bar */}
          <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 z-20 w-full">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center text-zinc-950 font-black text-lg tracking-tighter">TB</div>
                <span className="font-sora font-extrabold text-sm sm:text-base tracking-tight text-zinc-100">
                  TREINO<span className="text-lime-500">BASE</span>
                </span>
              </div>

              {/* Desktop/Tablet Main Tab Navigation (Hidden on Mobile) */}
              <nav className="hidden md:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                <button
                  onClick={() => navigate('/')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold font-sora transition-all ${
                    activeTab === 'home' 
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/10' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 stroke-[2]" />
                  <span>InÃ­cio</span>
                </button>

                <button
                  onClick={() => navigate('/progress')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold font-sora transition-all ${
                    activeTab === 'progress' 
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/10' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 stroke-[2]" />
                  <span>EvoluÃ§Ã£o</span>
                </button>

                {currentUser.role === 'personal' ? (
                  <button
                    onClick={() => navigate('/personal')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold font-sora transition-all ${
                      activeTab === 'personal' 
                        ? 'bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/10' 
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4 stroke-[2]" />
                    <span>Alunos</span>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/vincular')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold font-sora transition-all ${
                      activeTab === 'vincular' 
                        ? 'bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/10' 
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 stroke-[2]" />
                    <span>Vincular</span>
                  </button>
                )}
              </nav>

              {/* Quick settings: Reset & Toggle Role */}
              <div className="flex items-center gap-2">
                {currentUser.baseRole === 'personal' && (
                  <button
                    id="toggle-role-btn"
                    onClick={handleToggleRole}
                    className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                    title="Alternar entre Aluno e Treinador"
                  >
                  <RefreshCw className="w-3.5 h-3.5 text-lime-500" />
                  <span>{currentUser.role === 'personal' ? 'VisÃ£o Prof.' : 'VisÃ£o Atleta'}</span>
                </button>
              )}

              <SettingsDropdown 
                user={currentUser}
                onLogout={handleLogout}
                onUpdateUser={(updates) => setCurrentUser({ ...currentUser, ...updates })}
              />
            </div>
            </div>
          </header>

          {/* Main scrollable body */}
          <main className="flex-1 w-full overflow-y-auto">
            <Outlet context={{
              user: currentUser,
              currentUser,
              workouts,
              sessions,
              students,
              activeWorkoutId: executingWorkout?.id,
              onStartWorkout: handleStartWorkout,
              onCreateNewWorkout: handleOpenEditorNew,
              onDeleteWorkout: handleDeleteWorkout,
              onUpdateUser: (updatedUser: any) => setCurrentUser(updatedUser),
              onPrescribeWorkoutToStudent: handlePrescribeToStudent,
              onLinkTrainer: handleLinkTrainer
            }} />
          </main>

          {/* 2. DYNAMIC MOBILE NAVIGATION FOOTER (Only on Mobile) */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 px-6 py-2.5 flex items-center justify-around z-20 shadow-[0_-8px_20px_rgba(0,0,0,0.4)]">
            
            {/* Home Tab */}
            <button
              id="nav-home-btn"
              onClick={() => navigate('/')}
              className={`flex flex-col items-center gap-1.5 py-1 text-center transition-all ${
                activeTab === 'home' ? 'text-lime-electric' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <HomeIcon className="w-5 h-5 stroke-[2]" />
              <span className="text-[9px] font-bold uppercase tracking-wider font-sora">InÃ­cio</span>
              {activeTab === 'home' && <span className="w-5 h-0.5 bg-lime-electric rounded-full mt-0.5" />}
            </button>

            {/* Progress Tab */}
            <button
              id="nav-progress-btn"
              onClick={() => navigate('/progress')}
              className={`flex flex-col items-center gap-1.5 py-1 text-center transition-all ${
                activeTab === 'progress' ? 'text-lime-electric' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <TrendingUp className="w-5 h-5 stroke-[2]" />
              <span className="text-[9px] font-bold uppercase tracking-wider font-sora">EvoluÃ§Ã£o</span>
              {activeTab === 'progress' && <span className="w-5 h-0.5 bg-lime-electric rounded-full mt-0.5" />}
            </button>

            {/* Conditionally rendered Trainer panel or Invitation panel */}
            {currentUser.role === 'personal' ? (
              <button
                id="nav-personal-btn"
                onClick={() => navigate('/personal')}
                className={`flex flex-col items-center gap-1.5 py-1 text-center transition-all ${
                  activeTab === 'personal' ? 'text-lime-electric' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Users className="w-5 h-5 stroke-[2]" />
                <span className="text-[9px] font-bold uppercase tracking-wider font-sora">Alunos</span>
                {activeTab === 'personal' && <span className="w-5 h-0.5 bg-lime-electric rounded-full mt-0.5" />}
              </button>
            ) : (
              <button
                id="nav-vincular-btn"
                onClick={() => navigate('/vincular')}
                className={`flex flex-col items-center gap-1.5 py-1 text-center transition-all ${
                  activeTab === 'vincular' ? 'text-lime-electric' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <UserPlus className="w-5 h-5 stroke-[2]" />
                <span className="text-[9px] font-bold uppercase tracking-wider font-sora">Vincular</span>
                {activeTab === 'vincular' && <span className="w-5 h-0.5 bg-lime-electric rounded-full mt-0.5" />}
              </button>
            )}
          </nav>
        </>
      )}

    </div>
  );
}


