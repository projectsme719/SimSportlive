// ارسال پیام به کانال/ادمین با Bot API.
import { SETTINGS } from '../../config/settings.js';

const T = SETTINGS.telegram;

// لینک باز کردن مینی‌اپ؛ param = تب شروع (live | today | week)
export function miniAppLink(param = '') {
  const q = param ? `?startapp=${param}` : '';
  return T.miniAppShortName
    ? `https://t.me/${T.botUsername}/${T.miniAppShortName}${q}`
    : `https://t.me/${T.botUsername}${q}`;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// متن بلند را در مرز خط به چند پیام تقسیم می‌کند
export function chunk(text, max = 3800) {
  const out = [];
  let cur = '';
  for (const line of text.split('\n')) {
    if ((cur + '\n' + line).length > max && cur) { out.push(cur); cur = line; } else cur = cur ? cur + '\n' + line : line;
  }
  if (cur) out.push(cur);
  return out;
}

// buttons: آرایه‌ای از دکمه‌ها (یک ردیف) یا آرایه‌ای از ردیف‌ها [[...],[...]]
export async function send(token, chatId, text, buttons = []) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true };
  const rows = buttons.length && !Array.isArray(buttons[0]) ? [buttons] : buttons;
  if (rows.length) body.reply_markup = { inline_keyboard: rows.map((r) => r.map((b) => ({ text: b.text, url: b.url }))) };
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (j.ok) return j;
    if (j.error_code === 429) { await new Promise((ok) => setTimeout(ok, ((j.parameters && j.parameters.retry_after) || 3) * 1000)); continue; }
    throw new Error(`Telegram: ${j.description || r.status}`);
  }
  throw new Error('Telegram: too many retries');
}
