import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { Stack } from 'expo-router';
import { popularMovies, topRatedMovies, nowPlayingMovies, upcomingMovies } from '@/lib/tmdb';
import { Colors, Spacing } from '@/lib/theme';
import ContentRow from '@/components/ContentRow';
import { Movie } from '@/types';

export default function MoviesTab() {
  const [data, setData] = useState<Record<string, Movie[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, t, n, u] = await Promise.all([popularMovies(), topRatedMovies(), nowPlayingMovies(), upcomingMovies()]);
      setData({ popular: p.results, topRated: t.results, nowPlaying: n.results, upcoming: u.results });
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={st.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Stack.Screen options={{ headerShown: true, title: 'Movies', headerStyle: { backgroundColor: Colors.bg }, headerTintColor: '#fff', headerLargeTitle: true }} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.accent} />} showsVerticalScrollIndicator={false}>
        <ContentRow title="Popular" data={data.popular || []} type="movie" />
        <ContentRow title="Now Playing" data={data.nowPlaying || []} type="movie" />
        <ContentRow title="Top Rated" data={data.topRated || []} type="movie" />
        <ContentRow title="Coming Soon" data={data.upcoming || []} type="movie" />
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
});
