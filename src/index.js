import { CONFIG } from './config.js';
import { checkYouTubeLiveRSS, getSingleVideoInfo } from './services/youtube.js';
import { analyzeMatchWithGemini } from './services/gemini.js';
import {
  publishToChannel,
  sendAdminReview,
  handleAdminCallback,
  sendText,
} from './services/telegram.js';
import { watchHtml } from './watch.js';

export default {
  // اجرای خودکار هر ۵ دقیقه (Cron Trigger)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runLiveCheckProcess(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // صفحه پخش داخل Mini App
    if (request.method === 'GET' && url.pathname === '/watch') {
      return new Response(watchHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    // ثبت وب‌هوک: https://<worker>/setup?key=<TELEGRAM_WEBHOOK_SECRET>
    if (request.method === 'GET' && url.pathname === '/setup') {
      if (!env.TELEGRAM_WEBHOOK_SECRET || url.searchParams.get('key') !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('Forbidden', { status: 403 });
      }
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

    // وب‌هوک تلگرام
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

      // پردازش در پس‌زمینه؛ همیشه سریع 200 برمی‌گردد تا تلگرام تکرار نکند
      ctx.waitUntil(
        (async () => {
          try {
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
async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const fromId = message.from?.id;
  const text = (message.text || '').trim();

  if (text.startsWith('/start')) {
    return sendText(
      env,
      chatId,
      '🇦🇫 به ربات سیم‌ورغ اسپورت خوش آمدید!\n\nپخش‌های زنده ورزش افغانستان را اینجا دنبال کنید.',
      {
        inline_keyboard: [
          [{ text: '📢 ورود به کانال', url: `https://t.me/${CONFIG.CHANNEL_USERNAME.replace('@', '')}` }],
        ],
      }
    );
  }

  // لینک دستی فقط برای ادمین
  if (fromId !== CONFIG.ADMIN_ID) return;

  const match = text.match(/(?:live\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) await handleManualLink(match[1], chatId, env);
}

async function handleManualLink(videoId, chatId, env) {
  await sendText(env, chatId, '🔍 در حال تحلیل لینک...');

  // هر مرحله جدا بررسی می‌شود تا خطا مستقیم در چت نمایش داده شود
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
    if (!sent) {
      await sendText(env, chatId, '❌ ارسال پیام بررسی ناموفق بود. لاگ Cloudflare را ببینید.');
    }
  } catch (e) {
    console.error('handleManualLink error:', e);
    await sendText(env, chatId, `❌ خطا: ${String(e?.message || e).slice(0, 400)}`);
  }
}

// ───── بررسی خودکار لایوها ─────
async function runLiveCheckProcess(env) {
  const whitelist = await getWhitelist(env);

  for (const channelId of CONFIG.YOUTUBE_CHANNELS) {
    const videos = await checkYouTubeLiveRSS(channelId, env.YOUTUBE_API_KEY);

    for (const video of videos) {
      try {
        // جلوگیری از پردازش تکراری
        if (await env.POSTED_LIVES.get('posted:' + video.id)) continue;
        if (await env.POSTED_LIVES.get('pending:' + video.id)) continue;
        if (await env.POSTED_LIVES.get('seen:' + video.id)) continue;

        const ai = await analyzeMatchWithGemini(video, whitelist, env);

        // خطای Gemini: ثبت نمی‌کنیم تا دور بعد دوباره تلاش شود
        if (!ai.ok) continue;

        if (ai.isAfghan && ai.confidence >= CONFIG.AUTO_PUBLISH_CONFIDENCE && ai.caption) {
          const ok = await publishToChannel(video, ai.caption, env);
          if (ok) await env.POSTED_LIVES.put('posted:' + video.id, '1', { expirationTtl: 604800 });
        } else if (ai.isAfghan && ai.confidence >= CONFIG.REVIEW_CONFIDENCE) {
          await sendAdminReview(video, ai, env);
        } else {
          // غیرافغانی: سه ساعت دیگر بررسی نشود تا سهمیه Gemini هدر نرود
          await env.POSTED_LIVES.put('seen:' + video.id, '1', { expirationTtl: 10800 });
        }
      } catch (e) {
        console.error(`Error processing ${video.id}:`, e);
      }
    }
  }
}

// ───── لیست سفید از KV ─────
async function getWhitelist(env) {
  const out = await env.ATHLETES_WHITELIST.list({ prefix: 'fighter:' });
  return out.keys.map((k) => k.name.replace('fighter:', ''));
}