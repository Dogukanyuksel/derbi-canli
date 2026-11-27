'use strict';
// Derbi Canlı — oyun ekranı (1080x1920 dikey). OBS / TikTok LIVE Studio'ya tarayıcı kaynağı olarak eklenir.
// Parametreler: ?obs (ses butonunu gizle)  ?mute (spiker sesi kapalı)  ?demo (sahte izleyici olayları)

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const W = 1080, H = 1920;
const Q = new URLSearchParams(location.search);
const OBS = Q.has('obs'), MUTE = Q.has('mute'), DEMO = Q.has('demo');
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

// ============================================================ yardımcılar
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIO = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const fill = (tpl, o) => tpl.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function font(px, w = 800) { ctx.font = `${w} ${px}px ${FONT}`; }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }
function fitText(text, maxW, px, w = 800) { font(px, w); while (px > 14 && ctx.measureText(text).width > maxW) { px -= 2; font(px, w); } return px; }
function wrap(text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

// Küfür / uygunsuz isim filtresi: isim ekranda ve seste okunmadan önce temizlenir.
const BAD = ['amk', 'aq', 'orospu', 'oç', 'piç', 'pic', 'sik', 'yarrak', 'yarak', 'göt', 'ibne', 'pezevenk', 'kahpe', 'amın', 'amina', 'gavat',
  'kaltak', 'fuck', 'shit', 'bitch', 'nigg', 'porn', 'sex', 'seks', 'bahis', 'bet', 'casino', 'kumar'];
function cleanName(n) {
  let s = String(n || '').normalize('NFC').replace(/[\u0000-\u001f<>]/g, '').replace(/\p{Extended_Pictographic}|️/gu, '').trim();
  const low = s.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]/g, '');
  if (!s || BAD.some(b => low.includes(b))) return 'Taraftar';
  return s.length > 14 ? s.slice(0, 13) + '…' : s;
}

// ============================================================ spiker metinleri
// İsimler cümlede ek almadan geçer (Türkçe ses uyumu hatası olmasın diye).
const L = {
  intro: ['Merhaba futbolseverler! Ben yapay zekâ spikeriniz Kayra. Bugün {h} ile {a} karşı karşıya!',
    'İyi akşamlar! Yapay zekâ spikeriniz Kayra karşınızda. {h} ve {a} sahaya çıkıyor!'],
  join: ['Yorumlara {ca} ya da {cb} yaz, takımını seç ve tribündeki yerini al!'],
  kickoff: ['Ve hakem düdüğü çaldı, maç başladı!', 'Santra yapıldı, top oyunda!', 'İkinci yarı başladı, kalan dakikalar heyecanlı geçecek!'],
  pass: ['{p} pasını verdi, {q} kontrol etti.', '{p} oyunu yönlendiriyor.', '{t} sabırla topu çeviriyor.', '{q} topla buluştu, ileri bakıyor.',
    'Kısa paslar, {t} ilerliyor.', '{p} kafasını kaldırdı, pas {q} için.', 'Orta sahada {t} oyunu kuruyor.'],
  attack: ['{t} tehlikeli bölgede!', '{p} ceza sahasına yaklaşıyor!', 'Kalabalık bir atak geliyor, dikkat!', '{p} kanattan içeri kat ediyor!'],
  lose: ['{p} araya girdi, top artık {t} takımında.', 'Top kaybı! {t} kontra arıyor.', '{p} müdahalesi yerinde, top el değiştirdi.', '{p} topu kaptı!'],
  shot: ['{p} vurdu!', '{p} şutunu çekti!', 've {p} kaleyi yokluyor!', '{p} sert vurdu!'],
  goal: ['GOOOOOL! {p} attı, {t} sevinçten çılgına döndü!', 'GOOOOL! Muhteşem bir vuruş, imza {p}!', 'Ağlar havalandı! GOOOL! Skor {sc}!'],
  save: ['Kaleci {k} gole izin vermiyor!', 'Müthiş kurtarış! {k} uzandı ve çıkardı!', '{k} yerinde, top kalecide.'],
  miss: ['Top auta gitti, az farkla dışarıda!', 'Direğin yanından! Kıl payı!', 'Şut isabetsiz, top dışarıda.'],
  corner: ['Korner! {t} bu fırsatı değerlendirebilecek mi?', 'Köşe vuruşu kazanıldı, kalabalık ceza sahası!'],
  header: ['Kafa vuruşu! {p} yükseldi!', 'Orta geldi, {p} kafayı vurdu!'],
  freekick: ['Serbest vuruş, {p} topun başında.', 'Tehlikeli bölgede frikik, {p} hazırlanıyor.'],
  foul: ['Faul! {p} sert girdi.', 'Hakem düdüğü çaldı, serbest vuruş.', '{p} rakibini düşürdü, faul.'],
  yellow: ['Sarı kart! {p} defterine yazıldı.', 'Hakem sarı kartı çıkardı, {p} dikkatli olmalı.'],
  red: ['KIRMIZI KART! {p} oyundan atıldı! {t} on kişi kaldı!', 'İkinci sarıdan kırmızı! {p} soyunma odasına gidiyor!'],
  penalty: ['PENALTI! Hakem beyaz noktayı gösterdi!', 'Penaltı kararı! Tribünler ayakta!'],
  bigattack: ['{u} desteğiyle {t} büyük atağa kalktı!', 'Tribünden büyük destek! {t} gaza bastı!', '{u} sayesinde {t} hücuma çıktı!'],
  mega: ['İnanılmaz destek! {u} sayesinde {t} penaltı fırsatı yakaladı!'],
  sub: ['Oyuncu değişikliği! {in} oyuna giriyor, {out} kenara geliyor.', '{t} değişiklik yaptı, {in} sahada!'],
  enter: ['{u} sahaya çıktı, {t} formasıyla oynuyor!', 'Kadroya yeni isim: {u}!'],
  welcome: ['{u} artık {t} tribününde!', 'Hoş geldin {u}, {t} seni bekliyordu!'],
  momentum: ['{t} bastırıyor, baskı yüzde {pc}!', 'Oyunun kontrolü {t} takımında, baskı yüzde {pc}.', '{t} tribünü coştu, baskı yüzde {pc}!'],
  idle: ['Takımını seçmek için yorumlara {ca} ya da {cb} yaz.', 'Beğeniler de takımına baskı olarak yansıyor!', 'İki takım da gol arıyor, maç dengeli.',
    'Tribünler hazır, hangi takım baskı kuracak?'],
  stoppage: ['Dördüncü hakem tabelayı kaldırdı: {n} dakika uzatma!'],
  halftime: ['İlk yarı sona erdi. Skor {sc}.', 'Hakem ilk yarıyı bitirdi, skor {sc}.'],
  fulltime: ['Ve maç bitti! {w} sahadan galip ayrılıyor, skor {sc}!'],
  draw: ['Maç berabere bitti, skor {sc}. Puanlar paylaşıldı.'],
  mom: ['Maçın oyuncusu {u}! Desteğin için teşekkürler!'],
  next: ['Sıradaki maçta {h} ile {a} karşılaşacak. Az sonra başlıyoruz!'],
};

// ============================================================ ses: tribün + düdük (WebAudio ile üretilir, telifsiz)
const Sfx = {
  ac: null, crowdG: null, master: null,
  init() {
    if (this.ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = this.ac = new AC();
    this.master = ac.createGain(); this.master.gain.value = 0.9; this.master.connect(ac.destination);
    const len = ac.sampleRate * 4, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } }
    this.noise = buf;
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.5;
    this.crowdG = ac.createGain(); this.crowdG.gain.value = 0.05;
    src.connect(bp).connect(this.crowdG).connect(this.master); src.start();
  },
  get ok() { return this.ac && this.ac.state === 'running'; },
  excite(x) { if (this.ok) this.crowdG.gain.setTargetAtTime(0.05 + clamp(x, 0, 1) * 0.22, this.ac.currentTime, 0.4); },
  whistle(n = 1, long = false) {
    if (!this.ok) return; const ac = this.ac;
    for (let i = 0; i < n; i++) {
      const t0 = ac.currentTime + i * (long ? 0.95 : 0.32), d = long && i === n - 1 ? 0.9 : 0.22;
      const o = ac.createOscillator(); o.frequency.value = 2900; const g = ac.createGain(); g.gain.value = 0;
      const lfo = ac.createOscillator(); lfo.frequency.value = 38; const lg = ac.createGain(); lg.gain.value = 0.06; lfo.connect(lg).connect(g.gain);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.12, t0 + 0.02); g.gain.setValueAtTime(0.12, t0 + d - 0.04); g.gain.linearRampToValueAtTime(0, t0 + d);
      o.connect(g).connect(this.master); o.start(t0); o.stop(t0 + d + 0.05); lfo.start(t0); lfo.stop(t0 + d + 0.05);
    }
  },
  roar(len = 3.8) {
    if (!this.ok) return; const ac = this.ac, t0 = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = this.noise;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7; bp.frequency.setValueAtTime(500, t0); bp.frequency.linearRampToValueAtTime(1100, t0 + 0.6);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.75, t0 + 0.35); g.gain.setTargetAtTime(0, t0 + len * 0.55, len * 0.25);
    s.connect(bp).connect(g).connect(this.master); s.start(t0); s.stop(t0 + len + 1);
  },
  kick() {
    if (!this.ok) return; const ac = this.ac, t0 = ac.currentTime;
    const o = ac.createOscillator(); o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.09);
    const g = ac.createGain(); g.gain.setValueAtTime(0.18, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.11);
    o.connect(g).connect(this.master); o.start(t0); o.stop(t0 + 0.13);
  },
  ding(big = false) {
    if (!this.ok) return; const ac = this.ac, t0 = ac.currentTime;
    for (const [f, dt] of big ? [[880, 0], [1320, 0.08], [1760, 0.16]] : [[1320, 0]]) {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ac.createGain(); g.gain.setValueAtTime(0, t0 + dt); g.gain.linearRampToValueAtTime(0.07, t0 + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dt + 0.5);
      o.connect(g).connect(this.master); o.start(t0 + dt); o.stop(t0 + dt + 0.55);
    }
  },
};

// ============================================================ spiker sesi (tarayıcının Türkçe sesi; yoksa sadece altyazı)
const Voice = {
  v: null, ok: 'speechSynthesis' in window, until: 0, text: '', at: -99, lastFiller: -99,
  init() {
    if (!this.ok) return;
    const choose = () => {
      const tr = speechSynthesis.getVoices().filter(v => /^tr/i.test(v.lang));
      this.v = tr.find(v => /natural|online|neural/i.test(v.name)) || tr[0] || null;
    };
    choose(); speechSynthesis.onvoiceschanged = choose;
  },
  get speaking() { return now() < this.until; },
  // prio 1: dolgu (konuşurken atlanır) · 2: önemli (araya girer) · 3: gol
  say(text, prio = 1) {
    if (prio < 2 && this.speaking) return false;
    if (prio < 2 && now() - this.lastFiller < 3.2) return false;
    if (prio < 2) this.lastFiller = now();
    this.text = text; this.at = now(); this.prio = prio;
    this.until = now() + 0.8 + text.length * 0.058;
    if (MUTE || !this.ok || !this.v || !Sfx.ok) return true;
    if (prio >= 2) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/GO+L/g, 'Goooool').replace(/%/g, 'yüzde ').replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ''));
    u.voice = this.v; u.lang = this.v.lang; u.rate = prio >= 3 ? 1.12 : 1.06; u.pitch = prio >= 3 ? 1.2 : 1.0;
    u.onend = () => { if (this.text === text) this.until = Math.min(this.until, now() + 0.2); };
    speechSynthesis.speak(u);
    return true;
  },
};
function say(key, vars = {}, prio = 1) { const t = fill(pick(L[key]), vars); return Voice.say(t, prio); }

// ============================================================ zaman ve görev zamanlayıcı
let T = 0; // oyun zamanı (sn)
const now = () => T;
let tasks = [];
const later = (sec, fn) => tasks.push({ at: T + sec, fn });

// ============================================================ durum
let S = { halfSeconds: 210, htSeconds: 40, ftSeconds: 35, introSeconds: 12 };
let match = null, upcomingList = [], waiting = true, tiktok = { state: 'off' };
let players = [[], []];
let possession = 0, carrier = null, busyUntil = 0, nextActAt = 0;
let pressure = [0, 0], shownShare = 0.5;
const ball = { x: 0.5, y: 0.5, z: 0, tr: null, trail: [] };
const favs = new Map(); // kullanıcı -> en son desteklediği takım kodu (maçlar arası)
const feed = [];       // hediye ve katılım bildirimleri
let fxList = [], parts = [], shake = 0, flash = 0;
let robot = { excitedUntil: 0, blinkAt: 2 };

const BASE = 20, HALF_LIFE = 18, LIKE_W = 0.12, BIG = 99, MEGA = 1000;

const FORM = [
  { r: 'GK', n: 1, x: .5, y: .955 },
  { r: 'DF', n: 2, x: .14, y: .79 }, { r: 'DF', n: 4, x: .38, y: .83 }, { r: 'DF', n: 5, x: .62, y: .83 }, { r: 'DF', n: 3, x: .86, y: .79 },
  { r: 'MF', n: 7, x: .16, y: .63 }, { r: 'MF', n: 8, x: .39, y: .67 }, { r: 'MF', n: 6, x: .61, y: .67 }, { r: 'MF', n: 11, x: .84, y: .63 },
  { r: 'FW', n: 9, x: .4, y: .545 }, { r: 'FW', n: 10, x: .6, y: .545 }];
const SLOT_ORDER = [9, 10, 6, 7, 5, 8, 2, 3, 1, 4, 0]; // destekçiler forvetten kaleye doğru yerleşir
const SURNAMES = ['Demir', 'Kaya', 'Yıldız', 'Aydın', 'Arslan', 'Doğan', 'Kılıç', 'Çelik', 'Şahin', 'Öztürk', 'Koç', 'Kurt', 'Polat', 'Aksoy', 'Erdem',
  'Tekin', 'Ünal', 'Güneş', 'Bulut', 'Kara', 'Avcı', 'Türk', 'Özcan', 'Ateş', 'Taş', 'Uçar', 'Sezer', 'Karaca', 'Duman', 'Bozkurt', 'Ekinci', 'Yalçın'];

const progOf = (t, y) => t === 0 ? 1 - y : y;
const yOf = (t, p) => t === 0 ? 1 - p : p;
const team = t => match.teams[t];
const tName = t => team(t).name;

function rawShare(t) { return (BASE + pressure[t]) / (2 * BASE + pressure[0] + pressure[1]); }
function share(t) {
  const k0 = Math.pow(0.9, match.reds[0]), k1 = Math.pow(0.9, match.reds[1]);
  const s0 = rawShare(0) * k0, s1 = rawShare(1) * k1;
  return (t === 0 ? s0 : s1) / (s0 + s1);
}

function makePlayers(t) {
  const tm = team(t), h = hash(tm.code);
  return FORM.map((f, i) => {
    const bx = t === 0 ? f.x : 1 - f.x, by = t === 0 ? f.y : 1 - f.y;
    return { t, i, role: f.r, num: f.n, bx, by, x: bx, y: by, run: null, user: null, nick: null,
      name: SURNAMES[(h + i * 7) % SURNAMES.length], yellow: 0, off: false, ph: Math.random() * 6.28 };
  });
}
const active = t => players[t].filter(p => !p.off);
function nearest(t, x, y, exclude = null, noGK = true) {
  let best = null, bd = 1e9;
  for (const p of active(t)) { if (p === exclude || (noGK && p.role === 'GK')) continue; const d = (p.x - x) ** 2 + ((p.y - y) * 1.2) ** 2; if (d < bd) { bd = d; best = p; } }
  return best || active(t)[0];
}
const keeper = t => players[t][0];

// ============================================================ maç kurulumu
function newMatch(m) {
  match = {
    id: m.id, label: m.label || '', friendly: !!m.friendly, teams: [m.home, m.away], score: [0, 0],
    phase: 'intro', pt: 0, half: 0, stoppage: 0, stopSaid: false, minute: 0,
    stats: { shots: [0, 0], onT: [0, 0], corners: [0, 0], fouls: [0, 0], yellow: [0, 0], red: [0, 0], poss: [0, 0] },
    reds: [0, 0], scorers: [], sup: [new Map(), new Map()], userTeam: new Map(), forced: [null, null], favor: [null, null], shotNext: [false, false],
    lastMomentum: 0, lastIdle: 0, lastWelcome: -99, lastSub: -99, subQueue: [], posted: false,
  };
  players = [makePlayers(0), makePlayers(1)];
  pressure = [0, 0]; shownShare = 0.5; tasks = []; fxList = []; feed.length = 0;
  ball.x = 0.5; ball.y = 0.5; ball.z = 0; ball.tr = null; carrier = null; possession = 0;
  // önceki maçlardan takımı tanınan izleyiciler otomatik o takımın tribününe geçer
  waiting = false;
  say('intro', { h: m.home.name, a: m.away.name }, 2);
  later(5.5, () => say('join', { ca: m.home.code, cb: m.away.code }, 2));
}

async function loadNext() {
  try {
    const r = await fetch('/api/next-match'); const j = await r.json();
    S = { ...S, ...j.settings }; upcomingList = j.upcoming || [];
    if (j.match) newMatch(j.match); else { waiting = true; match = null; setTimeout(loadNext, 15000); }
  } catch { waiting = true; setTimeout(loadNext, 5000); }
}

async function postResult() {
  if (match.posted) return; match.posted = true;
  if (match.friendly) return;
  try {
    const r = await fetch('/api/result', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: match.id, score: match.score, scorers: match.scorers.map(s => ({ team: team(s.t).code, name: s.name, minute: s.minute })), mom: match.mom, stats: match.stats }) });
    const j = await r.json(); upcomingList = j.upcoming || upcomingList;
  } catch { }
}

// ============================================================ izleyiciler
function supporter(t, user, nick) {
  const m = match.sup[t];
  if (!m.has(user)) m.set(user, { user, nick: cleanName(nick), coins: 0, likes: 0, at: T });
  return m.get(user);
}
function join(user, nick, t, announce = true) {
  const prev = match.userTeam.get(user);
  match.userTeam.set(user, t); favs.set(user, team(t).code);
  const s = supporter(t, user, nick);
  if (prev === t) return;
  if (announce) {
    pushFeed({ kind: 'join', t, text: `${s.nick} · ${team(t).code} tribününde` });
    if (T - match.lastWelcome > 9) { match.lastWelcome = T; say('welcome', { u: s.nick, t: tName(t) }, 1); }
  }
  fillSlot(t, s, false);
}
function teamOf(user, nick, autoAssign) {
  let t = match.userTeam.get(user);
  if (t !== undefined) return t;
  const fav = favs.get(user);
  if (fav === team(0).code) t = 0; else if (fav === team(1).code) t = 1;
  if (t === undefined && autoAssign) {
    t = share(0) <= share(1) ? 0 : 1; // takım seçmeden hediye atan, o an baskısı düşük tarafa yazılır
    pushFeed({ kind: 'join', t, text: `${cleanName(nick)} → ${team(t).code} (değiştirmek için yorum: ${team(1 - t).code})` });
  }
  if (t !== undefined) join(user, nick, t, false);
  return t;
}

// Sahadaki 11 isim: önce boş (varsayılan) yerler dolar; doluysa en az destek vereni çıkar.
function fillSlot(t, s, gifted) {
  if (!match || match.phase === 'ft') return;
  const ps = players[t];
  if (ps.some(p => p.user === s.user)) return;
  for (const idx of SLOT_ORDER) {
    const p = ps[idx];
    if (!p.user && !p.off) {
      p.user = s.user; p.nick = s.nick; p.name = s.nick;
      if (gifted) { pushFeed({ kind: 'enter', t, text: `${s.nick} sahada! #${p.num}` }); say('enter', { u: s.nick, t: tName(t) }, 1); }
      return;
    }
  }
  if (!gifted) return;
  let low = null;
  for (const p of ps) { if (p.off || !p.user) continue; const c = match.sup[t].get(p.user)?.coins || 0; if (!low || c < low.c) low = { p, c }; }
  if (low && s.coins > low.c) match.subQueue.push({ t, s, p: low.p });
}
function processSubs() {
  if (!match.subQueue.length || T - match.lastSub < 6) return;
  const q = match.subQueue.shift();
  if (q.p.off || q.p.user === q.s.user || players[q.t].some(p => p.user === q.s.user)) return;
  const outName = q.p.name;
  q.p.user = q.s.user; q.p.nick = q.s.nick; q.p.name = q.s.nick;
  match.lastSub = T;
  addFx('sub', { t: q.t, inn: q.s.nick, out: outName, num: q.p.num }, 3.2);
  say('sub', { in: q.s.nick, out: outName, t: tName(q.t) }, 2);
}

function pushFeed(f) { f.at = T; feed.unshift(f); if (feed.length > 5) feed.pop(); }

function effective(v) { return v <= 100 ? v : 100 + Math.sqrt(v - 100) * 10; }

function onEvent(e) {
  if (e.type === 'status') { tiktok = e.tiktok; return; }
  if (e.type === 'settings') { S = { ...S, ...e.settings }; return; }
  if (e.type === 'control') return control(e.action);
  if (!match || waiting || match.phase === 'ft') return;
  const user = String(e.user || 'anon'), nick = e.nick || user;
  if (e.type === 'comment') {
    const txt = ' ' + String(e.text || '').toLocaleUpperCase('tr').replace(/[^A-ZÇĞİÖŞÜ0-9 ]/g, ' ') + ' ';
    const hit = t => txt.includes(' ' + team(t).code + ' ') || txt.trim() === String(t + 1) || txt.includes(' ' + team(t).name.toLocaleUpperCase('tr').split(' ')[0] + ' ');
    if (hit(0) && !hit(1)) join(user, nick, 0); else if (hit(1) && !hit(0)) join(user, nick, 1);
    return;
  }
  if (e.type === 'like') {
    const n = clamp(Number(e.count) || 1, 1, 200);
    const t = teamOf(user, nick, false);
    if (t === undefined) return;
    pressure[t] += n * LIKE_W;
    supporter(t, user, nick).likes += n;
    return;
  }
  if (e.type === 'gift') {
    const coins = Math.max(1, Number(e.coins) || 1), count = clamp(Number(e.count) || 1, 1, 999);
    const v = coins * count;
    const t = teamOf(user, nick, true);
    const s = supporter(t, user, nick);
    s.coins += v;
    pressure[t] += effective(v);
    pushFeed({ kind: 'gift', t, text: `${giftIcon(e.gift)} ${s.nick} → ${team(t).code}`, extra: `${e.gift || 'Hediye'}${count > 1 ? ' x' + count : ''}`, big: v >= BIG });
    Sfx.ding(v >= BIG);
    burst(t, v);
    fillSlot(t, s, true);
    const mine = players[t].find(p => p.user === user && !p.off && p.role !== 'GK');
    if (v >= MEGA) match.forced[t] = { kind: 'pen', user, nick: s.nick };
    else if (v >= BIG && !match.forced[t]) match.forced[t] = { kind: 'big', user, nick: s.nick };
    else if (mine) match.favor[t] = mine; // küçük hediye: bağışçının oyuncusu bir sonraki pası alır
  }
}
function giftIcon(name = '') {
  const n = name.toLowerCase();
  if (/rose|gül/.test(n)) return '🌹'; if (/heart|kalp/.test(n)) return '💖'; if (/donut|doughnut/.test(n)) return '🍩';
  if (/lion|aslan/.test(n)) return '🦁'; if (/galaxy|universe/.test(n)) return '🌌'; if (/perfume/.test(n)) return '🧴'; if (/cake|pasta/.test(n)) return '🎂';
  return '🎁';
}

function control(a) {
  if (a === 'skip' && match) { match.phase = 'ft'; match.pt = S.ftSeconds; }
  if (a === 'endhalf' && match && (match.phase === 'h1' || match.phase === 'h2')) match.pt = 1e6;
  if (a === 'reload') location.reload();
  if (a === 'goal0' && match) shootFrom(0, 0.95);
  if (a === 'goal1' && match) shootFrom(1, 0.95);
  if (a === 'yellow' && match) card(nearest(1 - possession, ball.x, ball.y), false);
  if (a === 'red' && match) card(nearest(1 - possession, ball.x, ball.y), true);
}
function shootFrom(t, p) {
  if (!['h1', 'h2'].includes(match.phase) || ball.tr) return;
  possession = t; const sh = nearest(t, 0.5, yOf(t, 0.8)); carrier = sh;
  ball.x = sh.x = 0.5; ball.y = sh.y = yOf(t, 0.82); shoot(sh, p);
}

// ============================================================ oyun motoru
function travel(tx, ty, dur, arc, onArrive) {
  ball.tr = { fx: ball.x, fy: ball.y, tx, ty, t: 0, dur, arc, onArrive };
}
function nextAct(a = 0.5, b = 1.1) { nextActAt = T + rnd(a, b); }
function hold(sec) { busyUntil = Math.max(busyUntil, T + sec); }

function kickoff(t) {
  ball.x = 0.5; ball.y = 0.5; ball.z = 0; ball.tr = null;
  possession = t;
  carrier = players[t].find(p => p.num === 9 && !p.off) || nearest(t, .5, .5);
  carrier.x = 0.5; carrier.y = 0.5 + (t === 0 ? 0.015 : -0.015);
  hold(1.2); nextAct(1.2, 1.6); Sfx.whistle(1);
}

function act() {
  const a = possession, d = 1 - a;
  if (!carrier || carrier.off || carrier.t !== a) carrier = nearest(a, ball.x, ball.y);
  // Hediyeyle gelen büyük atak / penaltı: top rakipteyse önce top kazanılır
  if (match.forced[a]) { const f = match.forced[a]; match.forced[a] = null; return f.kind === 'pen' ? penalty(a, f) : bigAttack(a, f); }
  if (match.forced[d]) { return steal(d); }
  const s = share(a), prog = progOf(a, ball.y), r = Math.random();
  const pFoul = 0.055, pLose = clamp(0.27 - (s - 0.5) * 0.5, 0.07, 0.5);
  if (match.shotNext[a] && prog > 0.6) { match.shotNext[a] = false; return shoot(carrier, goalProb(s, prog) + 0.1); }
  if (prog > 0.7) {
    const pShot = clamp(0.42 + (s - 0.5) * 0.5 + (prog - 0.7), 0.2, 0.85);
    if (r < pFoul) return foul(a, d, prog);
    if (r < pFoul + pLose * 0.8) return lose(a, d);
    if (r < pFoul + pLose * 0.8 + pShot) return shoot(carrier, goalProb(s, prog));
    return pass(a, s, prog);
  }
  if (r < pFoul) return foul(a, d, prog);
  if (r < pFoul + pLose) return lose(a, d);
  return pass(a, s, prog);
}
const goalProb = (s, prog) => clamp(0.2 + (s - 0.5) * 0.42 + (prog - 0.8) * 0.6, 0.05, 0.62);

function pass(a, s, prog) {
  const back = prog > 0.25 && Math.random() < clamp(0.18 - (s - 0.5) * 0.3, 0.04, 0.3);
  let np = back ? prog - rnd(0.05, 0.12) : prog + rnd(0.06, 0.17) * (0.7 + s);
  np = clamp(np, 0.08, 0.9);
  let nx = clamp(ball.x + rnd(-0.35, 0.35), 0.1, 0.9);
  if (np > 0.75) nx = clamp(0.5 + rnd(-0.28, 0.28), 0.15, 0.85);
  const ty = yOf(a, np);
  const fav = match.favor[a]; match.favor[a] = null;
  const target = fav && !fav.off && fav !== carrier ? fav : nearest(a, nx, ty, carrier);
  const from = carrier, long = Math.abs(np - prog) > 0.16;
  target.run = { x: nx, y: ty };
  travel(nx, ty, long ? 0.78 : 0.5, long ? 0.09 : 0.015, () => { carrier = target; target.run = null; nextAct(0.5, 1.1); });
  Sfx.kick();
  if (np > 0.72 && prog <= 0.72) say('attack', { p: target.name, t: tName(a) }, 1);
  else say('pass', { p: from.name, q: target.name, t: tName(a) }, 1);
}

function lose(a, d) {
  const st = nearest(d, ball.x, ball.y);
  possession = d; carrier = st; st.run = null;
  travel(st.x, st.y, 0.25, 0, () => nextAct(0.6, 1.2));
  say('lose', { p: st.name, t: tName(d) }, 1);
}
function steal(d) { lose(1 - d, d); }

function foul(a, d, prog) {
  const fouler = nearest(d, ball.x, ball.y);
  match.stats.fouls[d]++;
  Sfx.whistle(1); hold(1.8);
  addFx('banner', { text: 'FAUL', sub: fouler.name, color: '#f59e0b' }, 1.6);
  say('foul', { p: fouler.name }, 1);
  const r = Math.random();
  if (r < 0.025) later(0.9, () => card(fouler, true));
  else if (r < 0.24) later(0.9, () => card(fouler, false));
  if (prog > 0.85 && Math.random() < 0.45) later(2.4, () => penalty(a, null));
  else if (prog > 0.66) later(2.2, () => {
    say('freekick', { p: carrier.name }, 2);
    later(1.6, () => { if (!carrier.off) shoot(carrier, goalProb(share(a), prog) * 0.55); });
  });
  else nextAct(1.9, 2.3);
}

function card(p, red) {
  if (!p || p.off) return;
  const t = p.t;
  if (!red) { p.yellow++; match.stats.yellow[t]++; if (p.yellow >= 2) red = true; }
  if (red) {
    p.off = true; match.reds[t]++; match.stats.red[t]++;
    if (carrier === p) carrier = nearest(t, ball.x, ball.y);
  }
  addFx('card', { red, name: p.name, t, second: red && p.yellow >= 2 }, 2.8);
  hold(2.4);
  Sfx.whistle(red ? 2 : 1);
  say(red ? 'red' : 'yellow', { p: p.name, t: tName(t) }, 2);
}

function shoot(shooter, goalP, kind = 'shot') {
  const a = shooter.t, d = 1 - a;
  possession = a; carrier = shooter;
  match.stats.shots[a]++;
  const r = Math.random();
  const out = r < goalP ? 'goal' : r < goalP + (1 - goalP) * 0.55 ? 'save' : 'miss';
  if (out !== 'miss') match.stats.onT[a]++;
  const tx = out === 'miss' ? 0.5 + pick([-1, 1]) * rnd(0.085, 0.15) : 0.5 + rnd(-0.045, 0.045);
  const ty = out === 'miss' ? yOf(a, 1.035) : out === 'goal' ? yOf(a, 1.02) : yOf(a, 0.965);
  if (kind !== 'header') say('shot', { p: shooter.name }, 2);
  const k = keeper(d);
  if (out === 'save') k.run = { x: tx, y: k.y }; else if (out === 'goal') k.run = { x: clamp(tx + pick([-1, 1]) * 0.07, 0.38, 0.62), y: k.y };
  Sfx.kick();
  travel(tx, ty, kind === 'pen' ? 0.4 : 0.48, kind === 'header' ? 0.02 : 0.035, () => {
    k.run = null;
    if (out === 'goal') return goal(a, shooter);
    if (out === 'save') {
      addFx('banner', { text: 'KURTARIŞ!', sub: k.name, color: '#22d3ee' }, 1.6);
      say('save', { k: k.name }, 2);
      if (Math.random() < 0.38) return later(1.0, () => corner(a));
      possession = d; carrier = k; hold(1.2); nextAct(1.2, 1.6); return;
    }
    say('miss', {}, 2);
    possession = d; carrier = k; ball.x = k.x; ball.y = k.y; hold(1.4); nextAct(1.4, 1.8);
  });
  hold(0.6);
}

function corner(a) {
  match.stats.corners[a]++;
  const cx = pick([0.02, 0.98]), cy = yOf(a, 0.995);
  ball.x = cx; ball.y = cy; ball.tr = null;
  const taker = nearest(a, cx, cy); taker.x = cx; taker.y = cy; carrier = taker; possession = a;
  addFx('banner', { text: 'KORNER', sub: tName(a), color: '#a78bfa' }, 1.5);
  say('corner', { t: tName(a) }, 2);
  hold(2.2);
  later(1.9, () => {
    const hx = 0.5 + rnd(-0.1, 0.1), hy = yOf(a, 0.915);
    const header = nearest(a, hx, hy, taker); header.run = { x: hx, y: hy };
    Sfx.kick();
    travel(hx, hy, 0.85, 0.14, () => {
      carrier = header; header.run = null;
      if (Math.random() < 0.6) { say('header', { p: header.name }, 2); shoot(header, clamp(0.13 + (share(a) - 0.5) * 0.25, 0.06, 0.3), 'header'); }
      else lose(a, 1 - a);
    });
  });
}

function penalty(a, f) {
  const d = 1 - a;
  const spot = { x: 0.5, y: yOf(a, 0.885) };
  const mine = f ? players[a].find(p => p.user === f.user && !p.off && p.role !== 'GK') : null;
  const sh = mine || players[a].find(p => p.num === 9 && !p.off) || nearest(a, spot.x, spot.y);
  possession = a; carrier = sh;
  ball.tr = null; ball.x = spot.x; ball.y = spot.y; sh.x = spot.x; sh.y = yOf(a, 0.86);
  addFx('banner', { text: 'PENALTI!', sub: f ? `${f.nick} desteğiyle` : 'Hakem beyaz noktayı gösterdi', color: '#ef4444' }, 2.2);
  if (f) say('mega', { u: f.nick, t: tName(a) }, 2); else say('penalty', {}, 2);
  Sfx.whistle(1); hold(3.4); Sfx.excite(1);
  later(3.0, () => shoot(sh, 0.76, 'pen'));
  keeper(d).x = 0.5;
}

function bigAttack(a, f) {
  const mine = players[a].find(p => p.user === f.user && !p.off && (p.role === 'FW' || p.role === 'MF'));
  const rx = rnd(0.3, 0.7), ry = yOf(a, 0.8);
  const recv = mine || nearest(a, rx, ry, carrier);
  recv.run = { x: rx, y: ry };
  addFx('banner', { text: '⚡ BÜYÜK ATAK', sub: f.nick, color: team(a).colors[0] }, 2.0);
  say('bigattack', { u: f.nick, t: tName(a) }, 2);
  Sfx.kick();
  travel(rx, ry, 0.85, 0.12, () => { carrier = recv; recv.run = null; match.shotNext[a] = true; nextAct(0.35, 0.6); });
}

function goal(a, shooter) {
  match.score[a]++;
  match.scorers.push({ t: a, name: shooter.name, minute: minuteLabel() });
  addFx('goal', { t: a, name: shooter.name, min: minuteLabel() }, 4.6);
  confetti(a, 260); shake = 26; flash = 1;
  robot.excitedUntil = T + 5;
  Sfx.roar(); Sfx.whistle(1);
  say('goal', { p: shooter.name, t: tName(a), sc: `${match.score[0]}-${match.score[1]}` }, 3);
  hold(5.6); tasks = tasks.filter(() => false);
  later(5.2, () => kickoff(1 - a));
}

// ============================================================ devreler
function minuteLabel() {
  if (!match) return '';
  const base = match.half === 2 ? 45 : 0;
  const m = Math.floor(match.pt / S.halfSeconds * 45);
  if (m >= 45) return `${base + 45}+${Math.min(m - 44, match.stoppage)}'`;
  return `${base + m + 1}'`;
}
function startHalf(h) {
  match.phase = h === 1 ? 'h1' : 'h2'; match.half = h; match.pt = 0; match.stopSaid = false;
  match.stoppage = h === 1 ? 1 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 4);
  players.forEach(ps => ps.forEach(p => { p.run = null; }));
  kickoff(h === 1 ? 0 : 1);
  say('kickoff', {}, 2);
}
function endHalf() {
  tasks = []; ball.tr = null;
  players.forEach(ps => ps.forEach(p => p.run = null));
  const sc = `${match.score[0]}-${match.score[1]}`;
  if (match.half === 1) {
    match.phase = 'ht'; match.pt = 0; Sfx.whistle(2, true);
    say('halftime', { sc }, 2);
    later(8, () => say('join', { ca: team(0).code, cb: team(1).code }, 2));
  } else {
    match.phase = 'ft'; match.pt = 0; Sfx.whistle(3, true); Sfx.roar(2.5);
    const [x, y] = match.score;
    const all = [...match.sup[0].values(), ...match.sup[1].values()].sort((p, q) => q.coins - p.coins);
    const winSide = x > y ? 0 : y > x ? 1 : -1;
    const top = (winSide >= 0 ? [...match.sup[winSide].values()].sort((p, q) => q.coins - p.coins)[0] : all[0]);
    match.mom = top && top.coins > 0 ? top.nick : (match.scorers[0]?.name || null);
    if (winSide >= 0) { say('fulltime', { w: tName(winSide), sc }, 2); confetti(winSide, 180); }
    else say('draw', { sc }, 2);
    if (match.mom) later(5.5, () => say('mom', { u: match.mom }, 2));
    later(12, () => { const n = upcomingList[0]; if (n) say('next', { h: n.home.name, a: n.away.name }, 2); });
    postResult();
  }
}

function updateMatch(dt) {
  if (!match) return;
  match.pt += dt;
  for (const k of [0, 1]) pressure[k] *= Math.pow(0.5, dt / HALF_LIFE);
  const ph = match.phase;
  if (ph === 'intro' && match.pt >= S.introSeconds) startHalf(1);
  else if (ph === 'ht' && match.pt >= S.htSeconds) startHalf(2);
  else if (ph === 'ft' && match.pt >= S.ftSeconds) { match.phase = 'done'; loadNext(); }
  else if (ph === 'h1' || ph === 'h2') {
    match.stats.poss[possession] += dt;
    const m = Math.floor(match.pt / S.halfSeconds * 45);
    if (m >= 45 && !match.stopSaid) { match.stopSaid = true; addFx('banner', { text: `UZATMA +${match.stoppage}`, sub: 'dakika', color: '#10b981' }, 2); say('stoppage', { n: match.stoppage }, 2); }
    const len = S.halfSeconds * (45 + match.stoppage) / 45;
    if (match.pt >= len && !ball.tr && T >= busyUntil && !tasks.length) { endHalf(); return; }
    if (!ball.tr && T >= busyUntil && T >= nextActAt && !tasks.length && match.pt < len) act();
    processSubs();
    // spiker yorumları: baskı ve hatırlatma
    const s0 = share(0);
    if (T - match.lastMomentum > 24 && Math.abs(s0 - 0.5) > 0.15) {
      const t = s0 > 0.5 ? 0 : 1;
      if (say('momentum', { t: tName(t), pc: Math.round(share(t) * 100) }, 1)) match.lastMomentum = T;
    }
    if (T - match.lastIdle > 45) { if (say('idle', { ca: team(0).code, cb: team(1).code }, 1)) match.lastIdle = T; }
  }
  // görevler
  const due = tasks.filter(k => k.at <= T); tasks = tasks.filter(k => k.at > T);
  for (const k of due) k.fn();
  // top hareketi
  if (ball.tr) {
    const b = ball.tr; b.t += dt / b.dur; const e = easeIO(b.t);
    ball.x = lerp(b.fx, b.tx, e); ball.y = lerp(b.fy, b.ty, e); ball.z = Math.sin(Math.PI * clamp(b.t, 0, 1)) * b.arc;
    if (b.t >= 1) { ball.tr = null; ball.z = 0; b.onArrive && b.onArrive(); }
  } else if (carrier && (ph === 'h1' || ph === 'h2') && T >= busyUntil) {
    const dir = possession === 0 ? -1 : 1;
    if (progOf(possession, ball.y) < 0.88) ball.y += dir * dt * 0.03 * (0.5 + share(possession));
    ball.x += (0.5 - ball.x) * dt * 0.08;
  }
  ball.trail.unshift({ x: ball.x, y: ball.y, z: ball.z }); if (ball.trail.length > 8) ball.trail.pop();
  updatePlayers(dt);
  shownShare += (share(0) - shownShare) * Math.min(1, dt * 3);
  Sfx.excite(Math.abs(shownShare - 0.5) * 1.6 + (ball.tr && ball.tr.dur < 0.5 ? 0.3 : 0) + progExcite());
}
function progExcite() { if (!match || !['h1', 'h2'].includes(match.phase)) return 0; const p = progOf(possession, ball.y); return p > 0.75 ? 0.35 : 0; }

function updatePlayers(dt) {
  const bx = ball.x, by = ball.y, live = match && ['h1', 'h2'].includes(match.phase);
  for (const t of [0, 1]) {
    const att = possession === t, dir = t === 0 ? -1 : 1;
    const presser = live && !att ? nearest(t, bx, by) : null;
    for (const p of players[t]) {
      if (p.off) continue;
      let tx, ty, fast = false;
      if (!live) { tx = p.bx + Math.sin(T * 0.5 + p.ph) * 0.01; ty = p.by + Math.cos(T * 0.4 + p.ph) * 0.01; }
      else if (p === carrier && !ball.tr) { tx = ball.x; ty = ball.y - dir * 0.012; fast = true; }
      else if (p.run) { tx = p.run.x; ty = p.run.y; fast = true; }
      else if (p.role === 'GK') { tx = 0.5 + (bx - 0.5) * 0.25; ty = p.by; }
      else if (p === presser) { tx = bx; ty = by - dir * 0.03; fast = true; }
      else {
        ty = p.by + (by - 0.5) * 0.6 + (att ? dir * 0.05 : -dir * 0.02);
        tx = p.bx + (bx - 0.5) * 0.32;
        tx += Math.sin(T * 0.7 + p.ph) * 0.015; ty += Math.cos(T * 0.6 + p.ph) * 0.012;
        if (t === 1) ty = Math.max(ty, 0.05 + p.by * 0.3); else ty = Math.min(ty, 0.95 - (1 - p.by) * 0.3);
      }
      tx = clamp(tx, 0.03, 0.97); ty = clamp(ty, 0.02, 0.98);
      const k = Math.min(1, dt * (fast ? 3.4 : 1.7));
      p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
    }
  }
}

// ============================================================ efektler
function addFx(kind, data, dur) { fxList.push({ kind, data, t: 0, dur }); }
function confetti(t, n) {
  const c = team(t).colors;
  for (let i = 0; i < n; i++) parts.push({ x: rnd(0, W), y: rnd(-200, -10), vx: rnd(-120, 120), vy: rnd(200, 520), r: rnd(0, 6.28), vr: rnd(-8, 8),
    w: rnd(10, 22), h: rnd(6, 12), c: Math.random() < 0.5 ? c[0] : c[1], life: rnd(3, 5.5), kind: 'conf' });
}
function burst(t, v) {
  const c = team(t).colors[0], n = clamp(Math.round(6 + Math.sqrt(v) * 3), 6, 90);
  const x0 = t === 0 ? 200 : 880, y0 = 330;
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), sp = rnd(80, 380); parts.push({ x: x0, y: y0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0, vr: 0, w: rnd(4, 9), h: 0, c, life: rnd(0.6, 1.4), kind: 'spark' }); }
}
function updateParts(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.kind === 'conf') { p.vx *= 0.99; p.x += Math.sin(p.y * 0.02) * 0.8; } else { p.vx *= 0.92; p.vy *= 0.92; } }
  parts = parts.filter(p => p.life > 0 && p.y < H + 40);
  for (const f of fxList) f.t += dt; fxList = fxList.filter(f => f.t < f.dur);
  shake *= Math.pow(0.02, dt); flash = Math.max(0, flash - dt * 2.5);
}

// ============================================================ çizim: saha (perspektifli, önbellekli)
const PITCH = { cx: 522, y: 420, h: 740, w: 900, far: 0.72 };
function proj(nx, ny) { const s = lerp(PITCH.far, 1, ny); return { x: PITCH.cx + (nx - 0.5) * PITCH.w * s, y: PITCH.y + ny * PITCH.h, s }; }
let pitchCache = null, bgCache = null;
function poly(pts) { const c = ctxRef.c; c.beginPath(); pts.forEach((p, i) => { const q = proj(p[0], p[1]); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.closePath(); }
function line(pts) { const c = ctxRef.c; c.beginPath(); pts.forEach((p, i) => { const q = proj(p[0], p[1]); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.stroke(); }
function ellipse(cx, cy, rx, ry, a0 = 0, a1 = 6.2832) { const pts = []; for (let i = 0; i <= 48; i++) { const a = a0 + (a1 - a0) * i / 48; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return pts; }

function buildCaches() {
  // arka plan: gece stadı
  bgCache = document.createElement('canvas'); bgCache.width = W; bgCache.height = H;
  let c = bgCache.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#070b1a'); g.addColorStop(0.5, '#0b1228'); g.addColorStop(1, '#05070d');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (const [x, y] of [[120, 380], [960, 380]]) { const rg = c.createRadialGradient(x, y, 10, x, y, 520); rg.addColorStop(0, 'rgba(180,210,255,0.22)'); rg.addColorStop(1, 'rgba(180,210,255,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H); }
  // saha
  pitchCache = document.createElement('canvas'); pitchCache.width = W; pitchCache.height = H;
  c = pitchCache.getContext('2d');
  // geçici olarak ana ctx yerine önbellek bağlamına çiz
  const draw = (cc) => {
    const old = ctxRef.c; ctxRef.c = cc;
    poly([[-0.07, -0.05], [1.07, -0.05], [1.07, 1.04], [-0.07, 1.04]]); cc.fillStyle = '#12592f'; cc.fill();
    for (let i = 0; i < 14; i++) { const y0 = -0.05 + i * 1.09 / 14, y1 = y0 + 1.09 / 14; poly([[-0.07, y0], [1.07, y0], [1.07, y1], [-0.07, y1]]); cc.fillStyle = i % 2 ? '#1a7a3f' : '#178a44'; cc.fill(); }
    cc.strokeStyle = 'rgba(255,255,255,0.88)'; cc.lineWidth = 4; cc.lineJoin = 'round';
    poly([[0, 0], [1, 0], [1, 1], [0, 1]]); cc.stroke();
    line([[0, 0.5], [1, 0.5]]);
    const rx = 95 / PITCH.w, ry = 95 / PITCH.h;
    line(ellipse(0.5, 0.5, rx, ry));
    for (const top of [true, false]) {
      const Y = v => top ? v : 1 - v;
      line([[0.2, Y(0)], [0.2, Y(0.17)], [0.8, Y(0.17)], [0.8, Y(0)]]);
      line([[0.36, Y(0)], [0.36, Y(0.06)], [0.64, Y(0.06)], [0.64, Y(0)]]);
      const sp = proj(0.5, Y(0.115)); cc.fillStyle = '#fff'; cc.beginPath(); cc.arc(sp.x, sp.y, 4 * sp.s, 0, 7); cc.fill();
      line(top ? ellipse(0.5, 0.115, rx * 0.95, ry * 0.95, 0.65, 2.49) : ellipse(0.5, 0.885, rx * 0.95, ry * 0.95, 3.79, 5.63));
    }
    const sp = proj(0.5, 0.5); cc.beginPath(); cc.arc(sp.x, sp.y, 4, 0, 7); cc.fill();
    // kaleler
    for (const top of [true, false]) {
      const y = top ? 0 : 1, a = proj(0.44, y), b = proj(0.56, y), hgt = 46 * a.s;
      cc.strokeStyle = 'rgba(255,255,255,0.35)'; cc.lineWidth = 1.5;
      for (let i = 1; i < 8; i++) { const x = lerp(a.x, b.x, i / 8); cc.beginPath(); cc.moveTo(x, a.y); cc.lineTo(x, a.y - hgt); cc.stroke(); }
      for (let i = 1; i < 4; i++) { const yy = a.y - hgt * i / 4; cc.beginPath(); cc.moveTo(a.x, yy); cc.lineTo(b.x, yy); cc.stroke(); }
      cc.strokeStyle = '#ffffff'; cc.lineWidth = 6 * a.s;
      cc.beginPath(); cc.moveTo(a.x, a.y); cc.lineTo(a.x, a.y - hgt); cc.lineTo(b.x, b.y - hgt); cc.lineTo(b.x, b.y); cc.stroke();
    }
    // vinyet
    const vg = cc.createRadialGradient(PITCH.cx, 800, 200, PITCH.cx, 800, 700); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    cc.fillStyle = vg; poly([[-0.07, -0.05], [1.07, -0.05], [1.07, 1.04], [-0.07, 1.04]]); cc.fill();
    ctxRef.c = old;
  };
  draw(c);
}
// poly/line fonksiyonları için hedef bağlam (önbellek çizerken başka canvas'a yönelir)
const ctxRef = { c: ctx };

// ============================================================ çizim: tribün
let crowd = null;
function buildCrowd() {
  crowd = [];
  for (let i = 0; i < 900; i++) {
    const y = rnd(300, 1180), q = proj(0, clamp((y - PITCH.y) / PITCH.h, -0.1, 1.05)), q2 = proj(1, clamp((y - PITCH.y) / PITCH.h, -0.1, 1.05));
    let x;
    if (y < PITCH.y - 50) x = rnd(30, 1040);
    else { const leftEdge = q.x - 70, rightEdge = q2.x + 70; x = Math.random() < 0.5 ? rnd(10, Math.max(12, leftEdge)) : rnd(Math.min(1068, rightEdge), 1070); }
    crowd.push({ x, y, side: x < PITCH.cx ? 0 : 1, ph: rnd(0, 6.28), r: rnd(3, 6) });
  }
}
function drawCrowd() {
  const ex = Math.abs(shownShare - 0.5) * 2;
  const gfx = fxList.find(f => f.kind === 'goal');
  for (const d of crowd) {
    const t = match ? d.side : 0;
    const col = match ? team(t).colors[(d.ph > 3.14) ? 0 : 1] : '#8899bb';
    const jump = gfx && gfx.data.t === t ? Math.abs(Math.sin(T * 9 + d.ph)) * 12 : Math.sin(T * 2 + d.ph) * (1 + ex * 3);
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(T * 1.3 + d.ph * 3) ** 2;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(d.x, d.y - jump, d.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ============================================================ çizim: oyuncular ve top
function drawPlayers() {
  const list = [];
  for (const t of [0, 1]) for (const p of players[t]) if (!p.off) list.push(p);
  list.sort((a, b) => a.y - b.y);
  for (const p of list) {
    const q = proj(p.x, p.y), r = 17 * q.s, c = team(p.t).colors;
    const gk = p.role === 'GK';
    const body = gk ? (p.t === 0 ? '#22c55e' : '#f97316') : c[0], trim = gk ? '#111' : c[1];
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(q.x, q.y + r * 0.9, r * 1.1, r * 0.45, 0, 0, 7); ctx.fill();
    if (p === carrier && match && ['h1', 'h2'].includes(match.phase)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(q.x, q.y + r * 0.9, r * 1.6, r * 0.7, 0, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
    ctx.lineWidth = 3.5 * q.s; ctx.strokeStyle = trim; ctx.stroke();
    font(Math.round(15 * q.s), 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = lum(body) > 0.6 ? '#111' : '#fff'; ctx.fillText(p.num, q.x, q.y + 1);
    if (p.user || p === carrier) {
      const label = p.yellow ? `🟨 ${p.name}` : p.name;
      font(Math.round(17 * q.s), 800);
      const w = ctx.measureText(label).width + 14;
      ctx.fillStyle = p.user ? hexA(c[0], 0.92) : 'rgba(0,0,0,0.55)';
      rr(q.x - w / 2, q.y - r - 30 * q.s, w, 24 * q.s, 8); ctx.fill();
      ctx.fillStyle = p.user ? (lum(c[0]) > 0.6 ? '#111' : '#fff') : '#fff';
      ctx.fillText(label, q.x, q.y - r - 18 * q.s);
    }
  }
}
function drawBall() {
  ball.trail.forEach((b, i) => {
    if (!ball.tr || i === 0) return; const q = proj(b.x, b.y);
    ctx.fillStyle = `rgba(255,255,255,${0.18 * (1 - i / 8)})`; ctx.beginPath(); ctx.arc(q.x, q.y - b.z * 320 * q.s, 8 * q.s, 0, 7); ctx.fill();
  });
  const q = proj(ball.x, ball.y), lift = ball.z * 320 * q.s, r = 10 * q.s;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(q.x, q.y + 4, r * (1 - ball.z), r * 0.45, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(q.x - r * 0.3, q.y - lift - r * 0.3, 1, q.x, q.y - lift, r);
  g.addColorStop(0, '#fff'); g.addColorStop(1, '#c9ced6');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y - lift, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(q.x + r * 0.15, q.y - lift - r * 0.1, r * 0.32, 0, 7); ctx.fill();
}

// ============================================================ çizim: skor tabelası ve baskı çubuğu
function drawScoreboard() {
  const x = 40, y = 140, w = 960, h = 150;
  ctx.fillStyle = 'rgba(8,12,28,0.88)'; rr(x, y, w, h, 26); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; ctx.stroke();
  font(22, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(match.label, x + 28, y + 26);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x + w - 118, y + 26, 7 + Math.sin(T * 4) * 1.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; font(22, 900); ctx.fillText('CANLI', x + w - 30, y + 27);
  for (const t of [0, 1]) {
    const tm = team(t), cx0 = t === 0 ? x + 40 : x + w - 40, al = t === 0 ? 'left' : 'right';
    const chipX = t === 0 ? cx0 : cx0 - 70;
    ctx.fillStyle = tm.colors[0]; rr(chipX, y + 52, 70, 70, 18); ctx.fill();
    ctx.fillStyle = tm.colors[1]; rr(chipX, y + 100, 70, 22, [0, 0, 18, 18]); ctx.fill();
    font(26, 900); ctx.textAlign = 'center'; ctx.fillStyle = lum(tm.colors[0]) > 0.6 ? '#111' : '#fff'; ctx.fillText(tm.code, chipX + 35, y + 78);
    ctx.textAlign = al; ctx.fillStyle = '#fff';
    const nx = t === 0 ? chipX + 88 : chipX - 18;
    fitText(tm.name, 205, 32, 900); ctx.fillText(tm.name, nx, y + 80);
    font(20, 700); ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`yorum: ${tm.code}`, nx, y + 113);
  }
  ctx.textAlign = 'center'; font(84, 900); ctx.fillStyle = '#fff';
  ctx.fillText(`${match.score[0]} - ${match.score[1]}`, x + w / 2, y + 84);
  const ph = match.phase;
  const clock = ph === 'intro' ? 'MAÇ ÖNCESİ' : ph === 'ht' ? 'DEVRE ARASI' : (ph === 'ft' || ph === 'done') ? 'MAÇ SONU' : minuteLabel();
  font(26, 800); ctx.fillStyle = ph === 'h1' || ph === 'h2' ? '#22d3ee' : '#fbbf24'; ctx.fillText(clock, x + w / 2, y + 132);
}

function drawMomentum() {
  const x = 40, y = 306, w = 960, h = 54, s = shownShare;
  const c0 = team(0).colors[0], c1 = team(1).colors[0];
  ctx.save(); rr(x, y, w, h, 27); ctx.clip();
  ctx.fillStyle = c0; ctx.fillRect(x, y, w * s, h);
  ctx.fillStyle = c1; ctx.fillRect(x + w * s, y, w * (1 - s), h);
  const gl = ctx.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, 'rgba(255,255,255,0.25)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = gl; ctx.fillRect(x, y, w, h);
  // akan ışık
  const sx = x + ((T * 260) % (w + 200)) - 100;
  const sh = ctx.createLinearGradient(sx - 80, 0, sx + 80, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.18)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.fillRect(x + w * s - 3, y - 6, 6, h + 12);
  font(28, 900); ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillStyle = lum(c0) > 0.6 ? '#111' : '#fff'; ctx.fillText(`%${Math.round(s * 100)}`, x + 22, y + h / 2 + 1);
  ctx.textAlign = 'right'; ctx.fillStyle = lum(c1) > 0.6 ? '#111' : '#fff'; ctx.fillText(`%${Math.round((1 - s) * 100)}`, x + w - 22, y + h / 2 + 1);
  ctx.textAlign = 'center'; font(20, 900); ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(x + w / 2 - 70, y + h - 4, 140, 28, 10); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText('BASKI', x + w / 2, y + h + 10);
}

function drawFeed() {
  let y = 440;
  for (const f of feed) {
    const age = T - f.at; if (age > 7) continue;
    const a = clamp(1 - (age - 6), 0, 1) * clamp(age * 5, 0, 1);
    ctx.globalAlpha = a;
    const c = team(f.t).colors[0];
    font(f.big ? 26 : 22, 800);
    const txt = f.text + (f.extra ? '  ·  ' + f.extra : '');
    const w = Math.min(ctx.measureText(txt).width + 36, 700);
    const x = 50 - (1 - clamp(age * 4, 0, 1)) * 60;
    ctx.fillStyle = f.kind === 'gift' ? hexA(c, 0.9) : 'rgba(0,0,0,0.55)'; rr(x, y, w, f.big ? 48 : 40, 20); ctx.fill();
    if (f.big) { ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = f.kind === 'gift' ? (lum(c) > 0.6 ? '#111' : '#fff') : 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + 18, y + (f.big ? 25 : 21), 680);
    y += f.big ? 56 : 48;
  }
  ctx.globalAlpha = 1;
}

// ============================================================ çizim: yapay zekâ spiker figürü
function drawRobot(cx, cy) {
  const talking = Voice.speaking, exc = T < robot.excitedUntil;
  const bob = Math.sin(T * 2) * 3 + (exc ? Math.abs(Math.sin(T * 10)) * -10 : 0);
  // gövde (ceket)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.moveTo(cx - 120, cy + 150); ctx.quadraticCurveTo(cx - 115, cy + 40 + bob, cx - 60, cy + 30 + bob); ctx.lineTo(cx + 60, cy + 30 + bob); ctx.quadraticCurveTo(cx + 115, cy + 40 + bob, cx + 120, cy + 150); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(cx - 30, cy + 30 + bob); ctx.lineTo(cx, cy + 90 + bob); ctx.lineTo(cx + 30, cy + 30 + bob); ctx.fill();
  ctx.fillStyle = '#ff3d6e'; ctx.beginPath(); ctx.moveTo(cx - 9, cy + 38 + bob); ctx.lineTo(cx + 9, cy + 38 + bob); ctx.lineTo(cx + 13, cy + 100 + bob); ctx.lineTo(cx, cy + 112 + bob); ctx.lineTo(cx - 13, cy + 100 + bob); ctx.fill();
  // kollar
  ctx.strokeStyle = '#1e293b'; ctx.lineCap = 'round'; ctx.lineWidth = 30;
  for (const sgn of [-1, 1]) {
    const sx = cx + sgn * 92, sy = cy + 60 + bob;
    const up = exc ? 1 : 0, wave = exc ? Math.sin(T * 12 + sgn) * 0.3 : Math.sin(T * 1.5 + sgn) * 0.05;
    const ex = sx + sgn * lerp(30, 50, up), ey = sy + lerp(60, -70, up) + wave * 30;
    const hx = ex + sgn * lerp(-10, 10, up), hy = ey + lerp(40, -60, up);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(hx, hy, 17, 0, 7); ctx.fill();
  }
  // boyun
  ctx.fillStyle = '#94a3b8'; ctx.fillRect(cx - 20, cy + 10 + bob, 40, 26);
  // kafa
  const hy = cy - 70 + bob;
  const hg = ctx.createLinearGradient(cx - 90, hy - 70, cx + 90, hy + 70); hg.addColorStop(0, '#f1f5f9'); hg.addColorStop(1, '#94a3b8');
  ctx.fillStyle = hg; rr(cx - 92, hy - 72, 184, 150, 48); ctx.fill();
  // anten
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, hy - 72); ctx.lineTo(cx, hy - 104); ctx.stroke();
  ctx.fillStyle = (Math.sin(T * 5) > 0 || exc) ? '#ff3d6e' : '#7f1d1d'; ctx.beginPath(); ctx.arc(cx, hy - 110, 10, 0, 7); ctx.fill();
  // ekran yüz
  ctx.fillStyle = '#0b1020'; rr(cx - 74, hy - 50, 148, 106, 30); ctx.fill();
  const eyeC = exc ? '#fde047' : '#22d3ee';
  if (T > robot.blinkAt) { robot.blinkAt = T + rnd(2.5, 5); robot.blinkEnd = T + 0.14; }
  const blink = T < (robot.blinkEnd || 0);
  ctx.fillStyle = eyeC; ctx.strokeStyle = eyeC; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * 32, ey = hy - 14;
    if (exc) { ctx.beginPath(); ctx.moveTo(ex - 14, ey + 6); ctx.lineTo(ex, ey - 8); ctx.lineTo(ex + 14, ey + 6); ctx.stroke(); }
    else if (blink) { ctx.fillRect(ex - 14, ey - 2, 28, 5); }
    else { rr(ex - 12, ey - 14, 24, 28, 9); ctx.fill(); }
  }
  // ağız: konuşurken ses dalgası
  const bars = 9;
  for (let i = 0; i < bars; i++) {
    const amp = talking ? (0.35 + 0.65 * Math.abs(Math.sin(T * 17 + i * 1.3) * Math.sin(T * 7.3 + i))) : 0.12;
    const bh = 4 + amp * (exc ? 30 : 22);
    ctx.fillStyle = eyeC; ctx.globalAlpha = 0.85;
    rr(cx - 44 + i * 10, hy + 30 - bh / 2, 6, bh, 3); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // kulaklık + mikrofon
  ctx.strokeStyle = '#111827'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, hy - 10, 102, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  for (const sgn of [-1, 1]) { ctx.fillStyle = '#111827'; rr(cx + sgn * 98 - 16, hy - 34, 32, 56, 12); ctx.fill(); ctx.fillStyle = '#ff3d6e'; rr(cx + sgn * 98 - 6, hy - 20, 12, 28, 6); ctx.fill(); }
  ctx.strokeStyle = '#111827'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx - 98, hy + 18); ctx.quadraticCurveTo(cx - 90, hy + 62, cx - 40, hy + 60); ctx.stroke();
  ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(cx - 36, hy + 60, 11, 0, 7); ctx.fill();
  // masa
  ctx.fillStyle = '#0f172a'; rr(cx - 150, cy + 120, 300, 46, 14); ctx.fill();
  ctx.fillStyle = '#ff3d6e'; rr(cx - 60, cy + 128, 120, 30, 9); ctx.fill();
  font(20, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('YZ SPİKER', cx, cy + 144);
}

function drawBooth() {
  const x = 40, y = 1190, w = 960, h = 320;
  ctx.fillStyle = 'rgba(8,12,28,0.82)'; rr(x, y, w, h, 30); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; ctx.stroke();
  drawRobot(x + 165, y + 150);
  // konuşma balonu
  const bx = x + 330, by = y + 34, bw = 600, bh = 210;
  const age = T - Voice.at, pop = easeOut(age * 4);
  ctx.save(); ctx.translate(bx, by + bh / 2); ctx.scale(lerp(0.92, 1, pop), lerp(0.92, 1, pop)); ctx.translate(-bx, -(by + bh / 2));
  ctx.fillStyle = Voice.prio >= 3 && age < 5 ? '#fde047' : '#f8fafc';
  rr(bx, by, bw, bh, 26); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx, by + 80); ctx.lineTo(bx - 26, by + 104); ctx.lineTo(bx, by + 122); ctx.fill();
  ctx.fillStyle = '#0b1020'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  let px = 40; font(px, 800); let lines = wrap(Voice.text || 'Merhaba! Takımını seçmek için yorumlara takım kodunu yaz.', bw - 52);
  while (lines.length > 4 && px > 26) { px -= 3; font(px, 800); lines = wrap(Voice.text, bw - 52); }
  const lh = px * 1.22, top = by + (bh - lines.length * lh) / 2;
  lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, bx + 26, top + i * lh));
  ctx.restore();
  font(19, 700); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Kayra · yapay zekâ spiker · yorumlar otomatik üretilir', bx, y + h - 34);
}

function drawJoinBar() {
  const y = 1528;
  for (const t of [0, 1]) {
    const tm = team(t), x = t === 0 ? 40 : 548, w = 452, h = 76;
    ctx.fillStyle = hexA(tm.colors[0], 0.95); rr(x, y, w, h, 22); ctx.fill();
    ctx.strokeStyle = tm.colors[1]; ctx.lineWidth = 3; ctx.stroke();
    const fg = lum(tm.colors[0]) > 0.6 ? '#111' : '#fff';
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    font(22, 700); ctx.fillText('yorumlara yaz', x + w / 2, y + 22);
    font(34, 900); ctx.fillText(`${tm.code}  →  ${tm.name}`, x + w / 2, y + 52, w - 30);
  }
  font(23, 800); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'center';
  ctx.fillText('❤️ Beğeni ve 🎁 hediye takımına BASKI verir · büyük hediye = BÜYÜK ATAK', W / 2 - 18, y + 108);
  font(18, 600); ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('Hediyeler yalnızca oyun içi etki yaratır · para veya ödül verilmez · 18+ · kurgusal takımlar', W / 2 - 18, y + 140);
  // en çok destek verenler
  for (const t of [0, 1]) {
    const top = [...match.sup[t].values()].filter(s => s.coins > 0).sort((a, b) => b.coins - a.coins).slice(0, 3);
    const x = t === 0 ? 60 : 568;
    font(20, 800); ctx.textAlign = 'left'; ctx.fillStyle = team(t).colors[0] === '#0b2545' ? '#3ad0ff' : team(t).colors[0];
    ctx.fillText(`${team(t).code} · en çok destek`, x, y + 186);
    top.forEach((s, i) => { font(22, 700); ctx.fillStyle = '#fff'; ctx.fillText(`${['🥇', '🥈', '🥉'][i]} ${s.nick}  ${s.coins}`, x, y + 222 + i * 32); });
    if (!top.length) { font(20, 600); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('henüz yok', x, y + 222); }
  }
}

// ============================================================ çizim: tam ekran anlar
function panel(y, h) { ctx.fillStyle = 'rgba(5,8,20,0.86)'; rr(70, y, 940, h, 34); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke(); }
function crest(t, cx, cy, r) {
  const c = team(t).colors;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  ctx.fillStyle = c[0]; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = c[1]; for (let i = -3; i < 4; i += 2) ctx.fillRect(cx + i * r / 3.5 - r / 7, cy - r, r / 3.5, r * 2);
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(cx - r * 0.75, cy - 26, r * 1.5, 52, 14); ctx.fill();
  font(38, 900); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(team(t).code, cx, cy + 2);
}
function statRows(y) {
  const st = match.stats, tot = st.poss[0] + st.poss[1] || 1;
  const rows = [['Topla oynama', `%${Math.round(st.poss[0] / tot * 100)}`, `%${Math.round(st.poss[1] / tot * 100)}`],
    ['Şut', st.shots[0], st.shots[1]], ['İsabetli şut', st.onT[0], st.onT[1]], ['Korner', st.corners[0], st.corners[1]],
    ['Faul', st.fouls[0], st.fouls[1]], ['Kart', `${st.yellow[0]}🟨 ${st.red[0]}🟥`, `${st.yellow[1]}🟨 ${st.red[1]}🟥`]];
  rows.forEach((r, i) => {
    const yy = y + i * 50;
    font(28, 900); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(r[1], 140, yy);
    ctx.textAlign = 'right'; ctx.fillText(r[2], 940, yy);
    font(24, 700); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText(r[0], 540, yy);
  });
}
function drawPhaseOverlay() {
  const ph = match.phase;
  ctx.textBaseline = 'middle';
  if (ph === 'intro') {
    const left = Math.max(0, Math.ceil(S.introSeconds - match.pt));
    panel(440, 700);
    font(30, 800); ctx.fillStyle = '#22d3ee'; ctx.textAlign = 'center'; ctx.fillText(match.label.toLocaleUpperCase('tr'), 540, 500);
    const e = easeOut(match.pt * 1.5);
    crest(0, lerp(-100, 300, e), 680, 120); crest(1, lerp(1180, 780, e), 680, 120);
    font(74, 900); ctx.fillStyle = '#fff'; ctx.fillText('VS', 540, 680);
    fitText(team(0).name, 380, 34); ctx.fillText(team(0).name, 300, 850);
    fitText(team(1).name, 380, 34); ctx.fillText(team(1).name, 780, 850);
    font(26, 700); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('Takımını seç: yorumlara takım kodunu yaz', 540, 940);
    font(110, 900); ctx.fillStyle = '#fde047'; ctx.save(); ctx.translate(540, 1050); const pz = 1 + 0.15 * (1 - ((match.pt % 1))); ctx.scale(pz, pz); ctx.fillText(left || 'BAŞLA', 0, 0); ctx.restore();
  }
  if (ph === 'ht') {
    panel(440, 700);
    font(52, 900); ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center'; ctx.fillText('DEVRE ARASI', 540, 520);
    font(90, 900); ctx.fillStyle = '#fff'; ctx.fillText(`${match.score[0]} - ${match.score[1]}`, 540, 620);
    statRows(720);
    font(26, 700); ctx.fillStyle = '#22d3ee'; ctx.textAlign = 'center';
    ctx.fillText(`İkinci yarı ${Math.max(0, Math.ceil(S.htSeconds - match.pt))} sn sonra`, 540, 1100);
  }
  if (ph === 'ft' || ph === 'done') {
    panel(430, 730);
    font(48, 900); ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center'; ctx.fillText('MAÇ SONU', 540, 500);
    crest(0, 220, 610, 70); crest(1, 860, 610, 70);
    font(110, 900); ctx.fillStyle = '#fff'; ctx.fillText(`${match.score[0]} - ${match.score[1]}`, 540, 615);
    font(22, 700); ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const t of [0, 1]) {
      const list = match.scorers.filter(s => s.t === t).map(s => `⚽ ${s.name} ${s.minute}`).slice(0, 4);
      ctx.textAlign = t === 0 ? 'left' : 'right';
      list.forEach((l, i) => ctx.fillText(l, t === 0 ? 110 : 970, 720 + i * 32));
    }
    if (match.mom) {
      ctx.fillStyle = 'rgba(253,224,71,0.15)'; rr(170, 860, 740, 80, 20); ctx.fill();
      font(22, 700); ctx.fillStyle = '#fde047'; ctx.textAlign = 'center'; ctx.fillText('MAÇIN OYUNCUSU', 540, 882);
      font(34, 900); ctx.fillStyle = '#fff'; ctx.fillText(match.mom, 540, 918);
    }
    const n = upcomingList[0];
    font(24, 700); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'center';
    ctx.fillText(match.friendly ? 'Hazırlık maçı · puan durumuna sayılmadı' : 'Sonuç fikstüre işlendi', 540, 990);
    if (n) { font(30, 900); ctx.fillStyle = '#22d3ee'; ctx.fillText(`Sıradaki: ${n.home.code} - ${n.away.code}`, 540, 1050); font(24, 700); ctx.fillStyle = '#fff'; ctx.fillText(`${n.home.name} - ${n.away.name}`, 540, 1090); }
    font(22, 700); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText(`Yeni maç ${Math.max(0, Math.ceil(S.ftSeconds - match.pt))} sn sonra`, 540, 1130);
  }
}

function drawFx() {
  for (const f of fxList) {
    const p = f.t / f.dur;
    if (f.kind === 'goal') {
      const c = team(f.data.t).colors;
      ctx.save(); ctx.translate(540, 760);
      // dönen ışınlar
      ctx.globalAlpha = 0.35 * (1 - p);
      for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8 + T * 0.02); ctx.fillStyle = i % 2 ? c[0] : c[1]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -70); ctx.lineTo(900, 70); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
      const sc = p < 0.12 ? easeOut(p / 0.12) * 1.25 : 1.25 - Math.min(0.25, (p - 0.12) * 2) + Math.sin(T * 14) * 0.03;
      ctx.save(); ctx.translate(540, 740); ctx.rotate(Math.sin(T * 6) * 0.04); ctx.scale(sc, sc);
      font(190, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 18; ctx.strokeStyle = c[1] === c[0] ? '#000' : c[1]; ctx.lineJoin = 'round'; ctx.strokeText('GOOOL!', 0, 0);
      ctx.fillStyle = c[0]; ctx.fillText('GOOOL!', 0, 0);
      ctx.restore();
      if (p > 0.15) {
        ctx.globalAlpha = clamp((p - 0.15) * 6, 0, 1) * clamp((1 - p) * 6, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; rr(190, 870, 700, 110, 26); ctx.fill();
        font(44, 900); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`⚽ ${f.data.name}  ${f.data.min}`, 540, 910, 660);
        font(28, 800); ctx.fillStyle = '#fde047'; ctx.fillText(`${team(0).code} ${match.score[0]} - ${match.score[1]} ${team(1).code}`, 540, 952);
        ctx.globalAlpha = 1;
      }
    }
    if (f.kind === 'card') {
      const flip = p < 0.2 ? Math.cos((1 - p / 0.2) * Math.PI / 2) : 1;
      const out = p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1;
      ctx.globalAlpha = out;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, PITCH.y - 20, W, PITCH.h + 40);
      ctx.save(); ctx.translate(540, 720); ctx.rotate(-0.12 + Math.sin(T * 3) * 0.02); ctx.scale(flip, 1);
      ctx.fillStyle = f.data.red ? '#ef4444' : '#facc15'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40;
      rr(-110, -160, 220, 300, 20); ctx.fill(); ctx.shadowBlur = 0;
      ctx.restore();
      font(64, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.lineWidth = 10; ctx.strokeStyle = '#000';
      const label = f.data.red ? (f.data.second ? 'İKİNCİ SARI · KIRMIZI' : 'KIRMIZI KART') : 'SARI KART';
      fitText(label, 900, 64); ctx.strokeText(label, 540, 940); ctx.fillText(label, 540, 940);
      font(38, 800); ctx.fillText(`${f.data.name} · ${team(f.data.t).code}`, 540, 1010);
      ctx.globalAlpha = 1;
    }
    if (f.kind === 'banner') {
      const inn = easeOut(p * 5), out = p > 0.8 ? (p - 0.8) / 0.2 : 0;
      const x = lerp(-1000, 0, inn) + out * 1100;
      ctx.save(); ctx.translate(x, 0);
      ctx.fillStyle = hexA(f.data.color.length === 7 ? f.data.color : '#ef4444', 0.95);
      ctx.beginPath(); ctx.moveTo(60, 700); ctx.lineTo(1020, 680); ctx.lineTo(1000, 800); ctx.lineTo(40, 820); ctx.fill();
      font(66, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = lum(f.data.color) > 0.6 ? '#111' : '#fff'; ctx.fillText(f.data.text, 530, 736, 900);
      if (f.data.sub) { font(28, 800); ctx.fillText(f.data.sub, 530, 784, 860); }
      ctx.restore();
    }
    if (f.kind === 'sub') {
      const inn = easeOut(p * 4), out = p > 0.85 ? (p - 0.85) / 0.15 : 0;
      const y = lerp(1200, 900, inn) + out * 300;
      ctx.globalAlpha = 1 - out;
      const c = team(f.data.t).colors[0];
      ctx.fillStyle = 'rgba(5,8,20,0.92)'; rr(140, y, 800, 220, 28); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.stroke();
      font(28, 900); ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`OYUNCU DEĞİŞİKLİĞİ · ${team(f.data.t).code} #${f.data.num}`, 540, y + 40);
      font(40, 900); ctx.textAlign = 'left';
      ctx.fillStyle = '#22c55e'; ctx.fillText('▲', 190, y + 105); ctx.fillStyle = '#fff'; ctx.fillText(f.data.inn, 250, y + 105, 640);
      ctx.fillStyle = '#ef4444'; ctx.fillText('▼', 190, y + 170); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText(f.data.out, 250, y + 170, 640);
      ctx.globalAlpha = 1;
    }
  }
}
function drawParts() {
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life, 0, 1); ctx.fillStyle = p.c;
    if (p.kind === 'conf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.w, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

function drawWaiting() {
  ctx.drawImage(bgCache, 0, 0); drawCrowdIdle(); ctx.drawImage(pitchCache, 0, 0);
  panel(620, 420);
  font(50, 900); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Sıradaki maç hazırlanıyor', 540, 760);
  font(28, 700); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('Fikstür panelden belirlenir · birazdan buradayız', 540, 840);
  const n = upcomingList[0]; if (n) { font(34, 900); ctx.fillStyle = '#22d3ee'; ctx.fillText(`${n.home.name} - ${n.away.name}`, 540, 920); }
}
function drawCrowdIdle() { for (const d of crowd) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#8899bb'; ctx.beginPath(); ctx.arc(d.x, d.y + Math.sin(T * 2 + d.ph), d.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!match || waiting) { drawWaiting(); return; }
  if (shake > 0.5) ctx.setTransform(1, 0, 0, 1, rnd(-shake, shake), rnd(-shake, shake));
  ctx.drawImage(bgCache, 0, 0);
  drawCrowd();
  ctx.drawImage(pitchCache, 0, 0);
  drawPlayers();
  drawBall();
  drawScoreboard();
  drawMomentum();
  drawFeed();
  drawBooth();
  drawJoinBar();
  drawPhaseOverlay();
  drawFx();
  drawParts();
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`; ctx.fillRect(0, 0, W, H); }
}

// ============================================================ döngü
let last = performance.now();
function frame(t) {
  // Kare hızı düşse bile oyun zamanı gerçek zamanla akar (küçük adımlarla, en fazla 1 sn telafi)
  let el = Math.min(1, (t - last) / 1000); last = t;
  while (el > 0) { const dt = Math.min(1 / 30, el); el -= dt; T += dt; updateMatch(dt); updateParts(dt); }
  render();
  requestAnimationFrame(frame);
}


// ============================================================ başlat
function connect() {
  const es = new EventSource('/events');
  es.onmessage = m => { try { onEvent(JSON.parse(m.data)); } catch (e) { console.error(e); } };
}
function unlockAudio() {
  Sfx.init(); if (Sfx.ac && Sfx.ac.state !== 'running') Sfx.ac.resume();
  document.getElementById('sound').hidden = true;
}
window.addEventListener('pointerdown', unlockAudio); window.addEventListener('keydown', unlockAudio);
document.getElementById('sound').addEventListener('click', unlockAudio);

function startDemo() {
  const names = ['ahmet_34', 'zeynep.k', 'mert1903', 'elif', 'can_tr', 'ayse07', 'burak', 'deniz', 'emre_61', 'selin', 'kaan', 'irem'];
  setInterval(() => {
    if (!match || !['h1', 'h2', 'intro'].includes(match.phase)) return;
    const u = pick(names), r = Math.random();
    if (r < 0.2) onEvent({ type: 'comment', user: u, nick: u, text: pick([team(0).code, team(1).code]).toLowerCase() });
    else if (r < 0.75) onEvent({ type: 'like', user: u, nick: u, count: Math.ceil(rnd(1, 15)) });
    else if (r < 0.97) onEvent({ type: 'gift', user: u, nick: u, gift: pick(['Rose', 'Finger Heart', 'Doughnut']), coins: pick([1, 5, 30]), count: Math.ceil(rnd(1, 5)) });
    else onEvent({ type: 'gift', user: u, nick: u, gift: 'Hand Hearts', coins: 100, count: 1 });
  }, 700);
}

Voice.init();
Sfx.init();
if (!OBS && Sfx.ac && Sfx.ac.state !== 'running') document.getElementById('sound').hidden = false;
buildCaches(); buildCrowd();
connect(); loadNext();
if (DEMO) startDemo();
requestAnimationFrame(frame);
