// لینک‌های پخش یک شبکه.
//   sources: چند لینک به ترتیب اولویت (اگر اولی کار نکرد خودکار سراغ بعدی می‌رود)
//   url:     فقط یک لینک (برای شبکه‌های ساده)
//   vlc:     لینک مخصوص باز کردن در VLC (اگر نباشد، اولین منبع)
//   proxy:   true → همهٔ منبع‌ها از پروکسی Cloudflare می‌گذرند
export const sourcesOf = (ch) => ch.sources || (ch.url ? [ch.url] : []);

const viaProxy = (u, base) => base.replace(/\/$/, '') + '/' + u.replace(/^https?:\/\//, '');

// منبع‌های قابل پخش در مرورگر. در صفحهٔ https لینک http به‌خاطر Mixed Content قابل پخش نیست و رد می‌شود.
export function webSources(ch, proxyBase) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:';
  return sourcesOf(ch)
    .map((u) => (ch.proxy ? viaProxy(u, proxyBase) : u))
    .filter((u) => !(secure && u.startsWith('http://')));
}

export const streamUrl = (ch, proxyBase) => (ch.proxy ? viaProxy(sourcesOf(ch)[0], proxyBase) : sourcesOf(ch)[0]);
export const vlcSource = (ch, proxyBase) => ch.vlc || streamUrl(ch, proxyBase);
