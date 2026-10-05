import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  options: readonly string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  title?: string;
};

/** A select box that opens its options in a scrollable list over the screen. */
export function Dropdown({ options, selectedIndex, onSelect, title }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.triggerText} numberOfLines={2}>
          {options[selectedIndex]}
        </ThemedText>
        <ThemedText themeColor="textSecondary">▼</ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
            {title && (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
                {title}
              </ThemedText>
            )}
            <FlatList
              data={options}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => {
                    onSelect(index);
                    setOpen(false);
                  }}
                  style={[styles.item, index === selectedIndex && { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText>{item}</ThemedText>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  triggerText: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four, backgroundColor: 'rgba(0,0,0,0.5)' },
  menu: { maxHeight: '70%', borderWidth: 1, borderRadius: 16, overflow: 'hidden', paddingVertical: Spacing.one },
  title: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  item: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
});
