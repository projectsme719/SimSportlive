// دریافت لایوها با ترکیب RSS + API برای صرفه‌جویی در سهمیه
export async function checkYouTubeLiveRSS(channelId, apiKey) {
  try {
    // ۱. خواندن فید RSS (رایگان)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssRes = await fetch(rssUrl);
    if (!rssRes.ok) return null;
    
    const xmlText = await rssRes.text();
    
    // استخراج Video IDها با Regex
    const videoIdMatches = [...xmlText.matchAll(/<yt:videoId>(.*?)<\/yt:videoId>/g)];
    if (videoIdMatches.length === 0) return null;

    //گرفتن ۳ ویدیوی اخیر کانال
    const recentVideoIds = videoIdMatches.slice(0, 3).map(m => m[1]);

    // ۲. استعلام وضعیت زنده بودن از YouTube API (فقط ۱ واحد هزینه)
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${recentVideoIds.join(',')}&key=${apiKey}`;
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (!apiData.items) return null;

    for (const item of apiData.items) {
      const liveDetails = item.liveStreamingDetails;
      // اگر مسابقه همین الان در حال پخش زنده باشد
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
    console.error(`خطا در بررسی کانال ${channelId}:`, error);
  }
  return null;
}

// دریافت اطلاعات یک ویدیو با آیدی (برای لینک‌های دستی)
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
    console.error("خطا در دریافت اطلاعات ویدیو:", e);
  }
  return null;
}