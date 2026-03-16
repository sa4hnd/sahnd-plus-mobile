import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { movieDetail, img, backdrop as bdrop } from '@/lib/tmdb';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/storage';
import { Colors, Spacing, Radius } from '@/lib/theme';
import ContentRow from '@/components/ContentRow';
import { MovieDetail, CastMember } from '@/types';

const { width: W } = Dimensions.get('window');

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [inList, setInList] = useState(false);

  useEffect(() => {
    movieDetail(Number(id)).then(setMovie);
    isInWatchlist(Number(id), 'movie').then(setInList);
  }, [id]);

  if (!movie) return (
    <View style={styles.loading}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  const bg = bdrop(movie.backdrop_path);
  const year = movie.release_date?.slice(0, 4);
  const hours = movie.runtime ? Math.floor(movie.runtime / 60) : 0;
  const mins = movie.runtime ? movie.runtime % 60 : 0;
  const trailer = movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');

  const toggleWatchlist = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (inList) {
      await removeFromWatchlist(movie.id, 'movie');
      setInList(false);
    } else {
      await addToWatchlist({ id: movie.id, type: 'movie', title: movie.title, poster_path: movie.poster_path, vote_average: movie.vote_average, addedAt: 0 });
      setInList(true);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView bounces showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        <View style={styles.backdrop}>
          {bg && <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          <LinearGradient colors={['transparent', Colors.bg]} style={[StyleSheet.absoluteFill, { top: '40%' }]} />
          {/* Back button */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: '#fff', fontSize: 20 }}>‹</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Poster + Info */}
          <View style={styles.row}>
            <Image source={{ uri: img(movie.poster_path, 'w342')! }} style={styles.poster} contentFit="cover" />
            <View style={styles.info}>
              <Text style={styles.title}>{movie.title}</Text>
              <View style={styles.meta}>
                <Text style={styles.metaYellow}>★ {movie.vote_average.toFixed(1)}</Text>
                {year && <Text style={styles.metaText}>{year}</Text>}
                {movie.runtime ? <Text style={styles.metaText}>{hours}h {mins}m</Text> : null}
              </View>
              {/* Genres */}
              <View style={styles.genres}>
                {movie.genres?.slice(0, 3).map(g => (
                  <Pressable key={g.id} onPress={() => router.push(`/genre/${g.id}` as any)} style={styles.genrePill}>
                    <Text style={styles.genreText}>{g.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push(`/watch/${movie.id}?type=movie` as any)}
              style={({ pressed }) => [styles.watchBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.watchBtnIcon}>▶</Text>
              <Text style={styles.watchBtnText}>Watch Now</Text>
            </Pressable>
            <Pressable onPress={toggleWatchlist} style={styles.listBtn}>
              <Text style={styles.listBtnText}>{inList ? '✓' : '+'}</Text>
            </Pressable>
          </View>

          {/* Tagline */}
          {movie.tagline ? <Text style={styles.tagline}>"{movie.tagline}"</Text> : null}

          {/* Overview */}
          <Text style={styles.overview}>{movie.overview}</Text>

          {/* Cast */}
          {movie.credits?.cast && movie.credits.cast.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 0 }}>
                {movie.credits.cast.slice(0, 12).map((c: CastMember) => (
                  <View key={c.id} style={styles.castItem}>
                    <Image source={{ uri: img(c.profile_path, 'w185')! }} style={styles.castImg} contentFit="cover" />
                    <Text style={styles.castName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.castChar} numberOfLines={1}>{c.character}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Similar */}
          {movie.similar?.results && movie.similar.results.length > 0 && (
            <ContentRow title="More Like This" data={movie.similar.results} type="movie" />
          )}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: 16 },
  backdrop: { width: W, height: W * 0.65 },
  backBtn: {
    position: 'absolute', top: 56, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  body: { paddingHorizontal: Spacing.md, marginTop: -40 },
  row: { flexDirection: 'row', gap: 16 },
  poster: { width: 110, height: 165, borderRadius: Radius.lg },
  info: { flex: 1, justifyContent: 'flex-end', paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  meta: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' },
  metaYellow: { color: Colors.yellow, fontSize: 13, fontWeight: '700' },
  metaText: { color: Colors.textSecondary, fontSize: 13 },
  genres: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  genrePill: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  genreText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: Spacing.md, marginBottom: Spacing.md },
  watchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', paddingVertical: 14, borderRadius: Radius.full,
  },
  watchBtnIcon: { fontSize: 12, color: '#000' },
  watchBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  listBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  listBtnText: { color: '#fff', fontSize: 22, fontWeight: '300' },
  tagline: { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  overview: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: Spacing.sm },
  castItem: { width: 70, alignItems: 'center' },
  castImg: { width: 56, height: 56, borderRadius: 28, marginBottom: 4, backgroundColor: Colors.elevated },
  castName: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center' },
  castChar: { color: Colors.textMuted, fontSize: 9, textAlign: 'center' },
});
