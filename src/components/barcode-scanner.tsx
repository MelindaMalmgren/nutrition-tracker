import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = { onScanned: (barcode: string) => void; onCancel: () => void };

export function BarcodeScanner({ onScanned, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.message}>
        <ThemedText>The camera is needed to scan barcodes.</ThemedText>
        {permission.canAskAgain ? (
          <Button title="Allow camera access" onPress={requestPermission} />
        ) : (
          <Button title="Open settings" onPress={() => Linking.openSettings()} />
        )}
        <Button title="Cancel" variant="secondary" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View style={styles.cameraFrame}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={({ data }) => {
            if (handled.current) return;
            handled.current = true;
            onScanned(data);
          }}
        />
        <View style={styles.hint} pointerEvents="none">
          <ThemedText type="small" style={styles.hintText}>
            Point the camera at a barcode
          </ThemedText>
        </View>
      </View>
      <View style={styles.cancel}>
        <Button title="Cancel" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cameraFrame: { flex: 1, margin: Spacing.three, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000000' },
  hint: { position: 'absolute', bottom: Spacing.three, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
  cancel: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  message: { padding: Spacing.three, gap: Spacing.three },
});
