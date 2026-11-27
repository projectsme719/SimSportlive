// لینک نهایی پخش یک شبکه: اگر proxy:true باشد از پروکسی Cloudflare رد می‌شود.
export function streamUrl(ch, proxyBase) {
  if (!ch.proxy) return ch.url;
  return proxyBase.replace(/\/$/, '') + '/' + ch.url.replace(/^https?:\/\//, '');
}
