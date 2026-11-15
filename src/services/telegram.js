import { CONFIG } from '../config.js';

// ارسال به کانال تلگرام
export async function sendToChannel(botToken, photoUrl, caption, videoId) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  // لینک رسمی مینی‌اپ تلگرام با پارامتر اختصاصی ویدیو
  const miniAppUrl = `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_SHORT_NAME}?startapp=${videoId}`;

  const body = {
    chat_id: CONFIG.CHANNEL_ID,
    photo: photoUrl,
    caption: caption,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: "👁 تماشای زنده (در تلگرام)", url: miniAppUrl }
      ]]
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return await res.json();
}

// ارسال به ادمین جهت تایید
export async function sendToAdmin(botToken, videoId, title, photoUrl, aiResult) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  
  const miniAppUrl = `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_SHORT_NAME}?startapp=${videoId}`;

  const text = `⚠️ **پخش زنده جدید جهت بررسی**\n\n` +
    `📌 **عنوان اصلی:** ${title}\n` +
    `🎯 **اطمینان AI:** ${aiResult.confidence}%\n` +
    `🇦🇫 **افغانی:** ${aiResult.isAfghan ? 'بله' : 'خیر'}\n\n` +
    `📝 **کپشن پیشنهادی برای کانال:**\n${aiResult.caption}`;

  const body = {
    chat_id: CONFIG.ADMIN_ID,
    photo: photoUrl,
    caption: text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: "👁 پیش‌نمایش پخش", url: miniAppUrl }
        ],
        [
          { text: "✅ تأیید و انتشار", callback_data: `app:${videoId}` },
          { text: "❌ رد کردن", callback_data: `rej:${videoId}` }
        ],
        [
          { text: "➕ افزودن نام مبارز به لیست", callback_data: `add:${aiResult.fighterName}` }
        ]
      ]
    }
  };

  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}