import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UsuarioAuth } from '@/types';

interface AuthStore {
  user: UsuarioAuth | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  modulosPermitidos: string[];
  jurisdiccionesAsignadas: number[];
  login: (user: UsuarioAuth, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setModulos: (modulos: string[]) => void;
  setJurisdicciones: (ids: number[]) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      modulosPermitidos: [],
      jurisdiccionesAsignadas: [],

      login: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Señal cross-app: SVI-FRONTEND detecta esta cookie y también cierra sesión
          document.cookie = 'cecom_logged_out=1; path=/; max-age=30; SameSite=Lax';
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, modulosPermitidos: [] });
      },

      setModulos: (modulos) => set({ modulosPermitidos: modulos }),
      setJurisdicciones: (ids) => set({ jurisdiccionesAsignadas: ids }),

      setTokens: (accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        }
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        }));
      },
    }),
    {
      name: 'cecom-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        modulosPermitidos: state.modulosPermitidos,
        jurisdiccionesAsignadas: state.jurisdiccionesAsignadas,
      }),
    }
  )
);
