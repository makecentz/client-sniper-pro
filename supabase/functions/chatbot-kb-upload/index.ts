import {
  adminClient,
  getUserOpenAIKey,
  openaiAttachFileToVectorStore,
  openaiUploadFileBytes,
  userClient,
} from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Body: { chatbot_id, source_id }  — source row must already exist (status pending)
// For files: storage_path set, we download from bucket.
// For url-text: storage_path null, source_url set, we already stored content as a file there too
//   (crawl-website creates a storage object then calls this).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "Unauthorized" }, 401);
    const { data: { user } } = await userClient(auth).auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);

    const { chatbot_id, source_id } = await req.json();
    const admin = adminClient();

    const { data: src, error: srcErr } = await admin
      .from("chatbot_kb_sources")
      .select("*")
      .eq("id", source_id)
      .eq("user_id", user.id)
      .single();
    if (srcErr || !src) return j({ error: "Source not found" }, 404);

    const { data: bot } = await admin
      .from("chatbots")
      .select("openai_vector_store_id")
      .eq("id", chatbot_id)
      .eq("user_id", user.id)
      .single();
    if (!bot?.openai_vector_store_id)
      return j({ error: "Chatbot not initialized with OpenAI" }, 400);

    try {
      const dl = await admin.storage.from("chatbot-kb").download(src.storage_path);
      if (dl.error || !dl.data) throw new Error(dl.error?.message || "Download failed");
      const bytes = new Uint8Array(await dl.data.arrayBuffer());

      const key = await getUserOpenAIKey(user.id);
      const uploaded = await openaiUploadFileBytes(key, bytes, src.name);
      await openaiAttachFileToVectorStore(key, bot.openai_vector_store_id, uploaded.id);

      await admin
        .from("chatbot_kb_sources")
        .update({ openai_file_id: uploaded.id, status: "ready", error: null })
        .eq("id", source_id);

      return j({ ok: true, file_id: uploaded.id });
    } catch (e: any) {
      await admin
        .from("chatbot_kb_sources")
        .update({ status: "error", error: String(e?.message || e) })
        .eq("id", source_id);
      throw e;
    }
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
