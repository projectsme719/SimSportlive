// خواندن data/matches.json و data/news.json و اطلاع‌رسانی به صفحه‌ها.
import { SETTINGS } from '../config/settings.js';

const state = { matches: [], news: [], updatedAt: null, loaded: false, failed: false };
const subs = new Set();

export const getState = () => state;
export const subscribe = (fn) => { subs.add(fn); if (state.loaded) fn(state); return () => subs.delete(fn); };

// پارامتر t برای دور زدن کش ۱۰ دقیقه‌ای GitHub Pages
const getJson = async (path) => {
  const r = await fetch(`${path}?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
};

export async function refresh() {
  try {
    const [m, n] = await Promise.all([getJson('data/matches.json'), getJson('data/news.json').catch(() => ({ items: [] }))]);
    Object.assign(state, { matches: m.matches || [], updatedAt: m.updatedAt, news: n.items || [], loaded: true, failed: false });
  } catch (e) {
    state.failed = true;
    state.loaded = state.loaded || false;
    console.warn(e);
  }
  subs.forEach((fn) => fn(state));
}

export function startAutoRefresh() {
  refresh();
  setInterval(refresh, SETTINGS.refreshSeconds * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
}
