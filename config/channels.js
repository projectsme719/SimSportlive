// ──────────────────────────────────────────────────────────────
//  همهٔ شبکه‌ها فقط در همین فایل‌اند: اضافه، حذف، تغییر نام و لینک.
//
//  هر شبکه:
//    id      شناسهٔ یکتا (انگلیسی، بدون فاصله)
//    name    نامی که در مینی‌اپ دیده می‌شود
//    group   دسته‌بندی (شبکه‌های هم‌گروه کنار هم می‌آیند)
//    icon    ایموجی (اختیاری)
//    url     لینک مستقیم .m3u8
//    proxy   true  → از پروکسی Cloudflare می‌گذرد (برای لینک‌هایی که Referer می‌خواهند، مثل liveland)
//            false → مستقیم پخش می‌شود (سهمیهٔ Cloudflare مصرف نمی‌شود)
//    enabled false → موقتاً مخفی (اختیاری)
//
//  برای حذف یک شبکه، آن خط را پاک کنید یا enabled: false بگذارید.
// ──────────────────────────────────────────────────────────────
export const CHANNELS = [
  // ── افغانستان (liveland؛ نیاز به پروکسی) ──
  { id: 'tolo-news', name: 'طلوع نیوز', group: 'افغانستان', icon: '📰', url: 'https://stream1.liveland.af/hls/tv/tolo-news/playlist.m3u8', proxy: true },
  { id: 'ariana',    name: 'آریانا',    group: 'افغانستان', icon: '📺', url: 'https://stream1.liveland.af/hls/tv/ariana/playlist.m3u8',    proxy: true },
  // آدرس این یکی بر اساس الگوی بقیه نوشته شده؛ اگر پخش نشد با دستور /channels ربات لینک درست را بگیرید.
  { id: 'af-sports', name: 'ورزش افغانستان', group: 'افغانستان', icon: '⚽', url: 'https://stream1.liveland.af/hls/tv/af-sports/playlist.m3u8', proxy: true },

  // ── ایران (لینک عمومی؛ بدون پروکسی) ──
  { id: 'varzesh', name: 'شبکه ورزش', group: 'ایران', icon: '⚽', url: 'https://cp11.adabmedia.com/hls2/varzeshtest.m3u8', proxy: false },
  { id: 'tv3',     name: 'شبکه ۳',    group: 'ایران', icon: '📺', url: 'https://ncdn.telewebion.ir/tv3/live/playlist.m3u8',     proxy: false },
];
