import { STREAM_API } from './streamApi';
import { ChannelCategory } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MYTV_API = 'https://androidapi.appmytv.com/android/v2/channels/getChannelsDetail_local.php';
const MYTV_BODY = JSON.stringify({
  appVersion: '3.15.1',
  deviceType: 'android',
  uuid: '58182e46-8a20-443e-9e43-9b63bc44589c',
  userId: '6414575',
  country: 'IQ',
});
const CACHE_KEY = 'channels_cache';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface CachedChannels {
  categories: ChannelCategory[];
  timestamp: number;
}

async function getCached(): Promise<ChannelCategory[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedChannels = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.categories;
    }
  } catch {}
  return null;
}

async function setCache(categories: ChannelCategory[]) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ categories, timestamp: Date.now() }));
  } catch {}
}

async function fetchFreshChannels(): Promise<ChannelCategory[]> {
  // Device fetches encrypted data from MyTV+ directly (tokens bound to user's IP)
  const mytvRes = await fetch(MYTV_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'And$MyTV' },
    body: MYTV_BODY,
  });

  if (!mytvRes.ok) throw new Error('MyTV+ API error');
  const encrypted = await mytvRes.text();
  if (!encrypted || encrypted.length < 1000) throw new Error('Empty response');

  // Send to our server to decrypt
  const decryptRes = await fetch(`${STREAM_API}/api/channels/decrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: encrypted.trim() }),
  });

  if (!decryptRes.ok) throw new Error('Decrypt failed');
  const result = await decryptRes.json();
  if (!result.success || !result.categories) throw new Error('Invalid decrypt response');

  console.log(`[Channels] Fresh: ${result.count} channels`);
  return result.categories;
}

export async function fetchChannels(): Promise<ChannelCategory[]> {
  // Return cache immediately if fresh
  const cached = await getCached();
  if (cached) {
    console.log('[Channels] Using cache');
    // Refresh in background for next time
    fetchFreshChannels().then(setCache).catch(() => {});
    return cached;
  }

  // No cache — fetch fresh (blocks, but only first time or after 6h)
  try {
    const categories = await fetchFreshChannels();
    await setCache(categories);
    return categories;
  } catch (e: any) {
    console.log('[Channels] Fresh fetch failed:', e.message);
    // Last resort: server's cached channels
    const res = await fetch(`${STREAM_API}/api/channels`);
    if (!res.ok) throw new Error('All channel sources failed');
    const data = await res.json();
    return data.categories;
  }
}
