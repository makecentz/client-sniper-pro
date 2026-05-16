import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { Seo } from "@/components/Seo";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Terms of Service | Client Hunter AI"
        description="Read the Client Hunter AI terms of service covering account use, subscriptions, refunds, and acceptable use of our lead generation platform."
        path="/terms"
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
        <h1 className="mb-2 text-4xl font-bold text-foreground">Terms of Service</h1>
        <p className="mb-12 text-sm text-muted-foreground">Last updated: January 1, 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using ClientHunter AI ("the Service"), operated by EcomExperts LLC ("we", "us", "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">2. Description of Service</h2>
            <p>ClientHunter AI is a software-as-a-service platform that helps users discover local businesses, analyze websites, generate AI-powered outreach messages, and manage sales leads. Features and functionality may change at our discretion.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">3. User Accounts</h2>
            <p>You must provide accurate information when creating an account and are responsible for maintaining the security of your credentials. You are responsible for all activity that occurs under your account. Notify us immediately of any unauthorized use.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">4. Acceptable Use</h2>
            <p>You agree not to use the Service to: (a) violate any laws or regulations including anti-spam laws (CAN-SPAM, GDPR, CASL); (b) send unsolicited bulk messages; (c) harvest data for unlawful purposes; (d) interfere with or disrupt the Service; (e) attempt to gain unauthorized access to other accounts or systems.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">5. Subscriptions and Payments</h2>
            <p>Paid plans are billed in advance on a recurring basis. You may cancel at any time, and cancellation will take effect at the end of the current billing period. Refunds are issued at our sole discretion. Prices may change with 30 days' notice.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">6. Intellectual Property</h2>
            <p>All content, software, and trademarks associated with the Service are the property of EcomExperts LLC or its licensors. You retain ownership of data you submit but grant us a license to use it to provide the Service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">7. Third-Party Services</h2>
            <p>The Service integrates with third-party APIs (including data providers, AI models, and payment processors). We are not responsible for the availability, accuracy, or content of third-party services.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">8. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or that lead data will be accurate or current.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, EcomExperts LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">10. Termination</h2>
            <p>We may suspend or terminate your account at any time for violation of these terms. You may terminate your account at any time by contacting support.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the Commonwealth of Pennsylvania, USA, without regard to conflict-of-law principles. Disputes shall be resolved in the courts of Philadelphia County, Pennsylvania.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">12. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">13. Contact</h2>
            <p>
              EcomExperts LLC<br />
              5429 Baltimore Ave, Philadelphia, PA 19143<br />
              Email: <a href="mailto:ecomexpertsllc@gmail.com" className="text-primary hover:underline">ecomexpertsllc@gmail.com</a><br />
              Phone: <a href="tel:+12676521512" className="text-primary hover:underline">(267) 652-1512</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
