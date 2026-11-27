// صفحهٔ ۳: هفته — برنامه و نتایج همهٔ بازی‌های شش لیگ (شنبه تا جمعه)
import { SETTINGS } from '../../config/settings.js';
import { byTime, kickoffMs } from '../../shared/format.js';
import { addDays, dayGreg, dayLabel, dayShort, weekStart, ymd } from '../../shared/time.js';
import { leagueFilter } from '../components/filters.js';
import { matchCard } from '../components/matchCard.js';
import { h } from '../lib/dom.js';
import { tap } from '../lib/tg.js';

export function WeekPage() {
  let st = null, offset = 0;
  const filter = leagueFilter(render);
  const prev = h('button', { 'aria-label': 'هفتهٔ قبل', onclick: () => step(-1) }, '›');
  const next = h('button', { 'aria-label': 'هفتهٔ بعد', onclick: () => step(1) }, '‹');
  const title = h('div', { class: 't' });
  const nav = h('div', { class: 'week-nav' }, prev, title, next);
  const days = h('div', {});
  const el = h('div', { class: 'stack' }, h('h2', {}, 'برنامهٔ هفته'), nav, filter.el, days);

  const thisWeek = () => {
    const d = addDays(ymd(Date.now()), offset * 7);
    return SETTINGS.weekMode === 'calendar' ? weekStart(d) : d;   // rolling: از امروز
  };
  function step(d) { tap(); offset += d; render(); }

  function render() {
    if (!st) return;
    const start = thisWeek();
    const end = addDays(start, 6);
    const today = ymd(Date.now());
    const ds = st.matches.map((m) => ymd(kickoffMs(m))).sort();
    prev.disabled = !ds.length || ds[0] >= start;
    next.disabled = !ds.length || ds[ds.length - 1] <= end;
    title.replaceChildren(offset === 0 ? (SETTINGS.weekMode === 'calendar' ? 'این هفته' : '۷ روز آینده') : offset === -1 ? 'هفتهٔ گذشته' : offset === 1 ? 'هفتهٔ آینده' : `${dayShort(start)} تا ${dayShort(end)}`,
      h('small', {}, `${dayShort(start)} تا ${dayShort(end)}`));

    days.replaceChildren();
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const ms = st.matches.filter((m) => ymd(kickoffMs(m)) === d && (filter.value === 'all' || m.league === filter.value)).sort(byTime);
      days.append(h('div', { class: 'day-head' + (d === today ? ' today' : '') }, dayLabel(d), h('small', {}, dayGreg(d))));
      days.append(...(ms.length ? ms.map((m) => matchCard(m, { showLeague: true, mode: 'week' })) : [h('div', { class: 'day-none' }, 'بازی‌ای نیست')]));
    }
  }
  return { el, onData(s) { st = s; render(); }, onShow() {}, onHide() {} };
}
