// صفحهٔ ۱: خانه — اسلایدشوی بازی‌های امروز + دکمهٔ تماشای زنده + انتخاب شبکه و پخش
import { CHANNELS } from '../../config/channels.js';
import { byPriority, byTime, kickoffMs } from '../../shared/format.js';
import { dayLabel, ymd } from '../../shared/time.js';
import { createSlider } from '../components/slider.js';
import { createPlayer } from '../components/player.js';
import { matchSlide } from '../components/matchCard.js';
import { h } from '../lib/dom.js';
import { tap } from '../lib/tg.js';

export function HomePage() {
  const slider = createSlider();
  const heading = h('h2', {}, 'بازی‌های امروز');
  const dateLbl = h('span', { class: 'sub' }, dayLabel(ymd(Date.now())));
  const hero = h('section', { class: 'hero' }, h('div', { class: 'hero-head' }, heading, dateLbl), slider.el);

  const player = createPlayer();
  const buttons = new Map();
  const list = CHANNELS.filter((c) => c.enabled !== false);
  const groups = [...new Set(list.map((c) => c.group || 'شبکه‌ها'))];
  const grid = h('div', {}, groups.map((g) => h('div', {},
    h('div', { class: 'group-title' }, g),
    h('div', { class: 'ch-grid' }, list.filter((c) => (c.group || 'شبکه‌ها') === g).map((c) => {
      const b = h('button', { class: 'ch', onclick: () => pick(c) }, h('span', { class: 'ch-ic' }, c.icon || '📺'), h('span', {}, c.name));
      buttons.set(c.id, b);
      return b;
    })))));

  const panel = h('section', { class: 'channels hidden' },
    h('p', { class: 'hint' }, 'یکی از شبکه‌ها را انتخاب کنید'), player.el, grid);
  const toggle = h('button', { class: 'btn-primary', onclick: () => (panel.classList.contains('hidden') ? open() : close()) }, '📺 تماشای زنده شبکه‌ها');
  const el = h('div', { class: 'stack' }, hero, toggle, panel);

  function open() {
    tap();
    panel.classList.remove('hidden');
    toggle.textContent = 'بستن شبکه‌ها';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function close() {
    panel.classList.add('hidden');
    toggle.textContent = '📺 تماشای زنده شبکه‌ها';
    player.close();
    buttons.forEach((b) => b.classList.remove('on'));
  }
  function pick(c) {
    tap();
    buttons.forEach((b, id) => b.classList.toggle('on', id === c.id));
    player.play(c);
    player.el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function onData(s) {
    const today = ymd(Date.now());
    let ms = s.matches.filter((m) => ymd(kickoffMs(m)) === today).sort(byPriority);
    heading.textContent = 'بازی‌های امروز';
    if (!ms.length) {
      ms = s.matches.filter((m) => m.phase === 'upcoming').sort(byTime).slice(0, 8);
      heading.textContent = 'بازی‌های پیش‌رو';
    }
    if (!s.loaded) return slider.setSlides([h('div', { class: 'empty' }, 'در حال بارگذاری…')]);
    slider.setSlides(ms.length ? ms.map(matchSlide) : [h('div', { class: 'empty' }, 'بازی‌ای برنامه‌ریزی نشده است.')]);
  }

  window.addEventListener('open-channels', open);
  return { el, onData, onShow() { slider.start(); }, onHide() { slider.stop(); player.stop(); }, open };
}
