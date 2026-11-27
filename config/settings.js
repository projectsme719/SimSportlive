// تنظیمات کلی پروژه. هر چیزی که فقط «مقدار» است اینجا عوض می‌شود.
export const SETTINGS = {
  appName: 'SimSport Live',
  timeZone: 'Asia/Kabul',        // منطقهٔ اصلی (تقسیم روزها و اعلان صبح)
  // ساعت شروع بازی‌ها به همهٔ این منطقه‌ها نشان داده می‌شود (اولی درشت‌تر)
  timeZones: [
    { id: 'Asia/Kabul', label: 'افغانستان' },
    { id: 'Asia/Tehran', label: 'ایران' },
  ],
  // دکمه‌های پخش زنده از لحظهٔ شروع بازی فعال می‌شوند (مستقل از ساعت منطقه‌ها)
  live: { leadMinutes: 0, windowHours: 3 },
  weekMode: 'rolling',           // 'rolling' = ۷ روز از «امروز» به بعد | 'calendar' = هفتهٔ شنبه تا جمعه
  weekStartDay: 6,               // فقط برای weekMode:'calendar' — ۶ = شنبه (۰ = یک‌شنبه)
  persianDateShift: 0,           // اگر تاریخ شمسی با تقویم شما یک روز فرق داشت: 1 یا -1
  persianTeamNames: true,        // نام تیم‌ها فارسی (از config/teams-fa.js)
  refreshSeconds: 120,           // هر چند ثانیه مینی‌اپ داده را دوباره بخواند

  // آدرس سایت GitHub Pages شما (برای خواندن داده‌ی قبلی هنگام خطا) — بعد از اولین دیپلوی پر کنید
  pagesUrl: '',                  // مثلاً 'https://USERNAME.github.io/live-hub/'

  telegram: {
    botUsername: 'Live_stream_AF_Bot',
    channelId: -1004402889429,
    channelLink: 'https://t.me/SimSportlive',
    adminIds: [8043897855, 7566522940],
    // اگر در BotFather با /newapp یک Mini App با نام کوتاه ساخته‌اید اینجا بنویسید (مثلاً 'live').
    // اگر خالی باشد از «Main Mini App» ربات استفاده می‌شود.
    miniAppShortName: '',
  },

  // پروکسی Cloudflare برای شبکه‌هایی که proxy:true دارند (مسیر /app با بررسی Origin)
  proxy: { base: 'https://super-wood-b37c.peyda-help.workers.dev/app' },

  // اعلان‌های کانال تلگرام
  notify: {
    morning: true,               // لیست بازی‌های امروز
    morningTime: '06:30',        // به وقت افغانستان
    starts: true,                // اعلان شروع بازی
    startLeadMinutes: 5,         // چند دقیقه قبل از شروع
    results: true,               // اعلان نتیجهٔ بازی‌های تمام‌شده
    news: true,                  // خلاصهٔ اخبار و حواشی (ترجمه‌شده)
    newsTimes: ['12:00', '20:00'], // ساعت‌های ارسال خبر (به وقت افغانستان)
    newsMax: 6,                  // حداکثر تعداد خبر در هر پست
  },

  // اخبار و حواشی: از RSS گوگل‌نیوز + ترجمه با Gemini (کم‌مصرف: دسته‌ای، کش‌شده، با فاصله)
  news: {
    models: ['gemini-3.5-flash-lite', 'gemini-3.6-flash'], // اولی؛ اگر خطا داد دومی
    fetchEveryMinutes: 20,       // هر چند دقیقه خبر تازه بگیرد
    translateEveryMinutes: 30,   // حداقل فاصلهٔ دو بار ترجمه
    maxPerRun: 15,               // حداکثر عنوان در هر بار ترجمه (همه در یک درخواست)
    perLeague: 4,                // چند خبر از هر لیگ
    keepHours: 48,               // خبرهای قدیمی‌تر پاک می‌شوند
  },
};
