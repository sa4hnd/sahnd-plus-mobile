import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Search } from 'lucide-react-native';
import { searchMulti, img, movieGenres, tvGenres } from '@/lib/tmdb';
import { C, S, R, Layout, T } from '@/lib/design';
import { Movie, Genre } from '@/types';

const COLS = 3;
const GAP = S.sm;
const CARD_W = (Layout.screenW - S.screen * 2 - GAP * (COLS - 1)) / COLS;

export default function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([movieGenres(), tvGenres()]).then(([mg, tg]) => {
      const all = [...mg.genres, ...tg.genres].filter(
        (g: Genre, i: number, arr: Genre[]) =>
          arr.findIndex((x: Genre) => x.id === g.id) === i,
      );
      setGenres(all);
    });
  }, []);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMulti(q);
        setResults(
          (data.results || []).filter(
            (r: Movie) => r.media_type !== 'person' && r.poster_path,
          ),
        );
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 350);
  }, []);

  const renderCard = ({ item }: { item: Movie }) => {
    const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push(`/${type}/${item.id}` as any);
        }}
        style={({ pressed }) => [
          st.card,
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Image
          source={{ uri: img(item.poster_path, 'w342')! }}
          style={st.cardPoster}
          contentFit="cover"
          transition={200}
          recyclingKey={`s-${item.id}`}
        />
        <Text style={st.cardTitle} numberOfLines={1}>
          {item.title || item.name}
        </Text>
        <View style={st.cardMeta}>
          <Text style={st.cardType}>{type.toUpperCase()}</Text>
          {item.vote_average > 0 && (
            <Text style={st.cardRating}>
              {'\u2605'} {item.vote_average.toFixed(1)}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.title}>Search</Text>
        <View style={st.inputWrap}>
          <Search size={18} color={C.text3} strokeWidth={2} />
          <TextInput
            style={st.input}
            placeholder="Movies, series, people..."
            placeholderTextColor={C.text3}
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
          contentContainerStyle={st.listContent}
          columnWrapperStyle={{ gap: GAP }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={st.resultCount}>
              {results.length} results for &quot;{query}&quot;
            </Text>
          }
        />
      ) : query && !loading ? (
        <View style={st.empty}>
          <Search size={48} color={C.text3} strokeWidth={1.5} />
          <Text style={st.emptyTitle}>No results</Text>
          <Text style={st.emptyText}>
            Nothing found for &quot;{query}&quot;
          </Text>
        </View>
      ) : loading ? (
        <View style={st.empty}>
          <ActivityIndicator color={C.accent} size="large" />
          <Text style={st.emptyText}>Searching...</Text>
        </View>
      ) : (
        <View style={st.genreContainer}>
          <Text style={st.genreTitle}>Browse by Genre</Text>
          <View style={st.genreWrap}>
            {genres.slice(0, 20).map(g => (
              <Pressable
                key={g.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/genre/${g.id}` as any);
                }}
                style={({ pressed }) => [
                  st.genrePill,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={st.genrePillText}>{g.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: Layout.safeTop,
    paddingHorizontal: S.screen,
    paddingBottom: S.sm + 4,
  },
  title: { ...T.h1, marginBottom: S.md },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.elevated,
    borderRadius: R.md,
    paddingHorizontal: S.md - 4,
    gap: S.sm,
  },
  input: {
    flex: 1,
    height: 46,
    color: C.text,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: S.screen,
    paddingBottom: Layout.tabBarH + S.md,
  },
  resultCount: {
    ...T.caption,
    marginBottom: S.sm + 4,
  },
  card: {
    width: CARD_W,
    marginBottom: GAP + 4,
  },
  cardPoster: {
    width: CARD_W,
    height: CARD_W * 1.5,
    borderRadius: R.lg,
    backgroundColor: C.card,
  },
  cardTitle: {
    ...T.caption,
    color: C.text2,
    marginTop: S.xs + 2,
    marginBottom: 2,
  },
  cardMeta: { flexDirection: 'row', gap: S.xs + 2 },
  cardType: {
    ...T.badge,
    color: C.text3,
    textTransform: 'uppercase',
  },
  cardRating: {
    ...T.badge,
    color: C.yellow,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Layout.tabBarH,
    gap: S.sm + 4,
  },
  emptyTitle: { ...T.h3, color: C.text2 },
  emptyText: { ...T.body, color: C.text3 },
  genreContainer: {
    paddingHorizontal: S.screen,
    paddingTop: S.sm,
  },
  genreTitle: {
    ...T.h2,
    marginBottom: S.md - 4,
  },
  genreWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
  },
  genrePill: {
    backgroundColor: C.elevated,
    paddingHorizontal: S.md,
    paddingVertical: S.sm + 2,
    borderRadius: R.pill,
  },
  genrePillText: {
    ...T.caption,
    color: C.text2,
    fontWeight: '600',
  },
});
