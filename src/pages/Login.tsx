import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { Seo } from "@/components/Seo";
import { toast } from "sonner";
import { GoogleAuthButton, AuthDivider } from "@/components/GoogleAuthButton";
import { Mail } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUnverified(false);
    try {
      await login(email, password);
      toast.success("Logged in successfully");
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/email not confirmed|not confirmed|email_not_confirmed/i.test(msg)) {
        setUnverified(true);
        toast.error("Please verify your email before logging in.");
      } else {
        toast.error("Invalid credentials");
      }
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Enter your email above first");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent — check your inbox.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Seo
        title="Log in | Client Hunter AI"
        description="Sign in to your Client Hunter AI account to manage leads, run searches, and send AI-powered outreach."
        path="/login"
      />
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto mb-2 block">
            <img src={logo} alt="ClientHunter AI" className="h-14 w-auto" />
          </Link>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your ClientHunter AI account</CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleAuthButton />
          <AuthDivider />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          {unverified && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-foreground">
                  Your email isn't verified yet. Check your inbox for the confirmation link.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
