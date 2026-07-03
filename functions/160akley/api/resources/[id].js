// /160akley/api/resources/:id — delete (+ optional edit).
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM resources WHERE id=?").bind(params.id).run();
  return json({ ok: true });
}

export async function onRequestPatch({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  const sets = [], vals = [];
  if (typeof b.name === "string") { sets.push("name=?"); vals.push(b.name); }
  if (typeof b.category === "string") { sets.push("category=?"); vals.push(b.category); }
  if (Array.isArray(b.phones)) { sets.push("phones=?"); vals.push(JSON.stringify(b.phones)); }
  if (typeof b.email === "string") { sets.push("email=?"); vals.push(b.email); }
  if (typeof b.web === "string") { sets.push("web=?"); vals.push(b.web); }
  if (typeof b.address === "string") { sets.push("address=?"); vals.push(b.address); }
  if (typeof b.note === "string") { sets.push("note=?"); vals.push(b.note); }
  if (!sets.length) return json({ error: "nothing to update" }, 400);
  vals.push(params.id);
  await env.DB.prepare("UPDATE resources SET " + sets.join(",") + " WHERE id=?").bind(...vals).run();
  return json({ ok: true });
}
