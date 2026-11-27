// داده‌ها را از ESPN و گوگل‌نیوز می‌گیرد و در data/*.json می‌نویسد (هر ۵ دقیقه از GitHub Actions).
import { mkdirSync, writeFileSync } from 'node:fs';
import { LEAGUES } from '../config/leagues.js';
import { SETTINGS } from '../config/settings.js';
import { addDays, ymd } from '../shared/time.js';
import { fetchLeague } from './lib/espn.mjs';

const today = ymd(Date.now());
const from = addDays(today, -8);   // برای نمایش نتایج هفتهٔ قبل
const to = addDays(today, 15);     // برای هفتهٔ بعد

// داده‌ی قبلی سایت (اگر آدرسش را بدانیم) برای وقتی که یک لیگ موقتاً خطا می‌دهد
async function previous() {
  const base = process.env.PAGES_URL || SETTINGS.pagesUrl;
  if (!base) return [];
  try {
    const r = await fetch(base.replace(/\/?$/, '/') + 'data/matches.json', { cache: 'no-store' });
    return r.ok ? (await r.json()).matches || [] : [];
  } catch { return []; }
}

const results = await Promise.allSettled(LEAGUES.map((l) => fetchLeague(l.slug, from, to, today)));
const ok = results.filter((r) => r.status === 'fulfilled').length;
if (!ok) {
  console.error('هیچ لیگی دریافت نشد؛ داده‌ی قبلی دست‌نخورده می‌ماند.');
  results.forEach((r) => r.status === 'rejected' && console.error(String(r.reason)));
  process.exit(1);
}

let matches = [];
const errors = [];
const prev = results.some((r) => r.status === 'rejected') ? await previous() : [];
results.forEach((r, i) => {
  const slug = LEAGUES[i].slug;
  if (r.status === 'fulfilled') matches.push(...r.value);
  else { errors.push(slug); matches.push(...prev.filter((m) => m.league === slug)); console.error(String(r.reason)); }
});
matches.sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));

mkdirSync('data', { recursive: true });
const updatedAt = new Date().toISOString();
writeFileSync('data/matches.json', JSON.stringify({ updatedAt, timeZone: SETTINGS.timeZone, errors, matches }));
console.log(`matches: ${matches.length} | errors: ${errors.join(',') || '-'}`);
