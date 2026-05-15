import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Megaphone, X } from "lucide-react";

export function DashboardMessageBanner() {
  const { user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [messageAt, setMessageAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("usage_tracking")
        .select("admin_message, admin_message_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.admin_message) {
        setMessage(data.admin_message);
        setMessageAt(data.admin_message_at);
        const key = `admin_msg_dismissed_${user.id}_${data.admin_message_at ?? ""}`;
        setDismissed(sessionStorage.getItem(key) === "1");
      } else {
        setMessage(null);
      }
    };
    load();
  }, [user?.id]);

  if (!user || !message || dismissed) return null;

  const handleDismiss = () => {
    const key = `admin_msg_dismissed_${user.id}_${messageAt ?? ""}`;
    sessionStorage.setItem(key, "1");
    setDismissed(true);
  };

  return (
    <Alert className="rounded-none border-x-0 border-t-0 border-b border-amber-500/40 bg-amber-500/10 text-foreground">
      <Megaphone className="h-4 w-4 text-amber-500" />
      <div className="flex-1">
        <AlertTitle className="text-amber-600 dark:text-amber-400">Message from support</AlertTitle>
        <AlertDescription className="whitespace-pre-wrap">{message}</AlertDescription>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
