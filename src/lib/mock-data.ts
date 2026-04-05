export interface Lead {
  id: string;
  user_id?: string;
  business_name: string;
  phone: string;
  address: string;
  website: string | null;
  score: "hot" | "needs_upgrade";
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
  score: "hot" | "needs_upgrade";
}
