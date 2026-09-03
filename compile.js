import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadImage } from 'canvas';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGETS_JSON_PATH = path.join(__dirname, 'targets.json');
const TARGETS_DIR = path.join(__dirname, 'targets');
const OUTPUT_MIND_PATH = path.join(__dirname, 'targets.mind');

// Support natural alphanumeric sorting (e.g. 01.jpg, 02.jpg, 10.jpg)
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function runCompiler() {
  console.log('====================================================');
  console.log('       MindAR Offline Compiler - AR-Test Build      ');
  console.log('====================================================');

  if (!fs.existsSync(TARGETS_DIR)) {
    fs.mkdirSync(TARGETS_DIR, { recursive: true });
    console.log(`[Init] Created targets directory: ${TARGETS_DIR}`);
  }

  let targets = [];

  if (fs.existsSync(TARGETS_JSON_PATH)) {
    try {
      const rawData = fs.readFileSync(TARGETS_JSON_PATH, 'utf-8');
      targets = JSON.parse(rawData);
      console.log(`[Config] Loaded ${targets.length} targets from targets.json`);
    } catch (err) {
      console.warn(`[Warning] Failed to parse targets.json: ${err.message}. Rebuilding targets list...`);
      targets = [];
    }
  }

  // Scan targets directory for any additional or missing images
  const validExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const filesInDir = fs.readdirSync(TARGETS_DIR)
    .filter(file => validExtensions.has(path.extname(file).toLowerCase()))
    .sort(naturalSort);

  if (filesInDir.length === 0 && targets.length === 0) {
    console.error(`[Error] No target images found in ${TARGETS_DIR} or targets.json!`);
    console.error('Please place at least one image (.jpg, .png) in ./targets/ before compiling.');
    process.exit(1);
  }

  // Synchronize targets.json with images in directory
  const existingMap = new Map();
  targets.forEach(t => {
    if (t.imagePath) {
      const filename = path.basename(t.imagePath);
      existingMap.set(filename, t);
    }
  });

  const synchronizedTargets = [];

  // Keep existing targets if their file exists
  filesInDir.forEach((filename, i) => {
    const existing = existingMap.get(filename);
    if (existing) {
      synchronizedTargets.push({
        ...existing,
        index: synchronizedTargets.length,
        imagePath: `./targets/${filename}`
      });
    } else {
      // New image found in targets folder
      console.log(`[New] Detected new target image: ${filename}`);
      synchronizedTargets.push({
        index: synchronizedTargets.length,
        name: `Target ${synchronizedTargets.length + 1} (${path.parse(filename).name})`,
        imagePath: `./targets/${filename}`,
        videoUrl: ''
      });
    }
  });

  // Sort strictly by index
  synchronizedTargets.sort((a, b) => a.index - b.index);

  // Ensure 0-based consecutive indexes
  synchronizedTargets.forEach((t, i) => {
    t.index = i;
  });

  console.log('\n--- Compilation Order ---');
  synchronizedTargets.forEach(t => {
    console.log(`Index ${t.index} -> ${t.name} (${t.imagePath})`);
  });
  console.log('-------------------------\n');

  // Verify all image files exist and load them
  const loadedImages = [];
  for (const target of synchronizedTargets) {
    const fullImagePath = path.resolve(__dirname, target.imagePath);
    if (!fs.existsSync(fullImagePath)) {
      throw new Error(`Target image not found: ${fullImagePath}`);
    }
    console.log(`[Loading] Loading image [${target.index}]: ${target.imagePath}...`);
    const img = await loadImage(fullImagePath);
    loadedImages.push(img);
  }

  console.log(`\n[Compiler] Initializing MindAR OfflineCompiler for ${loadedImages.length} images...`);
  const compiler = new OfflineCompiler();

  let lastReportedPercent = -1;
  await compiler.compileImageTargets(loadedImages, (progress) => {
    const currentPercent = Math.floor(progress);
    if (currentPercent % 10 === 0 && currentPercent !== lastReportedPercent) {
      lastReportedPercent = currentPercent;
      console.log(`[Compiler] Progress: ${currentPercent}%`);
    }
  });

  console.log('[Compiler] Feature point extraction completed.');
  console.log('[Export] Generating binary data buffer...');
  const buffer = compiler.exportData();

  fs.writeFileSync(OUTPUT_MIND_PATH, buffer);
  console.log(`[Success] Written compiled file: ${OUTPUT_MIND_PATH} (${(buffer.length / 1024).toFixed(2)} KB)`);

  // Update targets.json with verified synchronized order
  fs.writeFileSync(TARGETS_JSON_PATH, JSON.stringify(synchronizedTargets, null, 2), 'utf-8');
  console.log(`[Success] Updated ${TARGETS_JSON_PATH} with normalized target indices.`);
  console.log('\nCompilation completed successfully!\n');
}

runCompiler().catch((err) => {
  console.error('[Compilation Failed]', err);
  process.exit(1);
});
