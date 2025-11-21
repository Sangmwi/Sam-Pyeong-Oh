/**
 * Secure Storage Hook
 *
 * Type-safe wrapper around expo-secure-store for authentication data
 */

import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { SECURE_STORE_KEYS, type OAuthProvider } from "@app/config/constants";

/**
 * Authentication data stored in SecureStore
 */
export interface StoredAuthData {
  token: string;
  userId: string;
  provider: OAuthProvider;
  expiresAt: number;
}

/**
 * Hook for secure storage operations
 *
 * Provides type-safe methods to store and retrieve authentication data
 */
export function useSecureStorage() {
  /**
   * Save authentication data to SecureStore
   */
  const saveAuth = useCallback(async (data: StoredAuthData): Promise<void> => {
    try {
      await Promise.all([
        SecureStore.setItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN, data.token),
        SecureStore.setItemAsync(SECURE_STORE_KEYS.USER_ID, data.userId),
        SecureStore.setItemAsync(SECURE_STORE_KEYS.PROVIDER, data.provider),
        SecureStore.setItemAsync(SECURE_STORE_KEYS.EXPIRES_AT, data.expiresAt.toString()),
      ]);
    } catch (error) {
      console.error("Failed to save auth data:", error);
      throw new Error("인증 정보 저장에 실패했습니다.");
    }
  }, []);

  /**
   * Retrieve authentication data from SecureStore
   */
  const getAuth = useCallback(async (): Promise<StoredAuthData | null> => {
    try {
      const [token, userId, provider, expiresAt] = await Promise.all([
        SecureStore.getItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN),
        SecureStore.getItemAsync(SECURE_STORE_KEYS.USER_ID),
        SecureStore.getItemAsync(SECURE_STORE_KEYS.PROVIDER),
        SecureStore.getItemAsync(SECURE_STORE_KEYS.EXPIRES_AT),
      ]);

      // Check if all required data exists
      if (!token || !userId || !provider || !expiresAt) {
        return null;
      }

      return {
        token,
        userId,
        provider: provider as OAuthProvider,
        expiresAt: parseInt(expiresAt, 10),
      };
    } catch (error) {
      console.error("Failed to retrieve auth data:", error);
      return null;
    }
  }, []);

  /**
   * Clear all authentication data from SecureStore
   */
  const clearAuth = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN),
        SecureStore.deleteItemAsync(SECURE_STORE_KEYS.USER_ID),
        SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PROVIDER),
        SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EXPIRES_AT),
      ]);
    } catch (error) {
      console.error("Failed to clear auth data:", error);
      throw new Error("인증 정보 삭제에 실패했습니다.");
    }
  }, []);

  /**
   * Check if stored token is expired
   */
  const isTokenExpired = useCallback(async (): Promise<boolean> => {
    try {
      const expiresAtStr = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EXPIRES_AT);
      if (!expiresAtStr) {
        return true;
      }

      const expiresAt = parseInt(expiresAtStr, 10);
      return Date.now() >= expiresAt;
    } catch (error) {
      console.error("Failed to check token expiration:", error);
      return true; // Assume expired on error
    }
  }, []);

  /**
   * Update only the token (for token refresh)
   */
  const updateToken = useCallback(async (token: string, expiresAt: number): Promise<void> => {
    try {
      await Promise.all([
        SecureStore.setItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN, token),
        SecureStore.setItemAsync(SECURE_STORE_KEYS.EXPIRES_AT, expiresAt.toString()),
      ]);
    } catch (error) {
      console.error("Failed to update token:", error);
      throw new Error("토큰 업데이트에 실패했습니다.");
    }
  }, []);

  return {
    saveAuth,
    getAuth,
    clearAuth,
    isTokenExpired,
    updateToken,
  };
}
