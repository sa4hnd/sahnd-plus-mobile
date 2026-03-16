import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { getWatchlist, removeFromWatchlist } from '@/lib/storage';
import { img } from '@/lib/tmdb';
import { C, S, R, Layout, T } from '@/lib/design';
import { WatchlistItem } from '@/types';

const { width: SW } = Dimensions.get('window');
const COLS = 3;
const GAP = S.rowGap;
const CARD_W = (SW - S.screen * 2 - GAP * (COLS - 1)) / COLS;

export default function WatchlistScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useFocusEffect(useCallback(() => {
    getWatchlist().then(d => setItems(d.sort((a, b) => b.addedAt - a.addedAt)));
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

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={st.header}>
        <Text style={st.title}>My List</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <X size={24} color={C.text} strokeWidth={2} />
        </Pressable>
      </View>

      {items.length > 0 ? (
        <FlatList
          data={items}
          numColumns={COLS}
          keyExtractor={i => `${i.type}-${i.id}`}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push(`/${item.type}/${item.id}` as any); }}
              onLongPress={() => remove(item)}
              style={({ pressed }) => [st.card, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            >
              <Image source={{ uri: img(item.poster_path, 'w342')! }} style={st.poster} contentFit="cover" transition={200} />
            </Pressable>
          )}
          contentContainerStyle={st.list}
          columnWrapperStyle={{ gap: GAP }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={st.empty}>
          <Text style={{ color: C.text2, fontSize: 16 }}>Your list is empty</Text>
          <Text style={{ color: C.text3, fontSize: 13, marginTop: 4 }}>Long press items to remove</Text>
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
  list: { paddingHorizontal: S.screen, paddingBottom: 40 },
  card: { width: CARD_W, marginBottom: GAP },
  poster: { width: CARD_W, height: CARD_W * 1.5, borderRadius: R.sm, backgroundColor: C.surface },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
