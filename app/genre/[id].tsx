import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { discoverByGenre, movieGenres, tvGenres, img } from '@/lib/tmdb';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { isTV } from '@/lib/design';
import TVPressable from '@/components/TVPressable';
import { Movie, Genre } from '@/types';

const { width: W } = Dimensions.get('window');
const COLS = 3;
const GAP = 10;
const CARD_W = (W - Spacing.md * 2 - GAP * (COLS - 1)) / COLS;

export default function GenreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genreName, setGenreName] = useState('');

  useEffect(() => {
    const load = async () => {
      const [mGenres, tGenres, movieResults, tvResults] = await Promise.all([
        movieGenres(), tvGenres(),
        discoverByGenre(Number(id), 'movie'),
        discoverByGenre(Number(id), 'tv'),
      ]);
      const allGenres = [...mGenres.genres, ...tGenres.genres];
      const genre = allGenres.find((g: Genre) => g.id === Number(id));
      setGenreName(genre?.name || 'Genre');
      const combined = [
        ...movieResults.results.map((m: Movie) => ({ ...m, media_type: 'movie' })),
        ...tvResults.results.map((m: Movie) => ({ ...m, media_type: 'tv' })),
      ].sort((a: Movie, b: Movie) => b.popularity - a.popularity);
      setMovies(combined);
    };
    load();
  }, [id]);

  const renderItem = ({ item, index }: { item: Movie; index: number }) => {
    const type = item.media_type === 'tv' ? 'tv' : 'movie';
    return (
      <TVPressable
        onPress={() => { Haptics.selectionAsync(); router.push(`/${type}/${item.id}` as any); }}
        {...(isTV && index === 0 ? { hasTVPreferredFocus: true } : {})}
        style={({ pressed }) => [{ width: CARD_W }, pressed && { opacity: 0.8 }]}
      >
        <Image source={{ uri: img(item.poster_path, 'w342')! }} style={{ width: CARD_W, height: CARD_W * 1.5, borderRadius: Radius.lg }} contentFit="cover" />
        <Text style={{ color: Colors.textSecondary, fontSize: 11, marginTop: 4 }} numberOfLines={1}>{item.title || item.name}</Text>
      </TVPressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Stack.Screen options={{ headerShown: true, title: genreName, headerStyle: { backgroundColor: Colors.bg }, headerTintColor: '#fff' }} />
      <FlatList
        data={movies}
        numColumns={COLS}
        keyExtractor={i => `${i.media_type}-${i.id}`}
        renderItem={renderItem}
        contentContainerStyle={{ padding: Spacing.md }}
        columnWrapperStyle={{ gap: GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      />
    </View>
  );
}
