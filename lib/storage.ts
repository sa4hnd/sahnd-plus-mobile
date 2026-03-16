import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchlistItem, WatchHistoryItem } from '@/types';

const WL_KEY = 'sahnd-watchlist';
const HIS_KEY = 'sahnd-history';

// ── Watchlist ──
export async function getWatchlist(): Promise<WatchlistItem[]> {
  const d = await AsyncStorage.getItem(WL_KEY);
  return d ? JSON.parse(d) : [];
}

export async function addToWatchlist(item: WatchlistItem) {
  const list = await getWatchlist();
  if (!list.find(i => i.id === item.id && i.type === item.type)) {
    list.unshift({ ...item, addedAt: Date.now() });
    await AsyncStorage.setItem(WL_KEY, JSON.stringify(list));
  }
}

export async function removeFromWatchlist(id: number, type: 'movie' | 'tv') {
  const list = (await getWatchlist()).filter(i => !(i.id === id && i.type === type));
  await AsyncStorage.setItem(WL_KEY, JSON.stringify(list));
}

export async function isInWatchlist(id: number, type: 'movie' | 'tv'): Promise<boolean> {
  return (await getWatchlist()).some(i => i.id === id && i.type === type);
}

// ── Watch History ──
export async function getHistory(): Promise<WatchHistoryItem[]> {
  const d = await AsyncStorage.getItem(HIS_KEY);
  return d ? JSON.parse(d) : [];
}

export async function addToHistory(item: Omit<WatchHistoryItem, 'timestamp' | 'completed'>) {
  const history = await getHistory();
  const filtered = history.filter(h => !(h.id === item.id && h.type === item.type && h.season === item.season && h.episode === item.episode));
  filtered.unshift({ ...item, timestamp: Date.now(), completed: false });
  await AsyncStorage.setItem(HIS_KEY, JSON.stringify(filtered.slice(0, 50)));
}

export async function markWatched(id: number, type: 'movie' | 'tv', season?: number, episode?: number) {
  const history = await getHistory();
  const item = history.find(h => h.id === id && h.type === type && h.season === season && h.episode === episode);
  if (item) {
    item.completed = true;
    item.timestamp = Date.now();
    await AsyncStorage.setItem(HIS_KEY, JSON.stringify(history));
  }
}

export async function getLastWatched(): Promise<WatchHistoryItem | null> {
  const h = await getHistory();
  return h.length ? h.sort((a, b) => b.timestamp - a.timestamp)[0] : null;
}

export async function getContinueWatching(): Promise<WatchHistoryItem[]> {
  return (await getHistory()).filter(h => !h.completed).sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
}
