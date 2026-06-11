import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as client from "../api/client";
import type { User } from "../types";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const token = await client.getToken();
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      const { user: u } = await client.verifyToken();
      setUser(u);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      await client.clearToken();
    }
  }, []);

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false));
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const data = await client.login(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await client.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isLoading, isAuthenticated, user, login, logout, refresh: checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
