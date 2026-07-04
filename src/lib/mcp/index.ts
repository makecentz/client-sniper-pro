import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listSavedLeadsTool from "./tools/list-saved-leads";
import getLeadTool from "./tools/get-lead";
import updateLeadStatusTool from "./tools/update-lead-status";

// Build the OAuth issuer from the project ref so it matches the direct
// supabase.co host the discovery document publishes (RFC 8414 §3.3).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "clienthunter-mcp",
  title: "ClientHunter AI",
  version: "0.1.0",
  instructions:
    "Tools for ClientHunter AI. Use `list_saved_leads` to browse the signed-in user's saved leads, `get_lead` for full details, and `update_lead_status` to move a lead through the pipeline. Use `echo` to verify connectivity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listSavedLeadsTool, getLeadTool, updateLeadStatusTool],
});
