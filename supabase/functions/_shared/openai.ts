import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getApiKey } from "./api-keys.ts";

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export function userClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

// The OpenAI key is now managed centrally by admins (Admin dashboard → API Keys).
// The userId argument is kept for call-site compatibility.
export async function getUserOpenAIKey(_userId?: string): Promise<string> {
  const key = await getApiKey("OPENAI_API_KEY");
  if (!key) throw new Error("No OpenAI key configured. An admin must add one in the Admin dashboard.");
  return key;
}

// OpenAI uses v2 Assistants API header.
const OA_HEADERS = (key: string, extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  "OpenAI-Beta": "assistants=v2",
  ...extra,
});

export async function openaiCreateVectorStore(key: string, name: string) {
  const r = await fetch("https://api.openai.com/v1/vector_stores", {
    method: "POST",
    headers: OA_HEADERS(key),
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error(`vector_store create failed: ${await r.text()}`);
  return await r.json();
}

export async function openaiCreateAssistant(
  key: string,
  name: string,
  instructions: string,
  vectorStoreId: string
) {
  const r = await fetch("https://api.openai.com/v1/assistants", {
    method: "POST",
    headers: OA_HEADERS(key),
    body: JSON.stringify({
      name,
      instructions,
      model: "gpt-4o-mini",
      tools: [{ type: "file_search" }],
      tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
    }),
  });
  if (!r.ok) throw new Error(`assistant create failed: ${await r.text()}`);
  return await r.json();
}

export async function openaiUpdateAssistant(
  key: string,
  assistantId: string,
  patch: Record<string, unknown>
) {
  const r = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
    method: "POST",
    headers: OA_HEADERS(key),
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`assistant update failed: ${await r.text()}`);
  return await r.json();
}

export async function openaiUploadFileBytes(
  key: string,
  bytes: Uint8Array,
  filename: string
) {
  const fd = new FormData();
  fd.append("purpose", "assistants");
  fd.append("file", new Blob([bytes]), filename);
  const r = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!r.ok) throw new Error(`file upload failed: ${await r.text()}`);
  return await r.json();
}

export async function openaiAttachFileToVectorStore(
  key: string,
  vectorStoreId: string,
  fileId: string
) {
  const r = await fetch(
    `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
    {
      method: "POST",
      headers: OA_HEADERS(key),
      body: JSON.stringify({ file_id: fileId }),
    }
  );
  if (!r.ok) throw new Error(`vs file attach failed: ${await r.text()}`);
  return await r.json();
}

export async function openaiRemoveFileFromVectorStore(
  key: string,
  vectorStoreId: string,
  fileId: string
) {
  await fetch(
    `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${fileId}`,
    { method: "DELETE", headers: OA_HEADERS(key) }
  );
  await fetch(`https://api.openai.com/v1/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });
}
