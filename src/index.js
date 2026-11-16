import { CONFIG, SPORTS } from './config.js';
import {
  checkYouTubeLiveRSS,
  getSingleVideoInfo,
  resolveChannel,
} from './services/youtube.js';
import { analyzeMatchWithGemini } from './services/gemini.js';
import {
  publishToChannel,
  sendAdminReview,
  handleAdminCallback,
  sendText,
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
    ctx.waitUntil(runLiveCheckProcess(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/watch') {
      return new Response(watchHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
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
              await handleAdminCallback(update.callback_query, env);
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

// ───── پیام‌های ورودی به ربات ─────
const HELP_TEXT =
  '📋 دستورهای ادمین:\n\n' +
  '• لینک لایو یوتیوب را بفرستید تا تحلیل شود\n' +
  '/channels — فهرست کانال‌های یوتیوب\n' +
  '/addchannel <آیدی UC... یا @handle یا لینک> — افزودن کانال\n' +
  '/removechannel <آیدی UC...> — حذف کانال افزوده‌شده\n' +
  '/names — فهرست نام ورزشکاران/تیم‌ها\n' +
  '/addname <نام> — افزودن نام\n' +
  '/removename <نام> — حذف نام';

async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const fromId = message.from?.id;
  const text = (message.text || '').trim();

  if (text.startsWith('/start')) {
    return sendText(
      env,
      chatId,
      '🇦🇫 به ربات سیم‌ورغ اسپورت خوش آمدید!\n\nپخش‌های زنده ورزش افغانستان (فوتبال، فوتسال، کرکت، ورزش‌های رزمی و ورزش بانوان) را اینجا دنبال کنید.',
      {
        inline_keyboard: [
          [{ text: '📢 ورود به کانال', url: `https://t.me/${CONFIG.CHANNEL_USERNAME.replace('@', '')}` }],
        ],
      }
    );
  }

  // بقیه امکانات فقط برای ادمین
  if (fromId !== CONFIG.ADMIN_ID) return;

  if (text.startsWith('/')) return handleAdminCommand(text, chatId, env);

  const match = text.match(/(?:live\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) await handleManualLink(match[1], chatId, env);
}

async function handleAdminCommand(text, chatId, env) {
  const [rawCmd, ...rest] = text.split(/\s+/);
  const cmd = rawCmd.split('@')[0].toLowerCase();
  const arg = rest.join(' ').trim();

  try {
    if (cmd === '/help') return sendText(env, chatId, HELP_TEXT);

    if (cmd === '/channels') {
      const extra = await getExtraChannels(env);
      const lines = [
        ...CONFIG.YOUTUBE_CHANNELS.map((id) => `• ${id} (ثابت)`),
        ...extra.map((c) => `• ${c.id}${c.title ? ' — ' + c.title : ''}`),
      ];
      return sendText(env, chatId, `📺 کانال‌ها (${lines.length}):\n\n${lines.join('\n')}`);
    }

    if (cmd === '/addchannel') {
      if (!arg) return sendText(env, chatId, 'مثال:\n/addchannel @AfghanistanCricketBoard');
      const ch = await resolveChannel(arg, env.YOUTUBE_API_KEY);
      if (!ch) return sendText(env, chatId, '❌ کانال پیدا نشد. آیدی UC...، @handle یا لینک کانال بفرستید.');
      await env.POSTED_LIVES.put('channel:' + ch.id, ch.title || '1');
      return sendText(env, chatId, `✅ کانال اضافه شد:\n${ch.title}\n${ch.id}`);
    }

    if (cmd === '/removechannel') {
      const id = (arg.match(/UC[A-Za-z0-9_-]{22}/) || [])[0];
      if (!id) return sendText(env, chatId, 'مثال:\n/removechannel UCxxxxxxxxxxxxxxxxxxxxxx');
      if (CONFIG.YOUTUBE_CHANNELS.includes(id)) {
        return sendText(env, chatId, '⚠️ این کانال ثابت است و باید از config.js حذف شود.');
      }
      await env.POSTED_LIVES.delete('channel:' + id);
      return sendText(env, chatId, '🗑 حذف شد (اگر وجود داشت).');
    }

    if (cmd === '/names') {
      const names = await getWhitelist(env);
      return sendText(env, chatId, names.length ? `📋 نام‌ها (${names.length}):\n\n${names.join('\n')}` : 'فهرست خالی است.');
    }

    if (cmd === '/addname') {
      if (!arg) return sendText(env, chatId, 'مثال:\n/addname تیم ملی کرکت افغانستان');
      await env.ATHLETES_WHITELIST.put('fighter:' + arg.toLowerCase(), 'true');
      return sendText(env, chatId, `✅ «${arg}» اضافه شد.`);
    }

    if (cmd === '/removename') {
      if (!arg) return sendText(env, chatId, 'مثال:\n/removename نام');
      await env.ATHLETES_WHITELIST.delete('fighter:' + arg.toLowerCase());
      return sendText(env, chatId, '🗑 حذف شد (اگر وجود داشت).');
    }

    return sendText(env, chatId, HELP_TEXT);
  } catch (e) {
    console.error('admin command error:', e);
    return sendText(env, chatId, `❌ خطا: ${String(e?.message || e).slice(0, 300)}`);
  }
}

async function handleManualLink(videoId, chatId, env) {
  await sendText(env, chatId, '🔍 در حال تحلیل لینک...');

  try {
    if (!env.YOUTUBE_API_KEY) {
      return sendText(env, chatId, '❌ سکرت YOUTUBE_API_KEY در کلودفلر تنظیم نشده است.');
    }

    const video = await getSingleVideoInfo(videoId, env.YOUTUBE_API_KEY);
    if (!video) {
      return sendText(env, chatId, '❌ اطلاعات این ویدیو پیدا نشد (آیدی یا YOUTUBE_API_KEY را بررسی کنید).');
    }

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

// ───── بررسی خودکار لایوها ─────
async function runLiveCheckProcess(env) {
  const whitelist = await getWhitelist(env);
  const channels = await getAllChannelIds(env);

  // همه کانال‌ها هم‌زمان بررسی می‌شوند
  const results = await Promise.allSettled(
    channels.map((id) => checkYouTubeLiveRSS(id, env.YOUTUBE_API_KEY))
  );

  const seenNow = new Set();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;

    for (const video of r.value) {
      if (seenNow.has(video.id)) continue;
      seenNow.add(video.id);

      try {
        if (await env.POSTED_LIVES.get('posted:' + video.id)) continue;
        if (await env.POSTED_LIVES.get('pending:' + video.id)) continue;
        if (await env.POSTED_LIVES.get('seen:' + video.id)) continue;

        const ai = await analyzeMatchWithGemini(video, whitelist, env);
        if (!ai.ok) continue; // دور بعد دوباره تلاش می‌شود

        // ورزش غیرفعال
        if (!CONFIG.ENABLED_SPORTS.includes(ai.sport)) {
          await env.POSTED_LIVES.put('seen:' + video.id, '1', { expirationTtl: 10800 });
          continue;
        }

        if (ai.isAfghan && ai.confidence >= CONFIG.AUTO_PUBLISH_CONFIDENCE) {
          const ok = await publishToChannel(video, ai, env);
          if (ok) await env.POSTED_LIVES.put('posted:' + video.id, '1', { expirationTtl: 604800 });
        } else if (ai.isAfghan && ai.confidence >= CONFIG.REVIEW_CONFIDENCE) {
          await sendAdminReview(video, ai, env);
        } else {
          await env.POSTED_LIVES.put('seen:' + video.id, '1', { expirationTtl: 10800 });
        }
      } catch (e) {
        console.error(`Error processing ${video.id}:`, e);
      }
    }
  }
}

// ───── کمکی‌ها ─────
async function getWhitelist(env) {
  const out = await env.ATHLETES_WHITELIST.list({ prefix: 'fighter:' });
  return out.keys.map((k) => k.name.replace('fighter:', ''));
}

async function getExtraChannels(env) {
  const out = await env.POSTED_LIVES.list({ prefix: 'channel:' });
  const items = [];
  for (const k of out.keys) {
    const title = await env.POSTED_LIVES.get(k.name);
    items.push({ id: k.name.replace('channel:', ''), title: title && title !== '1' ? title : '' });
  }
  return items;
}

async function getAllChannelIds(env) {
  const extra = await getExtraChannels(env);
  return [...new Set([...CONFIG.YOUTUBE_CHANNELS, ...extra.map((c) => c.id)])];
}
