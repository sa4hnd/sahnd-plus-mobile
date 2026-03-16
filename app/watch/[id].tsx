import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { sources } from '@/lib/sources';
import { addToHistory, markWatched } from '@/lib/storage';
import { movieDetail, tvDetail, seasonDetail, img } from '@/lib/tmdb';
import { Colors, Radius } from '@/lib/theme';
import { MovieDetail, Episode } from '@/types';

const { width: W } = Dimensions.get('window');
const STREAM_API = 'http://localhost:3001'; // Change to your deployed URL

export default function WatchScreen() {
  const params = useLocalSearchParams<{ id: string; type: string; s?: string; e?: string }>();
  const router = useRouter();
  const mediaType = (params.type as 'movie' | 'tv') || 'movie';
  const tmdbId = Number(params.id);
  const season = params.s ? Number(params.s) : undefined;
  const episode = params.e ? Number(params.e) : undefined;

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [fallbackEmbed, setFallbackEmbed] = useState<string | null>(null);
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const title = detail?.title || detail?.name || '';

  // Try to get direct stream, fallback to embed
  useEffect(() => {
    setLoading(true);
    setError('');
    setStreamUrl(null);
    setFallbackEmbed(null);

    const load = async () => {
      // Fetch detail
      const d = mediaType === 'movie' ? await movieDetail(tmdbId) : await tvDetail(tmdbId);
      setDetail(d);

      // Record history
      addToHistory({
        id: tmdbId, type: mediaType, title: d.title || d.name || '',
        poster_path: d.poster_path, backdrop_path: d.backdrop_path,
        vote_average: d.vote_average, season, episode,
      });

      // Load episodes for TV
      if (mediaType === 'tv' && season) {
        try {
          const sd = await seasonDetail(tmdbId, season);
          setEpisodes(sd.episodes || []);
        } catch {}
      }

      // Try stream API for direct URL
      try {
        const res = await fetch(`${STREAM_API}/stream?tmdb_id=${tmdbId}&type=${mediaType}${season ? `&s=${season}&e=${episode}` : ''}`);
        const data = await res.json();
        if (data.success && data.proxied) {
          setStreamUrl(data.proxied);
          setLoading(false);
          return;
        }
      } catch {}

      // Fallback: use embed source in WebView-like approach
      const src = sources[sourceIdx];
      setFallbackEmbed(src.getUrl(mediaType, tmdbId, season, episode));
      setLoading(false);
    };

    load().catch(e => { setError(e.message); setLoading(false); });

    // Mark watched after 5 min
    const timer = setTimeout(() => markWatched(tmdbId, mediaType, season, episode), 300000);
    return () => clearTimeout(timer);
  }, [tmdbId, mediaType, season, episode, sourceIdx]);

  // Native video player
  const player = useVideoPlayer(streamUrl || '', (p) => {
    p.loop = false;
    if (streamUrl) p.play();
  });

  const playEpisode = (ep: Episode) => {
    Haptics.selectionAsync();
    router.replace(`/watch/${tmdbId}?type=tv&s=${ep.season_number}&e=${ep.episode_number}` as any);
  };

  const nextEp = episodes.find(ep => ep.episode_number === (episode || 0) + 1);

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />

      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn} hitSlop={12}>
          <Text style={st.backIcon}>‹</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={st.headerTitle} numberOfLines={1}>{title}</Text>
          {season && episode && <Text style={st.headerSub}>Season {season}, Episode {episode}</Text>}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Player Area */}
      <View style={st.playerWrap}>
        {loading ? (
          <View style={st.playerLoading}>
            <ActivityIndicator color={Colors.accent} size="large" />
            <Text style={st.loadingText}>Finding stream...</Text>
          </View>
        ) : streamUrl ? (
          <VideoView
            player={player}
            style={st.player}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
          />
        ) : fallbackEmbed ? (
          <View style={st.playerLoading}>
            <Text style={st.loadingText}>Native stream unavailable</Text>
            <Text style={[st.loadingText, { fontSize: 11, marginTop: 4 }]}>Using embed player</Text>
            {/* In production: use WebView here as final fallback */}
          </View>
        ) : error ? (
          <View style={st.playerLoading}>
            <Text style={[st.loadingText, { color: Colors.accent }]}>Failed to load</Text>
            <Pressable onPress={() => setSourceIdx(i => i + 1)} style={st.retryBtn}>
              <Text style={st.retryText}>Try Next Server</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Server selector */}
      <View style={st.serverBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
          {sources.map((src, i) => (
            <Pressable
              key={src.name}
              onPress={() => { Haptics.selectionAsync(); setSourceIdx(i); }}
              style={[st.serverPill, i === sourceIdx && st.serverActive]}
            >
              {i === sourceIdx && <View style={st.activeDot} />}
              <Text style={[st.serverText, i === sourceIdx && { color: '#000' }]}>{src.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Scrollable content below player */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={st.info}>
          <Text style={st.infoTitle}>{title}</Text>
          {detail?.tagline && <Text style={st.tagline}>"{detail.tagline}"</Text>}
          <View style={st.metaRow}>
            <Text style={st.metaYellow}>★ {detail?.vote_average?.toFixed(1)}</Text>
            {detail?.release_date && <Text style={st.metaText}>{detail.release_date.slice(0, 4)}</Text>}
            {detail?.runtime && <Text style={st.metaText}>{Math.floor(detail.runtime / 60)}h {detail.runtime % 60}m</Text>}
          </View>
          <Text style={st.overview} numberOfLines={4}>{detail?.overview}</Text>
        </View>

        {/* Next Episode button for TV */}
        {mediaType === 'tv' && nextEp && (
          <Pressable onPress={() => playEpisode(nextEp)} style={st.nextEpBtn}>
            <View>
              <Text style={st.nextEpLabel}>Next Episode</Text>
              <Text style={st.nextEpTitle}>{nextEp.episode_number}. {nextEp.name}</Text>
            </View>
            <Text style={{ color: '#000', fontSize: 18, fontWeight: '700' }}>▶</Text>
          </Pressable>
        )}

        {/* Season Episodes */}
        {mediaType === 'tv' && episodes.length > 0 && (
          <View style={st.epSection}>
            <Text style={st.epSectionTitle}>Season {season} Episodes</Text>
            {episodes.map(ep => {
              const isActive = ep.episode_number === episode;
              return (
                <Pressable
                  key={ep.id}
                  onPress={() => playEpisode(ep)}
                  style={[st.epRow, isActive && st.epRowActive]}
                >
                  <View style={st.epThumb}>
                    {ep.still_path ? (
                      <Image source={{ uri: img(ep.still_path, 'w300')! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: Colors.textMuted }}>▶</Text>
                      </View>
                    )}
                    {isActive && (
                      <View style={st.playingBadge}>
                        <View style={[st.bar, { height: 8 }]} />
                        <View style={[st.bar, { height: 12 }]} />
                        <View style={[st.bar, { height: 6 }]} />
                      </View>
                    )}
                    {ep.runtime > 0 && (
                      <View style={st.durationBadge}><Text style={st.durationText}>{ep.runtime}m</Text></View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.epTitle, isActive && { color: Colors.accent }]} numberOfLines={1}>
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
          <View style={{ marginTop: 24 }}>
            <Text style={st.epSectionTitle}>More Like This</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {detail.similar.results.slice(0, 10).map((m: any) => (
                <Pressable key={m.id} onPress={() => router.push(`/${mediaType}/${m.id}` as any)} style={{ width: 110 }}>
                  <Image source={{ uri: img(m.poster_path, 'w185')! }} style={{ width: 110, height: 165, borderRadius: 12 }} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
    backgroundColor: 'rgba(10,10,10,0.98)',
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: '#fff', fontSize: 24, fontWeight: '300', marginTop: -2 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerSub: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  playerWrap: { width: W, aspectRatio: 16 / 9, backgroundColor: '#000' },
  player: { width: '100%', height: '100%' },
  playerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: 14, marginTop: 12 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  serverBar: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.separator },
  serverPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  serverActive: { backgroundColor: '#fff' },
  serverText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#30D158' },
  info: { padding: 16 },
  infoTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  tagline: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic', marginBottom: 6 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'center' },
  metaYellow: { color: '#FFD60A', fontSize: 14, fontWeight: '700' },
  metaText: { color: Colors.textSecondary, fontSize: 13 },
  overview: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  nextEpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: Radius.lg,
    backgroundColor: '#fff',
  },
  nextEpLabel: { color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  nextEpTitle: { color: '#000', fontSize: 15, fontWeight: '700' },
  epSection: { paddingHorizontal: 16 },
  epSectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12, paddingHorizontal: 16 },
  epRow: { flexDirection: 'row', gap: 12, padding: 8, borderRadius: Radius.md, marginBottom: 6 },
  epRowActive: { backgroundColor: 'rgba(229,9,20,0.08)', borderWidth: 1, borderColor: 'rgba(229,9,20,0.2)' },
  epThumb: { width: 140, height: 79, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.elevated },
  playingBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  bar: { width: 3, backgroundColor: Colors.accent, borderRadius: 2 },
  durationBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  durationText: { color: '#fff', fontSize: 9 },
  epTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  epDesc: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  epRating: { color: '#FFD60A', fontSize: 11, marginTop: 4 },
});
