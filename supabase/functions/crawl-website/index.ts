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

const MAX_PAGES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "Unauthorized" }, 401);
    const { data: { user } } = await userClient(auth).auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);

    const { chatbot_id, url } = await req.json();
    if (!chatbot_id || !url) return j({ error: "chatbot_id and url required" }, 400);

    const admin = adminClient();
    const { data: bot } = await admin
      .from("chatbots")
      .select("openai_vector_store_id")
      .eq("id", chatbot_id)
      .eq("user_id", user.id)
      .single();
    if (!bot?.openai_vector_store_id)
      return j({ error: "Chatbot not initialized" }, 400);

    const startUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    const origin = startUrl.origin;

    const visited = new Set<string>();
    const queue: string[] = [startUrl.toString()];
    const pages: { url: string; text: string }[] = [];

    while (queue.length && pages.length < MAX_PAGES) {
      const next = queue.shift()!;
      if (visited.has(next)) continue;
      visited.add(next);
      try {
        const r = await fetch(next, {
          headers: { "User-Agent": "ClientHunterAI-Crawler/1.0" },
        });
        if (!r.ok) continue;
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("text/html")) continue;
        const html = await r.text();
        const text = htmlToText(html);
        if (text.length > 200) pages.push({ url: next, text });

        // collect same-origin links
        const links = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi))
          .map((m) => m[1])
          .map((h) => {
            try { return new URL(h, next).toString(); } catch { return null; }
          })
          .filter((u): u is string => !!u && u.startsWith(origin) && !visited.has(u));
        for (const l of links) {
          if (queue.length + pages.length >= MAX_PAGES) break;
          queue.push(l);
        }
      } catch (_) { /* skip */ }
    }

    if (!pages.length) return j({ error: "No pages could be crawled" }, 400);

    // Concatenate into one markdown file
    const combined = pages
      .map((p) => `# ${p.url}\n\n${p.text}\n\n---\n`)
      .join("\n");
    const filename = `crawl-${new URL(startUrl).hostname}-${Date.now()}.md`;
    const storagePath = `${user.id}/${chatbot_id}/${filename}`;

    await admin.storage.from("chatbot-kb").upload(
      storagePath,
      new Blob([combined], { type: "text/markdown" }),
      { upsert: true }
    );

    const { data: src } = await admin
      .from("chatbot_kb_sources")
      .insert({
        chatbot_id,
        user_id: user.id,
        source_type: "url",
        name: filename,
        storage_path: storagePath,
        source_url: startUrl.toString(),
        size_bytes: combined.length,
        status: "uploading",
      })
      .select()
      .single();

    try {
      const key = await getUserOpenAIKey(user.id);
      const bytes = new TextEncoder().encode(combined);
      const uploaded = await openaiUploadFileBytes(key, bytes, filename);
      await openaiAttachFileToVectorStore(key, bot.openai_vector_store_id, uploaded.id);
      await admin
        .from("chatbot_kb_sources")
        .update({ openai_file_id: uploaded.id, status: "ready" })
        .eq("id", src!.id);
    } catch (e: any) {
      await admin
        .from("chatbot_kb_sources")
        .update({ status: "error", error: String(e?.message || e) })
        .eq("id", src!.id);
      throw e;
    }

    return j({ ok: true, pages: pages.length, source_id: src!.id });
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
