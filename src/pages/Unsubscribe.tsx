import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "valid" | "used" | "invalid" | "done" | "error">("loading");
  const [email, setEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: supabaseAnonKey },
        });
        const data = await res.json();
        if (!res.ok) { setState("invalid"); return; }
        if (data.used) { setState("used"); }
        else { setState("valid"); setEmail(data.email || ""); }
      } catch { setState("invalid"); }
    })();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabaseAnonKey },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) { setState("error"); return; }
      setState("done");
    } catch { setState("error"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Validating link…</div>}
          {state === "invalid" && <div className="flex items-start gap-2 text-destructive"><AlertTriangle className="h-5 w-5 mt-0.5" /><p>This unsubscribe link is invalid or expired.</p></div>}
          {state === "used" && <div className="flex items-start gap-2 text-muted-foreground"><CheckCircle2 className="h-5 w-5 mt-0.5 text-success" /><p>You're already unsubscribed.</p></div>}
          {state === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">Click below to unsubscribe {email ? <strong>{email}</strong> : "this address"} from ClientHunter AI emails.</p>
              <Button onClick={confirm} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm unsubscribe"}
              </Button>
            </>
          )}
          {state === "done" && <div className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 mt-0.5 text-success" /><p>You've been unsubscribed. We won't email you again.</p></div>}
          {state === "error" && <div className="flex items-start gap-2 text-destructive"><AlertTriangle className="h-5 w-5 mt-0.5" /><p>Something went wrong. Please try again.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
