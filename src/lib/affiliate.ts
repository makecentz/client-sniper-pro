import { supabase } from "@/integrations/supabase/client";

const COOKIE = "ch_ref";

export const setReferralCookie = (code: string) => {
  const exp = new Date();
  exp.setDate(exp.getDate() + 30);
  document.cookie = `${COOKIE}=${encodeURIComponent(code)}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
};

export const getReferralCookie = (): string | null => {
  const m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
};

export const clearReferralCookie = () => {
  document.cookie = `${COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export const trackReferralClick = async (code: string) => {
  setReferralCookie(code);
  try {
    await supabase.rpc("record_affiliate_click", { _code: code });
  } catch (e) {
    console.error("Click track failed", e);
  }
};

export const processReferralOnSignup = async () => {
  const code = getReferralCookie();
  if (!code) return;
  try {
    await supabase.functions.invoke("affiliate-process-signup", {
      body: { referralCode: code },
    });
    clearReferralCookie();
  } catch (e) {
    console.error("Referral processing failed", e);
  }
};
