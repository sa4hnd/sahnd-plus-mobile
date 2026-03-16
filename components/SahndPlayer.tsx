import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions,
  ActivityIndicator, Animated, Modal, FlatList, StatusBar,
} from 'react-native';
import Video, { SelectedTrackType, ResizeMode } from 'react-native-video';
import * as Haptics from 'expo-haptics';
import {
  Play, Pause, SkipForward, SkipBack, Maximize, Minimize,
  Captions, ChevronLeft, RotateCcw, Settings, Lock, Unlock,
  Volume2, VolumeX, ChevronDown,
} from 'lucide-react-native';
import { C, S, R, T } from '@/lib/design';

const { width: SW, height: SH } = Dimensions.get('window');

interface PlayerProps {
  uri: string;
  title?: string;
  subtitle?: string;
  startAt?: number;
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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [textTracks, setTextTracks] = useState<any[]>([]);
  const [selectedCC, setSelectedCC] = useState<number | null>(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showCCPicker, setShowCCPicker] = useState(false);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // ── Auto-hide controls ──
  const resetTimer = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    if (!paused && !showSettings && !showSpeedPicker && !showCCPicker) {
      controlsTimer.current = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setShowControls(false));
      }, 4000);
    }
  }, [paused, showSettings, showSpeedPicker, showCCPicker]);

  useEffect(() => {
    if (showControls) resetTimer();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [showControls, paused, resetTimer]);

  const toggleControls = () => {
    if (locked) return;
    if (showControls) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowControls(false));
    } else {
      setShowControls(true);
      fadeAnim.setValue(1);
    }
  };

  // ── Video callbacks ──
  const onLoad = useCallback((data: any) => {
    setDuration(data.duration);
    setBuffering(false);
    if (data.textTracks) setTextTracks(data.textTracks);
    if (startAt > 10) videoRef.current?.seek(startAt);
  }, [startAt]);

  const onVideoProgress = useCallback((data: any) => {
    setCurrentTime(data.currentTime);
    onProgress?.(data.currentTime, data.seekableDuration || duration);
  }, [duration, onProgress]);

  const seek = (sec: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = Math.max(0, Math.min(currentTime + sec, duration));
    videoRef.current?.seek(t);
    setCurrentTime(t);
  };

  const seekTo = (pct: number) => {
    const t = pct * duration;
    videoRef.current?.seek(t);
    setCurrentTime(t);
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = duration > 0 ? currentTime / duration : 0;

  // ── Settings menu items ──
  const settingsItems = [
    { label: 'Speed', value: rate === 1 ? 'Normal' : `${rate}x`, onPress: () => { setShowSettings(false); setShowSpeedPicker(true); } },
    { label: 'Subtitles', value: selectedCC !== null ? 'On' : 'Off', onPress: () => { setShowSettings(false); setShowCCPicker(true); } },
    { label: locked ? 'Unlock Screen' : 'Lock Screen', value: '', onPress: () => { setLocked(!locked); setShowSettings(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
  ];

  return (
    <View style={[st.wrap, fullscreen && st.fullscreen]}>
      <StatusBar hidden={fullscreen} />

      {/* ── Video ── */}
      <Video
        ref={videoRef}
        source={{ uri, headers: { Referer: 'https://vixsrc.to/' } }}
        style={st.video}
        resizeMode={ResizeMode.CONTAIN}
        paused={paused}
        rate={rate}
        muted={muted}
        onLoad={onLoad}
        onProgress={onVideoProgress}
        onEnd={() => onComplete?.()}
        onBuffer={({ isBuffering }: any) => setBuffering(isBuffering)}
        selectedTextTrack={selectedCC !== null ? { type: SelectedTrackType.INDEX, value: selectedCC } : { type: SelectedTrackType.DISABLED, value: 0 }}
        ignoreSilentSwitch="ignore"
      />

      {/* Tap zone */}
      <Pressable onPress={toggleControls} style={StyleSheet.absoluteFill} />

      {/* Buffering spinner */}
      {buffering && (
        <View style={st.bufferWrap}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {/* Lock indicator */}
      {locked && !showControls && (
        <Pressable onPress={() => { setShowControls(true); fadeAnim.setValue(1); }} style={st.lockIndicator}>
          <Lock size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>
      )}

      {/* ── Controls Overlay ── */}
      {showControls && !locked && (
        <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
          {/* Top bar */}
          <View style={st.topBar}>
            <Pressable onPress={onBack} hitSlop={12} style={st.topBtn}>
              <ChevronDown size={28} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <View style={st.topCenter}>
              {title && <Text style={st.topTitle} numberOfLines={1}>{title}</Text>}
              {subtitle && <Text style={st.topSub} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <Pressable onPress={() => { Haptics.selectionAsync(); setShowSettings(true); }} style={st.topBtn}>
              <Settings size={22} color="#fff" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Center controls */}
          <View style={st.center}>
            <Pressable onPress={() => seek(-10)} style={st.seekBtn}>
              <RotateCcw size={32} color="#fff" strokeWidth={1.8} />
              <Text style={st.seekLabel}>10</Text>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPaused(!paused); }}
              style={st.mainPlayBtn}
            >
              {paused
                ? <Play size={40} color="#fff" fill="#fff" strokeWidth={0} />
                : <Pause size={40} color="#fff" fill="#fff" strokeWidth={0} />
              }
            </Pressable>

            <Pressable onPress={() => seek(10)} style={st.seekBtn}>
              <RotateCcw size={32} color="#fff" strokeWidth={1.8} style={{ transform: [{ scaleX: -1 }] }} />
              <Text style={st.seekLabel}>10</Text>
            </Pressable>
          </View>

          {/* Bottom bar */}
          <View style={st.bottom}>
            {/* Progress */}
            <View style={st.progressRow}>
              <Text style={st.time}>{fmt(currentTime)}</Text>
              <Pressable
                style={st.progressTrack}
                onPress={(e) => {
                  const w = fullscreen ? SH - 80 : SW - 120;
                  seekTo(Math.max(0, Math.min(1, e.nativeEvent.locationX / w)));
                }}
              >
                <View style={st.progressBg} />
                <View style={[st.progressFill, { width: `${pct * 100}%` }]} />
                <View style={[st.progressThumb, { left: `${pct * 100}%` }]} />
              </Pressable>
              <Text style={st.time}>{fmt(duration)}</Text>
            </View>

            {/* Bottom buttons */}
            <View style={st.bottomBtns}>
              {/* Mute */}
              <Pressable onPress={() => { Haptics.selectionAsync(); setMuted(!muted); }} style={st.iconBtn}>
                {muted ? <VolumeX size={20} color="#fff" strokeWidth={2} /> : <Volume2 size={20} color="#fff" strokeWidth={2} />}
              </Pressable>

              {/* CC */}
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowCCPicker(true); }}
                style={[st.pillBtn, selectedCC !== null && st.pillBtnActive]}
              >
                <Captions size={16} color={selectedCC !== null ? '#000' : '#fff'} strokeWidth={2} />
              </Pressable>

              {/* Speed */}
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowSpeedPicker(true); }}
                style={[st.pillBtn, rate !== 1.0 && st.pillBtnActive]}
              >
                <Text style={[st.pillText, rate !== 1.0 && { color: '#000' }]}>{rate}x</Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              {/* Next Episode */}
              {hasNextEpisode && (
                <Pressable onPress={() => { Haptics.selectionAsync(); onNextEpisode?.(); }} style={st.nextBtn}>
                  <Text style={st.nextText}>Next</Text>
                  <SkipForward size={16} color="#fff" strokeWidth={2} />
                </Pressable>
              )}

              {/* Fullscreen */}
              <Pressable onPress={() => { Haptics.selectionAsync(); setFullscreen(!fullscreen); }} style={st.iconBtn}>
                {fullscreen ? <Minimize size={20} color="#fff" strokeWidth={2} /> : <Maximize size={20} color="#fff" strokeWidth={2} />}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Settings Modal ── */}
      <Modal visible={showSettings} transparent animationType="fade">
        <Pressable style={st.modalBg} onPress={() => setShowSettings(false)}>
          <View style={st.modalSheet}>
            <Text style={st.modalTitle}>Settings</Text>
            {settingsItems.map((item, i) => (
              <Pressable key={i} onPress={item.onPress} style={st.modalRow}>
                <Text style={st.modalLabel}>{item.label}</Text>
                {item.value ? <Text style={st.modalValue}>{item.value}</Text> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── Speed Picker Modal ── */}
      <Modal visible={showSpeedPicker} transparent animationType="fade">
        <Pressable style={st.modalBg} onPress={() => setShowSpeedPicker(false)}>
          <View style={st.modalSheet}>
            <Text style={st.modalTitle}>Playback Speed</Text>
            {speeds.map(spd => (
              <Pressable
                key={spd}
                onPress={() => { Haptics.selectionAsync(); setRate(spd); setShowSpeedPicker(false); }}
                style={[st.modalRow, rate === spd && st.modalRowActive]}
              >
                <Text style={[st.modalLabel, rate === spd && { color: C.accent }]}>
                  {spd === 1.0 ? 'Normal' : `${spd}x`}
                </Text>
                {rate === spd && <View style={st.activeDot} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── CC Picker Modal ── */}
      <Modal visible={showCCPicker} transparent animationType="fade">
        <Pressable style={st.modalBg} onPress={() => setShowCCPicker(false)}>
          <View style={st.modalSheet}>
            <Text style={st.modalTitle}>Subtitles</Text>
            <Pressable
              onPress={() => { setSelectedCC(null); setShowCCPicker(false); }}
              style={[st.modalRow, selectedCC === null && st.modalRowActive]}
            >
              <Text style={[st.modalLabel, selectedCC === null && { color: C.accent }]}>Off</Text>
              {selectedCC === null && <View style={st.activeDot} />}
            </Pressable>
            {textTracks.map((track, idx) => (
              <Pressable
                key={idx}
                onPress={() => { Haptics.selectionAsync(); setSelectedCC(idx); setShowCCPicker(false); }}
                style={[st.modalRow, selectedCC === idx && st.modalRowActive]}
              >
                <Text style={[st.modalLabel, selectedCC === idx && { color: C.accent }]}>
                  {track.title || track.language || `Track ${idx + 1}`}
                </Text>
                {selectedCC === idx && <View style={st.activeDot} />}
              </Pressable>
            ))}
            {textTracks.length === 0 && <Text style={st.modalEmpty}>No subtitles available</Text>}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  fullscreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, aspectRatio: undefined },
  video: { width: '100%', height: '100%' },
  bufferWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.4)' },

  // Lock
  lockIndicator: { position: 'absolute', top: 16, left: 16, padding: 8 },

  // Top
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingHorizontal: 8 },
  topBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  topSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 },

  // Center
  center: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 48 },
  seekBtn: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
  seekLabel: { color: '#fff', fontSize: 11, fontWeight: '700', position: 'absolute', bottom: 6 },
  mainPlayBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Bottom
  bottom: { paddingHorizontal: 16, paddingBottom: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  time: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontVariant: ['tabular-nums'], width: 52, textAlign: 'center' },
  progressTrack: { flex: 1, height: 20, justifyContent: 'center' },
  progressBg: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1.5 },
  progressFill: { position: 'absolute', left: 0, height: 3, backgroundColor: C.accent, borderRadius: 1.5 },
  progressThumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent, top: 3, marginLeft: -7 },
  bottomBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 40, height: 36, justifyContent: 'center', alignItems: 'center' },
  pillBtn: { height: 32, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  pillBtnActive: { backgroundColor: '#fff' },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 14, borderRadius: R.sm, backgroundColor: 'rgba(255,255,255,0.15)' },
  nextText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1c1c1e', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalRowActive: { backgroundColor: 'rgba(229,9,20,0.08)', marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 8 },
  modalLabel: { color: '#fff', fontSize: 16 },
  modalValue: { color: C.text2, fontSize: 15 },
  modalEmpty: { color: C.text3, fontSize: 14, paddingVertical: 12, textAlign: 'center' },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
});
