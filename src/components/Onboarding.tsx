import React, { useState } from 'react';
import { Dumbbell, User, Award, ShieldAlert, Sparkles, Loader2, Eye, EyeOff } from 'lucide-react';
import { User as UserType } from '../types';
import { supabase } from '../lib/supabase';

interface OnboardingProps {
  onComplete: (user: UserType) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [role, setRole] = useState<'aluno' | 'personal'>('aluno');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (authMode === 'register' && !name) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      if (authMode === 'login') {
        // LOGIN FLOW
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (authError) throw authError;
        
        // Fetch profile to know role
        if (authData.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();
            
          if (profileError) throw profileError;
          
          let finalProfile = profile;
          if (!finalProfile) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: retryProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();
            
            finalProfile = retryProfile;
          }

          if (!finalProfile) {
            throw new Error('Perfil não encontrado. Tente novamente em instantes.');
          }
          
          const userObj: UserType = {
            id: authData.user.id,
            name: finalProfile.full_name || email,
            role: finalProfile.role as 'personal' | 'aluno',
            baseRole: finalProfile.role as 'personal' | 'aluno',
            email: finalProfile.email,
            avatar: finalProfile.avatar_url || (finalProfile.role === 'personal' 
              ? 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=200' 
              : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'),
            code: finalProfile.role === 'personal' ? 'TB-PROF-99' : 'TB-ALU-42',
          };
          onComplete(userObj);
        }
      } else if (authMode === 'register') {
        // SIGNUP FLOW
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: role
            }
          }
        });
        
        if (authError) throw authError;

        if (authData.user) {
          await supabase.from('profiles').insert({
            id: authData.user.id,
            email: email,
            full_name: name,
            role: role
          });
          
          const userObj: UserType = {
            id: authData.user.id,
            name: name,
            role: role,
            baseRole: role,
            email: email,
            avatar: role === 'personal' 
              ? 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=200' 
              : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
            code: role === 'personal' ? 'TB-PROF-99' : 'TB-ALU-42',
          };
          onComplete(userObj);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Por favor, insira o seu e-mail cadastrado.");
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      
      alert("E-mail de recuperação enviado! Verifique sua caixa de entrada e spam.");
      setAuthMode('login');
    } catch (err: any) {
      console.error("Erro ao solicitar recuperação:", err);
      setErrorMsg(err.message || "Erro ao solicitar recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="onboarding-screen" className="min-h-screen bg-bg-dark flex flex-col justify-between px-6 py-8 text-text-primary max-w-md mx-auto relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-[radial-gradient(circle_at_top,_var(--color-lime-electric)_0%,_transparent_55%)] opacity-10 pointer-events-none" />

      {/* Header */}
      <div className="text-center mt-2 relative z-10">
        <div className="inline-flex items-center justify-center bg-surf-1 border border-surf-2 rounded-2xl p-4 mb-4">
          <Dumbbell className="w-10 h-10 text-lime-electric animate-pulse" />
        </div>
        
        {authMode === 'forgot' ? (
          <>
            <h1 className="text-3xl font-extrabold font-sora tracking-tight mb-2">Recuperar Acesso</h1>
            <p className="text-text-secondary text-sm max-w-xs mx-auto">
              Digite seu e-mail para receber o link de redefinição.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-extrabold font-sora tracking-tight">
              Treino<span className="text-lime-electric">Base</span>
            </h1>
            <p className="text-text-secondary text-sm mt-2 max-w-xs mx-auto">
              Alta performance, métricas exatas e controle absoluto em blocos.
            </p>
          </>
        )}
      </div>
      
      {/* Auth Toggle Tabs */}
      {authMode !== 'forgot' && (
        <div className="flex bg-surf-1 border border-surf-2 p-1 rounded-xl mt-6 relative z-10">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-surf-2 text-text-primary shadow' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'register' ? 'bg-surf-2 text-text-primary shadow' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Criar Conta
          </button>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={authMode === 'forgot' ? handleResetPassword : handleSubmit} className="flex-1 flex flex-col justify-center gap-5 mt-4 relative z-10">
        
        {/* Role Selector (ONLY ON SIGNUP) */}
        {authMode === 'register' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Quem é você na academia?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                id="role-aluno-btn"
                type="button"
                onClick={() => setRole('aluno')}
                className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-300 ${
                  role === 'aluno'
                    ? 'border-lime-electric bg-surf-1/90 shadow-[0_0_15px_rgba(196,248,42,0.15)]'
                    : 'border-surf-2 bg-surf-1/40 hover:border-text-muted text-text-secondary'
                }`}
              >
                <User className={`w-6 h-6 ${role === 'aluno' ? 'text-lime-electric' : 'text-text-muted'}`} />
                <div className="mt-2">
                  <span className={`block font-sora font-semibold text-sm ${role === 'aluno' ? 'text-text-primary' : ''}`}>
                    Aluno
                  </span>
                </div>
              </button>

              <button
                id="role-personal-btn"
                type="button"
                onClick={() => setRole('personal')}
                className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-300 ${
                  role === 'personal'
                    ? 'border-lime-electric bg-surf-1/90 shadow-[0_0_15px_rgba(196,248,42,0.15)]'
                    : 'border-surf-2 bg-surf-1/40 hover:border-text-muted text-text-secondary'
                }`}
              >
                <Award className={`w-6 h-6 ${role === 'personal' ? 'text-lime-electric' : 'text-text-muted'}`} />
                <div className="mt-2">
                  <span className={`block font-sora font-semibold text-sm ${role === 'personal' ? 'text-text-primary' : ''}`}>
                    Personal
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-3">
          {authMode === 'register' && (
            <div>
              <label htmlFor="name-input" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                Nome Completo
              </label>
              <input
                id="name-input"
                type="text"
                required={authMode === 'register'}
                placeholder="ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surf-1 border border-surf-2 focus:border-lime-electric outline-none px-4 py-3 rounded-xl text-text-primary font-medium text-sm transition-all placeholder:text-text-muted"
              />
            </div>
          )}

          <div>
            <label htmlFor="email-input" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
              E-mail
            </label>
            <input
              id="email-input"
              type="email"
              required
              placeholder="ex: joao@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surf-1 border border-surf-2 focus:border-lime-electric outline-none px-4 py-3 rounded-xl text-text-primary font-medium text-sm transition-all placeholder:text-text-muted"
            />
          </div>
          
          {authMode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password-input" className="text-xs font-semibold tracking-wider text-text-secondary uppercase">
                  Senha
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setErrorMsg(''); }}
                    className="text-xs text-text-muted hover:text-lime-electric transition-colors font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  required={authMode !== 'forgot'}
                  placeholder="Sua senha secreta"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surf-1 border border-surf-2 focus:border-lime-electric outline-none px-4 py-3 rounded-xl text-text-primary font-medium text-sm transition-all placeholder:text-text-muted pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="bg-error/10 border border-error/20 text-error text-xs p-3 rounded-lg flex gap-2 items-center">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          id="onboarding-submit-btn"
          type="submit"
          disabled={isLoading || (authMode === 'register' && !name) || !email || (authMode !== 'forgot' && !password)}
          className="w-full bg-lime-electric hover:bg-lime-electric/90 disabled:opacity-50 text-bg-dark font-extrabold font-sora py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 mt-2 hover:translate-y-[-2px] active:translate-y-0"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : authMode === 'login' ? (
            'Entrar no TreinoBase'
          ) : authMode === 'register' ? (
            'Criar Conta'
          ) : (
            'Enviar Link de Recuperação'
          )}
        </button>

        {authMode === 'forgot' && (
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
            className="w-full text-center text-xs font-semibold text-text-muted hover:text-text-primary transition-colors mt-2"
          >
            Voltar para o Login
          </button>
        )}
      </form>

      {/* Footer info (LGPD/Account architecture concept) */}
      <div className="text-center text-[10px] text-text-muted mt-6 relative z-10 max-w-xs mx-auto">
        <span className="inline-flex items-center justify-center gap-1">
          <ShieldAlert className="w-3 h-3 text-text-muted" />
          Seus dados e históricos pertencem permanentemente a você.
        </span>
      </div>
    </div>
  );
}
