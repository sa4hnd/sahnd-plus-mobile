import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { popularTV, topRatedTV } from '@/lib/tmdb';
import { Colors, Spacing } from '@/lib/theme';
import ContentRow from '@/components/ContentRow';
import { Movie } from '@/types';

export default function SeriesScreen() {
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [airingToday, setAiringToday] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [popRes, topRes, airingRes] = await Promise.all([
        popularTV(),
        topRatedTV(),
        fetch(
          `https://api.themoviedb.org/3/tv/airing_today?api_key=3ea9ba88a81be0f283362871b7f6b19e`
        ).then((r) => r.json()),
      ]);
      setPopular(popRes.results ?? []);
      setTopRated(topRes.results ?? []);
      setAiringToday(airingRes.results ?? []);
    } catch (e) {
      console.error('SeriesScreen fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: 'Series',
            headerStyle: { backgroundColor: Colors.bg },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <ActivityIndicator color={Colors.text} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Series',
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.text}
          />
        }
      >
        <Text style={styles.header}>Series</Text>

        <ContentRow title="Popular" data={popular} type="tv" />
        <ContentRow title="Top Rated" data={topRated} type="tv" />
        <ContentRow title="Airing Today" data={airingToday} type="tv" />

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
