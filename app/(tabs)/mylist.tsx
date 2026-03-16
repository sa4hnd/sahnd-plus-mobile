import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { img } from '@/lib/tmdb';
import { getWatchlist, removeFromWatchlist } from '@/lib/storage';
import { WatchlistItem } from '@/types';

const { width: SCREEN } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_GAP = Spacing.sm;
const CARD_W = (SCREEN - Spacing.md * 2 - CARD_GAP) / NUM_COLUMNS;
const CARD_H = CARD_W * 1.5;

export default function MyListScreen() {
  const router = useRouter();
  const [list, setList] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    try {
      const data = await getWatchlist();
      setList(data);
    } catch (e) {
      console.error('MyList load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const handleRemove = useCallback(
    (item: WatchlistItem) => {
      Alert.alert(
        'Remove from List',
        `Remove "${item.title}" from your watchlist?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await removeFromWatchlist(item.id, item.type);
              setList((prev) =>
                prev.filter(
                  (i) => !(i.id === item.id && i.type === item.type)
                )
              );
            },
          },
        ]
      );
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: WatchlistItem }) => (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push(`/${item.type}/${item.id}` as any);
        }}
        onLongPress={() => handleRemove(item)}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Image
          source={{ uri: img(item.poster_path, 'w342')! }}
          style={styles.poster}
          contentFit="cover"
          transition={200}
          recyclingKey={`wl-${item.id}`}
        />
        {item.vote_average > 0 && (
          <View style={styles.rating}>
            <Text style={styles.ratingText}>
              ★ {item.vote_average.toFixed(1)}
            </Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardType}>
            {item.type === 'tv' ? 'Series' : 'Movie'}
          </Text>
        </View>
      </Pressable>
    ),
    [handleRemove, router]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: 'My List',
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
          title: 'My List',
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔖</Text>
          <Text style={styles.emptyTitle}>Your list is empty</Text>
          <Text style={styles.emptySubtitle}>
            Movies and series you add to your list will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          numColumns={NUM_COLUMNS}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  grid: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 60,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_W,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.elevated,
  },
  poster: {
    width: CARD_W,
    height: CARD_H,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  rating: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: Colors.yellow,
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    padding: Spacing.sm,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardType: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
