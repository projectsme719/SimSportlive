// ابزار زمان: همه‌چیز به وقت افغانستان (SETTINGS.timeZone) محاسبه می‌شود.
import { SETTINGS } from '../config/settings.js';

const pad = (n) => String(n).padStart(2, '0');
const cache = {};
const fmtOf = (tz) => (cache[tz] ||= new Intl.DateTimeFormat('en-CA', {
  timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}));

export function parts(ms, tz = SETTINGS.timeZone) {
  const o = {};
  for (const p of fmtOf(tz).formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute };
}
export const ymd = (ms) => { const p = parts(ms); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const hhmm = (ms, tz) => { const p = parts(ms, tz); return `${pad(p.h)}:${pad(p.min)}`; };
export const minutesOfDay = (ms) => { const p = parts(ms); return p.h * 60 + p.min; };
// ساعت یک لحظه در همهٔ منطقه‌های تنظیم‌شده: [{label:'افغانستان', time:'19:30'}, {label:'ایران', time:'19:00'}]
export const timesFor = (ms) => SETTINGS.timeZones.map((z) => ({ label: z.label, tz: z.id, time: hhmm(ms, z.id) }));

const utc = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d, 12); };
export const addDays = (s, n) => new Date(utc(s) + n * 86400000).toISOString().slice(0, 10);
export const weekday = (s) => new Date(utc(s)).getUTCDay(); // 0 = یک‌شنبه
export const weekStart = (s, startDay = SETTINGS.weekStartDay) => addDays(s, -((weekday(s) - startDay + 7) % 7));

const faDay = new Intl.DateTimeFormat('fa-AF-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const faShort = new Intl.DateTimeFormat('fa-AF-u-ca-persian', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const en = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fa = (s) => utc(s) + SETTINGS.persianDateShift * 86400000;
export const dayLabel = (s) => faDay.format(fa(s));        // «جمعه ۶ قوس»
export const dayShort = (s) => faShort.format(fa(s));      // «۶ قوس»
export const dayGreg = (s) => en.format(utc(s));            // «27 Nov»
export const agoLabel = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1 ? 'همین الان' : m < 60 ? `${m} دقیقه پیش` : `${Math.round(m / 60)} ساعت پیش`;
};
