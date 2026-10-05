import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  CATEGORIES,
  categoryCounts,
  exportBackup,
  importSelection,
  parseBackup,
  type Backup,
  type Category,
  type ImportMode,
} from '@/db/backup';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/dates';

const MODE_OPTIONS = ['Update', 'Add new only'] as const;

const EFFECTS: Record<ImportMode, Record<Category, string>> = {
  update: {
    diary: 'Replaces all of your daily logs.',
    foods: 'Adds foods you don\'t have yet; the ones you have are kept.',
    meals: 'Adds new meals and updates ones with the same name.',
    recipes: 'Adds new recipes and updates ones with the same name.',
    settings: 'Replaces your goals and ring display.',
  },
  add: {
    diary: 'Adds days that have no entries yet; days you\'ve logged are left alone.',
    foods: 'Adds foods you don\'t have yet; the ones you have are kept.',
    meals: 'Adds meals with a new name; same-named ones are left alone.',
    recipes: 'Adds recipes with a new name; same-named ones are left alone.',
    settings: 'Adds settings you haven\'t set; existing ones are kept.',
  },
};

export function BackupSection({ onRestored }: { onRestored: () => void }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [mode, setMode] = useState<ImportMode>('update');

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const exportData = () =>
    run(async () => {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn\'t available on this device.');
      const data = await exportBackup(db);
      const file = new File(Paths.cache, `nutrition-tracker-backup-${todayISO()}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(data));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save your Nutrition Tracker backup',
      });
    });

  const pickFile = () =>
    run(async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      // fetch rather than File.text(): the picker's cached copy can sit outside the folders expo-file-system may read.
      const text = await (await fetch(picked.assets[0].uri)).text();
      const parsed = parseBackup(text);
      const counts = categoryCounts(parsed);
      setSelected(new Set(CATEGORIES.filter((c) => counts[c.key] > 0).map((c) => c.key)));
      setMode('update');
      setBackup(parsed);
    });

  const toggle = (key: Category, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const importChosen = () => {
    if (!backup) return;
    const chosen = backup;
    setBackup(null);
    run(async () => {
      const result = await importSelection(db, chosen, selected, mode);
      onRestored();
      const notes: string[] = [];
      const { recipes, meals, diaryDays } = result.skippedExisting;
      if (recipes > 0) notes.push(`${recipes} recipe(s) with an existing name`);
      if (meals > 0) notes.push(`${meals} meal(s) with an existing name`);
      if (diaryDays > 0) notes.push(`${diaryDays} day(s) that already had entries`);
      const lines = ['Your backup was imported.'];
      if (notes.length > 0) lines.push(`Left alone: ${notes.join(', ')}.`);
      if (result.skippedMealItems > 0) {
        lines.push(`${result.skippedMealItems} meal item(s) were skipped because their recipe wasn't imported.`);
      }
      Alert.alert('Imported', lines.join('\n\n'));
    });
  };

  const counts = backup ? categoryCounts(backup) : null;
  const everything = mode === 'update' && CATEGORIES.every((c) => selected.has(c.key));

  return (
    <>
      <ThemedText type="smallBold" style={styles.heading}>
        Backup
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Export saves your diary, foods, meals, recipes and settings to a file you can keep in Drive, email, or anywhere
        else. When you import, you choose which parts to bring in.
      </ThemedText>
      <Button title="Export backup" onPress={exportData} disabled={busy} />
      <Button title="Import backup" variant="secondary" onPress={pickFile} disabled={busy} />

      <Modal visible={backup !== null} transparent animationType="fade" onRequestClose={() => setBackup(null)}>
        <Pressable style={styles.backdrop} onPress={() => setBackup(null)}>
          <Pressable
            style={[styles.card, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
            onPress={() => {}}>
            <ScrollView contentContainerStyle={styles.cardContent}>
            <ThemedText type="subtitle">What to import</ThemedText>
            {backup && (
              <ThemedText type="small" themeColor="textSecondary">
                Backup saved {backup.exportedAt.slice(0, 10)}
              </ThemedText>
            )}

            <SegmentedControl
              options={MODE_OPTIONS}
              value={mode === 'update' ? 'Update' : 'Add new only'}
              onChange={(option) => setMode(option === 'Update' ? 'update' : 'add')}
            />

            {counts &&
              CATEGORIES.map((c) => (
                <View key={c.key} style={styles.row}>
                  <View style={styles.rowText}>
                    <ThemedText>
                      {c.label}
                      {c.key !== 'settings' ? ` (${counts[c.key]})` : ''}
                    </ThemedText>
                    {selected.has(c.key) && !everything && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {EFFECTS[mode][c.key]}
                      </ThemedText>
                    )}
                  </View>
                  <Switch
                    value={selected.has(c.key)}
                    onValueChange={(on) => toggle(c.key, on)}
                    disabled={counts[c.key] === 0}
                  />
                </View>
              ))}

            <ThemedText type="small" themeColor="textSecondary">
              {mode === 'add'
                ? 'Nothing that\'s already in the app is changed or deleted. Foods that the selected meals and recipes use are added automatically.'
                : everything
                  ? 'Everything is selected, so this replaces all the data in the app with the backup. This can\'t be undone.'
                  : 'Foods that the selected meals and recipes use are added automatically. Anything not selected is left alone. This can\'t be undone.'}
            </ThemedText>

            <Button
              title={everything ? 'Replace everything' : 'Import selected'}
              variant={everything ? 'danger' : 'primary'}
              disabled={selected.size === 0}
              onPress={importChosen}
            />
            <Button title="Cancel" variant="secondary" onPress={() => setBackup(null)} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: Spacing.three },
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { maxHeight: '90%', borderWidth: 1, borderRadius: 16 },
  cardContent: { padding: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowText: { flex: 1 },
});
