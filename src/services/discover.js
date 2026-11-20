import { CONFIG } from '../config.js';
import { searchVideoIds, getVideosDetails } from './youtube.js';

// جستجوی عمومی یوتیوب برای لایوها و مسابقه‌های افغانستان در هر کانالی.
// هر جستجو ۱۰۰ واحد سهمیه مصرف می‌کند، پس فقط هر چند دقیقه یک بار اجرا می‌شود.
export async function searchStreams(env) {
  const S = CONFIG.SEARCH;
  const kv = env.POSTED_LIVES;
  const now = Date.now();
  const empty = { live: [], upcoming: [] };

  const lastLive = Number(await kv.get('sys:search:live')) || 0;
  const lastUp = Number(await kv.get('sys:search:up')) || 0;
  const dueLive = now - lastLive >= S.LIVE_INTERVAL_MIN * 60000;
  const dueUp = now - lastUp >= S.UPCOMING_INTERVAL_MIN * 60000;
  if (!dueLive && !dueUp) return empty;

  const ids = new Set();
  // زمان اجرا قبل از جستجو ثبت می‌شود تا در صورت خطا (مثلاً اتمام سهمیه) هر ۵ دقیقه تکرار نشود
  if (dueLive) {
    await kv.put('sys:search:live', String(now));
    for (const q of S.LIVE_QUERIES) {
      for (const id of await searchVideoIds(env.YOUTUBE_API_KEY, { eventType: 'live', q, maxResults: S.MAX_RESULTS })) ids.add(id);
    }
  }
  if (dueUp) {
    await kv.put('sys:search:up', String(now));
    for (const q of S.UPCOMING_QUERIES) {
      for (const id of await searchVideoIds(env.YOUTUBE_API_KEY, { eventType: 'upcoming', q, maxResults: S.MAX_RESULTS })) ids.add(id);
    }
  }
  if (!ids.size) return empty;

  const found = await getVideosDetails([...ids], env.YOUTUBE_API_KEY);
  return { live: found.live.slice(0, S.MAX_NEW_PER_RUN), upcoming: found.upcoming };
}