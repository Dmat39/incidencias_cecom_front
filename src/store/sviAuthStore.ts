import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setSviToken, clearSviToken } from '@/lib/apiSvi';

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

interface SviAuthStore {
  token: string | null;
  userId: number | null;
  loginTime: number | null;
  isAuthenticated: boolean;
  login: (token: string, userId: number) => void;
  logout: () => void;
  checkExpiration: () => void;
}

export const useSviAuthStore = create<SviAuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      loginTime: null,
      isAuthenticated: false,

      login: (token, userId) => {
        setSviToken(token);
        set({ token, userId, loginTime: Date.now(), isAuthenticated: true });
      },

      logout: () => {
        clearSviToken();
        set({ token: null, userId: null, loginTime: null, isAuthenticated: false });
      },

      checkExpiration: () => {
        const { loginTime } = get();
        if (loginTime && Date.now() - loginTime > EIGHT_HOURS) {
          get().logout();
        }
      },
    }),
    {
      name: 'svi-auth',
      onRehydrateStorage: () => (state) => {
        // Rehidratar token en memoria al cargar desde localStorage
        if (state?.token) setSviToken(state.token);
      },
    },
  ),
);
