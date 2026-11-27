// خواندن برنامهٔ بازی‌ها از API عمومی ESPN و تبدیل به قالب ساده‌ی پروژه.
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

export async function fetchLeague(slug, from, to) {
  const url = `${BASE}/${slug}/scoreboard?dates=${from.replaceAll('-', '')}-${to.replaceAll('-', '')}&limit=400`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`ESPN ${slug}: HTTP ${res.status}`);
  const j = await res.json();
  return (j.events || []).map((e) => normalize(e, slug));
}
