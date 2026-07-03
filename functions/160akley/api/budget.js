// /160akley/api/budget — the shared monthly household budget.
// GET returns { lines, meta }. PATCH updates a line amount or a meta value.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ env }) {
  const lines = (await env.DB.prepare("SELECT id,label,grp,amount,note FROM budget_lines ORDER BY sort ASC").all()).results;
  const metaRows = (await env.DB.prepare("SELECT key,num,txt FROM budget_meta").all()).results;
  const meta = {};
  for (const m of metaRows) meta[m.key] = { num: m.num, txt: m.txt };
  return json({ lines, meta });
}

export async function onRequestPatch({ request, env }) {
  const b = await request.json().catch(() => ({}));
  if (b.id != null && typeof b.amount === "number") {
    await env.DB.prepare("UPDATE budget_lines SET amount=? WHERE id=?").bind(b.amount, b.id).run();
    return json({ ok: true });
  }
  if (b.key && typeof b.num === "number") {
    await env.DB.prepare("UPDATE budget_meta SET num=? WHERE key=?").bind(b.num, b.key).run();
    return json({ ok: true });
  }
  return json({ error: "send {id, amount} or {key, num}" }, 400);
}
