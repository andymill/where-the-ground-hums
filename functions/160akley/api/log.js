// /160akley/api/log — shared journal. GET list (newest first) + POST create.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,date,category,title,body,amount,created_by,created_at FROM log ORDER BY created_at DESC, sort ASC"
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const title = (b.title || "").trim();
  if (!title) return json({ error: "title required" }, 400);
  const id = uid("l");
  const now = Date.now();
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  await env.DB.prepare(
    "INSERT INTO log (id,date,category,title,body,amount,created_by,created_at,sort) VALUES (?,?,?,?,?,?,?,?,0)"
  ).bind(id, date, b.category || "log", title, b.body || null, b.amount || null, b.who || "", now).run();
  return json({ id });
}
