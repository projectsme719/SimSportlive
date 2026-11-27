// پلیر زندهٔ HLS با تعویض خودکار منبع: اگر لینک اول کار نکرد، لینک بعدی را امتحان می‌کند.
import { SETTINGS } from '../../config/settings.js';
import { vlcSource, webSources } from '../../shared/stream.js';
import { copyText, h, toast } from '../lib/dom.js';
import { openInVlc, openStore } from '../lib/vlc.js';

const HLS_JS = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
let hlsLoad = null;
const loadHls = () => (hlsLoad ||= new Promise((ok) => {
  if (window.Hls) return ok(window.Hls);
  const s = h('script', { src: HLS_JS });
  s.onload = () => ok(window.Hls);
  s.onerror = () => ok(null);
  document.head.append(s);
}));

const START_TIMEOUT = 15000; // اگر ۱۵ ثانیه تصویر نیامد → منبع بعدی

export function createPlayer() {
  const video = h('video', { controls: true, playsinline: true, autoplay: true });
  const title = h('span', {});
  const src = h('small', { class: 'src-lbl' });
  const bar = h('div', { class: 'player-bar' },
    h('span', {}, h('span', { class: 'live-dot' }, '●'), title, src),
    h('span', { class: 'bar-btns' },
      h('button', { class: 'btn-ghost', onclick: () => current && openInVlc(current) }, 'VLC'),
      h('button', { class: 'btn-ghost', onclick: () => (video.requestFullscreen ? video.requestFullscreen() : video.webkitEnterFullscreen && video.webkitEnterFullscreen()) }, 'تمام‌صفحه')));
  const msg = h('div', { class: 'player-msg hidden' });
  const note = h('div', { class: 'player-note' }, 'اگر پخش در مرورگر کار نکرد، دکمهٔ VLC را بزنید (برنامهٔ VLC باید روی گوشی نصب باشد).');
  const el = h('div', { class: 'player hidden' }, video, bar, msg, note);

  let hls = null, current = null, list = [], idx = 0, timer = null;

  const cleanup = () => { clearTimeout(timer); if (hls) { hls.destroy(); hls = null; } };
  const ok = () => { clearTimeout(timer); msg.classList.add('hidden'); };
  video.addEventListener('playing', ok);
  video.addEventListener('canplay', ok);

  function fail() {
    cleanup();
    msg.replaceChildren(
      h('div', {}, 'پخش در مرورگر شروع نشد. می‌توانید دوباره تلاش کنید یا با VLC ببینید.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn-ghost', onclick: () => play(current) }, 'تلاش دوباره'),
        h('button', { class: 'btn-ghost', onclick: () => openInVlc(current) }, '🟠 باز کردن در VLC'),
        h('button', { class: 'btn-ghost', onclick: openStore }, 'دانلود VLC'),
        h('button', { class: 'btn-ghost', onclick: async () => toast((await copyText(vlcSource(current, SETTINGS.proxy.base))) ? 'لینک کپی شد' : 'کپی نشد') }, 'کپی لینک')));
    msg.classList.remove('hidden');
  }

  function next() {
    cleanup();
    idx += 1;
    idx < list.length ? start() : fail();
  }

  async function start() {
    src.textContent = list.length > 1 ? ` · منبع ${idx + 1} از ${list.length}` : '';
    msg.classList.add('hidden');
    const url = list[idx];
    timer = setTimeout(next, START_TIMEOUT);
    const Hls = await loadHls();
    if (url !== list[idx]) return; // در این فاصله منبع عوض شده
    if (Hls && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: false });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) next(); });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.onerror = next;
      video.src = url;
    } else {
      return next();
    }
    video.play().catch(() => {});
  }

  function play(ch) {
    cleanup();
    current = ch;
    list = webSources(ch, SETTINGS.proxy.base);
    idx = 0;
    title.textContent = ch.name;
    el.classList.remove('hidden');
    list.length ? start() : fail();
  }

  const stop = () => video.pause();
  function close() { cleanup(); video.pause(); video.removeAttribute('src'); el.classList.add('hidden'); current = null; }
  return { el, play, stop, close, get current() { return current; } };
}
