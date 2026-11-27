// خواندن برنامهٔ بازی‌ها از API عمومی ESPN و تبدیل به قالب ساده‌ی پروژه.
import { addDays, ymd } from '../../shared/time.js';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const UA = 'Mozilla/5.0 (compatible; live-hub/1.0)';

export function normalize(e, league) {
  const c = (e.competitions || [])[0] || {};
  const st = e.status || c.status || {};
  const type = st.type || {};
  const side = (k) => {
    const x = (c.competitors || []).find((z) => z.homeAway === k) || {};
    const t = x.team || {};
    const score = x.score === undefined || x.score === '' ? null : Number(x.score);
    return {
      id: t.id, name: t.displayName || t.name || '?', short: t.shortDisplayName || t.abbreviation || '',
      abbr: t.abbreviation || '', logo: t.logo || '', score: Number.isNaN(score) ? null : score, winner: !!x.winner,
    };
  };
  let phase = type.state === 'in' ? 'live' : type.state === 'post' ? 'finished' : 'upcoming';
  if (/POSTPONED|CANCEL|SUSPEND|ABANDON/.test(type.name || '')) phase = 'postponed';
  return {
    id: String(e.id), league, kickoff: e.date, phase, status: type.name || '',
    clock: st.displayClock || '', label: type.shortDetail || '',
    venue: (c.venue && c.venue.fullName) || '', home: side('home'), away: side('away'),
  };
}

async function getEvents(slug, dates, limit) {
  const url = `${BASE}/${slug}/scoreboard?dates=${dates}${limit ? `&limit=${limit}` : ''}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`ESPN ${slug} dates=${dates}: HTTP ${res.status}`);
  return (await res.json()).events || [];
}

// ESPN برای فوتبال بازهٔ «YYYYMMDD-YYYYMMDD» را قبول نمی‌کند (HTTP 400).
// روش اول: درخواست «ماه» (YYYYMM)؛ اگر نشد: درخواست روز‌به‌روز برای چند روز نزدیک.
// from/to/today به شکل 'YYYY-MM-DD' (به وقت افغانستان).
export async function fetchLeague(slug, from, to, today) {
  const months = [...new Set([from.slice(0, 7), to.slice(0, 7)])].map((m) => m.replace('-', ''));
  let events;
  try {
    events = (await Promise.all(months.map((m) => getEvents(slug, m, 1000)))).flat();
  } catch (monthErr) {
    console.warn(`${slug}: ${monthErr.message} → درخواست روزانه`);
    const days = [];
    for (let i = -2; i <= 7; i++) days.push(addDays(today, i).replaceAll('-', ''));
    events = (await Promise.all(days.map((d) => getEvents(slug, d)))).flat();
  }
  const seen = new Set();
  return events
    .filter((e) => !seen.has(e.id) && seen.add(e.id))
    .map((e) => normalize(e, slug))
    .filter((m) => { const d = ymd(Date.parse(m.kickoff)); return d >= from && d <= to; });
}
