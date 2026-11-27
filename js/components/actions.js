// دکمه‌های پخش زنده کنار یک بازی (فقط وقتی بازی در حال پخش است نشان داده می‌شود)
import { CHANNELS, MATCH_CHANNELS } from '../../config/channels.js';
import { h } from '../lib/dom.js';

export const matchChannels = () =>
  MATCH_CHANNELS.map((id) => CHANNELS.find((c) => c.id === id)).filter((c) => c && c.enabled !== false);

export function liveActions({ onPlay, onVlc }) {
  const chans = matchChannels();
  return h('div', { class: 'live-actions' },
    h('div', { class: 'row' }, chans.map((c) => h('button', { class: 'btn-ch', onclick: () => onPlay(c) }, `📺 ${c.name}`))),
    h('div', { class: 'vlc-row' },
      h('span', { class: 'vlc-lbl' }, 'اگر در مرورگر پخش نشد، با VLC باز کنید:'),
      chans.map((c) => h('button', { class: 'btn-vlc', onclick: () => onVlc(c) }, c.name))),
    h('div', { class: 'vlc-note' }, 'برای VLC باید برنامهٔ VLC روی گوشی نصب باشد.'));
}
