import { useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { C, S, T, TVFocus, isTV } from '@/lib/design';
import { ChannelCategory, Channel } from '@/types';

const GAP = isTV ? 12 : 10;

interface Props {
  categories: ChannelCategory[];
}

function ChannelCard({ channel, isFirst, cardSize }: { channel: Channel; isFirst: boolean; cardSize: number }) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={() => {
        if (!isTV) Haptics.selectionAsync();
        router.push(`/channel/${channel.id}` as any);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...(isTV && isFirst ? { hasTVPreferredFocus: true } : {})}
      style={({ pressed }) => [
        st.card,
        { width: cardSize, height: cardSize },
        pressed && !isTV && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        isTV && focused && st.cardFocused,
      ]}
    >
      {channel.logo ? (
        <Image
          source={{ uri: channel.logo }}
          style={{ width: cardSize * 0.55, height: cardSize * 0.55 }}
          contentFit="contain"
          transition={150}
          recyclingKey={`ch-${channel.id}`}
        />
      ) : (
        <Text style={st.initials}>{channel.name.slice(0, 2).toUpperCase()}</Text>
      )}
      {isTV && (
        <Text style={st.channelName} numberOfLines={1}>{channel.name}</Text>
      )}
    </Pressable>
  );
}

export default function ChannelGrid({ categories }: Props) {
  const { width } = useWindowDimensions();
  const cols = isTV ? 8 : 3;
  const cardSize = (width - S.screen * 2 - GAP * (cols - 1)) / cols;

  return (
    <View>
      {categories.map((cat, catIdx) => (
        <View key={cat.name} style={st.section}>
          <Text style={st.title}>{cat.name}</Text>
          <FlatList
            data={cat.channels}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: S.screen, gap: GAP }}
            keyExtractor={(ch) => ch.id}
            renderItem={({ item, index }) => (
              <ChannelCard channel={item} isFirst={catIdx === 0 && index === 0} cardSize={cardSize} />
            )}
          />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  section: { marginBottom: isTV ? 28 : 24 },
  title: {
    ...T.sectionTitle,
    paddingHorizontal: S.screen,
    marginBottom: isTV ? 12 : 10,
  },
  card: {
    borderRadius: isTV ? 16 : 14,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: isTV ? TVFocus.borderWidth : 0,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: TVFocus.borderColor,
    transform: [{ scale: TVFocus.scale }],
  },
  channelName: {
    color: C.text3,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  initials: {
    fontSize: isTV ? 22 : 20,
    fontWeight: '800',
    color: C.text3,
  },
});
