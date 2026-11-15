export const miniappHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SimSportLive - ورزش افغانستان</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    body { font-family: Tahoma, sans-serif; background-color: var(--tg-theme-bg-color, #121212); color: var(--tg-theme-text-color, #fff); padding: 15px; margin: 0; }
    .card { background: var(--tg-theme-secondary-bg-color, #1e1e1e); border-radius: 12px; padding: 15px; margin-bottom: 12px; border-right: 4px solid #d32f2f; }
    .title { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
    .time { font-size: 12px; color: #aaa; }
    .badge { background: #d32f2f; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; float: left; }
  </style>
</head>
<body>
  <h2>🇦🇫 نتایج و برنامه مسابقات</h2>
  <div id="content">
    <div class="card">
      <span class="badge">سیستم فعال است</span>
      <div class="title">ورزش افغانستان</div>
      <div class="time">به زودی مسابقات جدید اضافه می‌شود...</div>
    </div>
  </div>
  <script>
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  </script>
</body>
</html>`;