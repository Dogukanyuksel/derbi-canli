// Derbi Canlı — sunucu
// Görevleri: oyun ekranına canlı olayları (yorum / beğeni / hediye) aktarmak,
// takımları, haftalık fikstürü ve sonuçları saklamak, test panelini sunmak.
// Bağımlılıksız çalışır. TikTok bağlantısı için isteğe bağlı: npm i tiktok-live-connector

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

// ---------------------------------------------------------------- veri
// Kurgusal takım adları: gerçek kulüp adı, logosu ve forması kullanılmıyor (marka hakkı).
const DEFAULT_TEAMS = [
  { name: 'Kızılırmak Yıldızları', code: 'KZL', colors: ['#e63946', '#ffffff'] },
  { name: 'Ege Rüzgarı', code: 'EGE', colors: ['#1d7fe0', '#ffffff'] },
  { name: 'Toros SK', code: 'TRS', colors: ['#1f9d55', '#111111'] },
  { name: 'Karadeniz Dalgası', code: 'DLG', colors: ['#0b2545', '#3ad0ff'] },
  { name: 'Kapadokya Balonları', code: 'KPD', colors: ['#ff8c1a', '#5b2a86'] },
  { name: 'Marmara Martıları', code: 'MRT', colors: ['#f1f1f1', '#1b2a6b'] },
  { name: 'Fırat Şimşekleri', code: 'FRT', colors: ['#ffd60a', '#111111'] },
  { name: 'Nemrut Ateşi', code: 'NMR', colors: ['#8b1e3f', '#ff9f1c'] },
];

const DEFAULT_SETTINGS = {
  halfSeconds: 210,   // bir devrenin gerçek süresi (sn) — ekranda 45 dk olarak akar
  htSeconds: 40,      // devre arası
  ftSeconds: 35,      // maç sonu ekranı
  introSeconds: 12,   // maç öncesi tanıtım
  matchesPerDay: 8,
  friendlyWhenIdle: true, // günün maçları bitince sayılmayan hazırlık maçı oynansın
};

// Uyarı için: gerçek kulüp adları (marka riski). Engellemez, panelde uyarır.
const REAL_CLUBS = ['galatasaray', 'fenerbahçe', 'fenerbahce', 'beşiktaş', 'besiktas', 'trabzonspor',
  'başakşehir', 'basaksehir', 'göztepe', 'goztepe', 'samsunspor', 'kasımpaşa', 'kasimpasa', 'antalyaspor',
  'konyaspor', 'alanyaspor', 'kayserispor', 'sivasspor', 'gaziantep', 'rizespor', 'eyüpspor', 'eyupspor',
  'karagümrük', 'karagumruk', 'kocaelispor', 'gençlerbirliği', 'genclerbirligi', 'bursaspor', 'ankaragücü',
  'ankaragucu', 'cimbom', 'real madrid', 'barcelona', 'manchester', 'liverpool', 'juventus', 'bayern'];

function realClubWarnings(teams) {
  const out = [];
  for (const t of teams) {
    const n = (t.name || '').toLocaleLowerCase('tr');
    const hit = REAL_CLUBS.find(c => n.includes(c));
    if (hit) out.push(`"${t.name}" gerçek bir kulüp adı içeriyor (${hit}). Marka hakkı riski: kurgusal ad önerilir.`);
  }
  return out;
}

function loadDb() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
    db.teams ||= DEFAULT_TEAMS;
    db.fixture ||= null;
    db.history ||= [];
    return db;
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, teams: DEFAULT_TEAMS, fixture: null, history: [] };
  }
}
let db = loadDb();
function saveDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

const todayStr = (d = new Date()) => {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return todayStr(d); };
const uid = () => Math.random().toString(36).slice(2, 10);
const teamByCode = code => db.teams.find(t => t.code === code);

// Çift devreli lig (çember yöntemi), gün başına maç sayısına göre 7 güne yayılır.
function generateFixture(weekStart, perDay) {
  const codes = db.teams.map(t => t.code);
  if (codes.length < 2) throw new Error('En az 2 takım gerekli');
  const list = [...codes];
  if (list.length % 2) list.push(null); // bay
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
  const leg1 = rounds.flat();
  const leg2 = leg1.map(([a, b]) => [b, a]);
  const cycle = [...leg1, ...leg2];
  const total = perDay * 7;
  const matches = [];
  for (let i = 0; i < total; i++) {
    const [home, away] = cycle[i % cycle.length];
    const day = Math.floor(i / perDay);
    matches.push({ id: uid(), date: addDays(weekStart, day), order: i % perDay, home, away,
      status: 'scheduled', score: null, scorers: [], mom: null });
  }
  return { weekStart, perDay, createdAt: new Date().toISOString(), matches };
}

function sortedMatches() {
  return [...(db.fixture?.matches || [])].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
}

function standings(matches) {
  const tbl = new Map(db.teams.map(t => [t.code, { code: t.code, name: t.name, colors: t.colors, o: 0, g: 0, b: 0, m: 0, ag: 0, yg: 0, p: 0 }]));
  for (const m of matches) {
    if (m.status !== 'played' || !m.score) continue;
    const h = tbl.get(m.home), a = tbl.get(m.away);
    if (!h || !a) continue;
    const [x, y] = m.score;
    h.o++; a.o++; h.ag += x; h.yg += y; a.ag += y; a.yg += x;
    if (x > y) { h.g++; a.m++; h.p += 3; } else if (x < y) { a.g++; h.m++; a.p += 3; } else { h.b++; a.b++; h.p++; a.p++; }
  }
  return [...tbl.values()].sort((p, q) => q.p - p.p || (q.ag - q.yg) - (p.ag - p.yg) || q.ag - p.ag || p.name.localeCompare(q.name, 'tr'));
}

function expandMatch(m, extra = {}) {
  return { id: m.id, date: m.date, order: m.order, home: teamByCode(m.home), away: teamByCode(m.away), ...extra };
}

// Sıradaki maç: canlı olan varsa o, yoksa bugüne kadarki ilk planlı maç.
function nextMatch() {
  const all = sortedMatches();
  const today = todayStr();
  let m = all.find(x => x.status === 'live');
  if (!m) m = all.find(x => x.status === 'scheduled' && x.date <= today);
  if (m && teamByCode(m.home) && teamByCode(m.away)) {
    const real = db.fixture.matches.find(x => x.id === m.id);
    real.status = 'live'; saveDb();
    const dayList = all.filter(x => x.date === m.date);
    const idx = dayList.findIndex(x => x.id === m.id) + 1;
    return expandMatch(m, { label: `Haftalık Lig · Günün ${idx}. maçı / ${dayList.length}`, friendly: false });
  }
  if (!db.settings.friendlyWhenIdle || db.teams.length < 2) return null;
  const pool = [...db.teams].sort(() => Math.random() - 0.5);
  return { id: 'friendly-' + uid(), home: pool[0], away: pool[1], label: 'Hazırlık Maçı · puan durumuna sayılmaz', friendly: true };
}

function upcoming(limit = 3) {
  return sortedMatches().filter(x => x.status === 'scheduled').slice(0, limit).map(m => expandMatch(m));
}

// ---------------------------------------------------------------- canlı olay yayını (SSE)
const clients = new Set();
function broadcast(obj) {
  const s = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of clients) res.write(s);
}
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20000);

let tiktokStatus = { state: 'off', user: null, detail: '' };
function setTiktokStatus(state, detail = '') {
  tiktokStatus = { ...tiktokStatus, state, detail };
  broadcast({ type: 'status', tiktok: tiktokStatus });
  console.log(`[TikTok] ${state} ${detail}`);
}

// Olayları tek biçime çevirir: {type, user, nick, ...}
function normUser(d) {
  const u = d.user || d;
  return { user: String(u.uniqueId || u.userId || 'anon'), nick: String(u.nickname || u.uniqueId || 'izleyici') };
}

// Tek bir aktif bağlantı tutulur; panelden başlatılıp durdurulabilir.
let tt = null; // { conn, username, timer, stopped, delay, counts }
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
  console.log('[TikTok] durduruldu');
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
  // Euler Stream imza anahtarı: TikTok doğrudan isteklere 403 verdiğinde bağlantı bu servis üzerinden kurulur.
  const key = eulerKey || process.env.EULER_API_KEY;
  const opts = key ? { signApiKey: key } : {};
  const conn = new Conn(username, opts);
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

  conn.on('chat', d => { count('comment'); broadcast({ type: 'comment', ...normUser(d), text: String(d.comment || '') }); });
  conn.on('like', d => { count('like'); broadcast({ type: 'like', ...normUser(d), count: Number(d.likeCount || 1) }); });
  conn.on('gift', d => {
    count('gift');
    const g = d.giftDetails || {};
    const giftType = g.giftType ?? d.giftType;
    // Seri hediyelerde (giftType 1) seri bitince tek sefer say: çift sayımı önler.
    if (giftType === 1 && !d.repeatEnd) return;
    const coins = Number(g.diamondCount ?? d.diamondCount ?? 1) || 1;
    broadcast({ type: 'gift', ...normUser(d), gift: String(g.giftName || d.giftName || 'Hediye'), coins, count: Number(d.repeatCount || 1) || 1 });
  });
  conn.on('error', () => { }); // ayrıntı connect().catch içinde tek satır raporlanır
  conn.on('disconnected', () => scheduleRetry('Bağlantı koptu'));
  conn.on('streamEnd', () => scheduleRetry('Yayın bitti'));
  connect();
}
// Panelde canlı sayaçlar için her 3 sn'de bir durum yayını
setInterval(() => { if (tt) broadcast({ type: 'status', tiktok: tiktokStatus }); }, 3000);

// ---------------------------------------------------------------- HTTP
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((ok, bad) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e6) { bad(new Error('çok büyük')); req.destroy(); } });
    req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } });
  });
}
function authed(req) {
  if (!ADMIN_KEY) return true;
  return req.headers['x-admin-key'] === ADMIN_KEY;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    // --- olay akışı
    if (p === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'status', tiktok: tiktokStatus })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // --- oyun ekranı uçları (şifresiz; yalnız okuma ve sonuç)
    if (p === '/api/next-match' && req.method === 'GET') {
      return send(res, 200, { match: nextMatch(), upcoming: upcoming(3), settings: db.settings });
    }
    if (p === '/api/result' && req.method === 'POST') {
      const b = await readBody(req);
      const m = db.fixture?.matches.find(x => x.id === b.id);
      if (m && m.status === 'live') {
        m.status = 'played';
        m.score = [Number(b.score?.[0]) || 0, Number(b.score?.[1]) || 0];
        m.scorers = Array.isArray(b.scorers) ? b.scorers.slice(0, 30) : [];
        m.mom = b.mom ? String(b.mom).slice(0, 60) : null;
        m.stats = b.stats || null;
        m.playedAt = new Date().toISOString();
        saveDb();
        broadcast({ type: 'fixture-updated' });
      }
      return send(res, 200, { ok: true, upcoming: upcoming(3) });
    }
    if (p === '/api/state' && req.method === 'GET') {
      const matches = sortedMatches();
      return send(res, 200, { settings: db.settings, teams: db.teams, fixture: db.fixture ? { ...db.fixture, matches } : null,
        standings: standings(matches), warnings: realClubWarnings(db.teams), tiktok: tiktokStatus, today: todayStr(), history: db.history.slice(-8) });
    }

    // --- yönetim uçları (ADMIN_KEY ayarlıysa şifre ister)
    if (p.startsWith('/api/') && req.method === 'POST' && !authed(req)) return send(res, 401, { error: 'Yetkisiz: x-admin-key gerekli' });

    if (p === '/api/event' && req.method === 'POST') { // test paneli olayları
      const b = await readBody(req);
      const list = Array.isArray(b) ? b : [b];
      for (const e of list.slice(0, 500)) {
        if (!['comment', 'like', 'gift', 'control'].includes(e.type)) continue;
        broadcast({ ...e, test: true });
      }
      return send(res, 200, { ok: true, n: list.length });
    }
    if (p === '/api/tiktok' && req.method === 'POST') { // panelden bağlan / kes
      const b = await readBody(req);
      if (typeof b.eulerKey === 'string' && b.eulerKey.trim()) eulerKey = b.eulerKey.trim().slice(0, 200);
      if (b.stop) await stopTikTok(); else startTikTok(b.username);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/settings' && req.method === 'POST') {
      const b = await readBody(req);
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in b) db.settings[k] = typeof DEFAULT_SETTINGS[k] === 'boolean' ? !!b[k] : Math.max(1, Number(b[k]) || DEFAULT_SETTINGS[k]);
      saveDb(); broadcast({ type: 'settings', settings: db.settings });
      return send(res, 200, { ok: true, settings: db.settings });
    }
    if (p === '/api/teams' && req.method === 'POST') {
      const b = await readBody(req);
      if (!Array.isArray(b.teams) || b.teams.length < 2) return send(res, 400, { error: 'En az 2 takım' });
      const seen = new Set(), teams = [];
      for (const t of b.teams) {
        const code = String(t.code || '').toUpperCase().replace(/[^A-ZÇĞİÖŞÜ0-9]/g, '').slice(0, 4);
        const name = String(t.name || '').trim().slice(0, 32);
        if (!code || !name || seen.has(code)) return send(res, 400, { error: `Geçersiz ya da tekrar eden kod: ${t.code}` });
        seen.add(code);
        const col = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#888888';
        teams.push({ name, code, colors: [col(t.colors?.[0]), col(t.colors?.[1])] });
      }
      db.teams = teams; saveDb();
      return send(res, 200, { ok: true, warnings: realClubWarnings(teams) });
    }
    if (p === '/api/fixture/generate' && req.method === 'POST') {
      const b = await readBody(req);
      const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(b.weekStart) ? b.weekStart : todayStr();
      const perDay = Math.min(60, Math.max(1, Number(b.perDay) || db.settings.matchesPerDay));
      if (db.fixture) db.history.push({ weekStart: db.fixture.weekStart, standings: standings(db.fixture.matches), played: db.fixture.matches.filter(m => m.status === 'played').length });
      db.fixture = generateFixture(weekStart, perDay);
      db.settings.matchesPerDay = perDay;
      saveDb(); broadcast({ type: 'fixture-updated' });
      return send(res, 200, { ok: true });
    }
    if (p === '/api/fixture/add' && req.method === 'POST') {
      const b = await readBody(req);
      if (!db.fixture) return send(res, 400, { error: 'Önce fikstür oluşturun' });
      if (!teamByCode(b.home) || !teamByCode(b.away) || b.home === b.away) return send(res, 400, { error: 'Takımları kontrol edin' });
      const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : todayStr();
      const sameDay = db.fixture.matches.filter(m => m.date === date);
      // first=true: günün sıradaki maçı olarak öne al
      const order = b.first ? Math.min(-1, ...sameDay.filter(m => m.status === 'scheduled').map(m => m.order)) - 1 : Math.max(-1, ...sameDay.map(m => m.order)) + 1;
      db.fixture.matches.push({ id: uid(), date, order, home: b.home, away: b.away, status: 'scheduled', score: null, scorers: [], mom: null });
      saveDb(); broadcast({ type: 'fixture-updated' });
      return send(res, 200, { ok: true });
    }
    if (p === '/api/fixture/delete' && req.method === 'POST') {
      const b = await readBody(req);
      if (db.fixture) db.fixture.matches = db.fixture.matches.filter(m => m.id !== b.id || m.status === 'live');
      saveDb(); broadcast({ type: 'fixture-updated' });
      return send(res, 200, { ok: true });
    }
    if (p === '/api/fixture/reset-live' && req.method === 'POST') { // yarım kalan canlı maçı tekrar planlıya al
      for (const m of db.fixture?.matches || []) if (m.status === 'live') m.status = 'scheduled';
      saveDb();
      return send(res, 200, { ok: true });
    }

    // --- statik dosyalar
    if (req.method === 'GET') {
      let f = p === '/' ? '/panel.html' : p;
      const full = path.normalize(path.join(PUBLIC, decodeURIComponent(f)));
      if (!full.startsWith(PUBLIC)) return send(res, 403, 'yasak', 'text/plain');
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return send(res, 200, fs.readFileSync(full), MIME[path.extname(full)] || 'application/octet-stream');
      }
    }
    send(res, 404, { error: 'bulunamadı' });
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Derbi Canlı hazır:`);
  console.log(`  Oyun ekranı : http://${HOST}:${PORT}/game.html   (OBS: ?obs)`);
  console.log(`  Panel       : http://${HOST}:${PORT}/`);
  if (process.env.TIKTOK_USERNAME) startTikTok(process.env.TIKTOK_USERNAME);
  else console.log('  TikTok      : kapalı. Panel > Ayarlar > TikTok bağlantısı ile kullanıcı adı girerek bağlanın.');
});
