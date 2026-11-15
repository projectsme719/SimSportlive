# afg-sports-live-bot

ربات تلگرام برای شناسایی لایوهای ورزشی افغانستان در یوتیوب، تحلیل با Gemini و انتشار در کانال (Cloudflare Workers).

## راه‌اندازی

1. **Secretها** (Settings > Variables and Secrets > نوع Secret، یا `npx wrangler secret put NAME`):
   - `TELEGRAM_BOT_TOKEN`
   - `YOUTUBE_API_KEY`
   - `GEMINI_API_KEY`
   - `TELEGRAM_WEBHOOK_SECRET` (رشته تصادفی فقط با حروف انگلیسی/عدد/`_`/`-`)
2. **Deploy**: Push به گیت‌هاب → Cloudflare خودکار دیپلوی می‌کند (Deploy command: `npx wrangler deploy`).
3. **ثبت وب‌هوک**: یک‌بار در مرورگر باز کنید:
   `https://<worker>.workers.dev/setup?key=<TELEGRAM_WEBHOOK_SECRET>`
4. **Mini App** در BotFather: `/newapp` → ربات `SimSportBot` → Short name = `watch` → URL = `https://<worker>.workers.dev/watch`
5. ربات را در کانال `@SimSportlive` **ادمین** کنید (با دسترسی ارسال پیام).
6. Cron هر ۵ دقیقه از `wrangler.toml` فعال می‌شود.

