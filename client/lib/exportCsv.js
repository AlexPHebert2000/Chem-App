import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function doExport(path, token, filename) {
  const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const csv = await res.text();

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const filePath = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(filePath, csv, { encoding: 'utf8' });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Save report',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    Alert.alert('Export saved', `Report saved to:\n${filePath}`);
  }
}
