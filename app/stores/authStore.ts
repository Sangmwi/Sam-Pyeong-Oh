import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  session: Session | null; // Added session object
  isSessionSynced: boolean;
}

interface AuthActions {
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  setSynced: (isSynced: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  email: null,
  accessToken: null,
  session: null,
  isSessionSynced: false,

  setSession: (session) => {
    if (session) {
      set({
        isAuthenticated: true,
        isLoading: false,
        userId: session.user.id,
        email: session.user.email || null,
        accessToken: session.access_token,
        session: session,
        isSessionSynced: false, // Reset sync on new session
      });
    } else {
      set({
        isAuthenticated: false,
        isLoading: false,
        userId: null,
        email: null,
        accessToken: null,
        session: null,
        isSessionSynced: true, // No session needed
      });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  setSynced: (isSynced) => set({ isSessionSynced: isSynced }),

  logout: () => {
    set({
      isAuthenticated: false,
      isLoading: false,
      userId: null,
      email: null,
      accessToken: null,
      session: null,
      isSessionSynced: true,
    });
  },
}));
