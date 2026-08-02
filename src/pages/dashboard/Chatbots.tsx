import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Bot = {
  id: string; name: string; client_name: string | null; is_active: boolean;
  message_count: number; conversation_count: number; created_at: string;
  openai_assistant_id: string | null;
};

export default function Chatbots() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");

  const load = async () => {
    if (!user?.id) return;
    const { data: b } = await supabase
      .from("chatbots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setBots((b as Bot[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const createBot = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("chatbots")
        .insert({ user_id: user!.id, name: name.trim(), client_name: client.trim() || null })
        .select()
        .single();
      if (error) throw error;
      const { error: fnErr } = await supabase.functions.invoke("chatbot-create", {
        body: { chatbot_id: data.id },
      });
      if (fnErr) throw fnErr;
      toast.success("Chatbot created");
      setOpen(false); setName(""); setClient("");
      navigate(`/dashboard/chatbots/${data.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create chatbot");
    } finally { setCreating(false); }
  };

  const deleteBot = async (id: string) => {
    if (!confirm("Delete this chatbot? Its knowledge base and embed will stop working.")) return;
    await supabase.from("chatbots").delete().eq("id", id);
    setBots((bs) => bs.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Client Chatbots</h1>
          <p className="text-sm text-muted-foreground">
            Build branded AI chatbots for your clients for local businesses.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Chatbot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create chatbot</DialogTitle>
              <DialogDescription>
                You can customize branding, knowledge base, and behavior on the next screen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Internal name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Plumbing Bot" />
              </div>
              <div>
                <label className="text-sm font-medium">Client business name</label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Acme Plumbing" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createBot} disabled={creating || !name.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : bots.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No chatbots yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first client chatbot to get an embeddable widget.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((b) => (
            <Card key={b.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/chatbots/${b.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <CardDescription>{b.client_name || "—"}</CardDescription>
                  </div>
                  <Badge variant={b.is_active ? "default" : "secondary"}>
                    {b.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  <div>{b.conversation_count} chats</div>
                  <div>{b.message_count} messages</div>
                </div>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteBot(b.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
