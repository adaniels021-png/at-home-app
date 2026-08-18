import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { composeEmergencyPdfData } from './emergencyPdfData';
import { renderEmergencyPdfHtml } from './emergencyPdfTemplate';

export async function createAndShareEmergencyPdf(childId: string, options?: { includeActiveIncident?: boolean }) {
  const data = await composeEmergencyPdfData(childId, options);
  const result = await Print.printToFileAsync({ html: renderEmergencyPdfHtml(data), base64: false });
  try {
    if (!(await Sharing.isAvailableAsync())) return { shared: false as const };
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share Emergency Profile' });
    return { shared: true as const };
  } finally {
    await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined);
  }
}
