import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, CheckCircle2, ChevronRight, Copy, Check,
  Activity, ArrowLeft, RefreshCw, Send, Plus, Sparkles, ExternalLink, Dumbbell, Link, Clock, X, Trash2
} from 'lucide-react';
import { Student, User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';

interface PersonalDashboardProps {
  currentUser: UserType;
  onPrescribeWorkoutToStudent: (student: Student) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function PersonalDashboard({ 
  currentUser,
  onPrescribeWorkoutToStudent,
  onNavigateToTab
}: PersonalDashboardProps) {
  
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Drawer States
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);
  const [drawerWorkouts, setDrawerWorkouts] = useState<any[]>([]);
  const [isLoadingDrawer, setIsLoadingDrawer] = useState(false);
  
  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // ETAPA 1: Buscar os IDs dos vínculos onde o personal logado é o responsável
      const { data: vinculos, error: errVinculos } = await supabase
        .from('personal_aluno')
        .select('*')
        .eq('personal_id', currentUser.id);

      if (errVinculos) throw errVinculos;

      let activeVinculos = vinculos || [];

      // ETAPA 2: FALLBACK (AUTO-HEALING)
      // Se não encontrou vínculos, vamos procurar na tabela de treinos para ver se o personal tem alunos lá
      if (activeVinculos.length === 0) {
        
        // Busca treinos criados por este personal que tenham um aluno_id vinculado
        const { data: treinos, error: errTreinos } = await supabase
          .from('treinos')
          .select('aluno_id')
          .eq('personal_id', currentUser.id)
          .not('aluno_id', 'is', null);
          
        if (!errTreinos && treinos && treinos.length > 0) {
          // Extrai IDs únicos de alunos
          const uniqueAlunoIds = Array.from(new Set(treinos.map(t => t.aluno_id).filter(Boolean)));
          
          if (uniqueAlunoIds.length > 0) {
            
            // Prepara os novos registros
            const novosVinculos = uniqueAlunoIds.map(id => ({
              personal_id: currentUser.id,
              aluno_id: id,
              status: 'ativo'
            }));
            
            // Insere no banco
            await supabase.from('personal_aluno').insert(novosVinculos);
            
            // Busca os vínculos novamente
            const { data: vinculosAtualizados } = await supabase
              .from('personal_aluno')
              .select('*')
              .eq('personal_id', currentUser.id);
              
            if (vinculosAtualizados) {
              activeVinculos = vinculosAtualizados;
            }
          }
        }
      }

      // Se após o auto-healing ainda estiver vazio, encerramos
      if (activeVinculos.length === 0) {
        setStudents([]);
        return;
      }

      // ETAPA 3: Buscar Perfis
      const alunoIds = activeVinculos.map(v => v.aluno_id);
      
      // Consultamos id, name e avatar_url (ignoramos email/role para evitar bloqueios de RLS)
      const { data: perfis, error: errPerfis } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', alunoIds) as { data: any[], error: any };

      if (errPerfis) {
        console.error('Erro ao buscar perfis (RLS ou falha):', errPerfis);
        // Mesmo falhando o perfil, podemos mostrar os alunos de forma anônima
      }

      const perfisData = perfis || [];

      // Mesclar dados
      const alunosCompletos = activeVinculos.map(vinculo => {
        const perfil = perfisData.find(p => p.id === vinculo.aluno_id);
        return {
          ...vinculo,
          profile: perfil ? {
            id: perfil.id,
            name: perfil.name || 'Aluno',
            avatar_url: perfil.avatar_url
          } : {
            id: vinculo.aluno_id,
            name: 'Aluno (Perfil Restrito)',
            avatar_url: null
          }
        };
      });

      // ETAPA 4: Fetch sessoes for adherence (Últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let logs: any[] = [];
      if (alunoIds.length > 0) {
        const { data, error: logsErr } = await supabase
          .from('sessoes')
          .select('id, aluno_id, data_execucao')
          .in('aluno_id', alunoIds)
          .gte('data_execucao', thirtyDaysAgo.toISOString());
          
        if (!logsErr && data) {
          logs = data;
        }
      }

      // ETAPA 5: Map final to Student UI object
      const mappedStudents: Student[] = alunosCompletos.map(link => {
        const profile = link.profile;
        if (!profile) return null;

        const studentLogs = logs.filter(log => log.aluno_id === link.aluno_id) || [];
        const executedCount = studentLogs.length;
        const prescribedCount = 12; // Base meta fixa
        const adherence = Math.min(100, Math.round((executedCount / prescribedCount) * 100));

        return {
          id: profile.id,
          name: profile.name,
          email: '',
          avatar: profile.avatar_url || '',
          code: profile.id.slice(0, 8).toUpperCase(),
          prescribedCount,
          executedCount,
          adherence,
          lastWorkoutDate: link.created_at
        } as Student;
      }).filter(Boolean) as Student[];

      setStudents(mappedStudents);

      // ETAPA 6: Pendências de Convites
      const { data: invites, error: invErr } = await supabase
        .from('trainer_invites')
        .select('*')
        .eq('trainer_id', currentUser.id)
        .eq('status', 'pending');
        
      if (!invErr) {
        setPendingInvites(invites || []);
      }

    } catch (e) {
      console.error('Falha geral ao buscar dados do dashboard do personal:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser.id]);

  const openStudentDrawer = async (student: Student) => {
    setDrawerStudent(student);
    setIsLoadingDrawer(true);
    try {
      const { data, error } = await supabase
        .from('treinos' as any)
        .select('*')
        .eq('aluno_id', student.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setDrawerWorkouts(data || []);
    } catch (err) {
      console.error('Erro ao buscar treinos do aluno:', err);
    } finally {
      setIsLoadingDrawer(false);
    }
  };

  const generateInvite = async (type: 'link' | 'email', e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setInviteFeedback('');
    
    // Generate random 6 character token
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const { error } = await supabase
        .from('trainer_invites')
        .insert({
          trainer_id: currentUser.id,
          token,
          student_email: type === 'email' ? inviteEmail.toLowerCase() : null
        });
        
      if (error) throw error;
      
      setInviteToken(token);
      
      if (type === 'link') {
        const msg = `Olá! Acesse o TreinoBase e use o meu token exclusivo para nos vincularmos: ${token}`;
        navigator.clipboard.writeText(msg);
        setInviteFeedback('Token gerado e mensagem copiada para área de transferência!');
      } else {
        setInviteFeedback(`Convite gerado e reservado para ${inviteEmail}!`);
        setInviteEmail('');
      }
      
      // Refresh pending list
      fetchDashboardData();
      
    } catch (err: any) {
      setInviteFeedback('Erro ao gerar convite: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      await supabase
        .from('trainer_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  // Stats calculation
  const activeStudents = students.filter(s => s.adherence > 0).length;
  const averageAdherence = students.length > 0 
    ? Math.round(students.reduce((acc, s) => acc + s.adherence, 0) / students.length)
    : 0;

  return (
    <div id="personal-trainer-view" className="space-y-6 pb-24 px-4 sm:px-6 md:px-8 pt-6 w-full max-w-6xl mx-auto">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-lime-electric block">PAINEL DO PROFESSOR</span>
          <h1 className="font-sora font-extrabold text-lg sm:text-2xl text-text-primary">Gestão de Alunos</h1>
        </div>
        
        <button
          onClick={() => { setShowInviteModal(true); setInviteToken(''); setInviteFeedback(''); }}
          className="bg-lime-electric hover:bg-lime-electric/90 text-bg-dark font-extrabold py-3 px-5 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          Convidar Novo Aluno
        </button>
      </div>

      {/* Trainer Stats Overview */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl">
          <span className="text-[9px] sm:text-xs text-zinc-400 uppercase font-bold tracking-wider block">Alunos Ativos</span>
          <span className="text-xl sm:text-3xl font-mono font-bold text-zinc-100 mt-1 block">{isLoading ? '-' : activeStudents}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl">
          <span className="text-[9px] sm:text-xs text-zinc-400 uppercase font-bold tracking-wider block">Adesão Média</span>
          <span className="text-xl sm:text-3xl font-mono font-bold text-lime-500 mt-1 block">{isLoading ? '-' : `${averageAdherence}%`}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl">
          <span className="text-[9px] sm:text-xs text-zinc-400 uppercase font-bold tracking-wider block">Total Vinculados</span>
          <span className="text-xl sm:text-3xl font-mono font-bold text-zinc-100 mt-1 block">{isLoading ? '-' : students.length}</span>
        </div>
      </div>

      {/* TABS / SECTIONS */}
      <div className="space-y-10">
        
        {/* STUDENT LIST CARDS */}
        <div className="space-y-4">
          <h3 className="font-sora font-bold text-base sm:text-lg text-text-primary">Seus Alunos</h3>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : students.length === 0 ? (
            <EmptyState 
              icon={Users}
              title="Nenhum aluno vinculado"
              description="Clique em 'Convidar Novo Aluno' acima para gerar um token de acesso exclusivo."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="students-list">
              {students.map(student => {
                const isActive = student.adherence > 0;
                
                return (
                  <div 
                    key={student.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all shadow-sm flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {student.avatar ? (
                          <img 
                            src={student.avatar} 
                            alt={student.name} 
                            className="w-10 h-10 rounded-full object-cover border border-zinc-800" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold font-sora">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="font-sora font-bold text-sm text-zinc-100 leading-tight">
                            {student.name}
                          </h4>
                          <span className="text-xs text-zinc-500 font-mono">@{student.code}</span>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-medium">Ativo</span>
                      ) : (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs px-2 py-0.5 rounded-full font-medium">Inativo</span>
                      )}
                    </div>

                    <div className="text-sm text-zinc-400 mt-1 flex flex-col gap-1.5 flex-1 mb-4">
                      {isActive ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Último treino: {student.lastWorkoutDate ? new Date(student.lastWorkoutDate).toLocaleDateString() : 'Desconhecido'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-3.5 h-3.5" />
                            <span>Treino vigente: Treino Atual</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" />
                            <span>Aderência (30d): {student.adherence}%</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-zinc-500 italic mt-2">
                          <span>Sem registros recentes</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-zinc-800/50">
                      <button
                        onClick={() => onPrescribeWorkoutToStudent(student)}
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Prescrever Treino
                      </button>
                      <button
                        onClick={() => {
                          localStorage.setItem('tb_selected_b2b_student', student.id);
                          if (onNavigateToTab) onNavigateToTab('progress');
                        }}
                        className="bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                      >
                         Ver Evolução
                      </button>
                      <button className="bg-zinc-800/30 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 text-xs p-2 rounded-lg transition-all" title="Editar Perfil">
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PENDING INVITES */}
        {pendingInvites.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-surf-2">
            <h3 className="font-sora font-bold text-base sm:text-lg text-text-primary flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Convites Pendentes
            </h3>
            
            <div className="bg-surf-1 border border-surf-2 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-surf-2 text-text-secondary text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4 font-bold">Token</th>
                    <th className="px-5 py-4 font-bold hidden sm:table-cell">E-mail Restrito</th>
                    <th className="px-5 py-4 font-bold hidden md:table-cell">Criado em</th>
                    <th className="px-5 py-4 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surf-2">
                  {pendingInvites.map(inv => (
                    <tr key={inv.id} className="hover:bg-surf-2/30 transition-colors">
                      <td className="px-5 py-4 font-mono font-extrabold text-lime-electric">{inv.token}</td>
                      <td className="px-5 py-4 text-text-muted hidden sm:table-cell">{inv.student_email || <span className="italic opacity-50">Qualquer e-mail</span>}</td>
                      <td className="px-5 py-4 text-text-muted hidden md:table-cell">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-right">
                        <button 
                          onClick={() => revokeInvite(inv.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center justify-end gap-1 w-full"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-bg-dark/95 backdrop-blur-md flex items-center justify-center z-50 px-4">
          <div className="bg-surf-1 border border-surf-2 p-6 rounded-3xl w-full max-w-md space-y-6 relative shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-sora font-extrabold text-lg text-text-primary">Convidar Aluno</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-text-secondary hover:text-text-primary p-2 bg-surf-2 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Gere um token único (Single-Use) para conectar a conta do seu aluno à sua carteira de clientes.
            </p>

            <div className="space-y-5">
              {/* Opção 1: Link Direto */}
              <div className="bg-bg-dark border border-surf-2 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Link className="w-4 h-4 text-lime-electric" />
                  Opção 1: Geração Rápida (WhatsApp)
                </div>
                <p className="text-xs text-text-muted">Cria um token instantâneo para copiar e colar para qualquer aluno.</p>
                <button
                  onClick={() => generateInvite('link')}
                  disabled={isGenerating}
                  className="w-full bg-surf-2 hover:bg-surf-2/80 text-lime-electric font-bold py-2.5 rounded-xl text-xs transition-all border border-surf-2 hover:border-lime-electric/30"
                >
                  Gerar e Copiar Mensagem
                </button>
              </div>

              {/* Opção 2: Por Email */}
              <form onSubmit={(e) => generateInvite('email', e)} className="bg-bg-dark border border-surf-2 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Send className="w-4 h-4 text-teal-data" />
                  Opção 2: Restringir por E-mail
                </div>
                <p className="text-xs text-text-muted">O token só poderá ser usado pelo aluno dono deste e-mail exato.</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="aluno@email.com"
                    className="flex-1 bg-surf-1 border border-surf-2 focus:border-teal-data outline-none px-3 py-2 rounded-xl text-sm text-text-primary"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !inviteEmail}
                    className="bg-teal-data hover:bg-teal-data/90 text-bg-dark font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50"
                  >
                    Gerar
                  </button>
                </div>
              </form>
            </div>

            {inviteFeedback && (
              <div className="text-xs font-bold text-bg-dark bg-lime-electric p-3 rounded-xl text-center">
                {inviteFeedback}
                {inviteToken && <div className="text-lg font-mono tracking-widest mt-1 font-extrabold">{inviteToken}</div>}
              </div>
            )}
          </div>
        </div>
      )}

    {/* PRONTUÁRIO DRAWER */}
    {drawerStudent && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerStudent(null)}></div>
        
        <div className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-sora font-extrabold text-zinc-100 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-lime-500" />
                Treinos Prescritos
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Aluno: <strong className="text-zinc-300">{drawerStudent.name}</strong>
              </p>
            </div>
            <button 
              onClick={() => setDrawerStudent(null)}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoadingDrawer ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : drawerWorkouts.length === 0 ? (
              <EmptyState 
                icon={Dumbbell}
                title="Nenhum treino prescrito"
                description="Este aluno ainda não possui treinos ativos."
              />
            ) : (
              drawerWorkouts.map(workout => (
                <div key={workout.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 relative">
                  <div className="flex justify-between items-start">
                    <h3 className="font-sora font-bold text-zinc-100 text-sm pr-6">
                      {workout.titulo}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {workout.descricao || 'Sem descrição.'}
                  </p>
                  <div className="flex justify-between items-center mt-2 border-t border-zinc-800/50 pt-3">
                    <div className="flex gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <span className="bg-zinc-800 px-2 py-1 rounded">{workout.blocos || 1} Blocos</span>
                      <span className="bg-zinc-800 px-2 py-1 rounded">{workout.exercicios || 1} Exercícios</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(workout.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
            <button
              onClick={() => {
                setDrawerStudent(null);
                onPrescribeWorkoutToStudent(drawerStudent);
              }}
              className="w-full bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold py-3.5 rounded-xl shadow-lg shadow-lime-500/10 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              PRESCREVER NOVO TREINO
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  );
}
