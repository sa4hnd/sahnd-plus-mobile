import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import * as Updates from 'expo-updates';

// Force LTR layout regardless of device locale (Arabic, Kurdish, etc.)
if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

export default function RootLayout() {
  useEffect(() => {
    async function checkOTA() {
      if (__DEV__) return;
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
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="movie/[id]" />
        <Stack.Screen name="tv/[id]" />
        <Stack.Screen name="channel/[id]" options={{ gestureEnabled: true }} />
        <Stack.Screen name="watch/[id]" options={{ gestureEnabled: true }} />
        <Stack.Screen name="genre/[id]" />
        <Stack.Screen name="search/index" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }} />
        <Stack.Screen name="watchlist/index" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }} />
      </Stack>
    </ThemeProvider>
  );
}
