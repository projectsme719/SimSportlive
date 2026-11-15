// ۱. استخراج الگوی مبارز در برابر مبارز (Fighter A vs Fighter B)
export function parseVsPattern(title) {
  const vsRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s+(?:vs\.?|VS|Vs)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/i;
  const match = title.match(vsRegex);
  if (match) {
    return [match[1].trim(), match[2].trim()];
  }
  return null;
}

// ۲. اسکراپ پویا از Tapology برای افزودن اسامی فایترهای افغان به دیتابیس KV
export async function scrapeTapologyAfghanFighters(env) {
  const url = "https://www.tapology.com/fightcenter?country=afghanistan";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const html = await res.text();
    
    // استخراج نام‌ها با الگوی ساده regex از تگ‌های پروفایل
    const nameRegex = /class="fighter[^"]*">([^<]+)<\/a>/g;
    let match;
    const newFighters = [];

    while ((match = nameRegex.exec(html)) !== null) {
      const name = match[1].trim();
      if (name) {
        newFighters.push(name);
        // ذخیره در KV
        await env.ATHLETES_WHITELIST.put(`fighter:${name.toLowerCase()}`, "true");
      }
    }
    console.log(`✅ ${newFighters.length} فایتر افغان از Tapology بروزرسانی شد.`);
    return newFighters;
  } catch (e) {
    console.error("خطا در اسکراپ Tapology:", e);
    return [];
  }
}