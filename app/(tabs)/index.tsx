import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Search, Bell } from 'lucide-react-native';
import { trending, popularMovies, topRatedMovies, nowPlayingMovies, popularTV, topRatedTV } from '@/lib/tmdb';
import { getContinueWatching, getLastWatched } from '@/lib/storage';
import { Colors, Spacing, Radius } from '@/lib/theme';
import ContentRow from '@/components/ContentRow';
import { Movie, WatchHistoryItem } from '@/types';

const { width: W, height: H } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<Record<string, Movie[]>>({});
  const [continueItems, setContinueItems] = useState<WatchHistoryItem[]>([]);
  const [lastWatched, setLastWatched] = useState<WatchHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, pm, tr, np, pt, tt] = await Promise.all([
        trending(), popularMovies(), topRatedMovies(), nowPlayingMovies(), popularTV(), topRatedTV()
      ]);
      setData({ trending: t.results, popular: pm.results, topRated: tr.results, nowPlaying: np.results, popularTv: pt.results, topRatedTv: tt.results });
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload continue watching + last watched on focus
  useFocusEffect(useCallback(() => {
    getContinueWatching().then(setContinueItems);
    getLastWatched().then(setLastWatched);
  }, []));

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  // Hero: last watched or first trending
  const heroItem = lastWatched || data.trending?.[0];
  const heroTitle = heroItem ? ('title' in heroItem ? heroItem.title : heroItem?.title) || '' : '';
  const heroType = heroItem ? (heroItem.type === 'tv' || ('first_air_date' in heroItem && heroItem.first_air_date) ? 'tv' : 'movie') : 'movie';
  const heroBg = heroItem?.backdrop_path ? `https://image.tmdb.org/t/p/original${heroItem.backdrop_path}` : null;
  const heroIsResume = lastWatched && !lastWatched.completed && lastWatched.progress > 0;
  const heroWatchUrl = lastWatched
    ? (lastWatched.type === 'tv' && lastWatched.season && lastWatched.episode
      ? `/watch/${lastWatched.id}?type=tv&s=${lastWatched.season}&e=${lastWatched.episode}`
      : `/watch/${lastWatched.id}?type=${lastWatched.type}`)
    : heroItem
      ? `/watch/${heroItem.id}?type=${heroType}`
      : '/';

  return (
    <ScrollView
      style={s.root}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.accent} />}
    >
      {/* ── Hero Banner ── */}
      <View style={s.hero}>
        {heroBg && <Image source={{ uri: heroBg }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />}
        <LinearGradient colors={['rgba(10,10,10,0.3)', 'transparent', 'rgba(10,10,10,0.7)', Colors.bg]} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />

        {/* Top bar: Logo + icons */}
        <View style={s.topBar}>
          <Image source={require('@/assets/logo.png')} style={s.logo} contentFit="contain" />
          <View style={s.topIcons}>
            <Pressable onPress={() => router.push('/(tabs)/search' as any)} hitSlop={8} style={s.topIconBtn}>
              <Search size={22} color="#fff" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Hero content */}
        <View style={s.heroContent}>
          {lastWatched && (
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>
                {heroIsResume ? 'Continue Watching' : 'Last Watched'}
                {lastWatched.type === 'tv' && lastWatched.season && lastWatched.episode
                  ? ` · S${lastWatched.season} E${lastWatched.episode}`
                  : ''}
              </Text>
            </View>
          )}
          <Text style={s.heroTitle} numberOfLines={2}>{heroTitle}</Text>
          {heroItem && 'overview' in heroItem && (
            <Text style={s.heroOverview} numberOfLines={2}>{heroItem.overview}</Text>
          )}

          {/* Progress bar for resume */}
          {heroIsResume && lastWatched && (
            <View style={s.heroProgress}>
              <View style={[s.heroProgressFill, { width: `${lastWatched.progress}%` }]} />
            </View>
          )}

          <View style={s.heroButtons}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(heroWatchUrl as any); }}
              style={({ pressed }) => [s.heroPlayBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={s.heroPlayIcon}>▶</Text>
              <Text style={s.heroPlayText}>{heroIsResume ? 'Resume' : 'Watch Now'}</Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push(`/${heroType}/${heroItem?.id}` as any); }}
              style={({ pressed }) => [s.heroInfoBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={s.heroInfoText}>Details ›</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Content ── */}
      <View style={s.content}>
        {/* Continue Watching */}
        {continueItems.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Continue Watching</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cwRow}>
              {continueItems.map(item => (
                <Pressable
                  key={`cw-${item.type}-${item.id}-${item.season}-${item.episode}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    const url = item.type === 'tv' && item.season && item.episode
                      ? `/watch/${item.id}?type=tv&s=${item.season}&e=${item.episode}`
                      : `/watch/${item.id}?type=${item.type}`;
                    router.push(url as any);
                  }}
                  style={({ pressed }) => [s.cwCard, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                >
                  <Image source={{ uri: `https://image.tmdb.org/t/p/w342${item.poster_path}` }} style={s.cwPoster} contentFit="cover" />
                  {/* Progress bar */}
                  <View style={s.cwProgressBg}>
                    <View style={[s.cwProgressFill, { width: `${Math.max(item.progress, 5)}%` }]} />
                  </View>
                  {item.type === 'tv' && item.season && item.episode && (
                    <View style={s.cwBadge}><Text style={s.cwBadgeText}>S{item.season} E{item.episode}</Text></View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <ContentRow title="Trending" data={data.trending?.slice(1) || []} />
        <ContentRow title="Popular Movies" data={data.popular || []} type="movie" />
        <ContentRow title="Now Playing" data={data.nowPlaying || []} type="movie" />
        <ContentRow title="Top Rated" data={data.topRated || []} type="movie" />
        <ContentRow title="Popular Series" data={data.popularTv || []} type="tv" />
        <ContentRow title="Top Rated Series" data={data.topRatedTv || []} type="tv" />
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  root: { flex: 1, backgroundColor: Colors.bg },

  // Hero
  hero: { width: W, height: H * 0.6, justifyContent: 'flex-end' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20,
  },
  logo: { width: 110, height: 28 },
  topIcons: { flexDirection: 'row', gap: 16 },
  topIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  heroContent: { paddingHorizontal: 20, paddingBottom: 24 },
  heroBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(229,9,20,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 10,
  },
  heroBadgeText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 36, marginBottom: 8 },
  heroOverview: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19, marginBottom: 14 },
  heroProgress: { height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  heroProgressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  heroButtons: { flexDirection: 'row', gap: 10 },
  heroPlayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 100,
  },
  heroPlayIcon: { fontSize: 11, color: '#000' },
  heroPlayText: { fontSize: 15, fontWeight: '700', color: '#000' },
  heroInfoBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 100,
  },
  heroInfoText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Content
  content: { marginTop: -8 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginBottom: 12 },
  cwRow: { paddingHorizontal: 20, gap: 10 },
  cwCard: { width: 115, borderRadius: Radius.lg, overflow: 'hidden' },
  cwPoster: { width: 115, height: 170, borderRadius: Radius.lg },
  cwProgressBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  cwProgressFill: { height: '100%', backgroundColor: Colors.accent },
  cwBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cwBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
