import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="movie/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tv/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="watch/[id]" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
        <Stack.Screen name="genre/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="search/index" options={{ animation: 'fade' }} />
      </Stack>
    </ThemeProvider>
  );
}
