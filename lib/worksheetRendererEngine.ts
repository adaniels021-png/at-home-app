// lib/worksheetRendererEngine.ts

import {
  WorksheetImageBlock,
  WorksheetLayout,
  WorksheetLayoutType
} from './worksheetLayoutBuilder';

export type WorksheetRendererDNA = {
  targetSkill?: string;
  worksheetType?: string;
  worksheetStyle?: string;
  childInstructions?: string;
  parentInstructions?: string;
  therapistGoal?: string;
  objective?: string;
  promptingHierarchy?: string[];
  reinforcementIdeas?: string[];
  generalizationIdeas?: string[];
  masteryCriteria?: string;
  materialsNeeded?: string[];
};

export type RenderWorksheetInput = {
  layout: WorksheetLayout;
  worksheetDNA?: WorksheetRendererDNA | null;
  brandAssets?: {
    logoUrl?: string | null;
    appName?: string | null;
  } | null;
};

type RendererTheme = WorksheetLayout['theme'];

function escapeHtml(value?: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeLabel(value?: string | null) {
  return String(value || '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value?: string | null) {
  return normalizeLabel(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getReadableDifficulty(value?: string | null) {
  if (value === 'intermediate') return 'Intermediate';
  if (value === 'advanced') return 'Advanced';
  return 'Beginner';
}

function getChildInstructions(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  return (
    dna?.childInstructions ||
    layout.instructions ||
    'Look, point, color, match, or practice with help.'
  );
}

function getParentGoal(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  return (
    dna?.objective ||
    dna?.therapistGoal ||
    `Practice ${layout.title} using short, positive home practice.`
  );
}

function getParentInstructions(dna?: WorksheetRendererDNA | null) {
  return (
    dna?.parentInstructions ||
    'Use simple language, model the answer, give wait time, and praise effort. Keep practice short and positive.'
  );
}

function getMasteryCriteria(dna?: WorksheetRendererDNA | null) {
  return (
    dna?.masteryCriteria ||
    'Child completes the target skill with reduced prompting across multiple practice opportunities.'
  );
}

function getPromptingText(dna?: WorksheetRendererDNA | null) {
  if (dna?.promptingHierarchy?.length) {
    return dna.promptingHierarchy.join(' → ');
  }

  return 'Visual prompt → model prompt → gesture prompt → verbal prompt → independent';
}

function getMaterialsText(dna?: WorksheetRendererDNA | null) {
  if (dna?.materialsNeeded?.length) {
    return dna.materialsNeeded.join(', ');
  }

  return 'Crayons, scissors if cutting, glue if pasting, and a calm practice space';
}

function getImageBlocks(layout: WorksheetLayout) {
  return layout.imageBlocks || [];
}

function getPrimaryImages(layout: WorksheetLayout, max = 8) {
  return getImageBlocks(layout).slice(0, max);
}

function getImageLabel(block: WorksheetImageBlock, fallbackIndex: number) {
  return block.label || toTitleCase(block.assetKey) || `Picture ${fallbackIndex + 1}`;
}

function getImageUrl(block?: WorksheetImageBlock | null) {
  return block?.imageUrl || '';
}

function renderBrandMark(brandAssets?: RenderWorksheetInput['brandAssets']) {
  const appName = brandAssets?.appName || 'ABA at Home';

  if (brandAssets?.logoUrl) {
    return `<img class="brand-logo" src="${escapeHtml(brandAssets.logoUrl)}" alt="${escapeHtml(appName)}" />`;
  }

  return `<div class="brand-dot">ABA</div>`;
}

function renderHeader(layout: WorksheetLayout, brandAssets?: RenderWorksheetInput['brandAssets']) {
  const appName = brandAssets?.appName || 'ABA at Home';

  return `
    <header class="worksheet-header">
      <div class="brand-wrap">
        ${renderBrandMark(brandAssets)}
        <div>
          <div class="brand-name">${escapeHtml(appName)}</div>
          <div class="brand-subtitle">Printable Skill Practice</div>
        </div>
      </div>

      <div class="name-date-wrap">
        <div>Name: ____________________</div>
        <div>Date: ______________</div>
      </div>
    </header>

    <section class="title-panel">
      <div>
        <div class="category-pill">${escapeHtml(layout.category)}</div>
        <h1>${escapeHtml(layout.title)}</h1>
        <p>${escapeHtml(getChildInstructions(layout))}</p>
      </div>
      <div class="level-badge">
        <span>Level</span>
        <strong>${escapeHtml(getReadableDifficulty(layout.difficulty))}</strong>
      </div>
    </section>
  `;
}

function renderFooter(layout: WorksheetLayout) {
  return `
    <footer class="worksheet-footer">
      <span>${escapeHtml(layout.footerText || 'ABA at Home')}</span>
      <span>${escapeHtml(getReadableDifficulty(layout.difficulty))} • ${escapeHtml(normalizeLabel(layout.layoutType))}</span>
    </footer>
  `;
}

function renderParentGuide(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  return `
    <section class="parent-guide">
      <div class="guide-heading">Parent Guide</div>
      <div class="guide-grid">
        <div>
          <strong>Goal:</strong>
          <span>${escapeHtml(getParentGoal(layout, dna))}</span>
        </div>
        <div>
          <strong>How to help:</strong>
          <span>${escapeHtml(getParentInstructions(dna))}</span>
        </div>
      </div>
    </section>
  `;
}

function renderTherapistNotes(dna?: WorksheetRendererDNA | null) {
  return `
    <section class="therapist-notes">
      <div class="guide-heading">ABA Notes</div>
      <div class="guide-grid compact">
        <div>
          <strong>Prompting:</strong>
          <span>${escapeHtml(getPromptingText(dna))}</span>
        </div>
        <div>
          <strong>Mastery:</strong>
          <span>${escapeHtml(getMasteryCriteria(dna))}</span>
        </div>
      </div>
    </section>
  `;
}

function renderEmptyPictureBox(label: string, index: number) {
  return `
    <div class="picture-card empty-card color-${index % 6}">
      <div class="picture-placeholder">Draw<br />or paste</div>
      <div class="picture-label">${escapeHtml(label)}</div>
    </div>
  `;
}

function renderPictureCard(block: WorksheetImageBlock | undefined, index: number, labelOverride?: string) {
  const label = labelOverride || (block ? getImageLabel(block, index) : `Step ${index + 1}`);
  const imageUrl = getImageUrl(block);

  if (!imageUrl) {
    return renderEmptyPictureBox(label, index);
  }

  return `
    <div class="picture-card color-${index % 6}">
      <div class="picture-frame">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}" />
      </div>
      <div class="picture-label">${escapeHtml(label)}</div>
    </div>
  `;
}

function renderStepCard(block: WorksheetImageBlock | undefined, index: number, labelOverride?: string) {
  const label = labelOverride || (block ? getImageLabel(block, index) : `Step ${index + 1}`);
  const imageUrl = getImageUrl(block);

  return `
    <div class="step-card color-${index % 6}">
      <div class="step-number">${index + 1}</div>
      <div class="step-art">
        ${
          imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}" />`
            : `<div class="picture-placeholder small">Draw<br />or paste</div>`
        }
      </div>
      <div class="step-label">${escapeHtml(label)}</div>
    </div>
  `;
}

function renderWritingLines(count = 3) {
  return Array.from({ length: count })
    .map(() => '<div class="writing-line"></div>')
    .join('');
}

function renderCutPasteStrip(images: WorksheetImageBlock[]) {
  const cards = images.slice(0, 6).map((image, index) => renderPictureCard(image, index)).join('');

  return `
    <section class="cut-strip">
      <div class="section-small-title">Optional Cut & Paste</div>
      <div class="cut-strip-text">Cut out the pictures. Put them in order. Practice the skill.</div>
      <div class="mini-card-row">${cards || renderEmptyPictureBox('Practice picture', 0)}</div>
    </section>
  `;
}

function renderVisualRoutine(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  const images = getPrimaryImages(layout, 6);
  const stepCards = Array.from({ length: Math.max(4, Math.min(6, images.length || 6)) })
    .map((_, index) => renderStepCard(images[index], index))
    .join('');

  return `
    <main class="worksheet-main routine-main">
      <section class="instruction-card">
        <div class="section-title">Practice the Steps</div>
        <div class="section-text">${escapeHtml(getChildInstructions(layout, dna))}</div>
      </section>

      <section class="step-grid">
        ${stepCards}
      </section>

      ${renderCutPasteStrip(images)}
    </main>
  `;
}

function renderMatching(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  const images = getPrimaryImages(layout, 5);
  const rows = Array.from({ length: Math.max(4, Math.min(5, images.length || 5)) })
    .map((_, index) => {
      const image = images[index];
      const label = image ? getImageLabel(image, index) : `Match ${index + 1}`;
      const imageUrl = getImageUrl(image);

      return `
        <div class="match-row">
          <div class="match-picture">
            ${
              imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}" />`
                : `<div class="picture-placeholder small">Draw</div>`
            }
          </div>
          <div class="match-line"></div>
          <div class="match-word">${escapeHtml(label)}</div>
        </div>
      `;
    })
    .join('');

  return `
    <main class="worksheet-main">
      <section class="instruction-card blue-card">
        <div class="section-title">Match It</div>
        <div class="section-text">${escapeHtml(getChildInstructions(layout, dna))}</div>
      </section>
      <section class="match-table">${rows}</section>
    </main>
  `;
}

function renderSorting(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  const images = getPrimaryImages(layout, 8);
  const cards = Array.from({ length: Math.max(4, Math.min(8, images.length || 8)) })
    .map((_, index) => renderPictureCard(images[index], index))
    .join('');

  return `
    <main class="worksheet-main">
      <section class="instruction-card green-card">
        <div class="section-title">Sort It</div>
        <div class="section-text">${escapeHtml(getChildInstructions(layout, dna))}</div>
      </section>

      <section class="sort-columns">
        <div class="sort-column"><strong>Group 1</strong><span>Place pictures here</span></div>
        <div class="sort-column"><strong>Group 2</strong><span>Place pictures here</span></div>
      </section>

      <section class="card-bank">
        <div class="section-small-title">Picture Bank</div>
        <div class="mini-card-grid">${cards}</div>
      </section>
    </main>
  `;
}

function renderTrace(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  const images = getPrimaryImages(layout, 4);
  const rows = Array.from({ length: Math.max(3, Math.min(4, images.length || 4)) })
    .map((_, index) => {
      const image = images[index];
      const label = image ? getImageLabel(image, index) : `Word ${index + 1}`;
      const imageUrl = getImageUrl(image);

      return `
        <div class="trace-row">
          <div class="trace-picture">
            ${
              imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)}" />`
                : `<div class="picture-placeholder small">Draw</div>`
            }
          </div>
          <div class="trace-work">
            <div class="trace-word">${escapeHtml(label.toUpperCase())}</div>
            ${renderWritingLines(2)}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <main class="worksheet-main">
      <section class="instruction-card yellow-card">
        <div class="section-title">Trace & Say</div>
        <div class="section-text">${escapeHtml(getChildInstructions(layout, dna))}</div>
      </section>
      <section class="trace-table">${rows}</section>
    </main>
  `;
}

function renderBehaviorLog(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  const rows = Array.from({ length: 6 })
    .map(
      () => `
        <tr>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `
    )
    .join('');

  return `
    <main class="worksheet-main">
      <section class="instruction-card red-card">
        <div class="section-title">ABC Behavior Log</div>
        <div class="section-text">${escapeHtml(getChildInstructions(layout, dna))}</div>
      </section>

      <table class="abc-log">
        <thead>
          <tr>
            <th>Date / Time</th>
            <th>Antecedent<br /><span>What happened before?</span></th>
            <th>Behavior<br /><span>What did the child do?</span></th>
            <th>Consequence<br /><span>What happened after?</span></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  `;
}

function renderBlankPractice(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  const images = getPrimaryImages(layout, 6);
  const cards = Array.from({ length: Math.max(3, Math.min(6, images.length || 6)) })
    .map((_, index) => renderPictureCard(images[index], index))
    .join('');

  return `
    <main class="worksheet-main">
      <section class="instruction-card purple-card">
        <div class="section-title">Practice Page</div>
        <div class="section-text">${escapeHtml(getChildInstructions(layout, dna))}</div>
      </section>
      <section class="mini-card-grid large-grid">${cards}</section>
      <section class="write-box">
        <div class="section-small-title">My Practice</div>
        ${renderWritingLines(4)}
      </section>
    </main>
  `;
}

function renderWorksheetBody(layout: WorksheetLayout, dna?: WorksheetRendererDNA | null) {
  const layoutType = layout.layoutType as WorksheetLayoutType;

  if (layoutType === 'visual-routine-steps') return renderVisualRoutine(layout, dna);
  if (layoutType === 'matching-grid') return renderMatching(layout, dna);
  if (layoutType === 'sorting-grid') return renderSorting(layout, dna);
  if (layoutType === 'trace-and-label') return renderTrace(layout, dna);
  if (layoutType === 'behavior-log') return renderBehaviorLog(layout, dna);

  return renderBlankPractice(layout, dna);
}

function renderBaseStyles(theme: RendererTheme) {
  return `
    <style>
      @page {
        size: letter portrait;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #F8FAFC;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        color: #0F172A;
      }

      .worksheet-page {
        width: 850px;
        height: 1100px;
        margin: 0 auto;
        background:
          radial-gradient(circle at top left, ${escapeHtml(theme.softColor)} 0, transparent 260px),
          linear-gradient(180deg, #FFFFFF 0%, #FFFBF5 100%);
        border: 1px solid #E5E7EB;
        padding: 32px 42px 28px;
        position: relative;
        overflow: hidden;
      }

      .worksheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 18px;
      }

      .brand-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-logo {
        width: 54px;
        height: 54px;
        object-fit: contain;
        border-radius: 16px;
      }

      .brand-dot {
        width: 54px;
        height: 54px;
        border-radius: 17px;
        background: ${escapeHtml(theme.primaryColor)};
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 900;
      }

      .brand-name {
        font-size: 17px;
        font-weight: 900;
        color: ${escapeHtml(theme.textColor)};
      }

      .brand-subtitle {
        margin-top: 2px;
        color: #64748B;
        font-size: 11px;
        font-weight: 800;
      }

      .name-date-wrap {
        display: flex;
        gap: 18px;
        color: #1E293B;
        font-size: 13px;
        font-weight: 900;
      }

      .title-panel {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        align-items: flex-start;
        background: #FFFFFF;
        border: 3px solid ${escapeHtml(theme.accentColor)};
        border-radius: 28px;
        padding: 20px 22px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      }

      .category-pill {
        display: inline-flex;
        border-radius: 999px;
        background: ${escapeHtml(theme.softColor)};
        color: ${escapeHtml(theme.textColor)};
        border: 1px solid ${escapeHtml(theme.accentColor)};
        padding: 7px 12px;
        font-size: 11px;
        font-weight: 900;
        margin-bottom: 9px;
      }

      h1 {
        margin: 0;
        color: ${escapeHtml(theme.textColor)};
        font-size: 31px;
        line-height: 1.05;
        letter-spacing: -0.6px;
      }

      .title-panel p {
        margin: 10px 0 0;
        color: #475569;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.4;
        max-width: 560px;
      }

      .level-badge {
        min-width: 92px;
        border-radius: 22px;
        background: ${escapeHtml(theme.primaryColor)};
        color: #FFFFFF;
        padding: 14px 12px;
        text-align: center;
      }

      .level-badge span {
        display: block;
        font-size: 10px;
        font-weight: 800;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }

      .level-badge strong {
        display: block;
        margin-top: 4px;
        font-size: 14px;
        font-weight: 900;
      }

      .worksheet-main {
        margin-top: 18px;
      }

      .instruction-card {
        border-radius: 22px;
        padding: 15px 18px;
        background: ${escapeHtml(theme.softColor)};
        border: 2px solid ${escapeHtml(theme.accentColor)};
        margin-bottom: 16px;
      }

      .blue-card { background: #EFF6FF; border-color: #93C5FD; }
      .green-card { background: #F0FDF4; border-color: #86EFAC; }
      .yellow-card { background: #FEFCE8; border-color: #FDE68A; }
      .red-card { background: #FEF2F2; border-color: #FCA5A5; }
      .purple-card { background: #F5F3FF; border-color: #C4B5FD; }

      .section-title,
      .section-small-title {
        color: ${escapeHtml(theme.textColor)};
        font-weight: 900;
      }

      .section-title {
        font-size: 19px;
      }

      .section-small-title {
        font-size: 14px;
        margin-bottom: 5px;
      }

      .section-text {
        margin-top: 4px;
        color: #475569;
        font-size: 13px;
        line-height: 1.35;
        font-weight: 800;
      }

      .step-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
      }

      .step-card,
      .picture-card {
        border-radius: 24px;
        border: 2px solid #CBD5E1;
        background: #FFFFFF;
        min-height: 168px;
        padding: 13px;
        position: relative;
        overflow: hidden;
      }

      .step-card {
        min-height: 182px;
      }

      .color-0 { background: #FCE7F3; }
      .color-1 { background: #EDE9FE; }
      .color-2 { background: #DBEAFE; }
      .color-3 { background: #DCFCE7; }
      .color-4 { background: #FEF9C3; }
      .color-5 { background: #FFEDD5; }

      .step-number {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: ${escapeHtml(theme.primaryColor)};
        color: #FFFFFF;
        font-size: 16px;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .step-art,
      .picture-frame,
      .match-picture,
      .trace-picture {
        background: rgba(255, 255, 255, 0.85);
        border: 2px solid rgba(15, 23, 42, 0.08);
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .step-art {
        height: 86px;
        margin-top: 9px;
      }

      .step-art img,
      .picture-frame img,
      .match-picture img,
      .trace-picture img {
        max-width: 92%;
        max-height: 92%;
        object-fit: contain;
      }

      .step-label,
      .picture-label {
        margin-top: 8px;
        color: #111827;
        text-align: center;
        font-size: 14px;
        line-height: 1.2;
        font-weight: 900;
      }

      .picture-frame {
        height: 96px;
      }

      .picture-placeholder {
        color: #94A3B8;
        text-align: center;
        font-size: 13px;
        line-height: 1.2;
        font-weight: 900;
      }

      .picture-placeholder.small {
        font-size: 11px;
      }

      .cut-strip,
      .card-bank,
      .write-box,
      .parent-guide,
      .therapist-notes {
        margin-top: 16px;
        border-radius: 22px;
        padding: 14px 16px;
        background: #FFFFFF;
        border: 2px dashed #FDBA74;
      }

      .cut-strip-text {
        color: #64748B;
        font-size: 12px;
        font-weight: 800;
        margin-bottom: 10px;
      }

      .mini-card-row {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 8px;
      }

      .mini-card-row .picture-card {
        min-height: 98px;
        padding: 7px;
        border-radius: 16px;
      }

      .mini-card-row .picture-frame {
        height: 48px;
        border-radius: 12px;
      }

      .mini-card-row .picture-label {
        font-size: 9px;
      }

      .match-table {
        background: #FFFFFF;
        border: 2px solid #BFDBFE;
        border-radius: 24px;
        padding: 14px;
      }

      .match-row {
        display: grid;
        grid-template-columns: 110px 1fr 210px;
        gap: 16px;
        align-items: center;
        min-height: 92px;
        border-bottom: 2px dashed #CBD5E1;
        padding: 8px 0;
      }

      .match-row:last-child {
        border-bottom: none;
      }

      .match-picture {
        height: 76px;
      }

      .match-line {
        height: 3px;
        background: repeating-linear-gradient(to right, #94A3B8 0 14px, transparent 14px 22px);
      }

      .match-word {
        border-radius: 18px;
        background: #F8FAFC;
        border: 2px solid #E2E8F0;
        padding: 14px;
        color: #1E293B;
        text-align: center;
        font-size: 18px;
        font-weight: 900;
      }

      .sort-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .sort-column {
        min-height: 235px;
        border-radius: 26px;
        background: #FFFFFF;
        border: 3px dashed ${escapeHtml(theme.accentColor)};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: ${escapeHtml(theme.textColor)};
      }

      .sort-column strong {
        font-size: 24px;
        font-weight: 900;
      }

      .sort-column span {
        margin-top: 8px;
        color: #94A3B8;
        font-size: 13px;
        font-weight: 800;
      }

      .mini-card-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }

      .mini-card-grid .picture-card {
        min-height: 130px;
        padding: 9px;
      }

      .large-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .trace-table {
        display: grid;
        gap: 12px;
      }

      .trace-row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 14px;
        background: #FFFFFF;
        border: 2px solid #FDE68A;
        border-radius: 22px;
        padding: 12px;
      }

      .trace-picture {
        height: 96px;
        background: #FEFCE8;
      }

      .trace-word {
        color: #1E293B;
        font-size: 28px;
        font-weight: 900;
        letter-spacing: 2px;
        margin-bottom: 6px;
      }

      .writing-line {
        height: 28px;
        border-bottom: 3px solid #CBD5E1;
        margin-bottom: 8px;
      }

      .abc-log {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
        border-radius: 22px;
        border: 2px solid #FCA5A5;
        background: #FFFFFF;
      }

      .abc-log th {
        background: #FEF2F2;
        color: #7F1D1D;
        font-size: 13px;
        font-weight: 900;
        padding: 10px;
        border-right: 1px solid #FCA5A5;
        border-bottom: 2px solid #FCA5A5;
      }

      .abc-log th span {
        color: #64748B;
        font-size: 10px;
        font-weight: 800;
      }

      .abc-log td {
        height: 68px;
        border-right: 1px solid #E5E7EB;
        border-bottom: 1px solid #E5E7EB;
      }

      .abc-log th:last-child,
      .abc-log td:last-child {
        border-right: none;
      }

      .write-box {
        border-style: solid;
        border-color: #E9D5FF;
      }

      .parent-guide,
      .therapist-notes {
        position: absolute;
        left: 42px;
        right: 42px;
        bottom: 58px;
        margin-top: 0;
        border-style: solid;
        border-color: #E9D5FF;
        background: rgba(255, 255, 255, 0.95);
      }

      .therapist-notes {
        border-color: #DDD6FE;
        background: #F5F3FF;
      }

      .guide-heading {
        color: ${escapeHtml(theme.textColor)};
        font-size: 14px;
        font-weight: 900;
        margin-bottom: 6px;
      }

      .guide-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .guide-grid.compact {
        grid-template-columns: 1fr 1fr;
      }

      .guide-grid div {
        color: #475569;
        font-size: 11px;
        line-height: 1.35;
        font-weight: 800;
      }

      .guide-grid strong {
        display: block;
        color: ${escapeHtml(theme.textColor)};
        margin-bottom: 2px;
      }

      .worksheet-footer {
        position: absolute;
        left: 42px;
        right: 42px;
        bottom: 24px;
        display: flex;
        justify-content: space-between;
        color: #64748B;
        font-size: 10px;
        font-weight: 800;
      }

      @media print {
        html,
        body {
          background: #FFFFFF;
        }

        .worksheet-page {
          border: none;
          margin: 0;
        }
      }
    </style>
  `;
}

export function renderWorksheetHtml(input: RenderWorksheetInput) {
  const { layout, worksheetDNA, brandAssets } = input;
  const theme = layout.theme;
  const body = renderWorksheetBody(layout, worksheetDNA);
  const supportBox =
    layout.layoutType === 'behavior-log'
      ? renderTherapistNotes(worksheetDNA)
      : renderParentGuide(layout, worksheetDNA);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${renderBaseStyles(theme)}
      </head>
      <body>
        <div class="worksheet-page">
          ${renderHeader(layout, brandAssets)}
          ${body}
          ${supportBox}
          ${renderFooter(layout)}
        </div>
      </body>
    </html>
  `;
}
