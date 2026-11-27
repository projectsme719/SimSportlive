// اخبار و حواشی: عنوان خبرها از RSS گوگل‌نیوز → ترجمهٔ فارسی با Gemini (کم‌مصرف) → data/news.json (بدون لینک)
// کم‌مصرف بودن: ۱) خبر تازه هر ۲۰ دقیقه ۲) ترجمه حداکثر هر ۳۰ دقیقه، همه در یک درخواست ۳) هر خبر فقط یک بار ترجمه می‌شود
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { LEAGUES } from '../config/leagues.js';
import { SETTINGS } from '../config/settings.js';
import { translate } from './lib/gemini.mjs';
import { englishNews } from './lib/rss.mjs';

const N = SETTINGS.news;
const now = process.env.FAKE_NOW ? Date.parse(process.env.FAKE_NOW) : Date.now();
const FILE = 'state/news.json';
const sha = (t) => createHash('sha1').update(t).digest('hex').slice(0, 12);

mkdirSync('state', { recursive: true });
mkdirSync('data', { recursive: true });
const st = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { fetchedAt: 0, translatedAt: 0, items: [] };
let changed = false;

// ۱) خبر تازه
if (now - st.fetchedAt >= N.fetchEveryMinutes * 60000) {
  const lists = await Promise.all(LEAGUES.map((l) => englishNews(l.slug, l.news, N.perLeague).catch((e) => { console.error(l.slug, e.message); return []; })));
  const known = new Set(st.items.map((i) => i.id));
  for (const it of lists.flat()) {
    const id = sha(it.title);
    if (known.has(id)) continue;
    known.add(id);
    st.items.push({ id, league: it.league, en: it.title, fa: '', date: it.date, source: it.source });
  }
  st.fetchedAt = now;
  changed = true;
}

// ۲) ترجمه (فقط اگر خبر ترجمه‌نشده هست و از آخرین ترجمه به‌اندازهٔ کافی گذشته)
const pending = st.items.filter((i) => !i.fa).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, N.maxPerRun);
if (pending.length && now - st.translatedAt >= N.translateEveryMinutes * 60000) {
  if (!process.env.GEMINI_API_KEY) console.warn('GEMINI_API_KEY تنظیم نشده؛ ترجمه انجام نمی‌شود.');
  else {
    try {
      const out = await translate(pending.map((p) => p.en));
      pending.forEach((p, i) => { if (out[i]) p.fa = out[i]; });
      console.log(`translated: ${out.filter(Boolean).length}/${pending.length}`);
    } catch (e) { console.error(e.message); }
    st.translatedAt = now; // حتی اگر خطا داد، تا نوبت بعد صبر کن (برای رد نشدن از محدودیت)
    changed = true;
  }
}

// ۳) پاک‌سازی خبرهای قدیمی و نوشتن خروجی سایت (بدون لینک و بدون متن انگلیسی)
const cut = now - N.keepHours * 3600000;
const before = st.items.length;
st.items = st.items.filter((i) => Date.parse(i.date) >= cut);
if (st.items.length !== before) changed = true;

const items = st.items.filter((i) => i.fa).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 30)
  .map(({ id, league, fa, date, source }) => ({ id, league, fa, date, source }));
writeFileSync('data/news.json', JSON.stringify({ updatedAt: new Date(now).toISOString(), items }));
if (changed) writeFileSync(FILE, JSON.stringify(st));
console.log(`news: ${items.length} translated, ${st.items.filter((i) => !i.fa).length} waiting`);
