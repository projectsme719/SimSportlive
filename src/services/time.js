import { CONFIG } from '../config.js';

const OFF = () => CONFIG.CALENDAR.TIMEZONE_OFFSET_MIN * 60000;
const pad = (n) => String(n).padStart(2, '0');

function mk(locale, opts) {
  try {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' });
  } catch {
    return null;
  }
}
// تقویم شمسی با نام ماه‌های دری، و ساعت به وقت کابل
const dayFmt = mk('fa-AF-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = mk('fa-AF', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const formatDay = (ms) =>
  dayFmt ? dayFmt.format(ms + OFF()) : new Date(ms + OFF()).toISOString().slice(0, 10);
export const formatTime = (ms) =>
  timeFmt ? timeFmt.format(ms + OFF()) : new Date(ms + OFF()).toISOString().slice(11, 16);

// کلید روز میلادی به وقت کابل: YYYYMMDD
export function kabulDayKey(ms) {
  const d = new Date(ms + OFF());
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export function fromKabul(y, m, d, hh, mm) {
  return Date.UTC(y, m - 1, d, hh, mm) - OFF();
}

// n روز از امروز (به وقت کابل): [{key, ms}] که ms ظهر همان روز است
export function kabulDays(n, now = Date.now()) {
  const b = new Date(now + OFF());
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() + i, 12, 0) - OFF();
    out.push({ key: kabulDayKey(t), ms: t });
  }
  return out;
}

export function parseDayKey(key) {
  const m = String(key).match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

export function normalizeDigits(s) {
  return String(s)
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
}

// «18:30»، «۱۸:۳۰»، «18.30» یا «1830»
export function parseTime(text) {
  const t = normalizeDigits(text).trim();
  const m = t.match(/^(\d{1,2})\s*[:.]\s*(\d{2})$/) || t.match(/^(\d{2})(\d{2})$/);
  if (!m) return null;
  const hh = +m[1];
  const mm = +m[2];
  if (hh > 23 || mm > 59) return null;
  return { hh, mm };
}