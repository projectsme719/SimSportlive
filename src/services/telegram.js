import { CONFIG } from '../config.js';

// ───── ابزارهای پایه ─────
export async function callApi(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) console.error(`Telegram ${method} error:`, JSON.stringify(data));
  return data;
}

export function thumbnailUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// لینک Mini App که پلیر را داخل خود تلگرام باز می‌کند
export function watchLink(videoId) {
  return `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.MINIAPP_SHORT_NAME}?startapp=${videoId}`;
}

function fallbackCaption() {
  return "🔴 پخش زنده ورزش افغانستان 🇦🇫\n\nهمین حالا تماشا کنید!";
}

export async function sendText(env, chatId, text, markup) {
  const body = { chat_id: chatId, text };
  if (markup) body.reply_markup = markup;
  return callApi(env, "sendMessage", body);
}

// ───── انتشار در کانال ─────
export async function publishToChannel(video, caption, env) {
  const finalCaption = (caption && caption.trim()) ? caption : fallbackCaption();

  return callApi(env, "sendPhoto", {
    chat_id: CONFIG.CHANNEL_ID,
    photo: thumbnailUrl(video.id),
    caption: finalCaption.slice(0, 1024),
    reply_markup: {
      inline_keyboard: [
        [{ text: "📺 تماشای زنده داخل تلگرام 🇦🇫", url: watchLink(video.id) }],
        [{
          text: "📢 اشتراک‌گذاری",
          url: `https://t.me/share/url?url=${encodeURIComponent("https://www.youtube.com/live/" + video.id)}`
        }],
      ],
    },
  });
}

// ───── ارسال درخواست تأیید به ادمین ─────
export async function sendAdminReview(video, ai, env) {
  // ذخیره اطلاعات کامل برای استفاده در مرحله تأیید
  await env.POSTED_LIVES.put(
    "pending:" + video.id,
    JSON.stringify({ video, caption: ai.caption, fighterName: ai.fighterName }),
    { expirationTtl: 86400 }
  );

  const caption =
    `⚠️ پخش زنده جدید\n\n` +
    `📌 ${video.title}\n` +
    `📺 کانال: ${video.channelTitle}\n` +
    `🎯 اطمینان AI: ${ai.confidence}%\n\n` +
    `📝 کپشن پیشنهادی:\n${ai.caption || "(AI کپشن نساخت - احتمالاً غیرافغانی است)"}\n\n` +
    `آیا منتشر شود؟`;

  return callApi(env, "sendPhoto", {
    chat_id: CONFIG.ADMIN_ID,
    photo: thumbnailUrl(video.id),
    caption: caption.slice(0, 1024),
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ تأیید و ارسال", callback_data: "app:" + video.id },
          { text: "❌ رد", callback_data: "rej:" + video.id },
        ],
        [{ text: "👁 پیش‌نمایش پخش", url: watchLink(video.id) }],
        [{ text: "➕ افزودن نام فایتر به دیتابیس", callback_data: "add:" + video.id }],
      ],
    },
  });
}

// ───── مدیریت دکمه‌های ادمین ─────
export async function handleAdminCallback(cb, env) {
  await callApi(env, "answerCallbackQuery", { callback_query_id: cb.id });

  // فقط ادمین اجازه دارد
  if (String(cb.from.id) !== CONFIG.ADMIN_ID) return;

  const [action, videoId] = cb.data.split(":");
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;

  const edit = (text) =>
    callApi(env, "editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: text,
    });

  const raw = await env.POSTED_LIVES.get("pending:" + videoId);
  if (!raw) {
    return edit("⚠️ این درخواست منقضی شده یا قبلاً پردازش شده است.");
  }
  const pending = JSON.parse(raw);

  if (action === "app") {
    await publishToChannel(pending.video, pending.caption, env);
    await env.POSTED_LIVES.put("posted:" + videoId, "1", { expirationTtl: 604800 });
    await env.POSTED_LIVES.delete("pending:" + videoId);
    return edit("✅ پست با موفقیت در کانال منتشر شد.");
  }

  if (action === "rej") {
    await env.POSTED_LIVES.delete("pending:" + videoId);
    await env.POSTED_LIVES.put("seen:" + videoId, "1", { expirationTtl: 10800 });
    return edit("❌ پست رد شد.");
  }

  if (action === "add") {
    if (!pending.fighterName) {
      return edit("⚠️ AI نام فایتری را تشخیص نداده بود.");
    }
    await env.ATHLETES_WHITELIST.put("fighter:" + pending.fighterName.toLowerCase(), "true");
    return edit(`✅ نام «${pending.fighterName}» به دیتابیس اضافه شد.`);
  }
}
