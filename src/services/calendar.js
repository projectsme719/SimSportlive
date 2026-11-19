import { CONFIG, SPORTS, LANGUAGES, WOMEN_TAG } from '../config.js';
import { tgApi, miniAppUrl } from './telegram.js';
import { analyzeMatchWithGemini } from './gemini.js';
import { formatDay, formatTime, kabulDayKey } from './time.js';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cal = (env) => env.MATCH_CALENDAR;
export const hasCalendar = (env) => !!env.MATCH_CALENDAR;

// ───── ذخیره و خواندن ─────
export async function saveEntry(env, rec) {
  const ttl = Math.max(120, Math.round((rec.startAt - Date.now()) / 1000) + 3 * 86400);
  await cal(env).put('match:' + rec.id, JSON.stringify(rec), { expirationTtl: ttl });
}

export async function getEntry(env, id) {
  try {
    const raw = await cal(env).get('match:' + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function linkVideo(env, rec, videoId) {
  rec.videoId = videoId;
  await saveEntry(env, rec);
  const ttl = Math.max(120, Math.round((rec.startAt - Date.now()) / 1000) + 3 * 86400);
  await cal(env).put('byvideo:' + videoId, rec.id, { expirationTtl: ttl });
}

export async function deleteEntry(env, id) {
  const rec = await getEntry(env, id);
  if (rec?.videoId) await cal(env).delete('byvideo:' + rec.videoId);
  await cal(env).delete('match:' + id);
}

export async function getEntryByVideo(env, videoId) {
  const id = await cal(env).get('byvideo:' + videoId);
  return (await getEntry(env, id || videoId)) || null; // مسابقه‌های خودکار شناسه‌شان همان آیدی ویدیو است
}

export async function listEntries(env) {
  const out = await cal(env).list({ prefix: 'match:' });
  const items = [];
  for (const k of out.keys) {
    try {
      const raw = await cal(env).get(k.name);
      if (raw) items.push(JSON.parse(raw));
    } catch {}
  }
  return items.sort((a, b) => a.startAt - b.startAt);
}

// مسابقه‌های پیش‌رو (و تازه‌شروع‌شده)
export async function upcomingEntries(env) {
  const now = Date.now();
  return (await listEntries(env)).filter((r) => r.status !== 'done' && r.startAt > now - 3 * 3600e3);
}

// مسابقه‌های ثبت‌شده‌ای که ممکن است با یک لایو در حال پخش یکی باشند
export async function findCandidates(env) {
  const now = Date.now();
  return (await listEntries(env))
    .filter((r) => r.status === 'scheduled' && !r.videoId && r.startAt > now - 3 * 3600e3 && r.startAt < now + 6 * 3600e3)
    .slice(0, 5);
}

// اگر لایو با مسابقه تقویم یکی بود: مرتبط و قابل‌انتشار خودکار است
export function applyEntry(ai, rec) {
  return {
    ...ai,
    isSports: true,
    isAfghan: true,
    confidence: Math.max(ai.confidence || 0, CONFIG.AUTO_PUBLISH_CONFIDENCE),
    sport: rec.sport || ai.sport,
    isWomen: typeof rec.isWomen === 'boolean' ? rec.isWomen : ai.isWomen,
    language: ai.language && ai.language !== 'unknown' ? ai.language : rec.language || 'unknown',
  };
}

// ───── یادآوری در کانال ─────
export function buildAnnouncement(rec) {
  const sport = SPORTS[rec.sport] || SPORTS.other;
  const tags = [sport.tag, rec.isWomen ? WOMEN_TAG : null, '#افغانستان'].filter(Boolean).join(' ');
  const lang = LANGUAGES[rec.language] || '';
  return (
    `📅 <b>یادآوری مسابقه</b>\n\n` +
    `${sport.emoji} <b>${esc(rec.title)}</b>${rec.isWomen ? ' 🚺' : ''}\n` +
    `🕐 ${esc(formatDay(rec.startAt))} — ساعت ${esc(formatTime(rec.startAt))} (به وقت کابل)\n` +
    (lang ? `🎙 زبان پخش: <b>${esc(lang)}</b>\n` : '') +
    `📺 پخش زنده همین‌جا در کانال منتشر می‌شود.\n\n` +
    `${tags}\n${esc(CONFIG.CHANNEL_USERNAME)}`
  );
}

export async function announceEntry(env, rec) {
  const res = await tgApi(env, 'sendMessage', {
    chat_id: CONFIG.CHANNEL_ID,
    text: buildAnnouncement(rec),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{ text: '📅 برنامه همه مسابقات', url: `https://t.me/${CONFIG.BOT_USERNAME}?start=schedule` }]],
    },
  });
  if (!res.ok) return false;
  rec.announced = true;
  rec.announceMsgId = res.result?.message_id || null;
  await saveEntry(env, rec);
  return true;
}

// هر بار Cron: یادآوری‌ها و بستن مسابقه‌های گذشته
export async function processCalendar(env, settings) {
  const C = CONFIG.CALENDAR;
  const now = Date.now();

  for (const rec of await listEntries(env)) {
    try {
      if (rec.status === 'done') continue;

      // یادآوری
      if (
        settings.announce &&
        !rec.announced &&
        rec.status === 'scheduled' &&
        rec.startAt - now <= C.REMIND_BEFORE_MIN * 60000 &&
        now < rec.startAt + 10 * 60000
      ) {
        await announceEntry(env, rec);
      }

      // لایو پیدا نشد
      if (rec.status === 'scheduled' && now > rec.startAt + C.EXPIRE_AFTER_MIN * 60000) {
        rec.status = 'done';
        if (rec.announceMsgId) {
          const sport = SPORTS[rec.sport] || SPORTS.other;
          await tgApi(env, 'editMessageText', {
            chat_id: CONFIG.CHANNEL_ID,
            message_id: rec.announceMsgId,
            text: `⌛ ${sport.emoji} ${esc(rec.title)}\n\nزمان این مسابقه گذشت و پخش زنده‌ای برایش در دسترس نبود.`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          });
        }
        await saveEntry(env, rec);
        continue;
      }

      // مسابقه‌ای که لایوش شروع شده و مدتی گذشته
      if (rec.status === 'live' && now > rec.startAt + 6 * 3600e3) {
        rec.status = 'done';
        await saveEntry(env, rec);
      }
    } catch (e) {
      console.error('processCalendar error:', rec.id, e);
    }
  }
}

// ───── کشف خودکار از لایوهای زمان‌بندی‌شده یوتیوب ─────
export async function discoverUpcoming(env, videos, whitelist, settings) {
  const C = CONFIG.CALENDAR;
  const now = Date.now();
  let used = 0;

  for (const v of videos) {
    try {
      const startAt = Date.parse(v.scheduledStartTime || '');
      if (!startAt) continue;
      if (startAt > now + C.AUTO_WINDOW_HOURS * 3600e3 || startAt < now - 2 * 3600e3) continue;

      const existing = await getEntryByVideo(env, v.id);
      if (existing) {
        // زمان شروع در یوتیوب عوض شده
        if (existing.source === 'auto' && existing.status === 'scheduled' && Math.abs(existing.startAt - startAt) > 2 * 60000) {
          existing.startAt = startAt;
          await saveEntry(env, existing);
        }
        continue;
      }

      if (await cal(env).get('autoseen:' + v.id)) continue;
      const skip = () => cal(env).put('autoseen:' + v.id, '1', { expirationTtl: C.AUTO_WINDOW_HOURS * 3600 });

      if (settings.requireEmbeddable && v.embeddable === false) {
        await skip();
        continue;
      }
      if (used >= C.MAX_AUTO_ANALYSES_PER_RUN) continue;
      used++;

      const ai = await analyzeMatchWithGemini(v, whitelist, env);
      if (!ai.ok) continue;

      const relevant =
        ai.isSports && ai.isAfghan && settings.sports.includes(ai.sport) && ai.confidence >= CONFIG.REVIEW_CONFIDENCE;
      if (!relevant) {
        await skip();
        continue;
      }

      await saveEntry(env, {
        id: v.id,
        source: 'auto',
        title: String(v.title).slice(0, 120),
        sport: ai.sport,
        isWomen: ai.isWomen === true,
        language: ai.language,
        startAt,
        videoId: v.id,
        channelTitle: v.channelTitle,
        status: 'scheduled',
        announced: false,
        createdAt: now,
      });
    } catch (e) {
      console.error('discoverUpcoming error:', v.id, e);
    }
  }
  return used;
}

// ───── برنامه عمومی مسابقات (برای کاربران) ─────
export async function buildScheduleText(env) {
  const now = Date.now();
  const entries = (await upcomingEntries(env)).filter((r) => r.startAt < now + 7 * 86400e3).slice(0, 25);
  if (!entries.length) {
    return '📅 <b>برنامه مسابقات</b>\n\nفعلاً مسابقه‌ای ثبت نشده است. به‌زودی دوباره سر بزنید 🙏';
  }

  let text = '📅 <b>برنامه مسابقات</b> (به وقت کابل)\n';
  let lastDay = '';
  for (const r of entries) {
    const day = kabulDayKey(r.startAt);
    if (day !== lastDay) {
      text += `\n<b>${esc(formatDay(r.startAt))}</b>\n`;
      lastDay = day;
    }
    const sport = SPORTS[r.sport] || SPORTS.other;
    const lang = LANGUAGES[r.language] || '';
    const live =
      r.status === 'live' && r.videoId ? ` — 🔴 <a href="${miniAppUrl(r.videoId)}">تماشای زنده</a>` : '';
    text += `${sport.emoji} ${esc(formatTime(r.startAt))} — ${esc(r.title)}${r.isWomen ? ' 🚺' : ''}${lang ? ` 🎙${esc(lang)}` : ''}${live}\n`;
  }
  return text;
}

export async function sendPublicSchedule(env, chatId) {
  const text = hasCalendar(env) ? await buildScheduleText(env) : '📅 برنامه مسابقات فعلاً در دسترس نیست.';
  return tgApi(env, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{ text: '📢 ورود به کانال', url: `https://t.me/${CONFIG.CHANNEL_USERNAME.replace('@', '')}` }]],
    },
  });
}