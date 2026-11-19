import { CONFIG } from './config.js';
import { checkChannelStreams } from './services/youtube.js';
import { analyzeMatchWithGemini } from './services/gemini.js';
import { hasMatchStarted } from './services/matchstart.js';
import { getSettings } from './services/settings.js';
import { processActivePosts } from './services/lifecycle.js';
import { getWhitelist, getAllChannels, seedDefaultChannels } from './services/store.js';
import { handlePanelCallback, handleAdminText } from './services/admin.js';
import {
  hasCalendar, processCalendar, discoverUpcoming, findCandidates,
  getEntryByVideo, getEntry, linkVideo, applyEntry, sendPublicSchedule,
} from './services/calendar.js';
import {
  publishToChannel,
  sendAdminReview,
  handleAdminCallback,
  sendText,
  answerCb,
} from './services/telegram.js';
import { watchHtml } from './watch.js';

async function saveOrigin(env, origin) {
  try {
    if (env.WORKER_URL) return;
    const cur = await env.POSTED_LIVES.get('config:origin');
    if (cur !== origin) await env.POSTED_LIVES.put('config:origin', origin);
  } catch (e) {
    console.error('saveOrigin error:', e);
  }
}

export default {
  // اجرای خودکار هر ۵ دقیقه (Cron Trigger)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCron(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/watch') {
      return new Response(watchHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    // وضعیت پایان پخش (برای منقضی کردن لینک در Mini App)
    if (request.method === 'GET' && url.pathname === '/api/status') {
      const v = url.searchParams.get('v') || '';
      let ended = false;
      if (/^[A-Za-z0-9_-]{11}$/.test(v)) {
        try {
          ended = !!(await env.POSTED_LIVES.get('ended:' + v));
        } catch {}
      }
      return new Response(JSON.stringify({ ended }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // ثبت وب‌هوک: https://<worker>/setup?key=<TELEGRAM_WEBHOOK_SECRET>
    if (request.method === 'GET' && url.pathname === '/setup') {
      if (!env.TELEGRAM_WEBHOOK_SECRET || url.searchParams.get('key') !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('Forbidden', { status: 403 });
      }
      await saveOrigin(env, url.origin);
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${url.origin}/telegram-webhook`,
          secret_token: env.TELEGRAM_WEBHOOK_SECRET,
          allowed_updates: ['message', 'callback_query'],
        }),
      });
      return new Response(await res.text(), { headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'POST' && url.pathname === '/telegram-webhook') {
      if (
        env.TELEGRAM_WEBHOOK_SECRET &&
        request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET
      ) {
        return new Response('Forbidden', { status: 403 });
      }

      let update;
      try {
        update = await request.json();
      } catch {
        return new Response('Bad Request', { status: 400 });
      }

      ctx.waitUntil(
        (async () => {
          try {
            await saveOrigin(env, url.origin);
            if (update.callback_query) {
              await routeCallback(update.callback_query, env);
            } else if (update.message) {
              await handleMessage(update.message, env);
            }
          } catch (e) {
            console.error('Webhook handler error:', e);
          }
        })()
      );
      return new Response('OK');
    }

    return new Response('SimSportLive Engine is Running!');
  },
};

// ───── مسیریابی دکمه‌ها ─────
async function routeCallback(cb, env) {
  const data = cb.data || '';

  // دکمه‌های عمومی (برای همه کاربران)
  if (data === 'ended') {
    return answerCb(env, cb.id, '🏁 این پخش زنده به پایان رسیده است.', true);
  }
  if (data === 'done') return answerCb(env, cb.id);
  if (data === 'sch') {
    await answerCb(env, cb.id);
    return sendPublicSchedule(env, cb.message?.chat?.id || cb.from.id);
  }

  // بقیه فقط ادمین
  if (cb.from?.id !== CONFIG.ADMIN_ID) return answerCb(env, cb.id, '⛔ فقط ادمین', true);

  if (data.startsWith('m:')) return handlePanelCallback(cb, env);
  return handleAdminCallback(cb, env);
}

// ───── پیام‌های ورودی ─────
async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const fromId = message.from?.id;
  const text = (message.text || '').trim();

  // برنامه مسابقات (برای همه، از جمله لینک دکمه پست کانال)
  if (/^\/(start\s+schedule|schedule)(@\w+)?\s*$/i.test(text)) {
    return sendPublicSchedule(env, chatId);
  }

  // ادمین: پنل دکمه‌ای
  if (fromId === CONFIG.ADMIN_ID && message.chat.type === 'private') {
    return handleAdminText(message, env);
  }

  if (text.startsWith('/start')) {
    return sendText(
      env,
      chatId,
      '🇦🇫 به ربات سیم‌ورغ اسپورت خوش آمدید!\n\nپخش‌های زنده ورزش افغانستان (فوتبال، فوتسال، کرکت، ورزش‌های رزمی و ورزش بانوان) را اینجا دنبال کنید.',
      {
        inline_keyboard: [
          [{ text: '📅 برنامه مسابقات', callback_data: 'sch' }],
          [{ text: '📢 ورود به کانال', url: `https://t.me/${CONFIG.CHANNEL_USERNAME.replace('@', '')}` }],
        ],
      }
    );
  }
}

// ───── Cron ─────
async function runCron(env) {
  await seedDefaultChannels(env);

  // پایان‌دادن به پست‌های لایوهای تمام‌شده
  try {
    await processActivePosts(env);
  } catch (e) {
    console.error('processActivePosts error:', e);
  }

  const settings = await getSettings(env);

  // یادآوری‌ها و بستن مسابقه‌های گذشته در تقویم
  if (hasCalendar(env)) {
    try {
      await processCalendar(env, settings);
    } catch (e) {
      console.error('processCalendar error:', e);
    }
  }

  await runLiveCheckProcess(env, settings);
}

async function runLiveCheckProcess(env, settings) {
  const whitelist = await getWhitelist(env);
  const channels = [...(await getAllChannels(env)).entries()]; // [[id, {trusted}], ...]

  const results = await Promise.allSettled(
    channels.map(([id]) => checkChannelStreams(id, env.YOUTUBE_API_KEY))
  );

  const seenNow = new Set();
  const upcomingAll = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status !== 'fulfilled') continue;
    const trusted = channels[i][1].trusted === true;

    for (const u of results[i].value.upcoming) {
      u.trusted = trusted;
      upcomingAll.push(u);
    }

    for (const video of results[i].value.live) {
      if (seenNow.has(video.id)) continue;
      seenNow.add(video.id);
      video.trusted = trusted;

      try {
        await processLiveVideo(video, whitelist, settings, env);
      } catch (e) {
        console.error(`Error processing ${video.id}:`, e);
      }
    }
  }

  // لایوهای زمان‌بندی‌شده → تقویم (خودکار)
  if (settings.autoCalendar && hasCalendar(env) && upcomingAll.length) {
    try {
      await discoverUpcoming(env, upcomingAll, whitelist, settings);
    } catch (e) {
      console.error('discoverUpcoming error:', e);
    }
  }
}

async function processLiveVideo(video, whitelist, settings, env) {
  const kv = env.POSTED_LIVES;
  const id = video.id;

  if (await kv.get('posted:' + id)) return;
  if (await kv.get('pending:' + id)) return;
  if (await kv.get('seen:' + id)) return;

  // مسابقه ثبت‌شده در تقویم برای این لایو
  let entry = null;
  if (hasCalendar(env)) {
    try {
      entry = await getEntryByVideo(env, id);
    } catch {}
  }

  // ۱) تحلیل متنی (برای لایوهای در انتظار کش می‌شود تا Gemini تکراری صدا نشود)
  let ai = null;
  const cached = await kv.get('wait:' + id);
  if (cached) {
    try {
      ai = JSON.parse(cached).ai;
    } catch {}
  }
  if (!ai) {
    let candidates = [];
    if (hasCalendar(env) && !entry) {
      try {
        candidates = await findCandidates(env);
      } catch {}
    }
    ai = await analyzeMatchWithGemini(video, whitelist, env, candidates);
    if (!ai.ok) return; // دور بعد دوباره تلاش می‌شود

    // Gemini تشخیص داد این لایو همان مسابقه تقویم است
    if (!entry && ai.calendarId) {
      entry = await getEntry(env, ai.calendarId);
      if (entry) await linkVideo(env, entry, id);
    }
  }
  if (entry) ai = applyEntry(ai, entry);

  // ۲) مرتبط بودن (مسابقه ثبت‌شده در تقویم همیشه مرتبط است)
  const relevant =
    !!entry ||
    (ai.isSports &&
      ai.isAfghan &&
      settings.sports.includes(ai.sport) &&
      ai.confidence >= CONFIG.REVIEW_CONFIDENCE);
  if (!relevant) {
    await kv.delete('wait:' + id);
    await kv.put('seen:' + id, '1', { expirationTtl: 10800 });
    return;
  }

  // ۳) فقط لایوهایی که داخل تلگرام قابل پخش‌اند
  if (settings.requireEmbeddable && video.embeddable === false) {
    await kv.delete('wait:' + id);
    await kv.put('seen:' + id, '1', { expirationTtl: 43200 });
    if (CONFIG.NOTIFY_ADMIN_NOT_EMBEDDABLE) {
      await sendText(
        env,
        CONFIG.ADMIN_ID,
        `🚫 لایو افغانی پیدا شد ولی پخش داخل تلگرام برایش ممکن نیست (امبد ممنوع یا محدود)، پس منتشر نشد:\n\n${video.title}\n${video.channelTitle}\n${video.link}`
      );
    }
    return;
  }

  // ۴) صبر تا شروع واقعی مسابقه
  const start = await hasMatchStarted(video, env, settings);
  if (!start.started) {
    const slim = { ...video, description: String(video.description || '').slice(0, 300) };
    await kv.put('wait:' + id, JSON.stringify({ ai, video: slim, savedAt: Date.now() }), {
      expirationTtl: 43200,
    });
    return;
  }

  // ۵) انتشار (یا ارسال برای تأیید ادمین)
  await kv.delete('wait:' + id);
  if (settings.autoPublish && ai.confidence >= CONFIG.AUTO_PUBLISH_CONFIDENCE) {
    const ok = await publishToChannel(video, ai, env);
    if (ok) await kv.put('posted:' + id, '1', { expirationTtl: 604800 });
  } else {
    await sendAdminReview(video, ai, env);
  }
}
