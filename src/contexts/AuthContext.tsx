import React, { createContext, useContext, useState, useCallback } from "react";

interface User {
  id: string;
  email: string;
  plan: "free" | "pro";
  searches_today: number;
  leads_remaining: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Mock auth provider — will be replaced with Supabase Auth
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading] = useState(false);

  const login = useCallback(async (_email: string, _password: string) => {
    // Mock login
    setUser({
      id: "mock-user-1",
      email: _email,
      plan: "free",
      searches_today: 1,
      leads_remaining: 10,
    });
  }, []);

  const signup = useCallback(async (_email: string, _password: string) => {
    setUser({
      id: "mock-user-1",
      email: _email,
      plan: "free",
      searches_today: 0,
      leads_remaining: 2,
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
