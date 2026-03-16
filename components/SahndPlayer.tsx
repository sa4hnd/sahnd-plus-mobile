import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, ActivityIndicator, Animated, StatusBar } from 'react-native';
import Video, { TextTrackType, SelectedTrackType, ResizeMode } from 'react-native-video';
import { Play, Pause, SkipForward, SkipBack, Maximize, Minimize, Captions, Settings, ChevronLeft, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface PlayerProps {
  uri: string;
  title?: string;
  subtitle?: string; // e.g. "S1 · E3 · Episode Name"
  startAt?: number; // seconds to resume from
  onProgress?: (seconds: number, duration: number) => void;
  onComplete?: () => void;
  onBack?: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
}

export default function SahndPlayer({
  uri, title, subtitle, startAt = 0,
  onProgress, onComplete, onBack, onNextEpisode, hasNextEpisode,
}: PlayerProps) {
  const videoRef = useRef<any>(null);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showCCPicker, setShowCCPicker] = useState(false);
  const [textTracks, setTextTracks] = useState<any[]>([]);
  const [selectedCC, setSelectedCC] = useState<number | null>(null);
  const [seekValue, setSeekValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // Auto-hide controls after 4s
  useEffect(() => {
    if (showControls && !paused && !showSpeedPicker && !showCCPicker) {
      controlsTimer.current = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setShowControls(false));
      }, 4000);
    }
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [showControls, paused, showSpeedPicker, showCCPicker]);

  const toggleControls = () => {
    if (showControls) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowControls(false));
    } else {
      setShowControls(true);
      fadeAnim.setValue(1);
    }
    setShowSpeedPicker(false);
    setShowCCPicker(false);
  };

  const handleProgress = useCallback((data: any) => {
    if (!isSeeking) {
      setCurrentTime(data.currentTime);
      setSeekValue(data.currentTime);
    }
    onProgress?.(data.currentTime, data.seekableDuration || duration);
  }, [isSeeking, duration, onProgress]);

  const handleLoad = useCallback((data: any) => {
    setDuration(data.duration);
    setBuffering(false);
    if (data.textTracks) setTextTracks(data.textTracks);
    // Resume from saved position
    if (startAt > 10 && videoRef.current) {
      videoRef.current.seek(startAt);
    }
  }, [startAt]);

  const seekBy = (seconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = Math.max(0, Math.min(currentTime + seconds, duration));
    videoRef.current?.seek(target);
    setCurrentTime(target);
    setSeekValue(target);
  };

  const seekTo = (pct: number) => {
    const target = pct * duration;
    videoRef.current?.seek(target);
    setCurrentTime(target);
    setSeekValue(target);
    setIsSeeking(false);
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? (isSeeking ? seekValue : currentTime) / duration : 0;

  return (
    <View style={[st.container, fullscreen && st.fullscreen]}>
      <StatusBar hidden={fullscreen} />

      {/* Video */}
      <Video
        ref={videoRef}
        source={{ uri, headers: { Referer: 'https://vixsrc.to/' } }}
        style={st.video}
        resizeMode={ResizeMode.CONTAIN}
        paused={paused}
        rate={playbackRate}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onEnd={() => { onComplete?.(); }}
        onBuffer={({ isBuffering }: any) => setBuffering(isBuffering)}
        selectedTextTrack={selectedCC !== null ? { type: SelectedTrackType.INDEX, value: selectedCC } : { type: SelectedTrackType.DISABLED, value: 0 }}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
      />

      {/* Tap area */}
      <Pressable onPress={toggleControls} style={StyleSheet.absoluteFill} />

      {/* Buffering */}
      {buffering && (
        <View style={st.bufferOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {/* Controls overlay */}
      {showControls && (
        <Animated.View style={[st.controlsOverlay, { opacity: fadeAnim }]}>
          {/* Top bar */}
          <View style={st.topBar}>
            <Pressable onPress={onBack} hitSlop={12} style={st.iconBtn}>
              <ChevronLeft size={26} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <View style={st.topCenter}>
              {title && <Text style={st.topTitle} numberOfLines={1}>{title}</Text>}
              {subtitle && <Text style={st.topSubtitle} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Center controls */}
          <View style={st.centerControls}>
            <Pressable onPress={() => seekBy(-10)} style={st.seekBtn}>
              <RotateCcw size={28} color="#fff" strokeWidth={2} />
              <Text style={st.seekLabel}>10</Text>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPaused(!paused); }}
              style={st.playBtn}
            >
              {paused ? <Play size={36} color="#fff" fill="#fff" strokeWidth={0} /> : <Pause size={36} color="#fff" fill="#fff" strokeWidth={0} />}
            </Pressable>

            <Pressable onPress={() => seekBy(10)} style={st.seekBtn}>
              <RotateCcw size={28} color="#fff" strokeWidth={2} style={{ transform: [{ scaleX: -1 }] }} />
              <Text style={st.seekLabel}>10</Text>
            </Pressable>
          </View>

          {/* Bottom bar */}
          <View style={st.bottomBar}>
            {/* Progress bar */}
            <View style={st.progressRow}>
              <Text style={st.timeText}>{formatTime(isSeeking ? seekValue : currentTime)}</Text>
              <View style={st.progressTrack}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={(e) => {
                    const pct = e.nativeEvent.locationX / (SCREEN_W - 120);
                    seekTo(Math.max(0, Math.min(1, pct)));
                  }}
                >
                  <View style={[st.progressFill, { width: `${progressPct * 100}%` }]} />
                  <View style={[st.progressThumb, { left: `${progressPct * 100}%` }]} />
                </Pressable>
              </View>
              <Text style={st.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Bottom buttons */}
            <View style={st.bottomBtns}>
              {/* CC */}
              <Pressable onPress={() => { setShowCCPicker(!showCCPicker); setShowSpeedPicker(false); }} style={[st.smallBtn, selectedCC !== null && st.smallBtnActive]}>
                <Captions size={18} color={selectedCC !== null ? '#000' : '#fff'} strokeWidth={2} />
              </Pressable>

              {/* Speed */}
              <Pressable onPress={() => { setShowSpeedPicker(!showSpeedPicker); setShowCCPicker(false); }} style={[st.smallBtn, playbackRate !== 1.0 && st.smallBtnActive]}>
                <Text style={[st.speedText, playbackRate !== 1.0 && { color: '#000' }]}>{playbackRate}x</Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              {/* Next Episode */}
              {hasNextEpisode && (
                <Pressable onPress={() => { Haptics.selectionAsync(); onNextEpisode?.(); }} style={st.nextEpBtn}>
                  <Text style={st.nextEpText}>Next</Text>
                  <SkipForward size={16} color="#fff" strokeWidth={2} />
                </Pressable>
              )}

              {/* Fullscreen */}
              <Pressable onPress={() => setFullscreen(!fullscreen)} style={st.smallBtn}>
                {fullscreen ? <Minimize size={18} color="#fff" strokeWidth={2} /> : <Maximize size={18} color="#fff" strokeWidth={2} />}
              </Pressable>
            </View>
          </View>

          {/* Speed Picker */}
          {showSpeedPicker && (
            <View style={st.picker}>
              <Text style={st.pickerTitle}>Playback Speed</Text>
              {speeds.map(spd => (
                <Pressable
                  key={spd}
                  onPress={() => { Haptics.selectionAsync(); setPlaybackRate(spd); setShowSpeedPicker(false); }}
                  style={[st.pickerItem, playbackRate === spd && st.pickerItemActive]}
                >
                  <Text style={[st.pickerItemText, playbackRate === spd && st.pickerItemTextActive]}>
                    {spd === 1.0 ? 'Normal' : `${spd}x`}
                  </Text>
                  {playbackRate === spd && <View style={st.pickerDot} />}
                </Pressable>
              ))}
            </View>
          )}

          {/* CC Picker */}
          {showCCPicker && (
            <View style={st.picker}>
              <Text style={st.pickerTitle}>Subtitles</Text>
              <Pressable
                onPress={() => { setSelectedCC(null); setShowCCPicker(false); }}
                style={[st.pickerItem, selectedCC === null && st.pickerItemActive]}
              >
                <Text style={[st.pickerItemText, selectedCC === null && st.pickerItemTextActive]}>Off</Text>
                {selectedCC === null && <View style={st.pickerDot} />}
              </Pressable>
              {textTracks.map((track, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => { Haptics.selectionAsync(); setSelectedCC(idx); setShowCCPicker(false); }}
                  style={[st.pickerItem, selectedCC === idx && st.pickerItemActive]}
                >
                  <Text style={[st.pickerItemText, selectedCC === idx && st.pickerItemTextActive]}>
                    {track.title || track.language || `Track ${idx + 1}`}
                  </Text>
                  {selectedCC === idx && <View style={st.pickerDot} />}
                </Pressable>
              ))}
              {textTracks.length === 0 && (
                <Text style={st.pickerEmpty}>No subtitles available</Text>
              )}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  fullscreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, aspectRatio: undefined },
  video: { width: '100%', height: '100%' },
  bufferOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingHorizontal: 8, backgroundColor: 'rgba(0,0,0,0.4)' },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  topSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 },

  // Center
  centerControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40 },
  seekBtn: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
  seekLabel: { color: '#fff', fontSize: 10, fontWeight: '700', position: 'absolute', bottom: 8 },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  // Bottom
  bottomBar: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontVariant: ['tabular-nums'], width: 50, textAlign: 'center' },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'visible', justifyContent: 'center' },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  progressThumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.accent, top: -5, marginLeft: -7 },
  bottomBtns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallBtn: { height: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  smallBtnActive: { backgroundColor: '#fff' },
  speedText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  nextEpBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  nextEpText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Pickers
  picker: {
    position: 'absolute', bottom: 80, right: 16,
    backgroundColor: 'rgba(20,20,20,0.95)', borderRadius: 12,
    padding: 8, minWidth: 160, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pickerTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 8 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  pickerItemActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  pickerItemText: { color: '#fff', fontSize: 14 },
  pickerItemTextActive: { color: Colors.accent, fontWeight: '600' },
  pickerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  pickerEmpty: { color: 'rgba(255,255,255,0.3)', fontSize: 13, paddingHorizontal: 12, paddingVertical: 8 },
});
