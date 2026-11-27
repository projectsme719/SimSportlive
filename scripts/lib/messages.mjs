// متن پیام‌های کانال. همه‌ی متن‌های فارسی اینجا هستند تا راحت ویرایش شوند.
import { LEAGUES } from '../../config/leagues.js';
import { dayGreg, dayLabel, hhmm, ymd } from '../../shared/time.js';
import { byTime, kickoffMs, leagueOf, scoreText, teamName } from '../../shared/format.js';
import { esc } from './telegram.mjs';

const vs = (m) => `${esc(teamName(m.home))} 🆚 ${esc(teamName(m.away))}`;

function byLeague(list, line) {
  let out = '';
  for (const l of LEAGUES) {
    const ms = list.filter((m) => m.league === l.slug).sort(byTime);
    if (!ms.length) continue;
    out += `\n🏆 <b>${esc(l.fa)}</b>\n` + ms.map(line).join('\n') + '\n';
  }
  return out;
}

export function morningText(list, day) {
  return `📅 <b>بازی‌های امروز</b>\n${dayLabel(day)} — ${dayGreg(day)}\n` +
    byLeague(list, (m) => `⏰ ${hhmm(kickoffMs(m))}  ${vs(m)}`) +
    '\n🕒 ساعت‌ها به وقت افغانستان';
}

export function startText(group) {
  const t = hhmm(kickoffMs(group[0]));
  return `⚽ <b>شروع بازی — ${t}</b>\n` + byLeague(group, (m) => vs(m)) + '\n📺 پخش زنده در مینی‌اپ:';
}

export function resultsText(list) {
  return '🏁 <b>نتایج بازی‌ها</b>\n' +
    byLeague(list, (m) => `${esc(teamName(m.home))} ${scoreText(m)} ${esc(teamName(m.away))}`);
}
export { leagueOf, ymd };
