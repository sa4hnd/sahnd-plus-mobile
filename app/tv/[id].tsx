import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { tvDetail, seasonDetail as fetchSeason, img, backdrop as bdrop } from '@/lib/tmdb';
import { addToWatchlist, removeFromWatchlist, isInWatchlist, addToHistory } from '@/lib/storage';
import { Colors, Spacing, Radius } from '@/lib/theme';
import ContentRow from '@/components/ContentRow';
import { MovieDetail, Episode } from '@/types';

const { width: W } = Dimensions.get('window');

export default function TVDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [show, setShow] = useState<MovieDetail | null>(null);
  const [inList, setInList] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEps, setLoadingEps] = useState(true);

  useEffect(() => {
    tvDetail(Number(id)).then(d => {
      setShow(d);
      const first = d.seasons?.find((s: any) => s.season_number > 0);
      if (first) setSelectedSeason(first.season_number);
    });
    isInWatchlist(Number(id), 'tv').then(setInList);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingEps(true);
    fetchSeason(Number(id), selectedSeason)
      .then(d => { setEpisodes(d.episodes || []); setLoadingEps(false); })
      .catch(() => setLoadingEps(false));
  }, [id, selectedSeason]);

  if (!show) return (
    <View style={s.loading}><Stack.Screen options={{ headerShown: false }} /><Text style={s.loadText}>Loading...</Text></View>
  );

  const title = show.name || show.title;
  const bg = bdrop(show.backdrop_path);
  const year = show.first_air_date?.slice(0, 4);
  const seasons = show.seasons?.filter((ss: any) => ss.season_number > 0) || [];

  const toggleWL = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (inList) { await removeFromWatchlist(show.id, 'tv'); setInList(false); }
    else { await addToWatchlist({ id: show.id, type: 'tv', title, poster_path: show.poster_path, vote_average: show.vote_average, addedAt: 0 }); setInList(true); }
  };

  const playEpisode = (ep: Episode) => {
    Haptics.selectionAsync();
    addToHistory({ id: show.id, type: 'tv', title, poster_path: show.poster_path, backdrop_path: show.backdrop_path, vote_average: show.vote_average, overview: show.overview || '', season: ep.season_number, episode: ep.episode_number });
    router.push(`/watch/${show.id}?type=tv&s=${ep.season_number}&e=${ep.episode_number}` as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView bounces showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        <View style={s.backdrop}>
          {bg && <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          <LinearGradient colors={['transparent', Colors.bg]} style={[StyleSheet.absoluteFill, { top: '40%' }]} />
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={{ color: '#fff', fontSize: 20 }}>‹</Text>
          </Pressable>
        </View>

        <View style={s.body}>
          <View style={s.row}>
            <Image source={{ uri: img(show.poster_path, 'w342')! }} style={s.poster} contentFit="cover" />
            <View style={s.info}>
              <Text style={s.title}>{title}</Text>
              <View style={s.meta}>
                <Text style={s.metaY}>★ {show.vote_average.toFixed(1)}</Text>
                {year && <Text style={s.metaT}>{year}</Text>}
                {show.number_of_seasons && <Text style={s.metaT}>{show.number_of_seasons} Season{show.number_of_seasons > 1 ? 's' : ''}</Text>}
              </View>
              <View style={s.genres}>
                {show.genres?.slice(0, 3).map(g => (
                  <View key={g.id} style={s.pill}><Text style={s.pillT}>{g.name}</Text></View>
                ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <Pressable onPress={() => playEpisode(episodes[0] || { season_number: 1, episode_number: 1 } as Episode)} style={({ pressed }) => [s.watchBtn, pressed && { opacity: 0.9 }]}>
              <Text style={s.watchIcon}>▶</Text>
              <Text style={s.watchText}>Watch S1 E1</Text>
            </Pressable>
            <Pressable onPress={toggleWL} style={s.listBtn}>
              <Text style={s.listBtnT}>{inList ? '✓' : '+'}</Text>
            </Pressable>
          </View>

          <Text style={s.overview}>{show.overview}</Text>

          {/* Season Selector */}
          <Text style={s.secTitle}>Episodes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
            {seasons.map((ss: any) => (
              <Pressable
                key={ss.season_number}
                onPress={() => { Haptics.selectionAsync(); setSelectedSeason(ss.season_number); }}
                style={[s.seasonPill, selectedSeason === ss.season_number && s.seasonActive]}
              >
                <Text style={[s.seasonText, selectedSeason === ss.season_number && s.seasonTextActive]}>
                  S{ss.season_number}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Episodes */}
          {loadingEps ? (
            <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={s.loadText}>Loading episodes...</Text>
            </View>
          ) : (
            episodes.map(ep => (
              <Pressable key={ep.id} onPress={() => playEpisode(ep)} style={({ pressed }) => [s.epRow, pressed && { opacity: 0.7 }]}>
                <View style={s.epThumb}>
                  {ep.still_path ? (
                    <Image source={{ uri: img(ep.still_path, 'w300')! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: Colors.textMuted, fontSize: 18 }}>▶</Text>
                    </View>
                  )}
                  {ep.runtime > 0 && (
                    <View style={s.epDur}><Text style={s.epDurT}>{ep.runtime}m</Text></View>
                  )}
                </View>
                <View style={s.epInfo}>
                  <Text style={s.epTitle} numberOfLines={1}>
                    <Text style={{ color: Colors.textMuted }}>{ep.episode_number}. </Text>
                    {ep.name}
                  </Text>
                  <Text style={s.epDesc} numberOfLines={2}>{ep.overview}</Text>
                </View>
              </Pressable>
            ))
          )}

          {show.similar?.results && show.similar.results.length > 0 && (
            <View style={{ marginTop: Spacing.lg }}>
              <ContentRow title="More Like This" data={show.similar.results} type="tv" />
            </View>
          )}
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  loadText: { color: Colors.textSecondary, fontSize: 14 },
  backdrop: { width: W, height: W * 0.6 },
  backBtn: { position: 'absolute', top: 56, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: Spacing.md, marginTop: -40 },
  row: { flexDirection: 'row', gap: 14 },
  poster: { width: 100, height: 150, borderRadius: Radius.lg },
  info: { flex: 1, justifyContent: 'flex-end' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  meta: { flexDirection: 'row', gap: 10, marginBottom: 6, alignItems: 'center' },
  metaY: { color: Colors.yellow, fontSize: 13, fontWeight: '700' },
  metaT: { color: Colors.textSecondary, fontSize: 12 },
  genres: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  pillT: { color: Colors.textSecondary, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, marginVertical: Spacing.md },
  watchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 14, borderRadius: Radius.full },
  watchIcon: { fontSize: 12, color: '#000' },
  watchText: { fontSize: 16, fontWeight: '700', color: '#000' },
  listBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  listBtnT: { color: '#fff', fontSize: 22, fontWeight: '300' },
  overview: { color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 22, marginBottom: Spacing.lg },
  secTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: Spacing.sm },
  seasonPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.05)' },
  seasonActive: { backgroundColor: '#fff' },
  seasonText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  seasonTextActive: { color: '#000' },
  epRow: { flexDirection: 'row', gap: 12, marginBottom: 12, padding: 8, borderRadius: Radius.lg, backgroundColor: 'rgba(255,255,255,0.02)' },
  epThumb: { width: 130, height: 73, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.elevated },
  epDur: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  epDurT: { color: '#fff', fontSize: 9 },
  epInfo: { flex: 1, justifyContent: 'center' },
  epTitle: { color: Colors.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  epDesc: { color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
});
