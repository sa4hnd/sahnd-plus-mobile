import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { searchMulti, img, movieGenres, tvGenres } from '@/lib/tmdb';
import { Colors, Radius } from '@/lib/theme';
import { Movie, Genre } from '@/types';
import { useEffect } from 'react';

const { width: W } = Dimensions.get('window');
const COLS = 3;
const GAP = 8;
const CARD_W = (W - 32 - GAP * (COLS - 1)) / COLS;

export default function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = { current: null as any };

  useEffect(() => {
    Promise.all([movieGenres(), tvGenres()]).then(([mg, tg]) => {
      const all = [...mg.genres, ...tg.genres].filter((g: Genre, i: number, arr: Genre[]) => arr.findIndex((x: Genre) => x.id === g.id) === i);
      setGenres(all);
    });
  }, []);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMulti(q);
        setResults((data.results || []).filter((r: Movie) => r.media_type !== 'person' && r.poster_path));
      } catch { setResults([]); }
      setLoading(false);
    }, 350);
  }, []);

  const renderCard = ({ item }: { item: Movie }) => {
    const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';
    return (
      <Pressable onPress={() => { Haptics.selectionAsync(); router.push(`/${type}/${item.id}` as any); }} style={{ width: CARD_W, marginBottom: GAP }}>
        <Image source={{ uri: img(item.poster_path, 'w342')! }} style={{ width: CARD_W, height: CARD_W * 1.5, borderRadius: Radius.lg }} contentFit="cover" />
        <Text style={s.cardTitle} numberOfLines={1}>{item.title || item.name}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{type}</Text>
          {item.vote_average > 0 && <Text style={{ color: Colors.yellow, fontSize: 9 }}>★ {item.vote_average.toFixed(1)}</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      {/* Search Input */}
      <View style={s.header}>
        <Text style={s.title}>Search</Text>
        <View style={s.inputWrap}>
          <Text style={s.inputIcon}>⌕</Text>
          <TextInput
            style={s.input}
            placeholder="Movies, series, people..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={search}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {results.length > 0 ? (
        <FlatList
          data={results}
          numColumns={COLS}
          keyExtractor={i => `${i.id}`}
          renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          columnWrapperStyle={{ gap: GAP }}
          ListHeaderComponent={<Text style={s.resultCount}>{results.length} results for "{query}"</Text>}
        />
      ) : query && !loading ? (
        <View style={s.empty}><Text style={s.emptyText}>No results for "{query}"</Text></View>
      ) : !query ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={s.genreTitle}>Browse by Genre</Text>
          <View style={s.genreWrap}>
            {genres.slice(0, 20).map(g => (
              <Pressable key={g.id} onPress={() => { Haptics.selectionAsync(); router.push(`/genre/${g.id}` as any); }} style={s.genrePill}>
                <Text style={s.genrePillText}>{g.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : loading ? (
        <View style={s.empty}><Text style={s.emptyText}>Searching...</Text></View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text, marginBottom: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 12 },
  inputIcon: { fontSize: 14, color: Colors.textMuted, marginRight: 8 },
  input: { flex: 1, height: 46, color: '#fff', fontSize: 16 },
  resultCount: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },
  cardTitle: { color: Colors.textSecondary, fontSize: 11, marginTop: 4, marginBottom: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  genreTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12, marginTop: 8 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genrePill: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  genrePillText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
});
