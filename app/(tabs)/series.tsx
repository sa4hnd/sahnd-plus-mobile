import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { popularTV, topRatedTV } from '@/lib/tmdb';
import { Colors } from '@/lib/theme';
import ContentRow from '@/components/ContentRow';
import { Movie } from '@/types';

export default function SeriesTab() {
  const [data, setData] = useState<Record<string, Movie[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([popularTV(), topRatedTV()]);
      setData({ popular: p.results, topRated: t.results });
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={st.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Stack.Screen options={{ headerShown: true, title: 'Series', headerStyle: { backgroundColor: Colors.bg }, headerTintColor: '#fff', headerLargeTitle: true }} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.accent} />} showsVerticalScrollIndicator={false}>
        <ContentRow title="Popular Series" data={data.popular || []} type="tv" />
        <ContentRow title="Top Rated" data={data.topRated || []} type="tv" />
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
});
