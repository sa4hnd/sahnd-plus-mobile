import { View, Text, Pressable, FlatList, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Movie } from '@/types';
import { img } from '@/lib/tmdb';
import { Colors, Radius, Spacing } from '@/lib/theme';
import { memo, useRef } from 'react';

const { width: SCREEN } = Dimensions.get('window');
const CARD_W = SCREEN * 0.38;
const CARD_H = CARD_W * 1.5;

interface Props {
  title: string;
  data: Movie[];
  type?: 'movie' | 'tv';
}

const Card = memo(({ item, type }: { item: Movie; type: string }) => {
  const router = useRouter();
  const mediaType = type || (item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie');

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/${mediaType}/${item.id}` as any);
      }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
    >
      <Image
        source={{ uri: img(item.poster_path, 'w342')! }}
        style={styles.poster}
        contentFit="cover"
        transition={200}
        recyclingKey={`poster-${item.id}`}
      />
      {item.vote_average > 0 && (
        <View style={styles.rating}>
          <Text style={styles.ratingText}>★ {item.vote_average.toFixed(1)}</Text>
        </View>
      )}
    </Pressable>
  );
});

export default function ContentRow({ title, data, type }: Props) {
  const listRef = useRef<FlatList>(null);
  if (!data?.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        ref={listRef}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
        keyExtractor={i => `${i.id}`}
        renderItem={({ item }) => <Card item={item} type={type || ''} />}
        snapToInterval={CARD_W + Spacing.sm}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
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
    borderRadius: Radius.lg,
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
});
