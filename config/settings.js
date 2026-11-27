// تنظیمات کلی پروژه. هر چیزی که فقط «مقدار» است اینجا عوض می‌شود.
export const SETTINGS = {
  appName: 'SimSport Live',
  timeZone: 'Asia/Kabul',        // همهٔ ساعت‌ها به وقت افغانستان
  weekStartDay: 6,               // ۶ = شنبه (۰ = یک‌شنبه)
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
  },
};
