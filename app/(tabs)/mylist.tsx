import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getWatchlist, removeFromWatchlist } from '@/lib/storage';
import { img } from '@/lib/tmdb';
import { Colors, Radius } from '@/lib/theme';
import { WatchlistItem } from '@/types';

const { width: W } = Dimensions.get('window');
const COLS = 2;
const GAP = 12;
const CARD_W = (W - 32 - GAP) / COLS;

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
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Stack.Screen options={{ headerShown: true, title: 'My List', headerStyle: { backgroundColor: Colors.bg }, headerTintColor: '#fff', headerLargeTitle: true }} />
      {items.length > 0 ? (
        <FlatList
          data={items}
          numColumns={COLS}
          keyExtractor={i => `${i.type}-${i.id}`}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push(`/${item.type}/${item.id}` as any); }}
              onLongPress={() => remove(item)}
              style={{ width: CARD_W, marginBottom: GAP }}
            >
              <Image source={{ uri: img(item.poster_path, 'w342')! }} style={{ width: CARD_W, height: CARD_W * 1.5, borderRadius: Radius.lg }} contentFit="cover" />
              <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 6 }} numberOfLines={1}>{item.title}</Text>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{item.type}</Text>
                <Text style={{ color: Colors.yellow, fontSize: 10 }}>★ {item.vote_average.toFixed(1)}</Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ gap: GAP }}
        />
      ) : (
        <View style={st.empty}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📑</Text>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 }}>Your list is empty</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Movies and series you save will appear here</Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
});
