import { adminClient, getUserOpenAIKey } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

const OA = (key: string) => ({
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  "OpenAI-Beta": "assistants=v2",
});

// Public widget endpoint. Body: { bot_id, message, thread_id? }
// Returns: { thread_id, reply }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { bot_id, message, thread_id } = await req.json();
    if (!bot_id || !message) return j({ error: "bot_id and message required" }, 400);

    const admin = adminClient();
    const { data: bot } = await admin
      .from("chatbots")
      .select("user_id, openai_assistant_id, is_active, fallback_message, welcome_message")
      .eq("id", bot_id)
      .single();
    if (!bot || !bot.is_active) return j({ error: "Chatbot not available" }, 404);
    if (!bot.openai_assistant_id) return j({ error: "Not initialized" }, 400);

    const key = await getUserOpenAIKey(bot.user_id);

    // Create thread if not provided
    let tId = thread_id;
    let isNewConversation = false;
    if (!tId) {
      const r = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: OA(key),
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(`thread create: ${await r.text()}`);
      tId = (await r.json()).id;
      isNewConversation = true;
    }

    // Add message
    const msgR = await fetch(`https://api.openai.com/v1/threads/${tId}/messages`, {
      method: "POST",
      headers: OA(key),
      body: JSON.stringify({ role: "user", content: message.slice(0, 4000) }),
    });
    if (!msgR.ok) throw new Error(`msg add: ${await msgR.text()}`);

    // Run and poll
    const runR = await fetch(`https://api.openai.com/v1/threads/${tId}/runs`, {
      method: "POST",
      headers: OA(key),
      body: JSON.stringify({ assistant_id: bot.openai_assistant_id }),
    });
    if (!runR.ok) throw new Error(`run create: ${await runR.text()}`);
    const run = await runR.json();

    // Poll until done
    let status = run.status;
    let runId = run.id;
    const start = Date.now();
    while (["queued", "in_progress", "cancelling"].includes(status)) {
      if (Date.now() - start > 50_000) throw new Error("Run timed out");
      await new Promise((r) => setTimeout(r, 800));
      const p = await fetch(
        `https://api.openai.com/v1/threads/${tId}/runs/${runId}`,
        { headers: OA(key) }
      );
      const pj = await p.json();
      status = pj.status;
    }

    if (status !== "completed") {
      return j({ thread_id: tId, reply: bot.fallback_message || "Sorry, something went wrong." });
    }

    // Get latest assistant message
    const listR = await fetch(
      `https://api.openai.com/v1/threads/${tId}/messages?order=desc&limit=1`,
      { headers: OA(key) }
    );
    const list = await listR.json();
    const last = list.data?.[0];
    let reply = "";
    if (last?.content) {
      for (const c of last.content) {
        if (c.type === "text") reply += c.text.value;
      }
    }
    reply = reply.replace(/【[^】]+】/g, "").trim() || bot.fallback_message;

    // Update counters
    await admin
      .from("chatbots")
      .update({
        message_count: (await getCount(admin, bot_id, "message_count")) + 1,
        conversation_count:
          (await getCount(admin, bot_id, "conversation_count")) + (isNewConversation ? 1 : 0),
      })
      .eq("id", bot_id);

    return j({ thread_id: tId, reply });
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

async function getCount(admin: any, id: string, col: string) {
  const { data } = await admin.from("chatbots").select(col).eq("id", id).single();
  return (data?.[col] as number) || 0;
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
