import { View, Text, Pressable, FlatList, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { C, S, T } from '@/lib/design';
import { ChannelCategory, Channel } from '@/types';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - S.screen * 2 - 10 * 2) / 3;
const GAP = 10;

interface Props {
  categories: ChannelCategory[];
}

function ChannelCard({ channel }: { channel: Channel }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/channel/${channel.id}` as any);
      }}
      style={({ pressed }) => [
        st.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
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
      {categories.map((cat) => (
        <View key={cat.name} style={st.section}>
          <Text style={st.title}>{cat.name}</Text>
          <FlatList
            data={cat.channels}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: S.screen, gap: GAP }}
            keyExtractor={(ch) => ch.id}
            renderItem={({ item }) => <ChannelCard channel={item} />}
          />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  section: { marginBottom: 24 },
  title: {
    ...T.sectionTitle,
    paddingHorizontal: S.screen,
    marginBottom: 10,
  },
  card: {
    width: CARD_W,
    height: CARD_W,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: CARD_W * 0.6,
    height: CARD_W * 0.6,
  },
  initials: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text3,
  },
});
