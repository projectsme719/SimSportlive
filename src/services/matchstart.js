import { CONFIG } from '../config.js';
import { classifyLiveFrame } from './gemini.js';

// آیا مسابقه واقعاً شروع شده (نه صفحه انتظار)؟
export async function hasMatchStarted(video, env) {
  const G = CONFIG.START_GATE;
  if (!G.ENABLED) return { started: true, reason: 'gate-off' };

  const now = Date.now();
  const sched = video.scheduledStartTime ? Date.parse(video.scheduledStartTime) : 0;
  const actual = video.actualStartTime ? Date.parse(video.actualStartTime) : 0;
  const base = Math.max(sched || 0, actual || 0);

  // ۱) هنوز به زمان برنامه‌ریزی‌شده نرسیده (لایو زودتر باز شده)
  if (sched && now < sched - G.EARLY_TOLERANCE_MIN * 60000) {
    return { started: false, reason: 'before-scheduled' };
  }

  if (!G.USE_VISION) return { started: true, reason: 'time-gate' };

  // ۲) بررسی فریم زنده
  const state = await classifyLiveFrame(video, env);
  if (state === 'match') return { started: true, reason: 'vision-match' };

  const minutesSinceBase = base ? (now - base) / 60000 : 0;

  if (state === 'waiting') {
    // اگر خیلی از زمان شروع گذشته، احتمال خطای تشخیص است
    if (base && minutesSinceBase >= G.FORCE_AFTER_MIN) return { started: true, reason: 'force-after' };
    return { started: false, reason: 'vision-waiting' };
  }

  // unknown: بعد از مدتی از زمان شروع منتشر شود
  if (base && minutesSinceBase >= G.UNKNOWN_GRACE_MIN) return { started: true, reason: 'unknown-grace' };
  return { started: false, reason: 'unknown-wait' };
}