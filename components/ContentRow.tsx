import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Movie } from '@/types';
import { img } from '@/lib/tmdb';
import { C, S, R, Layout, T } from '@/lib/design';
import { memo } from 'react';

const CARD_W = Layout.cardW;
const CARD_H = Layout.cardH;
const GAP = S.rowGap;

interface Props {
  title: string;
  data: Movie[];
  type?: 'movie' | 'tv';
}

const Card = memo(({ item, type }: { item: Movie; type: string }) => {
  const router = useRouter();
  const mediaType =
    type || (item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie');

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/${mediaType}/${item.id}` as any);
      }}
      style={({ pressed }) => [
        st.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Image
        source={{ uri: img(item.poster_path, 'w342')! }}
        style={st.poster}
        contentFit="cover"
        transition={200}
        recyclingKey={`p-${item.id}`}
      />
    </Pressable>
  );
});

export default function ContentRow({ title, data, type }: Props) {
  if (!data?.length) return null;

  return (
    <View style={st.container}>
      <Text style={st.title}>{title}</Text>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: S.screen, gap: GAP }}
        keyExtractor={(i) => `${i.id}`}
        renderItem={({ item }) => <Card item={item} type={type || ''} />}
        snapToInterval={CARD_W + GAP}
        decelerationRate="fast"
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { marginBottom: S.sectionGap },
  title: {
    ...T.sectionTitle,
    paddingHorizontal: S.screen,
    marginBottom: S.sm,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: R.sm,
    overflow: 'hidden',
    backgroundColor: C.surface,
  },
  poster: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: R.sm,
  },
});
