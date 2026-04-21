import { useEffect, useMemo, useRef, useState } from "react";
import { X, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Settings = {
  enabled: boolean;
  mobile_enabled: boolean;
  position: string;
  display_duration_seconds: number;
  delay_between_seconds: number;
  animation_type: string;
  show_close_button: boolean;
  auto_rotate: boolean;
  source_mode: string;
  show_city_state: boolean;
  click_action: string | null;
  loop_notifications: boolean;
  randomize_order: boolean;
};

type EventRow = {
  id: string;
  event_type: string;
  first_name: string;
  last_initial: string;
  city: string;
  state: string | null;
  custom_message: string | null;
  source_type: string;
  is_real_event: boolean;
};

type Template = { event_type: string; template_text: string };

const clickActionToHref = (action?: string | null): string | null => {
  switch (action) {
    case "signup": return "/signup";
    case "pricing": return "/#pricing";
    case "demo": return "/signup";
    case "trial": return "/signup";
    default: return null;
  }
};

const renderMessage = (e: EventRow, templates: Map<string, string>, showState: boolean) => {
  const tpl = templates.get(e.event_type) ?? "{first_name} {last_initial}. just signed up from {city}";
  const cityLabel = showState && e.state ? `${e.city}, ${e.state}` : e.city;
  return tpl
    .replace("{first_name}", e.first_name)
    .replace("{last_initial}", e.last_initial)
    .replace("{city}", cityLabel)
    .replace("{custom_message}", e.custom_message ?? "");
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const SocialProofBanner = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [templates, setTemplates] = useState<Map<string, string>>(new Map());
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Load settings, events, templates once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: ev }, { data: tpl }] = await Promise.all([
        supabase.from("social_proof_settings").select("*").eq("id", 1).maybeSingle(),
        supabase
          .from("social_proof_events")
          .select("id,event_type,first_name,last_initial,city,state,custom_message,source_type,is_real_event")
          .eq("is_active", true)
          .eq("is_approved", true),
        supabase.from("social_proof_templates").select("event_type,template_text"),
      ]);
      if (cancelled) return;
      if (s) setSettings(s as Settings);
      if (tpl) setTemplates(new Map((tpl as Template[]).map((t) => [t.event_type, t.template_text])));
      if (ev) setEvents(s?.randomize_order === false ? (ev as EventRow[]) : shuffle(ev as EventRow[]));
    })();
    return () => { cancelled = true; };
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const enabled = settings?.enabled && (!isMobile || settings?.mobile_enabled) && events.length > 0 && !dismissed;

  // Rotation loop
  useEffect(() => {
    if (!enabled || !settings) return;
    const showMs = settings.display_duration_seconds * 1000;
    const delayMs = settings.delay_between_seconds * 1000;

    // Initial show after a small grace period
    const startTimer = window.setTimeout(() => setVisible(true), 1500);

    const tick = () => {
      setVisible(false);
      timerRef.current = window.setTimeout(() => {
        setIndex((i) => {
          const next = i + 1;
          if (next >= events.length) return settings.loop_notifications ? 0 : i;
          return next;
        });
        setVisible(true);
      }, delayMs);
    };

    const showTimer = window.setInterval(tick, showMs + delayMs);

    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(showTimer);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, settings, events.length]);

  // Log impression when visible event changes
  const currentEvent = events[index];
  useEffect(() => {
    if (!visible || !currentEvent) return;
    supabase.from("social_proof_impressions_log").insert({ event_id: currentEvent.id }).then(() => {});
  }, [visible, currentEvent?.id]);

  const message = useMemo(() => {
    if (!currentEvent) return "";
    return renderMessage(currentEvent, templates, settings?.show_city_state ?? false);
  }, [currentEvent, templates, settings?.show_city_state]);

  if (!enabled || !currentEvent) return null;

  const positionClass = settings?.position === "bottom-right"
    ? "bottom-4 right-4 md:bottom-6 md:right-6"
    : "bottom-4 left-4 md:bottom-6 md:left-6";

  const animClass = (() => {
    if (!visible) return "opacity-0 translate-y-2 scale-95 pointer-events-none";
    switch (settings?.animation_type) {
      case "fade": return "opacity-100";
      case "scale-in": return "opacity-100 scale-100";
      case "slide-up":
      default: return "opacity-100 translate-y-0 scale-100";
    }
  })();

  const href = clickActionToHref(settings?.click_action);

  const Inner = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 pr-2 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-md text-card-foreground shadow-lg shadow-primary/20 max-w-sm",
        "transition-all duration-500 ease-out",
        animClass,
      )}
      style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.25), 0 8px 30px rgba(0,0,0,0.4)" }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <TrendingUp className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate">{message}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">just now</p>
      </div>
      {settings?.show_close_button && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className={cn("fixed z-50", positionClass)} role="status" aria-live="polite">
      {href ? (
        <a
          href={href}
          onClick={() => {
            supabase.from("social_proof_impressions_log").insert({
              event_id: currentEvent.id,
              clicked: true,
              clicked_at: new Date().toISOString(),
            }).then(() => {});
          }}
        >
          {Inner}
        </a>
      ) : Inner}
    </div>
  );
};

export default SocialProofBanner;
