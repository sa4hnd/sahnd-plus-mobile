import { useState, memo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { C, S, T, isTV } from '@/lib/design';
import { ChannelCategory, Channel } from '@/types';

const GAP = isTV ? 14 : 10;

interface Props {
  categories: ChannelCategory[];
}

const ChannelCard = memo(({ channel, isFirst, cardSize, number }: {
  channel: Channel; isFirst: boolean; cardSize: number; number: number;
}) => {
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
      style={[
        st.card,
        { width: cardSize, height: cardSize + (isTV ? 28 : 0) },
        focused && st.cardFocused,
      ]}
    >
      {/* Channel number */}
      <View style={[st.numberBadge, focused && st.numberBadgeFocused]}>
        <Text style={st.numberText}>{number}</Text>
      </View>

      {channel.logo ? (
        <Image
          source={{ uri: channel.logo }}
          style={{ width: cardSize * 0.5, height: cardSize * 0.5 }}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey={`ch-${channel.id}`}
        />
      ) : (
        <Text style={st.initials}>{channel.name.slice(0, 2).toUpperCase()}</Text>
      )}

      {isTV && (
        <Text style={[st.channelName, focused && st.channelNameFocused]} numberOfLines={1}>
          {channel.name}
        </Text>
      )}
    </Pressable>
  );
});

export default function ChannelGrid({ categories }: Props) {
  const { width } = useWindowDimensions();
  const targetSize = isTV ? 110 : 100;
  const cols = Math.max(3, Math.floor((width - S.screen * 2) / (targetSize + GAP)));
  const cardSize = (width - S.screen * 2 - GAP * (cols - 1)) / cols;

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
    overflow: 'visible',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: C.accent,
    backgroundColor: '#2A2A2A',
    transform: [{ scale: 1.1 }],
    zIndex: 10,
    elevation: 10,
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
  numberBadgeFocused: {
    backgroundColor: C.accent,
  },
  numberText: {
    color: '#fff',
    fontSize: isTV ? 13 : 10,
    fontWeight: '700',
  },
  channelName: {
    color: C.text3,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  channelNameFocused: {
    color: '#fff',
  },
  initials: {
    fontSize: isTV ? 22 : 20,
    fontWeight: '800',
    color: C.text3,
  },
});
