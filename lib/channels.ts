import { STREAM_API } from './streamApi';
import { ChannelCategory } from '@/types';

const MYTV_API = 'https://androidapi.appmytv.com/android/v2/channels/getChannelsDetail_local.php';
const MYTV_BODY = JSON.stringify({
  appVersion: '3.15.1',
  deviceType: 'android',
  uuid: '58182e46-8a20-443e-9e43-9b63bc44589c',
  userId: '6414575',
  country: 'IQ',
});

export async function fetchChannels(): Promise<ChannelCategory[]> {
  try {
    // Device fetches encrypted data from MyTV+ directly (tokens bound to user's IP)
    const mytvRes = await fetch(MYTV_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'And$MyTV' },
      body: MYTV_BODY,
    });

    if (mytvRes.ok) {
      const encrypted = await mytvRes.text();
      if (encrypted && encrypted.length > 1000) {
        // Send to our server to decrypt (server has AES keys, device doesn't need crypto lib)
        const decryptRes = await fetch(`${STREAM_API}/api/channels/decrypt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: encrypted.trim() }),
        });

        if (decryptRes.ok) {
          const result = await decryptRes.json();
          if (result.success && result.categories) {
            console.log(`[Channels] Fresh: ${result.count} channels from MyTV+`);
            return result.categories;
          }
        }
      }
    }
  } catch (e: any) {
    console.log('[Channels] MyTV+ direct failed:', e.message);
  }

  // Fallback: cached channels from our API
  console.log('[Channels] Using cached channels');
  const res = await fetch(`${STREAM_API}/api/channels`);
  if (!res.ok) throw new Error('Failed to fetch channels');
  const data = await res.json();
  if (!data.success) throw new Error('Channel API error');
  return data.categories;
}
