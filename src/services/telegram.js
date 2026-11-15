import { CONFIG } from '../config.js';

// ارسال مستقیم به کانال SimSportlive
export async function sendLiveToChannel(videoUrl, caption, botToken) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const payload = {
    chat_id: CONFIG.CHANNEL_ID,
    text: `${caption}\n\n🔗 ${videoUrl}`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📺 تماشای پخش زنده 🇦🇫", url: videoUrl }
        ],
        [
          { text: "📊 نتایج زنده و تقویم مسابقات", web_app: { url: CONFIG.MINI_APP_URL } }
        ]
      ]
    }
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

// ارسال به چت خصوصی ادمین برای موارد مشکوک (Human Feedback Loop)
export async function sendAdminApprovalRequest(video, aiResult, botToken) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const text = `⚠️ <b>پخش زنده مشکوک شناسایی شد!</b>\n\n` +
               `📌 <b>عنوان:</b> ${video.title}\n` +
               `📺 <b>کانال:</b> ${video.channelTitle}\n` +
               `🎯 <b>درصد اطمینان AI:</b> ${aiResult.confidence}%\n\n` +
               `آیا این مسابقه مربوط به ورزشکاران افغان است؟`;

  const payload = {
    chat_id: CONFIG.ADMIN_ID,
    text: text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ تأیید و ارسال به کانال", callback_data: `approve:${video.id}` },
          { text: "❌ رد کردن", callback_data: `reject:${video.id}` }
        ],
        [
          { text: "➕ افزودن فایتر به لیست سفید", callback_data: `add_whitelist:${aiResult.fighterName || 'unknown'}` }
        ]
      ]
    }
  };

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}