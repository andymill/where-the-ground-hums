// /160akley/api/conditions — one edge-cached call that fans out to free,
// keyless sources for a "conditions" strip on the hub Home:
//   weather + sunrise/sunset  → Open-Meteo
//   aurora (planetary Kp)     → NOAA SWPC
//   stream gauge              → USGS (Broad Brook is ungauged; nearest small-
//                               stream analog is Green River nr Colrain MA)
// Each source is independent — one failing just nulls its slice. Upstreams are
// edge-cached ~20 min so "every load" never hammers them. Moon phase is
// computed client-side (deterministic from the date).
const LAT = 42.834, LNG = -72.644;
const STREAM_SITE = "01170100"; // GREEN RIVER NEAR COLRAIN, MA

const json = (d) => new Response(JSON.stringify(d), {
  headers: { "content-type": "application/json", "cache-control": "public, max-age=600" },
});
async function getJSON(url) {
  const r = await fetch(url, { cf: { cacheTtl: 1200, cacheEverything: true } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export async function onRequestGet() {
  const out = { weather: null, sun: null, aurora: null, stream: null };

  try {
    const w = await getJSON(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
      `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day` +
      `&daily=sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph` +
      `&timezone=America/New_York&forecast_days=1`
    );
    out.weather = {
      temp: Math.round(w.current.temperature_2m),
      code: w.current.weather_code,
      wind: Math.round(w.current.wind_speed_10m),
      humidity: w.current.relative_humidity_2m,
      is_day: w.current.is_day,
    };
    out.sun = { sunrise: w.daily.sunrise[0], sunset: w.daily.sunset[0] };
  } catch (e) { /* leave null */ }

  try {
    const a = await getJSON("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json");
    const last = a[a.length - 1];
    const kp = Array.isArray(last) ? parseFloat(last[1]) : parseFloat(last.Kp);
    if (!isNaN(kp)) out.aurora = { kp };
  } catch (e) { /* leave null */ }

  try {
    const s = await getJSON(
      `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${STREAM_SITE}&parameterCd=00060,00065`
    );
    const ts = s.value.timeSeries || [];
    const g = {};
    ts.forEach((t) => { g[t.variable.variableCode[0].value] = parseFloat(t.values[0].value[0].value); });
    out.stream = {
      name: (ts[0] && ts[0].sourceInfo.siteName) || "Green River",
      height: isNaN(g["00065"]) ? null : g["00065"],
      flow: isNaN(g["00060"]) ? null : g["00060"],
      site: STREAM_SITE,
    };
  } catch (e) { /* leave null */ }

  return json(out);
}
