import { CONFIG, SPORTS } from '../config.js';
import { tgApi, answerCb, sendText, sendAdminReview, publishToChannel } from './telegram.js';
import { resolveChannel, getSingleVideoInfo } from './youtube.js';
import { analyzeMatchWithGemini } from './gemini.js';
import { getSettings, saveSettings } from './settings.js';
import { getExtraChannels, getAllChannels, getWhitelist } from './store.js';
import { finalizePost } from './lifecycle.js';
import {
  hasCalendar, upcomingEntries, getEntry, saveEntry, deleteEntry, linkVideo, announceEntry,
} from './calendar.js';
import { formatDay, formatTime, kabulDays, parseDayKey, fromKabul, parseTime } from './time.js';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cut = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

const VIDEO_RE = /(?:live\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const NAMES_PER_PAGE = 8;

// ───── وضعیت گفتگو (وقتی از ادمین متن می‌خواهیم) ─────
const STATE_KEY = 'state:admin';
async function getState(env) {
  try {
    const r = await env.POSTED_LIVES.get(STATE_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
const setState = (env, s) =>
  env.POSTED_LIVES.put(STATE_KEY, JSON.stringify(s), { expirationTtl: 600 });
const clearState = (env) => env.POSTED_LIVES.delete(STATE_KEY);

// ───── نمایش پیام: ویرایش پیام قبلی یا ارسال پیام جدید ─────
async function show(env, chatId, msgId, text, rows) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: rows },
    disable_web_page_preview: true,
  };
  if (msgId) {
    const r = await tgApi(env, 'editMessageText', { ...payload, message_id: msgId });
    if (r.ok || /not modified/i.test(r.description || '')) return r;
  }
  return tgApi(env, 'sendMessage', payload);
}

async function nameHash(name) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(name));
  return [...new Uint8Array(buf)]
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function listRecords(env, prefix) {
  const out = await env.POSTED_LIVES.list({ prefix });
  const items = [];
  for (const k of out.keys) {
    try {
      const raw = await env.POSTED_LIVES.get(k.name);
      if (raw) items.push({ id: k.name.slice(prefix.length), ...JSON.parse(raw) });
    } catch {}
  }
  return items;
}

const BACK = [{ text: '🔙 بازگشت به پنل', callback_data: 'm:home' }];

// ───── صفحه‌ها ─────
export async function showHome(env, chatId, msgId, notice = '') {
  const [extra, active, waiting, upcoming] = await Promise.all([
    getExtraChannels(env),
    listRecords(env, 'active:'),
    listRecords(env, 'wait:'),
    hasCalendar(env) ? upcomingEntries(env) : Promise.resolve([]),
  ]);
  const waitCount = waiting.filter((w) => w.video).length;
  const text =
    `🎛 <b>پنل مدیریت</b>\n\n` +
    (notice ? `${notice}\n\n` : '') +
    `📺 کانال‌ها: ${CONFIG.YOUTUBE_CHANNELS.length + extra.length}\n` +
    `🔴 لایوهای منتشرشده (فعال): ${active.length}\n` +
    `⏳ در انتظار شروع مسابقه: ${waitCount}\n` +
    `📅 مسابقه‌های پیش‌رو در تقویم: ${upcoming.length}\n\n` +
    `یکی از گزینه‌ها را انتخاب کنید 👇\n` +
    `(لینک لایو یوتیوب را هر زمان می‌توانید مستقیم بفرستید.)`;

  return show(env, chatId, msgId, text, [
    [
      { text: '📺 کانال‌ها', callback_data: 'm:ch' },
      { text: '📋 نام‌ها', callback_data: 'm:nm:0' },
    ],
    [
      { text: `🔴 لایوهای فعال (${active.length})`, callback_data: 'm:act' },
      { text: `⏳ در انتظار (${waitCount})`, callback_data: 'm:wait' },
    ],
    [{ text: `📅 تقویم مسابقات (${upcoming.length})`, callback_data: 'm:cal' }],
    [
      { text: '🔗 تحلیل لینک لایو', callback_data: 'm:link' },
      { text: '⚙️ تنظیمات', callback_data: 'm:set' },
    ],
  ]);
}

async function showChannels(env, chatId, msgId, notice = '') {
  const extra = await getExtraChannels(env);
  const lines = [
    ...CONFIG.YOUTUBE_CHANNELS.map((id) => `• <code>${esc(id)}</code> (ثابت)`),
    ...extra.map((c) => `• ${c.trusted ? '🇦🇫 ' : '🌍 '}${esc(c.title || '')} <code>${esc(c.id)}</code>`),
  ];
  const text =
    `📺 <b>کانال‌ها</b> (${lines.length})\n🇦🇫 رسانه افغانی | 🌍 جهانی\n\n` +
    (notice ? `${notice}\n\n` : '') +
    lines.join('\n') +
    (extra.length ? `\n\nبرای حذف، روی نام کانال بزنید:` : '');

  const rows = extra.map((c) => [
    { text: `🗑 ${cut(c.title || c.id, 30)}`, callback_data: `m:chdel:${c.id}` },
  ]);
  rows.push([{ text: '➕ افزودن کانال', callback_data: 'm:chadd' }]);
  rows.push(BACK);
  return show(env, chatId, msgId, text, rows);
}

async function showNames(env, chatId, msgId, page = 0, notice = '') {
  const names = (await getWhitelist(env)).sort();
  const pages = Math.max(1, Math.ceil(names.length / NAMES_PER_PAGE));
  page = Math.min(Math.max(0, page), pages - 1);
  const slice = names.slice(page * NAMES_PER_PAGE, (page + 1) * NAMES_PER_PAGE);

  const text =
    `📋 <b>نام ورزشکاران و تیم‌ها</b> (${names.length})\n\n` +
    (notice ? `${notice}\n\n` : '') +
    (names.length
      ? `صفحه ${page + 1} از ${pages}\nبرای حذف روی نام بزنید:`
      : 'فهرست خالی است. با «افزودن نام» شروع کنید.');

  const rows = [];
  for (const n of slice) {
    rows.push([{ text: `🗑 ${cut(n, 30)}`, callback_data: `m:nmdel:${await nameHash(n)}` }]);
  }
  const nav = [];
  if (page > 0) nav.push({ text: '◀️ قبلی', callback_data: `m:nm:${page - 1}` });
  if (page < pages - 1) nav.push({ text: 'بعدی ▶️', callback_data: `m:nm:${page + 1}` });
  if (nav.length) rows.push(nav);
  rows.push([{ text: '➕ افزودن نام', callback_data: 'm:nmadd' }]);
  rows.push(BACK);
  return show(env, chatId, msgId, text, rows);
}

async function showActive(env, chatId, msgId, notice = '') {
  const active = await listRecords(env, 'active:');
  const lines = active.map((a, i) => {
    const min = Math.max(0, Math.round((Date.now() - (a.postedAt || Date.now())) / 60000));
    return `${i + 1}. ${esc(cut(a.title || a.id, 60))}${a.endedAt ? ' (در حال پایان)' : ''}\n    ⏱ ${min} دقیقه پیش منتشر شد`;
  });
  const text =
    `🔴 <b>لایوهای منتشرشده</b> (${active.length})\n\n` +
    (notice ? `${notice}\n\n` : '') +
    (lines.length
      ? lines.join('\n\n') +
        `\n\nبعد از پایان مسابقه، پست خودکار ویرایش می‌شود. اگر خواستید زودتر تمامش کنید، دکمه ⏹ را بزنید.`
      : 'لایو فعالی نیست.');

  const rows = active.map((a, i) => [
    { text: `⏹ پایان دستی ${i + 1}: ${cut(a.title || a.id, 22)}`, callback_data: `m:end:${a.id}` },
  ]);
  rows.push([{ text: '🔄 تازه‌سازی', callback_data: 'm:act' }]);
  rows.push(BACK);
  return show(env, chatId, msgId, text, rows);
}

async function showWaiting(env, chatId, msgId, notice = '') {
  const items = (await listRecords(env, 'wait:')).filter((w) => w.video);
  const lines = items.map(
    (w, i) =>
      `${i + 1}. ${esc(cut(w.video.title || w.id, 60))}\n    📺 ${esc(w.video.channelTitle || '')}`
  );
  const text =
    `⏳ <b>لایوهای در انتظار شروع مسابقه</b> (${items.length})\n\n` +
    (notice ? `${notice}\n\n` : '') +
    (lines.length
      ? lines.join('\n\n') +
        `\n\nربات خودش با شروع مسابقه منتشر می‌کند. اگر مسابقه شروع شده و هنوز منتشر نشده، «انتشار اکنون» را بزنید.`
      : 'مورد در انتظاری نیست.');

  const rows = [];
  items.forEach((w, i) =>
    rows.push([
      { text: `🚀 انتشار اکنون ${i + 1}`, callback_data: `m:wnow:${w.id}` },
      { text: `🚫 رد ${i + 1}`, callback_data: `m:wskip:${w.id}` },
    ])
  );
  rows.push([{ text: '🔄 تازه‌سازی', callback_data: 'm:wait' }]);
  rows.push(BACK);
  return show(env, chatId, msgId, text, rows);
}

async function showCalendar(env, chatId, msgId, notice = '') {
  if (!hasCalendar(env)) {
    return show(env, chatId, msgId,
      '❌ KV با نام MATCH_CALENDAR به Worker وصل نیست. در wrangler.toml بخش kv_namespaces را بررسی کنید.', [BACK]);
  }
  const entries = (await upcomingEntries(env)).slice(0, 10);
  const lines = entries.map((r, i) => {
    const sp = SPORTS[r.sport] || SPORTS.other;
    return (
      `${i + 1}. ${sp.emoji}${r.isWomen ? '🚺' : ''} ${esc(cut(r.title, 45))}\n` +
      `    🕐 ${esc(formatDay(r.startAt))} ${esc(formatTime(r.startAt))} ${r.source === 'auto' ? '🤖' : '✍️'}` +
      `${r.status === 'live' ? ' 🔴 زنده' : ''}${r.announced ? ' 📣' : ''}`
    );
  });
  const text =
    `📅 <b>تقویم مسابقات</b> (به وقت کابل)\n🤖 کشف خودکار | ✍️ دستی | 📣 یادآوری ارسال شده\n\n` +
    (notice ? `${notice}\n\n` : '') +
    (lines.length ? lines.join('\n\n') : 'مسابقه‌ای ثبت نشده است.');

  const rows = [];
  entries.forEach((r, i) =>
    rows.push([
      { text: `📣 اعلام ${i + 1}`, callback_data: `m:calann:${r.id}` },
      { text: `🗑 حذف ${i + 1}`, callback_data: `m:caldel:${r.id}` },
    ])
  );
  rows.push([{ text: '➕ افزودن مسابقه', callback_data: 'm:caladd' }]);
  rows.push([{ text: '🔄 تازه‌سازی', callback_data: 'm:cal' }]);
  rows.push(BACK);
  return show(env, chatId, msgId, text, rows);
}

const CANCEL_ROW = [{ text: '❌ انصراف', callback_data: 'm:cancel' }];

async function askSport(env, chatId, msgId) {
  const keys = Object.keys(SPORTS);
  const rows = [];
  for (let i = 0; i < keys.length; i += 2) {
    rows.push(keys.slice(i, i + 2).map((k) => ({ text: `${SPORTS[k].emoji} ${SPORTS[k].label}`, callback_data: `m:cals:${k}` })));
  }
  rows.push(CANCEL_ROW);
  return show(env, chatId, msgId, '🏷 <b>نوع ورزش</b> را انتخاب کنید:', rows);
}

async function askDay(env, chatId, msgId) {
  const days = kabulDays(7);
  const rows = [];
  for (let i = 0; i < days.length; i += 2) {
    rows.push(
      days.slice(i, i + 2).map((d, j) => ({
        text: `${i + j === 0 ? 'امروز — ' : i + j === 1 ? 'فردا — ' : ''}${formatDay(d.ms)}`,
        callback_data: `m:cald:${d.key}`,
      }))
    );
  }
  rows.push(CANCEL_ROW);
  return show(env, chatId, msgId, '📆 <b>روز مسابقه</b> را انتخاب کنید (به وقت کابل):', rows);
}

async function createManualEntry(env, st, videoId) {
  const rec = {
    id: crypto.randomUUID().replace(/-/g, '').slice(0, 8),
    source: 'manual',
    title: st.title,
    sport: st.sport,
    isWomen: st.isWomen === true,
    language: 'unknown',
    startAt: st.startAt,
    videoId: null,
    status: 'scheduled',
    announced: false,
    createdAt: Date.now(),
  };
  if (videoId) await linkVideo(env, rec, videoId);
  else await saveEntry(env, rec);
  return rec;
}

async function showSettings(env, chatId, msgId) {
  const s = await getSettings(env);
  const on = (v) => (v ? '✅' : '⛔');
  const rows = [];
  const keys = Object.keys(SPORTS);
  for (let i = 0; i < keys.length; i += 2) {
    rows.push(
      keys.slice(i, i + 2).map((k) => ({
        text: `${on(s.sports.includes(k))} ${SPORTS[k].emoji} ${SPORTS[k].label}`,
        callback_data: `m:tgl:sp:${k}`,
      }))
    );
  }
  rows.push([{ text: `${on(s.autoPublish)} انتشار خودکار`, callback_data: 'm:tgl:auto' }]);
  rows.push([{ text: `${on(s.autoCalendar)} کشف خودکار مسابقه از یوتیوب`, callback_data: 'm:tgl:autocal' }]);
  rows.push([{ text: `${on(s.announce)} یادآوری مسابقه در کانال`, callback_data: 'm:tgl:announce' }]);
  rows.push([{ text: `${on(s.requireEmbeddable)} فقط لایوهای قابل‌پخش در تلگرام`, callback_data: 'm:tgl:embed' }]);
  rows.push([{ text: `${on(s.useVision)} تشخیص شروع مسابقه با تصویر`, callback_data: 'm:tgl:vision' }]);
  rows.push(BACK);

  const text =
    `⚙️ <b>تنظیمات</b>\n\n✅ فعال | ⛔ غیرفعال\n\n` +
    `• ورزش‌های خاموش پردازش نمی‌شوند.\n` +
    `• اگر «انتشار خودکار» خاموش باشد، همه لایوها اول برای تأیید شما می‌آیند.\n` +
    `• «فقط قابل‌پخش»: لایوهایی که امبد ممنوع دارند منتشر نمی‌شوند.\n` +
    `• «تشخیص با تصویر»: صفحه انتظار با فریم زنده از مسابقه جدا می‌شود.`;
  return show(env, chatId, msgId, text, rows);
}

// ───── پردازش دکمه‌ها ─────
export async function handlePanelCallback(cb, env) {
  const chatId = cb.message?.chat?.id || cb.from.id;
  const msgId = cb.message?.message_id;
  const parts = String(cb.data || '').split(':'); // ['m', action, ...]
  const act = parts[1];
  let toast = '';
  const kv = env.POSTED_LIVES;

  try {
    switch (act) {
      case 'home':
        await clearState(env);
        await showHome(env, chatId, msgId);
        break;

      case 'cancel':
        await clearState(env);
        await showHome(env, chatId, msgId, '❌ لغو شد.');
        break;

      // ── کانال‌ها
      case 'ch':
        await showChannels(env, chatId, msgId);
        break;

      case 'chadd':
        await setState(env, { action: 'addchannel' });
        await show(
          env, chatId, msgId,
          '➕ <b>افزودن کانال</b>\n\nلینک کانال، @handle، آیدی UC... یا لینک یک ویدیوی آن کانال را بفرستید:',
          [[{ text: '❌ انصراف', callback_data: 'm:cancel' }]]
        );
        break;

      case 'cht': {
        const st = await getState(env);
        if (!st || st.action !== 'chtype') {
          toast = 'زمان این مرحله تمام شد؛ دوباره افزودن کانال را بزنید.';
          await showChannels(env, chatId, msgId);
          break;
        }
        const trusted = parts[2] === 't';
        await kv.put('channel:' + st.id, JSON.stringify({ title: st.title, trusted }));
        await clearState(env);
        await showChannels(env, chatId, msgId, `✅ کانال «${esc(st.title)}» اضافه شد ${trusted ? '(🇦🇫 معتبر)' : '(🌍 جهانی)'}`);
        break;
      }

      case 'chdel': {
        const id = parts[2];
        const extra = await getExtraChannels(env);
        const c = extra.find((x) => x.id === id);
        await show(
          env, chatId, msgId,
          `🗑 کانال «${esc(c?.title || id)}» حذف شود؟`,
          [[
            { text: '✅ بله، حذف شود', callback_data: `m:chdely:${id}` },
            { text: '🔙 خیر', callback_data: 'm:ch' },
          ]]
        );
        break;
      }

      case 'chdely':
        await kv.delete('channel:' + parts[2]);
        await showChannels(env, chatId, msgId, '🗑 کانال حذف شد.');
        break;

      // ── نام‌ها
      case 'nm':
        await showNames(env, chatId, msgId, parseInt(parts[2], 10) || 0);
        break;

      case 'nmadd':
        await setState(env, { action: 'addname' });
        await show(
          env, chatId, msgId,
          '➕ <b>افزودن نام</b>\n\nنام ورزشکار یا تیم را بفرستید. برای چند نام، هر کدام را در یک خط بنویسید:',
          [[{ text: '❌ انصراف', callback_data: 'm:cancel' }]]
        );
        break;

      case 'nmdel': {
        const hash = parts[2];
        const names = await getWhitelist(env);
        let found = null;
        for (const n of names) if ((await nameHash(n)) === hash) found = n;
        if (!found) {
          toast = 'این نام پیدا نشد.';
          await showNames(env, chatId, msgId, 0);
          break;
        }
        await show(
          env, chatId, msgId,
          `🗑 «${esc(found)}» حذف شود؟`,
          [[
            { text: '✅ بله، حذف شود', callback_data: `m:nmdely:${hash}` },
            { text: '🔙 خیر', callback_data: 'm:nm:0' },
          ]]
        );
        break;
      }

      case 'nmdely': {
        const hash = parts[2];
        const names = await getWhitelist(env);
        for (const n of names) {
          if ((await nameHash(n)) === hash) await env.ATHLETES_WHITELIST.delete('fighter:' + n);
        }
        await showNames(env, chatId, msgId, 0, '🗑 حذف شد.');
        break;
      }

      // ── لایوهای فعال
      case 'act':
        await showActive(env, chatId, msgId);
        break;

      case 'end': {
        const id = parts[2];
        const raw = await kv.get('active:' + id);
        if (!raw) {
          toast = 'این مورد پیدا نشد.';
          await showActive(env, chatId, msgId);
          break;
        }
        const ok = await finalizePost(env, id, JSON.parse(raw));
        await showActive(env, chatId, msgId, ok ? '⏹ پست ویرایش و لینک منقضی شد.' : '⚠️ لینک منقضی شد ولی ویرایش پست ناموفق بود.');
        break;
      }

      // ── تقویم
      case 'cal':
        await showCalendar(env, chatId, msgId);
        break;

      case 'caladd':
        if (!hasCalendar(env)) { await showCalendar(env, chatId, msgId); break; }
        await setState(env, { action: 'cal_title' });
        await show(env, chatId, msgId,
          '➕ <b>افزودن مسابقه</b>\n\nعنوان مسابقه را بنویسید (مثلاً: افغانستان - پاکستان):', [CANCEL_ROW]);
        break;

      case 'cals': {
        const st = await getState(env);
        if (!st || st.action !== 'cal_sport') { toast = 'زمان این مرحله تمام شد.'; await showCalendar(env, chatId, msgId); break; }
        await setState(env, { ...st, action: 'cal_women', sport: parts[2] });
        await show(env, chatId, msgId, '🚺 این مسابقه <b>ورزش بانوان</b> است؟', [
          [{ text: '🚺 بله، بانوان', callback_data: 'm:calw:1' }, { text: '🚹 خیر', callback_data: 'm:calw:0' }],
          CANCEL_ROW,
        ]);
        break;
      }

      case 'calw': {
        const st = await getState(env);
        if (!st || st.action !== 'cal_women') { toast = 'زمان این مرحله تمام شد.'; await showCalendar(env, chatId, msgId); break; }
        await setState(env, { ...st, action: 'cal_day', isWomen: parts[2] === '1' });
        await askDay(env, chatId, msgId);
        break;
      }

      case 'cald': {
        const st = await getState(env);
        if (!st || st.action !== 'cal_day') { toast = 'زمان این مرحله تمام شد.'; await showCalendar(env, chatId, msgId); break; }
        await setState(env, { ...st, action: 'cal_time', date: parts[2] });
        await show(env, chatId, msgId,
          '🕐 <b>ساعت شروع</b> را به وقت کابل بنویسید.\nمثال: 18:30', [CANCEL_ROW]);
        break;
      }

      case 'call': { // بدون لینک
        const st = await getState(env);
        if (!st || st.action !== 'cal_link') { toast = 'زمان این مرحله تمام شد.'; await showCalendar(env, chatId, msgId); break; }
        const rec = await createManualEntry(env, st, null);
        await clearState(env);
        await showCalendar(env, chatId, msgId, `✅ «${esc(rec.title)}» اضافه شد.`);
        break;
      }

      case 'calann': {
        const rec = await getEntry(env, parts[2]);
        if (!rec) { toast = 'پیدا نشد.'; await showCalendar(env, chatId, msgId); break; }
        const ok = await announceEntry(env, rec);
        await showCalendar(env, chatId, msgId, ok ? '📣 یادآوری در کانال ارسال شد.' : '❌ ارسال ناموفق (ربات ادمین کانال است؟)');
        break;
      }

      case 'caldel': {
        const rec = await getEntry(env, parts[2]);
        await show(env, chatId, msgId, `🗑 مسابقه «${esc(rec?.title || parts[2])}» حذف شود؟`, [[
          { text: '✅ بله، حذف شود', callback_data: `m:caldely:${parts[2]}` },
          { text: '🔙 خیر', callback_data: 'm:cal' },
        ]]);
        break;
      }

      case 'caldely':
        await deleteEntry(env, parts[2]);
        await showCalendar(env, chatId, msgId, '🗑 حذف شد.');
        break;

      // ── در انتظار
      case 'wait':
        await showWaiting(env, chatId, msgId);
        break;

      case 'wnow': {
        const id = parts[2];
        const raw = await kv.get('wait:' + id);
        if (!raw) {
          await showWaiting(env, chatId, msgId, 'این مورد دیگر در انتظار نیست.');
          break;
        }
        const { video, ai } = JSON.parse(raw);
        const ok = video && ai ? await publishToChannel(video, ai, env) : false;
        if (ok) {
          await kv.put('posted:' + id, '1', { expirationTtl: 604800 });
          await kv.delete('wait:' + id);
        }
        await showWaiting(env, chatId, msgId, ok ? '🚀 منتشر شد.' : '❌ انتشار ناموفق (ربات ادمین کانال است؟)');
        break;
      }

      case 'wskip':
        await kv.delete('wait:' + parts[2]);
        await kv.put('seen:' + parts[2], '1', { expirationTtl: 43200 });
        await showWaiting(env, chatId, msgId, '🚫 رد شد.');
        break;

      // ── تحلیل لینک
      case 'link':
        await setState(env, { action: 'analyze' });
        await show(
          env, chatId, msgId,
          '🔗 <b>تحلیل لینک لایو</b>\n\nلینک لایو یوتیوب را بفرستید:',
          [[{ text: '❌ انصراف', callback_data: 'm:cancel' }]]
        );
        break;

      // ── تنظیمات
      case 'set':
        await showSettings(env, chatId, msgId);
        break;

      case 'tgl': {
        const s = await getSettings(env);
        const what = parts[2];
        if (what === 'sp') {
          const k = parts[3];
          if (SPORTS[k]) s.sports = s.sports.includes(k) ? s.sports.filter((x) => x !== k) : [...s.sports, k];
        } else if (what === 'auto') s.autoPublish = !s.autoPublish;
        else if (what === 'embed') s.requireEmbeddable = !s.requireEmbeddable;
        else if (what === 'autocal') s.autoCalendar = !s.autoCalendar;
        else if (what === 'announce') s.announce = !s.announce;
        else if (what === 'vision') s.useVision = !s.useVision;
        await saveSettings(env, s);
        await showSettings(env, chatId, msgId);
        break;
      }

      default:
        await showHome(env, chatId, msgId);
    }
  } catch (e) {
    console.error('panel callback error:', e);
    toast = 'خطا: ' + String(e?.message || e).slice(0, 150);
  }

  await answerCb(env, cb.id, toast);
}

// ───── پیام‌های متنی ادمین ─────
export async function handleAdminText(message, env) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();

  // هر دستور اسلشی (/start, /panel, ...) = نمایش پنل
  if (text.startsWith('/')) {
    await clearState(env);
    return showHome(env, chatId, null);
  }

  const state = await getState(env);

  if (state?.action === 'addchannel') {
    const ch = await resolveChannel(text, env.YOUTUBE_API_KEY);
    if (!ch || !ch.id) {
      return sendText(env, chatId, '❌ کانال پیدا نشد. دوباره لینک/آیدی بفرستید یا با دکمه زیر لغو کنید.', {
        inline_keyboard: [[{ text: '❌ انصراف', callback_data: 'm:cancel' }]],
      });
    }
    await setState(env, { action: 'chtype', id: ch.id, title: ch.title });
    return show(
      env, chatId, null,
      `✅ کانال پیدا شد:\n<b>${esc(ch.title)}</b>\n<code>${esc(ch.id)}</code>\n\nنوع کانال چیست؟\n🇦🇫 رسانه افغانی: هر مسابقه ورزشی‌اش منتشر می‌شود.\n🌍 جهانی: فقط اگر ورزشکار/تیم افغان داشته باشد.`,
      [
        [{ text: '🇦🇫 رسانه افغانی', callback_data: 'm:cht:t' }, { text: '🌍 کانال جهانی', callback_data: 'm:cht:g' }],
        [{ text: '❌ انصراف', callback_data: 'm:cancel' }],
      ]
    );
  }

  if (state?.action === 'addname') {
    const names = text.split(/[\n,،]+/).map((n) => n.trim()).filter(Boolean).slice(0, 50);
    for (const n of names) await env.ATHLETES_WHITELIST.put('fighter:' + n.toLowerCase(), 'true');
    await clearState(env);
    return showNames(env, chatId, null, 0, `✅ ${names.length} نام اضافه شد.`);
  }

  if (state?.action === 'cal_title') {
    await setState(env, { action: 'cal_sport', title: text.slice(0, 120) });
    return askSport(env, chatId, null);
  }

  if (state?.action === 'cal_time') {
    const t = parseTime(text);
    const d = parseDayKey(state.date);
    if (!t || !d) {
      return sendText(env, chatId, '❌ ساعت معتبر نیست. مثال: 18:30', { inline_keyboard: [CANCEL_ROW] });
    }
    const startAt = fromKabul(d.y, d.m, d.d, t.hh, t.mm);
    if (startAt <= Date.now()) {
      return sendText(env, chatId, '❌ این زمان گذشته است. ساعت دیگری بنویسید.', { inline_keyboard: [CANCEL_ROW] });
    }
    await setState(env, { ...state, action: 'cal_link', startAt });
    return show(env, chatId, null,
      `✅ زمان: ${esc(formatDay(startAt))} ساعت ${esc(formatTime(startAt))}\n\n🔗 اگر لایو این مسابقه از قبل در یوتیوب ساخته شده، لینکش را بفرستید تا خودکار وصل شود. وگرنه «بدون لینک» را بزنید:`,
      [[{ text: 'بدون لینک', callback_data: 'm:call' }], CANCEL_ROW]);
  }

  if (state?.action === 'cal_link') {
    const lm = text.match(VIDEO_RE);
    if (!lm) {
      return sendText(env, chatId, '❌ لینک یوتیوب معتبر نیست. دوباره بفرستید یا «بدون لینک» را بزنید.', {
        inline_keyboard: [[{ text: 'بدون لینک', callback_data: 'm:call' }], CANCEL_ROW],
      });
    }
    const rec = await createManualEntry(env, state, lm[1]);
    await clearState(env);
    return showCalendar(env, chatId, null, `✅ «${esc(rec.title)}» اضافه و به لایو وصل شد.`);
  }

  const m = text.match(VIDEO_RE);
  if (m) {
    await clearState(env);
    return handleManualLink(m[1], chatId, env);
  }

  if (state?.action === 'analyze') {
    return sendText(env, chatId, '❌ لینک یوتیوب معتبر نیست. دوباره بفرستید یا لغو کنید.', {
      inline_keyboard: [[{ text: '❌ انصراف', callback_data: 'm:cancel' }]],
    });
  }

  return showHome(env, chatId, null);
}

// ───── تحلیل لینک دستی ─────
export async function handleManualLink(videoId, chatId, env) {
  await sendText(env, chatId, '🔍 در حال تحلیل لینک...');

  try {
    if (!env.YOUTUBE_API_KEY) {
      return sendText(env, chatId, '❌ سکرت YOUTUBE_API_KEY در کلودفلر تنظیم نشده است.');
    }

    const video = await getSingleVideoInfo(videoId, env.YOUTUBE_API_KEY);
    if (!video) {
      return sendText(env, chatId, '❌ اطلاعات این ویدیو پیدا نشد (آیدی یا YOUTUBE_API_KEY را بررسی کنید).');
    }

    const channels = await getAllChannels(env);
    video.trusted = channels.get(video.channelId)?.trusted === true;

    const whitelist = await getWhitelist(env);
    const ai = await analyzeMatchWithGemini(video, whitelist, env);
    if (!ai.ok) {
      await sendText(
        env,
        chatId,
        `⚠️ Gemini پاسخ نداد؛ بدون کپشن هوشمند برای بررسی ارسال می‌شود.\nدلیل: ${ai.error || 'نامشخص'}`.slice(0, 500)
      );
    }

    const sent = await sendAdminReview(video, ai, env);
    if (!sent) await sendText(env, chatId, '❌ ارسال پیام بررسی ناموفق بود. لاگ Cloudflare را ببینید.');
  } catch (e) {
    console.error('handleManualLink error:', e);
    await sendText(env, chatId, `❌ خطا: ${String(e?.message || e).slice(0, 400)}`);
  }
}