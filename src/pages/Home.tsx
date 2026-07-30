import React, { useState, useRef } from 'react';
import { 
  Play, Dumbbell, TrendingUp, Calendar, Award, UserPlus, 
  ChevronRight, ChevronDown, ArrowLeft, Plus, Flame, Clock, Heart, Users, Trash2, Trash, Camera, MessageCircle, Zap, Layers, X, Upload, Maximize2, CheckCircle, AlertCircle, Search, Copy
} from 'lucide-react';
import { Workout, User, WorkoutSession, Student } from '../types';
import { supabase } from '../services/supabaseClient';
import CalendarModal from '../components/CalendarModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

const formatarDescanso = (val: string) => {
  if (!val) return '';
  const limpo = val.trim();

  if (/^\d+\.\d+$/.test(limpo) || /^\d+,\d+$/.test(limpo)) {
    return `${limpo.replace(',', '.')} min`;
  }

  if (/^\d+$/.test(limpo)) {
    const num = parseInt(limpo, 10);
    if (num === 60) return '60s (1 min)';
    if (num === 120) return '2 min';
    if (num === 180) return '3 min';
    if (num % 60 === 0 && num >= 60) return `${num / 60} min`;
    return `${num}s`;
  }

  return limpo;
};

interface HomeProps {
  user: User;
  workouts: Workout[];
  sessions: WorkoutSession[];
  students?: Student[];
  activeWorkoutId?: string;
  onStartWorkout: (workout: Workout) => void;
  onCreateNewWorkout: () => void;
  onDeleteWorkout: (id: string) => void | Promise<void>;
  onNavigateToTab: (tab: string) => void;
  onUpdateUser: (user: User) => void;
}

const getMetodoConfig = (tipo: string) => {
  if (['Drop-set', 'Rest-pause', 'Set 21', 'Parciais', 'ForÃ§ada', 'ExaustÃ£o'].includes(tipo)) {
    return { 
      tipo, 
      arquetipo: 'intensificacao', 
      config: tipo === 'Drop-set' ? { qtd_drops: 2 } : tipo === 'Rest-pause' ? { pausa: 15 } : {} 
    };
  }
  if (['PirÃ¢mide Crescente', 'PirÃ¢mide Decrescente'].includes(tipo)) {
    return { tipo, arquetipo: 'piramide', config: { series_setup: [] } };
  }
  if (['GVT', 'FST-7', 'IsomÃ©trico', 'Negativo', 'Super Slow'].includes(tipo)) {
    return { tipo, arquetipo: 'tensao', config: { cadencia: '' } };
  }
  return { tipo: 'Normal', arquetipo: 'normal', config: {} };
};

const calcularDiasParaVencer = (criadoEm: string, validadeStr?: string): number | null => {
  if (!criadoEm) return null;

  // 1. Normaliza a data de criaÃ§Ã£o (suporta tanto ISO "YYYY-MM-DD" quanto "DD/MM/YYYY")
  let dataCriacao: Date;
  if (criadoEm.includes('/')) {
    const [dia, mes, ano] = criadoEm.split('/');
    dataCriacao = new Date(Number(ano), Number(mes) - 1, Number(dia));
  } else {
    dataCriacao = new Date(criadoEm);
  }

  if (isNaN(dataCriacao.getTime())) return null;

  // 2. Extrai os dias da string de validade (ex: "4 semanas (1 mÃªs)" -> 30 dias)
  let diasValidade = 30; // PadrÃ£o 30 dias se nÃ£o especificado
  if (validadeStr) {
    if (validadeStr.includes('4 semanas') || validadeStr.includes('1 mÃªs')) diasValidade = 30;
    else if (validadeStr.includes('6 semanas')) diasValidade = 42;
    else if (validadeStr.includes('8 semanas') || validadeStr.includes('2 meses')) diasValidade = 60;
    else if (validadeStr.includes('12 semanas') || validadeStr.includes('3 meses')) diasValidade = 90;
    else {
      // Tenta extrair apenas nÃºmeros caso seja uma string customizada
      const nums = validadeStr.match(/\d+/);
      if (nums) diasValidade = Number(nums[0]) * (validadeStr.toLowerCase().includes('semana') ? 7 : 1);
    }
  }

  // 3. Calcula a diferenÃ§a em dias atÃ© o vencimento
  const dataVencimento = new Date(dataCriacao);
  dataVencimento.setDate(dataVencimento.getDate() + diasValidade);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataVencimento.setHours(0, 0, 0, 0);

  const diffTime = dataVencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

import { useOutletContext, useNavigate } from 'react-router-dom';

export default function Home() {
  const { 
    user, 
    workouts, 
    sessions, 
    students = [],
    activeWorkoutId,
    onStartWorkout, 
    onCreateNewWorkout,
    onDeleteWorkout,
    onUpdateUser
  } = useOutletContext<any>();
  const navigate = useNavigate();
  const onNavigateToTab = (tab: string) => navigate(tab === 'home' ? '/' : `/${tab}`);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const [isLoading, setIsLoading] = useState(true);
  const [trainerLink, setTrainerLink] = useState<{name: string, avatar: string | null, phone: string | null} | null>(null);
  const [dynamicWorkouts, setDynamicWorkouts] = useState<Workout[]>([]);
  
  const [dbSessions, setDbSessions] = useState<any[]>([]);
  const [b2bStudents, setB2bStudents] = useState<any[]>([]);
  const [b2bRecentSessions, setB2bRecentSessions] = useState<any[]>([]);
  const [adherenceRate, setAdherenceRate] = useState(0);
  const [treinosCount, setTreinosCount] = useState(0);
  const [expiringWorkouts, setExpiringWorkouts] = useState<any[]>([]);
  
  // Workout List States (B2B)
  const [activeWorkoutTab, setActiveWorkoutTab] = useState<'prescritos' | 'biblioteca'>('prescritos');
  const [selectedFilterStudent, setSelectedFilterStudent] = useState<string>('all');
  const [searchWorkoutQuery, setSearchWorkoutQuery] = useState('');
  
  // Workout Creation Modal States
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [newModelData, setNewModelData] = useState({ title: '', description: '', targetStudent: 'model', validadeSemanas: '4' });
  const [treinoEmEdicao, setTreinoEmEdicao] = useState<any>(null);
  
  // Dynamic Builder States
  const [divisoesArray, setDivisoesArray] = useState<any[]>([{
    id: crypto.randomUUID(),
    nome: 'Treino A',
    itens: [{ 
      id: crypto.randomUUID(), 
      tipo: 'simples',
      exercicio: '', 
      series: '', 
      reps: '', 
      descanso: '', 
      metodo: getMetodoConfig('Normal'), 
      obs: '' 
    }]
  }]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  
  // Initialize active tab when array changes (if not set)
  React.useEffect(() => {
    if (!activeTabId && divisoesArray.length > 0) {
      setActiveTabId(divisoesArray[0].id);
    }
  }, [divisoesArray, activeTabId]);

  // Workout Assignment States
  const [assigningWorkoutId, setAssigningWorkoutId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteTreino = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId(current => current === id ? null : current);
      }, 3000);
      return;
    }

    setConfirmDeleteId(null);
    const workoutToRestore = dynamicWorkouts.find(w => w.id === id);
    if (!workoutToRestore) return;

    setDynamicWorkouts(prev => prev.filter(w => w.id !== id));
    setTreinosCount(prev => Math.max(0, prev - 1));

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('SessÃ£o de autenticaÃ§Ã£o ausente ou expirada!', sessionError);
        throw new Error('SessÃ£o de autenticaÃ§Ã£o expirada. FaÃ§a login novamente.');
      }

      console.log('Tentando excluir o treino com UUID:', id);
      
      const { error } = await supabase
        .from('treinos')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Supabase Error Props:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        throw error;
      }
      
      showToast('Treino excluÃ­do com sucesso.', 'success');
      
      if (onDeleteWorkout) {
          try {
            const result = onDeleteWorkout(id);
            if (result instanceof Promise) {
              await result;
            }
          } catch (propError) {
            console.error('Erro silencioso na callback onDeleteWorkout:', propError);
          }
      }
    } catch (err: any) {
      console.error('Erro ao excluir treino (catch):', err);
      
      if (err.code === '23503') {
          showToast('NÃ£o Ã© possÃ­vel excluir: este treino jÃ¡ possui histÃ³rico de sessÃµes vinculadas.', 'error');
      } else {
          showToast(typeof err.message === 'string' ? err.message : 'Erro ao excluir treino no banco de dados', 'error');
      }
      
      setDynamicWorkouts(prev => [...prev, workoutToRestore]);
      setTreinosCount(prev => prev + 1);
    }
  };

  const handleDuplicateTreino = async (treino: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const payloadClonado = {
        personal_id: treino.creatorId,
        titulo: `${treino.name || (treino as any).titulo} (CÃ³pia)`,
        descricao: treino.description || (treino as any).descricao || '',
        blocos: (treino as any).blocos || 1,
        exercicios: (treino as any).exercicios || 1,
        aluno_id: treino.aluno_id,
        validade_semanas: (treino as any).validade_semanas || null,
        data_validade: treino.data_validade || null,
        estrutura: typeof treino.estrutura === 'string' ? JSON.parse(treino.estrutura) : treino.estrutura
      };

      const { data: treinoClonado, error } = await supabase
        .from('treinos')
        .insert([payloadClonado])
        .select()
        .single();

      if (error) throw error;

      const mappedClone = {
        id: treinoClonado.id,
        name: treinoClonado.titulo,
        description: treinoClonado.descricao || '',
        creatorId: treinoClonado.personal_id,
        createdAt: treinoClonado.created_at,
        aluno_id: treinoClonado.aluno_id,
        blocos: treinoClonado.blocos,
        exercicios: treinoClonado.exercicios,
        data_validade: treinoClonado.data_validade,
        estrutura: treinoClonado.estrutura
      };

      setDynamicWorkouts(prev => [mappedClone, ...prev]);
      setTreinosCount(prev => prev + 1);
      
      showToast('Treino duplicado com sucesso.', 'success');
    } catch (err: any) {
      console.error('Erro ao duplicar treino:', err);
      showToast(`Erro ao duplicar: ${err.message || 'Falha no banco de dados'}`, 'error');
    }
  };
  
  // Workout Details Modal
  const [selectedWorkoutDetails, setSelectedWorkoutDetails] = useState<Workout | any | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  // Click outside logic for avatar menu
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    
    if (isAvatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.addEventListener('mousedown', handleClickOutside);
    };
  }, [isAvatarMenuOpen]);

  // Fetch dynamic data from Supabase
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) return;
      setIsLoading(true);

      try {
        if (user.role === 'aluno') {
          // 1. Fetch trainer link for ALUNOS
          const { data: link, error: linkError } = await supabase
            .from('personal_aluno')
            .select(`
              personal_id,
              profiles!personal_aluno_personal_id_fkey(full_name, avatar_url)
            `)
            .eq('aluno_id', user.id)
            .maybeSingle();

          if (link && !linkError) {
            const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
            if (profile) {
              setTrainerLink({
                name: (profile as any).full_name || 'Personal Vinculado',
                avatar: (profile as any).avatar_url,
                phone: null
              });
            }
          }

          // 2. Fetch workout plans for ALUNOS from 'treinos' table
          const { data: plans, error: plansError } = await supabase
            .from('treinos')
            .select('*')
            .eq('aluno_id', user.id)
            .order('created_at', { ascending: false });

          if (!plansError && plans) {
            const mappedWorkouts = plans.map(p => ({
              id: p.id,
              name: p.titulo,
              description: p.descricao || '',
              creatorId: p.personal_id,
              createdAt: p.created_at,
              blocos: p.blocos || 1,
              exercicios: p.exercicios || 1,
              estrutura: p.estrutura || p.conteudo,
              conteudo: p.conteudo || p.estrutura,
              blocks: [] // Mantenho vazio para nÃ£o quebrar compatibilidade de tipo antigo caso necessÃ¡rio
            }));
            
            if (isMounted) setDynamicWorkouts(mappedWorkouts as any);
          }

          // 3. Fetch Workout Sessions for Aluno
          const { data: sessoes, error: errSessoes } = await supabase
            .from('sessoes')
            .select('*')
            .eq('aluno_id', user.id);
          
          if (!errSessoes && sessoes && isMounted) {
            setDbSessions(sessoes);
          }

        } else {
          // B2B: PROFESSIONAL DASHBOARD DATA
          
          // 1. Fetch Students (2-steps approach)
          const { data: vinculos } = await supabase
            .from('personal_aluno')
            .select('aluno_id, created_at')
            .eq('personal_id', user.id);

          let activeStudentIds: string[] = [];
          let fetchedStudents: any[] = [];
          let currentFilteredPlans: any[] = [];
          
          if (!vinculos || vinculos.length === 0) {
            setB2bStudents([]);
          } else {
            // 2. Busca os nomes na tabela profiles
            const ids = vinculos.map(v => v.aluno_id);
            const { data: perfis } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', ids);

            // 3. Mescla os dados
            fetchedStudents = vinculos.map(v => {
              const perfil = (perfis as any[])?.find(p => p.id === v.aluno_id);
              return {
                ...v,
                name: perfil ? perfil.full_name : 'Aluno',
                id: v.aluno_id
              };
            });

            if (isMounted) setB2bStudents(fetchedStudents);
            activeStudentIds = ids;
          }
          
          // 2. Fetch all GENERAL MODEL workout plans created by this personal
          const { data: b2bPlans, error: b2bPlansError } = await supabase
            .from('treinos')
            .select('*')
            .eq('personal_id', user.id)
            .order('created_at', { ascending: false });
            
          if (!b2bPlansError && b2bPlans && isMounted) {
            // Removendo duplicados de 0 blocos filtrando:
            const filteredPlans = b2bPlans.filter((p: any) => p.blocos > 0);
            currentFilteredPlans = filteredPlans;
            
            // Mapeando todos os treinos (Prescritos e Biblioteca) para manter sincronia com a KPI
            setDynamicWorkouts(filteredPlans.map(p => ({
              id: p.id,
              name: p.titulo,
              description: p.descricao || '',
              creatorId: p.personal_id,
              createdAt: p.created_at,
              blocos: p.blocos || 1,
              exercicios: p.exercicios || 1,
              aluno_id: p.aluno_id,
              data_validade: p.data_validade,
              estrutura: p.estrutura || p.conteudo,
              conteudo: p.conteudo || p.estrutura,
              blocks: []
            })) as any);
            // Fichas a vencer (com aluno_id e data_validade preenchida)
            const today = new Date();
            const expiring = filteredPlans.filter(p => {
              if (!p.aluno_id || !p.data_validade) return false;
              const valDate = new Date(p.data_validade);
              const diffTime = valDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              // Mostrar se estÃ¡ vencido (<= 0) ou se falta 5 dias (<= 5)
              return diffDays <= 5;
            }).map(p => {
              const valDate = new Date(p.data_validade);
              const diffTime = valDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              // Pegar nome do aluno
              const alunoNome = fetchedStudents.find(s => s.id === p.aluno_id)?.name || 'Aluno ExcluÃ­do';
              
              return {
                ...p,
                alunoNome,
                diffDays,
                status: diffDays < 0 ? 'vencido' : 'vencendo'
              };
            });
            
            setExpiringWorkouts(expiring);
          }

          // Count Treinos Prescritos specifically from 'treinos' table as requested
          const { count } = await supabase
            .from('treinos')
            .select('*', { count: 'exact', head: true })
            .eq('personal_id', user.id);
            
          if (isMounted && count !== null) {
            setTreinosCount(count);
          }

          // 3. Fetch Workout Logs (Sessions) for adherence and recent activity
          if (activeStudentIds.length > 0) {
            const { data: logsData, error: logsError } = await supabase
              .from('sessoes')
              .select(`
                *,
                aluno:profiles!aluno_id(name),
                treino:treinos!treino_id(titulo)
              `)
              .in('aluno_id', activeStudentIds)
              .order('data_execucao', { ascending: false });

            if (!logsError && logsData) {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              
              const fiveDaysAgo = new Date();
              fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

              // Calculate adherence based on total sessions in last 7 days vs expected (3 per active student)
              let sessoesRealizadas = 0;
              const lastSessionMap = new Map<string, Date>();
              
              logsData.forEach(log => {
                const logDate = new Date(log.created_at);
                if (logDate >= sevenDaysAgo) {
                  sessoesRealizadas++;
                }
                
                if (!lastSessionMap.has(log.aluno_id)) {
                  lastSessionMap.set(log.aluno_id, logDate);
                }
              });

              // Assuming expected sessions is 3 per active student who has a prescribed workout
              const studentsWithWorkout = fetchedStudents.filter(s => 
                currentFilteredPlans.some(p => p.aluno_id === s.id)
              ).length;
              
              const sessoesPrevistas = studentsWithWorkout * 3;
              
              let rate = 0;
              if (sessoesPrevistas > 0) {
                 rate = Math.round((sessoesRealizadas / sessoesPrevistas) * 100);
                 if (rate > 100) rate = 100;
              }
              if (isMounted) setAdherenceRate(rate);
              
              // Map students with their last session
              const studentsWithStatus = activeStudentIds.map(id => {
                const studentData = fetchedStudents.find(s => s.id === id);
                const nameStr = studentData?.name || 'Aluno';
                
                const lastSession = lastSessionMap.get(id);
                // CRITÃ‰RIO DE DESTAQUE: Aluno teve sessÃ£o nos Ãºltimos 7 dias. Inativo: Sem registro nos Ãºltimos 7 dias.
                const isHighlight = lastSession ? lastSession >= sevenDaysAgo : false;
                
                return {
                  id,
                  name: nameStr,
                  lastSession,
                  isHighlight
                };
              });
              
              if (isMounted) setB2bStudents(studentsWithStatus);
              
              // Mapear sessÃµes recentes (SessÃµes)
              const recents = logsData.filter((log: any) => new Date(log.data_execucao) >= fiveDaysAgo).map((log: any) => {
                return {
                  id: log.id,
                  studentName: log.aluno?.name || 'Aluno',
                  workoutTitle: log.treino?.titulo || 'Treino ConcluÃ­do',
                  date: log.data_execucao
                };
              });
              
              if (isMounted) setB2bRecentSessions(recents);
            }
          } else {
            if (isMounted) {
              setB2bStudents([]);
              setB2bRecentSessions([]);
              setAdherenceRate(0);
            }
          }
        }
      } catch (err) {
        console.error("Error loading home data", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => { isMounted = false; };
  }, [user]);

  const handleAddDivisao = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextLetter = letters[divisoesArray.length % letters.length];
    
    const newId = crypto.randomUUID();
    setDivisoesArray([...divisoesArray, {
      id: newId,
      nome: `Treino ${nextLetter}`,
      itens: [{ id: crypto.randomUUID(), tipo: 'simples', exercicio: '', series: '', reps: '', descanso: '', metodo: 'Normal', obs: '' }]
    }]);
    setActiveTabId(newId);
  };

  const handleRemoveDivisao = (divisaoId: string) => {
    if (divisoesArray.length <= 1) {
      showToast("VocÃª precisa ter pelo menos uma divisÃ£o no programa.", "error");
      return;
    }
    const newArray = divisoesArray.filter(d => d.id !== divisaoId);
    setDivisoesArray(newArray);
    if (activeTabId === divisaoId) setActiveTabId(newArray[0].id);
  };

  const handleUpdateDivisao = (divisaoId: string, campo: string, valor: string) => {
    setDivisoesArray(divisoesArray.map(d => d.id === divisaoId ? { ...d, [campo]: valor } : d));
  };

  const handleAddItem = (divisaoId: string, tipo: 'simples' | 'grupo') => {
    setDivisoesArray(divisoesArray.map(d => {
      if (d.id === divisaoId) {
        let newItem: any;
        if (tipo === 'simples') {
          newItem = { id: crypto.randomUUID(), tipo: 'simples', exercicio: '', series: '', reps: '', descanso: '', metodo: getMetodoConfig('Normal'), obs: '' };
        } else {
          newItem = {
            id: crypto.randomUUID(),
            tipo: 'grupo',
            subtipo: 'Bi-set',
            descansoGlobal: '90s',
            exercicios: [
              { id: crypto.randomUUID(), exercicio: '', series: '', reps: '', descanso: '', metodo: getMetodoConfig('Normal'), obs: '' },
              { id: crypto.randomUUID(), exercicio: '', series: '', reps: '', descanso: '', metodo: getMetodoConfig('Normal'), obs: '' }
            ]
          };
        }
        return { ...d, itens: [...(d.itens || []), newItem] };
      }
      return d;
    }));
  };

  const handleRemoveItem = (divisaoId: string, itemId: string) => {
    setDivisoesArray(divisoesArray.map(d => {
      if (d.id === divisaoId) {
        return { ...d, itens: d.itens.filter((i: any) => i.id !== itemId) };
      }
      return d;
    }));
  };

  const handleUpdateItem = (divisaoId: string, itemId: string, campo: string, valor: any) => {
    setDivisoesArray(divisoesArray.map(d => {
      if (d.id === divisaoId) {
        return { ...d, itens: d.itens.map((i: any) => {
          if (i.id === itemId) {
            let updatedValue = valor;
            let extras = {};
            if (campo === 'metodo') {
               updatedValue = getMetodoConfig(valor);
               // AplicaÃ§Ã£o do ArquÃ©tipo 4 (Travas)
               if (valor === 'GVT') extras = { series: '10', reps: '10', descanso: '60s' };
               if (valor === 'FST-7') extras = { series: '7', descanso: '30s a 45s' };
               if (valor === 'Set 21') extras = { reps: '21' };
            }
            return { ...i, [campo]: updatedValue, ...extras };
          }
          return i;
        }) };
      }
      return d;
    }));
  };

  const handleUpdateItemMetodoConfig = (divisaoId: string, itemId: string, configKey: string, configValue: any) => {
    setDivisoesArray(divisoesArray.map(d => {
      if (d.id === divisaoId) {
        return { ...d, itens: d.itens.map((i: any) => {
          if (i.id === itemId && i.metodo?.config) {
            return { ...i, metodo: { ...i.metodo, config: { ...i.metodo.config, [configKey]: configValue } } };
          }
          return i;
        }) };
      }
      return d;
    }));
  };

  const handleAddSubExercicio = (divisaoId: string, groupId: string) => {
    setDivisoesArray(divisoesArray.map(d => {
      if (d.id === divisaoId) {
        return {
          ...d,
          itens: d.itens.map((i: any) => {
            if (i.id === groupId && i.tipo === 'grupo') {
              return {
                ...i,
                exercicios: [...i.exercicios, { id: crypto.randomUUID(), exercicio: '', series: '', reps: '', descanso: '', metodo: getMetodoConfig('Normal'), obs: '' }]
              };
            }
            return i;
          })
        };
      }
      return d;
    }));
  };

  const handleRemoveSubExercicio = (divisaoId: string, groupId: string, subId: string) => {
    setDivisoesArray(divisoesArray.map(d => {
      if (d.id === divisaoId) {
        return {
          ...d,
          itens: d.itens.map((i: any) => {
            if (i.id === groupId && i.tipo === 'grupo') {
              return { ...i, exercicios: i.exercicios.filter((e: any) => e.id !== subId) };
            }
            return i;
          })
        };
      }
      return d;
    }));
  };

  const handleUpdateSubExercicio = (divisaoId: string, groupId: string, subId: string, campo: string, valor: any) => {
    setDivisoesArray(divisoesArray.map(d => {
      if (d.id === divisaoId) {
        return {
          ...d,
          itens: d.itens.map((i: any) => {
            if (i.id === groupId && i.tipo === 'grupo') {
              return {
                ...i,
                exercicios: i.exercicios.map((e: any) => {
                  if (e.id === subId) {
                    let updatedValue = valor;
                    let extras = {};
                    if (campo === 'metodo') {
                       updatedValue = getMetodoConfig(valor);
                       // AplicaÃ§Ã£o do ArquÃ©tipo 4 (Travas)
                       if (valor === 'GVT') extras = { series: '10', reps: '10', descanso: '60s' };
                       if (valor === 'FST-7') extras = { series: '7', descanso: '30s a 45s' };
                       if (valor === 'Set 21') extras = { reps: '21' };
                    }
                    return { ...e, [campo]: updatedValue, ...extras };
                  }
                  return e;
                })
              };
            }
            return i;
          })
        };
      }
      return d;
    }));
  };

  const handleUpdateSubExercicioMetodoConfig = (divisaoId: string, groupId: string, subId: string, configKey: string, configValue: any) => {
    setDivisoesArray(divisoesArray.map(d => {
      if (d.id === divisaoId) {
        return {
          ...d,
          itens: d.itens.map((i: any) => {
            if (i.id === groupId && i.tipo === 'grupo') {
              return {
                ...i,
                exercicios: i.exercicios.map((e: any) => {
                  if (e.id === subId && e.metodo?.config) {
                    return { ...e, metodo: { ...e.metodo, config: { ...e.metodo.config, [configKey]: configValue } } };
                  }
                  return e;
                })
              };
            }
            return i;
          })
        };
      }
      return d;
    }));
  };

  const handleSaveNewModel = async () => {
    if (!newModelData.title.trim()) return;
    
    if (divisoesArray.length === 0 || divisoesArray.every(d => !d.itens || d.itens.length === 0)) {
      showToast('Seu programa precisa ter pelo menos 1 divisÃ£o e 1 exercÃ­cio vÃ¡lido.', 'error');
      return;
    }

    setIsSavingModel(true);

    try {
      const selectedDestino = newModelData.targetStudent;
      const aluno_id = selectedDestino === 'model' ? null : selectedDestino;
      
      let validadeDate = null;
      if (newModelData.validadeSemanas !== 'none') {
        const weeks = parseInt(newModelData.validadeSemanas);
        validadeDate = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
      }
      
      const payload = {
        personal_id: user.id,
        titulo: newModelData.title.trim(),
        descricao: newModelData.description?.trim() || 'Sem descriÃ§Ã£o cadastrada.',
        blocos: divisoesArray.length,
        exercicios: divisoesArray.reduce((acc, div) => {
          let c = 0;
          if (div.itens) {
            div.itens.forEach((i: any) => {
              if (i.tipo === 'simples') c++;
              if (i.tipo === 'grupo' && i.exercicios) c += i.exercicios.length;
            });
          }
          return acc + c;
        }, 0),
        aluno_id: (
          selectedDestino === 'all' || 
          selectedDestino === 'biblioteca' || 
          selectedDestino === 'model' ||
          selectedDestino === '' || 
          !selectedDestino
        ) ? null : selectedDestino,
        validade_semanas: newModelData.validadeSemanas === 'none' ? null : parseInt(newModelData.validadeSemanas),
        data_validade: validadeDate,
        estrutura: JSON.stringify({ divisoes: divisoesArray })
      };

      let savedWorkoutData = null;

      if (treinoEmEdicao) {
        // Modo: EdiÃ§Ã£o ou Clonagem
        const wasLibraryModel = treinoEmEdicao.aluno_id === null;
        const isAssigningToStudent = payload.aluno_id !== null;

        if (wasLibraryModel && isAssigningToStudent) {
            // CENÃRIO A: Template Forking (Clonagem)
            const payloadClone = { ...payload } as any;
            delete payloadClone.id;
            
            const { data: novaCopia, error } = await supabase
              .from('treinos')
              .insert([payloadClone])
              .select()
              .single();
              
            if (error) {
              console.error("Supabase Error (Clone):", error);
              showToast(`Erro ao clonar: ${error.message || 'Falha de comunicaÃ§Ã£o'}`, 'error');
              setIsSavingModel(false);
              return;
            }
            savedWorkoutData = novaCopia;
            showToast('Treino prescrito a partir do modelo com sucesso!', 'success');
        } else {
            // CENÃRIO B: AtualizaÃ§Ã£o PadrÃ£o
            const { data: treinoAtualizado, error } = await supabase
              .from('treinos')
              .update(payload)
              .eq('id', treinoEmEdicao.id)
              .select()
              .single();

            if (error) {
              console.error("Supabase Error (Update):", error);
              showToast(`Erro ao atualizar: ${error.message || 'Falha de comunicaÃ§Ã£o'}`, 'error');
              setIsSavingModel(false);
              return;
            }
            savedWorkoutData = treinoAtualizado;
            showToast('Treino atualizado com sucesso!', 'success');
        }
      } else {
        // Modo: Novo Treino
        const { data: newWorkout, error } = await supabase
          .from('treinos')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error("Supabase Error (Insert):", error);
          showToast(`Erro ao salvar: ${error.message || 'Falha de comunicaÃ§Ã£o'}`, 'error');
          setIsSavingModel(false);
          return;
        }
        savedWorkoutData = newWorkout;
        showToast('Treino criado com sucesso!', 'success');
      }

      const mappedWorkout = {
        id: savedWorkoutData.id,
        name: savedWorkoutData.titulo,
        description: savedWorkoutData.descricao || '',
        creatorId: savedWorkoutData.personal_id,
        createdAt: savedWorkoutData.created_at,
        aluno_id: savedWorkoutData.aluno_id,
        blocos: savedWorkoutData.blocos,
        exercicios: savedWorkoutData.exercicios,
        data_validade: savedWorkoutData.data_validade,
        estrutura: savedWorkoutData.estrutura
      };

      if (treinoEmEdicao && !(treinoEmEdicao.aluno_id === null && payload.aluno_id !== null)) {
         // CenÃ¡rio B optimistic update
         setDynamicWorkouts(prev => prev.map(t => t.id === treinoEmEdicao.id ? mappedWorkout : t));
      } else {
         // CenÃ¡rio A or New optimistic update
         setDynamicWorkouts(prev => [mappedWorkout, ...prev]);
         setTreinosCount(prev => prev + 1);
      }

      if (mappedWorkout.aluno_id) {
          setActiveWorkoutTab('prescritos');
      } else {
          setActiveWorkoutTab('biblioteca');
      }

      setIsCreatingModel(false);
      setTreinoEmEdicao(null);
      setNewModelData({ title: '', description: '', targetStudent: 'model', validadeSemanas: '4' });
      setDivisoesArray([{
        id: crypto.randomUUID(),
        nome: 'Treino A',
        itens: [{ id: crypto.randomUUID(), tipo: 'simples', exercicio: '', series: '', reps: '', descanso: '', metodo: 'Normal', obs: '' }]
      }]);
      setActiveTabId('');
      setIsSavingModel(false);
    } catch (e: any) {
      console.error('Falha inesperada ao salvar modelo:', e);
      showToast('Erro inesperado ao salvar treino.', 'error');
      setIsSavingModel(false);
    }
  };

  const handleAssignWorkout = async (workoutId: string, alunoId: string) => {
    setIsAssigning(true);
    try {
      // 1. Fetch original workout from treinos
      const { data: originalPlan, error: planError } = await supabase
        .from('treinos')
        .select('*')
        .eq('id', workoutId)
        .single();
        
      if (planError || !originalPlan) throw planError;

      // 2. Clone to a new Treino for the specific student
      const { data: newPlan, error: newPlanError } = await supabase
        .from('treinos')
        .insert({
          titulo: originalPlan.titulo,
          descricao: originalPlan.descricao,
          blocos: originalPlan.blocos,
          exercicios: originalPlan.exercicios,
          estrutura: originalPlan.estrutura,
          personal_id: user.id,
          aluno_id: alunoId
        })
        .select()
        .single();

      if (newPlanError || !newPlan) throw newPlanError;
      
      showToast('Treino atribuÃ­do com sucesso!', 'success');
      setAssigningWorkoutId(null);
      const studentName = b2bStudents.find(s => s.id === alunoId)?.name || 'Aluno';
      showToast(`Treino disponibilizado para ${studentName} com sucesso!`, 'success');
      setAssigningWorkoutId(null);
      
    } catch (err) {
      console.error("Error cloning workout:", err);
      showToast("Erro ao atribuir treino.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsAvatarMenuOpen(false);
    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
      
      if (error && !error.message.includes('session missing')) throw error;
      onUpdateUser({ ...user, avatar: undefined });
    } catch (e) {
      console.error('Error removing avatar:', e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteWorkoutPlan = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este treino?')) {
      try {
        const { error } = await supabase
          .from('treinos')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Remove locally without F5
        setDynamicWorkouts(prev => prev.filter(w => w.id !== id));
        onDeleteWorkout(id);
      } catch (err) {
        console.error('Erro ao deletar treino:', err);
        showToast('Erro ao excluir o treino.', 'error');
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      onUpdateUser({ ...user, avatar: data.publicUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showToast('Erro ao fazer upload da imagem.', 'error');
    } finally {
      setIsUploading(false);
    }
  };
  
  // KPIs computations
  // Sync instantÃ¢neo mesclando dados locais de sessions e dbSessions
  const totalCompletedWorkouts = Math.max(sessions.length, dbSessions.length);
  const streakDays = sessions.length > 0 ? sessions.length * 2 + 1 : 0; // Simulated dynamic streak

  // Calculate dynamic statistics based on recent logs
  const totalVolumeKg = sessions.reduce((acc, s) => {
    return acc + s.blocks.reduce((bAcc, b) => 
      bAcc + b.exercises.reduce((exAcc, ei) => 
        exAcc + ei.sets.reduce((sAcc, set) => 
          sAcc + (set.completed ? (set.executedWeight || 0) * (set.executedReps || 0) : 0), 0
        ), 0
      ), 0
    );
  }, 0);

  // Dynamic KPIs (Computed on render)
  const today = new Date();
  
  const prescritosCount = dynamicWorkouts.filter(w => w.aluno_id !== null).length;
  
  const expiringWorkoutsComputed = dynamicWorkouts
    .filter(p => p.aluno_id !== null)
    .map(p => {
      const diasRestantes = calcularDiasParaVencer(p.createdAt, p.data_validade || (p as any).validade_semanas);
      
      if (diasRestantes !== null && diasRestantes <= 5 && diasRestantes >= -3) {
        const alunoNome = b2bStudents.find(s => s.id === p.aluno_id)?.name || 'Aluno';
        return {
          ...p,
          alunoNome,
          titulo: p.name || (p as any).titulo,
          diffDays: diasRestantes,
          status: diasRestantes < 0 ? 'vencido' : 'vencendo'
        };
      }
      return null;
    })
    .filter(Boolean) as any[];

  return (
    <div id="home-view" className="space-y-8 pb-24 px-4 sm:px-6 md:px-8 pt-6 w-full max-w-6xl mx-auto">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg border shadow-xl flex items-center gap-3 animate-in slide-in-from-top-2 bg-zinc-900 ${toast.type === 'success' ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
          <span className="text-zinc-200 text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Profile Header Greeting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 relative" ref={avatarMenuRef}>
          <div 
            className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-surf-2 shadow-sm overflow-hidden group cursor-pointer"
            onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
          >
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className={`w-full h-full object-cover transition-all duration-300 ${isUploading ? 'opacity-50 grayscale' : 'group-hover:opacity-50'}`} 
              />
            ) : (
              <div className="w-full h-full bg-surf-2 flex items-center justify-center text-text-secondary font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            {!isUploading && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-bg-dark/40">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-dark/40">
                <div className="w-4 h-4 border-2 border-lime-electric border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => {
                setIsAvatarMenuOpen(false);
                handleAvatarUpload(e);
              }} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Avatar Dropdown Menu */}
          {isAvatarMenuOpen && (
            <div className="absolute left-0 top-16 w-48 bg-surf-1 border border-surf-2 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => { setIsAvatarMenuOpen(false); fileInputRef.current?.click(); }}
                className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surf-2 hover:text-text-primary flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Alterar Foto
              </button>
              
              {user.avatar && (
                <>
                  <button
                    onClick={() => { setIsAvatarMenuOpen(false); setIsLightboxOpen(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surf-2 hover:text-text-primary flex items-center gap-2 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Ver Ampliada
                  </button>
                  <div className="my-1 border-t border-surf-2"></div>
                  <button
                    onClick={handleRemoveAvatar}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover Foto
                  </button>
                </>
              )}
            </div>
          )}

          {/* Lightbox */}
          {isLightboxOpen && user.avatar && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-dark/95 backdrop-blur-md animate-in fade-in duration-300">
              <button 
                onClick={() => setIsLightboxOpen(false)}
                className="absolute top-6 right-6 p-2 bg-surf-2 rounded-full text-text-muted hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={user.avatar} 
                alt={user.name}
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl ring-1 ring-surf-2" 
              />
            </div>
          )}

          <div>
            <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-text-secondary block">Bem-vindo</span>
            <h1 className="font-sora font-extrabold text-base sm:text-xl text-text-primary leading-tight flex items-center gap-2">
              {user.name}
              {user.role === 'personal' && (
                <span className="bg-lime-electric/15 text-lime-electric text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Profissional
                </span>
              )}
            </h1>
          </div>
        </div>

        <button 
          onClick={() => onNavigateToTab(user.role === 'personal' ? 'personal' : 'vincular')}
          className="bg-surf-1 hover:bg-surf-2 border border-surf-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 text-xs font-bold"
        >
          {user.role === 'personal' ? (
            <>
              <Users className="w-4 h-4 text-lime-electric" />
              <span className="hidden sm:inline">GestÃ£o de Alunos</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Vincular Personal</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Dashboards */}
      {user.role === 'personal' ? (
        <>
          {/* B2B Dashboard Indicators */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <div className="bg-surf-1 border border-surf-2 p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Total de Alunos</span>
                <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-lime-electric" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-mono font-bold block">{b2bStudents.length}</span>
                <span className="text-[9px] sm:text-xs text-text-muted">Ativos</span>
              </div>
            </div>

            <div className="bg-surf-1 border border-surf-2 p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Treinos Prescritos</span>
                <Dumbbell className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-lime-electric" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-mono font-bold block">{prescritosCount}</span>
                <span className="text-[9px] sm:text-xs text-text-muted">No banco de dados</span>
              </div>
            </div>

            <div className="bg-surf-1 border border-surf-2 p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Taxa de AderÃªncia</span>
                <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-lime-electric" />
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-3xl font-mono font-bold block truncate">
                  {adherenceRate}%
                </span>
                <span className="text-[9px] sm:text-xs text-text-muted">Nos Ãºltimos 7 dias</span>
              </div>
            </div>
          </div>

          {/* Strategic Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-surf-1 border border-surf-2 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
              <h3 className="font-sora font-bold text-sm text-text-primary flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-success" /> Destaques da Semana
              </h3>
              <div className="space-y-3">
                {b2bStudents.filter(s => s.isHighlight).length === 0 ? (
                  <p className="text-xs text-text-muted">Nenhum destaque por enquanto.</p>
                ) : (
                  b2bStudents.filter(s => s.isHighlight).map(s => (
                    <div key={s.id} className="flex justify-between items-center text-xs">
                      <span className="text-text-primary font-semibold">{s.name}</span>
                      <span className="text-success font-bold font-mono">Ativo</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-surf-1 border border-surf-2 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
              <h3 className="font-sora font-bold text-sm text-text-primary flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-error" /> Precisam de AtenÃ§Ã£o
              </h3>
              <div className="space-y-3">
                {b2bStudents.filter(s => !s.isHighlight).length === 0 ? (
                  <p className="text-xs text-text-muted">Todos os alunos estÃ£o ativos nos Ãºltimos 5 dias!</p>
                ) : (
                  b2bStudents.filter(s => !s.isHighlight).map(s => (
                    <div key={s.id} className="flex justify-between items-center text-xs">
                      <span className="text-text-primary font-semibold">{s.name}</span>
                      <span className="text-error font-bold font-mono">
                        {s.lastSession ? 'Pendente' : 'Inativo'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-surf-1 border border-surf-2 rounded-2xl p-5 relative overflow-hidden md:col-span-2">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <h3 className="font-sora font-bold text-sm text-text-primary flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-amber-500" /> â³ Treinos a Vencer
              </h3>
              <div className="space-y-3">
                {expiringWorkoutsComputed.length === 0 ? (
                  <p className="text-xs text-text-muted">Nenhum treino vencendo nos prÃ³ximos 5 dias.</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {expiringWorkoutsComputed.map(w => {
                      const msgDias = w.diffDays === 0 ? "Vence hoje!" : w.diffDays < 0 ? `Venceu hÃ¡ ${Math.abs(w.diffDays)} dia(s)` : `Vence em ${w.diffDays} dia(s)`;
                      return (
                        <div key={w.id} className="flex items-center justify-between text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                          <span className="font-medium text-zinc-200">{w.alunoNome || "Aluno"} â€¢ <span className="text-zinc-400 font-normal">{w.titulo}</span></span>
                          <span className="text-amber-400 font-semibold text-xs bg-amber-500/10 px-2 py-1 rounded">{msgDias}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Fitness Dashboard Indicators */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <button 
              onClick={() => setIsCalendarOpen(true)}
              className="bg-surf-1 border border-surf-2 p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between hover:bg-surf-2 hover:-translate-y-1 transition-all text-left group"
            >
              <div className="flex justify-between items-center text-text-secondary w-full">
                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider group-hover:text-lime-electric transition-colors">SessÃµes</span>
                <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-lime-electric" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-mono font-bold block">{totalCompletedWorkouts}</span>
                <span className="text-[9px] sm:text-xs text-text-muted">Ver histÃ³rico</span>
              </div>
            </button>

            <div className="bg-surf-1 border border-surf-2 p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Meta Semanal</span>
                <Flame className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-orange-500 animate-pulse" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-mono font-bold block">{totalCompletedWorkouts % (user.weeklyGoal || 4)}<span className="text-sm sm:text-base text-text-muted">/{user.weeklyGoal || 4}</span></span>
                <span className="text-[9px] sm:text-xs text-text-muted">Treinos na semana</span>
              </div>
            </div>

            <div className="bg-surf-1 border border-surf-2 p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Carga Total</span>
                <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-teal-data" />
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-3xl font-mono font-bold block truncate">
                  {totalVolumeKg > 1000 ? `${(totalVolumeKg / 1000).toFixed(1)}t` : `${totalVolumeKg}kg`}
                </span>
                <span className="text-[9px] sm:text-xs text-text-muted">Volume total</span>
              </div>
            </div>
          </div>

          {trainerLink ? (
            <div className="bg-[linear-gradient(135deg,_#171B22_0%,_#1C222B_100%)] border border-lime-electric/20 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
                <Award className="w-32 h-32" />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <img 
                  src={trainerLink.avatar || "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=200"} 
                  alt="Personal" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-surf-2"
                />
                <div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-lime-electric tracking-widest block uppercase">Personal Trainer</span>
                  <h3 className="font-sora font-bold text-sm text-text-primary">{trainerLink.name}</h3>
                </div>
              </div>
              {trainerLink.phone && (
                <a
                  href={`https://wa.me/${trainerLink.phone}?text=OlÃ¡ professor, estou vendo meu treino no TreinoBase!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 relative z-10"
                >
                  <MessageCircle className="w-4 h-4" />
                  Falar no WhatsApp
                </a>
              )}
            </div>
          ) : (
            <div className="bg-surf-1 border border-surf-2 p-5 sm:p-6 rounded-2xl flex items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <span className="text-[9px] sm:text-xs font-extrabold text-lime-electric tracking-widest block uppercase">VÃ­nculo com Treinador</span>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Seu personal pode prescrever seus treinos em tempo real. Solicite o link de convite.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('vincular')}
                className="bg-surf-2 hover:bg-surf-1 border border-surf-2 text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all whitespace-nowrap"
              >
                Vincular
              </button>
            </div>
          )}
        </>
      )}

      {/* WORKOUT LIST SECTION */}
      <div className="space-y-4">
        {user.role === 'aluno' ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-sora font-extrabold text-base sm:text-lg text-text-primary">Prescritos pelo Personal</h2>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-sora font-extrabold text-base sm:text-lg text-text-primary">Meus Treinos</h2>
              <button 
                id="home-create-workout-btn"
                onClick={() => {
                  if (activeWorkoutTab === 'prescritos' && selectedFilterStudent !== 'all') {
                    setNewModelData(prev => ({ ...prev, targetStudent: selectedFilterStudent }));
                  } else {
                    setNewModelData(prev => ({ ...prev, targetStudent: activeWorkoutTab === 'biblioteca' ? 'model' : 'all' }));
                  }
                  setIsCreatingModel(true);
                }}
                className="text-xs sm:text-sm font-bold text-lime-electric flex items-center gap-1 hover:text-white transition-all bg-surf-1 px-3 py-1.5 border border-surf-2 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Prescrever Treino
              </button>
            </div>
            
            {/* TABS */}
            <div className="flex items-center gap-2 border-b border-zinc-800">
              <button
                onClick={() => setActiveWorkoutTab('prescritos')}
                className={`pb-2 px-1 text-sm font-bold transition-all border-b-2 ${activeWorkoutTab === 'prescritos' ? 'text-emerald-500 border-emerald-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              >
                Treinos dos Alunos
              </button>
              <button
                onClick={() => setActiveWorkoutTab('biblioteca')}
                className={`pb-2 px-1 text-sm font-bold transition-all border-b-2 ${activeWorkoutTab === 'biblioteca' ? 'text-emerald-500 border-emerald-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              >
                Biblioteca de Modelos
              </button>
            </div>

            {/* FILTERS */}
            {activeWorkoutTab === 'prescritos' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou objetivo..." 
                    value={searchWorkoutQuery}
                    onChange={(e) => setSearchWorkoutQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <select
                  value={selectedFilterStudent}
                  onChange={(e) => setSelectedFilterStudent(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="all">ðŸ‘¤ Todos os Alunos</option>
                  {b2bStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full" id="home-workout-list">
          {(() => {
            if (isLoading) {
               return (
                <>
                  <Skeleton className="h-32 w-full col-span-1" />
                  <Skeleton className="h-32 w-full col-span-1" />
                  <Skeleton className="h-32 w-full col-span-1 hidden sm:block" />
                </>
              );
            }

            let filteredWorkouts = dynamicWorkouts;
            
            if (user.role === 'personal') {
              if (activeWorkoutTab === 'prescritos') {
                filteredWorkouts = dynamicWorkouts.filter(w => w.aluno_id);
                if (selectedFilterStudent !== 'all') {
                  filteredWorkouts = filteredWorkouts.filter(w => w.aluno_id === selectedFilterStudent);
                }
                if (searchWorkoutQuery.trim()) {
                  filteredWorkouts = filteredWorkouts.filter(w => w.name?.toLowerCase().includes(searchWorkoutQuery.toLowerCase()) || w.description?.toLowerCase().includes(searchWorkoutQuery.toLowerCase()));
                }
              } else {
                filteredWorkouts = dynamicWorkouts.filter(w => !w.aluno_id);
              }
            }

            if (filteredWorkouts.length === 0) {
              if (user.role === 'personal' && activeWorkoutTab === 'prescritos' && selectedFilterStudent !== 'all') {
                const studentName = b2bStudents.find(s => s.id === selectedFilterStudent)?.name || 'este aluno';
                return (
                  <div className="col-span-full">
                    <EmptyState 
                      icon={Dumbbell}
                      title={`Nenhum treino prescrito para ${studentName}`}
                      description="Comece prescrevendo um novo treino exclusivo para este aluno."
                    />
                    <button 
                      onClick={() => {
                        setNewModelData(prev => ({ ...prev, targetStudent: selectedFilterStudent }));
                        setIsCreatingModel(true);
                      }}
                      className="mx-auto mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl border border-zinc-700/50 transition-all font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Prescrever Novo Treino
                    </button>
                  </div>
                );
              }

              return (
                <div className="col-span-full">
                  <EmptyState 
                    icon={Dumbbell}
                    title="Nenhum treino encontrado"
                    description={user.role === 'aluno' ? "Seu personal ainda nÃ£o prescreveu nenhum treino para vocÃª." : activeWorkoutTab === 'biblioteca' ? "Sua biblioteca de modelos estÃ¡ vazia." : "Nenhum treino prescrito encontrado."}
                  />
                  {(user.role === 'personal') && (
                    <button 
                      onClick={() => {
                        setNewModelData(prev => ({ ...prev, targetStudent: activeWorkoutTab === 'biblioteca' ? 'model' : 'all' }));
                        setIsCreatingModel(true);
                      }}
                      className="mx-auto mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl border border-zinc-700/50 transition-all font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> {activeWorkoutTab === 'biblioteca' ? 'Criar Modelo' : 'Prescrever Treino'}
                    </button>
                  )}
                </div>
              );
            }

            return filteredWorkouts.map(workout => {
              const totalBlocks = (workout as any).blocos || 1;
              const totalExs = (workout as any).exercicios || 1;
              const isExecuting = activeWorkoutId === workout.id;
              
              const dtCreated = new Date(workout.createdAt);
              const dtValid = workout.data_validade ? new Date(workout.data_validade) : null;
              
              let validStatus = 'ok';
              if (dtValid) {
                const diffTime = dtValid.getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) validStatus = 'vencido';
                else if (diffDays <= 5) validStatus = 'vencendo';
              }

              return (
                <div 
                  key={workout.id}
                  className="group relative bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between min-h-[160px]"
                >
                  {isExecuting && (
                    <div className="absolute -top-3 left-4 bg-emerald-500 text-zinc-950 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
                      <Zap className="w-3 h-3 fill-zinc-950" /> Ficha Ativa
                    </div>
                  )}

                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white mb-1.5 line-clamp-1 pr-2">
                        {workout.name || (workout as any).titulo}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {workout.aluno_id ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            ðŸ‘¤ {b2bStudents.find(s => s.id === workout.aluno_id)?.name || 'Aluno'}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                            ðŸ“ Modelo de Biblioteca
                          </span>
                        )}
                        
                        {validStatus === 'vencido' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">Vencido</span>
                        ) : validStatus === 'vencendo' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">Vencendo</span>
                        ) : null}
                      </div>
                    </div>
                    {user.role === 'personal' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button 
                          onClick={(e) => handleDuplicateTreino(workout, e)}
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Duplicar Treino"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteTreino(workout.id, e)}
                          className={`p-1.5 rounded-lg transition-all border ${
                            confirmDeleteId === workout.id 
                              ? 'bg-red-500/10 text-red-400 border-red-500/20 px-2.5 flex items-center gap-1.5' 
                              : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20'
                          }`}
                          title="Excluir"
                        >
                          {confirmDeleteId === workout.id ? (
                            <>
                              <span className="text-[10px] font-bold uppercase tracking-wider">Confirmar ExclusÃ£o?</span>
                            </>
                          ) : (
                            <Trash className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 line-clamp-2 my-3 flex-1 font-medium pr-1">
                    {workout.description || (workout as any).descricao || 'Sem descriÃ§Ã£o adicional.'}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-auto">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                        {totalBlocks} DivisÃµes â€¢ {totalExs} Exs
                      </span>
                      <span className="text-[9px] font-mono text-zinc-600">
                        Criado em: {dtCreated.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    {user.role === 'aluno' ? (
                      <button 
                        onClick={() => setSelectedWorkoutDetails(workout)}
                        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg font-bold transition-colors"
                      >
                        Abrir
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTreinoEmEdicao(workout);
                          
                          setNewModelData({
                            title: workout.name || (workout as any).titulo,
                            description: workout.description || (workout as any).descricao || '',
                            targetStudent: workout.aluno_id || 'model',
                            validadeSemanas: (workout as any).validade_semanas ? String((workout as any).validade_semanas) : 'none'
                          });

                          let est = workout.estrutura;
                          if (typeof est === 'string') {
                            try { est = JSON.parse(est); } catch (e) {}
                          }
                          let divs = [];
                          if (est?.divisoes) {
                             divs = est.divisoes;
                          } else if (Array.isArray(est)) {
                             divs = est;
                          }
                          
                          if (divs.length > 0) {
                             setDivisoesArray(divs);
                             setActiveTabId(divs[0].id);
                          } else {
                             setDivisoesArray([{ id: crypto.randomUUID(), nome: 'Treino A', itens: [] }]);
                          }

                          setIsCreatingModel(true);
                        }}
                        className="text-[10px] border border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-400 text-zinc-400 px-3 py-1.5 rounded-lg font-bold transition-all"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* HISTORIC ACTIVITIES LOGS */}
      <div className="space-y-4">
        <h2 className="font-sora font-extrabold text-base sm:text-lg text-text-primary">SessÃµes Recentes</h2>

        <div className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : user.role === 'personal' ? (
            b2bRecentSessions.length === 0 ? (
              <EmptyState 
                icon={Award}
                title="Nenhuma sessÃ£o registrada"
                description="Seus alunos ainda nÃ£o registraram nenhum treino."
              />
            ) : (
              b2bRecentSessions.map(session => (
                <div key={session.id} className="bg-surf-1 border border-surf-2 rounded-2xl overflow-hidden p-4 sm:p-5 flex items-center justify-between shadow-sm">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-success bg-success/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ConcluÃ­do
                      </span>
                      <span className="text-[10px] text-text-muted font-mono bg-surf-2 px-2 py-0.5 rounded-full">
                        {new Date(session.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    <h4 className="font-sora font-bold text-sm sm:text-base text-text-primary">
                      {session.studentName} <span className="text-text-muted font-normal text-xs ml-1">treinou</span>
                    </h4>
                    <p className="text-[11px] sm:text-xs text-text-secondary font-medium">
                      {session.workoutTitle}
                    </p>
                  </div>
                </div>
              ))
            )
          ) : (
            sessions.length === 0 ? (
              <EmptyState 
                icon={Award}
                title="Nenhuma sessÃ£o registrada"
                description="Comece um treino para acumular logs e visualizar seu histÃ³rico aqui!"
              />
            ) : (
              [...sessions].reverse().slice(0, 10).map(session => {
                const totalSecs = session.durationSeconds;
                const formattedDuration = `${Math.floor(totalSecs / 60)} min`;
                const isExpanded = expandedSessionId === session.id;
                
                const sessionVolume = session.blocks.reduce((acc, b) => 
                  acc + b.exercises.reduce((exAcc, ei) => 
                    exAcc + ei.sets.reduce((sAcc, set) => 
                      sAcc + (set.completed ? (set.executedWeight || 0) * (set.executedReps || 0) : 0), 0
                    ), 0
                  ), 0
                );

                return (
                  <div 
                    key={session.id}
                    className="bg-surf-1 border border-surf-2 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
                  >
                    <button
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between hover:bg-surf-2/40 transition-colors"
                    >
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-success bg-success/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            ConcluÃ­do
                          </span>
                          <span className="text-[10px] text-text-muted font-mono bg-surf-2 px-2 py-0.5 rounded-full">
                            {session.date}
                          </span>
                        </div>
                        <h4 className="font-sora font-bold text-sm sm:text-base text-text-primary">{session.workoutName}</h4>
                        <p className="text-[11px] sm:text-xs text-text-secondary flex items-center gap-3 font-mono">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-lime-electric" /> {formattedDuration}</span>
                          <span className="flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5 text-lime-electric" /> {sessionVolume}kg Total</span>
                        </p>
                      </div>
                      
                      <ChevronDown className={`w-5 h-5 text-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180 text-lime-electric' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-surf-2/50 bg-surf-1/50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-4">
                          {session.blocks.map((block, bIdx) => (
                            <div key={block.id} className="pt-2">
                              <h5 className="text-[10px] sm:text-xs font-bold text-lime-electric uppercase tracking-wider mb-2">
                                {block.name}
                              </h5>
                              <div className="space-y-2">
                                {block.exercises.map((exerciseItem) => (
                                  <div key={exerciseItem.id} className="bg-bg-dark rounded-xl p-3 border border-surf-2">
                                    <span className="text-xs sm:text-sm font-semibold text-text-primary block mb-2">{exerciseItem.exercise.name}</span>
                                    <div className="grid grid-cols-2 gap-2">
                                      {exerciseItem.sets.map((set, sIdx) => (
                                        <div key={set.id} className={`text-[10px] flex justify-between px-2 py-1.5 rounded-lg ${set.completed ? 'bg-success/10 text-success' : 'bg-surf-2 text-text-muted'}`}>
                                          <span className="font-bold">SÃ©rie {set.setNumber}</span>
                                          <span className="font-mono">
                                            {set.completed ? `${set.executedWeight}kg x ${set.executedReps}` : 'NÃ£o feita'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
      
      {isCalendarOpen && (
        <CalendarModal sessions={sessions} onClose={() => setIsCalendarOpen(false)} />
      )}
      {/* MODAL CRIAR NOVO MODELO (CONSTRUTOR DINÃ‚MICO) */}
      {isCreatingModel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="font-sora font-bold text-lg text-white">Construtor de Treino</h3>
              <button 
                onClick={() => setIsCreatingModel(false)}
                className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 p-1.5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              
              {/* METADATA */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">TÃ­tulo da Ficha</label>
                    <input 
                      type="text" 
                      value={newModelData.title}
                      onChange={e => setNewModelData({...newModelData, title: e.target.value})}
                      placeholder="Ex: Hipertrofia & ForÃ§a - Fase 1"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Para quem Ã© este treino?</label>
                    <select 
                      value={newModelData.targetStudent}
                      onChange={e => setNewModelData({...newModelData, targetStudent: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    >
                      <option value="">ðŸ“ Salvar na Biblioteca de Modelos (ReutilizÃ¡vel)</option>
                      {b2bStudents.length > 0 && (
                        <optgroup label="Meus Alunos">
                          {b2bStudents.map(student => (
                            <option key={student.id} value={student.id}>ðŸ‘¤ Aluno: {student.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">DescriÃ§Ã£o / ObservaÃ§Ã£o Geral (Opcional)</label>
                    <textarea 
                      value={newModelData.description}
                      onChange={e => setNewModelData({...newModelData, description: e.target.value})}
                      placeholder="Ex: Foco em hipertrofia com progressÃ£o de carga"
                      rows={1}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Validade do Treino</label>
                    <select 
                      value={newModelData.validadeSemanas}
                      onChange={e => setNewModelData({...newModelData, validadeSemanas: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    >
                      <option value="2">2 semanas</option>
                      <option value="4">4 semanas (1 mÃªs)</option>
                      <option value="6">6 semanas</option>
                      <option value="8">8 semanas (2 meses)</option>
                      <option value="none">Sem validade fixa</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <hr className="border-zinc-800" />
              
              {/* BUILDER INTERATIVO (ABAS) */}
              <div>
                <div className="flex gap-2 overflow-x-auto pb-0 border-b border-zinc-800">
                  {divisoesArray.map(divisao => (
                    <button
                      key={divisao.id}
                      onClick={() => setActiveTabId(divisao.id)}
                      className={`px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap ${
                        activeTabId === divisao.id
                          ? 'bg-zinc-900 text-emerald-400 border-t border-x border-zinc-800 relative after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-zinc-900'
                          : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50 border-t border-x border-transparent'
                      }`}
                    >
                      {divisao.nome}
                    </button>
                  ))}
                  <button
                    onClick={handleAddDivisao}
                    className="px-4 py-2.5 text-xs font-bold text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1 mt-0.5"
                  >
                    <Plus className="w-4 h-4" /> Nova DivisÃ£o
                  </button>
                </div>

                <div className="bg-zinc-900 border-x border-b border-zinc-800 rounded-b-xl p-5 shadow-inner">
                  {divisoesArray.map((divisao) => divisao.id === activeTabId && (
                    <div key={divisao.id} className="animate-in fade-in duration-200">
                      <div className="flex items-center gap-3 mb-6">
                        <input
                          type="text"
                          value={divisao.nome}
                          onChange={(e) => handleUpdateDivisao(divisao.id, 'nome', e.target.value)}
                          placeholder="Ex: Treino A - Peito"
                          className="bg-transparent border-none text-base font-bold text-white focus:outline-none focus:ring-0 p-0 w-64 border-b border-dashed border-zinc-700 hover:border-emerald-500"
                        />
                        <div className="flex-1 border-b border-zinc-800/50"></div>
                        <button onClick={() => handleRemoveDivisao(divisao.id)} className="text-zinc-500 hover:text-red-400 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Excluir DivisÃ£o
                        </button>
                      </div>

                      {/* Items */}
                      <div className="space-y-3 mt-4">
                        {divisao.itens?.map((item: any, index: number) => {
                          if (item.tipo === 'simples') {
                            return (
                              <div key={item.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 shadow-sm relative">
                                {item.metodo?.tipo !== 'Normal' && (
                                  <div className="absolute -top-2.5 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm backdrop-blur-md z-10">
                                    <Zap className="w-3 h-3" /> {item.metodo?.tipo}
                                  </div>
                                )}
                                <div className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-12 sm:col-span-3">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">ExercÃ­cio</label>
                                    <input type="text" placeholder="Supino Reto" value={item.exercicio} onChange={(e) => handleUpdateItem(divisao.id, item.id, 'exercicio', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded text-xs text-white px-2 py-2 focus:border-emerald-500/50 focus:outline-none" />
                                  </div>
                                  
                                  {item.metodo?.arquetipo !== 'piramide' && (
                                    <>
                                      <div className="col-span-6 sm:col-span-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">SÃ©ries</label>
                                        <input type="text" placeholder="3-4" value={item.series} onChange={(e) => handleUpdateItem(divisao.id, item.id, 'series', e.target.value)} disabled={item.metodo?.tipo === 'GVT' || item.metodo?.tipo === 'FST-7'} className="w-full bg-zinc-900 border border-zinc-800 rounded text-xs text-center text-white px-2 py-2 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50" />
                                      </div>
                                      <div className="col-span-6 sm:col-span-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Reps</label>
                                        <input type="text" placeholder="10-12" value={item.reps} onChange={(e) => handleUpdateItem(divisao.id, item.id, 'reps', e.target.value)} disabled={item.metodo?.tipo === 'GVT' || item.metodo?.tipo === 'Set 21'} className="w-full bg-zinc-900 border border-zinc-800 rounded text-xs text-center text-white px-2 py-2 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50" />
                                      </div>
                                    </>
                                  )}
                                  
                                  <div className={`col-span-6 ${item.metodo?.arquetipo === 'piramide' ? 'sm:col-span-4' : 'sm:col-span-2'}`}>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Descanso</label>
                                    <input type="text" placeholder="60s" value={item.descanso} onChange={(e) => handleUpdateItem(divisao.id, item.id, 'descanso', e.target.value)} onBlur={() => handleUpdateItem(divisao.id, item.id, 'descanso', formatarDescanso(item.descanso))} className="w-full bg-zinc-900 border border-zinc-800 rounded text-[11px] text-white px-2 py-1.5 focus:border-emerald-500/50 focus:outline-none" />
                                  </div>
                                  <div className={`col-span-6 ${item.metodo?.arquetipo === 'piramide' ? 'sm:col-span-4' : 'sm:col-span-2'}`}>
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Zap className="w-3 h-3"/> MÃ©todo</label>
                                    <select value={item.metodo?.tipo || 'Normal'} onChange={(e) => handleUpdateItem(divisao.id, item.id, 'metodo', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-300 px-1 py-2 focus:border-emerald-500/50 focus:outline-none truncate">
                                      <option value="Normal">Normal</option>
                                      <optgroup label="Intensidade">
                                        <option value="Drop-set">Drop-set</option>
                                        <option value="Rest-pause">Rest-pause</option>
                                        <option value="ExaustÃ£o">AtÃ© a Falha</option>
                                        <option value="Parciais">Reps Parciais</option>
                                        <option value="ForÃ§ada">Rep ForÃ§ada</option>
                                      </optgroup>
                                      <optgroup label="TensÃ£o">
                                        <option value="IsomÃ©trico">IsomÃ©trico</option>
                                        <option value="Negativo">Negativo (ExcÃªntrico)</option>
                                        <option value="Super Slow">Super Slow</option>
                                      </optgroup>
                                      <optgroup label="Sistemas">
                                        <option value="GVT">GVT (10x10)</option>
                                        <option value="FST-7">FST-7</option>
                                        <option value="Set 21">Set 21</option>
                                      </optgroup>
                                      <optgroup label="PirÃ¢mides">
                                        <option value="PirÃ¢mide Crescente">Crescente</option>
                                        <option value="PirÃ¢mide Decrescente">Decrescente</option>
                                      </optgroup>
                                    </select>
                                  </div>
                                  <div className="col-span-12 sm:col-span-1 flex items-end pb-1 justify-center">
                                    <button onClick={() => handleRemoveItem(divisao.id, item.id)} className="text-zinc-600 hover:text-red-400 p-1 bg-zinc-900 rounded-md">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* ARQUÃ‰TIPOS MECÃ‚NICOS CONDICIONAIS */}
                                {item.metodo?.tipo === 'Drop-set' && (
                                  <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 p-2 rounded-lg flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Qtd. de Drops:</span>
                                    <select value={item.metodo.config?.qtd_drops || 2} onChange={(e) => handleUpdateItemMetodoConfig(divisao.id, item.id, 'qtd_drops', parseInt(e.target.value))} className="bg-zinc-800 text-xs text-white rounded px-2 py-1 border border-zinc-700 outline-none">
                                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                  </div>
                                )}

                                {item.metodo?.tipo === 'Rest-pause' && (
                                  <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 p-2 rounded-lg flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Pausa (segundos):</span>
                                    <input type="number" value={item.metodo.config?.pausa || 15} onChange={(e) => handleUpdateItemMetodoConfig(divisao.id, item.id, 'pausa', parseInt(e.target.value))} className="bg-zinc-800 text-xs text-center text-white rounded px-2 py-1 w-16 border border-zinc-700 outline-none" />
                                  </div>
                                )}

                                {['IsomÃ©trico', 'Negativo', 'Super Slow'].includes(item.metodo?.tipo) && (
                                  <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 p-2 rounded-lg flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase">CadÃªncia:</span>
                                    <input type="text" placeholder="Ex: 4020, 3s..." value={item.metodo.config?.cadencia || ''} onChange={(e) => handleUpdateItemMetodoConfig(divisao.id, item.id, 'cadencia', e.target.value)} className="bg-zinc-800 text-xs text-white rounded px-2 py-1 w-32 border border-zinc-700 outline-none" />
                                  </div>
                                )}

                                {item.metodo?.arquetipo === 'piramide' && (
                                  <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-emerald-400 font-bold uppercase flex items-center gap-1"><Zap className="w-3 h-3" /> Setup da PirÃ¢mide</span>
                                      <button onClick={() => {
                                        const currentSetup = item.metodo.config?.series_setup || [];
                                        handleUpdateItemMetodoConfig(divisao.id, item.id, 'series_setup', [...currentSetup, { reps: '', carga: 'Moderada' }]);
                                      }} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors">+ Adicionar SÃ©rie</button>
                                    </div>
                                    
                                    {!item.metodo.config?.series_setup || item.metodo.config.series_setup.length === 0 ? (
                                      <div className="text-[10px] text-zinc-500 italic text-center py-2">Adicione sÃ©ries para configurar a pirÃ¢mide.</div>
                                    ) : (
                                      <div className="space-y-2">
                                        {item.metodo.config.series_setup.map((s: any, idx: number) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <span className="text-[10px] text-zinc-500 font-bold w-12">SÃ©rie {idx + 1}</span>
                                            <input type="text" placeholder="Reps (Ex: 15)" value={s.reps} onChange={(e) => {
                                              const newSetup = [...item.metodo.config.series_setup];
                                              newSetup[idx].reps = e.target.value;
                                              handleUpdateItemMetodoConfig(divisao.id, item.id, 'series_setup', newSetup);
                                            }} className="bg-zinc-800 text-xs text-white rounded px-2 py-1 w-24 border border-zinc-700 outline-none" />
                                            <select value={s.carga} onChange={(e) => {
                                              const newSetup = [...item.metodo.config.series_setup];
                                              newSetup[idx].carga = e.target.value;
                                              handleUpdateItemMetodoConfig(divisao.id, item.id, 'series_setup', newSetup);
                                            }} className="bg-zinc-800 text-xs text-zinc-300 rounded px-2 py-1 border border-zinc-700 outline-none flex-1">
                                              <option value="Leve">Carga Leve</option>
                                              <option value="Moderada">Carga Moderada</option>
                                              <option value="Pesada">Carga Pesada</option>
                                              <option value="MÃ¡xima">Carga MÃ¡xima</option>
                                            </select>
                                            <button onClick={() => {
                                              const newSetup = item.metodo.config.series_setup.filter((_:any, i:number) => i !== idx);
                                              handleUpdateItemMetodoConfig(divisao.id, item.id, 'series_setup', newSetup);
                                            }} className="text-zinc-600 hover:text-red-400 p-1"><X className="w-3 h-3" /></button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="mt-2 grid grid-cols-12 gap-2">
                                  <div className="col-span-12">
                                    <input type="text" placeholder="AnotaÃ§Ãµes / InstruÃ§Ãµes EspecÃ­ficas..." value={item.obs} onChange={(e) => handleUpdateItem(divisao.id, item.id, 'obs', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded text-[10px] text-zinc-400 px-2 py-1.5 focus:border-emerald-500/50 focus:outline-none" />
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (item.tipo === 'grupo') {
                            return (
                              <div key={item.id} className="bg-zinc-950/80 rounded-xl border border-emerald-500/30 overflow-hidden shadow-sm">
                                <div className="bg-emerald-500/5 px-4 py-2 border-b border-emerald-500/20 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-emerald-500" />
                                    <select 
                                      value={item.subtipo} 
                                      onChange={(e) => handleUpdateItem(divisao.id, item.id, 'subtipo', e.target.value)}
                                      className="bg-transparent text-emerald-400 font-bold text-xs uppercase tracking-wider focus:outline-none cursor-pointer"
                                    >
                                      <option value="Bi-set">Bi-set</option>
                                      <option value="Tri-set">Tri-set</option>
                                      <option value="Super SÃ©rie">Super SÃ©rie</option>
                                      <option value="Agonista/Antagonista">Agonista / Antagonista</option>
                                      <option value="PrÃ©-exaustÃ£o">PrÃ©-exaustÃ£o</option>
                                      <option value="Circuito">Circuito</option>
                                    </select>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Descanso Global:</span>
                                        <input type="text" placeholder="Ex: 90s" value={item.descansoGlobal || '90s'} onChange={(e) => handleUpdateItem(divisao.id, item.id, 'descansoGlobal', e.target.value)} onBlur={() => handleUpdateItem(divisao.id, item.id, 'descansoGlobal', formatarDescanso(item.descansoGlobal || '90s'))} className="w-16 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-center text-white px-2 py-1 focus:border-emerald-500/50 focus:outline-none" />
                                      </div>
                                      <button onClick={() => handleRemoveItem(divisao.id, item.id)} className="text-zinc-500 hover:text-red-400">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  {item.subtipo === 'PrÃ©-exaustÃ£o' && (
                                    <div className="bg-amber-500/10 text-amber-500 px-4 py-1.5 text-[10px] font-bold text-center uppercase tracking-wider border-b border-amber-500/20">
                                      AtenÃ§Ã£o: Ordene do Isolado para o Composto
                                    </div>
                                  )}
                                
                                <div className="p-2 space-y-1">
                                  {/* Headers */}
                                  <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                    <div className="col-span-5">ExercÃ­cio</div>
                                    <div className="col-span-2 text-center">SÃ©ries</div>
                                    <div className="col-span-2 text-center">Reps</div>
                                    <div className="col-span-3 text-center">MÃ©todo</div>
                                  </div>
                                  
                                  {item.exercicios?.map((subEx: any) => (
                                    <div key={subEx.id} className="bg-zinc-900/50 p-2 rounded border border-zinc-800 relative">
                                      <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-5">
                                          <input type="text" placeholder="ExercÃ­cio" value={subEx.exercicio} onChange={(e) => handleUpdateSubExercicio(divisao.id, item.id, subEx.id, 'exercicio', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded text-[11px] text-white px-2 py-1.5 focus:border-emerald-500/50 focus:outline-none" />
                                        </div>
                                        {subEx.metodo?.arquetipo !== 'piramide' ? (
                                          <>
                                            <div className="col-span-2">
                                              <input type="text" placeholder="SÃ©ries" value={subEx.series} onChange={(e) => handleUpdateSubExercicio(divisao.id, item.id, subEx.id, 'series', e.target.value)} disabled={subEx.metodo?.tipo === 'GVT' || subEx.metodo?.tipo === 'FST-7'} className="w-full bg-zinc-900 border border-zinc-800 rounded text-[11px] text-center text-white px-2 py-1.5 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50" />
                                            </div>
                                            <div className="col-span-2">
                                              <input type="text" placeholder="Reps" value={subEx.reps} onChange={(e) => handleUpdateSubExercicio(divisao.id, item.id, subEx.id, 'reps', e.target.value)} disabled={subEx.metodo?.tipo === 'GVT' || subEx.metodo?.tipo === 'Set 21'} className="w-full bg-zinc-900 border border-zinc-800 rounded text-[11px] text-center text-white px-2 py-1.5 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50" />
                                            </div>
                                          </>
                                        ) : (
                                          <div className="col-span-4 flex items-center justify-center">
                                            <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded">PirÃ¢mide Ativa</span>
                                          </div>
                                        )}
                                        <div className="col-span-2 relative">
                                          <select value={subEx.metodo?.tipo || 'Normal'} onChange={(e) => handleUpdateSubExercicio(divisao.id, item.id, subEx.id, 'metodo', e.target.value)} className={`w-full border rounded text-[9px] px-1 py-1.5 focus:outline-none truncate ${subEx.metodo?.tipo !== 'Normal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>
                                            <option value="Normal">Normal</option>
                                            <option value="Drop-set">Drop-set</option>
                                            <option value="Rest-pause">Rest-pause</option>
                                            <option value="ExaustÃ£o">AtÃ© a Falha</option>
                                            <option value="Parciais">Reps Parciais</option>
                                            <option value="ForÃ§ada">Rep ForÃ§ada</option>
                                            <option value="IsomÃ©trico">IsomÃ©trico</option>
                                            <option value="Negativo">Negativo (ExcÃªntrico)</option>
                                            <option value="Super Slow">Super Slow</option>
                                            <option value="GVT">GVT (10x10)</option>
                                            <option value="FST-7">FST-7</option>
                                            <option value="Set 21">Set 21</option>
                                          </select>
                                        </div>
                                        
                                        <div className="col-span-1 flex justify-center">
                                           <button onClick={() => handleRemoveSubExercicio(divisao.id, item.id, subEx.id)} className="text-zinc-600 hover:text-red-400 p-1">
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* ARQUÃ‰TIPOS MECÃ‚NICOS CONDICIONAIS */}
                                      {subEx.metodo?.tipo === 'Drop-set' && (
                                        <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 p-2 rounded-lg flex items-center gap-2">
                                          <span className="text-[10px] text-zinc-400 font-bold uppercase">Qtd. de Drops:</span>
                                          <select value={subEx.metodo.config?.qtd_drops || 2} onChange={(e) => handleUpdateSubExercicioMetodoConfig(divisao.id, item.id, subEx.id, 'qtd_drops', parseInt(e.target.value))} className="bg-zinc-800 text-xs text-white rounded px-2 py-1 border border-zinc-700 outline-none">
                                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                          </select>
                                        </div>
                                      )}

                                      {subEx.metodo?.tipo === 'Rest-pause' && (
                                        <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 p-2 rounded-lg flex items-center gap-2">
                                          <span className="text-[10px] text-zinc-400 font-bold uppercase">Pausa (segundos):</span>
                                          <input type="number" value={subEx.metodo.config?.pausa || 15} onChange={(e) => handleUpdateSubExercicioMetodoConfig(divisao.id, item.id, subEx.id, 'pausa', parseInt(e.target.value))} className="bg-zinc-800 text-xs text-center text-white rounded px-2 py-1 w-16 border border-zinc-700 outline-none" />
                                        </div>
                                      )}

                                      {['IsomÃ©trico', 'Negativo', 'Super Slow'].includes(subEx.metodo?.tipo) && (
                                        <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 p-2 rounded-lg flex items-center gap-2">
                                          <span className="text-[10px] text-zinc-400 font-bold uppercase">CadÃªncia:</span>
                                          <input type="text" placeholder="Ex: 4020, 3s..." value={subEx.metodo.config?.cadencia || ''} onChange={(e) => handleUpdateSubExercicioMetodoConfig(divisao.id, item.id, subEx.id, 'cadencia', e.target.value)} className="bg-zinc-800 text-xs text-white rounded px-2 py-1 w-32 border border-zinc-700 outline-none" />
                                        </div>
                                      )}

                                      {subEx.metodo?.arquetipo === 'piramide' && (
                                        <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-emerald-400 font-bold uppercase flex items-center gap-1"><Zap className="w-3 h-3" /> Setup da PirÃ¢mide</span>
                                            <button onClick={() => {
                                              const currentSetup = subEx.metodo.config?.series_setup || [];
                                              handleUpdateSubExercicioMetodoConfig(divisao.id, item.id, subEx.id, 'series_setup', [...currentSetup, { reps: '', carga: 'Moderada' }]);
                                            }} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors">+ Adicionar SÃ©rie</button>
                                          </div>
                                          
                                          {!subEx.metodo.config?.series_setup || subEx.metodo.config.series_setup.length === 0 ? (
                                            <div className="text-[10px] text-zinc-500 italic text-center py-2">Adicione sÃ©ries para configurar a pirÃ¢mide.</div>
                                          ) : (
                                            <div className="space-y-2">
                                              {subEx.metodo.config.series_setup.map((s: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                  <span className="text-[10px] text-zinc-500 font-bold w-12">SÃ©rie {idx + 1}</span>
                                                  <input type="text" placeholder="Reps (Ex: 15)" value={s.reps} onChange={(e) => {
                                                    const newSetup = [...subEx.metodo.config.series_setup];
                                                    newSetup[idx].reps = e.target.value;
                                                    handleUpdateSubExercicioMetodoConfig(divisao.id, item.id, subEx.id, 'series_setup', newSetup);
                                                  }} className="bg-zinc-800 text-xs text-white rounded px-2 py-1 w-24 border border-zinc-700 outline-none" />
                                                  <select value={s.carga} onChange={(e) => {
                                                    const newSetup = [...subEx.metodo.config.series_setup];
                                                    newSetup[idx].carga = e.target.value;
                                                    handleUpdateSubExercicioMetodoConfig(divisao.id, item.id, subEx.id, 'series_setup', newSetup);
                                                  }} className="bg-zinc-800 text-xs text-zinc-300 rounded px-2 py-1 border border-zinc-700 outline-none flex-1">
                                                    <option value="Leve">Carga Leve</option>
                                                    <option value="Moderada">Carga Moderada</option>
                                                    <option value="Pesada">Carga Pesada</option>
                                                    <option value="MÃ¡xima">Carga MÃ¡xima</option>
                                                  </select>
                                                  <button onClick={() => {
                                                    const newSetup = subEx.metodo.config.series_setup.filter((_:any, i:number) => i !== idx);
                                                    handleUpdateSubExercicioMetodoConfig(divisao.id, item.id, subEx.id, 'series_setup', newSetup);
                                                  }} className="text-zinc-600 hover:text-red-400 p-1"><X className="w-3 h-3" /></button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      <div className="mt-2 w-full">
                                         <input type="text" placeholder="Obs..." value={subEx.obs} onChange={(e) => handleUpdateSubExercicio(divisao.id, item.id, subEx.id, 'obs', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded text-[9px] text-zinc-400 px-2 py-1 focus:border-emerald-500/50 focus:outline-none" />
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <div className="pt-1 pb-1">
                                    <button
                                      onClick={() => handleAddSubExercicio(divisao.id, item.id)}
                                      className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-wider w-full text-left pl-2"
                                    >
                                      + Adicionar ExercÃ­cio ao Grupo
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>

                      <div className="flex gap-2 mt-4 pt-2">
                        <button
                          onClick={() => handleAddItem(divisao.id, 'simples')}
                          className="flex-1 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 transition-colors flex items-center gap-1 w-full p-2.5 border border-dashed border-zinc-700 hover:border-zinc-600 rounded-lg justify-center shadow-inner"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar ExercÃ­cio Normal
                        </button>
                        <button
                          onClick={() => handleAddItem(divisao.id, 'grupo')}
                          className="flex-1 text-xs font-bold text-emerald-500 hover:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 w-full p-2.5 border border-dashed border-emerald-500/30 hover:border-emerald-500/50 rounded-lg justify-center shadow-inner"
                        >
                          <Zap className="w-3.5 h-3.5" /> âš¡ Adicionar Grupo / Circuito
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {divisoesArray.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-zinc-500">Nenhuma divisÃ£o ativa.</p>
                      <button onClick={handleAddDivisao} className="mt-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                        Adicionar DivisÃ£o A
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsCreatingModel(false);
                  setTreinoEmEdicao(null);
                  setNewModelData({ title: '', description: '', targetStudent: 'model', validadeSemanas: '4' });
                  setDivisoesArray([{
                    id: crypto.randomUUID(),
                    nome: 'Treino A',
                    itens: [{ id: crypto.randomUUID(), tipo: 'simples', exercicio: '', series: '', reps: '', descanso: '', metodo: 'Normal', obs: '' }]
                  }]);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveNewModel}
                disabled={isSavingModel || !newModelData.title.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {isSavingModel ? 'Salvando...' : 'Salvar Treino'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORKOUT DETAILS MODAL / DRAWER */}
      {selectedWorkoutDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-zinc-800/60">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
                    {selectedWorkoutDetails.creatorId === user.id ? 'Modelo' : 'Prescrito'}
                  </span>
                  {(selectedWorkoutDetails as any).blocos > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 font-medium">
                      {(selectedWorkoutDetails as any).blocos} Blocos â€¢ {(selectedWorkoutDetails as any).exercicios} ExercÃ­cios
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-sora font-bold text-white">
                  {selectedWorkoutDetails.name || (selectedWorkoutDetails as any).titulo}
                </h2>
              </div>
              <button 
                onClick={() => { setSelectedWorkoutDetails(null); setAssigningWorkoutId(null); }}
                className="text-zinc-500 hover:text-white p-1.5 bg-zinc-900 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">DescriÃ§Ã£o</h4>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {selectedWorkoutDetails.description || (selectedWorkoutDetails as any).descricao || 'Nenhuma descriÃ§Ã£o informada para este treino.'}
                </p>
              </div>

              {/* InformaÃ§Ã£o sobre as divisÃµes */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Estrutura do Treino</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      {(selectedWorkoutDetails as any).blocos || 1} divisÃµes principais englobando um total de {(selectedWorkoutDetails as any).exercicios || 1} exercÃ­cios prescritos.
                    </p>
                    {/* Validade se existir */}
                    {(selectedWorkoutDetails as any).validade_semanas && (
                       <p className="text-xs font-bold text-amber-500 mt-2 bg-amber-500/10 w-fit px-2 py-1 rounded">
                         Validade: {(selectedWorkoutDetails as any).validade_semanas} semanas (atÃ© {new Date((selectedWorkoutDetails as any).data_validade).toLocaleDateString()})
                       </p>
                    )}
                  </div>
                </div>

                {/* RenderizaÃ§Ã£o da Estrutura */}
                {(() => {
                  let parsedDivisoes: any[] = [];
                  try {
                    const est = (selectedWorkoutDetails as any).estrutura;
                    if (est) {
                      const parsed = typeof est === 'string' ? JSON.parse(est) : est;
                      if (parsed.divisoes) {
                        parsedDivisoes = parsed.divisoes;
                      } else if (Array.isArray(parsed)) {
                        // Fallback legacy (blocos)
                        parsedDivisoes = parsed;
                      }
                    }
                  } catch(e) {}
                  
                  if (parsedDivisoes.length > 0) {
                    return (
                      <div className="space-y-6 mt-2">
                        {parsedDivisoes.map((divisao, bIdx) => (
                          <div key={bIdx} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-zinc-900/80 px-4 py-3 border-b border-zinc-800">
                              <h5 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                                {divisao.nome}
                              </h5>
                            </div>
                            <div className="p-3 space-y-2">
                              {/* Nova Arquitetura com Itens */}
                              {divisao.itens ? divisao.itens.map((item: any, iIdx: number) => {
                                if (item.tipo === 'simples') {
                                  return (
                                    <div key={iIdx} className="bg-zinc-900 p-3 rounded flex flex-col gap-2 border border-zinc-800/50 relative">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 pr-2">
                                          <span className="text-sm font-semibold text-white block">{item.exercicio || item.nome}</span>
                                          {item.obs && <span className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{item.obs}</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                          {item.series && <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">{item.series}s</span>}
                                          {item.reps && <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">{item.reps}</span>}
                                          {item.descanso && <span className="text-[10px] bg-zinc-800/50 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{item.descanso}</span>}
                                        </div>
                                      </div>
                                      {item.metodo?.tipo && item.metodo?.tipo !== 'Normal' && (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                                          <Zap className="w-3 h-3" /> {item.metodo.tipo} 
                                          {item.metodo.tipo === 'Drop-set' && ` (${item.metodo.config?.qtd_drops || 2}x)`}
                                          {item.metodo.tipo === 'Rest-pause' && ` (${item.metodo.config?.pausa || 15}s)`}
                                          {item.metodo.config?.cadencia && ` (${item.metodo.config.cadencia})`}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else if (item.tipo === 'grupo') {
                                  return (
                                    <div key={iIdx} className="bg-zinc-900/50 border border-emerald-500/20 rounded-lg overflow-hidden">
                                      <div className="bg-emerald-500/10 px-3 py-1.5 border-b border-emerald-500/20 flex items-center gap-1.5">
                                        <Zap className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{item.subtipo}</span>
                                      </div>
                                      <div className="p-2 space-y-1">
                                        {item.exercicios?.map((subEx: any, subIdx: number) => (
                                          <div key={subIdx} className="bg-zinc-950 p-2 flex flex-col gap-1 border border-zinc-800/50 rounded">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1 pr-2">
                                                <span className="text-xs font-semibold text-white block">{subEx.exercicio || subEx.nome}</span>
                                                {subEx.obs && <span className="text-[9px] text-zinc-500 line-clamp-1">{subEx.obs}</span>}
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                                {subEx.series && <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">{subEx.series}s</span>}
                                                {subEx.reps && <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">{subEx.reps}</span>}
                                                {subEx.descanso && <span className="text-[9px] bg-zinc-800/50 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{subEx.descanso}</span>}
                                              </div>
                                            </div>
                                            {subEx.metodo?.tipo && subEx.metodo?.tipo !== 'Normal' && (
                                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                                                <Zap className="w-2.5 h-2.5" /> {subEx.metodo.tipo}
                                                {subEx.metodo.tipo === 'Drop-set' && ` (${subEx.metodo.config?.qtd_drops || 2}x)`}
                                                {subEx.metodo.tipo === 'Rest-pause' && ` (${subEx.metodo.config?.pausa || 15}s)`}
                                                {subEx.metodo.config?.cadencia && ` (${subEx.metodo.config.cadencia})`}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                      {item.descansoGlobal && (
                                        <div className="bg-zinc-900 px-3 py-1.5 border-t border-emerald-500/10 flex items-center justify-between">
                                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Descanso do Grupo:</span>
                                          <span className="text-[10px] font-mono text-zinc-300">{item.descansoGlobal}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }) : 
                              /* Fallback Legacy */
                              divisao.exercicios?.map((ex: any, eIdx: number, arr: any[]) => {
                                const isConjugado = !!ex.isConjugadoGroup;
                                const isFirstInGroup = isConjugado && (eIdx === 0 || arr[eIdx-1].isConjugadoGroup !== ex.isConjugadoGroup);
                                const isLastInGroup = isConjugado && (eIdx === arr.length - 1 || arr[eIdx+1].isConjugadoGroup !== ex.isConjugadoGroup);
                                
                                return (
                                  <React.Fragment key={eIdx}>
                                    {isConjugado && isFirstInGroup && (
                                      <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest pl-2 pt-2 flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Bi-set
                                      </div>
                                    )}
                                    <div className={`bg-zinc-900 p-3 flex items-center justify-between border border-zinc-800/50 ${
                                      isConjugado ? 'border-l-2 border-l-emerald-500 ml-1' : 'rounded'
                                    } ${isFirstInGroup ? 'rounded-t' : ''} ${isLastInGroup ? 'rounded-b' : ''} ${isConjugado && !isFirstInGroup ? 'border-t-0' : ''}`}>
                                      <div className="flex-1 pr-2">
                                        <span className="text-sm font-semibold text-white block">{ex.nome}</span>
                                        {ex.obs && <span className="text-[10px] text-zinc-500 line-clamp-1">{ex.obs}</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {ex.series && <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">{ex.series}s</span>}
                                        {ex.reps && <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">{ex.reps}</span>}
                                        {ex.descanso && <span className="text-[10px] bg-zinc-800/50 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{ex.descanso}</span>}
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-md rounded-b-2xl">
              
              {user.role === 'aluno' ? (
                <button 
                  onClick={() => {
                    setSelectedWorkoutDetails(null);
                    onStartWorkout(selectedWorkoutDetails);
                  }}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-zinc-950" />
                  Iniciar Este Treino
                </button>
              ) : (
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <button 
                      onClick={() => setAssigningWorkoutId(assigningWorkoutId === selectedWorkoutDetails.id ? null : selectedWorkoutDetails.id)}
                      className="w-full py-3.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-zinc-950" />
                      Atribuir ao Aluno
                    </button>
                    
                    {/* Select Student Dropdown */}
                    {assigningWorkoutId === selectedWorkoutDetails.id && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-bottom-2">
                        <div className="px-3 py-2.5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                          <span className="text-xs font-bold text-zinc-400">Selecione o Aluno:</span>
                          <button onClick={() => setAssigningWorkoutId(null)} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {b2bStudents.length === 0 ? (
                            <div className="px-4 py-4 text-xs text-zinc-500 text-center">Nenhum aluno ativo.</div>
                          ) : (
                            b2bStudents.map(student => (
                              <button
                                key={student.id}
                                onClick={() => {
                                  handleAssignWorkout(selectedWorkoutDetails.id, student.id);
                                  setSelectedWorkoutDetails(null);
                                }}
                                disabled={isAssigning}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400 transition-colors disabled:opacity-50 border-b border-zinc-800/50 last:border-0"
                              >
                                {student.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedWorkoutDetails(null);
                      handleDeleteWorkoutPlan(selectedWorkoutDetails.id);
                    }}
                    className="py-3.5 px-4 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 rounded-xl transition-all flex items-center justify-center shrink-0"
                    title="Excluir Modelo"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

