import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/lib/theme';
import {
  trending,
  popularMovies,
  nowPlayingMovies,
  popularTV,
  topRatedTV,
  img,
} from '@/lib/tmdb';
import { getContinueWatching } from '@/lib/storage';
import ContentRow from '@/components/ContentRow';
import HeroBanner from '@/components/HeroBanner';
import { Movie, WatchHistoryItem } from '@/types';

const { width: SCREEN } = Dimensions.get('window');
const CW_CARD_W = SCREEN * 0.42;
const CW_CARD_H = CW_CARD_W * 0.56;

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trendingData, setTrendingData] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [tvPopular, setTvPopular] = useState<Movie[]>([]);
  const [tvTopRated, setTvTopRated] = useState<Movie[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [trendRes, popRes, npRes, tvPopRes, tvTrRes, cwRes] = await Promise.all([
        trending('week'),
        popularMovies(),
        nowPlayingMovies(),
        popularTV(),
        topRatedTV(),
        getContinueWatching(),
      ]);

      setTrendingData(trendRes.results ?? []);
      setPopular(popRes.results ?? []);
      setNowPlaying(npRes.results ?? []);
      setTvPopular(tvPopRes.results ?? []);
      setTvTopRated(tvTrRes.results ?? []);
      setContinueWatching(cwRes);
    } catch (err) {
      console.error('Home fetch error:', err);
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
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const heroItem = trendingData[0];

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />
        }
      >
        {/* Logo */}
        <SafeAreaView edges={['top']} style={styles.logoContainer}>
          <Image
            source={require('@/assets/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </SafeAreaView>

        {/* Hero */}
        {heroItem && <HeroBanner movie={heroItem} />}

        <View style={styles.sections}>
          {/* Continue Watching */}
          {continueWatching.length > 0 && (
            <View style={styles.cwSection}>
              <Text style={styles.sectionTitle}>Continue Watching</Text>
              <FlatList
                data={continueWatching}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
                keyExtractor={(item) => `cw-${item.id}-${item.type}`}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => router.push(`/${item.type}/${item.id}` as any)}
                    style={({ pressed }) => [
                      styles.cwCard,
                      pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Image
                      source={{ uri: img(item.backdrop_path || item.poster_path, 'w500')! }}
                      style={styles.cwImage}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.cwOverlay}>
                      <Text style={styles.cwTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.season != null && item.episode != null && (
                        <Text style={styles.cwMeta}>
                          S{item.season} E{item.episode}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                )}
              />
            </View>
          )}

          {/* Content rows */}
          <ContentRow title="Trending This Week" data={trendingData.slice(1)} />
          <ContentRow title="Popular Movies" data={popular} type="movie" />
          <ContentRow title="Now Playing" data={nowPlaying} type="movie" />
          <ContentRow title="Popular TV Shows" data={tvPopular} type="tv" />
          <ContentRow title="Top Rated TV" data={tvTopRated} type="tv" />
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
  logoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  logo: {
    width: 120,
    height: 40,
  },
  sections: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cwSection: {
    marginBottom: Spacing.lg,
  },
  cwCard: {
    width: CW_CARD_W,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.elevated,
  },
  cwImage: {
    width: CW_CARD_W,
    height: CW_CARD_H,
  },
  cwOverlay: {
    padding: Spacing.sm,
  },
  cwTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  cwMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
