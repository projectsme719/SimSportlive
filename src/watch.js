export const watchHtml = `<!DOCTYPE html>
<html lang="fa">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>پخش زنده</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #000; color: #fff; font-family: sans-serif; height: 100%; overflow: hidden; }
    .container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
    iframe { width: 100%; height: 100%; border: none; }
    .msg { font-size: 16px; color: #aaa; text-align: center; padding: 20px; line-height: 1.8; }
  </style>
</head>
<body>
  <div id="player-container" class="container">
    <div class="msg">در حال بارگذاری پخش زنده...</div>
  </div>

  <script>
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg) { tg.ready(); tg.expand(); }

    function getVideoId() {
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
        return tg.initDataUnsafe.start_param;
      }
      var p = new URLSearchParams(window.location.search);
      return p.get('v') || p.get('startapp') || p.get('tgWebAppStartParam');
    }

    var videoId = getVideoId();
    var container = document.getElementById('player-container');

    function showMsg(text) {
      container.innerHTML = '';
      var d = document.createElement('div');
      d.className = 'msg';
      d.textContent = text;
      container.appendChild(d);
    }

    function embed() {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&playsinline=1&rel=0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      container.innerHTML = '';
      container.appendChild(iframe);
    }

    // فقط آیدی معتبر ۱۱ کاراکتری یوتیوب (جلوگیری از تزریق کد)
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      // اگر پخش تمام شده باشد، لینک منقضی است
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 3000);
      fetch('/api/status?v=' + videoId, { signal: ctrl.signal })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          clearTimeout(timer);
          if (d && d.ended) { showMsg('🏁 این پخش زنده پایان یافته است.'); } else { embed(); }
        })
        .catch(function () { embed(); });
    } else {
      showMsg('❌ ویدیو یافت نشد یا آدرس معتبر نیست.');
    }
  </script>
</body>
</html>`;