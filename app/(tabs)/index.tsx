import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { trending, popularMovies, topRatedMovies, nowPlayingMovies, popularTV, topRatedTV } from '@/lib/tmdb';
import { getContinueWatching } from '@/lib/storage';
import { Colors, Spacing } from '@/lib/theme';
import ContentRow from '@/components/ContentRow';
import HeroBanner from '@/components/HeroBanner';
import { Movie, WatchHistoryItem } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<Record<string, Movie[]>>({});
  const [continueItems, setContinueItems] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, pm, tr, np, pt, tt] = await Promise.all([
        trending(), popularMovies(), topRatedMovies(), nowPlayingMovies(), popularTV(), topRatedTV()
      ]);
      setData({ trending: t.results, popular: pm.results, topRated: tr.results, nowPlaying: np.results, popularTv: pt.results, topRatedTv: tt.results });
      setContinueItems(await getContinueWatching());
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={st.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  const hero = data.trending?.[0];

  return (
    <ScrollView style={st.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.accent} />} showsVerticalScrollIndicator={false}>
      {/* Logo + search */}
      <View style={st.logoBar}>
        <Image source={require('@/assets/logo.png')} style={st.logo} contentFit="contain" />
        <Pressable onPress={() => router.push('/search' as any)} style={st.searchBtn}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '300' }}>⌕</Text>
        </Pressable>
      </View>

      {hero && <HeroBanner movie={hero} />}

      {/* Continue Watching */}
      {continueItems.length > 0 && (
        <View style={{ marginTop: Spacing.lg }}>
          <Text style={st.secTitle}>Continue Watching</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {continueItems.map(item => (
              <Pressable
                key={`${item.type}-${item.id}-${item.season}-${item.episode}`}
                onPress={() => router.push((item.type === 'tv' && item.season && item.episode ? `/watch/${item.id}?type=tv&s=${item.season}&e=${item.episode}` : `/watch/${item.id}?type=${item.type}`) as any)}
                style={{ width: 120, borderRadius: 12, overflow: 'hidden' }}
              >
                <Image source={{ uri: `https://image.tmdb.org/t/p/w342${item.poster_path}` }} style={{ width: 120, height: 180, borderRadius: 12 }} contentFit="cover" />
                {item.type === 'tv' && item.season && item.episode && (
                  <View style={st.cwBadge}><Text style={st.cwBadgeT}>S{item.season} E{item.episode}</Text></View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ marginTop: Spacing.lg }}>
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

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  logoBar: { position: 'absolute', top: 54, left: 16, right: 16, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 120, height: 32 },
  searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  secTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, marginBottom: 8 },
  cwBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cwBadgeT: { color: '#fff', fontSize: 10, fontWeight: '600' },
});
