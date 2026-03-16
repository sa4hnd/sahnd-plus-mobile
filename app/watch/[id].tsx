import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, SkipForward, Check } from 'lucide-react-native';
import { fetchStream } from '@/lib/streamApi';
import { addToHistory, markWatched, updateProgress, isWatched as checkWatched } from '@/lib/storage';
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
  const [watchedEps, setWatchedEps] = useState<Set<number>>(new Set());
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [useWebView, setUseWebView] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [autoNext, setAutoNext] = useState(true);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const title = detail?.title || detail?.name || '';
  const currentEp = episodes.find(ep => ep.episode_number === episode);
  const nextEp = episodes.find(ep => ep.episode_number === (episode || 0) + 1);
  const runtime = currentEp?.runtime || detail?.runtime || 45;
  const runtimeSec = runtime * 60;
  const progressPct = runtimeSec > 0 ? Math.min((elapsed / runtimeSec) * 100, 100) : 0;

  // Native video player
  const player = useVideoPlayer(streamUrl || '', (p) => {
    p.loop = false;
    if (streamUrl) p.play();
  });

  useEffect(() => {
    setLoading(true);
    setStreamError('');
    setStreamUrl(null);
    setElapsed(0);
    setShowNextOverlay(false);

    const load = async () => {
      try {
        // Fetch detail
        const d = mediaType === 'movie' ? await movieDetail(tmdbId) : await tvDetail(tmdbId);
        setDetail(d);

        // Save to history
        await addToHistory({
          id: tmdbId, type: mediaType, title: d.title || d.name || '',
          poster_path: d.poster_path, backdrop_path: d.backdrop_path,
          vote_average: d.vote_average, overview: d.overview || '',
          season, episode,
        });

        // Load episodes for TV
        if (mediaType === 'tv' && season) {
          try {
            const sd = await seasonDetail(tmdbId, season);
            setEpisodes(sd.episodes || []);
            const watched = new Set<number>();
            for (const ep of sd.episodes || []) {
              if (await checkWatched(tmdbId, 'tv', season, ep.episode_number)) {
                watched.add(ep.episode_number);
              }
            }
            setWatchedEps(watched);
          } catch {}
        }

        // Fetch native stream URL
        const stream = await fetchStream(mediaType, tmdbId, season, episode);
        console.log('[Watch] Got native stream:', stream.m3u8.slice(0, 60));
        setStreamUrl(stream.m3u8);
        setLoading(false);
      } catch (e: any) {
        console.error('[Watch] Stream error:', e.message);
        setStreamError(e.message || 'Failed to load stream');
        setLoading(false);
      }
    };
    load();

    // Elapsed timer for progress
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tmdbId, mediaType, season, episode]);

  // Save progress every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (runtimeSec > 0 && elapsed > 0) {
        const pct = Math.min(Math.round((elapsed / runtimeSec) * 100), 100);
        updateProgress(tmdbId, mediaType, pct, season, episode);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [elapsed, runtimeSec]);

  // Auto-next
  useEffect(() => {
    if (!autoNext || !nextEp || runtimeSec <= 0) return;
    if (runtimeSec - elapsed <= 120 && runtimeSec - elapsed > 0 && !showNextOverlay) {
      setShowNextOverlay(true);
    }
    if (elapsed >= runtimeSec) {
      markWatched(tmdbId, mediaType, season, episode);
      if (autoNext && nextEp) goToEp(nextEp);
    }
  }, [elapsed]);

  const goToEp = (ep: Episode) => {
    Haptics.selectionAsync();
    router.replace(`/watch/${tmdbId}?type=tv&s=${ep.season_number}&e=${ep.episode_number}` as any);
  };

  // VixSrc embed URL (fallback when native m3u8 fails)
  const getEmbedUrl = () => {
    let url = `https://vixsrc.to/${mediaType}/${tmdbId}`;
    if (mediaType === 'tv' && season && episode) url = `https://vixsrc.to/tv/${tmdbId}/${season}/${episode}`;
    return `${url}?primaryColor=E50914&secondaryColor=B20710&autoplay=true`;
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.headerBtn}>
          <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          {season != null && episode != null && (
            <Text style={s.headerSub}>S{season} · E{episode}{currentEp ? ` · ${currentEp.name}` : ''}</Text>
          )}
        </View>
        {nextEp ? (
          <Pressable onPress={() => goToEp(nextEp)} hitSlop={8} style={s.headerBtn}>
            <SkipForward size={18} color="#fff" strokeWidth={2} />
          </Pressable>
        ) : <View style={{ width: 44 }} />}
      </View>

      {/* ─── PLAYER ─── */}
      <View style={s.playerWrap}>
        {loading ? (
          <View style={s.playerOverlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={s.playerText}>Loading stream...</Text>
          </View>
        ) : streamUrl && !useWebView ? (
          <VideoView
            player={player}
            style={s.nativePlayer}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
          />
        ) : useWebView ? (
          <WebView
            source={{ uri: getEmbedUrl() }}
            style={{ flex: 1, backgroundColor: '#000' }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            injectedJavaScript={`
              window.open = function() { return null; };
              setInterval(function() {
                document.querySelectorAll('a[target="_blank"]').forEach(function(el) { el.remove(); });
                document.querySelectorAll('div').forEach(function(el) {
                  var z = parseInt(window.getComputedStyle(el).zIndex || 0);
                  if (z > 999 && !el.querySelector('video')) el.style.display = 'none';
                });
              }, 1500);
              true;
            `}
            onShouldStartLoadWithRequest={(req) => {
              const embedHost = new URL(getEmbedUrl()).hostname;
              return req.url.includes(embedHost) || req.url === getEmbedUrl();
            }}
          />
        ) : (
          <View style={s.playerOverlay}>
            <Text style={[s.playerText, { color: Colors.accent, fontSize: 14 }]}>Native stream unavailable</Text>
            <Text style={[s.playerText, { fontSize: 11, marginTop: 4 }]}>{streamError}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable onPress={() => setUseWebView(true)} style={s.retryBtn}>
                <Text style={s.retryText}>Use Embedded Player</Text>
              </Pressable>
              <Pressable onPress={() => { setLoading(true); setStreamError(''); fetchStream(mediaType, tmdbId, season, episode).then(r => { setStreamUrl(r.m3u8); setLoading(false); }).catch(e => { setStreamError(e.message); setLoading(false); }); }} style={[s.retryBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={s.retryText}>Retry Native</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Progress bar at bottom */}
        {runtimeSec > 0 && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progressPct}%` }]} />
          </View>
        )}

        {/* Next episode overlay */}
        {showNextOverlay && nextEp && (
          <View style={s.nextOverlay}>
            <Text style={s.nextLabel}>UP NEXT</Text>
            <Text style={s.nextTitle} numberOfLines={1}>E{nextEp.episode_number} · {nextEp.name}</Text>
            <View style={s.nextBtns}>
              <Pressable onPress={() => goToEp(nextEp)} style={s.nextPlayBtn}><Text style={s.nextPlayText}>Play Next</Text></Pressable>
              <Pressable onPress={() => setShowNextOverlay(false)} style={s.nextCancelBtn}><Text style={{ color: '#fff', fontSize: 12 }}>Cancel</Text></Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Content below player */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={s.info}>
          <Text style={s.infoTitle}>{title}</Text>
          <View style={s.metaRow}>
            {detail?.vote_average ? <Text style={s.metaY}>★ {detail.vote_average.toFixed(1)}</Text> : null}
            {detail?.release_date && <Text style={s.metaG}>{detail.release_date.slice(0, 4)}</Text>}
            {detail?.first_air_date && <Text style={s.metaG}>{detail.first_air_date.slice(0, 4)}</Text>}
            {runtime > 0 && <Text style={s.metaG}>{runtime}min</Text>}
          </View>
          <Text style={s.overview} numberOfLines={3}>{detail?.overview}</Text>
        </View>

        {/* Auto-next */}
        {mediaType === 'tv' && (
          <Pressable onPress={() => { Haptics.selectionAsync(); setAutoNext(!autoNext); }} style={s.toggleRow}>
            <Text style={s.toggleLabel}>Auto-play next episode</Text>
            <View style={[s.toggle, autoNext && s.toggleOn]}><View style={[s.knob, autoNext && s.knobOn]} /></View>
          </Pressable>
        )}

        {/* Next ep CTA */}
        {nextEp && (
          <Pressable onPress={() => goToEp(nextEp)} style={({ pressed }) => [s.nextCta, pressed && { opacity: 0.9 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.nextCtaLabel}>Next Episode</Text>
              <Text style={s.nextCtaTitle}>{nextEp.episode_number}. {nextEp.name}</Text>
            </View>
            <SkipForward size={18} color="#000" />
          </Pressable>
        )}

        {/* Episodes */}
        {mediaType === 'tv' && episodes.length > 0 && (
          <View style={s.epSection}>
            <View style={s.epHeader}>
              <Text style={s.epHeaderTitle}>Season {season}</Text>
              <Text style={s.epHeaderCount}>{watchedEps.size}/{episodes.length} watched</Text>
            </View>
            {episodes.map(ep => {
              const isActive = ep.episode_number === episode;
              const isWatchedEp = watchedEps.has(ep.episode_number);
              return (
                <Pressable key={ep.id} onPress={() => goToEp(ep)} style={({ pressed }) => [s.epRow, isActive && s.epActive, pressed && { opacity: 0.7 }]}>
                  <View style={s.epThumb}>
                    {ep.still_path ? (
                      <Image source={{ uri: img(ep.still_path, 'w300')! }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <View style={s.epThumbEmpty}><Text style={{ color: '#333' }}>▶</Text></View>
                    )}
                    {isActive && (
                      <View style={s.epPlayingOverlay}>
                        <View style={[s.eqBar, { height: 10 }]} /><View style={[s.eqBar, { height: 14 }]} /><View style={[s.eqBar, { height: 8 }]} />
                      </View>
                    )}
                    {ep.runtime > 0 && <View style={s.epDurBadge}><Text style={s.epDurText}>{ep.runtime}m</Text></View>}
                  </View>
                  <View style={s.epInfo}>
                    <View style={s.epNameRow}>
                      {isWatchedEp ? <Check size={14} color="#30D158" strokeWidth={3} /> : <Text style={[s.epNum, isActive && { color: Colors.accent }]}>{ep.episode_number}</Text>}
                      <Text style={[s.epName, isActive && { color: Colors.accent }, isWatchedEp && { color: Colors.textMuted }]} numberOfLines={1}>{ep.name}</Text>
                    </View>
                    <Text style={s.epDesc} numberOfLines={2}>{ep.overview}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Similar */}
        {detail?.similar?.results && detail.similar.results.length > 0 && (
          <View style={{ marginTop: 24, paddingBottom: 40 }}>
            <Text style={[s.epHeaderTitle, { paddingHorizontal: 20, marginBottom: 12 }]}>More Like This</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {detail.similar.results.slice(0, 12).map((m: any) => (
                <Pressable key={m.id} onPress={() => router.push(`/${mediaType}/${m.id}` as any)} style={{ width: 110 }}>
                  <Image source={{ uri: img(m.poster_path, 'w185')! }} style={{ width: 110, height: 165, borderRadius: 12 }} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 58, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: Colors.bg },
  headerBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  playerWrap: { width: W, aspectRatio: 16 / 9, backgroundColor: '#000' },
  nativePlayer: { width: '100%', height: '100%' },
  playerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  playerText: { color: Colors.textMuted, fontSize: 13, marginTop: 10 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  progressBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.08)', zIndex: 20 },
  progressFill: { height: '100%', backgroundColor: Colors.accent },
  nextOverlay: { position: 'absolute', bottom: 12, right: 12, zIndex: 30, backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 10, padding: 12, maxWidth: 220, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  nextLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  nextTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  nextBtns: { flexDirection: 'row', gap: 8 },
  nextPlayBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6 },
  nextPlayText: { color: '#000', fontSize: 12, fontWeight: '700' },
  nextCancelBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' },
  info: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  infoTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  metaY: { color: '#FFD60A', fontSize: 13, fontWeight: '700' },
  metaG: { color: Colors.textSecondary, fontSize: 13 },
  overview: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.06)' },
  toggleLabel: { color: Colors.textSecondary, fontSize: 14 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.accent },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  nextCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginVertical: 12, padding: 16, borderRadius: Radius.lg, backgroundColor: '#fff' },
  nextCtaLabel: { color: 'rgba(0,0,0,0.4)', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  nextCtaTitle: { color: '#000', fontSize: 15, fontWeight: '700' },
  epSection: { paddingHorizontal: 20 },
  epHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  epHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  epHeaderCount: { fontSize: 12, color: Colors.textMuted },
  epRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.04)' },
  epActive: { backgroundColor: 'rgba(229,9,20,0.06)', marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 10, borderBottomWidth: 0 },
  epThumb: { width: 130, height: 73, borderRadius: 8, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  epThumbEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  epPlayingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2 },
  eqBar: { width: 3, backgroundColor: Colors.accent, borderRadius: 2 },
  epDurBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  epDurText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  epInfo: { flex: 1, justifyContent: 'center' },
  epNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  epNum: { color: Colors.textMuted, fontSize: 13, fontWeight: '700', width: 18 },
  epName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  epDesc: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
});
