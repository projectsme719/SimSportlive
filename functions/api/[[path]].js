export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // ⚠️ اینجا باید آیدی اختصاصی ربات خودتان باشد!
  // مثلاً app123456789
  const TELEGRAM_APP_ID = 'app8261477115'; 
  
  // ساخت آدرس مقصد در تلگرام
  const targetUrl = `https://${TELEGRAM_APP_ID}.tgcloud.ai${url.pathname}${url.search}`;

  // اگر مرورگر درخواست OPTIONS فرستاد (برای تست CORS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  try {
    // فوروارد درخواست
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : null
    });

    const response = await fetch(newRequest);
    const newResponse = new Response(response.body, response);
    
    // هدرهای امنیتی
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;

  } catch (error) {
    // اگر کلادفلر نتوانست به تلگرام وصل شود، این متن را برمی‌گرداند
    return new Response(JSON.stringify({ 
      error: "Proxy Error", 
      details: error.message,
      target: targetUrl
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}