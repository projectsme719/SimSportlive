// اعلان‌های کانال: لیست صبح، شروع بازی‌ها، نتایج. هر ۵ دقیقه از GitHub Actions اجرا می‌شود.
// حالت‌ها:  node scripts/notify.mjs            اجرای عادی (بدون BOT_TOKEN فقط چاپ می‌کند)
//           node scripts/notify.mjs --test     پیام آزمایشی به کانال و ادمین‌ها
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { SETTINGS } from '../config/settings.js';
import { kickoffMs } from '../shared/format.js';
import { minutesOfDay, ymd } from '../shared/time.js';
import { chunk, miniAppLink, send } from './lib/telegram.mjs';
import { morningText, resultsText, startText } from './lib/messages.mjs';

const TOKEN = process.env.BOT_TOKEN;
const DRY = !TOKEN;
const N = SETTINGS.notify;
const CH = SETTINGS.telegram.channelId;
const now = process.env.FAKE_NOW ? Date.parse(process.env.FAKE_NOW) : Date.now();
const watch = [{ text: '📺 تماشای زنده', url: miniAppLink('live') }];
const table = [{ text: '📅 برنامه و نتایج', url: miniAppLink('today') }];

async function post(chat, text, buttons) {
  for (const part of chunk(text)) {
    if (DRY) console.log(`--- [DRY → ${chat}] ---\n${part}\n(buttons: ${buttons.map((b) => b.url).join(' ')})`);
    else await send(TOKEN, chat, part, buttons);
  }
}

if (process.argv.includes('--test')) {
  const text = '✅ <b>ربات متصل است</b>\nاعلان‌های SimSport Live از این به بعد در کانال ارسال می‌شود.';
  await post(CH, text, watch);
  for (const id of SETTINGS.telegram.adminIds) await post(id, text, watch).catch((e) => console.error(id, e.message));
  process.exit(0);
}

if (!existsSync('data/matches.json')) { console.error('data/matches.json نیست.'); process.exit(1); }
const { matches } = JSON.parse(readFileSync('data/matches.json', 'utf8'));
const state = existsSync('state/notified.json') ? JSON.parse(readFileSync('state/notified.json', 'utf8')) : {};
state.morning ||= {}; state.start ||= {}; state.result ||= {};
const today = ymd(now);
const sent = [];

// ۱) لیست صبح (بعد از ساعت تنظیم‌شده، فقط یک بار در روز)
const [mh, mm] = N.morningTime.split(':').map(Number);
const mod = minutesOfDay(now);
if (N.morning && mod >= mh * 60 + mm && mod < 12 * 60 && !state.morning[today]) {
  const list = matches.filter((m) => ymd(kickoffMs(m)) === today && m.phase !== 'postponed');
  if (list.length) await post(CH, morningText(list, today), watch);
  state.morning[today] = 1;
  sent.push('morning');
}

// ۲) شروع بازی‌ها: از startLeadMinutes قبل تا ۴۰ دقیقه بعد از ساعت شروع
if (N.starts) {
  const due = matches.filter((m) => {
    const d = kickoffMs(m) - now;
    return (m.phase === 'upcoming' || m.phase === 'live') && !state.start[m.id] && d <= N.startLeadMinutes * 60000 && d > -40 * 60000;
  });
  const groups = {};
  for (const m of due) (groups[m.kickoff] ||= []).push(m);
  for (const k of Object.keys(groups).sort()) {
    await post(CH, startText(groups[k]), watch);
    groups[k].forEach((m) => (state.start[m.id] = now));
    sent.push(`start:${k}`);
  }
}

// ۳) نتایج: فقط بازی‌های تمام‌شده در ۱۲ ساعت اخیر و یک‌بار
if (N.results) {
  const done = matches.filter((m) => m.phase === 'finished' && !state.result[m.id] && kickoffMs(m) > now - 12 * 3600000);
  if (done.length) {
    await post(CH, resultsText(done), table);
    done.forEach((m) => (state.result[m.id] = now));
    sent.push(`results:${done.length}`);
  }
}

// پاک‌سازی ردیف‌های قدیمی
const cut = now - 5 * 86400000;
for (const k of ['start', 'result']) for (const id of Object.keys(state[k])) if (state[k][id] < cut) delete state[k][id];
for (const d of Object.keys(state.morning)) if (d < ymd(cut)) delete state.morning[d];

if (!DRY) writeFileSync('state/notified.json', JSON.stringify(state, null, 1));
console.log(`notify: ${sent.join(', ') || 'nothing to send'}${DRY ? ' (dry-run)' : ''}`);
