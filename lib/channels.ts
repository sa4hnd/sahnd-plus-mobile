import { STREAM_API } from './streamApi';
import { ChannelCategory } from '@/types';
import { isCellular } from './network';

const PROXY_URL = 'https://sahnd-stream-proxy.sahndplus.workers.dev';

export async function fetchChannels(): Promise<ChannelCategory[]> {
  const res = await fetch(`${STREAM_API}/api/channels`);
  if (!res.ok) throw new Error('Failed to fetch channels');
  const data = await res.json();
  if (!data.success) throw new Error('Channel API error');
  return data.categories;
}

/**
 * Returns the stream URL — proxied through Cloudflare Worker on cellular,
 * direct on WiFi.
 */
export async function getStreamUrl(rawUrl: string): Promise<string> {
  const cellular = await isCellular();
  if (cellular) {
    return `${PROXY_URL}/stream?url=${encodeURIComponent(rawUrl)}`;
  }
  return rawUrl;
}
