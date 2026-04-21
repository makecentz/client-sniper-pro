import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

export const PRO_LEADS_LIMIT = 200;
export const PRO_LEADS_WARNING = 150;

interface User {
  id: string;
  email: string;
  plan: "free" | "pro";
  searches_today: number;
  leads_remaining: number;
  subscribed: boolean;
  subscription_end: string | null;
  saved_leads_count: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshLeadCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  const [{ data: usage }, { count }] = await Promise.all([
    supabase
      .from("usage_tracking")
      .select("searches_today, leads_remaining, plan")
      .eq("user_id", supabaseUser.id)
      .single(),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", supabaseUser.id),
  ]);

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    plan: (usage?.plan as "free" | "pro") ?? "free",
    searches_today: usage?.searches_today ?? 0,
    leads_remaining: usage?.leads_remaining ?? 2,
    subscribed: usage?.plan === "pro",
    subscription_end: null,
    saved_leads_count: count ?? 0,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error || !data) return;
      
      setUser((prev) => {
        if (!prev) return prev;
        const newSubscribed = data.subscribed;
        const newPlan = data.subscribed ? "pro" : prev.plan;
        const newEnd = data.subscription_end || null;
        if (prev.subscribed === newSubscribed && prev.plan === newPlan && prev.subscription_end === newEnd) {
          return prev;
        }
        return {
          ...prev,
          subscribed: newSubscribed,
          plan: newPlan,
          subscription_end: newEnd,
        };
      });
    } catch (e) {
      console.error("Failed to check subscription:", e);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip token refresh events — they don't change user identity
        if (event === "TOKEN_REFRESHED") return;

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

  const refreshLeadCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    setUser((prev) => prev ? { ...prev, saved_leads_count: count ?? prev.saved_leads_count } : prev);
  }, [user?.id]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshSubscription: checkSubscription, refreshLeadCount }}>
      {children}
    </AuthContext.Provider>
  );
};
