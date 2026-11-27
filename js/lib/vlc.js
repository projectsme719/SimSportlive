// باز کردن لینک پخش در برنامهٔ VLC روی گوشی (VLC باید نصب باشد).
import { SETTINGS } from '../../config/settings.js';
import { vlcSource } from '../../shared/stream.js';
import { copyText, toast } from './dom.js';
import { openLink } from './tg.js';

export const VLC_STORE = {
  android: 'https://play.google.com/store/apps/details?id=org.videolan.vlc',
  ios: 'https://apps.apple.com/app/vlc-for-mobile/id650377962',
};

export function vlcLink(url) {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) {
    const m = url.match(/^(https?):\/\/(.*)$/);
    if (m) return `intent://${m[2]}#Intent;scheme=${m[1]};type=video/*;package=org.videolan.vlc;S.browser_fallback_url=${encodeURIComponent(VLC_STORE.android)};end`;
  }
  return `vlc://${url}`; // iOS و بقیه
}

// لینک را کپی می‌کند (برای حالت‌هایی که تلگرام باز کردن مستقیم را نمی‌دهد) و VLC را باز می‌کند.
export async function openInVlc(ch) {
  const url = vlcSource(ch, SETTINGS.proxy.base);
  const copied = await copyText(url);
  toast(copied
    ? 'لینک کپی شد. اگر VLC باز نشد: VLC را باز کنید ← Network Stream ← لینک را بچسبانید.'
    : 'اگر VLC باز نشد، آن را دستی باز کنید و لینک پخش را در Network Stream بدهید.');
  try { window.location.href = vlcLink(url); } catch { /* ignore */ }
}

export const openStore = () => openLink(/iPhone|iPad|iPod/i.test(navigator.userAgent) ? VLC_STORE.ios : VLC_STORE.android);
