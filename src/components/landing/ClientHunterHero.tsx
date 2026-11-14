import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Flame, MapPin, Sparkles, Star, Store, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { HERO_SEARCH_KEY, parseHeroSearch } from "@/lib/hero-search";
import marcus from "@/assets/testimonial-marcus.jpg";
import jasmine from "@/assets/testimonial-jasmine.jpg";
import andre from "@/assets/testimonial-andre.jpg";

const leads = [
  { score: 96, name: "Gulf Coast Roofing", details: "4.7★ · 140 reviews · Facebook only", hot: true, value: "$1,800" },
  { score: 94, name: "Bayside Gutters", details: "4.9★ · 211 reviews · no domain", hot: true, value: "$1,500" },
  { score: 81, name: "Apex Remodel Co.", details: "4.6★ · not mobile · loads in 9.2s", hot: false, value: "$2,200" },
  { score: 90, name: "Sunline Roof & Solar", details: "4.5★ · 88 reviews · Linktree only", hot: true, value: "$1,200" },
  { score: 77, name: "Harbor Shingle Pros", details: "4.4★ · Wix template from 2016", hot: false, value: "$1,600" },
];

function Score({ value, delay }: { value: number; delay: number }) {
  const reducedMotion = useReducedMotion();
  const [score, setScore] = useState(reducedMotion ? value : 0);
  useEffect(() => {
    if (reducedMotion) { setScore(value); return; }
    let frame = 0;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 750, 1);
        setScore(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay * 1000);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [value, delay, reducedMotion]);
  return <span aria-label={`Opportunity score ${value}`}>{score}</span>;
}

export function ClientHunterHero() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const reveal = (index: number) => ({
    initial: reducedMotion ? false as const : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay: index * 0.08 },
  });
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const draft = parseHeroSearch(niche || "Roofers", city || "Tampa, FL");
    try { sessionStorage.setItem(HERO_SEARCH_KEY, JSON.stringify(draft)); } catch { /* Continue without storage. */ }
    const query = new URLSearchParams({ niche: draft.industry, city: draft.city, state: draft.state });
    const destination = `/dashboard/search?${query}`;
    navigate(user ? destination : `/signup?redirect=${encodeURIComponent(destination)}`);
  };

  return (
    <section className="client-hunter-hero" aria-labelledby="hero-title">
      <Helmet><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" /></Helmet>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-rings" aria-hidden="true" />
      <div className="hero-layout">
        <div className="hero-copy">
          <motion.div {...reveal(0)} className="hero-opportunity-badge">
            <span className="hero-orange-dot" aria-hidden="true" />
            <span><strong>2,847</strong> businesses near you still have no website</span>
          </motion.div>
          <motion.h1 {...reveal(1)} id="hero-title" className="hero-headline">
            Stop hunting.<br />Start <span>closing</span><br />website clients.
          </motion.h1>
          <motion.p {...reveal(2)} className="hero-subheadline">
            Type a niche and a city. ClientHunter shows you who has <strong>no website or a bad one</strong>, scores every lead, and writes your pitch.
          </motion.p>
          <motion.div {...reveal(3)}>
            <form className="hero-search" onSubmit={submit}>
              <label className="hero-search-field" htmlFor="hero-niche">
                <Store aria-hidden="true" /><span><span className="hero-field-label">Niche</span>
                <input id="hero-niche" name="niche" placeholder="Roofers" maxLength={100} value={niche} onChange={event => setNiche(event.target.value)} /></span>
              </label>
              <label className="hero-search-field hero-city-field" htmlFor="hero-city">
                <MapPin aria-hidden="true" /><span><span className="hero-field-label">City</span>
                <input id="hero-city" name="city" placeholder="Tampa, FL" maxLength={120} value={city} onChange={event => setCity(event.target.value)} /></span>
              </label>
              <Button type="submit" className="hero-search-button">Find clients free <ArrowRight /></Button>
            </form>
            <div className="hero-search-notes">{["No credit card", "Results in ~20s", "AI email, DM & SMS"].map(note => <span key={note}><Check aria-hidden="true" />{note}</span>)}</div>
          </motion.div>
          <motion.div {...reveal(4)} className="hero-social-proof">
            <div className="hero-avatars">{[marcus, jasmine, andre, jasmine].map((avatar, index) => <img key={index} src={avatar} alt="" width={34} height={34} />)}</div>
            <div><div className="hero-stars" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} aria-hidden="true" />)}</div>
              <p>Used by <strong>freelancers & agencies</strong> booking calls the same day</p></div>
          </motion.div>
        </div>
        <motion.div {...reveal(3)} className="hero-product" aria-label="Sample search results and AI pitch">
          <div className="hero-results-panel">
            <header className="hero-panel-header"><h2>Results for <span>Roofers in Tampa, FL</span></h2><span className="hero-live"><i />Live</span></header>
            <div className="hero-panel-meta"><span>52 businesses · sorted by opportunity score</span><strong><Flame />21 hot</strong></div>
            <div className="hero-lead-list">{leads.map((lead, index) => (
              <motion.div key={lead.name} initial={reducedMotion ? false : { opacity: 0, x: 14 }} animate={{ opacity: index === 4 ? 0.4 : 1, x: 0 }} transition={{ duration: 0.45, delay: 0.4 + index * 0.15 }} className="hero-lead-row">
                <div className={`hero-score ${lead.hot ? "is-hot" : "is-upgrade"}`}><Score value={lead.score} delay={0.4 + index * 0.15} /></div>
                <div className="hero-lead-info"><h3>{lead.name}</h3><p>{lead.details}</p></div>
                <span className={`hero-lead-tag ${lead.hot ? "is-hot" : "is-upgrade"}`}>{lead.hot ? <Flame /> : <TriangleAlert />}{lead.hot ? "No website" : "Upgrade"}</span>
                <strong className="hero-lead-value">{lead.value}</strong>
              </motion.div>
            ))}</div>
            <div className="hero-sample-label">Sample preview · estimated project values</div>
          </div>
          <div className="hero-pitch-card">
            <h3><Sparkles />AI pitch · ready to send</h3>
            <p>Hi Mike — 140 customers gave Gulf Coast 4.7 stars, but when people Google “roofer Tampa” you don’t show up with a site. I put together a quick preview…</p>
            <div className="hero-pitch-footer"><span>Email · DM · SMS</span><Button type="button" className="hero-send-button" onClick={() => submit()} aria-label="Start free to send an AI pitch">Send</Button></div>
          </div>
          <div className="hero-closed-card"><span aria-hidden="true">💰</span><div><strong>+$1,800</strong><p>Brian F. closed Gulf Coast Roofing · 2h ago</p></div></div>
        </motion.div>
      </div>
    </section>
  );
}