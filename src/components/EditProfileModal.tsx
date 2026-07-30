import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updates: Partial<User>) => void;
}

export default function EditProfileModal({ user, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.personalPhone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Avoid calling Supabase for mock users to prevent errors during local testing
      if (!user.id.startsWith('mock')) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            full_name: name
          })
          .eq('id', user.id);

        if (error) throw error;
      }

      onSave({ name, personalPhone: phone });
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro ao atualizar perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h2 className="font-sora font-bold text-text-primary text-base">Editar Perfil</h2>
          <button onClick={onClose} className="p-1.5 bg-surf-2 rounded-lg text-text-muted hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Nome Completo</label>
            <input 
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-surf-2 border border-surf-2 rounded-xl p-3 text-sm text-text-primary focus:border-lime-electric focus:ring-1 focus:ring-lime-electric transition-all"
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">WhatsApp (Opcional)</label>
            <input 
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-surf-2 border border-surf-2 rounded-xl p-3 text-sm text-text-primary focus:border-lime-electric focus:ring-1 focus:ring-lime-electric transition-all"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-lime-electric hover:bg-lime-electric/90 text-bg-dark font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
