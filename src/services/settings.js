import { CONFIG } from '../config.js';

const KEY = 'config:settings';

// تنظیماتی که از پنل ادمین قابل تغییرند (پیش‌فرض‌ها از config.js)
export async function getSettings(env) {
  let s = {};
  try {
    const raw = await env.POSTED_LIVES.get(KEY);
    if (raw) s = JSON.parse(raw);
  } catch {}
  return {
    sports: Array.isArray(s.sports) ? s.sports : [...CONFIG.ENABLED_SPORTS],
    requireEmbeddable:
      typeof s.requireEmbeddable === 'boolean' ? s.requireEmbeddable : CONFIG.REQUIRE_EMBEDDABLE,
    useVision: typeof s.useVision === 'boolean' ? s.useVision : CONFIG.START_GATE.USE_VISION,
    autoPublish: typeof s.autoPublish === 'boolean' ? s.autoPublish : true,
    autoCalendar: typeof s.autoCalendar === 'boolean' ? s.autoCalendar : true,
    announce: typeof s.announce === 'boolean' ? s.announce : true,
  };
}

export async function saveSettings(env, settings) {
  await env.POSTED_LIVES.put(KEY, JSON.stringify(settings));
}