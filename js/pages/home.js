// صفحهٔ ۱: خانه — اسلایدشوی بازی‌های امروز، دکمهٔ تماشای زنده (پلیر + شبکه‌ها)، و لیست بازی‌های امروز
// کنار هر بازیِ «در حال پخش» دکمه‌های پخش/VLC می‌آید؛ بعد از پایان بازی، پیام «پایان یافت» و نتیجه.
import { CHANNELS } from '../../config/channels.js';
import { isOnAir, kickoffMs } from '../../shared/format.js';
import { dayLabel, ymd } from '../../shared/time.js';
import { createSlider } from '../components/slider.js';
import { createPlayer } from '../components/player.js';
import { matchCard, matchSlide } from '../components/matchCard.js';
import { h } from '../lib/dom.js';
import { tap } from '../lib/tg.js';
import { openInVlc } from '../lib/vlc.js';

const rank = (m) => (isOnAir(m) ? 0 : m.phase === 'upcoming' ? 1 : m.phase === 'finished' ? 2 : 3);
const sortToday = (a, b) => rank(a) - rank(b) || kickoffMs(a) - kickoffMs(b);

export function HomePage() {
  let st = null;
  const slider = createSlider();
  const heading = h('h2', {}, 'بازی‌های امروز');
  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero-head' }, heading, h('span', { class: 'sub' }, dayLabel(ymd(Date.now())))), slider.el);

  // ── پلیر و فهرست شبکه‌ها ──
  const player = createPlayer();
  const buttons = new Map();
  const list = CHANNELS.filter((c) => c.enabled !== false);
  const groups = [...new Set(list.map((c) => c.group || 'شبکه‌ها'))];
  const grid = h('div', {}, groups.map((g) => h('div', {},
    h('div', { class: 'group-title' }, g),
    h('div', { class: 'ch-grid' }, list.filter((c) => (c.group || 'شبکه‌ها') === g).map((c) => {
      const b = h('button', { class: 'ch', onclick: () => watch(c) }, h('span', { class: 'ch-ic' }, c.icon || '📺'), h('span', {}, c.name));
      buttons.set(c.id, b);
      return b;
    })))));
  const panel = h('section', { class: 'channels hidden' }, h('p', { class: 'hint' }, 'یکی از شبکه‌ها را انتخاب کنید'), player.el, grid);
  const toggle = h('button', { class: 'btn-primary', onclick: () => (panel.classList.contains('hidden') ? open() : close()) }, '📺 تماشای زنده شبکه‌ها');

  // ── لیست بازی‌های امروز ──
  const rows = h('div', { class: 'today-list' });
  const el = h('div', { class: 'stack' }, hero, toggle, panel, h('h2', {}, 'لیست بازی‌های امروز'), rows);

  function open() {
    tap();
    panel.classList.remove('hidden');
    toggle.textContent = 'بستن پخش زنده';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function close() {
    panel.classList.add('hidden');
    toggle.textContent = '📺 تماشای زنده شبکه‌ها';
    player.close();
    buttons.forEach((b) => b.classList.remove('on'));
  }
  function watch(ch) {
    tap();
    if (panel.classList.contains('hidden')) { panel.classList.remove('hidden'); toggle.textContent = 'بستن پخش زنده'; }
    buttons.forEach((b, id) => b.classList.toggle('on', id === ch.id));
    player.play(ch);
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render() {
    if (!st) return;
    const today = ymd(Date.now());
    const ms = st.matches.filter((m) => ymd(kickoffMs(m)) === today).sort(sortToday);
    let slides = ms, title = 'بازی‌های امروز';
    if (!ms.length) {
      slides = st.matches.filter((m) => m.phase === 'upcoming').slice(0, 8);
      title = 'بازی‌های پیش‌رو';
    }
    heading.textContent = title;
    if (!st.loaded) {
      slider.setSlides([h('div', { class: 'empty' }, 'در حال بارگذاری…')]);
      return rows.replaceChildren(h('div', { class: 'notice' }, 'در حال بارگذاری…'));
    }
    slider.setSlides(slides.length ? slides.map(matchSlide) : [h('div', { class: 'empty' }, 'بازی‌ای برنامه‌ریزی نشده است.')]);
    rows.replaceChildren(...(ms.length
      ? ms.map((m) => matchCard(m, { showLeague: true, mode: 'home', onPlay: watch, onVlc: openInVlc }))
      : [h('div', { class: 'notice' }, 'امروز بازی‌ای در این شش لیگ نیست.')]));
  }

  // هر ۳۰ ثانیه وضعیت «در حال پخش» با ساعت گوشی دوباره بررسی می‌شود
  setInterval(() => { if (el.offsetParent !== null) render(); }, 30000);
  window.addEventListener('open-channels', open);

  return {
    el, onData(s) { st = s; render(); }, open,
    watch: (id) => { const ch = CHANNELS.find((c) => c.id === id); if (ch) watch(ch); else open(); },
    onShow() { slider.start(); render(); }, onHide() { slider.stop(); player.stop(); },
  };
}
