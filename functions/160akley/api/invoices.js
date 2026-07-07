// /160akley/api/invoices — list + upload (with Workers AI receipt extraction).
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const COLS = "id,r2_key,thumb,content_type,size,vendor,description,amount,invoice_date,project,paid_by,note,uploaded_by,created_at";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT " + COLS + " FROM invoices ORDER BY (invoice_date IS NULL), invoice_date DESC, created_at DESC"
  ).all();
  return json(results);
}

// Decode a data: URI (image JPEG/PNG) into a byte array for Workers AI.
function dataUriToBytes(uri) {
  const i = (uri || "").indexOf(",");
  if (i < 0) return null;
  const b64 = uri.slice(i + 1);
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
  return arr;
}

// Read a receipt image with a vision model → {vendor, amount, date, description}.
async function extractReceipt(env, bytes) {
  if (!env.AI || !bytes) return {};
  const prompt =
    "You are reading a purchase receipt or invoice. Extract these fields and reply " +
    "with ONLY one compact JSON object, no other text: " +
    '{"vendor": string, "amount": number (the grand total actually paid, no currency symbol), ' +
    '"date": "YYYY-MM-DD" (the purchase date, else ""), "description": short summary of what was purchased}. ' +
    "If a field is unreadable, use \"\" or 0.";
  try {
    const r = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
      prompt, image: [...bytes], max_tokens: 512,
    });
    const text = (r && (r.response || r.description || r.result)) || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return {};
    const o = JSON.parse(m[0]);
    let amount = o.amount;
    if (typeof amount !== "number" || !isFinite(amount)) {
      amount = parseFloat(String(amount == null ? "" : amount).replace(/[^0-9.]/g, ""));
    }
    return {
      vendor: typeof o.vendor === "string" ? o.vendor.slice(0, 120) : "",
      amount: isFinite(amount) ? amount : null,
      invoice_date: /^\d{4}-\d{2}-\d{2}$/.test(o.date || "") ? o.date : "",
      description: typeof o.description === "string" ? o.description.slice(0, 240) : "",
    };
  } catch (e) {
    return {};
  }
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "expected multipart form-data" }, 400);
  const file = form.get("file");
  if (!file || typeof file === "string" || !file.name) return json({ error: "file required" }, 400);

  const MAX_BYTES = 25 * 1024 * 1024;
  if (typeof file.size === "number" && file.size > MAX_BYTES) return json({ error: "file too large (max 25 MB)" }, 413);

  const id = uid("iv");
  const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
  const key = id + "/" + safe;
  const buf = await file.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ error: "file too large (max 25 MB)" }, 413);
  await env.FILES.put(key, buf, { httpMetadata: { contentType: file.type || "application/octet-stream" } });

  // Extract from the client-supplied mid-res image (works for photos and PDF page-1).
  const ex = await extractReceipt(env, dataUriToBytes(form.get("aiimg")));

  const now = Date.now();
  const who = form.get("who") || "";
  try {
    await env.DB.prepare(
      "INSERT INTO invoices (id,r2_key,thumb,content_type,size,vendor,description,amount,invoice_date,project,paid_by,note,uploaded_by,created_at) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id, key, form.get("thumb") || null, file.type || null, buf.byteLength,
      ex.vendor || null, ex.description || null, ex.amount ?? null, ex.invoice_date || null,
      null, who || null, null, who, now
    ).run();
  } catch (e) {
    await env.FILES.delete(key).catch(() => {});
    return json({ error: "could not save invoice" }, 500);
  }

  return json({
    id, r2_key: key, thumb: form.get("thumb") || null, content_type: file.type || null, size: buf.byteLength,
    vendor: ex.vendor || null, description: ex.description || null, amount: ex.amount ?? null,
    invoice_date: ex.invoice_date || null, project: null, paid_by: who || null, note: null,
    uploaded_by: who, created_at: now, extracted: !!(ex.vendor || ex.amount || ex.invoice_date),
  });
}
