import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function clientFor(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_saved_leads",
  title: "List saved leads",
  description:
    "List the signed-in user's saved leads from ClientHunter AI. Supports optional status filter and limit.",
  inputSchema: {
    status: z
      .enum(["new", "contacted", "followed_up", "closed", "lost"])
      .nullable()
      .describe("Filter by lead status. Null returns all statuses."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .nullable()
      .describe("Maximum number of leads to return (1-100). Defaults to 25."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = clientFor(ctx);
    let q = supabase
      .from("leads")
      .select(
        "id,business_name,category,city,state,phone,email,website,rating,review_count,priority_label,priority_score,status,has_website,created_at",
      )
      .eq("user_id", ctx.getUserId())
      .order("priority_score", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { leads: data ?? [], count: data?.length ?? 0 },
    };
  },
});
