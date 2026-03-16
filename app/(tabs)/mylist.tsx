import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, Alert,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bookmark } from 'lucide-react-native';
import { getWatchlist, removeFromWatchlist } from '@/lib/storage';
import { img } from '@/lib/tmdb';
import { C, S, R, Layout, T } from '@/lib/design';
import { WatchlistItem } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
const COLS = 3;
const GAP = S.rowGap;
const CARD_W = (SCREEN_W - S.screen * 2 - GAP * (COLS - 1)) / COLS;

export default function MyNetflixTab() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getWatchlist().then((d) => {
        setItems(d.sort((a, b) => b.addedAt - a.addedAt));
        setLoading(false);
      });
    }, []),
  );

  const remove = (item: WatchlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove',
      `Remove "${item.title}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeFromWatchlist(item.id, item.type);
            setItems((prev) =>
              prev.filter((i) => !(i.id === item.id && i.type === item.type)),
            );
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Text style={st.headerTitle}>My Netflix</Text>
        <Text style={st.headerCount}>
          {items.length} title{items.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {items.length > 0 ? (
        <FlatList
          data={items}
          numColumns={COLS}
          keyExtractor={(i) => `${i.type}-${i.id}`}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/${item.type}/${item.id}` as any);
              }}
              onLongPress={() => remove(item)}
              style={({ pressed }) => [
                st.card,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Image
                source={{ uri: img(item.poster_path, 'w342')! }}
                style={st.poster}
                contentFit="cover"
                transition={200}
                recyclingKey={`wl-${item.id}`}
              />
            </Pressable>
          )}
          contentContainerStyle={st.listContent}
          columnWrapperStyle={{ gap: GAP }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={st.empty}>
          <Bookmark size={48} color={C.text3} strokeWidth={1.5} />
          <Text style={st.emptyTitle}>Your list is empty</Text>
          <Text style={st.emptyText}>
            Movies and series you save will appear here
          </Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: Layout.safeTop,
    paddingHorizontal: S.screen,
    paddingBottom: S.md,
  },
  headerTitle: { ...T.pageTitle, marginBottom: S.xs },
  headerCount: T.caption,
  listContent: {
    paddingHorizontal: S.screen,
    paddingBottom: Layout.tabBarH + S.md,
  },
  card: {
    width: CARD_W,
    marginBottom: GAP,
  },
  poster: {
    width: CARD_W,
    height: CARD_W * 1.5,
    borderRadius: R.sm,
    backgroundColor: C.surface,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Layout.tabBarH,
    gap: S.sm + 4,
  },
  emptyTitle: { ...T.sectionTitle, color: C.text2 },
  emptyText: { ...T.body, color: C.text3 },
});
