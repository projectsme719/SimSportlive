# SimSport Live — مینی‌اپ پخش زنده و برنامهٔ فوتبال

مینی‌اپ تلگرام با ۳ صفحه (خانه، امروز، هفته)، پخش زندهٔ شبکه‌ها، برنامه و نتایج ۶ لیگ مهم از ESPN،
و اعلان‌های خودکار در کانال. همه‌چیز روی GitHub (رایگان) اجرا می‌شود.

## ساختار فایل‌ها (هر کاری، یک جا)

| می‌خواهید… | این فایل را ویرایش کنید |
|---|---|
| شبکه اضافه/حذف کنید، نام یا لینک عوض کنید | `config/channels.js` |
| لیگ‌ها را عوض کنید | `config/leagues.js` |
| ساعت اعلان صبح، آی‌دی کانال، آدرس پروکسی، … | `config/settings.js` |
| نام فارسی تیم‌ها | `config/teams-fa.js` |
| متن پیام‌های کانال | `scripts/lib/messages.mjs` |
| رنگ‌ها و ظاهر | `css/style.css` (متغیرهای بالای فایل) |

بقیه: `js/pages/*` سه صفحه، `js/components/*` قطعه‌ها (اسلایدر، پلیر، کارت بازی)، `scripts/*` کارهای خودکار.

## نصب فقط با گوشی

1. در GitHub یک مخزن **Public** بسازید (مثلاً `live-hub`).
2. فایل `.github/workflows/install.yml` را بسازید و محتوای فایل `install.yml` (که به شما داده شده) را بچسبانید ← Commit.
3. تب **Actions** ← **Install project files** ← Run workflow. همهٔ فایل‌ها خودکار ساخته می‌شوند.
4. دو فایل زیر را هم دستی بسازید و محتوایشان را بچسبانید (GitHub اجازه نمی‌دهد ربات فایل workflow بسازد):
   - `.github/workflows/update.yml`
   - `.github/workflows/test-bot.yml`
5. **Settings ← Pages ← Source = GitHub Actions**.
6. **Settings ← Secrets and variables ← Actions ← New repository secret**: نام `BOT_TOKEN`، مقدار = توکن ربات از BotFather.
7. Cloudflare ← Worker شما ← کد جدید `worker.js` را بگذارید ← Settings ← Variables:
   `ALLOWED_ORIGINS` = `https://USERNAME.github.io` (USERNAME = نام کاربری GitHub شما).
8. ربات را در کانال **Administrator** کنید (اجازهٔ ارسال پیام).
9. Actions ← **Test bot (manual)** ← Run: باید پیام آزمایشی به کانال و ادمین‌ها برسد.
10. Actions ← **Update data, notify, deploy** ← Run. بعد از اتمام، آدرس سایت در همان صفحه است:
    `https://USERNAME.github.io/live-hub/`
11. BotFather ← `/mybots` ← ربات ← **Bot Settings ← Configure Mini App** ← آدرس بالا را بدهید.
    (اگر با `/newapp` یک Mini App با نام کوتاه ساختید، آن نام را در `config/settings.js` ← `miniAppShortName` بنویسید.)

از این به بعد هر ۵ دقیقه خودکار: داده بروز می‌شود، اعلان‌ها ارسال می‌شود و سایت منتشر می‌شود.

## اعلان‌های کانال
- **۰۶:۳۰ به وقت افغانستان**: لیست بازی‌های امروز.
- **۵ دقیقه قبل از شروع هر بازی**: پیام شروع بازی + دکمهٔ «تماشای زنده».
- **بعد از پایان بازی‌ها**: نتایج.
هر سه در `config/settings.js ← notify` قابل خاموش/روشن‌اند.

## نکته‌ها
- GitHub کار زمان‌بندی‌شده را ممکن است چند دقیقه (گاهی بیشتر) دیر اجرا کند؛ اعلان‌ها با تأخیر کم ارسال می‌شوند.
- مخزن باید **Public** باشد تا Actions و Pages رایگان و نامحدود باشند.
- اگر ۶۰ روز هیچ فعالیتی در مخزن نباشد GitHub زمان‌بندی را خاموش می‌کند؛ ذخیرهٔ وضعیت اعلان‌ها خودش فعالیت حساب می‌شود، ولی اگر خاموش شد از تب Actions دوباره فعالش کنید.
- API ESPN رسمی/تضمینی نیست. اگر یک لیگ خطا بدهد، داده‌ی قبلی همان لیگ نگه داشته می‌شود و اخبار گوگل‌نیوز همچنان بروز می‌شود.
- شبکه‌های `proxy:false` مستقیم در مرورگر پخش می‌شوند و باید اجازهٔ CORS بدهند. اگر پخش نشد، `proxy: true` بگذارید.
- ساعت‌ها همه به وقت افغانستان (`Asia/Kabul`) هستند.
