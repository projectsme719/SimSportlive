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

async function get(q) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`RSS HTTP ${r.status}`);
  return r.text();
}

// عنوان خبرهای انگلیسی یک لیگ (پسوند « - نام سایت» از عنوان حذف می‌شود)
export async function englishNews(league, query, limit = 4) {
  const items = parseRss(await get(`${query} football when:1d`), league, limit);
  return items.map((i) => ({ ...i, title: i.source && i.title.endsWith(` - ${i.source}`) ? i.title.slice(0, -(i.source.length + 3)) : i.title }));
}
