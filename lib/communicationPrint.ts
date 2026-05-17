import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type PrintGridSize = '2x2' | '3x3' | '4x4';

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function imageUrlToBase64(uri: string): Promise<string> {
  try {
    const fileName =
      uri.split('/').pop()?.split('?')[0] || `pecs-${Date.now()}.png`;

    const localPath = `${FileSystem.cacheDirectory}${fileName}`;
    const downloaded = await FileSystem.downloadAsync(uri, localPath);

    const base64 = await FileSystem.readAsStringAsync(downloaded.uri, {
      encoding: 'base64' as any,
    });

    const lower = uri.toLowerCase();
    const mime =
      lower.endsWith('.jpg') || lower.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png';

    return `data:${mime};base64,${base64}`;
  } catch (error) {
    console.error('Image convert error:', error);
    return '';
  }
}

function getGridColumns(size: PrintGridSize) {
  if (size === '2x2') return 2;
  if (size === '4x4') return 4;
  return 3;
}

export async function printPecsCards(params: {
  cards: any[];
  gridSize: PrintGridSize;
  childName: string;
  category: string;
  getCardImageSource: (card: any) => any;
}) {
  const { cards, gridSize, childName, category, getCardImageSource } = params;

  const MAX_PRINT = 20;
  const safeCards = cards.slice(0, MAX_PRINT);
  const gridColumns = getGridColumns(gridSize);
  const todayLabel = new Date().toLocaleDateString();

  const htmlCards = (
    await Promise.all(
      safeCards.map(async (card) => {
        const imageSource = getCardImageSource(card);
        let imageUri = '';

        if (typeof imageSource === 'number') {
          const asset = Asset.fromModule(imageSource);
          await asset.downloadAsync();
          imageUri = asset.localUri || '';
        } else if (imageSource?.uri) {
          imageUri = imageSource.uri;
        }

        const printableImage = imageUri ? await imageUrlToBase64(imageUri) : '';

        const image = printableImage
          ? `<img src="${printableImage}" />`
          : `<div class="fallback">${escapeHtml(card.label?.charAt(0) || '')}</div>`;

        return `
          <div class="card">
            ${image}
            <div class="label">${escapeHtml(card.label || '')}</div>
          </div>
        `;
      })
    )
  ).join('');

  const html = `
    <html>
      <head>
        <style>
          @page {
            size: Letter;
            margin: 0.5in;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #111827;
          }

          .header {
            margin-bottom: 14px;
            border-bottom: 2px solid #111827;
            padding-bottom: 8px;
          }

          .header h1 {
            margin: 0;
            font-size: 24px;
          }

          .header p {
            margin: 4px 0 0;
            color: #475569;
            font-size: 14px;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(${gridColumns}, 1fr);
            gap: 14px;
          }

          .card {
            border: 2px solid #111827;
            border-radius: 10px;
            padding: 8px;
            text-align: center;
            page-break-inside: avoid;
            position: relative;
            min-height: 170px;
            background: white;
          }

          .card::after {
            content: "";
            position: absolute;
            inset: -7px;
            border: 1px dashed #CBD5E1;
            border-radius: 14px;
            pointer-events: none;
          }

          img {
            width: 100%;
            height: 120px;
            object-fit: contain;
            border-radius: 8px;
          }

          .label {
            margin-top: 8px;
            font-weight: bold;
            font-size: 16px;
            color: #111827;
          }

          .fallback {
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #EEF2FF;
            color: #4F46E5;
            font-size: 36px;
            font-weight: bold;
            border-radius: 8px;
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>PECS Cards</h1>
          <p>${escapeHtml(childName)} • ${escapeHtml(todayLabel)} • ${escapeHtml(category)}</p>
        </div>

        <div class="grid">
          ${htmlCards}
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
}