import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import * as Updates from 'expo-updates';

export default function RootLayout() {
  useEffect(() => {
    async function checkOTA() {
      if (__DEV__) return; // Skip in dev mode
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {}
    }
    checkOTA();
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="movie/[id]" />
        <Stack.Screen name="tv/[id]" />
        <Stack.Screen name="channel/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="watch/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="genre/[id]" />
        <Stack.Screen name="search/index" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="watchlist/index" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </ThemeProvider>
  );
}
