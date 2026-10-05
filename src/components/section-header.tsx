import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

/** A list section label: an accent mark (a star for "Most used"), the title in small caps, and a hairline rule. */
export function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {title === 'Most used' ? (
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path d={STAR} fill={theme.accentText} stroke={theme.accentText} strokeWidth={2} strokeLinejoin="round" />
        </Svg>
      ) : (
        <View style={[styles.bar, { backgroundColor: theme.accentText }]} />
      )}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.rule, { backgroundColor: theme.backgroundSelected }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.three, paddingBottom: Spacing.one },
  bar: { width: 3, height: 14, borderRadius: 2 },
  title: { letterSpacing: 0.8 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
