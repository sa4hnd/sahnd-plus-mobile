import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { popularTV, topRatedTV } from '@/lib/tmdb';
import { C, S, Layout, T } from '@/lib/design';
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={st.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={C.accent}
        />
      }
    >
      <View style={st.header}>
        <Text style={st.headerTitle}>TV Shows</Text>
      </View>
      <ContentRow title="Popular Series" data={data.popular || []} type="tv" />
      <ContentRow title="Top Rated" data={data.topRated || []} type="tv" />
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
  scroll: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: Layout.safeTop,
    paddingHorizontal: S.screen,
    paddingBottom: S.screen,
  },
  headerTitle: T.pageTitle,
});
