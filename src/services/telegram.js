import { CONFIG } from '../config.js';

export async function sendLiveToChannel(videoUrl, caption, botToken) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload = {
    chat_id: CONFIG.CHANNEL_ID,
    text: `${caption}\n\n🔗 ${videoUrl}`,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📺 تماشای پخش زنده 🇦🇫", url: videoUrl }],
        [{ text: "📢 اشتراک‌گذاری", url: `https://t.me/share/url?url=${videoUrl}` }]
      ]
    }
  };
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function sendAdminApprovalRequest(video, aiResult, botToken) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const text = `⚠️ <b>پخش زنده جدید شناسایی شد!</b>\n\n` +
               `📌 <b>عنوان:</b> ${video.title}\n` +
               `📺 <b>کانال:</b> ${video.channelTitle}\n` +
               `🎯 <b>اطمینان AI:</b> ${aiResult.confidence}%\n\n` +
               `<b>کپشن پیشنهادی:</b>\n${aiResult.caption}\n\n` +
               `آیا منتشر شود؟`;

  const payload = {
    chat_id: CONFIG.ADMIN_ID,
    text: text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ تأیید", callback_data: `app:${video.id}` },
          { text: "❌ رد", callback_data: `rej:${video.id}` }
        ],
        [
          { text: "➕ افزودن نام به دیتابیس", callback_data: `add:${aiResult.fighterName || 'none'}` }
        ]
      ]
    }
  };
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function handleAdminCallback(callbackQuery, env) {
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;
  const chatId = callbackQuery.message.chat.id;

  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQuery.id })
  });

  if (data.startsWith("app:")) {
    const videoId = data.split(":")[1];
    const videoUrl = `https://www.youtube.com/live/${videoId}`;
    const textMsg = callbackQuery.message.text || "";
    const caption = textMsg.includes("کپشن پیشنهادی:\n") ? textMsg.split("کپشن پیشنهادی:\n")[1].split("\n\nآیا")[0] : "🔴 پخش زنده 🇦🇫";

    await sendLiveToChannel(videoUrl, caption, env.TELEGRAM_BOT_TOKEN);
    await env.POSTED_LIVES.put(videoId, "true", { expirationTtl: 604800 });
    await editMessageText(chatId, messageId, "✅ <b>پست در کانال منتشر شد!</b>", env.TELEGRAM_BOT_TOKEN);

  } else if (data.startsWith("rej:")) {
    await editMessageText(chatId, messageId, "❌ <b>پست رد شد.</b>", env.TELEGRAM_BOT_TOKEN);

  } else if (data.startsWith("add:")) {
    const name = data.split(":")[1];
    if (name && name !== "none") {
      await env.ATHLETES_WHITELIST.put(`fighter:${name.toLowerCase()}`, "true");
      await editMessageText(chatId, messageId, `✅ نام مبارز <b>${name}</b> به دیتابیس افزوده شد!`, env.TELEGRAM_BOT_TOKEN);
    }
  }
}

async function editMessageText(chatId, messageId, text, botToken) {
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text, parse_mode: "HTML" })
  });
}