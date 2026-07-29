import React, { useState } from 'react';
import { 
  Plus, Trash2, Dumbbell, Save, RefreshCw, Layers, ArrowLeft, 
  HelpCircle, Copy, Info, Search, Sparkles, ChevronRight, Check
} from 'lucide-react';
import { Workout, WorkoutBlock, Exercise, SetItem, ExerciseItem, BlockType } from '../types';
import { INITIAL_EXERCISES } from '../mockData';

interface BlockEditorProps {
  workoutToEdit?: Workout | null;
  onSave: (workout: Workout) => void;
  onCancel: () => void;
}

export default function BlockEditor({ workoutToEdit, onSave, onCancel }: BlockEditorProps) {
  const [workoutName, setWorkoutName] = useState(workoutToEdit?.name || 'Novo Treino Customizado');
  const [workoutDesc, setWorkoutDesc] = useState(workoutToEdit?.description || 'Prescrição personalizada com técnicas avançadas.');
  const [blocks, setBlocks] = useState<WorkoutBlock[]>(workoutToEdit?.blocks || [
    {
      id: 'b-new-1',
      type: 'straight',
      name: 'Bloco 1 - Supino e Força',
      exercises: [
        {
          id: 'ei-new-1',
          exercise: INITIAL_EXERCISES[0], // Supino reto
          sets: [
            { id: 's-n1', setNumber: 1, weight: 60, reps: '10', technique: 'none', rest: 90, rpe: 8 },
            { id: 's-n2', setNumber: 2, weight: 65, reps: '8', technique: 'none', rest: 100, rpe: 8 },
            { id: 's-n3', setNumber: 3, weight: 70, reps: '6-8', technique: 'drop', rest: 120, rpe: 10 }
          ]
        }
      ]
    }
  ]);

  // Exercise selection Modal state
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');

  // Custom exercise creation state
  const [isCreatingCustomExercise, setIsCreatingCustomExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState('Peito');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState('Halteres');

  const [availableExercises, setAvailableExercises] = useState<Exercise[]>(INITIAL_EXERCISES);

  const muscleGroups = ['Todos', 'Peito', 'Costas', 'Pernas', 'Bíceps', 'Tríceps', 'Ombros'];

  // Handle saving the workout
  const handleSaveWorkout = () => {
    if (!workoutName.trim()) return;
    const finalWorkout: Workout = {
      id: workoutToEdit?.id || `w-${Date.now()}`,
      name: workoutName,
      description: workoutDesc,
      blocks: blocks,
      creatorId: 'personal-1',
      createdAt: workoutToEdit?.createdAt || new Date().toISOString()
    };
    onSave(finalWorkout);
  };

  // Helper to add a new block
  const handleAddBlock = (type: BlockType = 'straight') => {
    const blockId = `b-${Date.now()}`;
    const newBlock: WorkoutBlock = {
      id: blockId,
      type,
      name: `Bloco ${blocks.length + 1} - Novo Bloco`,
      exercises: []
    };
    setBlocks([...blocks, newBlock]);
  };

  // Helper to delete a block
  const handleDeleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  // Duplicate a block
  const handleDuplicateBlock = (block: WorkoutBlock) => {
    const newBlock: WorkoutBlock = {
      ...block,
      id: `b-${Date.now()}`,
      name: `${block.name} (Cópia)`,
      exercises: block.exercises.map(ei => ({
        ...ei,
        id: `ei-${Date.now()}-${Math.random()}`,
        sets: ei.sets.map(s => ({ ...s, id: `s-${Date.now()}-${Math.random()}` }))
      }))
    };
    setBlocks([...blocks, newBlock]);
  };

  // Set block type
  const handleSetBlockType = (blockId: string, type: BlockType) => {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId) return b;
      let namePrefix = 'Bloco';
      if (type === 'biset') namePrefix = 'Bi-set';
      else if (type === 'superset') namePrefix = 'Super-série';
      else if (type === 'triset') namePrefix = 'Tri-set';
      else if (type === 'drop') namePrefix = 'Drop-set';
      else if (type === 'restpause') namePrefix = 'Rest-Pause';
      else if (type === 'circuit') namePrefix = 'Circuito';

      return {
        ...b,
        type,
        name: `${namePrefix} - ${b.exercises[0]?.exercise.name || 'Personalizado'}`
      };
    }));
  };

  // Open exercise picker
  const openExercisePicker = (blockId: string) => {
    setActiveBlockId(blockId);
    setIsAddingExercise(true);
  };

  // Select exercise from modal
  const handleSelectExercise = (exercise: Exercise) => {
    if (!activeBlockId) return;

    setBlocks(blocks.map(b => {
      if (b.id !== activeBlockId) return b;

      const newExerciseItem: ExerciseItem = {
        id: `ei-${Date.now()}`,
        exercise,
        sets: [
          { id: `s-${Date.now()}-1`, setNumber: 1, weight: 10, reps: '10', technique: 'none', rest: 60, rpe: 8 }
        ]
      };

      // update name if first exercise
      const newName = b.exercises.length === 0 
        ? `${b.type === 'straight' ? 'Série Reta' : b.type.toUpperCase()} - ${exercise.name}` 
        : b.name;

      return {
        ...b,
        name: newName,
        exercises: [...b.exercises, newExerciseItem]
      };
    }));

    setIsAddingExercise(false);
    setActiveBlockId(null);
  };

  // Create custom exercise inside picker
  const handleCreateCustomExercise = () => {
    if (!newExerciseName.trim()) return;
    const newEx: Exercise = {
      id: `ex-custom-${Date.now()}`,
      name: newExerciseName,
      category: newExerciseCategory,
      equipment: newExerciseEquipment,
      isCustom: true
    };
    setAvailableExercises([newEx, ...availableExercises]);
    setNewExerciseName('');
    setIsCreatingCustomExercise(false);
    handleSelectExercise(newEx);
  };

  // Delete exercise from block
  const handleDeleteExercise = (blockId: string, exerciseItemId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        exercises: b.exercises.filter(ei => ei.id !== exerciseItemId)
      };
    }));
  };

  // Add series (set) to exercise item
  const handleAddSet = (blockId: string, exerciseItemId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        exercises: b.exercises.map(ei => {
          if (ei.id !== exerciseItemId) return ei;
          const lastSet = ei.sets[ei.sets.length - 1];
          const newSet: SetItem = {
            id: `s-${Date.now()}-${ei.sets.length + 1}`,
            setNumber: ei.sets.length + 1,
            weight: lastSet ? lastSet.weight : 10,
            reps: lastSet ? lastSet.reps : '10',
            technique: lastSet ? lastSet.technique : 'none',
            rest: lastSet ? lastSet.rest : 60,
            rpe: lastSet ? lastSet.rpe : 8
          };
          return {
            ...ei,
            sets: [...ei.sets, newSet]
          };
        })
      };
    }));
  };

  // Update set details
  const handleUpdateSet = (blockId: string, exerciseItemId: string, setId: string, updates: Partial<SetItem>) => {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        exercises: b.exercises.map(ei => {
          if (ei.id !== exerciseItemId) return ei;
          return {
            ...ei,
            sets: ei.sets.map(s => {
              if (s.id !== setId) return s;
              return { ...s, ...updates };
            })
          };
        })
      };
    }));
  };

  // Delete set from exercise item
  const handleDeleteSet = (blockId: string, exerciseItemId: string, setId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        exercises: b.exercises.map(ei => {
          if (ei.id !== exerciseItemId) return ei;
          if (ei.sets.length <= 1) return ei; // keep at least 1 set
          const filtered = ei.sets.filter(s => s.id !== setId);
          // renumber sets
          const renumbered = filtered.map((s, index) => ({
            ...s,
            setNumber: index + 1
          }));
          return {
            ...ei,
            sets: renumbered
          };
        })
      };
    }));
  };

  // Filter exercises
  const filteredExercises = availableExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = selectedMuscle === 'Todos' || ex.category === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  return (
    <div id="block-editor" className="min-h-screen bg-bg-dark pb-24 text-text-primary w-full max-w-5xl mx-auto relative">
      {/* Header Bar */}
      <div className="sticky top-0 bg-bg-dark/90 backdrop-blur-md border-b border-surf-2 px-4 sm:px-6 py-4 flex items-center justify-between z-30">
        <button id="editor-back-btn" onClick={onCancel} className="p-2 hover:bg-surf-1 rounded-xl transition-all">
          <ArrowLeft className="w-5 h-5 text-text-secondary hover:text-text-primary" />
        </button>
        <span className="font-sora font-semibold text-sm sm:text-base tracking-tight text-text-primary">
          {workoutToEdit ? 'Editar Treino' : 'Montador de Blocos (Prescrição)'}
        </span>
        <button 
          id="editor-save-btn" 
          onClick={handleSaveWorkout}
          className="bg-lime-electric hover:bg-lime-electric/90 text-bg-dark font-extrabold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(196,248,42,0.2)] active:scale-95"
        >
          <Save className="w-4 h-4 stroke-[2.5]" />
          Salvar
        </button>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Workout Info Section */}
        <div className="bg-surf-1 border border-surf-2 rounded-2xl p-4 space-y-4 shadow-sm">
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-1">
              Nome do Treino / Rotina
            </label>
            <input
              id="editor-workout-name-input"
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Treino A, B, C..."
              className="w-full bg-surf-2 border border-transparent focus:border-lime-electric/30 focus:bg-surf-2/50 outline-none px-3 py-2 rounded-xl font-sora font-bold text-base text-text-primary transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-1">
              Foco / Orientação (Opcional)
            </label>
            <textarea
              id="editor-workout-desc-input"
              value={workoutDesc}
              onChange={(e) => setWorkoutDesc(e.target.value)}
              placeholder="Ex: Foco em hipertrofia de peito com ênfase na porção clavicular."
              rows={2}
              className="w-full bg-surf-2 border border-transparent focus:border-lime-electric/30 focus:bg-surf-2/50 outline-none px-3 py-2 rounded-xl text-xs text-text-secondary transition-all resize-none"
            />
          </div>
        </div>

        {/* Legend / Info about Primitive variables */}
        <div className="bg-surf-1/50 border border-surf-2/60 rounded-xl p-3 flex gap-2 text-[11px] text-text-secondary leading-relaxed">
          <Info className="w-4.5 h-4.5 text-lime-electric shrink-0 mt-0.5" />
          <div>
            <span className="text-text-primary font-bold">Guia de Blocos:</span> Crie super-séries ou bi-sets agrupando 2+ exercícios. Configure cargas, técnicas (Drop/Rest-pause) e <span className="text-amber-400 font-bold">Descanso Progressivo</span> por série individualmente.
          </div>
        </div>

        {/* BLOCKS CONTAINER */}
        <div className="space-y-6" id="blocks-container">
          {blocks.map((block, bIndex) => {
            const hasMultipleExercises = block.exercises.length >= 2;

            return (
              <div 
                key={block.id} 
                id={`block-card-${block.id}`}
                className="bg-surf-1 border border-surf-2 rounded-2xl p-4 space-y-4 relative overflow-hidden transition-all duration-300"
              >
                {/* Visual top border indicator for block type categories */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  block.type === 'straight' ? 'bg-teal-data' : 
                  block.type === 'biset' ? 'bg-violet-500' :
                  block.type === 'superset' ? 'bg-sky-400' :
                  block.type === 'triset' ? 'bg-amber-500' :
                  block.type === 'drop' ? 'bg-rose-400' : 'bg-lime-electric'
                }`} />

                {/* Block Title and Header Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-2">
                    <input
                      type="text"
                      value={block.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBlocks(blocks.map(b => b.id === block.id ? { ...b, name: val } : b));
                      }}
                      className="bg-transparent border-b border-transparent hover:border-text-muted focus:border-lime-electric outline-none font-sora font-semibold text-sm text-text-primary py-0.5 px-1 w-full transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDuplicateBlock(block)}
                      className="p-1.5 hover:bg-surf-2 text-text-secondary hover:text-text-primary rounded-lg transition-all"
                      title="Duplicar bloco"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-1.5 hover:bg-red-500/10 text-text-secondary hover:text-red-400 rounded-lg transition-all"
                      title="Deletar bloco"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Block Type selector tabs (Visual primitives) */}
                <div className="grid grid-cols-4 gap-1 bg-surf-2 p-1 rounded-xl">
                  {(['straight', 'biset', 'superset', 'triset'] as BlockType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleSetBlockType(block.id, t)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold font-sora uppercase tracking-wider transition-all ${
                        block.type === t
                          ? 'bg-surf-1 text-lime-electric border border-surf-2'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {t === 'straight' ? 'Série Reta' : t === 'biset' ? 'Bi-set' : t === 'superset' ? 'Super-S.' : 'Tri-set'}
                    </button>
                  ))}
                </div>

                {/* Exercises list in this block */}
                <div className="space-y-4 relative">
                  {block.exercises.length === 0 ? (
                    <div className="border border-dashed border-surf-2 rounded-xl py-6 px-4 text-center text-xs text-text-muted">
                      <Dumbbell className="w-6 h-6 mx-auto text-text-muted opacity-40 mb-2" />
                      Nenhum exercício neste bloco ainda.
                    </div>
                  ) : (
                    <div className="relative pl-4 space-y-6">
                      {/* Visual grouping connector (Bracket) for blocks with 2+ exercises */}
                      {hasMultipleExercises && (
                        <div 
                          className="absolute left-0 top-1 bottom-1 border-l-2 pointer-events-none"
                          style={{ borderColor: block.type === 'biset' || block.type === 'straight' ? '#2DD4BF' : '#A855F7' }}
                        >
                          <div className="absolute -left-[2px] top-0 bottom-0 flex flex-col justify-between py-1">
                            <div className="w-2 h-[2px]" style={{ backgroundColor: block.type === 'biset' || block.type === 'straight' ? '#2DD4BF' : '#A855F7' }}></div>
                            <div className="w-2 h-[2px]" style={{ backgroundColor: block.type === 'biset' || block.type === 'straight' ? '#2DD4BF' : '#A855F7' }}></div>
                          </div>
                          <span 
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold tracking-widest uppercase px-1 py-0.5 rounded whitespace-nowrap"
                            style={{ 
                              color: block.type === 'biset' || block.type === 'straight' ? '#2DD4BF' : '#A855F7',
                              backgroundColor: block.type === 'biset' || block.type === 'straight' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(168, 85, 247, 0.1)'
                            }}
                          >
                            {block.type === 'biset' ? 'Bi-set' : block.type === 'straight' ? 'Reta' : block.type.toUpperCase()}
                          </span>
                        </div>
                      )}

                      {block.exercises.map((exItem, exIndex) => (
                        <div key={exItem.id} className="space-y-3 relative">
                          {/* Exercise Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-lime-electric" />
                              <div>
                                <h4 className="font-sora font-semibold text-xs text-text-primary leading-tight">
                                  {exItem.exercise.name}
                                </h4>
                                <p className="text-[10px] text-text-secondary">
                                  {exItem.exercise.category} • {exItem.exercise.equipment}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteExercise(block.id, exItem.id)}
                              className="text-text-muted hover:text-red-400 p-1 rounded transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Sets Header Column indicators */}
                          <div className="grid grid-cols-12 gap-1 px-1 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                            <span className="col-span-1 text-center">S</span>
                            <span className="col-span-3">Carga (kg)</span>
                            <span className="col-span-3">Reps / Alvo</span>
                            <span className="col-span-3">Descanso (s)</span>
                            <span className="col-span-2 text-right">Ação</span>
                          </div>

                          {/* Sets list */}
                          <div className="space-y-1.5">
                            {exItem.sets.map((set, setIndex) => (
                              <div key={set.id} className="grid grid-cols-12 gap-1 items-center bg-surf-2/60 hover:bg-surf-2 p-1.5 rounded-xl transition-all border border-transparent hover:border-surf-2">
                                {/* Set Number */}
                                <span className="col-span-1 text-center text-[10px] font-bold font-mono text-lime-electric">
                                  {set.setNumber}
                                </span>

                                {/* Prescribed Weight */}
                                <div className="col-span-3 flex items-center bg-surf-1 border border-surf-2/80 rounded-lg px-1">
                                  <input
                                    type="number"
                                    value={set.weight}
                                    onChange={(e) => handleUpdateSet(block.id, exItem.id, set.id, { weight: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-transparent outline-none text-xs text-center font-semibold font-mono py-1 px-0.5 text-text-primary"
                                  />
                                </div>

                                {/* Prescribed Reps (could be string like 8-12) */}
                                <div className="col-span-3 flex items-center bg-surf-1 border border-surf-2/80 rounded-lg px-1">
                                  <input
                                    type="text"
                                    value={set.reps}
                                    onChange={(e) => handleUpdateSet(block.id, exItem.id, set.id, { reps: e.target.value })}
                                    className="w-full bg-transparent outline-none text-xs text-center font-semibold font-mono py-1 px-0.5 text-text-primary"
                                  />
                                </div>

                                {/* Progressive Rest Time per set (diferencial) */}
                                <div className="col-span-3 flex items-center bg-surf-1 border border-surf-2/80 rounded-lg px-1">
                                  <input
                                    type="number"
                                    value={set.rest}
                                    onChange={(e) => handleUpdateSet(block.id, exItem.id, set.id, { rest: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-transparent outline-none text-xs text-center font-semibold font-mono py-1 px-0.5 text-amber-400"
                                  />
                                </div>

                                {/* Action button (technique triggers or delete set) */}
                                <div className="col-span-2 flex justify-end gap-1">
                                  {/* Toggle Technique badge dropdown/popup */}
                                  <select
                                    value={set.technique}
                                    onChange={(e) => handleUpdateSet(block.id, exItem.id, set.id, { technique: e.target.value as any })}
                                    className="bg-surf-1 border border-surf-2/80 text-[9px] font-bold rounded p-0.5 outline-none text-text-secondary focus:text-lime-electric max-w-[45px]"
                                    title="Técnica avançada"
                                  >
                                    <option value="none">Std</option>
                                    <option value="drop">Drop</option>
                                    <option value="rest-pause">R-P</option>
                                    <option value="myo-reps">Myo</option>
                                    <option value="cluster">Clus</option>
                                    <option value="isometry">Isom</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSet(block.id, exItem.id, set.id)}
                                    className="text-text-muted hover:text-red-400 p-0.5 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Mini visual pill indicating technique overlay if active */}
                                {set.technique !== 'none' && (
                                  <div className="col-span-12 flex justify-start pl-1 pt-0.5">
                                    <span className="text-[7px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full">
                                       técnica: {set.technique}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Add set button */}
                          <div className="flex justify-between items-center pt-1">
                            <button
                              type="button"
                              onClick={() => handleAddSet(block.id, exItem.id)}
                              className="text-[10px] text-lime-electric hover:text-white font-bold flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar Série
                            </button>

                            {/* Info on progressive rest indicators */}
                            <span className="text-[8px] text-text-muted">
                              Descanso progressivo configurado em <span className="text-amber-400 font-mono">laranja</span>.
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Block Notes & Exercise Adder trigger */}
                <div className="space-y-2.5 pt-2 border-t border-surf-2/60">
                  <input
                    type="text"
                    placeholder="Instruções adicionais (ex: falhar na última série, cadência 3-1-2-0)"
                    value={block.notes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBlocks(blocks.map(b => b.id === block.id ? { ...b, notes: val } : b));
                    }}
                    className="w-full bg-surf-2/40 border border-transparent hover:border-surf-2 focus:border-lime-electric/30 outline-none px-3 py-1.5 rounded-lg text-[10px] text-text-secondary transition-all"
                  />

                  <button
                    type="button"
                    onClick={() => openExercisePicker(block.id)}
                    className="w-full bg-surf-2 hover:bg-surf-2/80 text-text-primary hover:text-lime-electric border border-surf-2 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Exercício
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Block Creators */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <button
            type="button"
            onClick={() => handleAddBlock('straight')}
            className="bg-surf-1 hover:bg-surf-2 text-text-primary hover:text-lime-electric border border-surf-2 py-4 px-3 rounded-2xl text-xs font-bold font-sora flex flex-col items-center justify-center gap-2 transition-all group"
          >
            <Plus className="w-5 h-5 text-lime-electric group-hover:scale-110 transition-all" />
            + Série Reta
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('biset')}
            className="bg-surf-1 hover:bg-surf-2 text-text-primary hover:text-lime-electric border border-surf-2 py-4 px-3 rounded-2xl text-xs font-bold font-sora flex flex-col items-center justify-center gap-2 transition-all group"
          >
            <Layers className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-all" />
            + Super-Série / Bi-set
          </button>
        </div>
      </div>

      {/* EXERCISE SELECTION MODAL */}
      {isAddingExercise && (
        <div className="fixed inset-0 bg-bg-dark/90 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-surf-1 border-t sm:border border-surf-2 rounded-t-3xl sm:rounded-3xl w-full max-w-xl h-[90vh] sm:h-[80vh] flex flex-col relative overflow-hidden shadow-2xl">
            
            {/* Handle/Indicator */}
            <div className="w-12 h-1.5 bg-surf-2 rounded-full mx-auto mt-3 mb-1" />

            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-surf-2 flex justify-between items-center">
              <div>
                <h3 className="font-sora font-bold text-base">Selecionar Exercício</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">Escolha um exercício padrão ou crie um seu.</p>
              </div>
              <button 
                onClick={() => {
                  setIsAddingExercise(false);
                  setIsCreatingCustomExercise(false);
                }} 
                className="text-xs font-bold text-text-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>

            {/* Modal Search and Filters */}
            {!isCreatingCustomExercise && (
              <div className="p-4 space-y-3 shrink-0">
                <div className="flex bg-surf-2 rounded-xl px-3 py-2.5 items-center gap-2 border border-transparent focus-within:border-lime-electric/30">
                  <Search className="w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Pesquisar exercício..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-xs w-full text-text-primary placeholder:text-text-muted"
                  />
                </div>

                {/* Muscle Quick Filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {muscleGroups.map(muscle => (
                    <button
                      key={muscle}
                      onClick={() => setSelectedMuscle(muscle)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                        selectedMuscle === muscle
                          ? 'bg-lime-electric text-bg-dark'
                          : 'bg-surf-2 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {muscle}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-4 pb-12">
              {isCreatingCustomExercise ? (
                /* Custom Exercise Form */
                <div className="space-y-4 py-3">
                  <h4 className="font-sora font-semibold text-sm text-lime-electric flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Novo Exercício Customizado
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                        Nome do Exercício
                      </label>
                      <input
                        type="text"
                        placeholder="ex: Crucifixo Reto com Halteres Invertido"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        className="w-full bg-surf-2 border border-surf-2 focus:border-lime-electric outline-none px-3 py-2.5 rounded-xl text-xs text-text-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                          Grupo Muscular
                        </label>
                        <select
                          value={newExerciseCategory}
                          onChange={(e) => setNewExerciseCategory(e.target.value)}
                          className="w-full bg-surf-2 border border-surf-2 focus:border-lime-electric outline-none px-3 py-2.5 rounded-xl text-xs text-text-primary"
                        >
                          {muscleGroups.filter(g => g !== 'Todos').map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                          Equipamento
                        </label>
                        <select
                          value={newExerciseEquipment}
                          onChange={(e) => setNewExerciseEquipment(e.target.value)}
                          className="w-full bg-surf-2 border border-surf-2 focus:border-lime-electric outline-none px-3 py-2.5 rounded-xl text-xs text-text-primary"
                        >
                          <option value="Halteres">Halteres</option>
                          <option value="Barra">Barra</option>
                          <option value="Polia">Polia</option>
                          <option value="Máquina">Máquina</option>
                          <option value="Peso Corporal">Peso Corporal</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomExercise(false)}
                      className="flex-1 bg-surf-2 hover:bg-surf-2/80 text-text-primary border border-surf-2 font-bold py-3 rounded-xl text-xs transition-all"
                    >
                      Voltar à Lista
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCustomExercise}
                      disabled={!newExerciseName.trim()}
                      className="flex-1 bg-lime-electric hover:bg-lime-electric/90 text-bg-dark font-extrabold py-3 rounded-xl text-xs transition-all disabled:opacity-50"
                    >
                      Adicionar Exercício
                    </button>
                  </div>
                </div>
              ) : (
                /* Exercises List */
                <div className="space-y-1 py-2">
                  {/* Create Custom CTA */}
                  <button
                    onClick={() => setIsCreatingCustomExercise(true)}
                    className="w-full bg-surf-2/50 hover:bg-surf-2 border border-dashed border-surf-2/80 hover:border-lime-electric/30 text-lime-electric text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all mb-3"
                  >
                    <Sparkles className="w-4 h-4" /> Criar Exercício Customizado
                  </button>

                  {filteredExercises.length === 0 ? (
                    <div className="text-center py-8 text-xs text-text-muted">
                      Nenhum exercício encontrado para "{searchQuery}".
                    </div>
                  ) : (
                    filteredExercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => handleSelectExercise(ex)}
                        className="w-full text-left bg-surf-2/30 hover:bg-surf-2 p-3 rounded-xl flex items-center justify-between transition-all border border-transparent hover:border-surf-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-surf-1 border border-surf-2 rounded-lg p-2">
                            <Dumbbell className="w-4 h-4 text-lime-electric" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-text-primary leading-tight">{ex.name}</span>
                            <span className="text-[10px] text-text-secondary mt-0.5 block">{ex.category} • {ex.equipment}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
