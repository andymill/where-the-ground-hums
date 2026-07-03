// /160akley/api/trackers — shared house-system readings. GET list + PATCH one.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT key,label,icon,value,unit,pct,detail FROM trackers ORDER BY sort ASC"
  ).all();
  return json(results);
}

export async function onRequestPatch({ request, env }) {
  const b = await request.json().catch(() => ({}));
  if (!b.key) return json({ error: "key required" }, 400);
  const sets = [], vals = [];
  if (typeof b.value === "string") { sets.push("value=?"); vals.push(b.value); }
  if (typeof b.detail === "string") { sets.push("detail=?"); vals.push(b.detail); }
  if (typeof b.pct === "number") { sets.push("pct=?"); vals.push(b.pct); }
  if (!sets.length) return json({ error: "nothing to update" }, 400);
  vals.push(b.key);
  await env.DB.prepare("UPDATE trackers SET " + sets.join(",") + " WHERE key=?").bind(...vals).run();
  return json({ ok: true });
}
