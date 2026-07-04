import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

async function assetToBase64DataUri(assetModule: number) {
  const asset = Asset.fromModule(assetModule);

  await asset.downloadAsync();

  const uri = asset.localUri ?? asset.uri;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  return `data:image/png;base64,${base64}`;
}

export async function getWorksheetBrandAssets() {
  const assets = {
    logo: require('../assets/brand/aba-at-home-logo.png'),

    default: require('../assets/brand/bun-bun.png'),

    happy: require('../assets/brand/bun-bun-happy.png'),
    calm: require('../assets/brand/bun-bun-breathing.png'),
    working: require('../assets/brand/bun-bun-writing.png'),
    celebrate: require('../assets/brand/bun-bun-excited.png'),

    thinking: require('../assets/brand/bun-bun-thinking.png'),
    reading: require('../assets/brand/bun-bun-reading.png'),
    listening: require('../assets/brand/bun-bun-listening.png'),
    pointing: require('../assets/brand/bun-bun-pointing.png'),
    wave: require('../assets/brand/bun-bun-wave.png'),
    thumbsUp: require('../assets/brand/bun-bun-thumbs-up.png'),
    focused: require('../assets/brand/bun-bun-focused.png'),
    proud: require('../assets/brand/bun-bun-proud.png'),
    curious: require('../assets/brand/bun-bun-curious.png'),
    sitting: require('../assets/brand/bun-bun-sitting.png'),
    standing: require('../assets/brand/bun-bun-standing.png'),
    star: require('../assets/brand/bun-bun-star.png'),
    highFive: require('../assets/brand/bun-bun-high-five.png'),
    blocks: require('../assets/brand/bun-bun-blocks.png'),

    brushingTeeth: require('../assets/brand/bun-bun-brushing-teeth.png'),
    washingHands: require('../assets/brand/bun-bun-washing-hands.png'),
    takingBath: require('../assets/brand/bun-bun-taking-bath.png'),
    puttingOnShoes: require('../assets/brand/bun-bun-putting-on-shoes.png'),
    gettingDressed: require('../assets/brand/bun-bun-getting-dressed.png'),
    eatingBreakfast: require('../assets/brand/bun-bun-eating-breakfast.png'),
    makingSandwich: require('../assets/brand/bun-bun-making-sandwich.png'),
    cleaningUpToys: require('../assets/brand/bun-bun-cleaning-up-toys.png'),
    packingBackpack: require('../assets/brand/bun-bun-packing-backpack.png'),
    bedtimeRoutine: require('../assets/brand/bun-bun-bedtime-routine.png'),
    readingBeforeBed: require('../assets/brand/bun-bun-reading-before-bed.png'),
    sleeping: require('../assets/brand/bun-bun-sleeping.png'),

    question: require('../assets/brand/bun-bun-question.png'),
  };

  const entries = await Promise.all(
    Object.entries(assets).map(async ([key, module]) => [
      key,
      await assetToBase64DataUri(module),
    ])
  );

  return Object.fromEntries(entries) as Record<string, string>;
}