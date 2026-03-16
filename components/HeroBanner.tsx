import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Movie } from '@/types';
import { backdrop } from '@/lib/tmdb';
import { Colors, Spacing, Radius } from '@/lib/theme';

const { width: SCREEN, height: HEIGHT } = Dimensions.get('window');

interface Props {
  movie: Movie;
}

export default function HeroBanner({ movie }: Props) {
  const router = useRouter();
  const title = movie.title || movie.name || '';
  const type = movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie';
  const bg = backdrop(movie.backdrop_path);

  return (
    <View style={styles.container}>
      {bg && (
        <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(10,10,10,0.6)', Colors.bg]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(10,10,10,0.5)', 'transparent', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: 120 }]}
      />

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.overview} numberOfLines={2}>{movie.overview}</Text>

        <View style={styles.buttons}>
          <Pressable
            onPress={() => router.push(`/watch/${movie.id}?type=${type}` as any)}
            style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.playText}>Watch Now</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/${type}/${movie.id}` as any)}
            style={({ pressed }) => [styles.detailBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.detailText}>Details</Text>
            <Text style={styles.detailText}>›</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN,
    height: HEIGHT * 0.55,
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  overview: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  playIcon: { fontSize: 12, color: '#000' },
  playText: { fontSize: 15, fontWeight: '700', color: '#000' },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  detailText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
