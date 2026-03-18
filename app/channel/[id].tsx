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
import { ChevronLeft, Play, Pause, Heart, Maximize, Minimize } from 'lucide-react-native';
import { fetchChannels } from '@/lib/channels';
import { toggleFavoriteChannel, isFavoriteChannel } from '@/lib/channelFavorites';
import { C, S, isTV } from '@/lib/design';
import { useTVRemote } from '@/lib/tv';
import ChannelNumberInput from '@/components/ChannelNumberInput';
import { Channel } from '@/types';

const STRIP_LOGO = isTV ? 64 : 44;
const CONTROLS_TIMEOUT = 5000;

function StripItem({ item, isActive, onPress }: { item: Channel; isActive: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        st.stripItem,
        isActive && st.stripItemActive,
        focused && st.stripItemFocused,
      ]}
    >
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={st.stripLogo} contentFit="contain" cachePolicy="memory-disk" />
      ) : (
        <View style={[st.stripLogo, st.stripFallback]}>
          <Text style={st.stripInitial}>{item.name.slice(0, 2)}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ChannelPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [fillScreen, setFillScreen] = useState(false);

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(
    channel ? { uri: channel.stream_url } : null,
    (p) => { p.play(); }
  );

  const switchChannel = useCallback((ch: Channel) => {
    if (!isTV) Haptics.selectionAsync();
    setChannel(ch);
    setPaused(false);
    player.replace({ uri: ch.stream_url });
    player.play();
    isFavoriteChannel(ch.id).then(setIsFav);
    // Show controls briefly then hide
    showControlsBriefly();
  }, [player]);

  useEffect(() => {
    fetchChannels().then((cats) => {
      const flat = cats.flatMap(c => c.channels);
      setAllChannels(flat);
      const found = flat.find(ch => ch.id === id) || null;
      setChannel(found);
      if (found) isFavoriteChannel(found.id).then(setIsFav);
      setLoading(false);
      // Auto-hide controls after initial load
      startHideTimer();
    }).catch(() => setLoading(false));
  }, [id]);

  // TV Remote: any D-pad press shows controls, then auto-hides
  useTVRemote({
    onSelect: () => {
      if (!showControls) { showControlsBriefly(); return; }
      if (paused) { player.play(); } else { player.pause(); }
      setPaused(!paused);
    },
    onPlayPause: () => {
      if (paused) { player.play(); } else { player.pause(); }
      setPaused(!paused);
      showControlsBriefly();
    },
    onLeft: () => {
      if (!showControls) { showControlsBriefly(); return; }
      const idx = channel ? allChannels.findIndex(ch => ch.id === channel.id) : -1;
      if (idx > 0) switchChannel(allChannels[idx - 1]);
    },
    onRight: () => {
      if (!showControls) { showControlsBriefly(); return; }
      const idx = channel ? allChannels.findIndex(ch => ch.id === channel.id) : -1;
      if (idx >= 0 && idx < allChannels.length - 1) switchChannel(allChannels[idx + 1]);
    },
    onUp: () => {
      if (!showControls) { showControlsBriefly(); return; }
      setFillScreen(f => !f);
    },
    onDown: () => {
      if (!showControls) { showControlsBriefly(); return; }
      showControlsBriefly(); // Reset timer when interacting
    },
    onBack: () => router.back(),
  });

  const startHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setShowControls(false);
    }, CONTROLS_TIMEOUT);
  };

  const showControlsBriefly = () => {
    setShowControls(true);
    Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    startHideTimer();
  };

  const toggleControls = () => {
    if (showControls) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(controlsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      setShowControls(false);
    } else {
      showControlsBriefly();
    }
  };

  const togglePause = () => {
    if (paused) { player.play(); } else { player.pause(); }
    setPaused(!paused);
    if (!isTV) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showControlsBriefly();
  };

  const toggleFav = async () => {
    if (!channel) return;
    const nowFav = await toggleFavoriteChannel(channel.id);
    setIsFav(nowFav);
    if (!isTV) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <ChannelNumberInput allChannels={allChannels} navigate={false} onSwitch={switchChannel} />
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />

      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={fillScreen ? 'cover' : 'contain'}
        nativeControls={false}
      />

      {/* Tap/click area */}
      <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls}>
        <Animated.View style={[st.overlay, { opacity: controlsOpacity }]} pointerEvents={showControls ? 'auto' : 'none'}>
          {/* Top bar */}
          <View style={[st.overlayTop, { paddingTop: isTV ? 24 : insets.top + 4 }]}>
            {!isTV && (
              <Pressable onPress={() => router.back()} hitSlop={12} style={st.iconBtn}>
                <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
              </Pressable>
            )}
            <Text style={st.channelName} numberOfLines={1}>
              {currentIndex >= 0 ? `${currentIndex + 1}. ` : ''}{channel.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable onPress={() => { setFillScreen(f => !f); showControlsBriefly(); }} hitSlop={12} style={st.iconBtn}>
                {fillScreen
                  ? <Minimize size={isTV ? 24 : 18} color="#fff" strokeWidth={2} />
                  : <Maximize size={isTV ? 24 : 18} color="#fff" strokeWidth={2} />
                }
              </Pressable>
              {!isTV && (
                <Pressable onPress={toggleFav} hitSlop={12} style={st.iconBtn}>
                  <Heart size={20} color={isFav ? C.accent : '#fff'} fill={isFav ? C.accent : 'transparent'} strokeWidth={2} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Center play/pause */}
          {paused && (
            <Pressable onPress={togglePause} style={st.centerBtn}>
              <Play size={isTV ? 48 : 36} color="#fff" fill="#fff" />
            </Pressable>
          )}

          {/* Bottom channel strip */}
          <View style={[st.overlayBottom, { paddingBottom: isTV ? 24 : insets.bottom || 12 }]}>
            <FlatList
              data={allChannels}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(ch) => ch.id}
              contentContainerStyle={{ paddingHorizontal: S.screen, gap: isTV ? 16 : 10 }}
              initialNumToRender={20}
              maxToRenderPerBatch={30}
              windowSize={5}
              {...(currentIndex > 0 && allChannels.length > 0 ? {
                initialScrollIndex: currentIndex,
                getItemLayout: (_, index) => ({
                  length: STRIP_LOGO + (isTV ? 16 : 10),
                  offset: (STRIP_LOGO + (isTV ? 16 : 10)) * index,
                  index,
                }),
              } : {})}
              renderItem={({ item }) => (
                <StripItem
                  item={item}
                  isActive={item.id === channel.id}
                  onPress={() => switchChannel(item)}
                />
              )}
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
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  overlayTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: isTV ? 48 : 8,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  channelName: {
    flex: 1, textAlign: 'center',
    color: '#fff', fontSize: isTV ? 24 : 16, fontWeight: '600',
  },
  centerBtn: {
    alignSelf: 'center',
    width: isTV ? 96 : 72, height: isTV ? 96 : 72, borderRadius: isTV ? 48 : 36,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  overlayBottom: {
    backgroundColor: 'rgba(0,0,0,0.6)', paddingTop: 12, paddingBottom: 4,
  },
  stripItem: {
    width: STRIP_LOGO, height: STRIP_LOGO,
    borderRadius: isTV ? 14 : 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden', borderWidth: 2, borderColor: 'transparent',
  },
  stripItemActive: { borderColor: C.accent },
  stripItemFocused: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
  stripLogo: { width: '100%', height: '100%' },
  stripFallback: { justifyContent: 'center', alignItems: 'center' },
  stripInitial: { color: '#fff', fontSize: isTV ? 16 : 12, fontWeight: '700' },
});
