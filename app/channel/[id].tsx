import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet,
  ActivityIndicator, Animated, useWindowDimensions, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Play, Pause, Heart } from 'lucide-react-native';
import { fetchChannels } from '@/lib/channels';
import { toggleFavoriteChannel, isFavoriteChannel } from '@/lib/channelFavorites';
import { C, S, isTV } from '@/lib/design';
import { useTVRemote } from '@/lib/tv';
import { Channel } from '@/types';

const STRIP_LOGO = isTV ? 64 : 44;

// Hook for number input via hardware keyboard/remote
function useNumberInput(onNumber: (num: number) => void) {
  const [digits, setDigits] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!digits) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const num = parseInt(digits, 10);
      if (num > 0) onNumber(num);
      setDigits('');
    }, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [digits, onNumber]);

  const handleKey = useCallback((e: any) => {
    const key = e?.nativeEvent?.key || '';
    if (/^[0-9]$/.test(key)) {
      setDigits(prev => prev + key);
    }
  }, []);

  return { digits, handleKey };
}

export default function ChannelPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(isTV); // Always show on TV
  const [isFav, setIsFav] = useState(false);
  const { width: screenW, height: screenH } = useWindowDimensions();

  const controlsOpacity = useRef(new Animated.Value(isTV ? 1 : 0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyInputRef = useRef<any>(null);

  const player = useVideoPlayer(
    channel ? { uri: channel.stream_url } : null,
    (p) => { p.play(); }
  );

  const switchChannel = useCallback((ch: Channel) => {
    if (!isTV) Haptics.selectionAsync();
    setChannel(ch);
    setPaused(false);
    if (!isTV) hideControlsNow();
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

  // TV Remote controls
  useTVRemote({
    onSelect: () => {
      if (paused) { player.play(); } else { player.pause(); }
      setPaused(!paused);
    },
    onPlayPause: () => {
      if (paused) { player.play(); } else { player.pause(); }
      setPaused(!paused);
    },
    onLeft: () => {
      const idx = channel ? allChannels.findIndex(ch => ch.id === channel.id) : -1;
      if (idx > 0) switchChannel(allChannels[idx - 1]);
    },
    onRight: () => {
      const idx = channel ? allChannels.findIndex(ch => ch.id === channel.id) : -1;
      if (idx >= 0 && idx < allChannels.length - 1) switchChannel(allChannels[idx + 1]);
    },
    onBack: () => {
      router.back();
    },
  });

  const hideControlsNow = () => {
    if (isTV) return; // Never hide on TV
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(controlsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    setShowControls(false);
  };

  const toggleControls = () => {
    if (isTV) return; // Always visible on TV
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
    if (!isTV) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isTV) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(hideControlsNow, 5000);
    }
  };

  const toggleFav = async () => {
    if (!channel) return;
    const nowFav = await toggleFavoriteChannel(channel.id);
    setIsFav(nowFav);
    if (!isTV) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const currentIndex = channel ? allChannels.findIndex(ch => ch.id === channel.id) : -1;

  // Number input: type digits on remote to jump to channel
  const handleNumberInput = useCallback((num: number) => {
    const idx = num - 1; // Channel 1 = index 0
    if (idx >= 0 && idx < allChannels.length) {
      switchChannel(allChannels[idx]);
    }
  }, [allChannels, switchChannel]);

  const { digits: typedDigits, handleKey } = useNumberInput(handleNumberInput);

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
      {/* Hidden TextInput to capture number key presses */}
      <TextInput
        ref={keyInputRef}
        autoFocus
        style={st.hiddenInput}
        keyboardType="number-pad"
        caretHidden
        onKeyPress={handleKey}
        onChangeText={(text) => {
          // Also handle onChangeText for devices that don't fire onKeyPress
          const last = text.slice(-1);
          if (/^[0-9]$/.test(last)) handleKey({ nativeEvent: { key: last } });
        }}
        value=""
        blurOnSubmit={false}
      />
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />

      <Pressable style={st.playerArea} onPress={toggleControls}>
        {/* Number input OSD */}
        {typedDigits ? (
          <View style={st.numberOSD}>
            <Text style={st.numberOSDText}>{typedDigits}</Text>
            <Text style={st.numberOSDSub}>
              {(() => {
                const idx = parseInt(typedDigits, 10) - 1;
                return idx >= 0 && idx < allChannels.length ? allChannels[idx].name : '';
              })()}
            </Text>
          </View>
        ) : null}
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
          <View style={[st.overlayTop, { paddingTop: isTV ? 24 : insets.top + 4 }]}>
            {!isTV && (
              <Pressable onPress={() => router.back()} hitSlop={12} style={st.iconBtn}>
                <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
              </Pressable>
            )}
            <Text style={st.channelName} numberOfLines={1}>{channel.name}</Text>
            {!isTV && (
              <Pressable onPress={toggleFav} hitSlop={12} style={st.iconBtn}>
                <Heart
                  size={20}
                  color={isFav ? C.accent : '#fff'}
                  fill={isFav ? C.accent : 'transparent'}
                  strokeWidth={2}
                />
              </Pressable>
            )}
          </View>

          {/* Center play/pause — only on mobile or when paused on TV */}
          {(!isTV || paused) && (
            <Pressable onPress={togglePause} style={st.centerBtn}>
              {paused ? (
                <Play size={isTV ? 48 : 36} color="#fff" fill="#fff" />
              ) : (
                <Pause size={isTV ? 48 : 36} color="#fff" fill="#fff" />
              )}
            </Pressable>
          )}

          {/* Bottom: channel strip — always visible on TV */}
          <View style={[st.overlayBottom, { paddingBottom: isTV ? 24 : insets.bottom || 12 }]}>
            <FlatList
              data={allChannels}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(ch) => ch.id}
              contentContainerStyle={{ paddingHorizontal: S.screen, gap: isTV ? 16 : 10 }}
              initialScrollIndex={Math.max(0, currentIndex)}
              getItemLayout={(_, index) => ({
                length: STRIP_LOGO + (isTV ? 16 : 10),
                offset: (STRIP_LOGO + (isTV ? 16 : 10)) * index,
                index,
              })}
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
    paddingHorizontal: isTV ? 48 : 8,
    backgroundColor: isTV ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.5)',
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  channelName: {
    flex: 1, textAlign: 'center',
    color: '#fff', fontSize: isTV ? 24 : 16, fontWeight: '600',
  },
  centerBtn: {
    alignSelf: 'center',
    width: isTV ? 96 : 72, height: isTV ? 96 : 72, borderRadius: isTV ? 48 : 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  overlayBottom: {
    backgroundColor: isTV ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)',
    paddingTop: 12,
    paddingBottom: 4,
  },

  stripItem: {
    width: STRIP_LOGO, height: STRIP_LOGO,
    borderRadius: isTV ? 14 : 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  stripItemActive: { borderColor: C.accent },
  stripLogo: { width: '100%', height: '100%' },
  stripFallback: { justifyContent: 'center', alignItems: 'center' },
  stripInitial: { color: '#fff', fontSize: isTV ? 16 : 12, fontWeight: '700' },

  numberOSD: {
    position: 'absolute',
    top: isTV ? 40 : 60,
    right: isTV ? 40 : 16,
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: isTV ? 120 : 80,
  },
  numberOSDText: {
    color: '#fff',
    fontSize: isTV ? 48 : 32,
    fontWeight: '800',
  },
  numberOSDSub: {
    color: C.text2,
    fontSize: isTV ? 16 : 12,
    fontWeight: '600',
    marginTop: 4,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
  },
});
