import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { processReferralOnSignup, getReferralCookie } from "@/lib/affiliate";

export const PRO_LEADS_BASE_LIMIT = 100;
export const FREE_LEADS_LIMIT = 3;
export const FREE_DAILY_SEARCHES = 2;
export const FREE_RESULTS_PER_SEARCH = 5;
export const LEAD_PACK_BONUS_SLOTS = 15;
export const getSavedLeadsLimit = (bonusSlots = 0, plan: "free" | "pro" = "pro") =>
  plan === "pro" ? PRO_LEADS_BASE_LIMIT + (bonusSlots ?? 0) : FREE_LEADS_LIMIT;
export const getSavedLeadsWarning = (bonusSlots = 0, plan: "free" | "pro" = "pro") =>
  Math.floor(getSavedLeadsLimit(bonusSlots, plan) * 0.75);
// Back-compat aliases (limit without bonus)
export const PRO_LEADS_LIMIT = PRO_LEADS_BASE_LIMIT;
export const PRO_LEADS_WARNING = Math.floor(PRO_LEADS_BASE_LIMIT * 0.75);

interface User {
  id: string;
  email: string;
  plan: "free" | "pro";
  searches_today: number;
  lifetime_searches_used: number;
  leads_remaining: number;
  subscribed: boolean;
  subscription_end: string | null;
  saved_leads_count: number;
  bonus_saved_slots: number;
  saved_leads_limit: number;
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

const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  refreshSubscription: async () => {},
  refreshLeadCount: async () => {},
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultAuthContext;
};

const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  const [{ data: usage }, { count }] = await Promise.all([
    supabase
      .from("usage_tracking")
      .select("searches_today, leads_remaining, plan, bonus_saved_slots, lifetime_searches_used")
      .eq("user_id", supabaseUser.id)
      .single(),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", supabaseUser.id),
  ]);

  const bonus = (usage as any)?.bonus_saved_slots ?? 0;
  const plan = (usage?.plan as "free" | "pro") ?? "free";
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    plan,
    searches_today: usage?.searches_today ?? 0,
    lifetime_searches_used: (usage as any)?.lifetime_searches_used ?? 0,
    leads_remaining: usage?.leads_remaining ?? 2,
    subscribed: usage?.plan === "pro",
    subscription_end: null,
    saved_leads_count: count ?? 0,
    bonus_saved_slots: bonus,
    saved_leads_limit: getSavedLeadsLimit(bonus, plan),
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
            if (getReferralCookie()) processReferralOnSignup();
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
    // Record login IP (non-blocking)
    supabase.functions.invoke("record-login-ip").catch((e) => console.warn("record-login-ip failed", e));
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke("signup-with-ip-check", {
      body: { email, password },
    });
    if (error) {
      const serverMsg = (data as any)?.error || (error as any)?.context?.error || error.message;
      throw new Error(serverMsg || "Signup failed");
    }
    if (data?.error) throw new Error(data.error);
    // Do NOT auto-login — user must verify email first.
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
