import {
  adminClient,
  getUserOpenAIKey,
  openaiRemoveFileFromVectorStore,
  userClient,
} from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "Unauthorized" }, 401);
    const { data: { user } } = await userClient(auth).auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);

    const { source_id } = await req.json();
    const admin = adminClient();

    const { data: src } = await admin
      .from("chatbot_kb_sources")
      .select("*, chatbots!inner(openai_vector_store_id, user_id)")
      .eq("id", source_id)
      .eq("user_id", user.id)
      .single();
    if (!src) return j({ error: "Not found" }, 404);

    const vsId = (src as any).chatbots?.openai_vector_store_id;
    if (src.openai_file_id && vsId) {
      try {
        const key = await getUserOpenAIKey(user.id);
        await openaiRemoveFileFromVectorStore(key, vsId, src.openai_file_id);
      } catch (_) { /* swallow remote errors */ }
    }
    if (src.storage_path) {
      await admin.storage.from("chatbot-kb").remove([src.storage_path]);
    }
    await admin.from("chatbot_kb_sources").delete().eq("id", source_id);
    return j({ ok: true });
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
