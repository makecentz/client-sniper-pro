import {
  adminClient,
  getUserOpenAIKey,
  openaiCreateAssistant,
  openaiCreateVectorStore,
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

    const body = await req.json();
    const { chatbot_id } = body;
    if (!chatbot_id) return j({ error: "chatbot_id required" }, 400);

    const admin = adminClient();
    const { data: bot, error } = await admin
      .from("chatbots")
      .select("*")
      .eq("id", chatbot_id)
      .eq("user_id", user.id)
      .single();
    if (error || !bot) return j({ error: "Bot not found" }, 404);
    if (bot.openai_assistant_id) return j({ ok: true, bot });

    const key = await getUserOpenAIKey(user.id);
    const vs = await openaiCreateVectorStore(key, `${bot.name} KB`);
    const instructions = buildInstructions(bot);
    const assistant = await openaiCreateAssistant(key, bot.name, instructions, vs.id);

    const { data: updated } = await admin
      .from("chatbots")
      .update({
        openai_vector_store_id: vs.id,
        openai_assistant_id: assistant.id,
      })
      .eq("id", chatbot_id)
      .select()
      .single();

    return j({ ok: true, bot: updated });
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function buildInstructions(bot: any) {
  return `${bot.system_prompt}

Business name: ${bot.client_name || bot.name}
If the answer is not in your knowledge base, respond: "${bot.fallback_message}"`;
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
