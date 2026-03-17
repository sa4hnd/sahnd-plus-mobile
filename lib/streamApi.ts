import { Platform } from 'react-native';

// Stream API URL - update this when tunnel changes
export const STREAM_API = 'https://sahnd-api-16018004132.europe-west1.run.app';

export async function fetchStream(type: 'movie' | 'tv', tmdbId: number, season?: number, episode?: number) {
  const apiType = type === 'tv' ? 'series' : 'movie';
  const qs = type === 'tv' && season && episode ? `?season=${season}&episode=${episode}` : '';
  const isAndroid = Platform.OS === 'android';

  // Try Vixsrc directly first (fastest, returns real m3u8)
  try {
    const vixUrl = `${STREAM_API}/api/streams/vixsrc/${apiType}/${tmdbId}${qs}`;
    console.log('[StreamAPI] Trying Vixsrc:', vixUrl);
    const vixRes = await fetch(vixUrl);
    if (vixRes.ok) {
      const vixData = await vixRes.json();
      if (vixData.success && vixData.streams?.length) {
        const stream = vixData.streams[0];
        const referer = stream.headers?.Referer || 'https://vixsrc.to/';
        console.log('[StreamAPI] ✓ Vixsrc m3u8:', stream.url.slice(0, 80));

        // Android ExoPlayer doesn't send custom headers on HLS — proxy server-side
        if (isAndroid) {
          return {
            m3u8: `${STREAM_API}/proxy/stream.m3u8?url=${encodeURIComponent(stream.url)}&referer=${encodeURIComponent(referer)}`,
            subtitles: stream.subtitles || [],
            provider: 'Vixsrc',
            headers: {},
          };
        }

        return {
          m3u8: stream.url,
          subtitles: stream.subtitles || [],
          provider: 'Vixsrc',
          headers: { Referer: referer },
        };
      }
    }
  } catch (e: any) {
    console.log('[StreamAPI] Vixsrc failed:', e.message);
  }

  // Fallback: try aggregate endpoint
  try {
    const url = `${STREAM_API}/api/streams/${apiType}/${tmdbId}${qs}`;
    console.log('[StreamAPI] Trying aggregate:', url);
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.streams?.length) {
        const playable = data.streams.find((s: any) => typeof s.url === 'string' && (s.url.includes('playlist') || s.url.includes('.m3u8')));
        if (playable) {
          const referer = playable.headers?.Referer || '';
          console.log('[StreamAPI] ✓ Found playable stream:', playable.url.slice(0, 80));

          if (isAndroid && referer) {
            return {
              m3u8: `${STREAM_API}/proxy/stream.m3u8?url=${encodeURIComponent(playable.url)}&referer=${encodeURIComponent(referer)}`,
              subtitles: playable.subtitles || [],
              provider: playable.provider || 'Unknown',
              headers: {},
            };
          }

          return {
            m3u8: playable.url,
            subtitles: playable.subtitles || [],
            provider: playable.provider || 'Unknown',
            headers: playable.headers || {},
          };
        }
      }
    }
  } catch (e: any) {
    console.log('[StreamAPI] Aggregate failed:', e.message);
  }

  throw new Error('No playable streams found');
}
