import { CONFIG } from '../config.js';

export async function analyzeStream(title, description, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const prompt = `
    شما گزارشگر ورزشی کانال تلگرام افغانستان هستید. اطلاعات زیر را تحلیل کنید:
    عنوان مسابقه: "${title}"
    توضیحات: "${description}"

    وظایف شما:
    ۱. بررسی کنید آیا ورزشکار افغان در این مسابقه حضور دارد یا خیر (مانند نصرت حق‌پرست، جاوید بشارت، سیر بهادرزاده، فریدون مجیدزاده، و...).
    ۲. حتی اگر ورزشکار افغان حضور نداشت و یک مسابقه جهانی/مهم بود (مثل UFC یا مسابقات بزرگ MMA)، حتماً یک متن خبر بسیار جذاب، پرانرژی و هیجان‌انگیز به زبان دری/فارسی بنویسید.
    ۳. متن باید حداکثر ۵ سطر باشد، همراه با ایموجی‌های مناسب ورزشی و اصطلاحات هیجان‌انگیز گزارشگری.
    ۴. هیچ عنوان یا متن انگلیسی در کپشن نهایی نباید وجود داشته باشد.

    خروجی را دقیقاً به فرمت JSON زیر برگردانید (بدون هیچ متن اضافه‌ای):
    {
      "isAfghan": true,
      "confidence": 95,
      "fighterName": "نام ورزشکار یا نام رویداد جهانی",
      "caption": "متن جذاب دری برای کانال (حداکثر ۵ سطر با ایموجی)"
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // پاکسازی پاسخ جهت دریافت JSON تمیز
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('پاسخ جیمینای نا معتبر بود');
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      isAfghan: false,
      confidence: 30,
      fighterName: 'مسابقه ورزشی زنده',
      caption: `🔥 **پخش زنده مسابقات جذاب ورزشی**\n\nهم‌اکنون می‌توانید این مسابقه دیدنی را مستقیماً داخل تلگرام به صورت زنده تماشا کنید!\n\n📌 برای تماشا روی دکمه زیر کلیک کنید. 👇`
    };
  }
}