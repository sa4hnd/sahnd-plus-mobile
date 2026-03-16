import { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';

interface Props {
  uri: string;
  title?: string;
  subtitle?: string;
  startAt?: number;
  onProgress?: (sec: number, dur: number) => void;
  onComplete?: () => void;
  onBack?: () => void;
}

export default function SahndPlayer({
  uri, title, subtitle, startAt = 0,
  onProgress, onComplete, onBack,
}: Props) {
  const seekedRef = useRef(false);

  const player = useVideoPlayer(
    { uri, headers: { Referer: 'https://vixsrc.to/' } },
    (p) => {
      p.timeUpdateEventInterval = 1;
      p.play();
    }
  );

  // Seek to saved position once ready
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' && startAt > 5 && !seekedRef.current) {
      seekedRef.current = true;
      player.currentTime = startAt;
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
