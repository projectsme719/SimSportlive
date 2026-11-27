// شبکه‌هایی که کنار بازی‌ها دکمه می‌شوند (از config/channels.js ← MATCH_CHANNELS)
import { CHANNELS, MATCH_CHANNELS } from '../../config/channels.js';

export const matchChannelsList = () =>
  MATCH_CHANNELS.map((id) => CHANNELS.find((c) => c.id === id)).filter((c) => c && c.enabled !== false);
