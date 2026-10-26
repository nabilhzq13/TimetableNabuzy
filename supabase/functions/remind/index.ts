// remind: sends Break's reminders. pg_cron calls it every minute (see
// ../../reminders.sql). It reads each phone that has reminders on, that
// account's synced timetable, ticks and choices, and JAKIM's times for the zone
// in solatSet, then sends whatever has come due, each reminder once.
// Break calls it too, with {test: true} and the user's own sign-in, to send a
// test to that one phone.
import { b64u, dateKey, due, encrypt, keysMatch, minuteOf, parseTakwim, prefsOf, PUSH_HOST, timesFor, unb64u, vapidJwt, vapidKey } from "./lib.ts";
import type { Note, Years } from "./lib.ts";

// The public half of Break's VAPID key, the same as in index.html. The private
// half only ever lives in the VAPID_PRIVATE_KEY secret, pasted into the
// dashboard (Edge Functions → Secrets).
const VAPID_PUBLIC = "BDbgGnNlv6P9DmYmiShMn_8Q7aPANCO8lp4XFjClg_0Nsd8LZBgltBYhV6EfMveTmKxl6Ii1k5zC5Z3ItyFk6HM";
// Who's sending, for the push services. Apple wants a URL or a mailto: here.
const SUBJECT = "https://nabilhzq13.github.io/TimetableNabuzy/";
const BASE = Deno.env.get("SUPABASE_URL")!;
function named(v: string): string | undefined {
  try { return JSON.parse(Deno.env.get(v) || "{}").default; } catch { return undefined; }
}
// The secret key reads past row level security. The publishable one is only
// used to ask Auth whose sign-in a test came with.
const SECRET = named("SUPABASE_SECRET_KEYS") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC = named("SUPABASE_PUBLISHABLE_KEYS") || Deno.env.get("SUPABASE_ANON_KEY") || SECRET;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const te = new TextEncoder();

type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string };
type Token = { aud: string; jwt: string; exp: number; kid: string };
type Signer = { d: string; key: CryptoKey; kid: string };
type Push = Pick<Note, "key" | "title" | "body" | "tab" | "topic" | "ttl">;
// deno-lint-ignore no-explicit-any
type Doc = any;

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, Doc>;

// PostgREST as the secret key. An sb_secret_ key goes in apikey alone; a
// legacy service_role key is a JWT, so it goes in Authorization as well.
async function db(path: string, method = "GET", body?: unknown, prefer?: string): Promise<Doc> {
  const h: Record<string, string> = { apikey: SECRET, "Content-Type": "application/json" };
  if (!SECRET.startsWith("sb_")) h.Authorization = "Bearer " + SECRET;
  if (prefer) h.Prefer = prefer;
  const r = await fetch(BASE + "/rest/v1/" + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path.split("?")[0]}: ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

// Why there's no key: an empty secret, or one saved under a name that's nearly
// right. Only names that mention VAPID are ever given, and never a value.
function whyNoKey(): string {
  let env: Record<string, string> = {};
  try { env = Deno.env.toObject(); } catch { return "the function can't read its secrets"; }
  if ("VAPID_PRIVATE_KEY" in env) return "VAPID_PRIVATE_KEY is there but empty";
  const near = Object.keys(env).filter((k) => /vapid/i.test(k));
  return near.length
    ? "there's a secret called " + near.map((k) => JSON.stringify(k)).join(" and ") + ", but it has to be called exactly VAPID_PRIVATE_KEY"
    : "there's no secret with VAPID in its name";
}

// The signing key, checked against the public half before anything is sent,
// so a mistyped secret says so instead of failing at Apple.
let signer: Signer | null = null;
async function vapid(): Promise<Signer | null> {
  const d = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
  if (!d) return null;
  if (signer?.d === d) return signer;
  let key: CryptoKey | null = null;
  try {
    key = await vapidKey(d, VAPID_PUBLIC);
    if (!(await keysMatch(key, VAPID_PUBLIC))) key = null;
  } catch { key = null; }
  if (!key) throw new Error("The VAPID_PRIVATE_KEY secret isn't the private half of Break's key. Paste it again, as one line.");
  const kid = b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(d)))).slice(0, 12);
  return (signer = { d, key, kid });
}

// Apple asks for the signed token to change at most once an hour, so each push
// service's token is kept in push_tokens and reused until it has less than six
// of its twelve hours left.
async function token(aud: string, v: Signer, kept: Map<string, Token>): Promise<string> {
  const now = Math.floor(Date.now() / 1000), t = kept.get(aud);
  if (t && t.kid === v.kid && t.exp - now > 6 * 3600) return t.jwt;
  const exp = now + 12 * 3600, fresh = { aud, kid: v.kid, exp, jwt: await vapidJwt(v.key, aud, SUBJECT, exp) };
  kept.set(aud, fresh);
  await db("push_tokens?on_conflict=aud", "POST", fresh, "resolution=merge-duplicates,return=minimal");
  return fresh.jwt;
}
async function tokens(): Promise<Map<string, Token>> {
  return new Map((await db("push_tokens?select=aud,jwt,exp,kid")).map((t: Token) => [t.aud, t]));
}

// One reminder to one phone. A subscription the push service says is gone
// (404, 410) is removed; otherwise the outcome is kept on its row, where
// Settings shows a refusal.
async function send(s: Sub, n: Push, v: Signer, kept: Map<string, Token>): Promise<{ status: number; why: string }> {
  if (!PUSH_HOST.test(s.endpoint)) return { status: 0, why: "not a push service" };
  let status = 0, why = "";
  try {
    const body = await encrypt(te.encode(JSON.stringify({ title: n.title, body: n.body, tab: n.tab, tag: n.key })), unb64u(s.p256dh), unb64u(s.auth));
    const r = await fetch(s.endpoint, {
      method: "POST", body, signal: AbortSignal.timeout(10000),
      headers: {
        TTL: String(n.ttl), Urgency: "high", Topic: n.topic,
        "Content-Type": "application/octet-stream", "Content-Encoding": "aes128gcm",
        Authorization: `vapid t=${await token(new URL(s.endpoint).origin, v, kept)}, k=${VAPID_PUBLIC}`,
      },
    });
    status = r.status;
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      try { why = JSON.parse(t).reason || t; } catch { why = t; }
    }
  } catch (e) { why = String((e as Error)?.message || e); }
  const row = "push_subs?endpoint=eq." + encodeURIComponent(s.endpoint), ok = status >= 200 && status < 300;
  await (status === 404 || status === 410
    ? db(row, "DELETE", undefined, "return=minimal")
    : db(row, "PATCH", ok ? { ok_at: new Date().toISOString(), err: null } : { err: ((status ? status + " " : "") + (why || "no answer")).slice(0, 280) }, "return=minimal")
  ).catch((e) => console.error(e));
  console.log(n.key, new URL(s.endpoint).host, status, why.slice(0, 120));
  return { status, why };
}

// JAKIM's timetable per zone, as {year: days} for this year and last. A zone's
// year is fetched from e-Solat the first time it's needed and then kept; a year
// e-Solat can't give yet is tried again after six hours.
async function timetables(zones: string[], year: number): Promise<Map<string, Years>> {
  const out = new Map<string, Years>();
  if (!zones.length) return out;
  const rows = await db(`prayer_times?select=zone,year,days,fetched_at&zone=in.(${zones.join(",")})&year=in.(${year - 1},${year})`);
  const keep = (z: string, y: string | number, days: Record<string, number[]>) => {
    const o = out.get(z) || {};
    o[String(y)] = days;
    out.set(z, o);
  };
  for (const r of rows) if (r.days) keep(r.zone, r.year, r.days);
  for (const z of zones) {
    const tried = rows.find((r: Doc) => r.zone === z && r.year === year);
    if (tried && (tried.days || Date.now() - Date.parse(tried.fetched_at) < 6 * 3600e3)) continue;
    let years: Years = {};
    try {
      const r = await fetch(`https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=${z}`, { signal: AbortSignal.timeout(20000) });
      if (r.ok) years = parseTakwim(await r.json());
      else console.log("e-Solat", z, r.status);
    } catch (e) { console.log("e-Solat", z, String(e)); }
    const at = new Date().toISOString(), got = Object.keys(years).filter((y) => Object.keys(years[y]).length >= 28);
    const put: Doc[] = got.map((y) => ({ zone: z, year: +y, days: years[y], fetched_at: at }));
    if (got.indexOf(String(year)) < 0) put.push({ zone: z, year, days: null, fetched_at: at });   // remember the miss
    await db("prayer_times?on_conflict=zone,year", "POST", put, "resolution=merge-duplicates,return=minimal");
    for (const y of got) keep(z, y, years[y]);
  }
  return out;
}

// The minute's run.
async function tick() {
  const v = await vapid();
  if (!v) {
    console.log("waiting:", whyNoKey());
    return { waiting: "for the VAPID_PRIVATE_KEY secret" };
  }
  const subs: Sub[] = (await db("push_subs?select=endpoint,user_id,p256dh,auth")).filter((s: Sub) => PUSH_HOST.test(s.endpoint));
  if (!subs.length) return { ok: true };
  const users = [...new Set(subs.map((s) => s.user_id))];
  const of = new Map<string, Record<string, Doc>>();
  for (const d of await db(`docs?select=user_id,key,value&key=in.(blocks,done,solat,solatSet,reminders)&user_id=in.(${users.join(",")})`)) {
    const o = of.get(d.user_id) || {};
    o[d.key] = d.value && d.value.v;
    of.set(d.user_id, o);
  }
  const zoneOf = (u: string): string => {
    const z = of.get(u)?.solatSet?.zone;
    return typeof z === "string" && /^[A-Z]{3}\d{2}$/.test(z) ? z : "";
  };
  const now = minuteOf(Date.now()), year = +dateKey(Math.floor(now / 1440)).slice(0, 4);
  const tt = await timetables([...new Set(users.map(zoneOf).filter(Boolean))], year);
  const list: { user: string; note: Note }[] = [];
  for (const u of users) {
    const d = of.get(u) || {}, years = tt.get(zoneOf(u)) || {};
    for (const note of due(now, {
      prefs: prefsOf(d.reminders), blocks: Array.isArray(d.blocks) ? d.blocks : [],
      done: obj(d.done), solat: obj(d.solat), times: (day) => timesFor(years, day),
    })) list.push({ user: u, note });
  }
  if (!list.length) return { ok: true };
  // Each reminder is claimed before it's sent, so a run that overlaps this one
  // finds it taken. One that no phone took, for a reason that may pass, is
  // handed back for the next minute's run to try.
  const claimed = new Set<string>(
    (await db("push_sent?on_conflict=user_id,event&select=user_id,event", "POST",
      list.map((x) => ({ user_id: x.user, event: x.note.key })), "resolution=ignore-duplicates,return=representation"))
      .map((c: Doc) => c.user_id + " " + c.event));
  const kept = await tokens();
  let sent = 0;
  for (const x of list) {
    if (!claimed.has(x.user + " " + x.note.key)) continue;
    const codes: number[] = [];
    for (const s of subs) if (s.user_id === x.user) codes.push((await send(s, x.note, v, kept)).status);
    if (codes.some((c) => c >= 200 && c < 300)) sent++;
    else if (codes.some((c) => c === 0 || c === 429 || c >= 500))
      await db(`push_sent?user_id=eq.${x.user}&event=eq.${encodeURIComponent(x.note.key)}`, "DELETE", undefined, "return=minimal");
  }
  return { ok: true, due: list.length, sent };
}

// "Send a test" in Settings: to the phone that asked, and only if it belongs to
// the account whose sign-in came with the request.
async function test(req: Request, endpoint: unknown) {
  const who = await fetch(BASE + "/auth/v1/user", { headers: { apikey: PUBLIC, Authorization: req.headers.get("Authorization") || "" } });
  const user = who.ok ? await who.json() : null;
  if (!user || typeof user.id !== "string") return json({ error: "Your sign-in has run out. Sign in to Sync again." }, 401);
  const v = await vapid();
  if (!v) return json({ error: "Supabase can't use the push key yet: " + whyNoKey() + "." }, 503);
  const subs: Sub[] = typeof endpoint === "string" && PUSH_HOST.test(endpoint)
    ? await db(`push_subs?select=endpoint,user_id,p256dh,auth&user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(endpoint)}`)
    : [];
  if (!subs.length) return json({ error: "This phone isn't signed up for reminders. Turn them off and on again." }, 404);
  const r = await send(subs[0], {
    key: "test", tab: "today", topic: "test", ttl: 300,
    title: "Reminders are on", body: "This is what they'll look like. Tap one to open Break.",
  }, v, await tokens());
  return r.status >= 200 && r.status < 300
    ? json({ ok: true })
    : json({ error: r.status ? `The push service said ${r.status}${r.why ? " (" + r.why + ")" : ""}.` : "The push service didn't answer." }, 502);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: Doc = {};
  try { body = await req.json(); } catch { /* the cron's body is {} */ }
  try {
    return body && body.test ? await test(req, body.endpoint) : json(await tick());
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
