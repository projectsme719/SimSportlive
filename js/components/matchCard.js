// کارت بازی (لیست‌ها) و اسلاید بازی (صفحهٔ خانه)
import { h } from '../lib/dom.js';
import { timesFor } from '../../shared/time.js';
import { hasScore, isOnAir, kickoffMs, leagueOf, scoreText, statusText, teamName } from '../../shared/format.js';
import { liveActions } from './actions.js';

const ltr = (t) => h('bdi', { dir: 'ltr' }, t);
const hideBroken = (e) => { e.target.style.visibility = 'hidden'; };
const logo = (t) => h('img', { src: t.logo, alt: '', loading: 'lazy', onerror: hideBroken });

function badge(m, onAir) {
  if (m.phase === 'live') return h('span', { class: 'badge live' }, '● ', ltr(statusText(m)));
  if (onAir) return h('span', { class: 'badge live' }, '● در حال پخش');
  const t = statusText(m);
  return t ? h('span', { class: `badge ${m.phase}` }, t) : null;
}

// ساعت شروع به همهٔ منطقه‌ها: درشت = افغانستان، ریز = ایران
function timeBlock(ms) {
  const [first, ...rest] = timesFor(ms);
  return h('div', { class: 'mid time' }, h('div', { class: 't1' }, first.time), rest.map((x) => h('small', {}, `${x.label} ${x.time}`)));
}
const middle = (m) =>
  hasScore(m) ? h('div', { class: 'mid' }, scoreText(m))
  : m.phase === 'postponed' ? h('div', { class: 'mid time' }, '—')
  : timeBlock(kickoffMs(m));

// mode: 'list' (ساده) | 'home' (دکمه‌های پخش + پیام پایان) | 'week' (لینک به خانه)
export function matchCard(m, { showLeague = false, mode = 'list', onPlay, onVlc } = {}) {
  const lg = leagueOf(m.league);
  const onAir = isOnAir(m);
  return h('article', { class: `match ${onAir ? 'live' : m.phase}` },
    h('div', { class: 'match-top' }, showLeague && h('span', { class: 'chip-lg', style: `--c:${lg.color}` }, lg.fa), badge(m, onAir)),
    h('div', { class: 'match-row' },
      h('div', { class: 'team' }, logo(m.home), h('span', { class: 'tn' }, teamName(m.home))),
      middle(m),
      h('div', { class: 'team' }, logo(m.away), h('span', { class: 'tn' }, teamName(m.away)))),
    mode === 'home' && onAir && liveActions({ onPlay, onVlc }),
    mode === 'home' && m.phase === 'finished' && h('div', { class: 'match-foot' }, '🏁 بازی پایان یافت'),
    mode === 'week' && onAir && h('button', { class: 'btn-watch', onclick: () => { location.hash = '#/home'; } }, '📺 تماشای زنده'));
}

export function matchSlide(m) {
  const lg = leagueOf(m.league);
  const onAir = isOnAir(m);
  const team = (t) => h('div', { class: 'team' }, logo(t), h('div', { class: 'tn' }, teamName(t)));
  let mid;
  if (hasScore(m)) {
    mid = [h('div', { class: 'big' }, scoreText(m)), h('div', { class: 'small' }, m.phase === 'live' ? ['● ', ltr(statusText(m))] : 'بازی پایان یافت')];
  } else if (m.phase === 'postponed') {
    mid = [h('div', { class: 'big' }, '—'), h('div', { class: 'small' }, statusText(m))];
  } else {
    const [first, ...rest] = timesFor(kickoffMs(m));
    mid = [h('div', { class: 'big' }, first.time), h('div', { class: 'small' }, `${first.label}`), rest.map((x) => h('div', { class: 'small' }, `${x.label} ${x.time}`))];
  }
  return h('div', { class: 'slide-card' },
    h('div', { class: 'slide-lg' }, h('span', {}, lg.fa), onAir && m.phase !== 'live' && h('span', { class: 'slide-live' }, '● در حال پخش')),
    h('div', { class: 'slide-row' }, team(m.home), h('div', { class: 'mid' }, mid), team(m.away)));
}
