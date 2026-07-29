import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Dumbbell, Clock } from 'lucide-react';
import { WorkoutSession } from '../types';

interface CalendarModalProps {
  sessions: WorkoutSession[];
  onClose: () => void;
}

export default function CalendarModal({ sessions, onClose }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDateStr(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDateStr(null);
  };

  // Build grid
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Format date to string "DD/MM/YYYY" matching the mock data structure 
  // (In App.tsx, sessions dates are saved as new Date().toLocaleDateString('pt-BR'))
  const formatDateStr = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return d.toLocaleDateString('pt-BR');
  };

  const getSessionsForDay = (day: number) => {
    if (!day) return [];
    const dateStr = formatDateStr(day);
    return sessions.filter(s => s.date === dateStr);
  };

  const selectedSessions = selectedDateStr 
    ? sessions.filter(s => s.date === selectedDateStr)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surf-1 border border-surf-2 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surf-2">
          <h2 className="font-sora font-bold text-text-primary text-lg">Histórico de Treinos</h2>
          <button onClick={onClose} className="p-2 bg-surf-2 rounded-xl text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Body */}
        <div className="p-4 sm:p-5 overflow-y-auto">
          
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-surf-2 rounded-lg text-text-secondary transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-sora font-bold text-text-primary text-sm sm:text-base">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-surf-2 rounded-lg text-text-secondary transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-10 sm:h-12" />;
              }

              const daySessions = getSessionsForDay(day);
              const hasSession = daySessions.length > 0;
              const dateStr = formatDateStr(day);
              const isSelected = selectedDateStr === dateStr;

              // Identificadores curtos para os badges (Ex: T = Treino)
              // Em um app real, o Workout.name poderia ter um apelido "A", "B", etc.
              const badgeLabels = daySessions.map(s => s.workoutName.charAt(0).toUpperCase()).slice(0, 2);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`
                    h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center relative transition-all
                    ${isSelected ? 'bg-surf-2 border-lime-electric text-white' : 'bg-surf-1/50 hover:bg-surf-2 border-transparent text-text-secondary'}
                    border
                  `}
                >
                  <span className="text-xs sm:text-sm font-bold">{day}</span>
                  
                  {hasSession && (
                    <div className="flex gap-0.5 mt-0.5">
                      {badgeLabels.map((l, i) => (
                        <div key={i} className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-lime-electric flex items-center justify-center text-bg-dark text-[8px] font-extrabold shadow-sm">
                          {l}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Date Details */}
          {selectedDateStr && (
            <div className="mt-6 pt-4 border-t border-surf-2 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xs font-bold text-text-secondary mb-3">Treinos no dia {selectedDateStr}</h3>
              
              {selectedSessions.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4 bg-bg-dark/50 rounded-xl">
                  Nenhum treino registrado neste dia.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedSessions.map(session => {
                    const sessionVolume = session.blocks.reduce((acc, b) => 
                      acc + b.exercises.reduce((exAcc, ei) => 
                        exAcc + ei.sets.reduce((sAcc, set) => 
                          sAcc + (set.completed ? (set.executedWeight || 0) * (set.executedReps || 0) : 0), 0
                        ), 0
                      ), 0
                    );
                    const formattedDuration = `${Math.floor(session.durationSeconds / 60)} min`;

                    return (
                      <div key={session.id} className="bg-bg-dark border border-surf-2 rounded-xl p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-sora font-bold text-sm text-lime-electric">{session.workoutName}</h4>
                        </div>
                        <div className="flex gap-4 text-xs font-mono text-text-secondary">
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formattedDuration}</span>
                          <span className="flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5" /> {sessionVolume}kg Total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
