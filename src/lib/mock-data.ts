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
}
