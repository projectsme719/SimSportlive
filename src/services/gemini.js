import { CONFIG } from '../config.js';

const EMPTY = { isAfghan: false, confidence: 0, fighterName: "", caption: "" };

export async function analyzeMatchWithGemini(video, whitelistNames, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const description = (video.description || "").slice(0, 1500);

  const prompt = `
تو دستیار تحلیل‌گر کانال تلگرامی «سیم‌ورغ اسپورت» برای ورزش افغانستان هستی.

اطلاعات پخش زنده:
- عنوان: ${video.title}
- کانال یوتیوب: ${video.channelTitle}
- توضیحات: ${description}

فهرست ورزشکاران افغان شناخته‌شده:
${whitelistNames.join(", ") || "(خالی)"}

قوانین سخت‌گیرانه:
1. isAfghan را فقط وقتی true کن که حداقل یکی از این موارد در متن صریحاً آمده باشد: کلمه Afghanistan / Afghan / AFG / افغانستان / پرچم 🇦🇫، یا نام یکی از ورزشکاران فهرست بالا، یا نام تیم ملی افغانستان.
2. اگر مسابقه بین دو ورزشکار غیرافغان است و هیچ نشانه‌ای از افغانستان ندارد، isAfghan = false و caption = "" بده.
3. هرگز حدس نزن. اگر مطمئن نیستی، isAfghan = false بده.
4. confidence عددی بین 0 تا 100 است و میزان اطمینان تو از اینکه مسابقه مربوط به افغانستان است.
5. اگر isAfghan = true بود، caption را به زبان فارسی دری، هیجانی، جذاب و کوتاه (حداکثر ۵ خط) بنویس.
   - از ترجمه کپشن انگلیسی یوتیوب استفاده نکن، کاملاً بازنویسی کن.
   - نام مبارزان یا تیم‌ها را فارسی بنویس و نوع ورزش را مشخص کن (MMA، بوکس، فوتبال، فوتسال و...).
   - از ایموجی مرتبط مثل 🇦🇫 🥊 🔴 🏆 استفاده کن.
   - لینک و عنوان انگلیسی در کپشن نیاید.

خروجی را دقیقاً و فقط به صورت JSON زیر بده:
{
  "isAfghan": true,
  "confidence": 0,
  "fighterName": "",
  "caption": ""
}
`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini HTTP error:", res.status, JSON.stringify(data));
      return EMPTY;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Gemini empty response:", JSON.stringify(data));
      return EMPTY;
    }

    const parsed = JSON.parse(text);
    return {
      isAfghan: parsed.isAfghan === true,
      confidence: Number(parsed.confidence) || 0,
      fighterName: String(parsed.fighterName || ""),
      caption: String(parsed.caption || ""),
    };
  } catch (err) {
    console.error("Gemini exception:", err);
    return EMPTY;
  }
}