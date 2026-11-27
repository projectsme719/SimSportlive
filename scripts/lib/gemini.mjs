// ترجمهٔ دسته‌ای عنوان خبرها به فارسی با Gemini (همهٔ عنوان‌ها در «یک» درخواست).
// مدل اول: gemini-3.5-flash-lite (ارزان). اگر خطا داد: gemini-3.6-flash. مدل‌ها در config/settings.js ← news.models
import { SETTINGS } from '../../config/settings.js';

const PROMPT =
  'عنوان‌های خبری فوتبال زیر را به فارسی روان و کوتاه (لحن خبری) ترجمه کن. نام بازیکنان، مربیان و تیم‌ها را به شکل رایج فارسی بنویس. ' +
  'هیچ لینک یا توضیح اضافه نیاور. خروجی فقط یک آرایهٔ JSON از رشته‌ها باشد، با همان تعداد و همان ترتیب ورودی.\nورودی:\n';

async function call(model, titles, thinkingLevel) {
  const generationConfig = {
    temperature: 0.2, responseMimeType: 'application/json',
    responseSchema: { type: 'ARRAY', items: { type: 'STRING' } }, maxOutputTokens: 4000,
  };
  if (thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: PROMPT + JSON.stringify(titles) }] }], generationConfig }),
  });
  if (!r.ok) {
    const e = new Error(`Gemini ${model}: HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    e.status = r.status;
    throw e;
  }
  const j = await r.json();
  const text = (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map((p) => p.text || '').join('');
  return JSON.parse(text);
}

export async function translate(titles) {
  let last;
  for (const [i, model] of SETTINGS.news.models.entries()) {
    // کمترین «تفکر» برای کم‌مصرف بودن؛ اگر مدل این پارامتر را نپذیرفت (400) بدون آن امتحان می‌شود
    for (const level of [i === 0 ? 'minimal' : 'low', null]) {
      try {
        const out = await call(model, titles, level);
        if (Array.isArray(out)) return out.map((x) => String(x).trim());
      } catch (e) {
        last = e;
        if (e.status !== 400) break; // محدودیت/قطعی → مدل بعدی
      }
    }
  }
  throw last || new Error('Gemini: no result');
}
