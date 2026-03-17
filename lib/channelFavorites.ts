import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = 'sahnd_fav_channels';

export async function getFavoriteChannels(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(FAV_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function toggleFavoriteChannel(channelId: string): Promise<boolean> {
  const favs = await getFavoriteChannels();
  const idx = favs.indexOf(channelId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(channelId);
  }
  await AsyncStorage.setItem(FAV_KEY, JSON.stringify(favs));
  return idx < 0; // returns true if now favorited
}

export async function isFavoriteChannel(channelId: string): Promise<boolean> {
  const favs = await getFavoriteChannels();
  return favs.includes(channelId);
}
