export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // ۱. مدیریت درخواست‌های OPTIONS (بسیار مهم برای CORS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // ۲. حذف کلمه /api از ابتدای آدرس
  const path = url.pathname.replace(/^\/api/, '');
  
  // ۳. جایگزینی YOUR_APP_ID با آیدی سرورلس خودتان (فقط عدد)
  const targetUrl = 'https://app8261477115.tgcloud.ai' + path + url.search;

  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });

  try {
    const response = await fetch(modifiedRequest);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', msg: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}