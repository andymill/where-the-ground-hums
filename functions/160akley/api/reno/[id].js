// /160akley/api/reno/:id — update (slider value, actual, toggle, label) + delete.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPatch({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  const sets = [], vals = [];
  if (typeof b.estimate === "number") { sets.push("estimate=?"); vals.push(b.estimate); }
  if (typeof b.actual === "number") { sets.push("actual=?"); vals.push(b.actual); }
  if (typeof b.enabled === "boolean") { sets.push("enabled=?"); vals.push(b.enabled ? 1 : 0); }
  if (typeof b.label === "string" && b.label.trim()) { sets.push("label=?"); vals.push(b.label.trim()); }
  if (typeof b.category === "string") { sets.push("category=?"); vals.push(b.category.trim() || null); }
  if (typeof b.note === "string") { sets.push("note=?"); vals.push(b.note.trim() || null); }
  if (!sets.length) return json({ error: "nothing to update" }, 400);
  vals.push(params.id);
  await env.DB.prepare("UPDATE reno_lines SET " + sets.join(",") + " WHERE id=?").bind(...vals).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM reno_lines WHERE id=?").bind(params.id).run();
  return json({ ok: true });
}
