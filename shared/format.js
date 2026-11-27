// قالب‌بندی مشترک بین مینی‌اپ و اسکریپت‌های اعلان.
import { SETTINGS } from '../config/settings.js';
import { LEAGUES } from '../config/leagues.js';
import { TEAMS_FA } from '../config/teams-fa.js';

export const leagueOf = (slug) => LEAGUES.find((l) => l.slug === slug) || { slug, fa: slug, short: slug, color: '#0B1F4B' };

export function teamName(t) {
  if (!SETTINGS.persianTeamNames) return t.name;
  return TEAMS_FA[t.name] || TEAMS_FA[t.short] || t.name;
}

export function statusText(m) {
  if (m.phase === 'live') return /HALFTIME/.test(m.status || '') ? 'نیمه' : (m.clock || 'زنده');
  if (m.phase === 'finished') return 'پایان';
  if (m.phase === 'postponed') return 'به تعویق افتاد';
  return '';
}

// آیا الان باید دکمه‌های پخش زنده فعال باشد؟  (از لحظهٔ شروع تا پایان بازی؛ با ساعت خود گوشی، حتی اگر داده کمی قدیمی باشد)
export function isOnAir(m, now = Date.now()) {
  if (m.phase === 'live') return true;
  if (m.phase !== 'upcoming') return false;
  const k = Date.parse(m.kickoff);
  return now >= k - SETTINGS.live.leadMinutes * 60000 && now < k + SETTINGS.live.windowHours * 3600000;
}

export const hasScore = (m) => m.phase === 'live' || m.phase === 'finished';
export const scoreText = (m) => `${m.home.score ?? 0} - ${m.away.score ?? 0}`;
export const kickoffMs = (m) => Date.parse(m.kickoff);

const order = { live: 0, upcoming: 1, finished: 2, postponed: 3 };
export const byTime = (a, b) => kickoffMs(a) - kickoffMs(b);
export const byPriority = (a, b) => order[a.phase] - order[b.phase] || byTime(a, b);
