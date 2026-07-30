import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Flame, Dumbbell, Calendar, HelpCircle, ChevronRight, Activity, Users, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User as UserType } from '../types';
import { EmptyState } from '../components/ui/EmptyState';

interface ProgressDashboardProps {
  currentUser: UserType;
}

import { useOutletContext } from 'react-router-dom';

export default function ProgressDashboard() {
  const { currentUser } = useOutletContext<any>();
  const [students, setStudents] = useState<Array<{ id: string, name: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentUser.role === 'aluno' ? currentUser.id : '');
  const [isLoading, setIsLoading] = useState(true);
  
  const [logSets, setLogSets] = useState<any[]>([]);
  const [exercises, setExercises] = useState<Array<{ id: string, name: string }>>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('all');
  const [metricType, setMetricType] = useState<'weight' | 'volume'>('weight');

  // Fetch students if personal
  useEffect(() => {
    async function fetchStudents() {
      if (currentUser.role === 'personal') {
        const { data, error } = await supabase
          .from('personal_aluno')
          .select('aluno_id, aluno:profiles!aluno_id(id, name)')
          .eq('personal_id', currentUser.id);
          
        if (data && data.length > 0) {
          const formatted = data.map(d => ({
            id: d.aluno_id,
            name: Array.isArray(d.aluno) ? (d.aluno[0] as any)?.name : (d.aluno as any)?.name || 'Aluno'
          }));
          setStudents(formatted);
          if (!selectedStudentId) {
            setSelectedStudentId(formatted[0].id);
          }
        } else {
          setStudents([]);
          setIsLoading(false);
        }
      }
    }
    fetchStudents();
  }, [currentUser, selectedStudentId]);

  // Fetch log sets for the selected student
  useEffect(() => {
    async function fetchLogs() {
      if (!selectedStudentId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('log_sets' as any)
          .select(`
            weight_used,
            reps_done,
            created_at,
            workout_items (
              exercises (
                id,
                name
              )
            ),
            workout_logs!inner(aluno_id, created_at)
          `)
          .eq('workout_logs.aluno_id', selectedStudentId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        const formattedLogs = data?.map(d => ({
          weight: (d as any).weight_used || 0,
          reps: (d as any).reps_done || 0,
          date: new Date((d as any).workout_logs?.created_at || (d as any).created_at).toISOString().split('T')[0],
          exerciseId: (d as any).workout_items?.exercises?.id || 'unknown',
          exerciseName: (d as any).workout_items?.exercises?.name || 'Desconhecido',
        })).filter(l => l.exerciseId !== 'unknown') || [];

        setLogSets(formattedLogs);

        // Extract unique exercises
        const exMap = new Map();
        formattedLogs.forEach(l => {
          if (!exMap.has(l.exerciseId)) {
            exMap.set(l.exerciseId, l.exerciseName);
          }
        });
        const exList = Array.from(exMap, ([id, name]) => ({ id, name }));
        setExercises(exList);
        
        if (exList.length > 0 && selectedExerciseId === 'all') {
          // Keep 'all' or select first
        }
      } catch (e) {
        console.error('Erro ao buscar logs:', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [selectedStudentId]);

  // Process data for charts
  const filteredLogs = selectedExerciseId === 'all' 
    ? logSets 
    : logSets.filter(l => l.exerciseId === selectedExerciseId);

  // Group by date to get max weight or total volume per day
  const groupedByDate = filteredLogs.reduce((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = { weight: 0, volume: 0 };
    }
    const vol = log.weight * log.reps;
    if (log.weight > acc[log.date].weight) acc[log.date].weight = log.weight;
    acc[log.date].volume += vol;
    return acc;
  }, {} as Record<string, { weight: number, volume: number }>);

  const dataPoints = Object.keys(groupedByDate).sort().map(date => ({
    date,
    weight: groupedByDate[date].weight,
    volume: groupedByDate[date].volume
  }));

  // Chart computation
  const values = dataPoints.map(dp => metricType === 'weight' ? dp.weight : dp.volume);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0) * 0.8; // Give some bottom padding
  const range = maxValue - minValue;

  const width = 340;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const points = dataPoints.map((dp, idx) => {
    const val = metricType === 'weight' ? dp.weight : dp.volume;
    const x = paddingX + (idx / Math.max(dataPoints.length - 1, 1)) * (width - 2 * paddingX);
    const yPercentage = range > 0 ? (val - minValue) / range : 0.5;
    const y = height - paddingY - yPercentage * (height - 2 * paddingY);
    return { x, y, value: val, date: dp.date };
  });

  let pathD = '';
  let areaD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, idx) => {
      if (idx > 0) pathD += ` L ${p.x} ${p.y}`;
    });
    areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  }

  // Personal Records logic
  const getTimeline = () => {
    if (selectedExerciseId !== 'all') {
      // Timeline of PRs for this exercise
      let currentMax = 0;
      const prs = [];
      for (const dp of dataPoints) {
        if (dp.weight > currentMax) {
          const increase = dp.weight - currentMax;
          currentMax = dp.weight;
          prs.push({ date: dp.date, weight: dp.weight, increase });
        }
      }
      return prs.reverse().map((pr, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-lime-electric/20 flex items-center justify-center border border-lime-electric/30">
              <Award className="w-4 h-4 text-lime-electric" />
            </div>
            {idx !== prs.length - 1 && <div className="w-px h-full bg-surf-2 my-1" />}
          </div>
          <div className="pb-6">
            <div className="text-xs text-text-secondary font-mono">{pr.date.split('-').reverse().join('/')}</div>
            <div className="font-sora font-bold text-text-primary text-sm mt-1">
              Novo Recorde: {pr.weight} kg
            </div>
            {pr.increase > 0 && pr.increase !== pr.weight && (
              <div className="text-xs text-success font-bold mt-1">+{pr.increase}kg desde o Ãºltimo marco</div>
            )}
          </div>
        </div>
      ));
    } else {
      // Last 5 sessions summary
      const last5 = [...dataPoints].reverse().slice(0, 5);
      return last5.map((dp, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-surf-2 flex items-center justify-center border border-surf-2">
              <Dumbbell className="w-4 h-4 text-text-muted" />
            </div>
            {idx !== last5.length - 1 && <div className="w-px h-full bg-surf-2 my-1" />}
          </div>
          <div className="pb-6">
            <div className="text-xs text-text-secondary font-mono">{dp.date.split('-').reverse().join('/')}</div>
            <div className="font-sora font-bold text-text-primary text-sm mt-1">
              Treino ConcluÃ­do
            </div>
            <div className="text-xs text-text-muted mt-1">Volume total do dia: {dp.volume}kg</div>
          </div>
        </div>
      ));
    }
  };

  return (
    <div id="progress-view" className="space-y-6 pb-24 px-4 sm:px-6 md:px-8 pt-6 w-full max-w-6xl mx-auto">
      
      {/* View Header */}
      <div>
        <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-teal-data block">DESEMPENHO AVANÃ‡ADO</span>
        <h1 className="font-sora font-extrabold text-lg sm:text-2xl text-text-primary">EvoluÃ§Ã£o do Atleta</h1>
      </div>

      {currentUser.role === 'personal' && (
        <div className="bg-surf-1 border border-surf-2 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-text-secondary" />
            <h3 className="font-sora font-bold text-sm text-text-primary">Analisando Aluno:</h3>
          </div>
          <select 
            className="w-full sm:w-auto bg-surf-2 border border-surf-2 focus:border-lime-electric text-text-primary text-sm rounded-xl px-4 py-2 outline-none font-medium"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {students.length === 0 ? (
              <option value="" disabled>Nenhum aluno vinculado ao seu perfil</option>
            ) : (
              <>
                <option value="" disabled>Selecione um aluno...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </>
            )}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-lime-electric animate-spin" />
        </div>
      ) : !selectedStudentId ? (
        <EmptyState 
          icon={Users}
          title="Selecione um aluno"
          description="Escolha um aluno no menu acima para visualizar o histÃ³rico de evoluÃ§Ã£o e grÃ¡ficos de desempenho."
        />
      ) : dataPoints.length === 0 ? (
        <EmptyState 
          icon={Activity}
          title="Nenhum dado histÃ³rico"
          description="Este aluno ainda nÃ£o possui dados histÃ³ricos de treino salvos para gerar grÃ¡ficos."
        />
      ) : (
        <>
          {/* Selector of Exercise */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedExerciseId('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  selectedExerciseId === 'all' 
                    ? 'bg-lime-electric text-bg-dark shadow-[0_0_15px_rgba(196,248,42,0.15)]' 
                    : 'bg-surf-1 text-text-muted hover:text-text-primary border border-surf-2'
                }`}
              >
                VisÃ£o Geral
              </button>
              {exercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExerciseId(ex.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    selectedExerciseId === ex.id 
                      ? 'bg-lime-electric text-bg-dark shadow-[0_0_15px_rgba(196,248,42,0.15)]' 
                      : 'bg-surf-1 text-text-muted hover:text-text-primary border border-surf-2'
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-surf-1 border border-surf-2 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-sora font-extrabold text-text-primary">Curva de ProgressÃ£o</h3>
                <span className="text-xs text-text-secondary">{selectedExerciseId === 'all' ? 'Volume Global' : 'Carga MÃ¡xima'}</span>
              </div>
              
              <div className="flex bg-surf-2 p-1 rounded-lg">
                <button 
                  onClick={() => setMetricType('weight')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${metricType === 'weight' ? 'bg-surf-1 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  Carga
                </button>
                <button 
                  onClick={() => setMetricType('volume')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${metricType === 'volume' ? 'bg-surf-1 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  Volume
                </button>
              </div>
            </div>

            <div className="relative w-full h-[180px] overflow-x-auto overflow-y-hidden scrollbar-hide">
              <svg width={width} height={height} className="min-w-full drop-shadow-lg">
                {/* Background grid */}
                <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1={paddingX} y1={height/2} x2={width - paddingX} y2={height/2} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x={paddingX - 10} y={paddingY + 4} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {Math.round(maxValue)}
                </text>
                <text x={paddingX - 10} y={height - paddingY + 4} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {Math.round(minValue)}
                </text>

                {points.length > 1 && (
                  <>
                    {/* Area fill */}
                    <path d={areaD} fill="url(#gradient)" className="opacity-20" />
                    
                    {/* Line */}
                    <path d={pathD} fill="none" stroke="var(--color-lime-electric)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}

                {/* Data Points */}
                {points.map((p, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="4" fill="var(--color-bg-dark)" stroke="var(--color-lime-electric)" strokeWidth="2" className="transition-all duration-300 group-hover:r-6" />
                    <text x={p.x} y={p.y - 12} fill="#e4e4e7" fontSize="10" textAnchor="middle" opacity="0" className="group-hover:opacity-100 font-bold transition-opacity">
                      {p.value}kg
                    </text>
                  </g>
                ))}

                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-lime-electric)" stopOpacity="1" />
                    <stop offset="100%" stopColor="var(--color-lime-electric)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Timeline of PRs / Recent Sessions */}
          <div className="bg-surf-1 border border-surf-2 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h3 className="font-sora font-extrabold text-text-primary mb-6">
              {selectedExerciseId === 'all' ? 'Registros Recentes' : 'Linha do Tempo de Destaques'}
            </h3>
            <div className="ml-2">
              {getTimeline()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

