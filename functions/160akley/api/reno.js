// /160akley/api/reno — renovation budget line items (slider-driven). List + create.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,label,category,estimate,emin,emax,estep,actual,enabled,is_toggle,note,created_by,created_at,sort FROM reno_lines ORDER BY sort ASC, created_at ASC"
  ).all();
  return json(results.map((r) => ({ ...r, enabled: !!r.enabled, is_toggle: !!r.is_toggle })));
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const label = (b.label || "").trim();
  if (!label) return json({ error: "label required" }, 400);
  const est = Number(b.estimate) || 0;
  const id = uid("rn");
  const now = Date.now();
  const row = await env.DB.prepare("SELECT COALESCE(MAX(sort),-1)+1 AS s FROM reno_lines").first();
  await env.DB.prepare(
    "INSERT INTO reno_lines (id,label,category,estimate,emin,emax,estep,actual,enabled,is_toggle,note,created_by,created_at,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    id, label, (b.category || "").trim() || null, est,
    Number(b.emin) || 0, Number(b.emax) || Math.max(est * 2, 10000), Number(b.estep) || 100,
    Number(b.actual) || 0, b.enabled === false ? 0 : 1, b.is_toggle ? 1 : 0,
    b.note || null, b.who || "", now, row.s
  ).run();
  return json({ id });
}
