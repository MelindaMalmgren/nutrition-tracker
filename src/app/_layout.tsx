import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { migrateDb } from '@/db/migrations';
import { useTheme } from '@/hooks/use-theme';
import { SelectedDateProvider } from '@/lib/selected-date';

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const colors = useTheme();
  const scheme = useColorScheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accentText,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.backgroundSelected,
    },
  };
  return (
    <ThemeProvider value={navTheme}>
      <SelectedDateProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="day" options={{ title: 'Diary' }} />
          <Stack.Screen name="add-food" options={{ title: 'Add food' }} />
          <Stack.Screen name="custom-food" options={{ title: 'New custom food' }} />
        </Stack>
      </SelectedDateProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Suspense fallback={null}>
        <SQLiteProvider databaseName="nutrition.db" onInit={migrateDb} useSuspense>
          <Navigation />
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}
