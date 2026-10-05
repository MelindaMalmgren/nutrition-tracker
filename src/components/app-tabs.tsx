import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

const TABS = [
  { name: 'index', label: 'Diary', sf: 'book', md: 'book_2' },
  { name: 'foods', label: 'Foods', sf: 'fork.knife', md: 'restaurant' },
  { name: 'meals', label: 'Meals', sf: 'tray', md: 'lunch_dining' },
  { name: 'recipes', label: 'Recipes', sf: 'menucard', md: 'menu_book' },
  { name: 'settings', label: 'Settings', sf: 'gearshape', md: 'settings' },
] as const;

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
