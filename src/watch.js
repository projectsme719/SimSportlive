export const watchHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>پخش زنده | SimSportLive</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    html, body { margin: 0; padding: 0; background: #000; color: #fff; font-family: Tahoma, sans-serif; }
    .bar { padding: 10px; text-align: center; font-size: 14px; background: #111; }
    .wrap { position: relative; width: 100%; padding-top: 56.25%; }
    iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <div class="bar">🔴 پخش زنده | سیم‌ورغ اسپورت 🇦🇫</div>
  <div class="wrap">
    <iframe id="player"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen></iframe>
  </div>
  <script>
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg) { tg.ready(); tg.expand(); }

    var params = new URLSearchParams(window.location.search);
    var startParam = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || "";
    var id = startParam || params.get("v") || "";

    if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
      document.getElementById("player").src =
        "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&playsinline=1&rel=0";
    } else {
      document.querySelector(".bar").textContent = "لینک پخش نامعتبر است";
    }
  </script>
</body> 
</html>`;