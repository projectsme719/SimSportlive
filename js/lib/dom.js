// ساخت المان‌های DOM با یک تابع کوچک.  h('div', {class:'x', onclick: fn}, child1, child2)
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(c));
  }
  return el;
}

// پیام کوتاه پایین صفحه
let toastTimer;
export function toast(text, ms = 4500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

export function copyText(text) {
  try { return navigator.clipboard.writeText(text).then(() => true, () => false); } catch { return Promise.resolve(false); }
}
