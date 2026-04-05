import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CreditCard, Mail } from "lucide-react";
import { toast } from "sonner";

const DashboardSettings = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and subscription</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5 text-primary" /> Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span className="text-foreground">April 2026</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5 text-primary" /> Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{user?.plan}</Badge>
              <span className="text-sm text-muted-foreground">
                {user?.plan === "free" ? "2 searches/day" : "Unlimited searches"}
              </span>
            </div>
            {user?.plan === "free" && (
              <Button size="sm" onClick={() => toast.info("Stripe integration coming soon")}>
                <CreditCard className="mr-2 h-4 w-4" /> Upgrade to Pro
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSettings;
