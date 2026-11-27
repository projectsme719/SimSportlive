// ──────────────────────────────────────────────────────────────
//  همهٔ شبکه‌ها فقط در همین فایل‌اند: اضافه، حذف، تغییر نام و لینک.
//
//  هر شبکه:
//    id       شناسهٔ یکتا (فقط حرف انگلیسی، عدد، - و _ ؛ بدون فاصله)
//    name     نامی که در مینی‌اپ دیده می‌شود
//    group    دسته‌بندی در فهرست شبکه‌ها
//    icon     ایموجی (اختیاری)
//    sources  چند لینک .m3u8 به ترتیب اولویت. اگر اولی کار نکرد خودکار روی دومی می‌رود، و همین‌طور تا آخر.
//    url      (به‌جای sources) فقط یک لینک
//    vlc      لینکی که با دکمهٔ «باز کردن در VLC» باز می‌شود (اگر ننویسید، اولین منبع)
//    proxy    true  → از پروکسی Cloudflare می‌گذرد (فقط برای لینک‌هایی که Referer می‌خواهند)
//             false یا ننوشتن → مستقیم
//    enabled  false → موقتاً مخفی (اختیاری)
//
//  قانون نوشتن: هر لینک داخل «دو علامت نقل‌قول» و بعدش «کاما».  'لینک',
//  لینک‌های http:// داخل مرورگر (صفحهٔ https) پخش نمی‌شوند؛ آن‌ها فقط برای VLC به کار می‌روند.
// ──────────────────────────────────────────────────────────────
export const CHANNELS = [
  {
    id: 'varzesh', name: 'شبکه ورزش', group: 'ورزشی', icon: '📡',
    sources: [
      'https://cp11.adabmedia.com/hls2/varzeshtest.m3u8',
      'https://live-aburayhan1110.telewebion.ir/ek/varzesh/live/108050p/index.m3u8',
    ],
    vlc: 'https://ncdn.telewebion.ir/varzesh/live/playlist.m3u8',
  },
  {
    id: 'tv3', name: 'شبکه ۳', group: 'ورزشی', icon: '📡',
    sources: [
      'https://live-aburayhan1112.telewebion.ir/ek/tv3/live/108050p/index.m3u8',
      'https://cp11.adabmedia.com/hls2/tv3test.m3u8',
    ],
    vlc: 'https://ncdn.telewebion.ir/tv3/live/playlist.m3u8',
  },
  {
    id: 'bein-es', name: 'اسپانیا اسپورت', group: 'ورزشی', icon: '📡',
    sources: [
      'https://dc1644a9jazgj.cloudfront.net/beIN_Sports_Xtra_Espanol.m3u8',
    ],
  },
];

// شبکه‌هایی که کنار هر بازیِ «در حال پخش» دکمه می‌شوند (به ترتیب id)، و در پست‌های کانال هم می‌آیند.
export const MATCH_CHANNELS = ['varzesh', 'tv3', 'bein-es'];
