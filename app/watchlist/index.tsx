import { useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, Alert, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { getWatchlist, removeFromWatchlist } from '@/lib/storage';
import { getFavoriteChannels, toggleFavoriteChannel } from '@/lib/channelFavorites';
import { fetchChannels } from '@/lib/channels';
import { img } from '@/lib/tmdb';
import { C, S, R, Layout, T } from '@/lib/design';
import { WatchlistItem, Channel } from '@/types';

const { width: SW } = Dimensions.get('window');
const COLS = 3;
const GAP = S.rowGap;
const CARD_W = (SW - S.screen * 2 - GAP * (COLS - 1)) / COLS;

export default function WatchlistScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [favChannels, setFavChannels] = useState<Channel[]>([]);

  useFocusEffect(useCallback(() => {
    getWatchlist().then(d => setItems(d.sort((a, b) => b.addedAt - a.addedAt)));

    // Load favorite channels
    Promise.all([getFavoriteChannels(), fetchChannels()]).then(([favIds, cats]) => {
      const all = cats.flatMap(c => c.channels);
      setFavChannels(all.filter(ch => favIds.includes(ch.id)));
    }).catch(() => {});
  }, []));

  const remove = (item: WatchlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await removeFromWatchlist(item.id, item.type);
        setItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)));
      }},
    ]);
  };

  const removeFavChannel = (ch: Channel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove', `Remove "${ch.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await toggleFavoriteChannel(ch.id);
        setFavChannels(prev => prev.filter(c => c.id !== ch.id));
      }},
    ]);
  };

  const hasContent = items.length > 0 || favChannels.length > 0;

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={st.header}>
        <Text style={st.title}>My List</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <X size={24} color={C.text} strokeWidth={2} />
        </Pressable>
      </View>

      {hasContent ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Favorite Channels */}
          {favChannels.length > 0 && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>Favorite Channels</Text>
              <FlatList
                data={favChannels}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={ch => ch.id}
                contentContainerStyle={{ paddingHorizontal: S.screen, gap: 12 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); router.dismiss(); router.push(`/channel/${item.id}` as any); }}
                    onLongPress={() => removeFavChannel(item)}
                    style={({ pressed }) => [st.chCard, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
                  >
                    <View style={st.chLogoBox}>
                      {item.logo ? (
                        <Image source={{ uri: item.logo }} style={st.chLogo} contentFit="contain" />
                      ) : (
                        <Text style={st.chInitials}>{item.name.slice(0, 2)}</Text>
                      )}
                    </View>
                    <Text style={st.chName} numberOfLines={1}>{item.name}</Text>
                  </Pressable>
                )}
              />
            </View>
          )}

          {/* Movies & Shows */}
          {items.length > 0 && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>Movies & Shows</Text>
              <View style={st.mediaGrid}>
                {items.map(item => (
                  <Pressable
                    key={`${item.type}-${item.id}`}
                    onPress={() => { Haptics.selectionAsync(); router.push(`/${item.type}/${item.id}` as any); }}
                    onLongPress={() => remove(item)}
                    style={({ pressed }) => [st.card, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                  >
                    <Image source={{ uri: img(item.poster_path, 'w342')! }} style={st.poster} contentFit="cover" transition={200} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={st.empty}>
          <Text style={{ color: C.text2, fontSize: 16 }}>Your list is empty</Text>
          <Text style={{ color: C.text3, fontSize: 13, marginTop: 4 }}>Add channels and movies to your list</Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Layout.safeTop, paddingHorizontal: S.screen, paddingBottom: S.md,
  },
  title: T.pageTitle,
  section: { marginBottom: S.lg },
  sectionTitle: { ...T.sectionTitle, paddingHorizontal: S.screen, marginBottom: S.sm },

  // Channel favorites
  chCard: { alignItems: 'center', width: 64 },
  chLogoBox: { width: 64, height: 64, borderRadius: 14, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  chLogo: { width: 38, height: 38 },
  chInitials: { fontSize: 16, fontWeight: '700', color: C.text3 },
  chName: { fontSize: 10, fontWeight: '500', color: C.text2, marginTop: 5, textAlign: 'center', width: 64 },

  // Movies grid
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: S.screen },
  card: { width: CARD_W, marginBottom: GAP },
  poster: { width: CARD_W, height: CARD_W * 1.5, borderRadius: R.sm, backgroundColor: C.surface },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
