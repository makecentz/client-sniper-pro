export interface Lead {
  id: string;
  business_name: string;
  phone: string;
  address: string;
  website: string | null;
  score: "hot" | "warm";
  screenshot_url: string | null;
  ai_audit: string | null;
  contacted: boolean;
  notes: string;
  created_at: string;
}

export const mockLeads: Lead[] = [
  {
    id: "1",
    business_name: "Joe's Auto Repair",
    phone: "(555) 123-4567",
    address: "123 Main St, Austin, TX",
    website: null,
    score: "hot",
    screenshot_url: null,
    ai_audit: null,
    contacted: false,
    notes: "",
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "2",
    business_name: "Sunrise Dental Clinic",
    phone: "(555) 234-5678",
    address: "456 Oak Ave, Austin, TX",
    website: "http://sunrisedental-old.com",
    score: "warm",
    screenshot_url: null,
    ai_audit: "Outdated design, no mobile optimization, no online booking",
    contacted: true,
    notes: "Sent initial email on 4/2",
    created_at: "2026-04-01T10:05:00Z",
  },
  {
    id: "3",
    business_name: "Mike's Plumbing",
    phone: "(555) 345-6789",
    address: "789 Elm Blvd, Austin, TX",
    website: null,
    score: "hot",
    screenshot_url: null,
    ai_audit: null,
    contacted: false,
    notes: "",
    created_at: "2026-04-02T09:00:00Z",
  },
  {
    id: "4",
    business_name: "Bella's Hair Salon",
    phone: "(555) 456-7890",
    address: "321 Pine St, Austin, TX",
    website: "http://bellashair.com",
    score: "warm",
    screenshot_url: null,
    ai_audit: "No clear CTA, missing contact form, slow load times",
    contacted: false,
    notes: "",
    created_at: "2026-04-02T09:15:00Z",
  },
  {
    id: "5",
    business_name: "Downtown Tacos",
    phone: "(555) 567-8901",
    address: "654 Cedar Rd, Austin, TX",
    website: null,
    score: "hot",
    screenshot_url: null,
    ai_audit: null,
    contacted: false,
    notes: "",
    created_at: "2026-04-03T14:00:00Z",
  },
];
