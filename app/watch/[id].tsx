import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, SkipForward } from 'lucide-react-native';
import { sources } from '@/lib/sources';
import { addToHistory, markWatched, updateProgress } from '@/lib/storage';
import { movieDetail, tvDetail, seasonDetail, img } from '@/lib/tmdb';
import { Colors, Radius } from '@/lib/theme';
import { MovieDetail, Episode } from '@/types';

const { width: W } = Dimensions.get('window');

export default function WatchScreen() {
  const params = useLocalSearchParams<{ id: string; type: string; s?: string; e?: string }>();
  const router = useRouter();
  const mediaType = (params.type as 'movie' | 'tv') || 'movie';
  const tmdbId = Number(params.id);
  const season = params.s ? Number(params.s) : undefined;
  const episode = params.e ? Number(params.e) : undefined;

  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [autoNext, setAutoNext] = useState(true);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const progressRef = useRef<ReturnType<typeof setInterval>>();

  const title = detail?.title || detail?.name || '';
  const currentEp = episodes.find(ep => ep.episode_number === episode);
  const nextEp = episodes.find(ep => ep.episode_number === (episode || 0) + 1);
  const runtime = currentEp?.runtime || detail?.runtime || 0;
  const runtimeSec = runtime * 60;
  const progressPct = runtimeSec > 0 ? Math.min((elapsed / runtimeSec) * 100, 100) : 0;

  // Embed URL
  const src = sources[sourceIdx];
  const embedUrl = src.getUrl(mediaType, tmdbId, season, episode);

  useEffect(() => {
    const load = async () => {
      const d = mediaType === 'movie' ? await movieDetail(tmdbId) : await tvDetail(tmdbId);
      setDetail(d);

      await addToHistory({
        id: tmdbId, type: mediaType, title: d.title || d.name || '',
        poster_path: d.poster_path, backdrop_path: d.backdrop_path,
        vote_average: d.vote_average, overview: d.overview || '',
        season, episode, progress: 0,
      });

      if (mediaType === 'tv' && season) {
        try {
          const sd = await seasonDetail(tmdbId, season);
          setEpisodes(sd.episodes || []);
        } catch {}
      }
    };
    load();

    // Start elapsed timer
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);

    // Save progress every 30s
    progressRef.current = setInterval(() => {
      if (runtimeSec > 0) {
        const pct = Math.min(Math.round((elapsed / runtimeSec) * 100), 100);
        updateProgress(tmdbId, mediaType, pct, season, episode);
      }
    }, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [tmdbId, mediaType, season, episode]);

  // Auto-next logic
  useEffect(() => {
    if (!autoNext || !nextEp || runtimeSec <= 0) return;
    const remaining = runtimeSec - elapsed;
    if (remaining <= 120 && remaining > 0 && !showNextOverlay) {
      setShowNextOverlay(true);
    }
    if (elapsed >= runtimeSec) {
      markWatched(tmdbId, mediaType, season, episode);
      if (autoNext && nextEp) {
        router.replace(`/watch/${tmdbId}?type=tv&s=${nextEp.season_number}&e=${nextEp.episode_number}` as any);
      }
    }
  }, [elapsed, runtimeSec, autoNext, nextEp]);

  const goToEp = (ep: Episode) => {
    Haptics.selectionAsync();
    router.replace(`/watch/${tmdbId}?type=tv&s=${ep.season_number}&e=${ep.episode_number}` as any);
  };

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />

      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={st.headerTitle} numberOfLines={1}>{title}</Text>
          {season && episode && <Text style={st.headerSub}>S{season} · E{episode}{currentEp ? ` · ${currentEp.name}` : ''}</Text>}
        </View>
        {nextEp && (
          <Pressable onPress={() => goToEp(nextEp)} hitSlop={8} style={st.nextBtn}>
            <SkipForward size={20} color="#fff" strokeWidth={2} />
          </Pressable>
        )}
        {!nextEp && <View style={{ width: 44 }} />}
      </View>

      {/* Player (WebView styled to look native) */}
      <View style={st.playerWrap}>
        {loading && (
          <View style={st.loadOverlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={st.loadText}>Loading {src.name}...</Text>
          </View>
        )}
        <WebView
          source={{ uri: embedUrl }}
          style={{ flex: 1, backgroundColor: '#000' }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          onLoadEnd={() => setLoading(false)}
          onError={() => { if (sourceIdx < sources.length - 1) setSourceIdx(i => i + 1); }}
          injectedJavaScript={`
            // Hide any overlay ads by removing elements with z-index > 100
            setInterval(() => {
              document.querySelectorAll('[style*="z-index"]').forEach(el => {
                const z = parseInt(getComputedStyle(el).zIndex);
                if (z > 100 && !el.querySelector('video')) el.remove();
              });
              document.querySelectorAll('a[target="_blank"]').forEach(el => el.remove());
            }, 2000);
            true;
          `}
        />

        {/* Progress bar at bottom of player */}
        {runtimeSec > 0 && (
          <View style={st.playerProgress}>
            <View style={[st.playerProgressFill, { width: `${progressPct}%` }]} />
          </View>
        )}

        {/* Next Episode Overlay */}
        {showNextOverlay && nextEp && (
          <View style={st.nextOverlay}>
            <View style={st.nextOverlayInner}>
              <Text style={st.nextOverlayLabel}>Up Next</Text>
              <Text style={st.nextOverlayTitle}>S{nextEp.season_number} E{nextEp.episode_number} · {nextEp.name}</Text>
              <View style={st.nextOverlayBtns}>
                <Pressable onPress={() => goToEp(nextEp)} style={st.nextPlayBtn}>
                  <Text style={st.nextPlayText}>Play Next</Text>
                </Pressable>
                <Pressable onPress={() => setShowNextOverlay(false)} style={st.nextCancelBtn}>
                  <Text style={st.nextCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Server pills */}
      <View style={st.serverRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}>
          {sources.map((source, i) => (
            <Pressable key={source.name} onPress={() => { Haptics.selectionAsync(); setSourceIdx(i); setLoading(true); }} style={[st.serverPill, i === sourceIdx && st.serverActive]}>
              {i === sourceIdx && <View style={st.greenDot} />}
              <Text style={[st.serverText, i === sourceIdx && { color: '#000' }]}>{source.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Scrollable content below */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Info */}
        <View style={st.info}>
          <Text style={st.infoTitle}>{title}</Text>
          <View style={st.metaRow}>
            {detail?.vote_average ? <Text style={st.metaY}>★ {detail.vote_average.toFixed(1)}</Text> : null}
            {detail?.release_date && <Text style={st.metaT}>{detail.release_date.slice(0, 4)}</Text>}
            {detail?.first_air_date && <Text style={st.metaT}>{detail.first_air_date.slice(0, 4)}</Text>}
            {runtime > 0 && <Text style={st.metaT}>{runtime}min</Text>}
          </View>
          <Text style={st.overview} numberOfLines={3}>{detail?.overview}</Text>
        </View>

        {/* Auto-next toggle for TV */}
        {mediaType === 'tv' && (
          <View style={st.autoRow}>
            <Text style={st.autoLabel}>Auto-play next episode</Text>
            <Pressable onPress={() => { Haptics.selectionAsync(); setAutoNext(!autoNext); }} style={[st.autoToggle, autoNext && st.autoToggleOn]}>
              <View style={[st.autoKnob, autoNext && st.autoKnobOn]} />
            </Pressable>
          </View>
        )}

        {/* Next Episode CTA */}
        {nextEp && (
          <Pressable onPress={() => goToEp(nextEp)} style={({ pressed }) => [st.nextEpBtn, pressed && { opacity: 0.9 }]}>
            <View style={{ flex: 1 }}>
              <Text style={st.nextEpLabel}>Next Episode</Text>
              <Text style={st.nextEpTitle}>{nextEp.episode_number}. {nextEp.name}</Text>
            </View>
            <SkipForward size={20} color="#000" />
          </Pressable>
        )}

        {/* Episode List */}
        {mediaType === 'tv' && episodes.length > 0 && (
          <View style={st.epSection}>
            <Text style={st.epSectionTitle}>Season {season} · {episodes.length} Episodes</Text>
            {episodes.map(ep => {
              const isActive = ep.episode_number === episode;
              return (
                <Pressable key={ep.id} onPress={() => goToEp(ep)} style={[st.epRow, isActive && st.epRowActive]}>
                  <View style={st.epThumb}>
                    {ep.still_path ? (
                      <Image source={{ uri: img(ep.still_path, 'w300')! }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <View style={st.epThumbEmpty}><Text style={{ color: Colors.textMuted }}>▶</Text></View>
                    )}
                    {isActive && (
                      <View style={st.epPlaying}>
                        <View style={[st.bar, { height: 10 }]} />
                        <View style={[st.bar, { height: 14 }]} />
                        <View style={[st.bar, { height: 8 }]} />
                      </View>
                    )}
                    {ep.runtime > 0 && (
                      <View style={st.epDur}><Text style={st.epDurText}>{ep.runtime}m</Text></View>
                    )}
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={[st.epName, isActive && { color: Colors.accent }]} numberOfLines={1}>
                      {ep.episode_number}. {ep.name}
                    </Text>
                    <Text style={st.epDesc} numberOfLines={2}>{ep.overview}</Text>
                    {ep.vote_average > 0 && <Text style={st.epRating}>★ {ep.vote_average.toFixed(1)}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Similar */}
        {detail?.similar?.results && detail.similar.results.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={[st.epSectionTitle, { paddingHorizontal: 20 }]}>More Like This</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {detail.similar.results.slice(0, 12).map((m: any) => (
                <Pressable key={m.id} onPress={() => router.push(`/${mediaType}/${m.id}` as any)} style={{ width: 110 }}>
                  <Image source={{ uri: img(m.poster_path, 'w185')! }} style={{ width: 110, height: 165, borderRadius: 12 }} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: 'rgba(10,10,10,0.98)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  nextBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  // Player
  playerWrap: { width: W, aspectRatio: 16 / 9, backgroundColor: '#000' },
  loadOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  loadText: { color: Colors.textMuted, fontSize: 13, marginTop: 12 },
  playerProgress: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 20 },
  playerProgressFill: { height: '100%', backgroundColor: Colors.accent },

  // Next overlay
  nextOverlay: {
    position: 'absolute', bottom: 16, right: 16, zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  nextOverlayInner: {},
  nextOverlayLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  nextOverlayTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  nextOverlayBtns: { flexDirection: 'row', gap: 8 },
  nextPlayBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  nextPlayText: { color: '#000', fontSize: 13, fontWeight: '700' },
  nextCancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  nextCancelText: { color: '#fff', fontSize: 13 },

  // Servers
  serverRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  serverPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' },
  serverActive: { backgroundColor: '#fff' },
  serverText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  greenDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#30D158' },

  // Info
  info: { padding: 20 },
  infoTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  metaY: { color: '#FFD60A', fontSize: 13, fontWeight: '700' },
  metaT: { color: Colors.textSecondary, fontSize: 13 },
  overview: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },

  // Auto-next toggle
  autoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  autoLabel: { color: Colors.textSecondary, fontSize: 14 },
  autoToggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', paddingHorizontal: 2 },
  autoToggleOn: { backgroundColor: Colors.accent },
  autoKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  autoKnobOn: { alignSelf: 'flex-end' },

  // Next ep button
  nextEpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: Radius.lg, backgroundColor: '#fff',
  },
  nextEpLabel: { color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  nextEpTitle: { color: '#000', fontSize: 15, fontWeight: '700' },

  // Episodes
  epSection: { paddingHorizontal: 20 },
  epSectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 14 },
  epRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  epRowActive: { backgroundColor: 'rgba(229,9,20,0.06)', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10, borderBottomWidth: 0 },
  epThumb: { width: 140, height: 79, borderRadius: 8, overflow: 'hidden', backgroundColor: Colors.elevated },
  epThumbEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  epPlaying: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2 },
  bar: { width: 3, backgroundColor: Colors.accent, borderRadius: 2 },
  epDur: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  epDurText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  epName: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  epDesc: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  epRating: { color: '#FFD60A', fontSize: 11, marginTop: 4 },
});
