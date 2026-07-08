import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Target, MessageSquare, DollarSign, Zap, Shield, BarChart3, Sparkles, Flame, Wand2, ArrowRight, Check, Star } from "lucide-react";
import testimonialMarcus from "@/assets/testimonial-marcus.jpg";
import testimonialJasmine from "@/assets/testimonial-jasmine.jpg";
import testimonialAndre from "@/assets/testimonial-andre.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import pricingBg from "@/assets/pricing-bg.png";
import { SocialProofBanner } from "@/components/SocialProofBanner";
import { Seo } from "@/components/Seo";

const DEFAULT_HERO_VIDEO = "/videos/hero-bg.mp4";

const features = [
  { icon: Search, title: "Find Businesses", desc: "Search local businesses by city, state, and industry." },
  { icon: Target, title: "Score Leads", desc: "Auto-score leads: no website = 🔥 Hot Lead, weak site = ⚠️ Needs Upgrade." },
  { icon: MessageSquare, title: "AI Outreach", desc: "Generate personalized emails, DMs, and SMS with AI in seconds." },
  { icon: DollarSign, title: "Close Deals", desc: "Send offers and follow-ups directly from the platform." },
];

const Landing = () => {
  const { user } = useAuth();
  const [heroVideoUrl, setHeroVideoUrl] = useState(DEFAULT_HERO_VIDEO);
  const [heroVideoOpacity, setHeroVideoOpacity] = useState(0.5);
  const [footerAddress, setFooterAddress] = useState("5429 Baltimore Ave\nPhiladelphia, PA 19143");
  const [footerPhone, setFooterPhone] = useState("(445) 326-9638");
  const [footerEmail, setFooterEmail] = useState("clienthunterainow@gmail.com");
  const [footerCompanyName, setFooterCompanyName] = useState("EcomExperts LLC");

  useEffect(() => {
    supabase
      .from("admin_settings")
      .select("key,value")
      .in("key", [
        "hero_video_url",
        "hero_video_opacity",
        "footer_address",
        "footer_phone",
        "footer_email",
        "footer_company_name",
      ])
      .then(({ data }) => {
        if (!data) return;
        for (const row of data) {
          if (row.key === "hero_video_url" && row.value) setHeroVideoUrl(row.value);
          if (row.key === "hero_video_opacity" && row.value) {
            const o = parseInt(row.value, 10);
            if (!isNaN(o)) setHeroVideoOpacity(Math.max(0, Math.min(100, o)) / 100);
          }
          if (row.key === "footer_address" && row.value) setFooterAddress(row.value);
          if (row.key === "footer_phone" && row.value) setFooterPhone(row.value);
          if (row.key === "footer_email" && row.value) setFooterEmail(row.value);
          if (row.key === "footer_company_name" && row.value) setFooterCompanyName(row.value);
        }
      });
  }, []);

  const phoneHref = `tel:+${footerPhone.replace(/[^\d]/g, "")}`;
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Client Hunter AI — Lead generation for web developers"
        description="Find, score, and close local business leads with AI-powered outreach, heatmap search, and instant website audits — built for web developers."
        path="/"
      />
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="ClientHunter AI" className="h-20 w-auto" />
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
            <a href="#pro" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Pro</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm">My Account</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        <video
          key={heroVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: heroVideoOpacity }}
          src={heroVideoUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/30 to-background/50" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:text-left">
          <div className="text-center lg:text-left">
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
              Find website clients{" "}
              <span className="text-primary">in minutes</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Discover businesses that need a website, generate AI-powered outreach, and turn opportunities into paying clients — all in one place
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
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
              <Link to={user ? "/dashboard/search" : "/signup?redirect=/dashboard/search"}>
                <Button variant="secondary" size="lg" className="px-8 text-base">
                  <Search className="mr-2 h-4 w-4" />
                  Try a Sample Search
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero mockup: half source code / half rendered site */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-2xl" />
            <div className="relative max-h-[280px] overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-2xl backdrop-blur lg:rotate-1 lg:hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <span className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <div className="ml-3 flex-1 rounded-md bg-background/60 px-3 py-1 text-center text-[11px] text-muted-foreground">
                  clienthunter.ai / preview
                </div>
                <div className="hidden items-center gap-1 rounded bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline-flex">
                  <Sparkles className="h-2.5 w-2.5" /> Live
                </div>
              </div>

              <div className="grid grid-cols-5 gap-0 text-xs">
                {/* Code half */}
                <div className="relative col-span-3 overflow-hidden border-r border-border/40 bg-[#0b1020] p-3 font-mono leading-relaxed">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">FindLeads.tsx</p>
                  <div className="space-y-0.5">
                    {[
                      { d: 0, c: <><span className="text-purple-400">interface</span> <span className="text-yellow-300">Lead</span> {"{"}</> },
                      { d: 100, c: <>&nbsp;&nbsp;<span className="text-sky-300">id</span>: <span className="text-orange-300">string</span>;</> },
                      { d: 200, c: <>&nbsp;&nbsp;<span className="text-sky-300">name</span>: <span className="text-orange-300">string</span>;</> },
                      { d: 300, c: <>&nbsp;&nbsp;<span className="text-sky-300">city</span>: <span className="text-orange-300">string</span>;</> },
                      { d: 400, c: <>&nbsp;&nbsp;<span className="text-sky-300">score</span>: <span className="text-orange-300">"hot"</span> | <span className="text-orange-300">"warm"</span>;</> },
                      { d: 500, c: <>{"}"}</> },
                      { d: 600, c: <><span className="text-purple-400">export</span> <span className="text-purple-400">function</span> <span className="text-yellow-300">FindLeads</span>() {"{"}</> },
                      { d: 700, c: <>&nbsp;&nbsp;<span className="text-purple-400">const</span> [leads, setLeads] = <span className="text-yellow-300">useState</span>&lt;Lead[]&gt;([]);</> },
                      { d: 800, c: <>&nbsp;&nbsp;<span className="text-purple-400">useEffect</span>(() =&gt; {"{"}</> },
                      { d: 900, c: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">searchBusinesses</span>(city, industry).<span className="text-yellow-300">then</span>(setLeads);</> },
                      { d: 1000, c: <>&nbsp;&nbsp;{"}"}, [city, industry]);</> },
                      { d: 1100, c: <>&nbsp;&nbsp;<span className="text-purple-400">return</span> &lt;<span className="text-sky-300">LeadGrid</span> <span className="text-emerald-300">leads</span>={"{"}<span className="text-sky-300">leads</span>{"}"} /&gt;;</> },
                      { d: 1200, c: <>{"}"}<span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-primary" /></> },
                    ].map((line, i) => (
                      <div
                        key={i}
                        className="animate-fade-in text-foreground/90 opacity-0"
                        style={{ animationDelay: `${line.d}ms`, animationFillMode: "forwards" }}
                      >
                        <span className="mr-2 select-none text-muted-foreground/40">{String(i + 1).padStart(2, "0")}</span>
                        {line.c}
                      </div>
                    ))}
                  </div>
                  {/* Scan line */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-primary/20 to-transparent"
                    style={{ animation: "heroScan 3.5s ease-in-out infinite" }}
                  />
                </div>

                {/* Rendered site half */}
                <div className="col-span-2 bg-background/20 p-2">
                  <div className="overflow-hidden rounded-md border border-border/40 bg-background">
                    <div className="relative h-16 bg-gradient-to-br from-orange-500/50 via-red-500/40 to-amber-400/40">
                      <div className="absolute inset-x-3 top-2 flex items-center justify-between">
                        <div className="h-1.5 w-10 rounded bg-white/70" />
                        <div className="flex gap-1">
                          <div className="h-1.5 w-5 rounded bg-white/60" />
                          <div className="h-1.5 w-5 rounded bg-white/60" />
                          <div className="h-1.5 w-5 rounded bg-white/60" />
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-2 flex flex-col items-start px-3">
                        <div className="h-2 w-24 rounded bg-white/90 animate-fade-in" style={{ animationDelay: "600ms", animationFillMode: "both" }} />
                        <div className="mt-1 h-1.5 w-32 rounded bg-white/60 animate-fade-in" style={{ animationDelay: "900ms", animationFillMode: "both" }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-8 rounded animate-fade-in"
                          style={{
                            background: `linear-gradient(135deg, hsl(${20 + i * 20} 85% 55% / 0.5), hsl(${40 + i * 15} 80% 60% / 0.35))`,
                            animationDelay: `${1000 + i * 150}ms`,
                            animationFillMode: "both",
                          }}
                        />
                      ))}
                    </div>
                    <div className="space-y-1 border-t border-border/30 p-2">
                      <div className="h-1.5 w-3/4 rounded bg-foreground/30 animate-fade-in" style={{ animationDelay: "1400ms", animationFillMode: "both" }} />
                      <div className="h-1.5 w-1/2 rounded bg-foreground/20 animate-fade-in" style={{ animationDelay: "1550ms", animationFillMode: "both" }} />
                      <div className="mt-1 flex items-center gap-2 animate-fade-in" style={{ animationDelay: "1700ms", animationFillMode: "both" }}>
                        <div className="h-4 w-14 rounded bg-primary" />
                        <div className="h-4 w-10 rounded border border-border/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-3 -top-3 z-20 flex items-center gap-1.5 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-lg lg:-right-6 lg:-top-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Code → Live Site
            </div>

            <style>{`
              @keyframes heroScan {
                0% { transform: translateY(-100%); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateY(600%); opacity: 0; }
              }
            `}</style>
          </div>
        </div>
      </section>



      {/* Features */}
      <section id="how-it-works" className="border-t border-border/50 px-6 py-20">
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

      {/* Hot Feature: Lovable.dev one-prompt websites */}
      <section id="pro" className="relative overflow-hidden border-t border-border/50 px-6 py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
        <div className="absolute -top-40 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
                <Flame className="h-3.5 w-3.5" /> Hot · Pro Feature
              </div>
              <h2 className="mb-4 text-4xl font-bold leading-tight text-foreground md:text-5xl">
                Pitch a real website in <span className="text-primary">60 seconds</span>.
              </h2>
              <p className="mb-6 text-lg text-muted-foreground">
                Every Pro lead comes with a one-click <span className="font-semibold text-foreground">Lovable.dev</span> prompt built from their Google listing — photos, hours, reviews, and contact info, all included. Paste it into Lovable and walk into your sales call with a working demo site.
              </p>
              <ul className="mb-8 space-y-3">
                {[
                  "Pulls real photos from the prospect's Google Maps listing",
                  "Auto-fills business name, address, phone & hours",
                  "Generates a copy-paste prompt for Lovable.dev",
                  "Open in Lovable.dev with one click",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
                <span>Powered by</span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-1 font-bold tracking-tight text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  lovable<span className="text-primary">.dev</span>
                </span>
              </div>
              <Link to={user ? "/dashboard/settings" : "/signup"}>
                <Button size="lg" className="group bg-red-600 text-white hover:bg-red-700">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Unlock with Pro
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-2xl" />
              <div className="relative rounded-xl border border-border/60 bg-card/80 shadow-2xl backdrop-blur lg:rotate-1 lg:hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-500/80" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <span className="h-3 w-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="ml-3 flex-1 rounded-md bg-background/60 px-3 py-1 text-center text-[11px] text-muted-foreground">
                    lovable.dev / new-project
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-0 text-xs">
                  <div className="col-span-2 border-r border-border/40 bg-background/40 p-4 font-mono leading-relaxed">
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Prompt</p>
                    <p className="text-foreground/90">
                      Build a modern marketing site for{" "}
                      <span className="text-primary">Joe's Pizza</span> (Brooklyn, NY).
                    </p>
                    <p className="mt-2 text-foreground/70">Use these Google photos as the hero & gallery:</p>
                    <p className="mt-1 truncate text-primary/80">maps.google.com/photo/1.jpg</p>
                    <p className="truncate text-primary/80">maps.google.com/photo/2.jpg</p>
                    <p className="mt-2 text-foreground/70">
                      Phone: <span className="text-foreground">(555) 123-4567</span>
                    </p>
                    <p className="text-foreground/70">
                      Hours: <span className="text-foreground">Mon–Sun 11a–11p</span>
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 rounded bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
                      <Sparkles className="h-2.5 w-2.5" /> Generating…
                    </div>
                  </div>

                  <div className="col-span-3 bg-background/20 p-3">
                    <div className="overflow-hidden rounded-md border border-border/40 bg-background">
                      <div className="relative h-20 bg-gradient-to-br from-orange-500/40 via-red-500/30 to-amber-400/30">
                        <div className="absolute inset-0 flex flex-col justify-end p-2">
                          <div className="h-2 w-20 rounded bg-white/80" />
                          <div className="mt-1 h-1.5 w-28 rounded bg-white/50" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 p-2">
                        <div className="h-8 rounded bg-orange-400/30" />
                        <div className="h-8 rounded bg-red-400/30" />
                        <div className="h-8 rounded bg-amber-400/30" />
                      </div>
                      <div className="space-y-1 border-t border-border/30 p-2">
                        <div className="h-1.5 w-3/4 rounded bg-foreground/30" />
                        <div className="h-1.5 w-1/2 rounded bg-foreground/20" />
                        <div className="mt-1.5 h-3 w-16 rounded bg-primary/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-3 -top-3 z-20 flex items-center gap-1.5 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-lg lg:-right-6 lg:-top-4">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Instant One Prompt Website
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border/50 bg-secondary/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Web developers are finding clients faster
            </h2>
            <p className="text-lg text-muted-foreground">
              Real outreach. Better leads. More chances to close website projects.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "ClientHunter AI helped me find businesses in my city that didn't even have a website. I reached out the same day and booked two calls by the end of the week.",
                name: "Marcus Taylor",
                role: "Freelance Web Developer",
                avatar: testimonialMarcus,
              },
              {
                quote:
                  "I used to spend hours searching Google Maps for leads. Now I can quickly find businesses with weak websites, save them, and start outreach from one dashboard.",
                name: "Jasmine Brooks",
                role: "Website Designer",
                avatar: testimonialJasmine,
              },
              {
                quote:
                  "The best part is how simple it is. I can search by niche, find local businesses, and get ideas for outreach messages without overthinking the process.",
                name: "Andre Wilson",
                role: "Agency Owner",
                avatar: testimonialAndre,
              },
            ].map((t) => (
              <Card
                key={t.name}
                className="border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <CardContent className="flex h-full flex-col p-7">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="mb-6 flex-1 text-[15px] leading-relaxed text-foreground/90">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3 border-t border-border/50 pt-5">
                    <img
                      src={t.avatar}
                      alt={`${t.name} headshot`}
                      loading="lazy"
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {t.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-14 text-center">
            <p className="mb-4 text-lg text-foreground">
              Ready to find your next website client?
            </p>
            <Link to="/signup">
              <Button size="lg" className="px-8 text-base">
                Start Free Plan
              </Button>
            </Link>
          </div>
        </div>
      </section>



      {/* Pricing */}
      <section id="pricing" className="relative overflow-hidden border-t border-border/50 px-6 py-20">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${pricingBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="relative z-10 mx-auto max-w-4xl">
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
                <h3 className="mb-1 text-lg font-semibold text-foreground">Pro</h3>
                <div className="mb-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">$25</span>
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> 50 searches per day</li>
                  <li className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> 100 saved leads</li>
                  <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> AI outreach & audits</li>
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
                <div className="mb-4 text-3xl font-bold text-foreground">$10<span className="text-sm font-normal text-muted-foreground">/15 slots</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> +15 saved-lead slots</li>
                  <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Stacks with each purchase</li>
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Pro members only</li>
                </ul>
                <Link to="/signup" className="mt-6 block">
                  <Button variant="outline" className="w-full">Get Pro to Buy</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-border/50 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-3 text-center text-3xl font-bold text-foreground">Have a question?</h2>
          <p className="mb-10 text-center text-muted-foreground">
            Send us a message and we'll get back to you within 1 business day.
          </p>
          <ContactForm />
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <img src={logo} alt="ClientHunter AI" className="mb-3 h-12 w-auto" />
              <p className="text-sm text-muted-foreground">
                Find website clients in minutes with AI-powered lead generation.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-primary">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/support" className="hover:text-primary">Help Center</Link></li>
                <li><Link to="/affiliate-program" className="hover:text-primary">Affiliate Program</Link></li>
                <li><a href={`mailto:${footerEmail}`} className="hover:text-primary">Email Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="whitespace-pre-line">{footerAddress}</li>
                <li><a href={phoneHref} className="hover:text-primary">{footerPhone}</a></li>
                <li><a href={`mailto:${footerEmail}`} className="hover:text-primary">{footerEmail}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border/50 pt-6 text-center text-sm text-muted-foreground">
            © {currentYear} {footerCompanyName}. All rights reserved.
          </div>
        </div>
      </footer>
      <SocialProofBanner />
    </div>
  );
};

export default Landing;
