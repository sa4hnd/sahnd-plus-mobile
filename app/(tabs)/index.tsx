import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator,
  StyleSheet, Pressable, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { GlassView } from 'expo-glass-effect';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Search, Play, Plus, Bookmark } from 'lucide-react-native';
import {
  trending, popularMovies, topRatedMovies,
  nowPlayingMovies, popularTV, topRatedTV, airingTodayTV, onTheAirTV, img,
} from '@/lib/tmdb';
import { getContinueWatching, getLastWatched } from '@/lib/storage';
import { fetchChannels } from '@/lib/channels';
import { C, S, R, Layout, T, isTV } from '@/lib/design';
import ContentRow from '@/components/ContentRow';
import ChannelGrid from '@/components/ChannelGrid';
import { Movie, WatchHistoryItem, ChannelCategory } from '@/types';

const CW_THUMB_W = Layout.thumbW;
const CW_THUMB_H = Layout.thumbH;

type ActiveCategory = 'channels' | 'movies' | 'series';
const CATEGORIES: { key: ActiveCategory; label: string }[] = [
  { key: 'channels', label: 'Channels' },
  { key: 'movies', label: 'Movies' },
  { key: 'series', label: 'Series' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const HERO_H = isTV ? SCREEN_H * 0.45 : SCREEN_H * 0.55;
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>('channels');
  const [data, setData] = useState<Record<string, Movie[]>>({});
  const [channels, setChannels] = useState<ChannelCategory[]>([]);
  const [continueItems, setContinueItems] = useState<WatchHistoryItem[]>([]);
  const [lastWatched, setLastWatched] = useState<WatchHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, pm, tr, np, pt, trt, atv, otv, ch] = await Promise.all([
        trending(), popularMovies(), topRatedMovies(),
        nowPlayingMovies(), popularTV(), topRatedTV(),
        airingTodayTV(), onTheAirTV(),
        fetchChannels().catch(() => [] as ChannelCategory[]),
      ]);
      setData({
        trending: t.results,
        popular: pm.results,
        topRated: tr.results,
        nowPlaying: np.results,
        popularTv: pt.results,
        topRatedTv: trt.results,
        airingToday: atv.results,
        onTheAir: otv.results,
      });
      setChannels(ch);
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
  const heroIsResume =
    lastWatched && !lastWatched.completed && lastWatched.progress > 0;
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
        !isTV ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.accent}
          />
        ) : undefined
      }
    >
      {/* ── Hero Banner — all categories ── */}
      <View style={[st.hero, { width: SCREEN_W, height: HERO_H }]}>
        {activeCategory === 'channels' ? (
          <Image
            source={require('@/assets/channels-hero.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : heroBg ? (
          <Image
            source={{ uri: heroBg }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : null}
        <LinearGradient
          colors={['rgba(20,20,20,0.3)', 'transparent', 'rgba(20,20,20,0.7)', C.bg]}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top bar */}
        <View style={st.topBar}>
          <Image
            source={require('@/assets/logo.png')}
            style={isTV ? st.logoTV : st.logo}
            contentFit="contain"
          />
          {!isTV && (
            <View style={st.topIcons}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push('/watchlist' as any); }}
                hitSlop={8}
              >
                <GlassView style={st.topIconBtn} glassEffectStyle="regular" isInteractive>
                  <Bookmark size={20} color={C.text} strokeWidth={2} />
                </GlassView>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push('/search' as any); }}
                hitSlop={8}
              >
                <GlassView style={st.topIconBtn} glassEffectStyle="regular" isInteractive>
                  <Search size={20} color={C.text} strokeWidth={2} />
                </GlassView>
              </Pressable>
            </View>
          )}
        </View>

        {/* Hero content */}
        <View style={st.heroContent}>
          {activeCategory === 'channels' ? (
            <>
              <Text style={st.heroTitle} numberOfLines={2}>Live TV</Text>
              <Text style={st.heroOverview} numberOfLines={2}>
                {channels.reduce((t, c) => t + c.channels.length, 0)} channels across {channels.length} categories
              </Text>
              <View style={st.heroButtons}>
                {channels[0]?.channels[0] && (
                  <Pressable
                    onPress={() => {
                      if (!isTV) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push(`/channel/${channels[0].channels[0].id}` as any);
                    }}
                    style={({ pressed }) => [
                      st.heroPlayBtn,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                    ]}
                    {...(isTV ? { hasTVPreferredFocus: true } : {})}
                  >
                    <Play size={isTV ? 24 : 18} color="#000" fill="#000" strokeWidth={0} />
                    <Text style={st.heroPlayText}>Watch Now</Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : (
            <>
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
                    if (!isTV) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(heroWatchUrl as any);
                  }}
                  style={({ pressed }) => [
                    st.heroPlayBtn,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                  ]}
                  {...(isTV ? { hasTVPreferredFocus: true } : {})}
                >
                  <Play size={isTV ? 24 : 18} color="#000" fill="#000" strokeWidth={0} />
                  <Text style={st.heroPlayText}>
                    {heroIsResume ? 'Resume' : 'Play'}
                  </Text>
                </Pressable>
                {!isTV && (
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/${heroType}/${heroItem?.id}` as any);
                    }}
                    style={({ pressed }) => [pressed && { opacity: 0.8 }]}
                  >
                    <GlassView style={st.heroListBtn} glassEffectStyle="regular" isInteractive>
                      <Plus size={18} color={C.text} strokeWidth={2} />
                      <Text style={st.heroListText}>My List</Text>
                    </GlassView>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Category Switcher ── */}
      <View style={st.categoryRow}>
        {CATEGORIES.map(({ key, label }) => {
          const active = key === activeCategory;
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (!isTV) Haptics.selectionAsync();
                setActiveCategory(key);
              }}
              style={({ pressed }) => [
                st.categoryPill,
                active && st.categoryPillActive,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[st.categoryText, active && st.categoryTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Content by category ── */}
      <View style={st.content}>
        {activeCategory === 'channels' && (
          <ChannelGrid categories={channels} />
        )}

        {activeCategory === 'movies' && (
          <>
            {continueItems.filter(i => i.type === 'movie').length > 0 && (
              <View style={st.section}>
                <Text style={st.sectionTitle}>Continue Watching</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={st.cwRow}
                >
                  {continueItems.filter(i => i.type === 'movie').map((item) => (
                    <Pressable
                      key={`cw-${item.type}-${item.id}`}
                      onPress={() => {
                        if (!isTV) Haptics.selectionAsync();
                        router.push(`/watch/${item.id}?type=${item.type}` as any);
                      }}
                      style={({ pressed }) => [
                        st.cwCard,
                        pressed && !isTV && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Image
                        source={{ uri: img(item.backdrop_path || item.poster_path, 'w342')! }}
                        style={st.cwThumb}
                        contentFit="cover"
                      />
                      <View style={st.cwProgressBg}>
                        <View
                          style={[st.cwProgressFill, { width: `${Math.max(item.progress, 5)}%` }]}
                        />
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <ContentRow title="Trending Now" data={data.trending?.slice(1) || []} />
            <ContentRow title="Popular Movies" data={data.popular || []} type="movie" />
            <ContentRow title="Now Playing" data={data.nowPlaying || []} type="movie" />
            <ContentRow title="Top Rated" data={data.topRated || []} type="movie" />
          </>
        )}

        {activeCategory === 'series' && (
          <>
            {continueItems.filter(i => i.type === 'tv').length > 0 && (
              <View style={st.section}>
                <Text style={st.sectionTitle}>Continue Watching</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={st.cwRow}
                >
                  {continueItems.filter(i => i.type === 'tv').map((item) => (
                    <Pressable
                      key={`cw-${item.type}-${item.id}-${item.season}-${item.episode}`}
                      onPress={() => {
                        if (!isTV) Haptics.selectionAsync();
                        const url = item.season && item.episode
                          ? `/watch/${item.id}?type=tv&s=${item.season}&e=${item.episode}`
                          : `/watch/${item.id}?type=tv`;
                        router.push(url as any);
                      }}
                      style={({ pressed }) => [
                        st.cwCard,
                        pressed && !isTV && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Image
                        source={{ uri: img(item.backdrop_path || item.poster_path, 'w342')! }}
                        style={st.cwThumb}
                        contentFit="cover"
                      />
                      <View style={st.cwProgressBg}>
                        <View
                          style={[st.cwProgressFill, { width: `${Math.max(item.progress, 5)}%` }]}
                        />
                      </View>
                      {item.season && item.episode && (
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
            <ContentRow title="Popular Series" data={data.popularTv || []} type="tv" />
            <ContentRow title="Airing Today" data={data.airingToday || []} type="tv" />
            <ContentRow title="Top Rated Series" data={data.topRatedTv || []} type="tv" />
            <ContentRow title="On The Air" data={data.onTheAir || []} type="tv" />
          </>
        )}
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
  logo: { width: 120, height: 32 },
  logoTV: { width: 180, height: 48 },
  topIcons: { flexDirection: 'row', gap: 10 },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    paddingHorizontal: S.screen,
    paddingBottom: S.lg,
    paddingTop: 60,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229,9,20,0.35)',
    paddingHorizontal: isTV ? 16 : 10,
    paddingVertical: S.xs,
    borderRadius: R.sm,
    marginBottom: isTV ? 16 : 10,
  },
  heroBadgeText: { color: C.accent, ...T.small },
  heroTitle: {
    ...T.heroTitle,
    lineHeight: isTV ? 56 : 36,
    marginBottom: S.sm,
  },
  heroOverview: {
    ...T.caption,
    color: C.text2,
    lineHeight: isTV ? 28 : 19,
    marginBottom: 14,
  },
  heroProgress: {
    height: isTV ? 5 : 3,
    backgroundColor: C.separator,
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  heroButtons: { flexDirection: 'row', gap: isTV ? 20 : 10 },
  heroPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isTV ? 40 : 28,
    paddingVertical: isTV ? 18 : 13,
    borderRadius: R.pill,
  },
  heroPlayText: { ...T.button, color: '#000000' },
  heroListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: R.pill,
  },
  heroListText: { ...T.button, color: C.text },

  // Category switcher
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: S.screen,
    gap: isTV ? S.md : S.sm,
    marginBottom: S.md,
    marginTop: S.sm,
  },
  categoryPill: {
    paddingHorizontal: isTV ? 28 : 18,
    paddingVertical: isTV ? 14 : 8,
    borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderColor: C.accent,
  },
  categoryText: {
    ...T.button,
    fontSize: isTV ? 20 : 13,
    color: C.text2,
  },
  categoryTextActive: {
    color: C.text,
  },

  // Content
  content: { marginTop: -S.sm },
  section: { marginBottom: S.sectionGap },
  sectionTitle: {
    ...T.sectionTitle,
    paddingHorizontal: S.screen,
    marginBottom: S.sm,
  },

  // Continue Watching (landscape 16:9)
  cwRow: { paddingHorizontal: S.screen, gap: S.rowGap },
  cwCard: {
    width: CW_THUMB_W,
    borderRadius: R.sm,
    overflow: 'hidden',
    backgroundColor: C.surface,
  },
  cwThumb: {
    width: CW_THUMB_W,
    height: CW_THUMB_H,
    borderRadius: R.sm,
  },
  cwProgressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: isTV ? 5 : 3,
    backgroundColor: C.separator,
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
  cwBadgeText: { color: C.text, ...T.small, fontWeight: '600' as const },
});
