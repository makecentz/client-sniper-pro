import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Gift, DollarSign, Users, Zap, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { Seo } from "@/components/Seo";

const AffiliateProgram = () => {
  const { user } = useAuth();
  const [rate, setRate] = useState(30);

  useEffect(() => {
    supabase.from("admin_settings").select("value").eq("key", "affiliate_commission_rate").maybeSingle()
      .then(({ data }) => { if (data?.value) setRate(parseFloat(data.value) || 30); });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Affiliate Program | Client Hunter AI"
        description={`Earn ${rate}% recurring commission referring web developers to Client Hunter AI. Join the affiliate program and start earning today.`}
        path="/affiliate-program"
      />
      {/* Nav */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/"><img src={logo} alt="ClientHunter AI" className="h-10" /></Link>
          <Button asChild variant="ghost"><Link to="/">Home</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm">
            <Gift className="h-4 w-4 text-primary" /> ClientHunter Affiliate Program
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Earn <span className="text-primary">{rate}%</span> for every Pro user you refer
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Recurring commission on every Pro subscription. Get paid as soon as you hit just $50.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            U.S. residents only — I-9 form required for payouts.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            {user ? (
              <Button size="lg" asChild>
                <Link to="/dashboard/affiliate">Go to Affiliate Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild><Link to="/affiliate-signup">Become an Affiliate</Link></Button>
                <Button size="lg" variant="outline" asChild><Link to="/login">Log in</Link></Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            { icon: Zap, title: "Get your link", desc: "Sign up and instantly get your unique referral link from your dashboard." },
            { icon: Users, title: "Share it", desc: "Promote ClientHunter to agencies, freelancers, and marketers." },
            { icon: DollarSign, title: "Get paid", desc: `Earn ${rate}% commission for every Pro conversion. $50 minimum payout.` },
          ].map((s) => (
            <Card key={s.title} className="border-border/50">
              <CardContent className="p-6">
                <s.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AffiliateProgram;
