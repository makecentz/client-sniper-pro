// Resolves third-party API keys: admin-managed override in the database first,
// falling back to the platform environment secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const MANAGED_KEYS = [
  "OUTSCRAPER_API_KEY",
  "SCREENSHOTONE_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "OPENAI_API_KEY",
  "SITE_URL",
] as const;

export type ManagedKey = (typeof MANAGED_KEYS)[number];

const cache = new Map<string, string | undefined>();

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/** Returns the admin override if one is saved, otherwise the env secret. */
export async function getApiKey(name: ManagedKey | string): Promise<string> {
  if (cache.has(name)) return cache.get(name) ?? "";
  let value = "";
  try {
    const { data } = await admin()
      .from("app_api_keys")
      .select("value")
      .eq("key_name", name)
      .maybeSingle();
    if (data?.value) value = data.value as string;
  } catch (_e) {
    // fall through to env
  }
  if (!value) value = Deno.env.get(name) ?? "";
  cache.set(name, value);
  return value;
}

export function maskKey(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(6)}${value.slice(-4)}`;
}
