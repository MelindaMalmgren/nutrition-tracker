import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRadius } from '@/hooks/use-radius';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/dates';

type Props = {
  /** Date that starts out selected and decides which month opens first. */
  initialDate: string;
  /** Text on the confirm button; the number of chosen days is appended. */
  actionLabel: string;
  busy?: boolean;
  onConfirm: (dates: string[]) => void;
  onClose: () => void;
};

function parseISO(iso: string) {
  const [year, month] = iso.split('-').map(Number);
  return { year, month: month - 1 };
}

/** A month calendar where any number of days can be toggled on, for logging one thing to several days at once. */
export function MultiDateModal({ initialDate, actionLabel, busy, onConfirm, onClose }: Props) {
  const radius = useRadius();
  const theme = useTheme();
  const [view, setView] = useState(() => parseISO(initialDate));
  const [selected, setSelected] = useState<Set<string>>(() => new Set([initialDate]));

  const toggle = (iso: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(iso)) next.add(iso);
      return next;
    });

  const today = todayISO();
  const count = selected.size;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close calendar" />
        <View
          style={[
            styles.card,
            { borderRadius: radius.card, backgroundColor: theme.background, borderColor: theme.backgroundSelected },
          ]}>
          <ThemedText type="smallBold">Select the days to add to</ThemedText>
          <MonthCalendar
            year={view.year}
            month={view.month}
            onChangeMonth={(year, month) => setView({ year, month })}
            onSelect={toggle}
            renderDay={(iso, day) => {
              const on = selected.has(iso);
              return (
                <View
                  style={[
                    styles.dayCircle,
                    on && { backgroundColor: theme.accent },
                    !on && iso === today && { borderColor: theme.textSecondary, borderWidth: 1 },
                  ]}
                  accessibilityState={{ selected: on }}>
                  <ThemedText style={on ? [styles.daySelectedText, { color: theme.onAccent }] : undefined}>{day}</ThemedText>
                </View>
              );
            }}
          />

          <View style={styles.footer}>
            <View style={styles.fill}>
              <Button title="Cancel" variant="secondary" onPress={onClose} />
            </View>
            <View style={styles.fill}>
              <Button
                title={count > 0 ? `${actionLabel} (${count} day${count === 1 ? '' : 's'})` : actionLabel}
                disabled={count === 0 || busy}
                onPress={() => onConfirm([...selected].sort())}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', padding: Spacing.three, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySelectedText: { fontWeight: '700' },
  footer: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.two },
});
