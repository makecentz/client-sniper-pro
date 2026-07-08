import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

type Submission = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
};

export const AdminContactSubmissions = () => {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Failed to load contact submissions");
    } else {
      setRows((data ?? []) as Submission[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markHandled = async (id: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status: "handled" })
      .eq("id", id);
    if (error) return toast.error("Update failed");
    toast.success("Marked as handled");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" /> Contact Submissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <a href={`mailto:${r.email}`} className="text-xs text-primary hover:underline">{r.email}</a>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">{r.subject || "—"}</TableCell>
                  <TableCell className="max-w-[320px]">
                    <div className="line-clamp-3 whitespace-pre-wrap text-sm">{r.message}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "handled" ? "secondary" : "default"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.status !== "handled" && (
                      <Button size="sm" variant="outline" onClick={() => markHandled(r.id)}>
                        Mark handled
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
