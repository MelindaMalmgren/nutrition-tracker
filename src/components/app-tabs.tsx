import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

// Android's bottom bar holds at most 5 tabs, so Foods, Meals and Recipes share the Library tab.
const TABS = [
  { name: 'index', label: 'Diary', sf: 'book', md: 'book_2' },
  { name: 'tracker', label: 'Tracker', sf: 'calendar', md: 'calendar_month' },
  { name: 'library', label: 'Library', sf: 'books.vertical', md: 'restaurant' },
  { name: 'settings', label: 'Settings', sf: 'gearshape', md: 'settings' },
] as const;

export default function AppTabs() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
      iconColor={{ default: colors.textSecondary, selected: colors.accentText }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
