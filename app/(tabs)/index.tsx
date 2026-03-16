import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator,
  StyleSheet, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Search } from 'lucide-react-native';
import {
  trending, popularMovies, topRatedMovies,
  nowPlayingMovies, popularTV, topRatedTV, img,
} from '@/lib/tmdb';
import { getContinueWatching, getLastWatched } from '@/lib/storage';
import { C, S, R, Layout, T } from '@/lib/design';
import ContentRow from '@/components/ContentRow';
import { Movie, WatchHistoryItem } from '@/types';

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
        trending(), popularMovies(), topRatedMovies(),
        nowPlayingMovies(), popularTV(), topRatedTV(),
      ]);
      setData({
        trending: t.results,
        popular: pm.results,
        topRated: tr.results,
        nowPlaying: np.results,
        popularTv: pt.results,
        topRatedTv: tt.results,
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getContinueWatching().then(setContinueItems);
      getLastWatched().then(setLastWatched);
    }, []),
  );

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  // Hero: last watched or first trending
  const heroItem = lastWatched || data.trending?.[0];
  const heroTitle = heroItem
    ? ('title' in heroItem ? heroItem.title : heroItem?.title) || ''
    : '';
  const heroType = heroItem
    ? heroItem.type === 'tv' || ('first_air_date' in heroItem && heroItem.first_air_date)
      ? 'tv'
      : 'movie'
    : 'movie';
  const heroBg = heroItem?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${heroItem.backdrop_path}`
    : null;
  const heroIsResume = lastWatched && !lastWatched.completed && lastWatched.progress > 0;
  const heroWatchUrl = lastWatched
    ? lastWatched.type === 'tv' && lastWatched.season && lastWatched.episode
      ? `/watch/${lastWatched.id}?type=tv&s=${lastWatched.season}&e=${lastWatched.episode}`
      : `/watch/${lastWatched.id}?type=${lastWatched.type}`
    : heroItem
      ? `/watch/${heroItem.id}?type=${heroType}`
      : '/';

  return (
    <ScrollView
      style={st.root}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={C.accent}
        />
      }
    >
      {/* ── Hero Banner ── */}
      <View style={st.hero}>
        {heroBg && (
          <Image
            source={{ uri: heroBg }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        )}
        <LinearGradient
          colors={['rgba(10,10,10,0.3)', 'transparent', 'rgba(10,10,10,0.7)', C.bg]}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top bar */}
        <View style={st.topBar}>
          <Image
            source={require('@/assets/logo.png')}
            style={st.logo}
            contentFit="contain"
          />
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/(tabs)/search' as any);
            }}
            hitSlop={8}
            style={st.topIconBtn}
          >
            <Search size={22} color={C.text} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Hero content */}
        <View style={st.heroContent}>
          {lastWatched && (
            <View style={st.heroBadge}>
              <Text style={st.heroBadgeText}>
                {heroIsResume ? 'Continue Watching' : 'Last Watched'}
                {lastWatched.type === 'tv' && lastWatched.season && lastWatched.episode
                  ? ` \u00b7 S${lastWatched.season} E${lastWatched.episode}`
                  : ''}
              </Text>
            </View>
          )}
          <Text style={st.heroTitle} numberOfLines={2}>{heroTitle}</Text>
          {heroItem && 'overview' in heroItem && (
            <Text style={st.heroOverview} numberOfLines={2}>
              {heroItem.overview}
            </Text>
          )}

          {heroIsResume && lastWatched && (
            <View style={st.heroProgress}>
              <View style={[st.heroProgressFill, { width: `${lastWatched.progress}%` }]} />
            </View>
          )}

          <View style={st.heroButtons}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(heroWatchUrl as any);
              }}
              style={({ pressed }) => [
                st.heroPlayBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={st.heroPlayIcon}>{'\u25B6'}</Text>
              <Text style={st.heroPlayText}>
                {heroIsResume ? 'Resume' : 'Watch Now'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/${heroType}/${heroItem?.id}` as any);
              }}
              style={({ pressed }) => [
                st.heroInfoBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={st.heroInfoText}>Details</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Content Rows ── */}
      <View style={st.content}>
        {continueItems.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Continue Watching</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.cwRow}
            >
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
                  style={({ pressed }) => [
                    st.cwCard,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Image
                    source={{ uri: img(item.poster_path, 'w342')! }}
                    style={st.cwPoster}
                    contentFit="cover"
                  />
                  <View style={st.cwProgressBg}>
                    <View
                      style={[
                        st.cwProgressFill,
                        { width: `${Math.max(item.progress, 5)}%` },
                      ]}
                    />
                  </View>
                  {item.type === 'tv' && item.season && item.episode && (
                    <View style={st.cwBadge}>
                      <Text style={st.cwBadgeText}>
                        S{item.season} E{item.episode}
                      </Text>
                    </View>
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

      <View style={{ height: Layout.tabBarH + S.md }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  root: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    width: Layout.screenW,
    height: Layout.screenH * 0.6,
    justifyContent: 'flex-end',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Layout.safeTop,
    paddingHorizontal: S.screen,
  },
  logo: { width: 110, height: 28 },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: R.xl,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    paddingHorizontal: S.screen,
    paddingBottom: S.lg,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229,9,20,0.2)',
    paddingHorizontal: S.sm + 2,
    paddingVertical: S.xs,
    borderRadius: R.sm,
    marginBottom: S.sm + 2,
  },
  heroBadgeText: { color: C.accent, ...T.small },
  heroTitle: {
    ...T.hero,
    lineHeight: 36,
    marginBottom: S.sm,
  },
  heroOverview: {
    ...T.caption,
    color: C.text2,
    lineHeight: 19,
    marginBottom: S.md - 2,
  },
  heroProgress: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    marginBottom: S.md - 2,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  heroButtons: { flexDirection: 'row', gap: S.sm + 2 },
  heroPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.text,
    paddingHorizontal: S.lg + 4,
    paddingVertical: S.md - 3,
    borderRadius: R.pill,
  },
  heroPlayIcon: { fontSize: 11, color: '#000' },
  heroPlayText: { fontSize: 15, fontWeight: '700', color: '#000' },
  heroInfoBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: S.lg,
    paddingVertical: S.md - 3,
    borderRadius: R.pill,
  },
  heroInfoText: { ...T.h3, color: C.text },

  // Content
  content: { marginTop: -S.sm },
  section: { marginBottom: S.lg + 4 },
  sectionTitle: {
    ...T.h2,
    paddingHorizontal: S.screen,
    marginBottom: S.sm + 2,
  },
  cwRow: { paddingHorizontal: S.screen, gap: S.sm + 2 },
  cwCard: {
    width: 115,
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: C.card,
  },
  cwPoster: { width: 115, height: 170, borderRadius: R.lg },
  cwProgressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.border,
  },
  cwProgressFill: { height: '100%', backgroundColor: C.accent },
  cwBadge: {
    position: 'absolute',
    top: S.sm,
    left: S.sm,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: S.xs,
  },
  cwBadgeText: { color: C.text, ...T.badge },
});
