import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Check, Clock, X, RotateCcw, Volume2, VolumeX, AlertCircle,
  Plus, Minus, SkipForward, ArrowLeft, Trophy, Sparkles, ChevronRight, CheckSquare, ChevronDown, CheckCircle2
} from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { EmptyState } from './ui/EmptyState';

interface WorkoutExecutionProps {
  workout: any; // using any to support the dynamic JSONB structure
  user: User;
  onFinish: (session: any) => void;
  onCancel: () => void;
  onMinimize?: () => void;
}

// Data structures for the Live Engine
interface ExecSet {
  id: string;
  setNumber: number;
  weightPrescribed: number;
  repsPrescribed: string; // "10-12"
  restSeconds: number;
  technique: string;
  completed: boolean;
  executedWeight: number;
  executedReps: number;
}

interface ExecExercise {
  id: string;
  name: string;
  obs: string;
  technique: string;
  sets: ExecSet[];
}

interface ExecBlock {
  id: string;
  type: string;
  name: string;
  exercises: ExecExercise[];
}

/**
 * Extrator Universal de Exercícios (Deep Hydration)
 * 
 * POR QUE ISSO EXISTE?
 * O aplicativo TreinoBase B2B2C salva a prescrição de treinos usando a tipagem JSONB na coluna `estrutura` ou `conteudo` no Supabase.
 * Para evitar que atualizações no formato do construtor pelo Personal Trainer (B2B) quebrem o frontend do Aluno (B2C),
 * este extrator atua como um Middleware Agnóstico. 
 * 
 * COMO FUNCIONA:
 * Ele desestrutura o payload e procura todas as chaves históricas (`divisoes`, `blocos`, `rotinas`, `fichas`),
 * normalizando-as para uma interface única compreensível pela tela de execução. Se encontrar um array solto, ele o empacota
 * em uma divisão sintética ('Treino Completo').
 * 
 * @param payload Objeto JSONB ou String stringificada retornado pelo Supabase (tabela `treinos`)
 * @returns Array padronizado: { id, nome, exercicios: [] }[]
 */
const extrairDivisoesEExercicios = (payload: any) => {
  if (!payload) return [];

  try {
    const dados = typeof payload === 'string' ? JSON.parse(payload) : payload;

    // 1. Array puro de divisões (Formato Flat / Antigo)
    if (Array.isArray(dados)) {
       return [{ id: 'div-unica', nome: 'Treino Completo', exercicios: dados }];
    }

    // 2. Procura pela lista estruturada
    const listaDivisoes = dados.divisoes || dados.blocos || dados.rotinas || dados.fichas;
    
    if (Array.isArray(listaDivisoes) && listaDivisoes.length > 0) {
      return listaDivisoes.map((div, idx) => ({
        id: div.id || `div-${idx}`,
        nome: div.nome || div.titulo || `Divisão ${String.fromCharCode(65 + idx)}`,
        exercicios: div.exercicios || div.items || div.itens || div.blocos || []
      }));
    }

    // 3. Fallback: JSON sem raiz de divisões, mas com array de exercícios flat
    const listaExerciciosFlat = dados.exercicios || dados.items || dados.itens;
    if (Array.isArray(listaExerciciosFlat) && listaExerciciosFlat.length > 0) {
      return [{ id: 'div-unica', nome: 'Treino Completo', exercicios: listaExerciciosFlat }];
    }
  } catch {
    // Falha silenciosa: Se o JSON estiver quebrado, retorna array vazio para o EmptyState da UI atuar.
  }

  return [];
};

export default function WorkoutExecution({ workout, user, onFinish, onCancel, onMinimize }: WorkoutExecutionProps) {
  // Session details
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Debug de Segurança (Removido do Code Freeze)

  // Tab state for when there are multiple divisions
  const divisoesProcessadas = extrairDivisoesEExercicios(workout.estrutura || workout.conteudo || workout);
  
  // Encontra a primeira divisão que realmente tem exercícios dentro
  const primeiraDivisaoValida = divisoesProcessadas.find(d => d.exercicios && d.exercicios.length > 0) || divisoesProcessadas[0];

  const [activeDivisaoId, setActiveDivisaoId] = useState<string>(() => {
    return primeiraDivisaoValida?.id || '';
  });

  const [sessionBlocks, setSessionBlocks] = useState<ExecBlock[]>([]);

  // Parse JSONB when active division changes
  useEffect(() => {
    let activeDiv = divisoesProcessadas.find((d: any) => d.id === activeDivisaoId) || divisoesProcessadas[0];
    let exerciciosParaRenderizar = activeDiv?.exercicios || [];

    // 3. TRAVA DE SEGURANÇA (BYPASS): Se a divisão ativa estiver vazia ou não for encontrada,
    // pega a primeira divisão com exercícios ou junta todos os exercícios do treino em uma lista única!
    if (exerciciosParaRenderizar.length === 0) {
      const divisaoComDados = divisoesProcessadas.find(d => d.exercicios && d.exercicios.length > 0);
      if (divisaoComDados) {
        exerciciosParaRenderizar = divisaoComDados.exercicios;
        setActiveDivisaoId(divisaoComDados.id);
      } else {
        // Último recurso: extrai qualquer array de dentro do objeto treino que pareça ser um exercício
        const dumpExercicios = Object.values(workout.estrutura || workout.conteudo || workout).filter(val => Array.isArray(val) && val.length > 0).flat();
        if (dumpExercicios.length > 0) {
          exerciciosParaRenderizar = dumpExercicios;
        }
      }
    }

    if (exerciciosParaRenderizar.length === 0) {
      setSessionBlocks([]);
      return;
    }

    const blocks: ExecBlock[] = exerciciosParaRenderizar.map((item: any, idx: number) => {
      if (item.tipo === 'grupo') {
        return {
          id: item.id || `block-${idx}`,
          type: item.metodo?.nome || 'Agrupado',
          name: item.metodo?.nome || 'Agrupado',
          exercises: item.exercicios.map((ex: any, exIdx: number) => {
            const seriesCount = parseInt(ex.series) || 3;
            const repsBase = parseInt(ex.reps) || 10;
            const restBase = parseInt(ex.descanso) || 60;
            return {
              id: ex.id || `ex-${idx}-${exIdx}`,
              name: ex.nome || 'Exercício',
              obs: ex.obs,
              technique: ex.metodo?.nome || 'none',
              sets: Array.from({ length: seriesCount }).map((_, sIdx) => ({
                id: `set-${ex.id}-${sIdx}`,
                setNumber: sIdx + 1,
                weightPrescribed: 0,
                repsPrescribed: ex.reps,
                restSeconds: restBase,
                technique: ex.metodo?.nome || 'none',
                completed: false,
                executedWeight: 0, // In a real scenario, fetch previous PR here
                executedReps: repsBase
              }))
            };
          })
        };
      } else {
        const seriesCount = parseInt(item.series) || 3;
        const repsBase = parseInt(item.reps) || 10;
        const restBase = parseInt(item.descanso) || 60;
        return {
          id: item.id || `block-${idx}`,
          type: 'straight',
          name: item.exercicio || 'Exercício Simples',
          exercises: [
            {
              id: item.id || `ex-${idx}`,
              name: item.exercicio || 'Exercício',
              obs: item.obs,
              technique: item.metodo || 'none',
              sets: Array.from({ length: seriesCount }).map((_, sIdx) => ({
                id: `set-${item.id}-${sIdx}`,
                setNumber: sIdx + 1,
                weightPrescribed: 0,
                repsPrescribed: item.reps,
                restSeconds: restBase,
                technique: item.metodo || 'none',
                completed: false,
                executedWeight: 0,
                executedReps: repsBase
              }))
            }
          ]
        };
      }
    });

    setSessionBlocks(blocks);
  }, [activeDivisaoId]);

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active workout timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // REST TIMER STATE
  const [restDuration, setRestDuration] = useState(0); // target rest
  const [restSecondsLeft, setRestSecondsLeft] = useState(0); // active countdown
  const [isResting, setIsResting] = useState(false);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Success celebration message
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('Série concluída!');

  // Generate real audio beep using browser's AudioContext
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.5);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Web Audio chime not supported', e);
    }
  };

  // Start rest timer
  const startRestTimer = (seconds: number) => {
    if (seconds <= 0) return;
    
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
    }

    setRestDuration(seconds);
    setRestSecondsLeft(seconds);
    setIsResting(true);

    restTimerRef.current = setInterval(() => {
      setRestSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current!);
          setIsResting(false);
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSet = (bIdx: number, eIdx: number, sIdx: number, updates: Partial<ExecSet>) => {
    setSessionBlocks(prev => {
      const copy = [...prev];
      const ex = copy[bIdx].exercises[eIdx];
      ex.sets[sIdx] = { ...ex.sets[sIdx], ...updates };
      return copy;
    });
  };

  const handleToggleSetCompleted = (bIdx: number, eIdx: number, sIdx: number) => {
    const set = sessionBlocks[bIdx].exercises[eIdx].sets[sIdx];
    const newCompleted = !set.completed;
    
    updateSet(bIdx, eIdx, sIdx, { completed: newCompleted });

    if (newCompleted) {
      // Show celebration
      const messages = ['Execução impecável!', 'Série destruída! 🔥', 'Monstruoso!', 'Progresso puro!'];
      setCelebrationMsg(messages[Math.floor(Math.random() * messages.length)]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);

      // Start rest timer
      if (set.restSeconds > 0) {
        startRestTimer(set.restSeconds);
      }
    }
  };

  const handleAddRestTime = () => {
    setRestSecondsLeft(prev => prev + 15);
    setRestDuration(prev => prev + 15);
  };

  const handleSkipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsResting(false);
    setRestSecondsLeft(0);
  };

  const handleFinishWorkout = async () => {
    setIsFinishing(true);
    try {
      let volumeTotal = 0;
      const completedLog: any[] = [];
      
      sessionBlocks.forEach(b => {
        b.exercises.forEach(e => {
          const completedSets = e.sets.filter(s => s.completed);
          if (completedSets.length > 0) {
            completedSets.forEach(s => {
              volumeTotal += (s.executedWeight * s.executedReps);
            });
            completedLog.push({
              exercise: e.name,
              sets: completedSets.map(s => ({ weight: s.executedWeight, reps: s.executedReps }))
            });
          }
        });
      });

      const payloadSessao = {
        aluno_id: user.id,
        treino_id: workout.id,
        personal_id: workout.creatorId || workout.personal_id,
        data_execucao: new Date().toISOString(),
        carga_total_kg: volumeTotal,
        duracao_minutos: Math.floor(elapsedSeconds / 60),
        detalhes_execucao: JSON.stringify(completedLog) // Mantém como JSON.stringify p/ text/jsonb
      };

      // Tenta gravar na tabela 'sessoes'
      const { error } = await supabase.from('sessoes').insert([payloadSessao]);
      if (error) {
        console.error("Erro ao gravar sessao: ", error);
      }

      onFinish({ ...payloadSessao, volumeTotal });
    } catch (err) {
      console.error(err);
    } finally {
      setIsFinishing(false);
    }
  };

  const totalSets = sessionBlocks.reduce((acc, b) => 
    acc + b.exercises.reduce((exAcc, ei) => exAcc + ei.sets.length, 0), 0
  );
  
  const completedSetsCount = sessionBlocks.reduce((acc, b) => 
    acc + b.exercises.reduce((exAcc, ei) => 
      exAcc + ei.sets.filter(s => s.completed).length, 0
    ), 0
  );

  const percentProgress = totalSets > 0 ? Math.round((completedSetsCount / totalSets) * 100) : 0;

  if (sessionBlocks.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <EmptyState 
          icon={AlertCircle}
          title="Treino Vazio"
          description="Este treino ainda não possui exercícios vinculados na divisão selecionada."
        />
        
        {/* DEBUG DE TELA (RAIO-X VISUAL TEMPORÁRIO) */}
        <div className="mt-4 w-full max-w-lg bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-left overflow-hidden">
          <p className="text-xs font-bold text-red-500 mb-2">DIAGNÓSTICO PAYLOAD (RAIO-X)</p>
          <pre className="text-[10px] text-red-400 overflow-auto max-h-40 hide-scrollbar">
            {JSON.stringify(workout.estrutura || workout.conteudo || workout, null, 2)}
          </pre>
        </div>

        <button 
          onClick={onCancel}
          className="mt-6 w-full max-w-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-3 rounded-xl border border-zinc-700/50 transition-all font-medium flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Início
        </button>
      </div>
    );
  }

  return (
    <div id="execution-screen" className="min-h-screen bg-zinc-950 pb-40 text-zinc-100 w-full max-w-5xl mx-auto relative flex flex-col justify-between overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="bg-zinc-900 border-b border-zinc-800 pt-4 pb-2 sticky top-0 z-20 shadow-sm flex flex-col gap-3">
        <div className="px-4 sm:px-6 flex items-center justify-between">
          <button id="exec-back-btn" onClick={onCancel} className="p-2 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400" title="Cancelar Treino">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center flex-1">
            <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-lime-400">SESSÃO ATIVA</span>
            <h2 className="font-sora font-extrabold text-sm sm:text-lg truncate max-w-full mx-auto px-2">{workout.name || workout.titulo}</h2>
          </div>

          {onMinimize ? (
            <button onClick={onMinimize} className="p-2 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400" title="Minimizar">
              <ChevronDown className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>

        {/* Division Selector */}
        {divisoesProcessadas.length > 1 && (
        <div className="bg-zinc-900 border-b border-zinc-800 p-2 sm:p-4 overflow-x-auto hide-scrollbar sticky top-14 z-40">
          <div className="flex gap-2 w-max mx-auto">
            {divisoesProcessadas.map((div: any) => (
              <button
                key={div.id}
                onClick={() => setActiveDivisaoId(div.id)}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
                  ${activeDivisaoId === div.id
                    ? 'bg-lime-500 text-zinc-950 shadow-[0_0_15px_rgba(132,204,22,0.3)]'
                    : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }
                `}
              >
                {div.nome || div.titulo || 'Divisão'}
              </button>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* BODY WORKOUT LOGGER */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {sessionBlocks.map((block, bIdx) => (
          <div 
            key={block.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm"
          >
            {/* Block Header */}
            {block.type !== 'straight' && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded">
                  {block.name}
                </span>
              </div>
            )}

            <div className="space-y-6">
              {block.exercises.map((ex, eIdx) => (
                <div key={ex.id} className="space-y-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-zinc-100 font-sora">{ex.name}</span>
                    {ex.obs && <span className="text-[11px] text-zinc-500">{ex.obs}</span>}
                  </div>

                  <div className="space-y-2">
                    {ex.sets.map((set, sIdx) => (
                      <div 
                        key={set.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                          set.completed 
                            ? 'bg-emerald-950/20 border-emerald-900/50' 
                            : 'bg-zinc-950/50 border-zinc-800/50 hover:border-zinc-700'
                        }`}
                      >
                        {/* Left Side: Info */}
                        <div className="w-12 text-center shrink-0">
                          <span className="text-xs font-bold text-zinc-500 block mb-0.5">Série {set.setNumber}</span>
                          <span className={`text-sm font-mono font-bold ${set.completed ? 'text-emerald-400' : 'text-zinc-300'}`}>{set.repsPrescribed}</span>
                        </div>

                        {/* Center Inputs */}
                        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4">
                          <div className="flex flex-col items-center">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Carga (kg)</label>
                            <input 
                              type="number"
                              min="0"
                              value={set.executedWeight === 0 ? '' : set.executedWeight}
                              onChange={(e) => updateSet(bIdx, eIdx, sIdx, { executedWeight: parseInt(e.target.value) || 0 })}
                              disabled={set.completed}
                              placeholder="0"
                              className="bg-zinc-800 text-lime-400 font-bold px-3 py-1.5 rounded-lg text-center w-16 sm:w-20 outline-none focus:ring-2 ring-lime-500/50 transition-all disabled:opacity-50"
                            />
                          </div>
                          
                          <div className="flex flex-col items-center">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Reps</label>
                            <input 
                              type="number"
                              min="0"
                              value={set.executedReps}
                              onChange={(e) => updateSet(bIdx, eIdx, sIdx, { executedReps: parseInt(e.target.value) || 0 })}
                              disabled={set.completed}
                              className="bg-zinc-800 text-zinc-100 font-bold px-3 py-1.5 rounded-lg text-center w-16 sm:w-20 outline-none focus:ring-2 ring-lime-500/50 transition-all disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Right Side: Check */}
                        <button
                          onClick={() => handleToggleSetCompleted(bIdx, eIdx, sIdx)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95 ${
                            set.completed 
                              ? 'bg-lime-500 text-zinc-950 shadow-lime-500/20' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          {set.completed ? <CheckCircle2 className="w-6 h-6 stroke-[2.5]" /> : <Check className="w-5 h-5 stroke-[2.5]" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* COMPACT FLOATING BOTTOM DASHBOARD (FINISH BUTTON) */}
      <div className="bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 px-4 py-4 fixed bottom-0 left-0 right-0 z-20 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          
          <div className="flex items-center justify-between text-xs font-bold font-mono">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Clock className="w-4 h-4 text-lime-400" />
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-zinc-400">
              {completedSetsCount} de {totalSets} Séries
            </div>
          </div>
          
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
            <div 
              className="h-full bg-lime-400 transition-all duration-500 rounded-full" 
              style={{ width: `${percentProgress}%` }}
            />
          </div>

          <button
            onClick={handleFinishWorkout}
            disabled={isFinishing}
            className="w-full bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-zinc-950 font-extrabold font-sora py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-lime-500/10 active:scale-[0.98]"
          >
            {isFinishing ? (
              <span className="animate-pulse">Registrando...</span>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                Finalizar e Registrar Treino
              </>
            )}
          </button>
        </div>
      </div>

      {/* REST TIMER RING COUNTDOWN OVERLAY CONTAINER */}
      {isResting && (
        <div id="rest-timer-overlay" className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center z-50 px-6">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-[radial-gradient(circle_at_top,_var(--color-warning)_0%,_transparent_55%)] opacity-10 pointer-events-none" />

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center justify-center text-center space-y-6 relative shadow-2xl">
            
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
                Intervalo de Descanso
              </span>
            </div>

            {/* Circular Ring Timer */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="88" cy="88" r="72" stroke="#27272a" strokeWidth="6" fill="transparent" />
                <circle
                  cx="88" cy="88" r="72" stroke="#fbbf24" strokeWidth="6" fill="transparent"
                  strokeDasharray={2 * Math.PI * 72}
                  strokeDashoffset={(2 * Math.PI * 72) - (restSecondsLeft / restDuration) * (2 * Math.PI * 72)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center font-mono">
                <span className="text-4xl font-black text-zinc-100 tracking-tighter">
                  {formatTime(restSecondsLeft)}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-1">Descanso</span>
              </div>
            </div>

            {/* Audio configuration & helper controls */}
            <div className="flex gap-4 items-center justify-center w-full">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 transition-all flex items-center gap-1.5 text-xs font-semibold"
              >
                {soundEnabled ? <><Volume2 className="w-4 h-4 text-lime-400" /> Som Ativo</> : <><VolumeX className="w-4 h-4 text-zinc-500" /> Sem Som</>}
              </button>

              <button
                onClick={handleAddRestTime}
                className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 transition-all flex items-center gap-1.5 text-xs font-semibold"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                +15 segundos
              </button>
            </div>

            {/* Big Skip Button */}
            <button
              onClick={handleSkipRest}
              className="w-full bg-amber-400 hover:bg-amber-400/90 text-zinc-950 font-extrabold font-sora py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(251,191,36,0.2)] active:scale-95"
            >
              <SkipForward className="w-4.5 h-4.5 stroke-[2.5]" />
              PULAR DESCANSO
            </button>
          </div>
        </div>
      )}

      {/* FLOATING CONGRATULATORY FEEDBACK BUBBLE */}
      {showCelebration && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-zinc-900 border border-lime-500/30 px-5 py-3 rounded-full flex items-center gap-2 z-40 shadow-xl animate-bounce">
          <Sparkles className="w-4 h-4 text-lime-400" />
          <span className="font-sora font-extrabold text-xs text-zinc-100">{celebrationMsg}</span>
        </div>
      )}
    </div>
  );
}
