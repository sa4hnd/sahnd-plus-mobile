import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Play, Plus } from 'lucide-react-native';
import { Movie } from '@/types';
import { backdrop } from '@/lib/tmdb';
import { C, S, R, T, isTV } from '@/lib/design';
import TVPressable from '@/components/TVPressable';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_H = SCREEN_H * 0.55;

interface Props {
  movie: Movie;
}

export default function HeroBanner({ movie }: Props) {
  const router = useRouter();
  const title = movie.title || movie.name || '';
  const type =
    movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie';
  const bg = backdrop(movie.backdrop_path);

  return (
    <View style={st.container}>
      {bg && (
        <Image
          source={{ uri: bg }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
      )}
      <LinearGradient
        colors={['rgba(20,20,20,0.3)', 'transparent', 'rgba(20,20,20,0.7)', C.bg]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={st.content}>
        <Text style={st.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={st.overview} numberOfLines={2}>
          {movie.overview}
        </Text>

        <View style={st.buttons}>
          <TVPressable
            onPress={() => {
              if (!isTV) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/watch/${movie.id}?type=${type}` as any);
            }}
            {...(isTV ? { hasTVPreferredFocus: true } : {})}
            style={({ pressed }) => [
              st.playBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Play size={18} color="#000" fill="#000" strokeWidth={0} />
            <Text style={st.playText}>Play</Text>
          </TVPressable>

          <TVPressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push(`/${type}/${movie.id}` as any);
            }}
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
          >
            <GlassView style={st.listBtn} glassEffectStyle="regular" isInteractive>
              <Plus size={18} color={C.text} strokeWidth={2} />
              <Text style={st.listText}>My List</Text>
            </GlassView>
          </TVPressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    width: SCREEN_W,
    height: HERO_H,
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: S.screen,
    paddingBottom: S.lg,
  },
  title: {
    ...T.heroTitle,
    lineHeight: 36,
    marginBottom: S.sm,
  },
  overview: {
    ...T.caption,
    color: C.text2,
    lineHeight: 19,
    marginBottom: S.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: R.pill,
  },
  playText: {
    ...T.button,
    color: '#000000',
  },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: R.pill,
  },
  listText: {
    ...T.button,
    color: C.text,
  },
});
