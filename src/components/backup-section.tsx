import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { backupCounts, exportBackup, parseBackup, restoreBackup } from '@/db/backup';
import { todayISO } from '@/lib/dates';

export function BackupSection({ onRestored }: { onRestored: () => void }) {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);

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
      const backup = await exportBackup(db);
      const file = new File(Paths.cache, `nutrition-tracker-backup-${todayISO()}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(backup));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save your Nutrition Tracker backup',
      });
    });

  const importData = () =>
    run(async () => {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/*', '*/*'], copyToCacheDirectory: true });
      if (picked.canceled) return;
      const backup = parseBackup(await new File(picked.assets[0].uri).text());
      const summary = backupCounts(backup)
        .filter((c) => c.count > 0)
        .map((c) => `${c.count} ${c.label}`)
        .join(', ');

      Alert.alert(
        'Replace all data?',
        `This backup (saved ${backup.exportedAt.slice(0, 10)}) has ${summary || 'no data'}.\n\nRestoring deletes everything currently in the app and replaces it with the backup. This can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () =>
              run(async () => {
                await restoreBackup(db, backup);
                onRestored();
                Alert.alert('Restored', 'Your backup was restored.');
              }),
          },
        ],
      );
    });

  return (
    <>
      <ThemedText type="smallBold" style={styles.heading}>
        Backup
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Export saves your diary, foods, meals, recipes and settings to a file you can keep in Drive, email, or anywhere
        else. Importing a backup replaces everything currently in the app.
      </ThemedText>
      <Button title="Export backup" onPress={exportData} disabled={busy} />
      <Button title="Import backup" variant="secondary" onPress={importData} disabled={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: Spacing.three },
});
