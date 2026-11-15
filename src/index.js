import { CONFIG } from './config.js';
import { checkYouTubeLiveRSS, getSingleVideoInfo } from './services/youtube.js';
import { analyzeMatchWithGemini } from './services/gemini.js';
import { sendLiveToChannel, sendAdminApprovalRequest, handleAdminCallback } from './services/telegram.js';
import { miniappHtml } from './miniapp.js'; // استفاده از فایل JS برای جلوگیری از خطای بیلد

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runLiveCheckProcess(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/miniapp") {
      return new Response(miniappHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (request.method === "POST" && url.pathname === "/telegram-webhook") {
      const update = await request.json();

      if (update.callback_query) {
        await handleAdminCallback(update.callback_query, env);
      }
      if (update.message && update.message.text) {
        await handleIncomingText(update.message, env);
      }
      return new Response("OK");
    }

    return new Response("SimSportLive Engine is Running!");
  }
};

async function runLiveCheckProcess(env) {
  const whitelistKeys = await env.ATHLETES_WHITELIST.list();
  const whitelistNames = whitelistKeys.keys.map(k => k.name.replace("fighter:", ""));

  for (const channelId of CONFIG.YOUTUBE_CHANNELS) {
    const video = await checkYouTubeLiveRSS(channelId, env.YOUTUBE_API_KEY);
    if (!video) continue;

    const isPosted = await env.POSTED_LIVES.get(video.id);
    if (isPosted) continue;

    const aiResult = await analyzeMatchWithGemini(video, whitelistNames, env.GEMINI_API_KEY);

    if (aiResult.isAfghan && aiResult.confidence >= 80) {
      await sendLiveToChannel(video.link, aiResult.caption, env.TELEGRAM_BOT_TOKEN);
      await env.POSTED_LIVES.put(video.id, "true", { expirationTtl: 604800 });
    } else if (aiResult.confidence >= 35) {
      await sendAdminApprovalRequest(video, aiResult, env.TELEGRAM_BOT_TOKEN);
    }
  }
}

async function handleIncomingText(message, env) {
  const text = message.text;
  const chatId = message.chat.id;

  const ytMatch = text.match(/(?:live\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "🔍 در حال تحلیل لینک..." })
    });

    const video = await getSingleVideoInfo(videoId, env.YOUTUBE_API_KEY);
    if (video) {
      const whitelistKeys = await env.ATHLETES_WHITELIST.list();
      const whitelistNames = whitelistKeys.keys.map(k => k.name.replace("fighter:", ""));
      
      const aiResult = await analyzeMatchWithGemini(video, whitelistNames, env.GEMINI_API_KEY);
      await sendAdminApprovalRequest(video, aiResult, env.TELEGRAM_BOT_TOKEN);
    } else {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "❌ اطلاعات ویدیو یافت نشد یا ویدیو لایو نیست." })
      });
    }
  }
}