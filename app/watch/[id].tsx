import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, SkipForward, Check, Play, ChevronDown } from 'lucide-react-native';
import SahndPlayer from '@/components/SahndPlayer';
import { fetchStream } from '@/lib/streamApi';
import { addToHistory, markWatched, updateProgress, isWatched as checkWatched, getProgress } from '@/lib/storage';
import { movieDetail, tvDetail, seasonDetail, img } from '@/lib/tmdb';
import { C, S, R, T, isTV } from '@/lib/design';
import { useTVRemote } from '@/lib/tv';
import { MovieDetail, Episode } from '@/types';

const { width: W } = Dimensions.get('window');

export default function WatchScreen() {
  const params = useLocalSearchParams<{ id: string; type: string; s?: string; e?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [savedPosition, setSavedPosition] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const title = detail?.title || detail?.name || '';
  const currentEp = episodes.find(ep => ep.episode_number === episode);
  const nextEp = episodes.find(ep => ep.episode_number === (episode || 0) + 1);
  const runtime = currentEp?.runtime || detail?.runtime || 45;

  useEffect(() => {
    setLoading(true);
    setStreamError('');
    setStreamUrl(null);
    setUseWebView(false);

    const load = async () => {
      try {
        const d = mediaType === 'movie' ? await movieDetail(tmdbId) : await tvDetail(tmdbId);
        setDetail(d);

        await addToHistory({
          id: tmdbId, type: mediaType, title: d.title || d.name || '',
          poster_path: d.poster_path, backdrop_path: d.backdrop_path,
          vote_average: d.vote_average, overview: d.overview || '',
          season, episode,
        });

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

        const savedPct = await getProgress(tmdbId, mediaType, season, episode);
        if (savedPct > 0 && savedPct < 95) {
          const runtimeSec = (currentEp?.runtime || d.runtime || 45) * 60;
          setSavedPosition(Math.floor((savedPct / 100) * runtimeSec));
        }

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
  }, [tmdbId, mediaType, season, episode]);

  const handlePlayerProgress = (seconds: number, dur: number) => {
    if (dur > 0) {
      const pct = Math.min(Math.round((seconds / dur) * 100), 100);
      updateProgress(tmdbId, mediaType, pct, season, episode);
    }
  };

  const handlePlayerComplete = () => {
    markWatched(tmdbId, mediaType, season, episode);
    if (nextEp) goToEp(nextEp);
  };

  const goToEp = (ep: Episode) => {
    if (!isTV) Haptics.selectionAsync();
    router.replace(`/watch/${tmdbId}?type=tv&s=${ep.season_number}&e=${ep.episode_number}` as any);
  };

  // TV remote: play/pause with select, seek with left/right, back to exit
  useTVRemote({
    onSelect: () => {
      // SahndPlayer handles its own play/pause, but we handle the WebView case
      if (useWebView) return;
    },
    onPlayPause: () => {
      // Handled by SahndPlayer natively
    },
    onFastForward: () => {
      if (nextEp) goToEp(nextEp);
    },
    onBack: () => {
      router.back();
    },
  });

  const getEmbedUrl = () => {
    let url = `https://vixsrc.to/${mediaType}/${tmdbId}`;
    if (mediaType === 'tv' && season && episode) url = `https://vixsrc.to/tv/${tmdbId}/${season}/${episode}`;
    return `${url}?primaryColor=E50914&secondaryColor=B20710&autoplay=true`;
  };

  const year = detail?.release_date?.slice(0, 4) || detail?.first_air_date?.slice(0, 4);
  const genres = detail?.genres?.slice(0, 3).map((g: any) => g.name) || [];

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />

      {/* Safe area spacer — black bar above player */}
      <View style={{ height: insets.top, backgroundColor: '#000' }} />

      {/* ── PLAYER ── */}
      {loading ? (
        <View style={st.playerArea}>
          <View style={st.playerBackdrop}>
            {detail?.backdrop_path && (
              <Image source={{ uri: img(detail.backdrop_path, 'w780')! }} style={StyleSheet.absoluteFill} contentFit="cover" />
            )}
            <View style={st.playerOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={st.loadingText}>Loading stream…</Text>
            </View>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
            <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>
      ) : streamUrl && !useWebView ? (
        <SahndPlayer
          uri={streamUrl}
          title={title}
          subtitle={season && episode ? `S${season} · E${episode}${currentEp ? ` · ${currentEp.name}` : ''}` : undefined}
          startAt={savedPosition}
          onProgress={handlePlayerProgress}
          onComplete={handlePlayerComplete}
          onBack={() => router.back()}
        />
      ) : useWebView ? (
        <View style={st.playerArea}>
          <WebView
            source={{ uri: getEmbedUrl() }}
            style={{ flex: 1, backgroundColor: '#000' }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            injectedJavaScript={`window.open=function(){return null};setInterval(function(){document.querySelectorAll('a[target="_blank"]').forEach(function(e){e.remove()})},1500);true;`}
            onShouldStartLoadWithRequest={(req) => req.url.includes(new URL(getEmbedUrl()).hostname)}
          />
          <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
            <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>
      ) : (
        <View style={st.playerArea}>
          <View style={st.playerOverlay}>
            <Text style={[st.loadingText, { color: C.accent, fontSize: 14 }]}>Stream unavailable</Text>
            <Text style={[st.loadingText, { fontSize: 11, marginTop: 4 }]}>{streamError}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable onPress={() => setUseWebView(true)} style={st.fallbackBtn}>
                <Text style={st.fallbackText}>Use Embedded Player</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setLoading(true); setStreamError('');
                  fetchStream(mediaType, tmdbId, season, episode)
                    .then(r => { setStreamUrl(r.m3u8); setLoading(false); })
                    .catch(e => { setStreamError(e.message); setLoading(false); });
                }}
                style={[st.fallbackBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
              >
                <Text style={st.fallbackText}>Retry</Text>
              </Pressable>
            </View>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
            <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>
      )}

      {/* ── Content ── */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Title & Metadata */}
        <View style={st.infoSection}>
          <Text style={st.title}>{title}</Text>

          <View style={st.metaRow}>
            {detail?.vote_average ? (
              <View style={st.ratingBadge}>
                <Text style={st.ratingText}>★ {detail.vote_average.toFixed(1)}</Text>
              </View>
            ) : null}
            {year && <Text style={st.metaText}>{year}</Text>}
            {runtime > 0 && (
              <View style={st.metaPill}>
                <Text style={st.metaPillText}>{runtime}min</Text>
              </View>
            )}
            {season != null && episode != null && (
              <Text style={st.metaText}>S{season} E{episode}</Text>
            )}
          </View>

          {genres.length > 0 && (
            <View style={st.genreRow}>
              {genres.map((g: string, i: number) => (
                <View key={g} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {i > 0 && <View style={st.genreDot} />}
                  <Text style={st.genreText}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          <Pressable onPress={() => setDescExpanded(!descExpanded)}>
            <Text style={st.overview} numberOfLines={descExpanded ? undefined : 3}>
              {detail?.overview}
            </Text>
            {detail?.overview && detail.overview.length > 120 && (
              <View style={st.expandRow}>
                <ChevronDown size={14} color={C.text2} style={descExpanded ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </View>
            )}
          </Pressable>
        </View>

        {/* Next Episode CTA */}
        {nextEp && (
          <View style={st.actionSection}>
            <Pressable
              onPress={() => goToEp(nextEp)}
              style={({ pressed }) => [st.nextBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            >
              <Play size={16} color="#000" fill="#000" strokeWidth={0} />
              <View style={{ flex: 1 }}>
                <Text style={st.nextLabel}>Next Episode</Text>
                <Text style={st.nextTitle}>{nextEp.episode_number}. {nextEp.name}</Text>
              </View>
              <SkipForward size={16} color="rgba(0,0,0,0.4)" />
            </Pressable>
          </View>
        )}

        {/* Episodes List */}
        {mediaType === 'tv' && episodes.length > 0 && (
          <View style={st.epSection}>
            <View style={st.epSectionHeader}>
              <Text style={st.epSectionTitle}>Season {season}</Text>
              <Text style={st.epWatchedCount}>{watchedEps.size}/{episodes.length} watched</Text>
            </View>

            {episodes.map(ep => {
              const isActive = ep.episode_number === episode;
              const isWatchedEp = watchedEps.has(ep.episode_number);
              return (
                <Pressable
                  key={ep.id}
                  onPress={() => goToEp(ep)}
                  style={({ pressed }) => [st.epRow, isActive && st.epRowActive, pressed && { opacity: 0.7 }]}
                >
                  <View style={st.epThumb}>
                    {ep.still_path ? (
                      <Image source={{ uri: img(ep.still_path, 'w300')! }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <View style={st.epThumbEmpty}><Play size={16} color={C.text3} /></View>
                    )}
                    {isActive && (
                      <View style={st.epPlayingOverlay}>
                        <View style={[st.eqBar, { height: 10 }]} />
                        <View style={[st.eqBar, { height: 16 }]} />
                        <View style={[st.eqBar, { height: 8 }]} />
                      </View>
                    )}
                    {ep.runtime > 0 && (
                      <View style={st.epDurBadge}>
                        <Text style={st.epDurText}>{ep.runtime}m</Text>
                      </View>
                    )}
                  </View>

                  <View style={st.epInfo}>
                    <View style={st.epNameRow}>
                      {isWatchedEp ? (
                        <Check size={14} color={C.green} strokeWidth={3} />
                      ) : (
                        <Text style={[st.epNum, isActive && { color: C.accent }]}>{ep.episode_number}</Text>
                      )}
                      <Text style={[st.epName, isActive && { color: C.accent }, isWatchedEp && { color: C.text3 }]} numberOfLines={1}>
                        {ep.name}
                      </Text>
                    </View>
                    <Text style={st.epDesc} numberOfLines={2}>{ep.overview}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* More Like This */}
        {detail?.similar?.results && detail.similar.results.length > 0 && (
          <View style={st.similarSection}>
            <Text style={st.similarTitle}>More Like This</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.screen, gap: S.rowGap }}>
              {detail.similar.results.slice(0, 12).map((m: any) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/${mediaType}/${m.id}` as any)}
                  style={({ pressed }) => [st.similarCard, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                >
                  <Image source={{ uri: img(m.poster_path, 'w185')! }} style={st.similarPoster} contentFit="cover" />
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
  container: { flex: 1, backgroundColor: C.bg },

  // ─── Player ───
  playerArea: { width: W, aspectRatio: 16 / 9, backgroundColor: '#000' },
  playerBackdrop: { flex: 1, backgroundColor: '#000' },
  playerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: C.text3, fontSize: 13, marginTop: 10 },
  backBtn: {
    position: 'absolute', top: 56, left: 12, zIndex: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  fallbackBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.1)' },
  fallbackText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // ─── Info ───
  infoSection: { paddingHorizontal: S.screen, paddingTop: 32, paddingBottom: S.sm },
  title: { fontSize: 22, fontWeight: '700', color: C.text, lineHeight: 28, marginBottom: S.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: S.sm },
  ratingBadge: {
    backgroundColor: 'rgba(255,214,10,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.xs,
  },
  ratingText: { color: '#FFD60A', fontSize: 13, fontWeight: '700' },
  metaText: { ...T.caption, color: C.text2 },
  metaPill: {
    backgroundColor: C.separator, paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.xs,
  },
  metaPillText: { ...T.small, color: C.text2 },
  genreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.md },
  genreDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.text4, marginHorizontal: 8 },
  genreText: { ...T.caption, color: C.text3 },
  overview: { ...T.body, color: C.text2, lineHeight: 21 },
  expandRow: { alignItems: 'center', paddingTop: 4 },

  // ─── Next Episode ───
  actionSection: { paddingHorizontal: S.screen, marginBottom: S.sm },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: S.md, paddingVertical: 14,
    borderRadius: R.pill,
  },
  nextLabel: { color: 'rgba(0,0,0,0.4)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  nextTitle: { color: '#000', fontSize: 14, fontWeight: '700' },

  // ─── Episodes ───
  epSection: { paddingHorizontal: S.screen, marginTop: S.sm },
  epSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md },
  epSectionTitle: { ...T.sectionTitle, fontSize: 18, fontWeight: '700' },
  epWatchedCount: { ...T.small, color: C.text3 },
  epRow: {
    flexDirection: 'row', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  epRowActive: {
    backgroundColor: 'rgba(229,9,20,0.06)',
    marginHorizontal: -12, paddingHorizontal: 12,
    borderRadius: R.md, borderBottomWidth: 0,
  },
  epThumb: { width: 130, height: 73, borderRadius: R.sm, overflow: 'hidden', backgroundColor: C.surface },
  epThumbEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  epPlayingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  eqBar: { width: 3, backgroundColor: C.accent, borderRadius: 2 },
  epDurBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: R.xs,
  },
  epDurText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  epInfo: { flex: 1, justifyContent: 'center' },
  epNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  epNum: { color: C.text3, fontSize: 13, fontWeight: '700', width: 18 },
  epName: { flex: 1, color: C.text, fontSize: 14, fontWeight: '600' },
  epDesc: { ...T.small, color: C.text3, lineHeight: 17 },

  // ─── Similar ───
  similarSection: { marginTop: S.lg, paddingBottom: S.md },
  similarTitle: { ...T.sectionTitle, fontSize: 18, fontWeight: '700', paddingHorizontal: S.screen, marginBottom: S.md },
  similarCard: { width: 110 },
  similarPoster: { width: 110, height: 165, borderRadius: R.md },
});
