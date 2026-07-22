// /160akley/api/floorplan/:id — move/resize, rename, recolor, or delete an annotation.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const frac = (v) => Math.max(0, Math.min(1, Number(v) || 0));

export async function onRequestPatch({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  const sets = [], vals = [];
  ["x", "y", "w", "h"].forEach((k) => { if (typeof b[k] === "number") { sets.push(k + "=?"); vals.push(frac(b[k])); } });
  if (typeof b.label === "string") { sets.push("label=?"); vals.push(b.label.trim().slice(0, 80) || null); }
  if (typeof b.color === "string") { sets.push("color=?"); vals.push(b.color || null); }
  if (!sets.length) return json({ error: "nothing to update" }, 400);
  vals.push(params.id);
  await env.DB.prepare("UPDATE floorplan_annotations SET " + sets.join(",") + " WHERE id=?").bind(...vals).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM floorplan_annotations WHERE id=?").bind(params.id).run();
  return json({ ok: true });
}
