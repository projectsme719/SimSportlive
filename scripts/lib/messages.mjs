// متن پیام‌های کانال. همهٔ متن‌های فارسی اینجا هستند تا راحت ویرایش شوند.
import { CHANNELS, MATCH_CHANNELS } from '../../config/channels.js';
import { LEAGUES } from '../../config/leagues.js';
import { dayGreg, dayLabel, timesFor } from '../../shared/time.js';
import { byTime, kickoffMs, leagueOf, scoreText, teamName } from '../../shared/format.js';
import { esc } from './telegram.mjs';

const vs = (m) => `${esc(teamName(m.home))} 🆚 ${esc(teamName(m.away))}`;

// «19:30 (ایران 19:00)»
function shortTimes(ms) {
  const [a, ...rest] = timesFor(ms);
  return rest.length ? `${a.time} (${rest.map((x) => `${x.label} ${x.time}`).join('، ')})` : a.time;
}
// «19:30 افغانستان | 19:00 ایران»
const fullTimes = (ms) => timesFor(ms).map((x) => `${x.time} ${x.label}`).join(' | ');

export const channelNames = () =>
  MATCH_CHANNELS.map((id) => (CHANNELS.find((c) => c.id === id) || {}).name).filter(Boolean).join('، ');

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
    byLeague(list, (m) => `⏰ ${shortTimes(kickoffMs(m))}  ${vs(m)}`) +
    `\n📡 پخش زنده: ${esc(channelNames())}`;
}

export function startText(group) {
  return `⚽ <b>شروع بازی</b>\n🕒 ${fullTimes(kickoffMs(group[0]))}\n` +
    byLeague(group, (m) => vs(m)) +
    `\n📡 پخش زنده: ${esc(channelNames())}\n👇 یک شبکه را انتخاب کنید:`;
}

export function resultsText(list) {
  return '🏁 <b>بازی پایان یافت — نتیجه</b>\n' +
    byLeague(list, (m) => `${esc(teamName(m.home))} ${scoreText(m)} ${esc(teamName(m.away))}`);
}

export function newsText(items) {
  return '📰 <b>اخبار و حواشی بازی‌ها</b>\n\n' +
    items.map((i) => `🔹 ${esc(i.fa)}\n<i>${esc(leagueOf(i.league).fa)}</i>`).join('\n\n');
}
