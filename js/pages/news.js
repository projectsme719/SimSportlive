// صفحهٔ ۲: اخبار و حواشی — عنوان خبرهای بازی‌ها، ترجمه‌شده به فارسی (بدون لینک)
import { LEAGUES } from '../../config/leagues.js';
import { leagueOf } from '../../shared/format.js';
import { agoLabel } from '../../shared/time.js';
import { leagueFilter } from '../components/filters.js';
import { h } from '../lib/dom.js';

export function NewsPage() {
  let st = null;
  const filter = leagueFilter(render);
  const sub = h('span', { class: 'sub' });
  const list = h('div', { class: 'news-list' });
  const el = h('div', { class: 'stack' }, h('div', {}, h('h2', {}, 'اخبار و حواشی'), sub), filter.el, list);

  function render() {
    if (!st) return;
    const items = st.news.filter((n) => filter.value === 'all' || n.league === filter.value);
    sub.textContent = items.length ? `${items.length} خبر` : '';
    list.replaceChildren(...(items.length ? items.map((n) => {
      const lg = leagueOf(n.league);
      return h('article', { class: 'news-item' },
        h('span', { class: 'chip-lg', style: `--c:${lg.color}` }, lg.fa),
        h('p', {}, n.fa),
        h('small', {}, [n.source, agoLabel(Date.parse(n.date))].filter(Boolean).join(' · ')));
    }) : [h('div', { class: 'notice' }, st.loaded ? 'هنوز خبری ترجمه نشده است. چند دقیقه بعد دوباره سر بزنید.' : 'در حال بارگذاری…')]));
  }
  return { el, onData(s) { st = s; render(); }, onShow() { render(); }, onHide() {} };
}
