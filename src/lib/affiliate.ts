import { supabase } from "@/integrations/supabase/client";

const COOKIE = "ch_ref";
const COOKIE_TS = "ch_ref_ts";

export const setReferralCookie = (code: string) => {
  const exp = new Date();
  exp.setDate(exp.getDate() + 30);
  // Last-click wins: always overwrite with the most recent code + timestamp
  document.cookie = `${COOKIE}=${encodeURIComponent(code)}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
  document.cookie = `${COOKIE_TS}=${Date.now()}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
};

const readCookie = (name: string): string | null => {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
};

export const getReferralCookie = (): string | null => readCookie(COOKIE);
export const getReferralTimestamp = (): number | null => {
  const v = readCookie(COOKIE_TS);
  return v ? Number(v) : null;
};

export const clearReferralCookie = () => {
  document.cookie = `${COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  document.cookie = `${COOKIE_TS}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export const trackReferralClick = async (code: string) => {
  setReferralCookie(code);
  try {
    await supabase.functions.invoke("affiliate-track-click", { body: { code } });
  } catch (e) {
    console.error("Click track failed", e);
  }
};

export const processReferralOnSignup = async () => {
  const code = getReferralCookie();
  if (!code) return;
  const clickedAt = getReferralTimestamp();
  try {
    await supabase.functions.invoke("affiliate-process-signup", {
      body: { referralCode: code, clickedAt },
    });
    clearReferralCookie();
  } catch (e) {
    console.error("Referral processing failed", e);
  }
};
