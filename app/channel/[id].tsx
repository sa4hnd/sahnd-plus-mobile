import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet,
  ActivityIndicator, Animated, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Play, Pause, Heart } from 'lucide-react-native';
import { fetchChannels } from '@/lib/channels';
import { toggleFavoriteChannel, isFavoriteChannel } from '@/lib/channelFavorites';
import { C, S } from '@/lib/design';
import { Channel } from '@/types';

const STRIP_LOGO = 44;

export default function ChannelPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const { width: screenW, height: screenH } = useWindowDimensions();

  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(
    channel ? { uri: channel.stream_url } : null,
    (p) => { p.play(); }
  );

  const switchChannel = useCallback((ch: Channel) => {
    Haptics.selectionAsync();
    setChannel(ch);
    setPaused(false);
    hideControlsNow();
    player.replace({ uri: ch.stream_url });
    player.play();
    isFavoriteChannel(ch.id).then(setIsFav);
  }, [player]);

  useEffect(() => {
    fetchChannels().then((cats) => {
      const flat = cats.flatMap(c => c.channels);
      setAllChannels(flat);
      const found = flat.find(ch => ch.id === id) || null;
      setChannel(found);
      if (found) isFavoriteChannel(found.id).then(setIsFav);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const hideControlsNow = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(controlsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    setShowControls(false);
  };

  const toggleControls = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (showControls) {
      hideControlsNow();
    } else {
      setShowControls(true);
      Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(hideControlsNow, 5000);
    }
  };

  const togglePause = () => {
    if (paused) { player.play(); } else { player.pause(); }
    setPaused(!paused);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Reset auto-hide timer
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hideControlsNow, 5000);
  };

  const toggleFav = async () => {
    if (!channel) return;
    const nowFav = await toggleFavoriteChannel(channel.id);
    setIsFav(nowFav);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const currentIndex = channel ? allChannels.findIndex(ch => ch.id === channel.id) : -1;

  if (loading) {
    return (
      <View style={st.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!channel) {
    return (
      <View style={st.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: C.text2 }}>Channel not found</Text>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />

      <Pressable style={st.playerArea} onPress={toggleControls}>
        {/* Video — properly sized for portrait and landscape */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {(() => {
            const isLandscape = screenW > screenH;
            const videoW = isLandscape ? screenH * (16 / 9) : screenW;
            const videoH = isLandscape ? screenH : screenW * (9 / 16);
            return (
              <VideoView
                player={player}
                style={{ width: Math.min(videoW, screenW), height: Math.min(videoH, screenH) }}
                contentFit="contain"
                nativeControls={false}
              />
            );
          })()}
        </View>

        {/* Controls overlay */}
        <Animated.View style={[st.overlay, { opacity: controlsOpacity }]} pointerEvents={showControls ? 'auto' : 'none'}>
          {/* Top */}
          <View style={[st.overlayTop, { paddingTop: insets.top + 4 }]}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={st.iconBtn}>
              <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <Text style={st.channelName} numberOfLines={1}>{channel.name}</Text>
            <Pressable onPress={toggleFav} hitSlop={12} style={st.iconBtn}>
              <Heart
                size={20}
                color={isFav ? C.accent : '#fff'}
                fill={isFav ? C.accent : 'transparent'}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          {/* Center play/pause */}
          <Pressable onPress={togglePause} style={st.centerBtn}>
            {paused ? (
              <Play size={36} color="#fff" fill="#fff" />
            ) : (
              <Pause size={36} color="#fff" fill="#fff" />
            )}
          </Pressable>

          {/* Bottom: masked strip with channel logos */}
          <View style={[st.overlayBottom, { paddingBottom: insets.bottom || 12 }]}>
            <FlatList
              data={allChannels}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(ch) => ch.id}
              contentContainerStyle={{ paddingHorizontal: S.screen, gap: 10 }}
              initialScrollIndex={Math.max(0, currentIndex)}
              getItemLayout={(_, index) => ({ length: STRIP_LOGO + 10, offset: (STRIP_LOGO + 10) * index, index })}
              renderItem={({ item }) => {
                const isActive = item.id === channel.id;
                return (
                  <Pressable onPress={() => switchChannel(item)}>
                    <View style={[st.stripItem, isActive && st.stripItemActive]}>
                      {item.logo ? (
                        <Image source={{ uri: item.logo }} style={st.stripLogo} contentFit="contain" />
                      ) : (
                        <View style={[st.stripLogo, st.stripFallback]}>
                          <Text style={st.stripInitial}>{item.name.slice(0, 2)}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#000' },

  playerArea: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  channelName: {
    flex: 1, textAlign: 'center',
    color: '#fff', fontSize: 16, fontWeight: '600',
  },
  centerBtn: {
    alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  overlayBottom: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 12,
    paddingBottom: 4,
  },

  stripItem: {
    width: STRIP_LOGO, height: STRIP_LOGO,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  stripItemActive: { borderColor: C.accent },
  stripLogo: { width: '100%', height: '100%' },
  stripFallback: { justifyContent: 'center', alignItems: 'center' },
  stripInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
