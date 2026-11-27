// نقطهٔ شروع مینی‌اپ: مسیریابی ۳ صفحه + بارگذاری داده.
import { SETTINGS } from '../config/settings.js';
import { agoLabel } from '../shared/time.js';
import { getState, startAutoRefresh, subscribe } from './data.js';
import { initTelegram, startParam, tap } from './lib/tg.js';
import { HomePage } from './pages/home.js';
import { TodayPage } from './pages/today.js';
import { WeekPage } from './pages/week.js';

initTelegram();
document.title = SETTINGS.appName;
document.getElementById('brand-name').textContent = SETTINGS.appName;

const pages = { home: HomePage(), today: TodayPage(), week: WeekPage() };
const view = document.getElementById('view');
const wrappers = {};
for (const [name, p] of Object.entries(pages)) {
  wrappers[name] = Object.assign(document.createElement('div'), { className: 'page' });
  wrappers[name].append(p.el);
  view.append(wrappers[name]);
}

let current = null;
function route() {
  const name = (location.hash.match(/^#\/(\w+)/) || [])[1];
  const next = pages[name] ? name : 'home';
  if (next === current) return;
  if (current) { wrappers[current].classList.remove('on'); pages[current].onHide(); }
  current = next;
  wrappers[current].classList.add('on');
  pages[current].onShow();
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === current));
  window.scrollTo(0, 0);
}
document.querySelector('.tabs').addEventListener('click', tap);
window.addEventListener('hashchange', route);

// لینک‌های عمیق از کانال: ?startapp=live | today | week
const sp = startParam();
if (sp === 'today' || sp === 'week') location.hash = `#/${sp}`;
route();
if (sp === 'live') setTimeout(() => pages.home.open(), 300);

const updated = document.getElementById('updated');
subscribe((s) => {
  Object.values(pages).forEach((p) => p.onData(s));
  updated.textContent = s.failed && !s.loaded ? 'خطا در دریافت داده' : s.updatedAt ? `بروزرسانی: ${agoLabel(Date.parse(s.updatedAt))}` : '';
});
pages.home.onData(getState());
startAutoRefresh();
setInterval(() => { const s = getState(); if (s.updatedAt) updated.textContent = `بروزرسانی: ${agoLabel(Date.parse(s.updatedAt))}`; }, 30000);
