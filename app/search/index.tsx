import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { searchMulti, img } from '@/lib/tmdb';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Movie } from '@/types';

const { width: W } = Dimensions.get('window');
const COLS = 3;
const GAP = 10;
const CARD_W = (W - Spacing.md * 2 - GAP * (COLS - 1)) / COLS;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await searchMulti(q);
      setResults((data.results || []).filter((r: Movie) => r.media_type !== 'person' && r.poster_path));
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const renderItem = ({ item }: { item: Movie }) => {
    const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';
    return (
      <Pressable
        onPress={() => { Haptics.selectionAsync(); router.push(`/${type}/${item.id}` as any); }}
        style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
      >
        <Image source={{ uri: img(item.poster_path, 'w342')! }} style={s.poster} contentFit="cover" />
        <Text style={s.cardTitle} numberOfLines={1}>{item.title || item.name}</Text>
        <View style={s.cardMeta}>
          <Text style={s.cardType}>{type.toUpperCase()}</Text>
          {item.vote_average > 0 && <Text style={s.cardRating}>★ {item.vote_average.toFixed(1)}</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <View style={s.searchRow}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
          </Pressable>
          <TextInput
            style={s.input}
            placeholder="Search movies, series..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={search}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {results.length > 0 ? (
        <FlatList
          data={results}
          numColumns={COLS}
          keyExtractor={i => `${i.id}`}
          renderItem={renderItem}
          contentContainerStyle={s.grid}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        />
      ) : (
        <View style={s.empty}>
          {query ? (
            loading ? <Text style={s.emptyText}>Searching...</Text>
                    : <Text style={s.emptyText}>No results for "{query}"</Text>
          ) : (
            <>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={s.emptyTitle}>Find your next watch</Text>
              <Text style={s.emptyText}>Search for movies, series and more</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 60, paddingHorizontal: Spacing.md, paddingBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16,
    color: '#fff', fontSize: 16,
  },
  grid: { padding: Spacing.md },
  card: { width: CARD_W },
  poster: { width: CARD_W, height: CARD_W * 1.5, borderRadius: Radius.lg, marginBottom: 6 },
  cardTitle: { color: Colors.textSecondary, fontSize: 11, marginBottom: 2 },
  cardMeta: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  cardType: { color: Colors.textMuted, fontSize: 9, fontWeight: '700' },
  cardRating: { color: Colors.yellow, fontSize: 9, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 18, fontWeight: '600', marginBottom: 4 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
