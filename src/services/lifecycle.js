import { CONFIG, SPORTS, WOMEN_TAG } from '../config.js';
import { tgApi } from './telegram.js';
import { getVideosEndInfo } from './youtube.js';
import { classifyLiveFrame } from './gemini.js';
import { getSettings } from './settings.js';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// کپشن پست بعد از پایان مسابقه
export function buildEndedCaption(rec) {
  const sport = SPORTS[rec.sport] || SPORTS.other;
  const tags = [sport.tag, rec.isWomen ? WOMEN_TAG : null, '#افغانستان'].filter(Boolean).join(' ');
  return (
    `${sport.emoji} <b>🔚 پایان مسابقه ${esc(sport.label)}${rec.isWomen ? ' بانوان' : ''}</b>\n\n` +
    `📌 ${esc(String(rec.title || '').slice(0, 150))}\n\n` +
    `این پخش زنده به پایان رسید. از همراهی شما سپاسگزاریم 🙏\n\n` +
    `${tags}\n${esc(CONFIG.CHANNEL_USERNAME)}`
  );
}

// مسابقه تقویم بعد از پایان پخش «تمام‌شده» می‌شود (لینک زنده از برنامه عمومی حذف می‌شود)
async function closeCalendarEntry(env, videoId) {
  try {
    if (!env.MATCH_CALENDAR) return;
    const id = await env.MATCH_CALENDAR.get('byvideo:' + videoId);
    const raw = await env.MATCH_CALENDAR.get('match:' + (id || videoId));
    if (!raw) return;
    const rec = JSON.parse(raw);
    rec.status = 'done';
    const ttl = Math.max(120, Math.round((rec.startAt - Date.now()) / 1000) + 3 * 86400);
    await env.MATCH_CALENDAR.put('match:' + rec.id, JSON.stringify(rec), { expirationTtl: ttl });
  } catch (e) {
    console.error('closeCalendarEntry error:', e);
  }
}

// ویرایش پست کانال + منقضی کردن لینک Mini App
export async function finalizePost(env, id, rec) {
  const res = await tgApi(env, 'editMessageCaption', {
    chat_id: rec.chatId || CONFIG.CHANNEL_ID,
    message_id: rec.messageId,
    caption: buildEndedCaption(rec),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '⏹ پخش پایان یافت', callback_data: 'ended' }]] },
  });
  // حتی اگر ویرایش نشد (مثلاً پست پاک شده)، لینک Mini App منقضی می‌شود
  await env.POSTED_LIVES.put('ended:' + id, '1', { expirationTtl: 2592000 });
  await env.POSTED_LIVES.delete('active:' + id);
  await closeCalendarEntry(env, id);
  return res.ok === true || /not modified/i.test(res.description || '');
}

// پخش ادامه‌دار است ولی مسابقه ما تمام شده؟ {over, changed}
async function checkMatchOver(env, id, rec, settings) {
  const L = CONFIG.MATCH_LIMITS[rec.sport] || CONFIG.MATCH_LIMITS.other;
  const elapsed = (Date.now() - (rec.postedAt || Date.now())) / 60000;

  // سقف زمانی هر ورزش
  if (elapsed >= L.maxMin) return { over: true, changed: false };

  if (!settings.endDetect || !CONFIG.END_DETECT.ENABLED || !rec.target || elapsed < L.minCheckMin) {
    return { over: false, changed: false };
  }

  const state = await classifyLiveFrame({ id, title: rec.title, channelTitle: rec.channelTitle }, env, rec.target);
  let changed = false;
  if (state === 'target') {
    rec.sawTarget = true;
    rec.otherScore = 0;
    changed = true;
  } else if (rec.sawTarget && state === 'other') {
    rec.otherScore = (rec.otherScore || 0) + 1;
    changed = true;
  } else if (rec.sawTarget && state === 'waiting') {
    rec.otherScore = (rec.otherScore || 0) + 0.34; // استراحت بین دو نیمه نباید پست را ببندد
    changed = true;
  }
  return { over: !!rec.sawTarget && (rec.otherScore || 0) >= CONFIG.END_DETECT.CONSECUTIVE, changed };
}

// هر بار Cron اجرا شود: پست‌های فعال را بررسی می‌کند
export async function processActivePosts(env) {
  const kv = env.POSTED_LIVES;
  const list = await kv.list({ prefix: 'active:' });
  if (!list.keys.length) return;

  const ids = list.keys.map((k) => k.name.slice('active:'.length));
  const infos = await getVideosEndInfo(ids, env.YOUTUBE_API_KEY);
  if (!infos) return; // خطای API؛ دور بعد
  const settings = await getSettings(env);

  for (const id of ids) {
    try {
      const raw = await kv.get('active:' + id);
      if (!raw) continue;
      const rec = JSON.parse(raw);
      const info = infos.get(id);

      // هنوز زنده است
      if (info && info.found && !info.endTime) {
        if (rec.endedAt) {
          delete rec.endedAt; // پخش دوباره ادامه پیدا کرده
          await kv.put('active:' + id, JSON.stringify(rec), { expirationTtl: 259200 });
        }

        // پخش ادامه دارد؛ ولی آیا مسابقه افغان تمام شده؟
        const res = await checkMatchOver(env, id, rec, settings);
        if (res.over) {
          await finalizePost(env, id, rec);
        } else if (res.changed) {
          await kv.put('active:' + id, JSON.stringify(rec), { expirationTtl: 259200 });
        }
        continue;
      }

      // تمام شده (یا ویدیو پاک/خصوصی شده)
      if (!rec.endedAt) {
        rec.endedAt = info && info.endTime ? info.endTime : Date.now();
        await kv.put('active:' + id, JSON.stringify(rec), { expirationTtl: 259200 });
      }

      if (Date.now() - rec.endedAt >= CONFIG.END_GRACE_MIN * 60000) {
        await finalizePost(env, id, rec);
      }
    } catch (e) {
      console.error('processActivePosts error:', id, e);
    }
  }
}