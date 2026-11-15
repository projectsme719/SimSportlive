import { CONFIG } from '../config.js';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function tg(env, method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) console.error(`Telegram ${method} failed:`, JSON.stringify(data));
    return data;
  } catch (e) {
    console.error(`Telegram ${method} exception:`, e);
    return { ok: false, description: String(e?.message || e) };
  }
}

export function miniAppUrl(videoId) {
  return `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_SHORT_NAME}?startapp=${videoId}`;
}

// تامبنیل: اگر maxres نبود، hqdefault
async function pickThumbnail(videoId) {
  const maxres = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  try {
    const r = await fetch(maxres, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
    if (r.ok) return maxres;
  } catch {}
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function watchButton(video) {
  // اگر امبد ممنوع باشد مینی‌اپ کار نمی‌کند → لینک مستقیم یوتیوب
  const url = video.embeddable === false ? video.link : miniAppUrl(video.id);
  return { text: '👁 تماشای زنده', url };
}

export async function sendText(env, chatId, text, replyMarkup) {
  return tg(env, 'sendMessage', {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function publishToChannel(video, caption, env) {
  const photo = await pickThumbnail(video.id);
  // اول برش، بعد escape (تا تگ/entity نصفه نشود)
  const res = await tg(env, 'sendPhoto', {
    chat_id: CONFIG.CHANNEL_ID,
    photo,
    caption: esc(String(caption).slice(0, 800)),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[watchButton(video)]] },
  });
  return res.ok === true;
}

// true اگر پیام به ادمین رسید
export async function sendAdminReview(video, ai, env) {
  // ذخیره موقت اطلاعات؛ callback_data محدود به ۶۴ بایت است
  await env.POSTED_LIVES.put(
    'pending:' + video.id,
    JSON.stringify({ video, ai }),
    { expirationTtl: 86400 }
  );

  const text =
    `⚠️ <b>پخش زنده جدید جهت بررسی</b>\n\n` +
    `📌 <b>عنوان:</b> ${esc(String(video.title).slice(0, 150))}\n` +
    `📺 <b>کانال:</b> ${esc(String(video.channelTitle).slice(0, 60))}\n` +
    `🎯 <b>اطمینان AI:</b> ${ai.confidence}%\n` +
    `🇦🇫 <b>افغانی:</b> ${ai.isAfghan ? 'بله' : 'خیر'}\n\n` +
    `📝 <b>کپشن پیشنهادی:</b>\n${esc(String(ai.caption || '— (Gemini پاسخ نداد)').slice(0, 450))}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '👁 پیش‌نمایش پخش', url: video.link }],
      [
        { text: '✅ تأیید و انتشار', callback_data: `app:${video.id}` },
        { text: '❌ رد کردن', callback_data: `rej:${video.id}` },
      ],
      ...(ai.fighterName
        ? [[{ text: '➕ افزودن نام به لیست', callback_data: `add:${video.id}` }]]
        : []),
    ],
  };

  const photo = await pickThumbnail(video.id);
  let res = await tg(env, 'sendPhoto', {
    chat_id: CONFIG.ADMIN_ID,
    photo,
    caption: text,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  // اگر عکس نشد، حداقل متن برود
  if (!res.ok) {
    res = await tg(env, 'sendMessage', {
      chat_id: CONFIG.ADMIN_ID,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }
  return res.ok === true;
}

export async function handleAdminCallback(cb, env) {
  const answer = (text, alert = false) =>
    tg(env, 'answerCallbackQuery', { callback_query_id: cb.id, text, show_alert: alert });

  if (cb.from?.id !== CONFIG.ADMIN_ID) return answer('⛔ فقط ادمین', true);

  const [action, videoId] = (cb.data || '').split(':');
  if (!videoId) return answer('داده نامعتبر');

  const raw = await env.POSTED_LIVES.get('pending:' + videoId);
  if (!raw) return answer('⌛ این مورد منقضی یا پردازش شده است', true);
  const { video, ai } = JSON.parse(raw);

  const msg = cb.message;
  const markDone = (label) =>
    msg &&
    tg(env, 'editMessageReplyMarkup', {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      reply_markup: { inline_keyboard: [[{ text: label, callback_data: 'done' }]] },
    });

  if (action === 'app') {
    const caption =
      ai.caption ||
      `🔥 پخش زنده ورزشی\n\nهم‌اکنون می‌توانید این مسابقه را مستقیماً در تلگرام تماشا کنید 👇`;
    const ok = await publishToChannel(video, caption, env);
    if (!ok) return answer('❌ انتشار ناموفق (ربات ادمین کانال است؟)', true);
    await env.POSTED_LIVES.put('posted:' + videoId, '1', { expirationTtl: 604800 });
    await env.POSTED_LIVES.delete('pending:' + videoId);
    await markDone('✅ منتشر شد');
    return answer('✅ منتشر شد');
  }

  if (action === 'rej') {
    await env.POSTED_LIVES.put('seen:' + videoId, '1', { expirationTtl: 604800 });
    await env.POSTED_LIVES.delete('pending:' + videoId);
    await markDone('❌ رد شد');
    return answer('رد شد');
  }

  if (action === 'add') {
    const name = (ai.fighterName || '').trim().toLowerCase();
    if (!name) return answer('نامی موجود نیست', true);
    await env.ATHLETES_WHITELIST.put(`fighter:${name}`, 'true');
    return answer(`➕ «${ai.fighterName}» اضافه شد`);
  }

  return answer('عملیات نامعتبر');
}