// /160akley/api/invoices/:id — stream the file, edit fields, or delete.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ env, params, request }) {
  const row = await env.DB.prepare("SELECT r2_key,content_type FROM invoices WHERE id=?").bind(params.id).first();
  if (!row) return json({ error: "not found" }, 404);
  const obj = await env.FILES.get(row.r2_key);
  if (!obj) return json({ error: "missing in storage" }, 404);
  const h = new Headers();
  h.set("content-type", row.content_type || "application/octet-stream");
  h.set("cache-control", "private, max-age=3600");
  if (obj.httpEtag) h.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers: h });
}

export async function onRequestPatch({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  const sets = [], vals = [];
  if (typeof b.vendor === "string") { sets.push("vendor=?"); vals.push(b.vendor.trim() || null); }
  if (typeof b.description === "string") { sets.push("description=?"); vals.push(b.description.trim() || null); }
  if (typeof b.amount === "number" || b.amount === null) { sets.push("amount=?"); vals.push(typeof b.amount === "number" && isFinite(b.amount) ? b.amount : null); }
  if (typeof b.invoice_date === "string") { sets.push("invoice_date=?"); vals.push(/^\d{4}-\d{2}-\d{2}$/.test(b.invoice_date) ? b.invoice_date : null); }
  if (typeof b.project === "string") { sets.push("project=?"); vals.push(b.project.trim() || null); }
  if (typeof b.paid_by === "string") { sets.push("paid_by=?"); vals.push(b.paid_by.trim() || null); }
  if (typeof b.note === "string") { sets.push("note=?"); vals.push(b.note.trim() || null); }
  if (!sets.length) return json({ error: "nothing to update" }, 400);
  vals.push(params.id);
  await env.DB.prepare("UPDATE invoices SET " + sets.join(",") + " WHERE id=?").bind(...vals).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const row = await env.DB.prepare("SELECT r2_key FROM invoices WHERE id=?").bind(params.id).first();
  if (row) await env.FILES.delete(row.r2_key).catch(() => {});
  await env.DB.prepare("DELETE FROM invoices WHERE id=?").bind(params.id).run();
  return json({ ok: true });
}
