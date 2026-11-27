// Derbi Canlı — sunucu
// Görevleri: oyun ekranına canlı olayları (yorum / beğeni / hediye) aktarmak, akşam programını
// (19:00 takım toplama, 19:10 başlama) yönetmek, sezon fikstürünü, sonuçları ve maç kartlarını saklamak.
// Bağımlılıksız çalışır. TikTok bağlantısı için isteğe bağlı: npm install (tiktok-live-connector)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ADMIN_KEY = process.env.ADMIN_KEY || ''; // sunucuya kurulunca panel için şifre

// ---------------------------------------------------------------- takımlar
// Adlar renk + şehir: kulüp adı, arması, kuruluş yılı ve marşı kullanılmaz (marka hakkı).
// Takma adlar yalnızca yorumdan takım seçmek için kullanılır; ekrana yazılmaz, spiker okumaz.
const DEFAULT_TEAMS = [
  { name: 'Sarı-Kırmızı İstanbul', short: 'Sarı-Kırmızı', code: 'SKR', colors: ['#d4252d', '#f8c51c'],
    aliases: ['gs', 'galatasaray', 'cimbom', 'cim bom', 'galata', 'aslan', 'sarı kırmızı', 'sarıkırmızı', 'kırmızı', 'sk'] },
  { name: 'Sarı-Lacivert İstanbul', short: 'Sarı-Lacivert', code: 'SLV', colors: ['#16295e', '#f6d21a'],
    aliases: ['fb', 'fenerbahçe', 'fener', 'kanarya', 'sarı lacivert', 'sarılacivert', 'lacivert', 'sl'] },
  { name: 'Siyah-Beyaz İstanbul', short: 'Siyah-Beyaz', code: 'SYB', colors: ['#161616', '#f2f2f2'],
    aliases: ['bjk', 'beşiktaş', 'kartal', 'çarşı', 'siyah beyaz', 'siyahbeyaz', 'siyah', 'sb'] },
  { name: 'Bordo-Mavi Karadeniz', short: 'Bordo-Mavi', code: 'BMK', colors: ['#7b1d33', '#62b5e5'],
    aliases: ['ts', 'trabzonspor', 'trabzon', 'bordo mavi', 'bordomavi', 'bordo', 'karadeniz', 'bm'] },
];

const DEFAULT_SETTINGS = {
  kickoff: '19:10',   // başlama saati; takım toplama bundan prepMin önce başlar
  prepMin: 10,        // takım toplama
  halfMin: 20,        // devre (ekranda 45 dk olarak akar)
  htMin: 10,          // devre arası
  cardSec: 120,       // maç sonu kartlarının ekranda kalma süresi
  superCoins: 99,     // süper atak
  extraCoins: 500,    // uzatma: her biri +30 sn, yalnız 2. yarının son 5 dakikasında
  penCoins: 1000,     // penaltı şansı
  subs: true,         // sahadaki isimlerin değişmesi (oyuncu değişikliği)
  handle: '',         // kartlarda görünecek hesap adı
};
const TEST_DUR = { prep: 45, half: 180, ht: 30, card: 60 }; // panelden "test maçı" için kısa süreler

// Gerçek kulüp adı takım ADINA yazılırsa panel uyarır (takma adlar hariç).
const REAL_CLUBS = ['galatasaray', 'fenerbahçe', 'fenerbahce', 'beşiktaş', 'besiktas', 'trabzonspor', 'başakşehir', 'basaksehir',
  'göztepe', 'samsunspor', 'kasımpaşa', 'antalyaspor', 'konyaspor', 'alanyaspor', 'kayserispor', 'sivasspor', 'bursaspor', 'cimbom'];
function realClubWarnings(teams) {
  const out = [];
  for (const t of teams) {
    const n = (t.name || '').toLocaleLowerCase('tr');
    const hit = REAL_CLUBS.find(c => n.includes(c));
    if (hit) out.push(`"${t.name}" gerçek bir kulüp adı içeriyor (${hit}). Marka hakkı riski: renk + şehir gibi bir ad kullanın.`);
  }
  return out;
}

// ---------------------------------------------------------------- veri
function loadDb() {
  let db = {};
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { }
  db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  if (!Array.isArray(db.teams) || !db.teams[0]?.aliases) db.teams = DEFAULT_TEAMS; // eski sürüm verisi
  db.season ||= null;
  db.history ||= [];
  db.hidden ||= [];
  db.favs ||= {};
  db.override ||= null;
  db.snap ||= null;
  return db;
}
let db = loadDb();
let dirty = false;
function saveDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
  dirty = false;
}
const markDirty = () => { dirty = true; };
setInterval(() => { if (dirty) saveDb(); }, 5000);

const z2 = n => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => `${d.getFullYear()}-${z2(d.getMonth() + 1)}-${z2(d.getDate())}`;
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return todayStr(d); };
const uid = () => Math.random().toString(36).slice(2, 10);
const teamByCode = code => db.teams.find(t => t.code === code);

// ---------------------------------------------------------------- sezon
// 4 takım, çift devreli lig: 12 maç, her akşam bir maç. Sonra ilk iki takım Süper Final oynar.
function generateSeason(start) {
  const list = db.teams.map(t => t.code);
  if (list.length < 2) throw new Error('En az 2 takım gerekli');
  if (list.length % 2) list.push(null);
  const n = list.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      if (a && b) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop());
  }
  const leg1 = rounds.flat(), leg2 = leg1.map(([a, b]) => [b, a]);
  const matches = [...leg1, ...leg2].map(([home, away], i) => ({
    id: uid(), no: i + 1, date: addDays(start, i), home, away, status: 'scheduled', score: null, scorers: [], mom: null }));
  const no = (db.history.at(-1)?.no || db.season?.no || 0) + 1;
  return { no, start, createdAt: new Date().toISOString(), matches, champion: null };
}

const seasonMatches = () => [...(db.season?.matches || [])].sort((a, b) => a.date.localeCompare(b.date) || a.no - b.no);

function standings(matches = seasonMatches()) {
  const tbl = new Map(db.teams.map(t => [t.code, { code: t.code, name: t.name, short: t.short, colors: t.colors, o: 0, g: 0, b: 0, m: 0, ag: 0, yg: 0, p: 0 }]));
  for (const m of matches) {
    if (m.final || m.status !== 'played' || !m.score) continue;
    const h = tbl.get(m.home), a = tbl.get(m.away);
    if (!h || !a) continue;
    const [x, y] = m.score;
    h.o++; a.o++; h.ag += x; h.yg += y; a.ag += y; a.yg += x;
    if (x > y) { h.g++; a.m++; h.p += 3; } else if (x < y) { a.g++; h.m++; a.p += 3; } else { h.b++; a.b++; h.p++; a.p++; }
  }
  return [...tbl.values()].sort((p, q) => q.p - p.p || (q.ag - q.yg) - (p.ag - p.yg) || q.ag - p.ag || p.name.localeCompare(q.name, 'tr'));
}

// Kaçırılan akşam olursa (ör. yayın açılmadı) kalan maçlar bugünden itibaren birer gün kaydırılır.
// Lig bitince final eklenir; final oynanınca şampiyon kaydedilir ve ertesi gün yeni sezon başlar.
function maintainSeason() {
  const today = todayStr();
  if (!db.season) { db.season = generateSeason(today); saveDb(); return; }
  const ms = seasonMatches();
  const open = ms.filter(m => m.status !== 'played');
  if (open.length && open[0].date < today) {
    open.forEach((m, i) => { m.date = addDays(today, i); if (m.status === 'live') m.status = 'scheduled'; });
    markDirty();
  }
  const league = ms.filter(m => !m.final);
  if (!ms.some(m => m.final) && league.length && league.every(m => m.status === 'played')) {
    const [a, b] = standings(league);
    const last = league.map(m => m.date).sort().at(-1);
    const date = addDays(last, 1) > today ? addDays(last, 1) : today;
    db.season.matches.push({ id: uid(), no: league.length + 1, date, home: a.code, away: b.code, status: 'scheduled', score: null, scorers: [], mom: null, final: true });
    markDirty();
  }
  const fin = ms.find(m => m.final && m.status === 'played');
  if (fin && !db.season.champion) {
    const [x, y] = fin.score;
    const order = standings(league).map(s => s.code);
    db.season.champion = x > y ? fin.home : y > x ? fin.away : (order.indexOf(fin.home) < order.indexOf(fin.away) ? fin.home : fin.away);
    markDirty();
  }
  if (db.season.champion && fin && fin.date < today) {
    db.history.push({ no: db.season.no, start: db.season.start, champion: db.season.champion, standings: standings(league) });
    db.season = generateSeason(today);
    saveDb();
  }
}

function expand(m) {
  if (!m) return null;
  const h = teamByCode(m.home), a = teamByCode(m.away);
  if (!h || !a) return null;
  const label = m.final ? 'SÜPER FİNAL' : `Sezon ${db.season.no} · ${m.no}. maç`;
  return { id: m.id, no: m.no, date: m.date, final: !!m.final, label, home: pubTeam(h), away: pubTeam(a) };
}
const pubTeam = t => ({ name: t.name, short: t.short || t.name, code: t.code, colors: t.colors });

function durations(test) {
  const s = db.settings;
  return test ? { ...TEST_DUR } : { prep: s.prepMin * 60, half: s.halfMin * 60, ht: s.htMin * 60, card: s.cardSec };
}
const extraMaxFor = dur => Math.round(300 * dur.half / 1200);
const totalLen = dur => dur.half * 2 + dur.ht + extraMaxFor(dur) + dur.card + 60;
function kickoffToday() {
  const [h, m] = String(db.settings.kickoff).split(':').map(Number);
  const d = new Date(); d.setHours(h || 19, m || 0, 0, 0);
  return d.getTime();
}

// Şu an oynanacak / hazırlanan maç ve başlama zamanı.
function current() {
  maintainSeason();
  const now = Date.now();
  const o = db.override;
  if (o && now < o.kickoffAt + totalLen(o.dur) * 1000) return o;
  if (o) { db.override = null; markDirty(); }
  const today = todayStr();
  const m = seasonMatches().find(x => x.date === today && x.status !== 'played');
  if (!m) return null;
  const dur = durations(false), kickoffAt = kickoffToday();
  if (now > kickoffAt + totalLen(dur) * 1000) return null; // bu akşamın penceresi geçti: yarına kayar
  return { match: expand(m), kickoffAt, dur, friendly: false };
}
function upcoming(limit = 3) {
  return seasonMatches().filter(x => x.status !== 'played').slice(0, limit).map(expand);
}

// ---------------------------------------------------------------- izleyici olayları
// Yorum metninden takım seçimi: takma adlar ya da maçtaki sıra (1 = ev sahibi, 2 = deplasman).
const norm = s => ' ' + String(s || '').toLocaleLowerCase('tr').normalize('NFC').replace(/[^a-zçğıöşü0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
function pickFromText(text) {
  const t = norm(text);
  const cur = current();
  if (cur && /^ [12] $/.test(t)) return t.trim() === '1' ? cur.match.home.code : cur.match.away.code;
  const hits = db.teams.filter(team => [team.code.toLocaleLowerCase('tr'), ...(team.aliases || [])].some(a => t.includes(' ' + a + ' ')));
  return hits.length === 1 ? hits[0].code : null;
}

const clients = new Set();
function broadcast(obj) {
  const s = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of clients) res.write(s);
}
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20000);

// TikTok ve test panelinden gelen her olay buradan geçer.
function ingest(e) {
  const user = String(e.user || 'anon').slice(0, 64);
  const out = { ...e, user };
  if (e.type === 'comment') {
    const t = norm(e.text).trim();
    if (t === 'gizle' || t === 'göster') {
      const on = t === 'gizle';
      db.hidden = db.hidden.filter(u => u !== user); if (on) db.hidden.push(user);
      markDirty(); broadcast({ type: 'hide', user, on }); return;
    }
    const pick = pickFromText(e.text);
    if (pick) { if (db.favs[user] !== pick) { db.favs[user] = pick; markDirty(); } out.pick = pick; }
    delete out.text; // yorum metni oyuna gönderilmez, ekranda gösterilmez
  }
  if (db.favs[user]) out.team = db.favs[user];
  broadcast(out);
}

// ---------------------------------------------------------------- TikTok bağlantısı
let tiktokStatus = { state: 'off', user: null, detail: '' };
function setTiktokStatus(state, detail = '') {
  tiktokStatus = { ...tiktokStatus, state, detail };
  broadcast({ type: 'status', tiktok: tiktokStatus });
  console.log(`[TikTok] ${state} ${detail}`);
}
function normUser(d) {
  const u = d.user || d;
  return { user: String(u.uniqueId || u.userId || 'anon'), nick: String(u.nickname || u.uniqueId || 'izleyici') };
}
let tt = null;
let eulerKey = ''; // panelden girilirse yalnız bellekte tutulur, diske yazılmaz
function explain(e) {
  const errs = (e?.config?.requestErrs || e?.exception?.config?.requestErrs || []).map(x => String(x?.message || x));
  const all = [String(e?.message || e?.info || e), ...errs].join(' | ');
  if (/lack of permission|401|api key/i.test(all)) return 'TikTok erişimi engelledi (403) ve Euler Stream anahtarı yok/yetersiz. Panelden Euler API anahtarı girin.';
  if (/403/.test(all)) return 'TikTok bu ağdan gelen isteği engelledi (403).';
  if (/offline|not live|isn't online|UserOffline/i.test(all)) return 'Hesap şu an canlı yayında değil.';
  return all.slice(0, 220);
}
async function stopTikTok() {
  if (!tt) return;
  const old = tt; tt = null; old.stopped = true; clearTimeout(old.timer);
  try { await old.conn.disconnect(); } catch { }
  tiktokStatus = { state: 'off', user: null, detail: '' };
  broadcast({ type: 'status', tiktok: tiktokStatus });
}
async function startTikTok(username) {
  username = String(username || '').trim().replace(/^https?:\/\/(www\.)?tiktok\.com\//, '').replace(/^@/, '').replace(/\/live.*$/, '');
  if (!/^[\w.]{2,24}$/.test(username)) { setTiktokStatus('error', 'Geçersiz kullanıcı adı'); return; }
  await stopTikTok();
  let mod;
  try { mod = await import('tiktok-live-connector'); }
  catch { setTiktokStatus('error', 'tiktok-live-connector kurulu değil: npm install'); return; }
  const Conn = mod.TikTokLiveConnection || mod.WebcastPushConnection;
  if (!Conn) { setTiktokStatus('error', 'Kütüphane sürümü tanınmadı'); return; }
  const key = eulerKey || process.env.EULER_API_KEY;
  const conn = new Conn(username, key ? { signApiKey: key } : {});
  const me = tt = { conn, username, timer: null, stopped: false, delay: 5000, counts: { comment: 0, like: 0, gift: 0 } };
  tiktokStatus = { state: 'connecting', user: username, detail: '' };
  setTiktokStatus('connecting');
  const scheduleRetry = why => {
    if (me.stopped || me.timer) return;
    setTiktokStatus('waiting', `${why} — ${me.delay / 1000} sn sonra tekrar denenecek.`);
    me.timer = setTimeout(() => { me.timer = null; connect(); }, me.delay);
    me.delay = Math.min(me.delay * 2, 60000);
  };
  const connect = () => {
    if (me.stopped) return;
    conn.connect()
      .then(st => { me.delay = 5000; setTiktokStatus('connected', `roomId ${st?.roomId ?? ''}`); })
      .catch(e => scheduleRetry(explain(e)));
  };
  const count = k => { me.counts[k]++; tiktokStatus.counts = me.counts; };
  conn.on('chat', d => { count('comment'); ingest({ type: 'comment', ...normUser(d), text: String(d.comment || '') }); });
  conn.on('like', d => { count('like'); ingest({ type: 'like', ...normUser(d), count: Number(d.likeCount || 1) }); });
  conn.on('gift', d => {
    count('gift');
    const g = d.giftDetails || {};
    const giftType = g.giftType ?? d.giftType;
    if (giftType === 1 && !d.repeatEnd) return; // seri hediye: seri bitince tek sefer say
    const coins = Number(g.diamondCount ?? d.diamondCount ?? 1) || 1;
    ingest({ type: 'gift', ...normUser(d), gift: String(g.giftName || d.giftName || 'Hediye'), coins, count: Number(d.repeatCount || 1) || 1 });
  });
  conn.on('error', () => { });
  conn.on('disconnected', () => scheduleRetry('Bağlantı koptu'));
  conn.on('streamEnd', () => scheduleRetry('Yayın bitti'));
  connect();
}
setInterval(() => { if (tt) broadcast({ type: 'status', tiktok: tiktokStatus }); }, 3000);

// ---------------------------------------------------------------- HTTP
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req, limit = 2e6) {
  return new Promise((ok, bad) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > limit) { bad(new Error('çok büyük')); req.destroy(); } });
    req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } });
  });
}
const authed = req => !ADMIN_KEY || req.headers['x-admin-key'] === ADMIN_KEY;
const str = (v, n = 40) => String(v ?? '').slice(0, n);
function cleanLineup(l) {
  if (!l || typeof l !== 'object') return null;
  const person = p => p ? { nick: str(p.nick, 30), coins: Number(p.coins) || 0, likes: Number(p.likes) || 0 } : null;
  return { td: person(l.td), xi: (Array.isArray(l.xi) ? l.xi : []).slice(0, 11).map(person) };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'status', tiktok: tiktokStatus })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // --- oyun ekranı uçları (şifresiz)
    if (p === '/api/next-match' && req.method === 'GET') {
      const cur = current();
      const snap = cur && db.snap?.id === cur.match.id && Date.now() - db.snap.at < 3 * 3600e3 ? db.snap.data : null;
      return send(res, 200, { now: Date.now(), current: cur, snap, upcoming: upcoming(3), standings: standings(),
        settings: db.settings, hidden: db.hidden, kickoffToday: kickoffToday(), season: db.season && { no: db.season.no, champion: db.season.champion } });
    }
    if (p === '/api/snapshot' && req.method === 'POST') {
      const b = await readBody(req);
      const cur = current();
      if (cur && b.id === cur.match.id) { db.snap = { id: b.id, at: Date.now(), data: b.data }; markDirty(); }
      return send(res, 200, { ok: true });
    }
    if (p === '/api/result' && req.method === 'POST') {
      const b = await readBody(req);
      const m = db.season?.matches.find(x => x.id === b.id);
      if (db.override?.match.id === b.id) db.override = null; // elle başlatılan maç bitti: programa dön
      if (db.snap?.id === b.id) db.snap = null;
      markDirty();
      if (m && m.status !== 'played') {
        m.status = 'played';
        m.score = [Math.min(10, Number(b.score?.[0]) || 0), Math.min(10, Number(b.score?.[1]) || 0)];
        m.scorers = Array.isArray(b.scorers) ? b.scorers.slice(0, 25).map(s => ({ team: str(s.team, 4), name: str(s.name, 30), minute: str(s.minute, 8) })) : [];
        m.mom = b.mom ? str(b.mom, 30) : null;
        m.lineups = Array.isArray(b.lineups) ? b.lineups.slice(0, 2).map(cleanLineup) : null;
        m.stats = b.stats && typeof b.stats === 'object' ? b.stats : null;
        m.playedAt = new Date().toISOString();
        saveDb();
        broadcast({ type: 'fixture-updated' });
      }
      return send(res, 200, { ok: true, upcoming: upcoming(3), standings: standings() });
    }
    if (p === '/api/state' && req.method === 'GET') {
      maintainSeason();
      return send(res, 200, { settings: db.settings, teams: db.teams, season: db.season ? { ...db.season, matches: seasonMatches() } : null,
        standings: standings(), history: db.history.slice(-6), warnings: realClubWarnings(db.teams), tiktok: tiktokStatus,
        today: todayStr(), current: current(), hiddenCount: db.hidden.length });
    }

    // --- yönetim uçları
    if (p.startsWith('/api/') && req.method === 'POST' && !authed(req)) return send(res, 401, { error: 'Yetkisiz: x-admin-key gerekli' });

    if (p === '/api/event' && req.method === 'POST') {
      const b = await readBody(req);
      const list = Array.isArray(b) ? b : [b];
      for (const e of list.slice(0, 2000)) {
        if (e.type === 'control') broadcast({ type: 'control', action: str(e.action) });
        else if (['comment', 'like', 'gift'].includes(e.type)) ingest({ ...e, test: true });
      }
      return send(res, 200, { ok: true, n: list.length });
    }
    if (p === '/api/tiktok' && req.method === 'POST') {
      const b = await readBody(req);
      if (typeof b.eulerKey === 'string' && b.eulerKey.trim()) eulerKey = b.eulerKey.trim().slice(0, 200);
      if (b.stop) await stopTikTok(); else startTikTok(b.username);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/settings' && req.method === 'POST') {
      const b = await readBody(req);
      for (const k of Object.keys(DEFAULT_SETTINGS)) {
        if (!(k in b)) continue;
        const d = DEFAULT_SETTINGS[k];
        if (typeof d === 'boolean') db.settings[k] = !!b[k];
        else if (typeof d === 'number') db.settings[k] = Math.max(1, Math.min(100000, Number(b[k]) || d));
        else if (k === 'kickoff') { if (/^([01]\d|2[0-3]):[0-5]\d$/.test(b[k])) db.settings[k] = b[k]; }
        else db.settings[k] = str(b[k], 40);
      }
      saveDb(); broadcast({ type: 'settings', settings: db.settings });
      return send(res, 200, { ok: true, settings: db.settings });
    }
    if (p === '/api/teams' && req.method === 'POST') {
      const b = await readBody(req);
      if (!Array.isArray(b.teams) || b.teams.length < 2) return send(res, 400, { error: 'En az 2 takım' });
      const seen = new Set(), teams = [];
      for (const t of b.teams) {
        const code = String(t.code || '').toUpperCase().replace(/[^A-ZÇĞİÖŞÜ0-9]/g, '').slice(0, 4);
        const name = str(t.name, 32).trim();
        if (!code || !name || seen.has(code)) return send(res, 400, { error: `Geçersiz ya da tekrar eden kod: ${t.code}` });
        seen.add(code);
        const col = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#888888';
        const aliases = (Array.isArray(t.aliases) ? t.aliases : String(t.aliases || '').split(','))
          .map(a => norm(a).trim()).filter(Boolean).slice(0, 20);
        teams.push({ name, short: str(t.short || name, 18).trim(), code, colors: [col(t.colors?.[0]), col(t.colors?.[1])], aliases });
      }
      db.teams = teams; saveDb();
      return send(res, 200, { ok: true, warnings: realClubWarnings(teams) });
    }
    if (p === '/api/season/new' && req.method === 'POST') {
      const b = await readBody(req);
      const start = /^\d{4}-\d{2}-\d{2}$/.test(b.start) ? b.start : todayStr();
      if (db.season) db.history.push({ no: db.season.no, start: db.season.start, champion: db.season.champion, standings: standings(), unfinished: !db.season.champion });
      db.season = generateSeason(start); db.snap = null;
      saveDb(); broadcast({ type: 'fixture-updated' });
      return send(res, 200, { ok: true });
    }
    // Maçı programı beklemeden başlat: "today" = bugünün lig maçı (puana sayılır), "test" = kısa hazırlık maçı (sayılmaz)
    if (p === '/api/start' && req.method === 'POST') {
      const b = await readBody(req);
      if (b.cancel) { db.override = null; saveDb(); broadcast({ type: 'control', action: 'reload' }); return send(res, 200, { ok: true }); }
      const lead = Math.max(5, Math.min(1800, Number(b.leadSec) || 30)) * 1000;
      if (b.kind === 'test') {
        const pool = db.teams.filter(t => !b.home || t.code === b.home || t.code === b.away);
        const [h, a] = b.home && b.away ? [teamByCode(b.home), teamByCode(b.away)] : [...pool].sort(() => Math.random() - 0.5);
        if (!h || !a || h === a) return send(res, 400, { error: 'Takımları kontrol edin' });
        const dur = durations(true);
        db.override = { match: { id: 'test-' + uid(), label: 'Test maçı · puana sayılmaz', home: pubTeam(h), away: pubTeam(a), final: false }, kickoffAt: Date.now() + lead, dur, friendly: true };
      } else {
        maintainSeason();
        const m = seasonMatches().find(x => x.status !== 'played');
        if (!m) return send(res, 400, { error: 'Oynanacak maç yok' });
        m.date = todayStr();
        const dur = durations(false);
        db.override = { match: expand(m), kickoffAt: Date.now() + lead, dur, friendly: false };
      }
      db.snap = null; saveDb();
      broadcast({ type: 'control', action: 'reload' });
      return send(res, 200, { ok: true });
    }

    // --- statik dosyalar
    if (req.method === 'GET') {
      const f = p === '/' ? '/panel.html' : p;
      const full = path.normalize(path.join(PUBLIC, decodeURIComponent(f)));
      if (!full.startsWith(PUBLIC)) return send(res, 403, 'yasak', 'text/plain');
      if (fs.existsSync(full) && fs.statSync(full).isFile()) return send(res, 200, fs.readFileSync(full), MIME[path.extname(full)] || 'application/octet-stream');
    }
    send(res, 404, { error: 'bulunamadı' });
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});

maintainSeason();
server.listen(PORT, HOST, () => {
  console.log('Derbi Canlı hazır:');
  console.log(`  Oyun ekranı : http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/game.html   (OBS için: ?obs)`);
  console.log(`  Panel       : http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
  console.log(`  Program     : her akşam ${db.settings.kickoff} başlama, ${db.settings.prepMin} dk önce takım toplama`);
  if (process.env.TIKTOK_USERNAME) startTikTok(process.env.TIKTOK_USERNAME);
});
process.on('SIGINT', () => { if (dirty) saveDb(); process.exit(0); });
