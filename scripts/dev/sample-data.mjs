// داده‌ی نمونه برای آزمایش بدون اینترنت:  node scripts/dev/sample-data.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { LEAGUES } from '../../config/leagues.js';

const teams = [
  ['Arsenal', 'Chelsea'], ['Barcelona', 'Real Madrid'], ['Bayern Munich', 'Borussia Dortmund'],
  ['Juventus', 'Inter Milan'], ['Paris Saint-Germain', 'Marseille'], ['Liverpool', 'Manchester City'],
  ['Napoli', 'AC Milan'], ['Sevilla', 'Valencia'], ['RB Leipzig', 'Bayer Leverkusen'], ['Lyon', 'Monaco'],
];
const logo = (i) => `https://a.espncdn.com/i/teamlogos/soccer/500/${360 + i}.png`;
const H = 3600000;
const now = Date.now();
const matches = [];
let id = 1;
// ساعت شروع نسبت به «حالا» (ساعت): منفی = گذشته
const offsets = [-170, -140, -3, -1.2, -0.3, 0.05, 0.4, 1.5, 3, 5, 9, 26, 30, 50, 75, 100, 130, 170, 200];
offsets.forEach((o, i) => {
  const [h, a] = teams[i % teams.length];
  const lg = LEAGUES[i % LEAGUES.length].slug;
  const start = now + o * H;
  const phase = o < -2 ? 'finished' : o < 0 ? (o > -1.8 && o < -0.2 ? 'live' : 'finished') : 'upcoming';
  const live = phase === 'live';
  matches.push({
    id: String(id++), league: lg, kickoff: new Date(start).toISOString(), phase,
    status: live ? 'STATUS_SECOND_HALF' : phase === 'finished' ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED',
    clock: live ? `${Math.round(-o * 60 + 20)}'` : '', label: '', venue: '',
    home: { name: h, short: h, logo: logo(i), score: phase === 'upcoming' ? null : (i * 3) % 4, winner: false },
    away: { name: a, short: a, logo: logo(i + 1), score: phase === 'upcoming' ? null : (i * 5) % 3, winner: false },
  });
});
matches.sort((x, y) => Date.parse(x.kickoff) - Date.parse(y.kickoff));
mkdirSync('data', { recursive: true });
writeFileSync('data/matches.json', JSON.stringify({ updatedAt: new Date().toISOString(), errors: [], matches }));
writeFileSync('data/news.json', JSON.stringify({ updatedAt: new Date().toISOString(), items: [
  { league: 'eng.1', title: 'خلاصه بازی آرسنال و چلسی در لیگ برتر', link: 'https://example.com/1', source: 'ورزش۳', date: new Date(now - 2 * H).toISOString() },
  { league: 'esp.1', title: 'ال‌کلاسیکو؛ ترکیب احتمالی بارسلونا و رئال‌مادرید', link: 'https://example.com/2', source: 'ورزش۳', date: new Date(now - 5 * H).toISOString() },
] }));
console.log('sample data written:', matches.length);
