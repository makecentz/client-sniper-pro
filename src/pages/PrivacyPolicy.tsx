import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { Seo } from "@/components/Seo";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Privacy Policy | Client Hunter AI"
        description="Learn how Client Hunter AI collects, uses, and protects your data, including cookies, third-party processors, and your privacy rights."
        path="/privacy"
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
        <h1 className="mb-2 text-4xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-12 text-sm text-muted-foreground">Last updated: January 1, 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">1. Introduction</h2>
            <p>EcomExperts LLC ("we", "us") operates ClientHunter AI. This Privacy Policy explains how we collect, use, and protect your information when you use our Service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">2. Information We Collect</h2>
            <p className="mb-2"><strong className="text-foreground">Account Information:</strong> name, email address, password (hashed), and billing information.</p>
            <p className="mb-2"><strong className="text-foreground">Usage Data:</strong> searches performed, leads saved, messages generated, IP address, device information, and browser type.</p>
            <p><strong className="text-foreground">Business Data:</strong> publicly available information about businesses you research (name, address, phone, website, etc.).</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <p>We use your information to: (a) provide and maintain the Service; (b) process payments and manage subscriptions; (c) send transactional emails (account, billing, security); (d) improve our features and user experience; (e) detect and prevent fraud or abuse; (f) comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">4. Data Sharing</h2>
            <p>We do not sell your personal information. We share data only with:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Service providers (hosting, payment processing, email delivery, AI model providers)</li>
              <li>Legal authorities when required by law</li>
              <li>Successors in the event of a merger or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">5. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies for authentication, preferences, and basic analytics. You can disable cookies in your browser, but some features may not work properly.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">6. Data Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (HTTPS), encryption at rest, and Row-Level Security on our database. No system is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">7. Data Retention</h2>
            <p>We retain your information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting support.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to: access, correct, or delete your personal data; restrict or object to processing; receive a copy of your data; lodge a complaint with a data protection authority.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">9. Children's Privacy</h2>
            <p>The Service is not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">10. International Users</h2>
            <p>Our servers are located in the United States. By using the Service, you consent to the transfer of your data to the U.S.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notice.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">12. Contact</h2>
            <p>
              EcomExperts LLC<br />
              5429 Baltimore Ave, Philadelphia, PA 19143<br />
              Email: <a href="mailto:clienthunterainow@gmail.com" className="text-primary no-underline hover:no-underline">clienthunterainow@gmail.com</a><br />
              Phone: <a href="tel:+14453269638" className="text-primary hover:underline">(445) 326-9638</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
