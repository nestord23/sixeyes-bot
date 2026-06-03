import { youtube } from '@googleapis/youtube';
import { logger } from '../utils/logger';

export interface VideoResult {
  title: string;
  url: string;
  thumbnail: string;
  channel: string;
  duration: string;
}

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YT_API_KEY) {
  logger.error('Missing YOUTUBE_API_KEY environment variable');
  process.exit(1);
}

const yt = youtube({ version: 'v3', auth: YT_API_KEY });

function parseISODuration(iso: string): string {
  const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';

  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');

  const parts: string[] = [];
  if (hours) parts.push(hours.padStart(2, '0'));
  parts.push(minutes ? minutes.padStart(2, '0') : '00');
  parts.push(seconds ? seconds.padStart(2, '0') : '00');

  return parts.join(':');
}

export async function searchVideo(query: string): Promise<VideoResult | null> {
  try {
    const searchRes = await yt.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults: 1,
    });

    const item = searchRes.data.items?.[0];
    if (!item?.id?.videoId) return null;

    const videoId = item.id.videoId;

    const videoRes = await yt.videos.list({
      part: ['contentDetails', 'snippet'],
      id: [videoId],
    });

    const video = videoRes.data.items?.[0];
    if (!video) return null;

    return {
      title: video.snippet?.title ?? 'Unknown',
      url: `https://youtu.be/${videoId}`,
      thumbnail: video.snippet?.thumbnails?.high?.url ?? video.snippet?.thumbnails?.default?.url ?? '',
      channel: video.snippet?.channelTitle ?? 'Unknown',
      duration: parseISODuration(video.contentDetails?.duration ?? 'PT0S'),
    };
  } catch (error) {
    logger.error('YouTube searchVideo error:', error);
    return null;
  }
}

export async function searchMultiple(query: string, limit: number = 5): Promise<VideoResult[]> {
  try {
    const searchRes = await yt.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults: limit,
    });

    const items = searchRes.data.items ?? [];
    if (items.length === 0) return [];

    const videoIds = items.map((i) => i.id?.videoId).filter(Boolean) as string[];

    const videoRes = await yt.videos.list({
      part: ['contentDetails', 'snippet'],
      id: videoIds,
    });

    const videoMap = new Map(videoRes.data.items?.map((v) => [v.id, v]) ?? []);

    return items.map((item) => {
      const videoId = item.id?.videoId ?? '';
      const video = videoMap.get(videoId);
      return {
        title: item.snippet?.title ?? 'Unknown',
        url: `https://youtu.be/${videoId}`,
        thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
        channel: item.snippet?.channelTitle ?? 'Unknown',
        duration: parseISODuration(video?.contentDetails?.duration ?? 'PT0S'),
      };
    });
  } catch (error) {
    logger.error('YouTube searchMultiple error:', error);
    return [];
  }
}
