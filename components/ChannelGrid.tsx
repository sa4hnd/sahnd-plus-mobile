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

function ChannelCard({ channel, isFirst, cardSize, number }: { channel: Channel; isFirst: boolean; cardSize: number; number: number }) {
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
        { width: cardSize, height: cardSize + (isTV ? 28 : 0) },
        pressed && !isTV && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        isTV && focused && st.cardFocused,
      ]}
    >
      {/* Channel number badge */}
      <View style={st.numberBadge}>
        <Text style={st.numberText}>{number}</Text>
      </View>

      {channel.logo ? (
        <Image
          source={{ uri: channel.logo }}
          style={{ width: cardSize * 0.5, height: cardSize * 0.5 }}
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
  // Aim for ~100px cards, min 3 cols mobile / 6 TV
  const targetSize = isTV ? 110 : 100;
  const cols = Math.max(3, Math.floor((width - S.screen * 2) / (targetSize + GAP)));
  const cardSize = (width - S.screen * 2 - GAP * (cols - 1)) / cols;

  // Build global channel numbering
  let globalIndex = 1;
  const numberedCategories = categories.map(cat => ({
    ...cat,
    channels: cat.channels.map(ch => ({ ...ch, _number: globalIndex++ })),
  }));

  return (
    <View>
      {numberedCategories.map((cat, catIdx) => (
        <View key={cat.name} style={st.section}>
          <Text style={st.title}>{cat.name}</Text>
          <FlatList
            data={cat.channels}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: S.screen, gap: GAP }}
            keyExtractor={(ch) => ch.id}
            renderItem={({ item, index }) => (
              <ChannelCard
                channel={item}
                isFirst={catIdx === 0 && index === 0}
                cardSize={cardSize}
                number={(item as any)._number}
              />
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
  numberBadge: {
    position: 'absolute',
    top: isTV ? 6 : 4,
    left: isTV ? 8 : 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: isTV ? 8 : 5,
    paddingVertical: isTV ? 3 : 2,
    borderRadius: 6,
    zIndex: 1,
  },
  numberText: {
    color: '#fff',
    fontSize: isTV ? 13 : 10,
    fontWeight: '700',
    opacity: 0.8,
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
