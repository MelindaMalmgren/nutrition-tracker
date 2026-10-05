import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { migrateDb } from '@/db/migrations';
import { SelectedDateProvider } from '@/lib/selected-date';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Suspense fallback={null}>
        <SQLiteProvider databaseName="nutrition.db" onInit={migrateDb} useSuspense>
          <SelectedDateProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="day" options={{ title: 'Diary' }} />
              <Stack.Screen name="add-food" options={{ title: 'Add food' }} />
              <Stack.Screen name="custom-food" options={{ title: 'New custom food' }} />
            </Stack>
          </SelectedDateProvider>
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}
