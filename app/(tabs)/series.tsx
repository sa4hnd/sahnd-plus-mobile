import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, Text } from 'react-native';
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
    <ScrollView
      style={st.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={st.header}>
        <Text style={st.headerTitle}>Series</Text>
      </View>
      <ContentRow title="Popular Series" data={data.popular || []} type="tv" />
      <ContentRow title="Top Rated" data={data.topRated || []} type="tv" />
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#fff' },
});
