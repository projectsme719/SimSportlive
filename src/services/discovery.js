// (اختیاری و فعلاً در جریان اصلی استفاده نمی‌شود)

// استخراج الگوی «Fighter A vs Fighter B» از عنوان
export function parseVsPattern(title) {
  const vsRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s+(?:vs\.?|VS|Vs)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/;
  const match = (title || '').match(vsRegex);
  return match ? [match[1].trim(), match[2].trim()] : null;
}

// اسکراپ Tapology (ممکن است با تغییر ساختار سایت از کار بیفتد)
export async function scrapeTapologyAfghanFighters(env) {
  const url = 'https://www.tapology.com/fightcenter?country=afghanistan';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) return [];
    const html = await res.text();

    const nameRegex = /class="fighter[^"]*">([^<]+)<\/a>/g;
    const found = new Set();
    let m;
    while ((m = nameRegex.exec(html)) !== null) {
      const name = m[1].trim();
      if (name) found.add(name);
    }
    await Promise.all(
      [...found].map((n) => env.ATHLETES_WHITELIST.put(`fighter:${n.toLowerCase()}`, 'true'))
    );
    return [...found];
  } catch (e) {
    console.error('Tapology scrape error:', e);
    return [];
  }
}