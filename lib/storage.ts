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

export async function addToHistory(item: Omit<WatchHistoryItem, 'timestamp' | 'completed' | 'progress'>) {
  const history = await getHistory();
  const filtered = history.filter(
    h => !(h.id === item.id && h.type === item.type && h.season === item.season && h.episode === item.episode),
  );
  filtered.unshift({ ...item, timestamp: Date.now(), progress: 0, completed: false });
  await AsyncStorage.setItem(HIS_KEY, JSON.stringify(filtered.slice(0, 100)));
}

export async function updateProgress(
  id: number,
  type: 'movie' | 'tv',
  progress: number,
  season?: number,
  episode?: number,
) {
  const history = await getHistory();
  const item = history.find(
    h => h.id === id && h.type === type && h.season === season && h.episode === episode,
  );
  if (item) {
    item.progress = Math.min(100, Math.max(0, progress));
    item.completed = item.progress >= 100;
    item.timestamp = Date.now();
    await AsyncStorage.setItem(HIS_KEY, JSON.stringify(history));
  }
}

export async function markWatched(id: number, type: 'movie' | 'tv', season?: number, episode?: number) {
  const history = await getHistory();
  const item = history.find(
    h => h.id === id && h.type === type && h.season === season && h.episode === episode,
  );
  if (item) {
    item.completed = true;
    item.progress = 100;
    item.timestamp = Date.now();
    await AsyncStorage.setItem(HIS_KEY, JSON.stringify(history));
  }
}

export async function isWatched(
  id: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number,
): Promise<boolean> {
  const history = await getHistory();
  const item = history.find(
    h => h.id === id && h.type === type && h.season === season && h.episode === episode,
  );
  return item?.completed ?? false;
}

export async function getProgress(
  id: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number,
): Promise<number> {
  const history = await getHistory();
  const item = history.find(
    h => h.id === id && h.type === type && h.season === season && h.episode === episode,
  );
  return item?.progress ?? 0;
}

export async function getLastWatched(): Promise<WatchHistoryItem | null> {
  const history = await getHistory();
  if (!history.length) return null;
  return history.reduce((latest, h) => (h.timestamp > latest.timestamp ? h : latest), history[0]);
}

export async function getContinueWatching(): Promise<WatchHistoryItem[]> {
  const history = await getHistory();
  return history
    .filter(h => h.progress > 0 && !h.completed)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);
}

export async function getSmartResumeInfo(
  tvId: number,
): Promise<{ label: string; season: number; episode: number; isRewatch: boolean }> {
  const history = await getHistory();
  const episodes = history
    .filter(h => h.id === tvId && h.type === 'tv' && h.season != null && h.episode != null)
    .sort((a, b) => {
      if (a.season! !== b.season!) return a.season! - b.season!;
      return a.episode! - b.episode!;
    });

  if (!episodes.length) {
    return { label: 'Start S1 E1', season: 1, episode: 1, isRewatch: false };
  }

  // Find the last watched episode by timestamp
  const lastWatched = episodes.reduce((latest, ep) =>
    ep.timestamp > latest.timestamp ? ep : latest, episodes[0],
  );

  // If the last watched episode is not completed, resume it
  if (!lastWatched.completed) {
    return {
      label: `Resume S${lastWatched.season} E${lastWatched.episode}`,
      season: lastWatched.season!,
      episode: lastWatched.episode!,
      isRewatch: false,
    };
  }

  // Last watched is completed — find the next unwatched episode
  const lastIdx = episodes.findIndex(
    ep => ep.season === lastWatched.season && ep.episode === lastWatched.episode,
  );

  // Look for the next episode in sorted order that is not completed
  for (let i = lastIdx + 1; i < episodes.length; i++) {
    if (!episodes[i].completed) {
      return {
        label: `Resume S${episodes[i].season} E${episodes[i].episode}`,
        season: episodes[i].season!,
        episode: episodes[i].episode!,
        isRewatch: false,
      };
    }
  }

  // Find any unwatched episode in the entire list
  const unwatched = episodes.find(ep => !ep.completed);
  if (unwatched) {
    return {
      label: `Resume S${unwatched.season} E${unwatched.episode}`,
      season: unwatched.season!,
      episode: unwatched.episode!,
      isRewatch: false,
    };
  }

  // All episodes are completed — suggest rewatch
  return { label: 'Rewatch S1 E1', season: 1, episode: 1, isRewatch: true };
}

export async function getWatchedEpisodesCount(
  tvId: number,
  season: number,
): Promise<{ watched: number; total: number }> {
  const history = await getHistory();
  const episodes = history.filter(
    h => h.id === tvId && h.type === 'tv' && h.season === season,
  );
  const watched = episodes.filter(ep => ep.completed).length;
  return { watched, total: episodes.length };
}
