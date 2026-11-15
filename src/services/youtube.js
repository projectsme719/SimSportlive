function mapItem(item) {
  return {
    id: item.id,
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    channelTitle: item.snippet?.channelTitle || '',
    embeddable: item.status?.embeddable !== false,
    link: `https://www.youtube.com/watch?v=${item.id}`,
  };
}

// همه لایوهای در حال پخش یک کانال را برمی‌گرداند (آرایه)
export async function checkYouTubeLiveRSS(channelId, apiKey) {
  try {
    const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!rssRes.ok) {
      console.error(`RSS ${channelId} status ${rssRes.status}`);
      return [];
    }

    const xml = await rssRes.text();
    const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)]
      .slice(0, 5)
      .map((m) => m[1]);
    if (!ids.length) return [];

    const apiUrl =
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status` +
      `&id=${ids.join(',')}&key=${apiKey}`;
    const apiRes = await fetch(apiUrl);
    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error('YouTube API error:', JSON.stringify(data.error || data));
      return [];
    }

    return (data.items || [])
      .filter((it) => {
        const d = it.liveStreamingDetails;
        return d && d.actualStartTime && !d.actualEndTime;
      })
      .map(mapItem);
  } catch (error) {
    console.error(`YouTube Error [${channelId}]:`, error);
    return [];
  }
}

export async function getSingleVideoInfo(videoId, apiKey) {
  try {
    const apiUrl =
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status` +
      `&id=${videoId}&key=${apiKey}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    if (data.items && data.items.length > 0) return mapItem(data.items[0]);
  } catch (e) {
    console.error('Single Video Fetch Error:', e);
  }
  return null;
}
