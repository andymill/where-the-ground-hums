// /160akley/api/floorplan-scale — per-floor scale (real feet per image pixel).
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT floor,feet_per_px FROM floorplan_scale").all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const floor = parseInt(b.floor, 10);
  const fpp = Number(b.feetPerPx);
  if (!(floor >= 1) || !(fpp > 0)) return json({ error: "floor and positive feetPerPx required" }, 400);
  await env.DB.prepare(
    "INSERT INTO floorplan_scale (floor,feet_per_px,updated_at) VALUES (?,?,?) ON CONFLICT(floor) DO UPDATE SET feet_per_px=excluded.feet_per_px, updated_at=excluded.updated_at"
  ).bind(floor, fpp, Date.now()).run();
  return json({ ok: true });
}
