// /160akley/api/resources — list (grouped) + create.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,category,cat_subt,name,phones,email,web,address,note,flag,favorite FROM resources ORDER BY category ASC, sort ASC, name ASC"
  ).all();
  // group by category, preserving first-seen order
  const order = [], byCat = {};
  for (const r of results) {
    if (!byCat[r.category]) { byCat[r.category] = { cat: r.category, subt: r.cat_subt || null, items: [] }; order.push(r.category); }
    let phones = [];
    try { phones = JSON.parse(r.phones || "[]"); } catch (e) {}
    byCat[r.category].items.push({ id: r.id, n: r.name, p: phones, e: r.email || undefined, w: r.web || undefined, a: r.address || undefined, note: r.note || undefined, flag: r.flag || undefined, fav: !!r.favorite });
  }
  return json(order.map((c) => byCat[c]));
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const name = (b.name || "").trim(), category = (b.category || "").trim();
  if (!name || !category) return json({ error: "name and category required" }, 400);
  const phones = Array.isArray(b.phones) ? b.phones : (b.phone ? [String(b.phone).trim()] : []);
  const id = uid("r");
  // sort after existing rows in the category
  const row = await env.DB.prepare("SELECT COALESCE(MAX(sort),-1)+1 AS s FROM resources WHERE category=?").bind(category).first();
  await env.DB.prepare(
    "INSERT INTO resources (id,category,cat_subt,name,phones,email,web,address,note,flag,created_by,created_at,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(id, category, b.subt || null, name, JSON.stringify(phones), b.email || null, b.web || null, b.address || null, b.note || null, null, b.who || "", Date.now(), row.s).run();
  return json({ id });
}
