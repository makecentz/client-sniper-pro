export interface Lead {
  id: string;
  user_id?: string;
  business_name: string;
  phone: string;
  address: string;
  website: string | null;
  email: string | null;
  score: "hot" | "needs_upgrade";
  has_website: boolean;
  website_error: boolean;
  no_ssl: boolean;
  not_mobile_friendly: boolean;
  outdated_copyright: boolean;
  website_issues: string[] | null;
  screenshot_url: string | null;
  ai_audit: string | null;
  contacted: boolean;
  notes: string;
  created_at: string;
  // Phase 2 fields
  priority_score: number;
  priority_label: string;
  ai_insight: string | null;
  status: string;
  follow_up_date: string | null;
  competitor_insight: string | null;
  // CRM fields
  category: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  contact_name: string | null;
  last_contacted_at: string | null;
  tags: string[];
  // Contact scraper fields
  contact_scrape_status: string | null;
  contact_scraped_at: string | null;
  scraped_phones: string[];
  scraped_emails: string[];
}

// Search result type (before saving to DB)
export interface SearchResult {
  business_name: string;
  phone: string;
  address: string;
  website: string | null;
  email: string | null;
  score: "hot" | "needs_upgrade";
  has_website: boolean;
  website_error: boolean;
  no_ssl: boolean;
  not_mobile_friendly: boolean;
  outdated_copyright: boolean;
  website_issues: string[];
  priority_score: number;
  priority_label: string;
}
