import React, { useState } from 'react';
import { User, ShieldCheck, Check, Send, AlertTriangle, RefreshCw, Sparkles, UserCheck } from 'lucide-react';

import { supabase } from '../services/supabaseClient';
import { User as UserType } from '../types';

interface InvitationVincularProps {
  currentUser: UserType;
  onLinkTrainer: (trainerCode: string) => void;
}

import { useOutletContext } from 'react-router-dom';

export default function InvitationVincular() {
  const { currentUser, onLinkTrainer } = useOutletContext<any>();
  const [trainerCodeInput, setTrainerCodeInput] = useState('');
  const [status, setStatus] = useState<'unlinked' | 'pending' | 'linked'>('unlinked');
  const [trainerName, setTrainerName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    let isMounted = true;
    async function checkLink() {
      setIsLoading(true);
      try {
        const { data: link, error } = await supabase
          .from('personal_aluno')
          .select(`
            status,
            profiles!personal_aluno_personal_id_fkey(full_name)
          `)
          .eq('aluno_id', currentUser.id)
          .maybeSingle();

        if (link && !error) {
          const perfis = link.profiles as unknown as { full_name: string } | { full_name: string }[];
          const profile = Array.isArray(perfis) ? perfis[0] : perfis;
          if (isMounted) {
            setStatus('linked');
            setTrainerName((profile as any)?.full_name || 'Prof. Desconhecido');
          }
        }
      } catch (err) {
        console.error('Error checking active link:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    
    checkLink();
    
    return () => { isMounted = false; };
  }, [currentUser.id]);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = trainerCodeInput.trim().toLowerCase();
    if (!code) return;

    setIsLoading(true);
    setFeedback('');

    try {
      const upperCode = code.toUpperCase();
      // 1. Check invite token validity
      const { data: invites, error: inviteErr } = await supabase
        .from('trainer_invites')
        .select(`
          id,
          trainer_id,
          student_email,
          status,
          expires_at,
          profiles!trainer_invites_trainer_id_fkey(full_name)
        `)
        .eq('token', upperCode)
        .limit(1);

      if (inviteErr) throw inviteErr;
      if (!invites || invites.length === 0) {
        throw new Error('Convite invÃ¡lido ou nÃ£o encontrado.');
      }

      const invite = invites[0];

      if (invite.status !== 'pending') {
        throw new Error(`Este convite jÃ¡ foi utilizado ou estÃ¡ ${invite.status}.`);
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('Este convite expirou. Solicite um novo ao seu professor.');
      }

      if (invite.student_email && invite.student_email !== currentUser.email) {
        throw new Error('Este convite foi gerado para outro endereÃ§o de e-mail.');
      }

      // 2. Link in personal_aluno table
      const { error: linkErr } = await supabase
        .from('personal_aluno')
        .upsert({
          personal_id: invite.trainer_id,
          aluno_id: currentUser.id,
          status: 'active'
        }, { onConflict: 'personal_id, aluno_id' }); 
        
      if (linkErr) throw linkErr;

      // 3. Mark invite as accepted
      await supabase
        .from('trainer_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      const trainerName = Array.isArray(invite.profiles) ? invite.profiles[0]?.full_name : (invite.profiles as any)?.full_name;

      setStatus('linked');
      setTrainerName(trainerName || 'Prof. Desconhecido');
      onLinkTrainer(upperCode);
      setFeedback(`VÃ­nculo realizado com sucesso! VocÃª agora Ã© aluno do professor ${trainerName || 'Desconhecido'}.`);
      setTrainerCodeInput('');

    } catch (err: any) {
      setFeedback(err.message || 'Ocorreu um erro ao vincular.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (confirm('Tem certeza que deseja encerrar o vÃ­nculo com o personal? VocÃª manterÃ¡ 100% de seu histÃ³rico de treinos e cargas, mas o personal nÃ£o poderÃ¡ mais visualizar seu progresso.')) {
      try {
        await supabase
          .from('personal_aluno')
          .delete()
          .eq('aluno_id', currentUser.id);

        setStatus('unlinked');
        setTrainerName('');
        setFeedback('VÃ­nculo encerrado de forma segura. Seus treinos e histÃ³ricos continuam salvos na sua conta.');
      } catch (e) {
        setFeedback('Erro ao tentar desvincular.');
      }
    }
  };

  return (
    <div id="vincular-view" className="space-y-6 pb-24 px-4 sm:px-6 md:px-8 pt-6 w-full max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-lime-electric block">CONEXÃƒO SEGURA</span>
        <h1 className="font-sora font-extrabold text-lg sm:text-2xl text-text-primary">VÃ­nculo por Convite</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Status */}
        <div className="space-y-6">
          {/* Dynamic Status Banner */}
          {status === 'linked' ? (
            <div className="bg-success/10 border border-success/30 p-5 rounded-2xl space-y-4 relative overflow-hidden shadow-sm">
              <div className="flex gap-3 items-start">
                <div className="p-2.5 bg-success/20 rounded-xl shrink-0">
                  <UserCheck className="w-6 h-6 text-success animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sora font-bold text-sm text-text-primary">VÃ­nculo Ativo</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    Conectado com <span className="text-text-primary font-bold">{trainerName}</span>. Seus treinos e sessÃµes estÃ£o sincronizados.
                  </p>
                </div>
              </div>

              <div className="pt-3 flex justify-between items-center text-xs border-t border-success/20">
                <span className="text-text-secondary">VÃ­nculo estabelecido</span>
                <button
                  onClick={handleUnlink}
                  className="text-red-400 font-bold hover:underline"
                >
                  Encerrar VÃ­nculo
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surf-1 border border-surf-2 p-5 rounded-2xl flex gap-3.5 items-start shadow-sm">
              <div className="p-2.5 bg-surf-2 rounded-xl text-text-muted shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-sora font-bold text-sm text-text-secondary">Nenhum Personal Vinculado</h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  VocÃª estÃ¡ treinando por conta prÃ³pria. Pode prescrever seus prÃ³prios treinos ou aceitar o convite do seu Personal Trainer ao lado.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Link Form & Policy Info */}
        <div className="space-y-6">
          {/* Link form */}
          {status === 'unlinked' && (
            <form onSubmit={handleLinkSubmit} className="bg-surf-1 border border-surf-2 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="font-sora font-bold text-xs sm:text-sm text-text-primary uppercase tracking-wider">Vincular Token do Personal</h3>
              
              <p className="text-xs text-text-secondary leading-relaxed">
                Se seu personal enviou um token de acesso (ex: <code className="bg-surf-2 px-1 rounded text-lime-electric font-mono tracking-widest">K9F2MX</code>), insira abaixo para realizar a conexÃ£o.
              </p>

              <div className="space-y-1.5">
                <input
                  type="text"
                  required
                  placeholder="ex: K9F2MX"
                  value={trainerCodeInput}
                  onChange={(e) => setTrainerCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-surf-2 border border-surf-2 focus:border-lime-electric outline-none px-4 py-3 rounded-xl text-sm sm:text-base font-mono font-bold tracking-widest text-text-primary text-center"
                />
              </div>

                <button
                type="submit"
                disabled={status === 'linked' || !trainerCodeInput.trim() || isLoading}
                className="w-full bg-lime-electric hover:bg-lime-electric/90 disabled:opacity-50 text-bg-dark font-extrabold font-sora py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isLoading ? 'Validando...' : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Aceitar Convite
                  </>
                )}
              </button>
            </form>
          )}

          {/* Feedback Messages */}
          {feedback && (
            <div className="p-4 bg-surf-1 border border-surf-2 rounded-xl text-xs sm:text-sm text-text-primary flex gap-2.5 items-start shadow-sm">
              <Sparkles className="w-5 h-5 text-lime-electric shrink-0 mt-0.5" />
              <span className="leading-relaxed">{feedback}</span>
            </div>
          )}

          {/* Ownership & LGPD Policy Information (Crucial Concept) */}
          <div className="bg-surf-1/40 border border-surf-2/60 p-5 rounded-2xl space-y-2.5 text-xs sm:text-sm text-text-secondary leading-relaxed shadow-sm">
            <div className="flex items-center gap-2 text-text-primary font-bold">
              <ShieldCheck className="w-5 h-5 text-lime-electric shrink-0" />
              <span>Sua Conta, Seus Dados</span>
            </div>
            <p>
              No <span className="text-text-primary font-semibold">TreinoBase</span>, o aluno Ã© dono permanente do seu prÃ³prio histÃ³rico. Ao encerrar um vÃ­nculo com qualquer personal trainer, <strong className="text-text-primary font-semibold">seus histÃ³ricos de 1RM, cargas, sessÃµes e anotaÃ§Ãµes permanecem integralmente salvos com vocÃª</strong>. O treinador perde apenas o acesso de visualizaÃ§Ã£o dali por diante.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

