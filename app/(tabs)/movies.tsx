import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Spacing } from '@/lib/theme';
import {
  popularMovies,
  topRatedMovies,
  nowPlayingMovies,
  upcomingMovies,
} from '@/lib/tmdb';
import ContentRow from '@/components/ContentRow';
import { Movie } from '@/types';

export default function MoviesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [popRes, trRes, npRes, upRes] = await Promise.all([
        popularMovies(),
        topRatedMovies(),
        nowPlayingMovies(),
        upcomingMovies(),
      ]);

      setPopular(popRes.results ?? []);
      setTopRated(trRes.results ?? []);
      setNowPlaying(npRes.results ?? []);
      setUpcoming(upRes.results ?? []);
    } catch (err) {
      console.error('Movies fetch error:', err);
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
      <View style={styles.loader}>
        <Stack.Screen
          options={{
            title: 'Movies',
            headerStyle: { backgroundColor: Colors.bg },
            headerTintColor: Colors.text,
            headerLargeTitle: true,
            headerLargeTitleStyle: { color: Colors.text },
            headerShadowVisible: false,
          }}
        />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Movies',
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
          headerLargeTitle: true,
          headerLargeTitleStyle: { color: Colors.text },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />
        }
      >
        <View style={styles.sections}>
          <ContentRow title="Popular" data={popular} type="movie" />
          <ContentRow title="Top Rated" data={topRated} type="movie" />
          <ContentRow title="Now Playing" data={nowPlaying} type="movie" />
          <ContentRow title="Upcoming" data={upcoming} type="movie" />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loader: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sections: {
    paddingTop: Spacing.md,
  },
});
