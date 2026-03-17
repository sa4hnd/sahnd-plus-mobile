import { STREAM_API } from './streamApi';
import { ChannelCategory } from '@/types';

export async function fetchChannels(): Promise<ChannelCategory[]> {
  const res = await fetch(`${STREAM_API}/api/channels`);
  if (!res.ok) throw new Error('Failed to fetch channels');
  const data = await res.json();
  if (!data.success) throw new Error('Channel API error');
  return data.categories;
}
