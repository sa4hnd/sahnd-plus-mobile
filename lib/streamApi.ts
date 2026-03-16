// Stream API URL - update this when tunnel changes
export const STREAM_API = 'https://factors-payments-docs-stands.trycloudflare.com';

export async function fetchStream(type: 'movie' | 'tv', tmdbId: number, season?: number, episode?: number) {
  const url = type === 'tv' && season && episode
    ? `${STREAM_API}/api/streams/tv/${tmdbId}?season=${season}&episode=${episode}`
    : `${STREAM_API}/api/streams/movie/${tmdbId}`;

  console.log('[StreamAPI] Fetching:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stream API ${res.status}`);
  const data = await res.json();

  if (!data.success || !data.streams?.length) {
    throw new Error('No streams found');
  }

  // Find Vixsrc stream first (it returns real m3u8), then fallback to others
  const vixsrc = data.streams.find((s: any) => s.provider === 'Vixsrc' || s.url?.includes('playlist'));
  if (vixsrc) {
    console.log('[StreamAPI] Found Vixsrc m3u8:', vixsrc.url.slice(0, 60));
    return {
      m3u8: vixsrc.url,
      subtitles: vixsrc.subtitles || data.subtitles || [],
      provider: vixsrc.provider || 'Vixsrc',
      headers: vixsrc.headers || { Referer: 'https://vixsrc.to/' },
    };
  }

  // Return first stream
  const first = data.streams[0];
  return {
    m3u8: first.url,
    subtitles: first.subtitles || [],
    provider: first.provider || 'Unknown',
    headers: first.headers || {},
  };
}
