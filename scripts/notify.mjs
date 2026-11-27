// اعلان‌های کانال: لیست صبح، شروع بازی‌ها (با دکمهٔ هر شبکه)، نتایج، اخبار و حواشی.
// هر ۵ دقیقه از GitHub Actions اجرا می‌شود. دکمه‌ها مینی‌اپ را روی صفحهٔ مربوط باز می‌کنند.
// حالت‌ها:  node scripts/notify.mjs            اجرای عادی (بدون BOT_TOKEN فقط چاپ می‌کند)
//           node scripts/notify.mjs --test     پیام آزمایشی به کانال و ادمین‌ها
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SETTINGS } from '../config/settings.js';
import { kickoffMs } from '../shared/format.js';
import { minutesOfDay, ymd } from '../shared/time.js';
import { matchChannelsList } from './lib/buttons.mjs';
import { chunk, miniAppLink, send } from './lib/telegram.mjs';
import { morningText, newsText, resultsText, startText } from './lib/messages.mjs';

const TOKEN = process.env.BOT_TOKEN;
const DRY = !TOKEN;
const N = SETTINGS.notify;
const CH = SETTINGS.telegram.channelId;
const now = process.env.FAKE_NOW ? Date.parse(process.env.FAKE_NOW) : Date.now();

// دکمه‌ها: هر کدام مینی‌اپ را باز می‌کنند (w_<id> = باز شدن و پخش همان شبکه)
const homeBtn = (text = '📅 بازی‌های امروز') => [[{ text, url: miniAppLink('home') }]];
const newsBtn = [[{ text: '📰 اخبار و حواشی', url: miniAppLink('news') }]];
const startBtns = () => [
  matchChannelsList().map((c) => ({ text: `📺 ${c.name}`, url: miniAppLink(`w_${c.id}`) })),
  [{ text: '📅 همهٔ بازی‌های امروز', url: miniAppLink('home') }],
];

async function post(chat, text, buttons) {
  for (const part of chunk(text)) {
    if (DRY) console.log(`--- [DRY → ${chat}] ---\n${part}\n(buttons: ${buttons.flat().map((b) => `${b.text} → ${b.url}`).join(' | ')})`);
    else await send(TOKEN, chat, part, buttons);
  }
}

if (process.argv.includes('--test')) {
  const text = '✅ <b>ربات متصل است</b>\nاعلان‌های SimSport Live از این به بعد در کانال ارسال می‌شود.';
  await post(CH, text, startBtns());
  for (const id of SETTINGS.telegram.adminIds) await post(id, text, homeBtn('📺 باز کردن مینی‌اپ')).catch((e) => console.error(id, e.message));
  process.exit(0);
}

if (!existsSync('data/matches.json')) { console.error('data/matches.json نیست.'); process.exit(1); }
const { matches } = JSON.parse(readFileSync('data/matches.json', 'utf8'));
const news = existsSync('data/news.json') ? JSON.parse(readFileSync('data/news.json', 'utf8')).items || [] : [];
const state = existsSync('state/notified.json') ? JSON.parse(readFileSync('state/notified.json', 'utf8')) : {};
for (const k of ['morning', 'start', 'result', 'newsSlot', 'newsPosted']) state[k] ||= {};
const today = ymd(now);
const mod = minutesOfDay(now);
const at = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const sent = [];

// ۱) لیست صبح (بعد از ساعت تنظیم‌شده، فقط یک بار در روز)
if (N.morning && mod >= at(N.morningTime) && mod < 12 * 60 && !state.morning[today]) {
  const list = matches.filter((m) => ymd(kickoffMs(m)) === today && m.phase !== 'postponed');
  if (list.length) await post(CH, morningText(list, today), startBtns());
  state.morning[today] = 1;
  sent.push('morning');
}

// ۲) شروع بازی‌ها: از startLeadMinutes قبل تا ۴۰ دقیقه بعد از لحظهٔ شروع (مستقل از ساعت منطقه‌ها)
if (N.starts) {
  const due = matches.filter((m) => {
    const d = kickoffMs(m) - now;
    return (m.phase === 'upcoming' || m.phase === 'live') && !state.start[m.id] && d <= N.startLeadMinutes * 60000 && d > -40 * 60000;
  });
  const groups = {};
  for (const m of due) (groups[m.kickoff] ||= []).push(m);
  for (const k of Object.keys(groups).sort()) {
    await post(CH, startText(groups[k]), startBtns());
    groups[k].forEach((m) => (state.start[m.id] = now));
    sent.push(`start:${k}`);
  }
}

// ۳) پایان بازی و نتیجه: بازی‌های تمام‌شدهٔ ۱۲ ساعت اخیر، یک‌بار
if (N.results) {
  const done = matches.filter((m) => m.phase === 'finished' && !state.result[m.id] && kickoffMs(m) > now - 12 * 3600000);
  if (done.length) {
    await post(CH, resultsText(done), homeBtn('📊 نتایج و بازی‌های امروز'));
    done.forEach((m) => (state.result[m.id] = now));
    sent.push(`results:${done.length}`);
  }
}

// ۴) اخبار و حواشی (ترجمه‌شده): در ساعت‌های newsTimes، فقط خبرهایی که قبلاً پست نشده‌اند
if (N.news) {
  for (const t of N.newsTimes) {
    const key = `${today}|${t}`;
    if (mod >= at(t) && mod < at(t) + 120 && !state.newsSlot[key]) {
      const fresh = news.filter((i) => !state.newsPosted[i.id]).slice(0, N.newsMax);
      if (fresh.length) {
        await post(CH, newsText(fresh), newsBtn);
        fresh.forEach((i) => (state.newsPosted[i.id] = now));
        sent.push(`news:${fresh.length}`);
      }
      state.newsSlot[key] = 1;
    }
  }
}

// پاک‌سازی ردیف‌های قدیمی
const cut = now - 5 * 86400000;
for (const k of ['start', 'result', 'newsPosted']) for (const id of Object.keys(state[k])) if (state[k][id] < cut) delete state[k][id];
for (const k of ['morning', 'newsSlot']) for (const d of Object.keys(state[k])) if (d.slice(0, 10) < ymd(cut)) delete state[k][d];

if (!DRY) { mkdirSync('state', { recursive: true }); writeFileSync('state/notified.json', JSON.stringify(state, null, 1)); }
console.log(`notify: ${sent.join(', ') || 'nothing to send'}${DRY ? ' (dry-run)' : ''}`);
