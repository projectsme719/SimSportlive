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
  // اجرای خودکار هر ۵ دقیقه
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runLiveCheckProcess(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    // صفحه پخش داخل Mini App
    if (request.method === "GET" && url.pathname === "/watch") {
      return new Response(watchHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // وب‌هوک تلگرام
    if (request.method === "POST" && url.pathname === "/telegram-webhook") {
      const update = await request.json();

      if (update.callback_query) {
        await handleAdminCallback(update.callback_query, env);
      } else if (update.message) {
        await handleMessage(update.message, env);
      }
      return new Response("OK");
    }

    return new Response("SimSportLive Engine is Running!");
  },
};

// ───── پیام‌های ورودی به ربات ─────
async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const fromId = String(message.from?.id || "");
  const text = (message.text || "").trim();

  if (text.startsWith("/start")) {
    return sendText(env, chatId,
      "🇦🇫 به ربات سیم‌ورغ اسپورت خوش آمدید!\n\nپخش‌های زنده ورزش افغانستان را اینجا دنبال کنید.",
      { inline_keyboard: [[{ text: "📢 ورود به کانال", url: `https://t.me/${CONFIG.CHANNEL_USERNAME.replace("@", "")}` }]] }
    );
  }

  // لینک دستی فقط برای ادمین
  if (fromId !== CONFIG.ADMIN_ID) return;

  const match = text.match(/(?:live\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) {
    await handleManualLink(match[1], chatId, env);
  }
}

async function handleManualLink(videoId, chatId, env) {
  await sendText(env, chatId, "🔍 در حال تحلیل لینک...");

  const video = await getSingleVideoInfo(videoId, env.YOUTUBE_API_KEY);
  if (!video) {
    return sendText(env, chatId, "❌ اطلاعات این ویدیو پیدا نشد.");
  }

  const whitelist = await getWhitelist(env);
  const ai = await analyzeMatchWithGemini(video, whitelist, env.GEMINI_API_KEY);
  await sendAdminReview(video, ai, env);
}

// ───── بررسی خودکار لایوها ─────
async function runLiveCheckProcess(env) {
  const whitelist = await getWhitelist(env);

  for (const channelId of CONFIG.YOUTUBE_CHANNELS) {
    const video = await checkYouTubeLiveRSS(channelId, env.YOUTUBE_API_KEY);
    if (!video) continue;

    // جلوگیری از پردازش تکراری
    if (await env.POSTED_LIVES.get("posted:" + video.id)) continue;
    if (await env.POSTED_LIVES.get("pending:" + video.id)) continue;
    if (await env.POSTED_LIVES.get("seen:" + video.id)) continue;

    const ai = await analyzeMatchWithGemini(video, whitelist, env.GEMINI_API_KEY);

    if (ai.isAfghan && ai.confidence >= CONFIG.AUTO_PUBLISH_CONFIDENCE && ai.caption) {
      await publishToChannel(video, ai.caption, env);
      await env.POSTED_LIVES.put("posted:" + video.id, "1", { expirationTtl: 604800 });
    } else if (ai.isAfghan && ai.confidence >= CONFIG.REVIEW_CONFIDENCE) {
      await sendAdminReview(video, ai, env);
    } else {
      // غیرافغانی: سه ساعت دیگر بررسی نشود تا سهمیه Gemini هدر نرود
      await env.POSTED_LIVES.put("seen:" + video.id, "1", { expirationTtl: 10800 });
    }
  }
}

// ───── کمکی: لیست سفید از KV ─────
async function getWhitelist(env) {
  const keys = await env.ATHLETES_WHITELIST.list();
  return keys.keys.map((k) => k.name.replace("fighter:", ""));
}