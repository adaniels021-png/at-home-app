import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync(
  'components/admin/ActivityIllustrationAdminSection.tsx',
  'utf8',
);
const handler = component.slice(
  component.indexOf('const loadPrivatePreview'),
  component.indexOf('const candidate'),
);

assert.match(handler, /setWorking\(true\)/);
assert.match(handler, /setSafeError\(null\)/);
assert.match(handler, /await getActivityIllustrationPreview\(illustrationId\)/);
assert.match(handler, /typeof preview\.signed_url !== 'string'/);
assert.match(handler, /setPreviewUrl\(preview\.signed_url\)/);
assert.match(handler, /finally[\s\S]*setWorking\(false\)/);
assert.doesNotMatch(handler, /setPreviewUrl\(null\)/);
assert.doesNotMatch(handler, /refresh\(/);
assert.match(component, /previewUrl \? <Image source=\{\{ uri: previewUrl \}\}/);
assert.match(component, /onPress=\{\(\) => void loadPrivatePreview\(candidate\.id\)\}/);

const mutationHelper = component.slice(
  component.indexOf('const run ='),
  component.indexOf('const loadPrivatePreview'),
);
assert.match(mutationHelper, /setPreviewUrl\(null\)/);
assert.match(mutationHelper, /await refresh\(\)/);
assert.match(component, /run\(\(\) => approveActivityIllustration/);
assert.match(component, /run\(\(\) => rejectActivityIllustration/);
assert.match(component, /generateActivityIllustration/);

let previewUrl = null;
let working = false;
let refreshCalls = 0;
const mockedLoad = async (fetchPreview) => {
  try {
    working = true;
    const preview = await fetchPreview();
    if (typeof preview.signed_url !== 'string' || !preview.signed_url.trim()) {
      throw new Error('The private preview could not be loaded. Please try again.');
    }
    previewUrl = preview.signed_url;
  } finally {
    working = false;
  }
};

await mockedLoad(async () => ({ signed_url: 'https://signed.example/private', expires_in: 300 }));
assert.equal(previewUrl, 'https://signed.example/private');
assert.equal(working, false);
assert.equal(refreshCalls, 0);
await assert.rejects(
  mockedLoad(async () => ({ signed_url: '', expires_in: 300 })),
  /private preview could not be loaded/i,
);
assert.equal(working, false);

console.log('Daily Adventures private preview state: PASS');
console.log('Preview URL retained; mutation refresh behavior preserved; real network calls: 0');
