import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, User as UserIcon, KeyRound, LogOut } from 'lucide-react';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';
import { User } from '../types';

interface SettingsDropdownProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (updates: Partial<User>) => void;
}

export default function SettingsDropdown({ user, onLogout, onUpdateUser }: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.addEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-all ${
          isOpen ? 'bg-surf-2 text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-surf-1'
        }`}
        title="Configurações"
      >
        <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surf-1 border border-surf-2 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 border-b border-surf-2 mb-2">
            <p className="text-xs font-bold text-text-primary truncate">{user.name}</p>
            <p className="text-[10px] text-text-muted truncate">{user.email}</p>
          </div>
          
          <button
            onClick={() => { setIsOpen(false); setShowEditProfile(true); }}
            className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surf-2 hover:text-text-primary flex items-center gap-2 transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            Editar Perfil
          </button>
          
          <button
            onClick={() => { setIsOpen(false); setShowChangePassword(true); }}
            className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surf-2 hover:text-text-primary flex items-center gap-2 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Alterar Senha
          </button>
          
          <div className="my-1 border-t border-surf-2"></div>
          
          <button
            onClick={() => { setIsOpen(false); setShowLogoutConfirm(true); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      )}

      {/* Modals */}
      {showEditProfile && (
        <EditProfileModal 
          user={user} 
          onClose={() => setShowEditProfile(false)} 
          onSave={(updates) => {
            onUpdateUser(updates);
            setShowEditProfile(false);
          }}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal 
          onClose={() => setShowChangePassword(false)} 
        />
      )}

      {showLogoutConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl my-auto text-center">
            <h2 className="font-sora font-bold text-text-primary text-xl mb-2">Sair do TreinoBase?</h2>
            <p className="text-text-secondary text-sm mb-6">Tem certeza que deseja encerrar sua sessão atual?</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                Sim, Sair
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
