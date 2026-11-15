import { CONFIG } from '../config.js';

export async function analyzeMatchWithGemini(video, whitelistNames, apiKey) {
  // استفاده دقیق از مدل 3.6-flash طبق دستور شما
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const systemPrompt = `
تو یک تحلیل‌گر هوشمند ورزشی برای کشور افغانستان (🇦🇫) هستی.
اطلاعات ویدیو:
- عنوان: ${video.title}
- توضیحات: ${video.description}
- کانال: ${video.channelTitle}

اسامی مبارزان در دیتابیس ما:
${whitelistNames.join(", ")}

وظایف:
۱. مشخص کن آیا این مسابقه مربوط به افغانستان (AFG / 🇦🇫) یا فایترهای فهرست شده است؟
۲. درصد اطمینان (0 تا 100) بده.
۳. نام مبارز یا تیم افغان را استخراج کن.
۴. یک کپشن هیجانی با پرچم 🇦🇫 و ایموجی‌ها به زبان فارسی دری بنویس.

پاسخ را دقیقاً و فقط در قالب JSON زیر ارسال کن:
{
  "isAfghan": true,
  "confidence": 90,
  "fighterName": "نام مبارز",
  "caption": "متن کپشن فارسی"
}
`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return JSON.parse(data.candidates[0].content.parts[0].text);
    }
  } catch (error) {
    console.error("Gemini AI Error:", error);
  }

  return { isAfghan: false, confidence: 0, fighterName: "", caption: "" };
}