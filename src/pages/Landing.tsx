import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Target, MessageSquare, DollarSign, Zap, Shield, BarChart3 } from "lucide-react";
import logo from "@/assets/logo.png";

const features = [
  { icon: Search, title: "Find Businesses", desc: "Search local businesses by city, state, and industry using Outscraper." },
  { icon: Target, title: "Score Leads", desc: "Auto-score leads: no website = 🔥 Hot Lead, weak site = ⚠️ Needs Upgrade." },
  { icon: MessageSquare, title: "AI Outreach", desc: "Generate personalized emails, DMs, and SMS with AI in seconds." },
  { icon: DollarSign, title: "Close Deals", desc: "Send offers and follow-ups directly from the platform." },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="ClientHunter AI" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
            Snipe high-value clients{" "}
            <span className="text-primary">in minutes</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            Find local businesses without websites, generate AI-powered outreach, and close deals faster than ever. Built for agencies, freelancers, and hustlers.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="px-8 text-base">
                Start Free
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-8 text-base">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            How It Works
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Card key={i} className="border-border/50 bg-card/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border/50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">Simple Pricing</h2>
          <p className="mb-12 text-center text-muted-foreground">Start free. Scale when ready.</p>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Free */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <h3 className="mb-1 text-lg font-semibold text-foreground">Free</h3>
                <div className="mb-4 text-3xl font-bold text-foreground">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> 2 searches/day</li>
                  <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Lead scoring</li>
                  <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Basic AI messages</li>
                </ul>
                <Link to="/signup" className="mt-6 block">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
            {/* Pro */}
            <Card className="border-primary/50 bg-card ring-1 ring-primary/20">
              <CardContent className="p-6">
                <div className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Popular</div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">Pro</h3>
                <div className="mb-4 text-3xl font-bold text-foreground">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Unlimited searches</li>
                  <li className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> AI website audits</li>
                  <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> All AI tools</li>
                  <li className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Email sending</li>
                </ul>
                <Link to="/signup" className="mt-6 block">
                  <Button className="w-full">Upgrade to Pro</Button>
                </Link>
              </CardContent>
            </Card>
            {/* Pay per lead */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <h3 className="mb-1 text-lg font-semibold text-foreground">Lead Pack</h3>
                <div className="mb-4 text-3xl font-bold text-foreground">$10<span className="text-sm font-normal text-muted-foreground">/15 leads</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> 15 scored leads</li>
                  <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> AI messages included</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> No commitment</li>
                </ul>
                <Link to="/signup" className="mt-6 block">
                  <Button variant="outline" className="w-full">Buy Leads</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <img src={logo} alt="ClientHunter AI" className="h-6 w-auto" />
          </div>
          <span>© 2026 All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
