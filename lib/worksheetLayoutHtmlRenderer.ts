// lib/worksheetLayoutHtmlRenderer.ts

import { WorksheetLayout } from './worksheetLayoutBuilder';

type BrandAssets = {
  logoBase64?: string | null;
  logoUrl?: string | null;
};

function escapeHtml(value: string | null | undefined) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fontWeight(weight?: string) {
  if (weight === 'heavy') return '900';
  if (weight === 'bold') return '800';
  return '600';
}

function logoSrc(brandAssets?: BrandAssets) {
  if (brandAssets?.logoBase64) return brandAssets.logoBase64;
  if (brandAssets?.logoUrl) return brandAssets.logoUrl;
  return '';
}

export function buildWorksheetLayoutHtml({
  layout,
  brandAssets,
}: {
  layout: WorksheetLayout;
  brandAssets?: BrandAssets;
}) {
  const logo = logoSrc(brandAssets);

  const imageBlocks = layout.imageBlocks
    .map(
      (block) => `
        <div class="image-block" style="
          left:${block.x}px;
          top:${block.y}px;
          width:${block.width}px;
          height:${block.height}px;
        ">
          <img src="${block.imageUrl}" />
          ${
            block.label
              ? `<div class="image-label">${escapeHtml(block.label)}</div>`
              : ''
          }
        </div>
      `
    )
    .join('');

  const textBlocks = layout.textBlocks
    .map(
      (block) => `
        <div class="text-block" style="
          left:${block.x}px;
          top:${block.y}px;
          width:${block.width}px;
          font-size:${block.fontSize}px;
          font-weight:${fontWeight(block.fontWeight)};
          text-align:${block.align || 'left'};
          color:${layout.theme.textColor};
        ">
          ${escapeHtml(block.text)}
        </div>
      `
    )
    .join('');

  const lineBlocks = layout.lineBlocks
    .map(
      (block) => `
        <div class="line-block" style="
          left:${block.x}px;
          top:${block.y}px;
          width:${block.width}px;
        "></div>
      `
    )
    .join('');

  const missingAssets =
    layout.missingAssetKeys?.length > 0
      ? `
        <div class="missing-assets">
          Missing assets: ${layout.missingAssetKeys.map(escapeHtml).join(', ')}
        </div>
      `
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      background: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #0F172A;
    }

    .page {
      position: relative;
      width: ${layout.page.width}px;
      height: ${layout.page.height}px;
      margin: 0 auto;
      background: ${layout.page.backgroundColor || '#FFFFFF'};
      overflow: hidden;
      border: 4px solid ${layout.theme.accentColor};
      border-radius: 28px;
    }

    .brand-row {
      position: absolute;
      left: ${layout.page.margin}px;
      top: 22px;
      right: ${layout.page.margin}px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      height: 34px;
      max-width: 120px;
      object-fit: contain;
    }

    .name-date {
      font-size: 14px;
      font-weight: 800;
      color: #334155;
      display: flex;
      gap: 28px;
    }

    .badge {
      position: absolute;
      left: ${layout.page.margin}px;
      top: 82px;
      background: ${layout.theme.primaryColor};
      color: #FFFFFF;
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 0.5px;
      padding: 9px 18px;
      border-radius: 999px;
      text-transform: uppercase;
    }

    .meta-row {
      position: absolute;
      left: ${layout.page.margin}px;
      top: 205px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      width: ${layout.page.width - layout.page.margin * 2}px;
    }

    .meta-chip {
      border: 2px solid ${layout.theme.accentColor};
      background: ${layout.theme.softColor};
      color: ${layout.theme.primaryColor};
      font-size: 13px;
      font-weight: 900;
      padding: 7px 14px;
      border-radius: 999px;
    }

    .instruction-panel {
      position: absolute;
      left: ${layout.page.margin}px;
      top: 255px;
      width: ${layout.page.width - layout.page.margin * 2}px;
      min-height: 70px;
      border: 3px solid #BBF7D0;
      background: #F0FDF4;
      border-radius: 18px;
      padding: 16px;
    }

    .instruction-title {
      color: ${layout.theme.textColor};
      font-size: 23px;
      font-weight: 900;
      margin-bottom: 5px;
    }

    .instruction-text {
      color: #475569;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.35;
    }

    .text-block {
      position: absolute;
      line-height: 1.25;
      white-space: pre-wrap;
      z-index: 2;
    }

    .image-block {
      position: absolute;
      border: 3px solid #E9D5FF;
      background: #FFFFFF;
      border-radius: 20px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 3;
    }

    .image-block img {
      max-width: 100%;
      max-height: calc(100% - 26px);
      object-fit: contain;
      display: block;
    }

    .image-label {
      margin-top: 6px;
      color: ${layout.theme.textColor};
      font-size: 13px;
      font-weight: 900;
      text-align: center;
    }

    .line-block {
      position: absolute;
      border-bottom: 3px dashed #94A3B8;
      height: 2px;
      z-index: 1;
    }

    .footer-note {
      position: absolute;
      left: ${layout.page.margin}px;
      bottom: 26px;
      width: ${layout.page.width - layout.page.margin * 2}px;
      background: #F8FAFC;
      color: #64748B;
      font-size: 12px;
      font-weight: 800;
      padding: 12px 16px;
      border-radius: 14px;
      text-align: center;
    }

    .missing-assets {
      position: absolute;
      left: ${layout.page.margin}px;
      bottom: 78px;
      width: ${layout.page.width - layout.page.margin * 2}px;
      background: #FEF3C7;
      color: #92400E;
      border: 2px solid #FDE68A;
      border-radius: 14px;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 900;
      text-align: center;
    }

    @media print {
      body {
        background: #FFFFFF;
      }

      .page {
        margin: 0;
        border-radius: 0;
      }
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="brand-row">
      ${
        logo
          ? `<img class="logo" src="${logo}" />`
          : `<div style="font-weight:900;color:${layout.theme.primaryColor};">ABA at Home</div>`
      }

      <div class="name-date">
        <div>Name: ____________________</div>
        <div>Date: ______________</div>
      </div>
    </div>

    <div class="badge">ABA at Home Printable Worksheet</div>

    <div class="meta-row">
      <div class="meta-chip">Child: ${escapeHtml(layout.childName || 'Child')}</div>
      <div class="meta-chip">Level: ${escapeHtml(layout.difficulty)}</div>
      <div class="meta-chip">${escapeHtml(layout.category)}</div>
    </div>

    <div class="instruction-panel">
      <div class="instruction-title">${escapeHtml(layout.title)}</div>
      <div class="instruction-text">${escapeHtml(layout.instructions)}</div>
    </div>

    ${textBlocks}
    ${imageBlocks}
    ${lineBlocks}
    ${missingAssets}

    <div class="footer-note">
      Parent note: Use this worksheet for short, positive practice. Pair with praise,
      breaks, visual supports, and caregiver supervision. Educational support only.
    </div>
  </div>
</body>
</html>
`;
}