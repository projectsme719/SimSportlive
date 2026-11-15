export const watchHtml = `
<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>پخش زنده</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #000; color: #fff; font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; }
        iframe { width: 100%; height: 100%; border: none; }
        .msg { font-size: 16px; color: #aaa; text-align: center; padding: 20px; }
    </style>
</head>
<body>
    <div id="player-container" class="container">
        <div class="msg">در حال بارگذاری پخش زنده...</div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand(); // باز کردن به صورت تمام صفحه

        function getVideoId() {
            // ۱. خواندن آیدی از طریق پارامتر مینی اپ تلگرام
            if (tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
                return tg.initDataUnsafe.start_param;
            }
            // ۲. خواندن از آدرس مرورگر (جهت تست)
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('v') || urlParams.get('startapp');
        }

        const videoId = getVideoId();
        const container = document.getElementById('player-container');

        if (videoId) {
            container.innerHTML = \`
                <iframe 
                    src="https://www.youtube-nocookie.com/embed/\${videoId}?autoplay=1&playsinline=1&rel=0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>\`;
        } else {
            container.innerHTML = '<div class="msg">❌ ویدیو یافت نشد یا آدرس معتبر نیست.</div>';
        }
    </script>
</body>
</html>
`;