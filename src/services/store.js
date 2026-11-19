import { CONFIG } from '../config.js';
import { resolveChannel } from './youtube.js';

export async function getWhitelist(env) {
  const out = await env.ATHLETES_WHITELIST.list({ prefix: 'fighter:' });
  return out.keys.map((k) => k.name.replace('fighter:', ''));
}

function parseChannelValue(v) {
  try {
    const o = JSON.parse(v);
    if (o && typeof o === 'object') return { title: o.title || '', trusted: o.trusted === true };
  } catch {}
  return { title: v && v !== '1' ? v : '', trusted: false };
}

export async function getExtraChannels(env) {
  const out = await env.POSTED_LIVES.list({ prefix: 'channel:' });
  const items = [];
  for (const k of out.keys) {
    const v = await env.POSTED_LIVES.get(k.name);
    items.push({ id: k.name.replace('channel:', ''), ...parseChannelValue(v) });
  }
  return items;
}

// Map: channelId -> {trusted}
export async function getAllChannels(env) {
  const map = new Map();
  for (const id of CONFIG.YOUTUBE_CHANNELS) map.set(id, { trusted: false });
  for (const c of await getExtraChannels(env)) map.set(c.id, { trusted: c.trusted });
  return map;
}

// رسانه‌های معتبر پیش‌فرض (یک‌بار پیدا و ذخیره می‌شوند)
export async function seedDefaultChannels(env) {
  const kv = env.POSTED_LIVES;
  for (const entry of CONFIG.SEED_CHANNELS || []) {
    try {
      if (await kv.get('seeded:' + entry)) continue;
      if (await kv.get('seedfail:' + entry)) continue; // ۶ ساعت صبر بعد از شکست

      const ch = await resolveChannel(entry, env.YOUTUBE_API_KEY);
      if (!ch || !ch.id) {
        await kv.put('seedfail:' + entry, '1', { expirationTtl: 21600 });
        console.error('seed failed:', entry);
        continue;
      }
      if (!(await kv.get('channel:' + ch.id))) {
        await kv.put('channel:' + ch.id, JSON.stringify({ title: ch.title, trusted: true }));
      }
      await kv.put('seeded:' + entry, '1');
    } catch (e) {
      console.error('seed error:', entry, e);
    }
  }
}