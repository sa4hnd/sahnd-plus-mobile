import { useRef } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';

interface Props {
  uri: string;
  title?: string;
  subtitle?: string;
  startAt?: number;
  headers?: Record<string, string>;
  onProgress?: (sec: number, dur: number) => void;
  onComplete?: () => void;
  onBack?: () => void;
}

export default function SahndPlayer({
  uri, title, subtitle, startAt = 0, headers,
  onProgress, onComplete, onBack,
}: Props) {
  const seekedRef = useRef(false);
  const playAttempted = useRef(false);

  // On Android with proxied URLs, don't send any headers
  const sourceHeaders = Platform.OS === 'android' ? undefined : (
    headers && Object.keys(headers).length > 0 ? headers : { Referer: 'https://vixsrc.to/' }
  );

  const source = sourceHeaders
    ? { uri, headers: sourceHeaders }
    : { uri };

  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  // Seek to saved position once ready, and ensure playback on Android
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      if (startAt > 5 && !seekedRef.current) {
        seekedRef.current = true;
        player.currentTime = startAt;
      }
      // Android sometimes doesn't auto-play — force it
      if (!playAttempted.current) {
        playAttempted.current = true;
        player.play();
      }
    }
  });

  // Track progress
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (player.duration > 0) {
      onProgress?.(currentTime, player.duration);
    }
  });

  // Handle playback end
  useEventListener(player, 'playToEnd', () => {
    onComplete?.();
  });

  return (
    <View style={st.wrap}>
      <VideoView
        player={player}
        style={st.video}
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
        nativeControls
      />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
});
