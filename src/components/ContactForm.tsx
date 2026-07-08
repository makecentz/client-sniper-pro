import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export const ContactForm = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("contact_submissions")
        .insert({
          name: parsed.data.name,
          email: parsed.data.email,
          subject: parsed.data.subject || null,
          message: parsed.data.message,
        })
        .select("id")
        .single();
      if (error) throw error;

      supabase.functions
        .invoke("send-contact-notification", {
          body: {
            submissionId: data.id,
            name: parsed.data.name,
            email: parsed.data.email,
            subject: parsed.data.subject || null,
            message: parsed.data.message,
          },
        })
        .catch((err) => console.error("notify admin failed", err));

      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      console.error(err);
      toast.error("Could not send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="cf-name">Name</Label>
              <Input
                id="cf-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="cf-email">Email</Label>
              <Input
                id="cf-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={255}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cf-subject">Subject <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="cf-subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              maxLength={150}
            />
          </div>
          <div>
            <Label htmlFor="cf-message">Message</Label>
            <Textarea
              id="cf-message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={2000}
              rows={5}
              required
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full md:w-auto">
            {submitting ? "Sending..." : (<><Send className="mr-2 h-4 w-4" /> Send Message</>)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
