// /160akley/api/log/:id — delete a journal entry.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM log WHERE id=?").bind(params.id).run();
  return json({ ok: true });
}
