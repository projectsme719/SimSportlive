function mapItem(item) {
  const st = item.status || {};
  const cd = item.contentDetails || {};
  const ageRestricted = cd.contentRating?.ytRating === 'ytAgeRestricted';
  const rr = cd.regionRestriction;
  const blockedInAF =
    !!rr && ((rr.blocked || []).includes('AF') || (rr.allowed && !rr.allowed.includes('AF')));
  const ld = item.liveStreamingDetails || {};

  return {
    id: item.id,
    channelId: item.snippet?.channelId || '',
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    channelTitle: item.snippet?.channelTitle || '',
    liveState: item.snippet?.liveBroadcastContent || '',
    audioLanguage: item.snippet?.defaultAudioLanguage || item.snippet?.defaultLanguage || '',
    scheduledStartTime: ld.scheduledStartTime || '',
    actualStartTime: ld.actualStartTime || '',
    // آیا لایو داخل تلگرام (پخش‌کننده embed) قابل پخش است؟
    embeddable:
      st.embeddable !== false && st.privacyStatus !== 'private' && !ageRestricted && !blockedInAF,
    link: `https://www.youtube.com/watch?v=${item.id}`,
  };
}

const PARTS = 'snippet,liveStreamingDetails,status,contentDetails';

// لایوهای در حال پخش + لایوهای زمان‌بندی‌شده یک کانال: {live, upcoming}
export async function checkChannelStreams(channelId, apiKey) {
  const empty = { live: [], upcoming: [] };
  try {
    const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!rssRes.ok) {
      console.error(`RSS ${channelId} status ${rssRes.status}`);
      return empty;
    }

    const xml = await rssRes.text();
    const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)]
      .slice(0, 15)
      .map((m) => m[1]);
    if (!ids.length) return empty;

    const apiUrl =
      `https://www.googleapis.com/youtube/v3/videos?part=${PARTS}` +
      `&id=${ids.join(',')}&key=${apiKey}`;
    const apiRes = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error('YouTube API error:', JSON.stringify(data.error || data));
      return empty;
    }

    const live = [];
    const upcoming = [];
    for (const it of data.items || []) {
      const d = it.liveStreamingDetails;
      if (!d) continue;
      if (d.actualStartTime && !d.actualEndTime) live.push(mapItem(it));
      else if (!d.actualStartTime && d.scheduledStartTime && it.snippet?.liveBroadcastContent === 'upcoming') {
        upcoming.push(mapItem(it));
      }
    }
    return { live, upcoming };
  } catch (error) {
    console.error(`YouTube Error [${channelId}]:`, error);
    return empty;
  }
}

// سازگاری با نسخه قبل: فقط لایوهای در حال پخش
export async function checkYouTubeLiveRSS(channelId, apiKey) {
  return (await checkChannelStreams(channelId, apiKey)).live;
}

export async function getSingleVideoInfo(videoId, apiKey) {
  try {
    const apiUrl =
      `https://www.googleapis.com/youtube/v3/videos?part=${PARTS}&id=${videoId}&key=${apiKey}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.items && data.items.length > 0) return mapItem(data.items[0]);
  } catch (e) {
    console.error('Single Video Fetch Error:', e);
  }
  return null;
}

const VIDEO_URL_RE = /(?:youtu\.be\/|[?&]v=|\/live\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/;

// تبدیل آیدی (UC...)، @handle، لینک کانال یا لینک یک ویدیو به {id, title}
export async function resolveChannel(input, apiKey) {
  const s = String(input || '').trim();

  try {
    const idMatch = s.match(/(UC[A-Za-z0-9_-]{22})/);
    const videoMatch = !idMatch && s.match(VIDEO_URL_RE);
    const handleMatch = !idMatch && !videoMatch && s.match(/@([A-Za-z0-9._-]{3,})/);

    let url;
    if (idMatch) {
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${idMatch[1]}&key=${apiKey}`;
    } else if (videoMatch) {
      url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoMatch[1]}&key=${apiKey}`;
    } else if (handleMatch) {
      url =
        `https://www.googleapis.com/youtube/v3/channels?part=snippet` +
        `&forHandle=${encodeURIComponent('@' + handleMatch[1])}&key=${apiKey}`;
    } else {
      return null;
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    if (videoMatch) {
      return { id: item.snippet?.channelId, title: item.snippet?.channelTitle || '' };
    }
    return { id: item.id, title: item.snippet?.title || '' };
  } catch (e) {
    console.error('resolveChannel error:', e);
    return null;
  }
}

// وضعیت پایان چند ویدیو با یک درخواست (۱ واحد سهمیه). خروجی: Map(id -> {found, endTime}) یا null در خطا
export async function getVideosEndInfo(ids, apiKey) {
  const map = new Map();
  try {
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,status&id=${chunk.join(',')}&key=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error('getVideosEndInfo error:', JSON.stringify(data.error || data));
        return null;
      }
      for (const it of data.items || []) {
        const d = it.liveStreamingDetails || {};
        map.set(it.id, { found: true, endTime: d.actualEndTime ? Date.parse(d.actualEndTime) : 0 });
      }
    }
    return map;
  } catch (e) {
    console.error('getVideosEndInfo exception:', e);
    return null;
  }
}