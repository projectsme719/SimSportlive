// صفحهٔ ۲: امروز — بازی‌های امروز با نتیجهٔ زنده + اخبار
import { LEAGUES } from '../../config/leagues.js';
import { byTime, kickoffMs } from '../../shared/format.js';
import { dayGreg, dayLabel, ymd } from '../../shared/time.js';
import { leagueFilter } from '../components/filters.js';
import { matchCard } from '../components/matchCard.js';
import { h } from '../lib/dom.js';
import { openLink } from '../lib/tg.js';

export function TodayPage() {
  let st = null;
  const filter = leagueFilter(render);
  const summary = h('span', { class: 'sub' });
  const dateLine = h('div', { class: 'sub' });
  const list = h('div', {});
  const news = h('section', { class: 'news' });
  const el = h('div', { class: 'stack' }, h('div', {}, h('h2', {}, 'امروز'), dateLine, summary), filter.el, list, news);

  function render() {
    if (!st) return;
    const today = ymd(Date.now());
    dateLine.textContent = `${dayLabel(today)} — ${dayGreg(today)}`;
    const all = st.matches.filter((m) => ymd(kickoffMs(m)) === today);
    const live = all.filter((m) => m.phase === 'live').length;
    summary.textContent = `${all.length} بازی${live ? ` — ${live} زنده` : ''}`;

    const shown = all.filter((m) => filter.value === 'all' || m.league === filter.value);
    list.replaceChildren();
    for (const l of LEAGUES) {
      const ms = shown.filter((m) => m.league === l.slug).sort(byTime);
      if (!ms.length) continue;
      list.append(h('div', { class: 'league-head', style: `--c:${l.color}` }, l.fa), ...ms.map((m) => matchCard(m)));
    }
    if (!shown.length) list.append(h('div', { class: 'notice' }, st.loaded ? 'امروز بازی‌ای در این بخش نیست.' : 'در حال بارگذاری…'));

    const items = st.news.filter((n) => filter.value === 'all' || n.league === filter.value).slice(0, 8);
    news.replaceChildren(...(items.length ? [h('div', { class: 'league-head' }, 'آخرین اخبار')] : []),
      ...items.map((n) => h('a', { href: n.link, onclick: (e) => { e.preventDefault(); openLink(n.link); } }, n.title, h('small', {}, n.source))));
  }

  function onData(s) {
    st = s;
    render();
  }
  return { el, onData, onShow() {}, onHide() {} };
}