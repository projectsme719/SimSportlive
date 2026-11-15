export async function analyzeMatchWithGemini(videoTitle, videoDescription, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = `
تو یک تحلیل‌گر ارشد ورزش‌های رزمی و توپی افغانستان هستی. 
وظیفه داری بررسی کنی آیا این مسابقه به ورزشکاران، فایترها، یا تیم‌های ملی افغانستان (AFG / 🇦🇫) مربوط است یا خیر.

ورودی:
عنوان: ${videoTitle}
توضیحات: ${videoDescription}

قوانین:
۱. حضور علائم AFG، 🇦🇫، کلمه Afghanistan یا اسامی مبارزان افغان را بررسی کن.
۲. اگر نام افغانی در متن است یا پرچم 🇦🇫 کنار نامی آمده، خروجی isAfghan را true کن.
۳. در صورت true بودن، یک کپشن هیجانی با ایموجی‌های مناسب به زبان فارسی دری تولید کن.

پاسخ را دقیقاً در قالب این JSON ارسال کن:
{
  "isAfghan": true/false,
  "confidence": 0 تا 100,
  "fighterName": "نام فایتر افغان در صورت وجود",
  "caption": "متن کپشن فارسی دری"
}
`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  const data = await response.json();
  try {
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) {
    return { isAfghan: false, confidence: 0, caption: "" };
  }
}