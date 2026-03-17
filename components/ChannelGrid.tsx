import { useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { C, S, T, TVFocus, isTV } from '@/lib/design';
import { ChannelCategory, Channel } from '@/types';

const { width: SW } = Dimensions.get('window');
const CARD_W = isTV
  ? (SW - S.screen * 2 - 16 * 4) / 5   // 5 cards on TV
  : (SW - S.screen * 2 - 10 * 2) / 3;   // 3 cards on mobile
const GAP = isTV ? 16 : 10;

interface Props {
  categories: ChannelCategory[];
}

function ChannelCard({ channel, isFirst }: { channel: Channel; isFirst: boolean }) {
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
        pressed && !isTV && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        isTV && focused && st.cardFocused,
      ]}
    >
      {channel.logo ? (
        <Image
          source={{ uri: channel.logo }}
          style={st.logo}
          contentFit="contain"
          transition={150}
          recyclingKey={`ch-${channel.id}`}
        />
      ) : (
        <Text style={st.initials}>{channel.name.slice(0, 2).toUpperCase()}</Text>
      )}
    </Pressable>
  );
}

export default function ChannelGrid({ categories }: Props) {
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
              <ChannelCard channel={item} isFirst={catIdx === 0 && index === 0} />
            )}
          />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  section: { marginBottom: isTV ? 40 : 24 },
  title: {
    ...T.sectionTitle,
    paddingHorizontal: S.screen,
    marginBottom: isTV ? 16 : 10,
  },
  card: {
    width: CARD_W,
    height: CARD_W,
    borderRadius: isTV ? 20 : 16,
    backgroundColor: '#1E1E1E',
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
  logo: {
    width: CARD_W * 0.6,
    height: CARD_W * 0.6,
  },
  initials: {
    fontSize: isTV ? 28 : 20,
    fontWeight: '800',
    color: C.text3,
  },
});
