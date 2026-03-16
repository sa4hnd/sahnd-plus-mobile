import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions,
  ActivityIndicator, Animated, Modal, StatusBar,
  PanResponder, GestureResponderEvent,
} from 'react-native';
import Video, { SelectedTrackType, ResizeMode } from 'react-native-video';
import * as Haptics from 'expo-haptics';
import { C, R } from '@/lib/design';

const { width: SW, height: SH } = Dimensions.get('window');

interface Props {
  uri: string;
  title?: string;
  subtitle?: string;
  startAt?: number;
  onProgress?: (sec: number, dur: number) => void;
  onComplete?: () => void;
  onBack?: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
}

export default function SahndPlayer({
  uri, title, subtitle, startAt = 0,
  onProgress, onComplete, onBack, onNextEpisode, hasNextEpisode,
}: Props) {
  const videoRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  // State
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [controls, setControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [tracks, setTracks] = useState<any[]>([]);
  const [ccIdx, setCcIdx] = useState<number | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showCC, setShowCC] = useState(false);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const pct = dur > 0 ? (seeking ? seekTime : time) / dur : 0;

  // ── Auto-hide controls ──
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!paused) {
      hideTimer.current = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
          .start(() => setControls(false));
      }, 4000);
    }
  }, [paused, fadeAnim]);

  useEffect(() => { if (controls) scheduleHide(); }, [controls, paused]);

  const toggleControls = () => {
    if (controls) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
        .start(() => setControls(false));
    } else {
      setControls(true);
      fadeAnim.setValue(1);
    }
  };

  // ── Video events ──
  const onLoad = useCallback((d: any) => {
    setDur(d.duration);
    setBuffering(false);
    if (d.textTracks) setTracks(d.textTracks);
    if (startAt > 5) videoRef.current?.seek(startAt);
  }, [startAt]);

  const onVideoProgress = useCallback((d: any) => {
    if (!seeking) setTime(d.currentTime);
    onProgress?.(d.currentTime, d.seekableDuration || dur);
  }, [seeking, dur, onProgress]);

  // ── Seek via pan gesture on progress bar ──
  const barWidth = useRef(SW - 32); // will be updated
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setSeeking(true);
        const x = e.nativeEvent.locationX;
        const newPct = Math.max(0, Math.min(1, x / barWidth.current));
        setSeekTime(newPct * dur);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const newPct = Math.max(0, Math.min(1, x / barWidth.current));
        setSeekTime(newPct * dur);
      },
      onPanResponderRelease: () => {
        videoRef.current?.seek(seekTime);
        setTime(seekTime);
        setSeeking(false);
      },
    })
  ).current;

  // Update bar width on layout
  useEffect(() => {
    barWidth.current = fullscreen ? Math.max(SW, SH) - 32 : SW - 32;
  }, [fullscreen]);

  const skip = (sec: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = Math.max(0, Math.min(time + sec, dur));
    videoRef.current?.seek(t);
    setTime(t);
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <View style={[st.wrap, fullscreen && st.fs]}>
      <StatusBar hidden={fullscreen} />

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
        selectedTextTrack={
          ccIdx !== null
            ? { type: SelectedTrackType.INDEX, value: ccIdx }
            : { type: SelectedTrackType.DISABLED, value: 0 }
        }
        ignoreSilentSwitch="ignore"
      />

      {/* Tap zone */}
      <Pressable onPress={toggleControls} style={StyleSheet.absoluteFill} />

      {/* Buffering */}
      {buffering && (
        <View style={st.buffer}><ActivityIndicator color="#fff" size="large" /></View>
      )}

      {/* ── Controls ── */}
      {controls && (
        <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>

          {/* Top */}
          <View style={st.top}>
            <Pressable onPress={onBack} style={st.btn} hitSlop={12}>
              <Text style={st.btnIcon}>{'\u2039'}</Text>
            </Pressable>
            <View style={st.topMid}>
              {title ? <Text style={st.topTitle} numberOfLines={1}>{title}</Text> : null}
              {subtitle ? <Text style={st.topSub} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Center */}
          <View style={st.center}>
            <Pressable onPress={() => skip(-10)} style={st.skipBtn}>
              <Text style={st.skipIcon}>{'\u21BA'}</Text>
              <Text style={st.skipNum}>10</Text>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPaused(!paused); }}
              style={st.playBtn}
            >
              <Text style={st.playIcon}>{paused ? '\u25B6' : '\u2759\u2759'}</Text>
            </Pressable>

            <Pressable onPress={() => skip(10)} style={st.skipBtn}>
              <Text style={[st.skipIcon, { transform: [{ scaleX: -1 }] }]}>{'\u21BA'}</Text>
              <Text style={st.skipNum}>10</Text>
            </Pressable>
          </View>

          {/* Bottom */}
          <View style={st.bot}>
            {/* Timeline */}
            <View style={st.timeRow}>
              <Text style={st.timeText}>{fmt(seeking ? seekTime : time)}</Text>
              <View
                style={st.bar}
                {...panResponder.panHandlers}
                onLayout={(e) => { barWidth.current = e.nativeEvent.layout.width; }}
              >
                <View style={st.barBg} />
                <View style={[st.barFill, { width: `${pct * 100}%` }]} />
                <View style={[st.thumb, { left: `${pct * 100}%` }]} />
              </View>
              <Text style={st.timeText}>{fmt(dur)}</Text>
            </View>

            {/* Bottom buttons */}
            <View style={st.botBtns}>
              <Pressable onPress={() => { Haptics.selectionAsync(); setMuted(!muted); }} style={st.smBtn}>
                <Text style={st.smBtnText}>{muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}</Text>
              </Pressable>

              <Pressable onPress={() => setShowCC(true)} style={[st.pill, ccIdx !== null && st.pillOn]}>
                <Text style={[st.pillText, ccIdx !== null && { color: '#000' }]}>CC</Text>
              </Pressable>

              <Pressable onPress={() => setShowSpeed(true)} style={[st.pill, rate !== 1 && st.pillOn]}>
                <Text style={[st.pillText, rate !== 1 && { color: '#000' }]}>{rate}x</Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              {hasNextEpisode && (
                <Pressable onPress={() => { Haptics.selectionAsync(); onNextEpisode?.(); }} style={st.nextBtn}>
                  <Text style={st.nextText}>Next {'\u203A'}</Text>
                </Pressable>
              )}

              <Pressable onPress={() => setFullscreen(!fullscreen)} style={st.smBtn}>
                <Text style={st.smBtnText}>{fullscreen ? '\u2198' : '\u2197'}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Speed picker ── */}
      <Modal visible={showSpeed} transparent animationType="fade">
        <Pressable style={st.modalBg} onPress={() => setShowSpeed(false)}>
          <View style={st.sheet}>
            <View style={st.sheetHandle} />
            <Text style={st.sheetTitle}>Playback Speed</Text>
            {speeds.map(s => (
              <Pressable
                key={s}
                onPress={() => { Haptics.selectionAsync(); setRate(s); setShowSpeed(false); }}
                style={[st.sheetRow, rate === s && st.sheetRowActive]}
              >
                <Text style={[st.sheetLabel, rate === s && { color: C.accent, fontWeight: '600' }]}>
                  {s === 1 ? 'Normal' : `${s}x`}
                </Text>
                {rate === s && <View style={st.dot} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── CC picker ── */}
      <Modal visible={showCC} transparent animationType="fade">
        <Pressable style={st.modalBg} onPress={() => setShowCC(false)}>
          <View style={st.sheet}>
            <View style={st.sheetHandle} />
            <Text style={st.sheetTitle}>Subtitles</Text>
            <Pressable
              onPress={() => { setCcIdx(null); setShowCC(false); }}
              style={[st.sheetRow, ccIdx === null && st.sheetRowActive]}
            >
              <Text style={[st.sheetLabel, ccIdx === null && { color: C.accent, fontWeight: '600' }]}>Off</Text>
              {ccIdx === null && <View style={st.dot} />}
            </Pressable>
            {tracks.map((t, i) => (
              <Pressable
                key={i}
                onPress={() => { Haptics.selectionAsync(); setCcIdx(i); setShowCC(false); }}
                style={[st.sheetRow, ccIdx === i && st.sheetRowActive]}
              >
                <Text style={[st.sheetLabel, ccIdx === i && { color: C.accent, fontWeight: '600' }]}>
                  {t.title || t.language || `Track ${i + 1}`}
                </Text>
                {ccIdx === i && <View style={st.dot} />}
              </Pressable>
            ))}
            {tracks.length === 0 && (
              <Text style={st.sheetEmpty}>No subtitles available for this source</Text>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  fs: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, aspectRatio: undefined },
  video: { width: '100%', height: '100%' },
  buffer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.45)' },

  // Top
  top: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingHorizontal: 4 },
  btn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  btnIcon: { color: '#fff', fontSize: 32, fontWeight: '300' },
  topMid: { flex: 1, alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  topSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 },

  // Center
  center: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 48 },
  skipBtn: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  skipIcon: { color: '#fff', fontSize: 28 },
  skipNum: { color: '#fff', fontSize: 10, fontWeight: '700', position: 'absolute', bottom: 4 },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  playIcon: { color: '#fff', fontSize: 28 },

  // Bottom
  bot: { paddingHorizontal: 16, paddingBottom: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontVariant: ['tabular-nums'], width: 50, textAlign: 'center' },
  bar: { flex: 1, height: 28, justifyContent: 'center' },
  barBg: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1.5 },
  barFill: { position: 'absolute', left: 0, height: 3, backgroundColor: C.accent, borderRadius: 1.5 },
  thumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, top: 6, marginLeft: -8 },
  botBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smBtn: { width: 36, height: 32, justifyContent: 'center', alignItems: 'center' },
  smBtnText: { fontSize: 18 },
  pill: { height: 30, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  pillOn: { backgroundColor: '#fff' },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  nextBtn: { height: 30, paddingHorizontal: 14, borderRadius: R.sm, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12, paddingBottom: 40, paddingHorizontal: 20 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  sheetRowActive: { backgroundColor: 'rgba(229,9,20,0.06)', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  sheetLabel: { color: '#fff', fontSize: 16 },
  sheetEmpty: { color: 'rgba(255,255,255,0.3)', fontSize: 14, paddingVertical: 16, textAlign: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
});
