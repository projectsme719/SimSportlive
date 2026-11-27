// کارت بازی (برای لیست‌ها) و اسلاید بازی (برای صفحهٔ خانه)
import { h } from '../lib/dom.js';
import { hhmm } from '../../shared/time.js';
import { hasScore, kickoffMs, leagueOf, scoreText, statusText, teamName } from '../../shared/format.js';

const ltr = (t) => h('bdi', { dir: 'ltr' }, t);
const hideBroken = { error: (e) => { e.target.style.visibility = 'hidden'; } };
const logo = (t) => h('img', { src: t.logo, alt: '', loading: 'lazy', onerror: hideBroken.error });
const openChannels = () => { location.hash = '#/home'; window.dispatchEvent(new Event('open-channels')); };

function badge(m) {
  const t = statusText(m);
  return t ? h('span', { class: `badge ${m.phase}` }, m.phase === 'live' ? ['● ', ltr(t)] : t) : null;
}

const middle = (m) =>
  hasScore(m) ? h('div', { class: 'mid' }, scoreText(m))
  : h('div', { class: 'mid time' }, m.phase === 'postponed' ? '—' : hhmm(kickoffMs(m)));

export function matchCard(m, { showLeague = false, showWatch = true } = {}) {
  const lg = leagueOf(m.league);
  return h('article', { class: `match ${m.phase}` },
    h('div', { class: 'match-top' },
      showLeague && h('span', { class: 'chip-lg', style: `--c:${lg.color}` }, lg.fa), badge(m)),
    h('div', { class: 'match-row' },
      h('div', { class: 'team' }, logo(m.home), h('span', { class: 'tn' }, teamName(m.home))),
      middle(m),
      h('div', { class: 'team' }, logo(m.away), h('span', { class: 'tn' }, teamName(m.away)))),
    showWatch && m.phase === 'live' && h('button', { class: 'btn-watch', onclick: openChannels }, '📺 تماشای زنده'));
}

export function matchSlide(m) {
  const lg = leagueOf(m.league);
  const status = statusText(m);
  const mid = hasScore(m)
    ? [h('div', { class: 'big' }, scoreText(m)), h('div', { class: 'small' }, m.phase === 'live' ? ['● ', ltr(status)] : status)]
    : [h('div', { class: 'big' }, m.phase === 'postponed' ? '—' : hhmm(kickoffMs(m))), h('div', { class: 'small' }, m.phase === 'postponed' ? status : 'به وقت افغانستان')];
  const team = (t) => h('div', { class: 'team' }, logo(t), h('div', { class: 'tn' }, teamName(t)));
  return h('div', { class: 'slide-card' },
    h('div', { class: 'slide-lg' }, h('span', {}, lg.fa)),
    h('div', { class: 'slide-row' }, team(m.home), h('div', { class: 'mid' }, mid), team(m.away)));
}
