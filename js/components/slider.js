// اسلایدشو: خودکار می‌چرخد، با کشیدن انگشت هم جابه‌جا می‌شود.
import { h } from '../lib/dom.js';

export function createSlider({ interval = 5000 } = {}) {
  const track = h('div', { class: 'slides' });
  const dots = h('div', { class: 'dots' });
  const el = h('div', { class: 'slider', dir: 'ltr' }, track, dots);
  let i = 0, n = 0, timer = null, x0 = null;

  function go(k) {
    if (!n) return;
    i = (k + n) % n;
    track.style.transform = `translateX(${-i * 100}%)`;
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
  }
  function restart() {
    clearInterval(timer);
    if (n > 1) timer = setInterval(() => go(i + 1), interval);
  }
  function setSlides(nodes) {
    n = nodes.length;
    track.replaceChildren(...nodes.map((x) => h('div', { class: 'slide' }, x)));
    dots.replaceChildren(...(n > 1 ? nodes.map((_, j) => h('button', { class: 'dot', 'aria-label': `اسلاید ${j + 1}`, onclick: () => { go(j); restart(); } })) : []));
    go(Math.min(i, n - 1));
    restart();
  }

  el.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  el.addEventListener('pointercancel', () => { x0 = null; });
  el.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); restart(); }
  });
  return { el, setSlides, stop: () => clearInterval(timer), start: restart };
}
