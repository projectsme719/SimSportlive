// ──────────────────────────────────────────────────────────────
//  همهٔ شبکه‌ها فقط در همین فایل‌اند: اضافه، حذف، تغییر نام و لینک.
//
//  هر شبکه:
//    id       شناسهٔ یکتا (انگلیسی، بدون فاصله)
//    name     نامی که در مینی‌اپ دیده می‌شود
//    group    دسته‌بندی در فهرست شبکه‌ها
//    icon     ایموجی (اختیاری)
//    sources  چند لینک .m3u8 به ترتیب اولویت. اگر اولی کار نکرد خودکار روی دومی می‌رود، و همین‌طور تا آخر.
//    url      (به‌جای sources) فقط یک لینک
//    vlc      لینکی که با دکمهٔ «باز کردن در VLC» باز می‌شود (اگر ننویسید، اولین منبع)
//    proxy    true  → از پروکسی Cloudflare می‌گذرد (برای لینک‌هایی که Referer می‌خواهند، مثل liveland)
//             false → مستقیم (سهمیهٔ Cloudflare مصرف نمی‌شود)
//    enabled  false → موقتاً مخفی (اختیاری)
//
//  لینک‌های http:// داخل مرورگر (صفحهٔ https) پخش نمی‌شوند؛ آن‌ها فقط برای VLC به کار می‌روند.
// ──────────────────────────────────────────────────────────────
export const CHANNELS = [
  // ── شبکه‌هایی که بازی‌ها را پخش می‌کنند ──
  {
    id: 'varzesh', name: 'شبکه ورزش', group: 'ورزشی', icon: '⚽',
    sources: [
      'https://cp11.adabmedia.com/hls2/varzeshtest.m3u8',
      'https://live-aburayhan1110.telewebion.ir/ek/varzesh/live/108050p/index.m3u8',
    ],
    vlc: 'https://ncdn.telewebion.ir/varzesh/live/playlist.m3u8',
  },
  {
    id: 'tv3', name: 'شبکه ۳', group: 'ورزشی', icon: '📺',
    sources: [
      'https://live-aburayhan1112.telewebion.ir/ek/tv3/live/108050p/index.m3u8',
      'https://cp11.adabmedia.com/hls2/tv3test.m3u8',
    ],
    vlc: 'https://ncdn.telewebion.ir/tv3/live/playlist.m3u8',
  },
  {
    id: 'persiana', name: 'پرشینا اسپورت', group: 'ورزشی', icon: '🏆',
    sources: [
      'https://cp11.adabmedia.com/hls2/persiana.m3u8',   // نسخهٔ https (حدس همان آدرس؛ اگر نشد، رد می‌شود)
      'http://cp11.adabmedia.com/hls2/persiana.m3u8',    // در مرورگر https کار نمی‌کند، برای VLC خوب است
    ],
    vlc: 'http://cp11.adabmedia.com/hls2/persiana.m3u8',
  },

  // ── افغانستان (liveland؛ نیاز به پروکسی) ──
  { id: 'tolo-news', name: 'طلوع نیوز', group: 'افغانستان', icon: '📰', url: 'https://stream1.liveland.af/hls/tv/tolo-news/playlist.m3u8', proxy: true },
  { id: 'ariana',    name: 'آریانا',    group: 'افغانستان', icon: '📺', url: 'https://stream1.liveland.af/hls/tv/ariana/playlist.m3u8',    proxy: true },
  // آدرس این یکی بر اساس الگوی بقیه نوشته شده؛ اگر پخش نشد با دستور /channels ربات لینک درست را بگیرید.
  { id: 'af-sports', name: 'ورزش افغانستان', group: 'افغانستان', icon: '⚽', url: 'https://stream1.liveland.af/hls/tv/af-sports/playlist.m3u8', proxy: true },
];

// شبکه‌هایی که کنار هر بازیِ «در حال پخش» دکمه می‌شوند (به ترتیب id)، و در پست‌های کانال هم می‌آیند.
export const MATCH_CHANNELS = ['varzesh', 'tv3', 'persiana'];
