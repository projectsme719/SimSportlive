// اخبار از RSS گوگل‌نیوز (بدون کتابخانه). برای جبران محدودیت احتمالی API و نمایش خبرهای هر لیگ.
const decode = (s) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : ''; };

export function parseRss(xml, league, limit = 4) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit).map((m) => ({
    league, title: tag(m[1], 'title'), link: tag(m[1], 'link'), source: tag(m[1], 'source'),
    date: new Date(tag(m[1], 'pubDate') || Date.now()).toISOString(),
  })).filter((x) => x.title && x.link);
}

async function get(q, locale) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${locale}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`RSS HTTP ${r.status}`);
  return r.text();
}

// اول فارسی، اگر چیزی نبود انگلیسی
export async function leagueNews(league, query, fa) {
  try {
    const items = parseRss(await get(`${fa} when:2d`, 'hl=fa&gl=IR&ceid=IR:fa'), league);
    if (items.length) return items;
  } catch {}
  try { return parseRss(await get(`${query} football when:2d`, 'hl=en-US&gl=US&ceid=US:en'), league); } catch { return []; }
}
