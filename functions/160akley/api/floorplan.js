// /160akley/api/floorplan — furniture annotations on the floor plan (D1).
// list all + create. Coordinates are fractions (0..1) of the plan image so
// they're resolution-independent. `floor` is the page index (1..4).
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const frac = (v) => Math.max(0, Math.min(1, Number(v) || 0));

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,floor,x,y,w,h,label,color,created_by,created_at FROM floorplan_annotations ORDER BY created_at ASC"
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const floor = parseInt(b.floor, 10);
  if (!(floor >= 1)) return json({ error: "floor required" }, 400);
  const id = uid("fp");
  await env.DB.prepare(
    "INSERT INTO floorplan_annotations (id,floor,x,y,w,h,label,color,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).bind(id, floor, frac(b.x), frac(b.y), frac(b.w), frac(b.h), (b.label || "").slice(0, 80) || null, b.color || null, b.who || "", Date.now()).run();
  return json({ id });
}
