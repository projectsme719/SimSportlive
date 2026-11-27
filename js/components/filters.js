// نوار فیلتر لیگ‌ها (همه + هر لیگ)
import { LEAGUES } from '../../config/leagues.js';
import { h } from '../lib/dom.js';
import { tap } from '../lib/tg.js';

export function leagueFilter(onChange) {
  let value = 'all';
  const items = [{ slug: 'all', short: 'همه' }, ...LEAGUES];
  const buttons = items.map((l) => h('button', { class: 'chip' + (l.slug === 'all' ? ' on' : ''), onclick: () => select(l.slug) }, l.short));
  const el = h('div', { class: 'filters' }, buttons);
  function select(slug) {
    value = slug; tap();
    buttons.forEach((b, i) => b.classList.toggle('on', items[i].slug === slug));
    onChange(slug);
  }
  return { el, get value() { return value; } };
}
