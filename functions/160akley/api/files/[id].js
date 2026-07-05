// /160akley/api/files/:id — stream the file (view/download) + delete.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ env, params }) {
  const row = await env.DB.prepare("SELECT r2_key,name,content_type FROM files WHERE id=?").bind(params.id).first();
  if (!row) return json({ error: "not found" }, 404);
  const obj = await env.FILES.get(row.r2_key);
  if (!obj) return json({ error: "missing in storage" }, 404);
  const headers = new Headers();
  headers.set("content-type", row.content_type || "application/octet-stream");
  headers.set("content-disposition", 'inline; filename="' + (row.name || "file").replace(/"/g, "") + '"');
  headers.set("cache-control", "private, max-age=3600");
  if (obj.httpEtag) headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
}

export async function onRequestPatch({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  const sets = [], vals = [];
  if (typeof b.name === "string" && b.name.trim()) { sets.push("name=?"); vals.push(b.name.trim().slice(0, 200)); }
  if (typeof b.summary === "string") { sets.push("summary=?"); vals.push(b.summary.trim() || null); }
  if (typeof b.category === "string") { sets.push("category=?"); vals.push(b.category.trim() || null); }
  if (typeof b.thumb === "string") { sets.push("thumb=?"); vals.push(b.thumb || null); }
  if (!sets.length) return json({ error: "nothing to update" }, 400);
  vals.push(params.id);
  await env.DB.prepare("UPDATE files SET " + sets.join(",") + " WHERE id=?").bind(...vals).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const row = await env.DB.prepare("SELECT r2_key FROM files WHERE id=?").bind(params.id).first();
  if (row) await env.FILES.delete(row.r2_key);
  await env.DB.prepare("DELETE FROM files WHERE id=?").bind(params.id).run();
  return json({ ok: true });
}
