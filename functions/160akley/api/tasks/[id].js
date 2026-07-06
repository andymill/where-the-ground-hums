// /160akley/api/tasks/:id — update (toggle/edit) + delete.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPatch({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  const sets = [], vals = [];
  if (typeof b.done === "boolean") { sets.push("done=?"); vals.push(b.done ? 1 : 0); }
  if (typeof b.text === "string") { sets.push("text=?"); vals.push(b.text); }
  if (typeof b.area === "string") { sets.push("area=?"); vals.push(b.area); }
  if (typeof b.due === "string") { sets.push("due=?"); vals.push(b.due); }
  if (b.grp === "week" || b.grp === "soon") { sets.push("grp=?"); vals.push(b.grp); }
  if (b.assignee === "Andy" || b.assignee === "Zoe" || b.assignee === "") { sets.push("assignee=?"); vals.push(b.assignee); }
  if (!sets.length) return json({ error: "nothing to update" }, 400);
  vals.push(params.id);
  await env.DB.prepare("UPDATE tasks SET " + sets.join(",") + " WHERE id=?").bind(...vals).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM tasks WHERE id=?").bind(params.id).run();
  return json({ ok: true });
}
