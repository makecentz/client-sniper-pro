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
  name: "update_lead_status",
  title: "Update lead status",
  description: "Update the pipeline status of one of the signed-in user's saved leads.",
  inputSchema: {
    lead_id: z.string().uuid().describe("The lead's UUID."),
    status: z
      .enum(["new", "contacted", "followed_up", "closed", "lost"])
      .describe("New status value."),
    notes: z.string().nullable().describe("Optional notes to attach to the lead."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  handler: async ({ lead_id, status, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const patch: Record<string, unknown> = { status };
    if (notes != null) patch.notes = notes;
    const { data, error } = await clientFor(ctx)
      .from("leads")
      .update(patch)
      .eq("id", lead_id)
      .eq("user_id", ctx.getUserId())
      .select("id,business_name,status,notes")
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Lead not found" }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Updated lead ${data.business_name} → ${data.status}` }],
      structuredContent: { lead: data },
    };
  },
});
