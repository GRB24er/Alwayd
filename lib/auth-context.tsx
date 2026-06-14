/**
 * Aldwych European Capital — Authentication Context
 * 
 * Provides global auth state management connecting to the Alwayd web app.
 * Handles login, logout, token verification, and biometric re-authentication.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as BankingAPI from "./banking-api";
import * as BiometricAuth from "./biometric-auth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: BankingAPI.BankUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocked: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  unlock: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isLocked: false,
  error: null,
  login: async () => false,
  logout: async () => {},
  refreshUser: async () => {},
  unlock: async () => false,
  clearError: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function BankAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BankingAPI.BankUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backgroundTime = useRef<number | null>(null);

  // Initialize: check for existing session
  useEffect(() => {
    initializeAuth();
  }, []);

  // App state listener for biometric lock
  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [user]);

  async function initializeAuth() {
    try {
      setIsLoading(true);
      // Try to get cached user first for instant UI
      const cached = await BankingAPI.getCachedUser();
      if (cached) {
        setUser(cached);
        // Verify token in background
        const verified = await BankingAPI.verifyToken();
        if (verified) {
          setUser(verified);
        } else {
          // Token expired
          setUser(null);
          await BankingAPI.logout();
        }
      }
    } catch (err) {
      console.error("[Auth] Init error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAppStateChange(nextState: AppStateStatus) {
    if (!user) return;

    if (nextState === "background" || nextState === "inactive") {
      backgroundTime.current = Date.now();
    } else if (nextState === "active" && backgroundTime.current) {
      const elapsed = Date.now() - backgroundTime.current;
      const timeout = await BiometricAuth.getAppLockTimeout();
      const biometricEnabled = await BiometricAuth.isBiometricEnabled();

      if (biometricEnabled && elapsed > timeout) {
        setIsLocked(true);
      }
      backgroundTime.current = null;
    }
  }

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await BankingAPI.login(email, password);
      setUser(result.user);
      setIsLocked(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await BankingAPI.logout();
    setUser(null);
    setIsLocked(false);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const verified = await BankingAPI.verifyToken();
    if (verified) {
      setUser(verified);
    }
  }, []);

  const unlock = useCallback(async (): Promise<boolean> => {
    const success = await BiometricAuth.authenticateForAppUnlock();
    if (success) {
      setIsLocked(false);
    }
    return success;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isLocked,
        error,
        login,
        logout,
        refreshUser,
        unlock,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBankAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useBankAuth must be used within a BankAuthProvider");
  }
  return context;
}
