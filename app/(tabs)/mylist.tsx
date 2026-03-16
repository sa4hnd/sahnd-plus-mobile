import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getWatchlist, removeFromWatchlist } from '@/lib/storage';
import { img } from '@/lib/tmdb';
import { Colors, Radius } from '@/lib/theme';
import { WatchlistItem } from '@/types';

const { width: W } = Dimensions.get('window');
const COLS = 2;
const GAP = 12;
const PAD = 20;
const CARD_W = (W - PAD * 2 - GAP) / COLS;

export default function MyListTab() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    getWatchlist().then(d => { setItems(d.sort((a, b) => b.addedAt - a.addedAt)); setLoading(false); });
  }, []));

  const remove = (item: WatchlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove', `Remove "${item.title}" from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await removeFromWatchlist(item.id, item.type); setItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type))); } },
    ]);
  };

  if (loading) return <View style={st.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <View style={st.container}>
      {/* Custom header instead of Stack.Screen header */}
      <View style={st.header}>
        <Text style={st.headerTitle}>My List</Text>
        <Text style={st.headerCount}>{items.length} title{items.length !== 1 ? 's' : ''}</Text>
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
              <Image source={{ uri: img(item.poster_path, 'w342')! }} style={st.poster} contentFit="cover" />
              <Text style={st.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={st.cardMeta}>
                <Text style={st.cardType}>{item.type.toUpperCase()}</Text>
                <Text style={st.cardRating}>★ {item.vote_average.toFixed(1)}</Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={st.listContent}
          columnWrapperStyle={{ gap: GAP }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={st.empty}>
          <Text style={st.emptyIcon}>📑</Text>
          <Text style={st.emptyTitle}>Your list is empty</Text>
          <Text style={st.emptyText}>Movies and series you save will appear here</Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 64, paddingHorizontal: PAD, paddingBottom: 16 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerCount: { fontSize: 14, color: Colors.textMuted },
  listContent: { paddingHorizontal: PAD, paddingBottom: 100 },
  card: { width: CARD_W, marginBottom: GAP + 4 },
  poster: { width: CARD_W, height: CARD_W * 1.5, borderRadius: Radius.lg },
  cardTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginTop: 8 },
  cardMeta: { flexDirection: 'row', gap: 6, marginTop: 3 },
  cardType: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardRating: { color: Colors.yellow, fontSize: 10, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
