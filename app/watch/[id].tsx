import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { sources } from '@/lib/sources';
import { addToHistory, markWatched } from '@/lib/storage';
import { movieDetail, tvDetail } from '@/lib/tmdb';
import { Colors, Spacing, Radius } from '@/lib/theme';

const { width: W } = Dimensions.get('window');

export default function WatchScreen() {
  const params = useLocalSearchParams<{ id: string; type: string; s?: string; e?: string }>();
  const router = useRouter();
  const [sourceIdx, setSourceIdx] = useState(0);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const mediaType = (params.type as 'movie' | 'tv') || 'movie';
  const season = params.s ? Number(params.s) : undefined;
  const episode = params.e ? Number(params.e) : undefined;
  const src = sources[sourceIdx];
  const embedUrl = src.getUrl(mediaType, Number(params.id), season, episode);

  useEffect(() => {
    const fetch = async () => {
      try {
        const d = mediaType === 'movie'
          ? await movieDetail(Number(params.id))
          : await tvDetail(Number(params.id));
        const t = d.title || d.name || '';
        setTitle(t);
        await addToHistory({
          id: Number(params.id), type: mediaType, title: t,
          poster_path: d.poster_path, backdrop_path: d.backdrop_path,
          vote_average: d.vote_average, season, episode,
        });
        // Mark watched after 5 min
        setTimeout(() => markWatched(Number(params.id), mediaType, season, episode), 300000);
      } catch {}
    };
    fetch();
  }, [params.id, mediaType, season, episode]);

  const changeSource = (i: number) => {
    Haptics.selectionAsync();
    setSourceIdx(i);
    setLoading(true);
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />
      <StatusBar hidden />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.closeBtn}>
          <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          {season && episode && (
            <Text style={s.headerSub}>S{season} E{episode}</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Player */}
      <View style={s.player}>
        {loading && (
          <View style={s.loadingOverlay}>
            <Text style={s.loadingText}>Connecting to {src.name}...</Text>
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
          onError={() => {
            // Auto try next source
            if (sourceIdx < sources.length - 1) changeSource(sourceIdx + 1);
          }}
        />
      </View>

      {/* Server selector */}
      <View style={s.serverBar}>
        <View style={s.serverHeader}>
          <View style={s.serverStatus}>
            <View style={[s.dot, loading ? s.dotYellow : s.dotGreen]} />
            <Text style={s.serverLabel}>{src.name}</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 0 }}>
          {sources.map((source, i) => (
            <Pressable
              key={source.name}
              onPress={() => changeSource(i)}
              style={[s.serverPill, i === sourceIdx && s.serverActive]}
            >
              {i === sourceIdx && !loading && <View style={[s.dot, s.dotGreen, { marginRight: 4 }]} />}
              <Text style={[s.serverPillText, i === sourceIdx && s.serverPillTextActive]}>
                {source.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Episode navigation for TV */}
      {mediaType === 'tv' && season && episode && (
        <View style={s.epNav}>
          {episode > 1 && (
            <Pressable
              onPress={() => router.replace(`/watch/${params.id}?type=tv&s=${season}&e=${episode - 1}` as any)}
              style={s.epNavBtn}
            >
              <Text style={s.epNavText}>‹ Previous</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace(`/watch/${params.id}?type=tv&s=${season}&e=${episode + 1}` as any)}
            style={[s.epNavBtn, s.epNavBtnNext]}
          >
            <Text style={[s.epNavText, { color: '#000' }]}>Next Episode ›</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 58, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 },
  player: { flex: 1, backgroundColor: '#000' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  serverBar: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(20,20,20,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  serverHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  serverStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: '#30D158' },
  dotYellow: { backgroundColor: '#FFD60A' },
  serverLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
  serverPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  serverActive: { backgroundColor: '#fff' },
  serverPillText: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600' },
  serverPillTextActive: { color: '#000' },
  epNav: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(20,20,20,0.98)',
  },
  epNavBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  epNavBtnNext: { backgroundColor: '#fff' },
  epNavText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
