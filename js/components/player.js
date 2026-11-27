// پلیر زندهٔ HLS. برای مرورگرهایی که HLS ندارند از hls.js استفاده می‌کند.
import { SETTINGS } from '../../config/settings.js';
import { streamUrl } from '../../shared/stream.js';
import { h } from '../lib/dom.js';

const HLS_JS = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
let hlsLoad = null;
const loadHls = () => (hlsLoad ||= new Promise((ok) => {
  if (window.Hls) return ok(window.Hls);
  const s = h('script', { src: HLS_JS });
  s.onload = () => ok(window.Hls);
  s.onerror = () => ok(null);
  document.head.append(s);
}));

export function createPlayer() {
  const video = h('video', { controls: true, playsinline: true, autoplay: true });
  const title = h('span', {});
  const bar = h('div', { class: 'player-bar' }, h('span', {}, h('span', { class: 'live-dot' }, '●'), title),
    h('button', { class: 'btn-ghost', onclick: () => (video.requestFullscreen ? video.requestFullscreen() : video.webkitEnterFullscreen && video.webkitEnterFullscreen()) }, 'تمام‌صفحه'));
  const msg = h('div', { class: 'player-msg hidden' });
  const el = h('div', { class: 'player hidden' }, video, bar, msg);
  let hls = null, current = null;

  function fail(text) {
    const url = streamUrl(current, SETTINGS.proxy.base);
    msg.replaceChildren(
      h('div', {}, text),
      h('div', { class: 'row' },
        h('button', { class: 'btn-ghost', onclick: () => play(current) }, 'تلاش دوباره'),
        h('button', { class: 'btn-ghost', onclick: () => navigator.clipboard && navigator.clipboard.writeText(url) }, 'کپی لینک پخش')));
    msg.classList.remove('hidden');
  }

  async function play(ch) {
    current = ch;
    el.classList.remove('hidden');
    msg.classList.add('hidden');
    title.textContent = ch.name;
    if (hls) { hls.destroy(); hls = null; }
    const url = streamUrl(ch, SETTINGS.proxy.base);
    const Hls = await loadHls();
    if (Hls && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) fail('پخش این شبکه شروع نشد. یک شبکهٔ دیگر را امتحان کنید یا دوباره تلاش کنید.'); });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.onerror = () => fail('پخش این شبکه شروع نشد. یک شبکهٔ دیگر را امتحان کنید یا دوباره تلاش کنید.');
    } else {
      return fail('این دستگاه پخش زنده را پشتیبانی نمی‌کند. لینک را کپی و در VLC باز کنید.');
    }
    video.play().catch(() => {});
  }

  function stop() { video.pause(); }
  function close() { stop(); if (hls) { hls.destroy(); hls = null; } video.removeAttribute('src'); el.classList.add('hidden'); current = null; }
  return { el, play, stop, close, get current() { return current; } };
}
