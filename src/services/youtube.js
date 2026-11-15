export async function checkYouTubeLiveRSS(channelId, apiKey) {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssRes = await fetch(rssUrl);
    if (!rssRes.ok) return null;
    
    const xmlText = await rssRes.text();
    const videoIdMatches = [...xmlText.matchAll(/<yt:videoId>(.*?)<\/yt:videoId>/g)];
    if (videoIdMatches.length === 0) return null;

    const recentVideoIds = videoIdMatches.slice(0, 3).map(m => m[1]);
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${recentVideoIds.join(',')}&key=${apiKey}`;
    
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (!apiData.items) return null;

    for (const item of apiData.items) {
      const liveDetails = item.liveStreamingDetails;
      if (liveDetails && liveDetails.actualStartTime && !liveDetails.actualEndTime) {
        return {
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          link: `https://www.youtube.com/live/${item.id}`
        };
      }
    }
  } catch (error) {
    console.error(`YouTube API Error [${channelId}]:`, error);
  }
  return null;
}

export async function getSingleVideoInfo(videoId, apiKey) {
  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${apiKey}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        link: `https://www.youtube.com/live/${item.id}`
      };
    }
  } catch (e) {
    console.error("Single Video Fetch Error:", e);
  }
  return null;
}