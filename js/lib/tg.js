// اتصال به Telegram Mini App (اگر بیرون از تلگرام باز شود هم کار می‌کند).
export const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined
  ? window.Telegram.WebApp : null;

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#0B1F4B'); tg.setBackgroundColor('#EEF1F8'); tg.setBottomBarColor('#ffffff'); } catch {}
}

export const startParam = () =>
  (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || new URLSearchParams(location.search).get('startapp') || '';

export const tap = () => { try { tg && tg.HapticFeedback.selectionChanged(); } catch {} };

export function openLink(url) {
  if (tg && tg.openLink) tg.openLink(url);
  else window.open(url, '_blank', 'noopener');
}
