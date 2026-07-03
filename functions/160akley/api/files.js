// /160akley/api/files — list metadata (D1) + upload (R2 + D1).
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,name,content_type,size,category,uploaded_by,created_at FROM files ORDER BY created_at DESC"
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "expected multipart form-data" }, 400);
  const file = form.get("file");
  if (!file || typeof file === "string" || !file.name) return json({ error: "file required" }, 400);

  const id = uid("f");
  const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
  const key = id + "/" + safe;
  const buf = await file.arrayBuffer();
  await env.FILES.put(key, buf, { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  await env.DB.prepare(
    "INSERT INTO files (id,name,r2_key,content_type,size,category,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(id, file.name, key, file.type || null, buf.byteLength, form.get("category") || null, form.get("who") || "", Date.now()).run();

  return json({ id, name: file.name, content_type: file.type, size: buf.byteLength });
}
