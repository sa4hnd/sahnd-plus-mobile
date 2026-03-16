import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { searchMulti, img, movieGenres, tvGenres } from '@/lib/tmdb';
import { C, S, R, Layout, T } from '@/lib/design';
import { Movie, Genre } from '@/types';

const { width: SW } = Dimensions.get('window');
const COLS = 3;
const GAP = S.rowGap;
const CARD_W = (SW - S.screen * 2 - GAP * (COLS - 1)) / COLS;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useState(() => {
    Promise.all([movieGenres(), tvGenres()]).then(([mg, tg]) => {
      const all = [...mg.genres, ...tg.genres].filter(
        (g: Genre, i: number, arr: Genre[]) => arr.findIndex((x: Genre) => x.id === g.id) === i,
      );
      setGenres(all);
    });
  });

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

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={st.header}>
        <View style={st.headerTop}>
          <Text style={st.title}>Search</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={st.closeBtn}>{'\u2715'}</Text>
          </Pressable>
        </View>
        <View style={st.searchBar}>
          <Text style={st.searchIcon}>{'\u2315'}</Text>
          <TextInput
            ref={inputRef}
            style={st.input}
            placeholder="Movies, shows, genres..."
            placeholderTextColor={C.text3}
            value={query}
            onChangeText={search}
            clearButtonMode="while-editing"
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Results */}
      {results.length > 0 ? (
        <FlatList
          data={results}
          numColumns={COLS}
          keyExtractor={i => `${i.id}`}
          renderItem={({ item }) => {
            const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';
            return (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push(`/${type}/${item.id}` as any); }}
                style={({ pressed }) => [st.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <Image source={{ uri: img(item.poster_path, 'w342')! }} style={st.poster} contentFit="cover" transition={200} />
              </Pressable>
            );
          }}
          contentContainerStyle={st.list}
          columnWrapperStyle={{ gap: GAP }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={<Text style={st.resultCount}>{results.length} results</Text>}
        />
      ) : loading ? (
        <View style={st.empty}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : query ? (
        <View style={st.empty}>
          <Text style={st.emptyText}>No results for "{query}"</Text>
        </View>
      ) : (
        <View style={st.genreWrap}>
          <Text style={st.genreTitle}>Browse by Genre</Text>
          <View style={st.genres}>
            {genres.slice(0, 20).map(g => (
              <Pressable
                key={g.id}
                onPress={() => { Haptics.selectionAsync(); router.push(`/genre/${g.id}` as any); }}
                style={({ pressed }) => [st.genrePill, pressed && { opacity: 0.7 }]}
              >
                <Text style={st.genrePillText}>{g.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: Layout.safeTop, paddingHorizontal: S.screen, paddingBottom: S.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md },
  title: T.pageTitle,
  closeBtn: { color: C.text, fontSize: 20, fontWeight: '300' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.md, height: 40, paddingHorizontal: 12, gap: 8 },
  searchIcon: { color: C.text3, fontSize: 18 },
  input: { flex: 1, height: 40, color: C.text, fontSize: 16 },
  list: { paddingHorizontal: S.screen, paddingBottom: 40 },
  resultCount: { ...T.caption, marginBottom: S.sm },
  card: { width: CARD_W, marginBottom: GAP },
  poster: { width: CARD_W, height: CARD_W * 1.5, borderRadius: R.sm, backgroundColor: C.surface },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: C.text3, fontSize: 15 },
  genreWrap: { paddingHorizontal: S.screen, paddingTop: S.sm },
  genreTitle: { ...T.sectionTitle, marginBottom: S.md },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  genrePill: { backgroundColor: C.surface, paddingHorizontal: S.md, paddingVertical: 10, borderRadius: R.pill },
  genrePillText: { color: C.text2, fontSize: 13, fontWeight: '600' },
});
