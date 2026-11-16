import { CONFIG, SPORTS, WOMEN_TAG } from '../config.js';

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

// لینک مستقیم Mini App (برای پست کانال)
export function miniAppUrl(videoId) {
  return `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_SHORT_NAME}?startapp=${videoId}`;
}

async function getOrigin(env) {
  if (env.WORKER_URL) return env.WORKER_URL.replace(/\/$/, '');
  try {
    return await env.POSTED_LIVES.get('config:origin');
  } catch {
    return null;
  }
}

async function pickThumbnail(videoId) {
  const maxres = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  try {
    const r = await fetch(maxres, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
    if (r.ok) return maxres;
  } catch {}
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function channelWatchButton(video) {
  const url = video.embeddable === false ? video.link : miniAppUrl(video.id);
  return { text: '👁 تماشای زنده', url };
}

async function adminPreviewButton(video, env) {
  const origin = await getOrigin(env);
  if (origin && video.embeddable !== false) {
    return { text: '👁 پیش‌نمایش پخش', web_app: { url: `${origin}/watch?v=${video.id}` } };
  }
  return { text: '👁 پیش‌نمایش پخش', url: video.embeddable === false ? video.link : miniAppUrl(video.id) };
}

// ساخت کپشن نهایی کانال: عنوان ورزش + متن دری + هشتگ‌ها
export function buildCaption(ai) {
  const sport = SPORTS[ai.sport] || SPORTS.other;
  const head = `${sport.emoji} <b>پخش زنده ${esc(sport.label)}${ai.isWomen ? ' بانوان' : ''}</b>`;
  const body =
    String(ai.caption || '').trim() ||
    'هم‌اکنون می‌توانید این مسابقه را مستقیماً در تلگرام تماشا کنید 👇';
  const tags = [sport.tag, ai.isWomen ? WOMEN_TAG : null, '#افغانستان'].filter(Boolean).join(' ');
  return `${head}\n\n${esc(body.slice(0, 600))}\n\n${tags}\n${esc(CONFIG.CHANNEL_USERNAME)}`;
}

export async function sendText(env, chatId, text, replyMarkup) {
  return tg(env, 'sendMessage', {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function publishToChannel(video, ai, env) {
  const photo = await pickThumbnail(video.id);
  const res = await tg(env, 'sendPhoto', {
    chat_id: CONFIG.CHANNEL_ID,
    photo,
    caption: buildCaption(ai),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[channelWatchButton(video)]] },
  });
  return res.ok === true;
}

// true اگر پیام به ادمین رسید
export async function sendAdminReview(video, ai, env) {
  await env.POSTED_LIVES.put(
    'pending:' + video.id,
    JSON.stringify({ video, ai }),
    { expirationTtl: 86400 }
  );

  const sport = SPORTS[ai.sport] || SPORTS.other;
  const text =
    `⚠️ <b>پخش زنده جدید جهت بررسی</b>\n\n` +
    `📌 <b>عنوان:</b> ${esc(String(video.title).slice(0, 150))}\n` +
    `📺 <b>کانال:</b> ${esc(String(video.channelTitle).slice(0, 60))}\n` +
    `${sport.emoji} <b>ورزش:</b> ${esc(sport.label)}${ai.isWomen ? ' (بانوان 🚺)' : ''}\n` +
    `🎯 <b>اطمینان AI:</b> ${ai.confidence}%\n` +
    `🇦🇫 <b>افغانی:</b> ${ai.isAfghan ? 'بله' : 'خیر'}\n\n` +
    `📝 <b>کپشن پیشنهادی:</b>\n${esc(String(ai.caption || '— (Gemini پاسخ نداد)').slice(0, 420))}`;

  const keyboard = {
    inline_keyboard: [
      [await adminPreviewButton(video, env)],
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
    const ok = await publishToChannel(video, ai, env);
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