import { CONFIG } from './config.js';
import { analyzeMatchWithGemini } from './services/gemini.js';
import { parseVsPattern, scrapeTapologyAfghanFighters } from './services/discovery.js';
import { sendLiveToChannel, sendAdminApprovalRequest } from './services/telegram.js';
import miniappHtml from '../public/miniapp.html';

export default {
  // ۱. کنترل‌کننده Cron Jobs
  async scheduled(event, env, ctx) {
    if (event.cron === "0 0 * * 0") {
      // اجرای اسکراپ هفتگی برای کشف پویا
      ctx.waitUntil(scrapeTapologyAfghanFighters(env));
    } else {
      // بررسی ۵ دقیقه‌ای لایوهای یوتیوب
      ctx.waitUntil(processLiveStreams(env));
    }
  },

  // ۲. کنترل‌کننده درخواست‌های HTTP (وب‌هوک تلگرام و سرو Mini App)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // سرو کردن فرانت‌اند مینی‌اپ تلگرام
    if (url.pathname === "/miniapp") {
      return new Response(miniappHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // دریافت کال‌بک دکمه‌های شیشه‌ای ادمین (تأیید یا رد)
    if (request.method === "POST" && url.pathname === "/telegram-webhook") {
      const update = await request.json();
      if (update.callback_query) {
        await handleAdminCallback(update.callback_query, env);
      }
      return new Response("OK");
    }

    return new Response("SimSportLive Engine is Running!");
  }
};

async function processLiveStreams(env) {
  for (const channelId of CONFIG.YOUTUBE_CHANNELS) {
    const liveVideo = await fetchYouTubeLive(channelId, env.YOUTUBE_API_KEY);
    if (!liveVideo) continue;

    // بررسی عدم ارسال تکراری
    const isPosted = await env.POSTED_LIVES.get(liveVideo.id);
    if (isPosted) continue;

    // تحلیل با Gemini API
    const aiResult = await analyzeMatchWithGemini(liveVideo.title, liveVideo.description, env.GEMINI_API_KEY);

    if (aiResult.isAfghan && aiResult.confidence >= 80) {
      // اطمینان بالا -> ارسال مستقیم به کانال
      await sendLiveToChannel(liveVideo.link, aiResult.caption, env.TELEGRAM_BOT_TOKEN);
      await env.POSTED_LIVES.put(liveVideo.id, "true", { expirationTtl: 604800 });
    } else if (aiResult.confidence >= 40 || parseVsPattern(liveVideo.title)) {
      // مشکوک -> ارسال به ادمین برای تأیید
      await sendAdminApprovalRequest(liveVideo, aiResult, env.TELEGRAM_BOT_TOKEN);
    }
  }
}

async function fetchYouTubeLive(channelId, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    const item = data.items[0];
    return {
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      link: `https://www.youtube.com/live/${item.id.videoId}`
    };
  }
  return null;
}