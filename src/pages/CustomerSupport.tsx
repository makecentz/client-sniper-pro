import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, Clock } from "lucide-react";
import logo from "@/assets/logo.png";
import { Seo } from "@/components/Seo";

const faqs = [
  {
    q: "How quickly will I get a response?",
    a: "We aim to respond to all support requests within 24 business hours. Pro members receive priority support with responses typically within 4 hours.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel anytime from Dashboard → Settings → Billing. Your plan remains active until the end of your current billing period.",
  },
  {
    q: "Can I get a refund?",
    a: "We offer refunds on a case-by-case basis within 7 days of your initial purchase. Contact us with your order details.",
  },
  {
    q: "Why is a lead's information incorrect?",
    a: "Lead data is sourced from public business listings and may occasionally be outdated. You can edit any lead manually inside the dashboard.",
  },
  {
    q: "How do I upgrade my plan?",
    a: "Go to Dashboard → Settings → Billing and click Upgrade. Changes take effect immediately.",
  },
];

const CustomerSupport = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Customer Support | Client Hunter AI"
        description="Contact Client Hunter AI support by email, phone, or mail. Browse FAQs on subscriptions, refunds, lead data, and plan upgrades."
        path="/support"
        jsonLd={faqJsonLd}
      />
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="ClientHunter AI" className="h-16 w-auto" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Customer Support</h1>
        <p className="mb-12 text-muted-foreground">We're here to help. Reach out via any of the channels below.</p>

        <div className="mb-12 grid gap-4 md:grid-cols-2">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground">Email</h3>
              <a href="mailto:ecomexpertsllc@gmail.com" className="text-sm text-primary hover:underline">
                ecomexpertsllc@gmail.com
              </a>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground">Phone</h3>
              <a href="tel:+14453269638" className="text-sm text-primary hover:underline">
                (445) 326-9638
              </a>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground">Mailing Address</h3>
              <p className="text-sm text-muted-foreground">
                5429 Baltimore Ave<br />
                Philadelphia, PA 19143
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground">Support Hours</h3>
              <p className="text-sm text-muted-foreground">
                Mon–Fri, 9:00 AM – 6:00 PM ET<br />
                Response within 24 hours
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="mb-6 text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <Card key={i} className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <h3 className="mb-2 font-semibold text-foreground">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CustomerSupport;
