// /160akley/api/tasks — list + create. Shared across Andy & Zoe via D1.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,text,area,due,grp,done,created_by,created_at FROM tasks ORDER BY done ASC, sort ASC, created_at ASC"
  ).all();
  return json(results.map((r) => ({ ...r, done: !!r.done })));
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const text = (b.text || "").trim();
  if (!text) return json({ error: "text required" }, 400);
  const id = uid("t");
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO tasks (id,text,area,due,grp,done,created_by,created_at,sort) VALUES (?,?,?,?,?,0,?,?,?)"
  ).bind(id, text, b.area || "", b.due || "", b.grp === "soon" ? "soon" : "week", b.who || "", now, now).run();
  return json({ id });
}
