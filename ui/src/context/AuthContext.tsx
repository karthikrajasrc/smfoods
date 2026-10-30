import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest } from "../lib/api";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  login: (credential: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ user: SessionUser | null }>("/auth/me")
      .then(({ user: sessionUser }) => {
        if (active) setUser(sessionUser);
      })
      .catch((cause: unknown) => {
        if (active) {
          setUser(null);
          setError(cause instanceof Error ? cause.message : "Could not check the current sign-in.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    async login(credential) {
      setError(null);
      const result = await apiRequest<{ user: SessionUser }>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      setUser(result.user);
    },
    async loginWithPassword(email, password) {
      setError(null);
      const result = await apiRequest<{ user: SessionUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(result.user);
    },
    async register(name, email, password) {
      setError(null);
      const result = await apiRequest<{ user: SessionUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setUser(result.user);
    },
    async logout() {
      setError(null);
      await apiRequest<void>("/auth/logout", { method: "POST" });
      setUser(null);
    },
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
