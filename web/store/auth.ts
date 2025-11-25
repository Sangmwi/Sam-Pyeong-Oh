/**
 * Authentication Store (Zustand)
 *
 * Memory-only storage for Supabase session tokens (no localStorage for security)
 * Tokens are provided by Native app via WebView message bridge
 */

import { create } from "zustand";
import type { AuthTokenMessage } from "@sam-pyeong-oh/shared";

interface AuthState {
  token: string | null;
  userId: string | null;
  expiresAt: number | null;
  provider: "google" | null;
}

interface AuthActions {
  // Use the payload type directly from shared types
  setAuth: (auth: AuthTokenMessage["payload"]) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  token: null,
  userId: null,
  expiresAt: null,
  provider: null,

  // Actions
  setAuth: (auth) => {
    set({
      token: auth.token,
      userId: auth.userId,
      expiresAt: auth.expiresAt,
      provider: auth.provider,
    });
  },

  clearAuth: () => {
    set({
      token: null,
      userId: null,
      expiresAt: null,
      provider: null,
    });
  },

  isAuthenticated: () => {
    const { token, expiresAt } = get();
    if (!token || !expiresAt) return false;
    return Date.now() < expiresAt;
  },

  isTokenExpired: () => {
    const { expiresAt } = get();
    if (!expiresAt) return true;
    return Date.now() >= expiresAt;
  },
}));
