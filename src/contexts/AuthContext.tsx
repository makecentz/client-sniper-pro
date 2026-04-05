import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string;
  plan: "free" | "pro";
  searches_today: number;
  leads_remaining: number;
  subscribed: boolean;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  const { data: usage } = await supabase
    .from("usage_tracking")
    .select("searches_today, leads_remaining, plan")
    .eq("user_id", supabaseUser.id)
    .single();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    plan: (usage?.plan as "free" | "pro") ?? "free",
    searches_today: usage?.searches_today ?? 0,
    leads_remaining: usage?.leads_remaining ?? 2,
    subscribed: usage?.plan === "pro",
    subscription_end: null,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error || !data) return;
      
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subscribed: data.subscribed,
          plan: data.subscribed ? "pro" : prev.plan,
          subscription_end: data.subscription_end || null,
        };
      });
    } catch (e) {
      console.error("Failed to check subscription:", e);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const mapped = await mapSupabaseUser(session.user);
            setUser(mapped);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const mapped = await mapSupabaseUser(session.user);
        setUser(mapped);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check subscription on login and periodically
  useEffect(() => {
    if (!user) return;
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user?.id, checkSubscription]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshSubscription: checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
};
