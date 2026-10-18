export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // ⚠️ آیدی اپلیکیشن تلگرام خود را اینجا وارد کنید
  const TELEGRAM_APP_ID = 'app8635372278'; 
  
  // آدرس واقعی بک‌اند تلگرام
  const targetUrl = `https://${TELEGRAM_APP_ID}.tgcloud.ai${url.pathname}${url.search}`;

  // فوروارد کردن درخواست به تلگرام
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });

  // دریافت پاسخ از تلگرام
  const response = await fetch(newRequest);
  const newResponse = new Response(response.body, response);
  
  // تنظیم هدرهای امنیتی برای جلوگیری از خطای CORS
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Headers', '*');
  
  return newResponse;
}