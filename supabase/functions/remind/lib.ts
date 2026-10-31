// Break's reminders: what is due when, and Web Push done with WebCrypto alone
// (RFC 8291 to encrypt, RFC 8292 to sign), so the same file runs in Supabase's
// Edge Functions and in Node for the tests. index.ts does the talking.

// ---------- time ----------
// Break's times are Malaysian, UTC+8 all year. A "minute" here counts from the
// Unix epoch in Malaysian time, so its day is floor(m / 1440) and its time of
// day m % 1440.
export const MYT = 480;
export const minuteOf = (ms: number): number => Math.floor(ms / 60000) + MYT;
export const dateKey = (day: number): string => new Date(day * 86400000).toISOString().slice(0, 10);
// Monday is 0, as in Break. 1 January 1970 was a Thursday.
export const weekday = (day: number): number => (day + 3) % 7;
const ofDay = (m: number): number => ((m % 1440) + 1440) % 1440;
// 4pm, 4:19pm: a time the way Break writes it.
export function fmt(m: number): string {
  m = ofDay(m);
  const h = Math.floor(m / 60), mm = m % 60;
  return (h % 12 || 12) + (mm ? ":" + String(mm).padStart(2, "0") : "") + (h < 12 ? "am" : "pm");
}
function toMin(s: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? ""));
  return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
}

// ---------- choices ----------
// The synced "reminders" doc. Leads are minutes ahead; quiet hours run from
// qfrom to qto in minutes of the day, across midnight when qfrom > qto.
// subuh lets Subuh through quiet hours. due and dlead: reminders for what's on
// Due, and how long before (any of a week, three days, a day and an hour).
export type Prefs = {
  pray: boolean; late: boolean; blocks: boolean; due: boolean; dlead: number[];
  plead: number; blead: number; qfrom: number; qto: number; subuh: boolean;
};
export const DEFAULTS: Prefs = {
  pray: true, late: true, blocks: true, due: true, dlead: [10080, 4320, 1440, 60],
  plead: 0, blead: 10, qfrom: 0, qto: 600, subuh: false,
};
// Each lead's name in a reminder's key, and how it reads. The same keys as
// Nabuzy's, so a reminder never goes twice for the same thing.
export const LEADS: Record<number, { key: string; when: string }> = {
  10080: { key: "week", when: "in a week" }, 4320: { key: "3d", when: "in 3 days" },
  1440: { key: "day", when: "tomorrow" }, 60: { key: "hour", when: "in an hour" },
};
export function prefsOf(v: unknown): Prefs {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>, p = { ...DEFAULTS, dlead: DEFAULTS.dlead.slice() };
  for (const k of ["pray", "late", "blocks", "due", "subuh"] as const) if (typeof o[k] === "boolean") p[k] = o[k] as boolean;
  if (Array.isArray(o.dlead)) {
    const l = Object.keys(LEADS).map(Number).sort((a, b) => b - a).filter((n) => (o.dlead as unknown[]).indexOf(n) >= 0);
    if (l.length) p.dlead = l;
  }
  for (const k of ["plead", "blead"] as const) {
    const n = o[k];
    if (Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 120) p[k] = n as number;
  }
  for (const k of ["qfrom", "qto"] as const) {
    const n = o[k];
    if (Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1440) p[k] = n as number;
  }
  return p;
}
export function quiet(p: Prefs, m: number): boolean {
  m = ofDay(m);
  return p.qfrom < p.qto ? m >= p.qfrom && m < p.qto : p.qfrom > p.qto ? m >= p.qfrom || m < p.qto : false;
}
// Where a reminder lands. Inside quiet hours it's dropped, unless the thing
// it's about falls outside them: then it comes the minute they end.
function placed(p: Prefs, at: number, anchor: number, pass: boolean): number | null {
  if (pass || !quiet(p, at)) return at;
  if (quiet(p, anchor)) return null;
  let end = Math.floor(at / 1440) * 1440 + p.qto;
  if (end <= at) end += 1440;
  return end <= anchor ? end : null;
}
// A deadline's reminder in quiet hours comes the minute they end instead, as
// long as that's still before the deadline itself. The deadline being in
// quiet hours doesn't matter: a week's notice of a 9am exam still comes.
function early(p: Prefs, at: number, due: number): number | null {
  if (!quiet(p, at)) return at;
  let end = Math.floor(at / 1440) * 1440 + p.qto;
  if (end <= at) end += 1440;
  return end < due ? end : null;
}
// "2026-11-06T09:00", read as Malaysian time, as a minute on the same count.
export function localMinute(s: unknown): number | null {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(String(s ?? ""));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000 : null;
}
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "Fri 7 Nov", for a minute on the Malaysian count.
function dayText(m: number): string {
  const d = new Date(Math.floor(m / 1440) * 86400000);
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`;
}

// ---------- JAKIM's timetable ----------
// e-Solat writes dates with Malay month names: 01-Mac-2026, 15-Ogos-2026.
const MON: Record<string, number> = {
  jan: 1, feb: 2, mac: 3, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, ogo: 8, aug: 8,
  sep: 9, okt: 10, oct: 10, nov: 11, dis: 12, dec: 12,
};
export type Years = Record<string, Record<string, number[]>>;
// e-Solat's reply as {year: {"MM-DD": [fajr, syuruk, dhuhr, asr, maghrib, isha]}},
// minutes from midnight. A day whose times don't run in order is left out, as
// Break does.
export function parseTakwim(j: unknown): Years {
  const years: Years = {}, list = (j && (j as { prayerTime?: unknown }).prayerTime) || [];
  for (const x of Array.isArray(list) ? list : []) {
    const [d, mo, y] = String(x?.date || "").split("-"), m = MON[String(mo || "").slice(0, 3).toLowerCase()];
    if (!m || !+d || !/^\d{4}$/.test(y || "")) continue;
    const t = [x.fajr, x.syuruk, x.dhuhr, x.asr, x.maghrib, x.isha].map((s: unknown) => {
      const p = String(s || "").split(":");
      return p.length > 1 ? +p[0] * 60 + +p[1] : NaN;
    });
    if (t.some((v, i) => isNaN(v) || (i > 0 && v <= t[i - 1]))) continue;
    (years[y] ||= {})[String(m).padStart(2, "0") + "-" + String(+d).padStart(2, "0")] = t;
  }
  return years;
}
// A day's six times. A year JAKIM hasn't published yet borrows the same date
// from the year before, which lands within a minute or two.
export function timesFor(years: Years, day: number): number[] | null {
  const k = dateKey(day), y = k.slice(0, 4), md = k.slice(5), last = years[String(+y - 1)];
  return years[y]?.[md] ?? last?.[md] ?? (md === "02-29" ? last?.["02-28"] ?? null : null);
}

// ---------- what's due ----------
export type Block = { id: string; activity: string; start: string; mins: number; days: number[]; details?: string };
// An assignment, exam or quiz from Due; done is when it was ticked off, or 0.
export type Task = { id: string; kind?: string; title?: string; course?: string; due?: string; done?: number };
export type Account = {
  prefs: Prefs; blocks: Block[];
  done: Record<string, string[]>;                  // ticked blocks by date
  solat: Record<string, Record<string, string>>;   // prayer records by prayer day
  tasks?: Task[];
  times: (day: number) => number[] | null;
};
export type Note = {
  key: string; at: number; title: string; body: string;
  tab: "today" | "solat" | "due"; topic: string; ttl: number;
};
const IDS = ["subuh", "zohor", "asar", "maghrib", "isyak"];
const NAMES = ["Subuh", "Zohor", "Asar", "Maghrib", "Isyak"];
// Each prayer's time runs from one of JAKIM's six times to the next prayer's:
// Subuh to syuruk, Zohor to Asar and so on, and Isyak to the next Subuh.
const FROM = [0, 2, 3, 4, 5], TO = [1, 3, 4, 5, 6];
const UNTIL = ["syuruk", "Asar", "Maghrib", "Isyak", "Subuh"];
// How long before a prayer's time ends the "running out" reminder comes.
export const LATE = 30;

// Everything that comes due in the `span` minutes up to and including `now`.
// A run that comes a minute or two late still sends; index.ts makes sure
// nothing goes twice. Anything already ticked is left alone. Each kind has a
// topic, so a phone that was offline gets only the latest of each; Apple reads
// a topic as base64url, so its length is never one more than a multiple of
// four (it refused "block").
export function due(now: number, a: Account, span = 3): Note[] {
  const out: Note[] = [], p = a.prefs, today = Math.floor(now / 1440);
  const take = (n: Omit<Note, "at" | "ttl">, at: number | null, until: number) => {
    if (at !== null && at <= now && at > now - span)
      out.push({ ...n, at, ttl: Math.max(60, Math.min(7200, (until - now) * 60)) });
  };
  for (let day = today - 1; day <= today + 1; day++) {
    const dk = dateKey(day);
    if (p.blocks) for (const b of a.blocks) {
      const s = toMin(b.start);
      if (s === null || !Array.isArray(b.days) || b.days.indexOf(weekday(day)) < 0) continue;
      if ((a.done[dk] || []).indexOf(b.id) >= 0) continue;
      const start = day * 1440 + s, end = start + (+b.mins || 0), left = start - now;
      take({
        key: `b:${dk}:${b.id}:${b.start}`, tab: "today", topic: "blocks",
        title: left > 0 ? `${b.activity} in ${left} min` : `${b.activity} starts now`,
        body: fmt(start) + "–" + fmt(end) + (b.details ? ". " + String(b.details).slice(0, 160) : ""),
      }, placed(p, start - p.blead, start, false), start + 10);
    }
    const t = a.times(day);
    if (!t || !(p.pray || p.late)) continue;
    const next = a.times(day + 1);
    for (let i = 0; i < 5; i++) {
      if (a.solat[dk]?.[IDS[i]]) continue;
      const start = day * 1440 + t[FROM[i]], end = i < 4 ? day * 1440 + t[TO[i]] : (day + 1) * 1440 + (next || t)[0];
      const pass = i === 0 && p.subuh, until = `${UNTIL[i]} at ${fmt(end)}`;
      if (p.pray) {
        const left = start - now;
        take({
          key: `p:${dk}:${IDS[i]}`, tab: "solat", topic: "prayer",
          title: left > 0 ? `${NAMES[i]} in ${left} min` : `${NAMES[i]} · ${fmt(start)}`,
          body: left > 0 ? `At ${fmt(start)}, until ${until}.` : `Time for ${NAMES[i]}. It lasts until ${until}.`,
        }, placed(p, start - p.plead, start, pass), end);
      }
      if (p.late && end - LATE > start) {
        take({
          key: `l:${dk}:${IDS[i]}`, tab: "solat", topic: "prayer",
          title: `${NAMES[i]} ends at ${fmt(end)}`,
          body: `${end - now} minutes left, and it isn't ticked on Solat yet.`,
        }, placed(p, end - LATE, end, pass), end);
      }
    }
  }
  // Assignments, exams and quizzes: as long before as you chose, unless it's
  // ticked off. An assignment is due; an exam or a quiz starts. The key holds
  // the due time, so moving it brings fresh reminders.
  if (p.due) for (const t of a.tasks || []) {
    const at = localMinute(t.due);
    if (at === null || t.done) continue;
    const test = t.kind === "exam" || t.kind === "quiz", kind = t.kind === "exam" ? "Exam" : "Quiz";
    const what = String(t.title || (test ? kind : "Assignment")).slice(0, 80);
    const course = t.course ? String(t.course).slice(0, 30) + " · " : "";
    for (const lead of p.dlead) {
      const l = LEADS[lead];
      if (!l) continue;
      // A week or three days out, it says which day.
      const on = lead >= 4320 ? `${dayText(at)}, ${fmt(at)}` : `at ${fmt(at)}`;
      take({
        key: `d:${t.id}:${t.due}:${l.key}`, tab: "due", topic: "deadline",
        title: test ? `${kind} ${l.when}: ${what}` : `${what} is due ${l.when}`,
        body: test ? `${course}Starts ${on}.` : `${course}Due ${on}.${lead >= 1440 ? " Still to hand in." : ""}`,
      }, early(p, at - lead, at), at);
    }
  }
  return out;
}

// ---------- Web Push ----------
const te = new TextEncoder();
export function b64u(b: Uint8Array): string {
  let s = "";
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}
function cat(...a: Uint8Array[]): Uint8Array {
  const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of a) { o.set(x, i); i += x.length; }
  return o;
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}
// Only these push services are sent to, so a row can't point the function at
// some other address.
export const PUSH_HOST = /^https:\/\/([a-z0-9-]+\.)*(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)\//;

// RFC 8291: the message as one aes128gcm record that only the phone holding
// the subscription's private key (p256dh) and secret (auth) can open. salt and
// the one-off key pair are passed in by the tests only.
export async function encrypt(
  plain: Uint8Array, p256dh: Uint8Array, auth: Uint8Array,
  salt: Uint8Array = crypto.getRandomValues(new Uint8Array(16)), mine?: CryptoKeyPair,
): Promise<Uint8Array> {
  const me = mine ?? await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const myPub = new Uint8Array(await crypto.subtle.exportKey("raw", me.publicKey));
  const them = await crypto.subtle.importKey("raw", p256dh, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: them }, me.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(te.encode("WebPush: info\0"), p256dh, myPub), 32);
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 marks the last (here the only) record; no padding.
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(plain, new Uint8Array([2]))));
  const head = new Uint8Array(21);
  head.set(salt);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = myPub.length;
  return cat(head, myPub, ct);
}

// RFC 8292: the server's signature. The key comes in two halves, the private
// d from the VAPID_PRIVATE_KEY secret and the public point that Break hands
// the push service when it subscribes.
export function vapidKey(d: string, pub: string): Promise<CryptoKey> {
  const p = unb64u(pub);
  return crypto.subtle.importKey("jwk",
    { kty: "EC", crv: "P-256", d, x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), ext: true },
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}
// Whether d really is the public key's other half: something signed with one
// has to check out with the other.
export async function keysMatch(key: CryptoKey, pub: string): Promise<boolean> {
  const v = await crypto.subtle.importKey("raw", unb64u(pub), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const msg = te.encode("Break"), sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, msg);
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, v, sig, msg);
}
// Apple refuses a token whose subject isn't a URL or mailto:, whose audience
// isn't the push service's origin, or that runs more than a day.
export async function vapidJwt(key: CryptoKey, aud: string, sub: string, exp: number): Promise<string> {
  const part = (o: object) => b64u(te.encode(JSON.stringify(o)));
  const head = part({ typ: "JWT", alg: "ES256" }) + "." + part({ aud, exp, sub });
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(head)));
  return head + "." + b64u(sig);
}
