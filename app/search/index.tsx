import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Radio, Clock } from 'lucide-react-native';
import { searchMulti, img } from '@/lib/tmdb';
import { fetchChannels } from '@/lib/channels';
import { C, S, R, Layout, T, isTV } from '@/lib/design';
import TVPressable from '@/components/TVPressable';
import { Movie, Channel } from '@/types';

const { width: SW } = Dimensions.get('window');
const COLS = 3;
const GAP = S.rowGap;
const CARD_W = (SW - S.screen * 2 - GAP * (COLS - 1)) / COLS;
const RECENT_KEY = 'sahnd_recent_searches';

async function getRecent(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(RECENT_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function addRecent(q: string) {
  const list = await getRecent();
  const filtered = list.filter(s => s !== q);
  filtered.unshift(q);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 15)));
}

async function clearRecent() {
  await AsyncStorage.removeItem(RECENT_KEY);
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [channelResults, setChannelResults] = useState<Channel[]>([]);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchChannels()
      .then(cats => setAllChannels(cats.flatMap(c => c.channels)))
      .catch(() => {});
    getRecent().then(setRecentSearches);
  }, []);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setChannelResults([]); return; }

    const lq = q.toLowerCase();
    setChannelResults(allChannels.filter(ch =>
      ch.name.toLowerCase().includes(lq) || ch.category.toLowerCase().includes(lq)
    ));

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMulti(q);
        setResults((data.results || []).filter((r: Movie) => r.media_type !== 'person' && r.poster_path));
        addRecent(q.trim());
        getRecent().then(setRecentSearches);
      } catch { setResults([]); }
      setLoading(false);
      // Re-focus input so keyboard stays active on TV/Android
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 350);
  }, [allChannels]);

  const hasResults = results.length > 0 || channelResults.length > 0;

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={st.header}>
        <View style={st.headerTop}>
          <Text style={st.title}>Search</Text>
          <TVPressable onPress={() => router.back()} hitSlop={12}>
            <Text style={st.closeBtn}>{'\u2715'}</Text>
          </TVPressable>
        </View>
        <View style={st.searchBar}>
          <Text style={st.searchIcon}>{'\u2315'}</Text>
          <TextInput
            ref={inputRef}
            style={st.input}
            placeholder="Movies, shows, channels..."
            placeholderTextColor={C.text3}
            value={query}
            onChangeText={search}
            clearButtonMode="while-editing"
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
          />
        </View>
      </View>

      {hasResults ? (
        <FlatList
          data={[]}
          renderItem={null}
          keyboardDismissMode={isTV ? 'none' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <>
              {channelResults.length > 0 && (
                <View style={st.channelSection}>
                  <Text style={st.sectionLabel}>Channels ({channelResults.length})</Text>
                  <FlatList
                    data={channelResults.slice(0, 20)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={ch => ch.id}
                    contentContainerStyle={{ paddingHorizontal: S.screen, gap: 10 }}
                    renderItem={({ item }) => (
                      <TVPressable
                        onPress={() => { Haptics.selectionAsync(); if (isTV) { router.back(); } else { router.dismiss(); } router.push(`/channel/${item.id}` as any); }}
                        style={({ pressed }) => [st.chCard, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                      >
                        {item.logo ? (
                          <Image source={{ uri: item.logo }} style={st.chLogo} contentFit="contain" />
                        ) : (
                          <View style={[st.chLogo, st.chLogoFallback]}>
                            <Text style={st.chLogoText}>{item.name.slice(0, 2)}</Text>
                          </View>
                        )}
                        <View style={st.chInfo}>
                          <Text style={st.chName} numberOfLines={1}>{item.name}</Text>
                          <View style={st.chMeta}>
                            <Radio size={8} color={C.accent} />
                            <Text style={st.chCat}>{item.category}</Text>
                          </View>
                        </View>
                      </TVPressable>
                    )}
                  />
                </View>
              )}

              {results.length > 0 && (
                <View style={st.mediaSection}>
                  <Text style={st.sectionLabel}>Movies & Shows ({results.length})</Text>
                  <View style={st.mediaGrid}>
                    {results.map((item, idx) => {
                      const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';
                      return (
                        <TVPressable
                          key={item.id}
                          onPress={() => { Haptics.selectionAsync(); if (isTV) { router.back(); } else { router.dismiss(); } router.push(`/${type}/${item.id}` as any); }}
                          {...(isTV && idx === 0 ? { hasTVPreferredFocus: true } : {})}
                          style={({ pressed }) => [st.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                        >
                          <Image source={{ uri: img(item.poster_path, 'w342')! }} style={st.poster} contentFit="cover" transition={200} />
                        </TVPressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {loading && (
                <View style={{ paddingVertical: 20 }}>
                  <ActivityIndicator color={C.accent} />
                </View>
              )}
            </>
          }
        />
      ) : loading ? (
        <View style={st.empty}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : query ? (
        <View style={st.empty}>
          <Text style={st.emptyText}>No results for "{query}"</Text>
        </View>
      ) : (
        <View style={st.recentWrap}>
          {recentSearches.length > 0 ? (
            <>
              <View style={st.recentHeader}>
                <Text style={st.recentTitle}>Recent Searches</Text>
                <TVPressable onPress={() => { clearRecent(); setRecentSearches([]); }}>
                  <Text style={st.clearBtn}>Clear</Text>
                </TVPressable>
              </View>
              {recentSearches.map((s, i) => (
                <TVPressable
                  key={`${s}-${i}`}
                  onPress={() => search(s)}
                  style={st.recentRow}
                >
                  <Clock size={14} color={C.text3} />
                  <Text style={st.recentText}>{s}</Text>
                </TVPressable>
              ))}
            </>
          ) : (
            <View style={st.empty}>
              <Text style={st.emptyText}>Search for movies, shows, or channels</Text>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: Layout.safeTop, paddingHorizontal: S.screen, paddingBottom: S.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md },
  title: T.pageTitle,
  closeBtn: { color: C.text, fontSize: 20, fontWeight: '300' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.md, height: 40, paddingHorizontal: 12, gap: 8 },
  searchIcon: { color: C.text3, fontSize: 18 },
  input: { flex: 1, height: 40, color: C.text, fontSize: 16 },

  sectionLabel: { ...T.sectionTitle, fontSize: 14, paddingHorizontal: S.screen, marginBottom: S.sm },

  channelSection: { marginBottom: S.lg },
  chCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 10, borderRadius: R.md, width: 200 },
  chLogo: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.elevated },
  chLogoFallback: { justifyContent: 'center', alignItems: 'center' },
  chLogoText: { color: C.text3, fontSize: 12, fontWeight: '700' },
  chInfo: { flex: 1 },
  chName: { ...T.body, fontWeight: '600', fontSize: 13 },
  chMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  chCat: { ...T.small, color: C.text3 },

  mediaSection: { paddingHorizontal: S.screen },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: { width: CARD_W, marginBottom: GAP },
  poster: { width: CARD_W, height: CARD_W * 1.5, borderRadius: R.sm, backgroundColor: C.surface },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: C.text3, fontSize: 15 },

  recentWrap: { paddingHorizontal: S.screen, paddingTop: S.sm, flex: 1 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md },
  recentTitle: { ...T.sectionTitle },
  clearBtn: { color: C.accent, fontSize: 13, fontWeight: '600' },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  recentText: { color: C.text, fontSize: 15 },
});
