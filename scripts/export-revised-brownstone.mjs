import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBuildingBlueprint } from '../assets/js/projects/building-generator/core/blueprints.js';
import { createBuilding } from '../assets/js/projects/building-generator/geometry/building.js';
import { clearMaterialCache } from '../assets/js/projects/building-generator/geometry/materials.js';
import { PRESETS } from '../assets/js/projects/building-generator/config.js';
import { SoftwareCanvas } from './lib/software-canvas.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const previewIdx = process.argv.indexOf('--preview-dir');
const writeExports = process.argv.includes('--write-exports');
const exportsDir = previewIdx >= 0 && process.argv[previewIdx + 1]
  ? path.resolve(process.argv[previewIdx + 1])
  : path.resolve(__dirname, '..', 'assets', 'exports');
const vendorDir = path.resolve(__dirname, 'vendor');

if (!writeExports && previewIdx < 0) {
  console.error('Refusing to overwrite assets/exports/ without --write-exports or --preview-dir <dir>.');
  process.exit(1);
}

if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// 1. Verify & Preserve Legacy Baseline Brownstone #4612 (rev_9bac4ec8df221d3a)
const legacyBP = generateBuildingBlueprint(PRESETS.kings_row, {
  name: "King's Row Brownstone #4612 (Legacy Baseline)"
});
const legacyPath = path.join(exportsDir, 'brownstone-4612-legacy.building.json');
fs.writeFileSync(legacyPath, JSON.stringify(legacyBP, null, 2), 'utf8');
console.log(`Legacy blueprint exported: ${legacyPath}`);
console.log(`  Template ID: ${legacyBP.templateId}`);
console.log(`  Template Revision: ${legacyBP.templateRevision}`);

// 2. Verify & Preserve Revised Switchback Brownstone #4612 (rev_3a7104e6fa95fdee)
const revisedSettings = {
  ...PRESETS.kings_row,
  fireEscapeClearance: 'standard',
  fireEscapeTreads: true
};
const revisedBP = generateBuildingBlueprint(revisedSettings, {
  name: "King's Row Brownstone #4612 (Revised Character Clearance)"
});
const revisedJsonPath = path.join(exportsDir, 'brownstone-4612-revised.building.json');
fs.writeFileSync(revisedJsonPath, JSON.stringify(revisedBP, null, 2), 'utf8');
console.log(`\nRevised blueprint preserved: ${revisedJsonPath}`);
console.log(`  Template ID: ${revisedBP.templateId}`);
console.log(`  Template Revision: ${revisedBP.templateRevision}`);

// 3. Export New Straight-Run 1-Unit Walkable & Semantic Rooftop Collision Brownstone #4612
const straightRunSettings = {
  ...PRESETS.kings_row,
  fireEscapeClearance: 'straight_run',
  fireEscapeTreads: true,
  fireEscapeLadder: 'lowered',
  rooftopCollision: true
};
const straightRunBP = generateBuildingBlueprint(straightRunSettings, {
  name: "King's Row Brownstone #4612 (Straight-Run 1-Unit Walkable)"
});
const straightJsonPath = path.join(exportsDir, 'brownstone-4612-straight-run.building.json');
fs.writeFileSync(straightJsonPath, JSON.stringify(straightRunBP, null, 2), 'utf8');
console.log(`\nStraight-run blueprint exported: ${straightJsonPath}`);
console.log(`  Template ID: ${straightRunBP.templateId}`);
console.log(`  Template Revision: ${straightRunBP.templateRevision}`);
console.log(`  Flights: ${straightRunBP.metadata.fireEscape.flightCount}`);
console.log(`  Treads: ${straightRunBP.metadata.fireEscape.treadCount}`);
console.log(`  Step Rise: ${straightRunBP.metadata.fireEscape.flights[0]?.risePerStep}m (~${straightRunBP.metadata.fireEscape.clearanceStandard.stepRiseBUnits} B units)`);
console.log(`  Step Run: ${straightRunBP.metadata.fireEscape.flights[0]?.runPerStep}m (~${straightRunBP.metadata.fireEscape.clearanceStandard.stepRunBUnits} B units)`);
console.log(`  Stair Clear Width: ${straightRunBP.metadata.fireEscape.clearanceStandard.stairClearWidth}m`);
console.log(`  Wall Standoff: ${straightRunBP.metadata.fireEscape.clearanceStandard.wallClearance}m`);
console.log(`  Rooftop Colliders: ${straightRunBP.metadata.rooftopStructures.colliderCount} (${straightRunBP.metadata.rooftopStructures.fixtureCount} fixtures)`);
console.log(`  Traversal Status: ${straightRunBP.metadata.fireEscape.traversalValidation.status}`);

// 3. Export Revised Brownstone #4612 3D Model (GLB)
async function exportRevisedGLB() {
  const threeFile = path.join(vendorDir, 'three.min.js');
  const exporterFile = path.join(vendorDir, 'GLTFExporter.js');

  let threeCode = '';
  if (fs.existsSync(threeFile)) {
    threeCode = fs.readFileSync(threeFile, 'utf8');
  } else {
    const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    threeCode = await res.text();
    if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });
    fs.writeFileSync(threeFile, threeCode, 'utf8');
  }

  let exporterCode = '';
  if (fs.existsSync(exporterFile)) {
    exporterCode = fs.readFileSync(exporterFile, 'utf8');
  } else {
    const res = await fetch('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js');
    exporterCode = await res.text();
    if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });
    fs.writeFileSync(exporterFile, exporterCode, 'utf8');
  }

  global.window = global;
  global.self = global;
  global.HTMLCanvasElement = SoftwareCanvas;
  global.ImageData = class ImageData {
    constructor(data, w, h) {
      this.data = data;
      this.width = w;
      this.height = h;
    }
  };

  global.document = {
    createElement(tag) {
      if (tag === 'canvas') return new SoftwareCanvas(256, 256);
      return {};
    }
  };

  class FileReader {
    readAsArrayBuffer(blob) {
      if (blob && blob.arrayBuffer) {
        blob.arrayBuffer().then((buf) => {
          this.result = buf;
          if (this.onloadend) this.onloadend();
        });
      } else {
        this.result = new ArrayBuffer(0);
        if (this.onloadend) this.onloadend();
      }
    }
  }
  global.FileReader = FileReader;

  const exp = {};
  const mod = { exports: exp };
  new Function('exports', 'module', threeCode)(exp, mod);
  global.THREE = mod.exports || exp;
  new Function('THREE', exporterCode)(global.THREE);

  const exportGlb = async (settings, bp, glbFilename, label) => {
    clearMaterialCache();
    const group = createBuilding(settings, { name: label });
    group.userData = {
      preset: settings.style,
      seed: settings.seed,
      floors: settings.floors,
      templateId: bp.templateId,
      templateRevision: bp.templateRevision
    };

    const exporter = new global.THREE.GLTFExporter();
    const glb = await new Promise((resolve, reject) => {
      exporter.parse(group, resolve, { binary: true, onlyVisible: true, truncateDrawRange: true }, reject);
    });

    const outPath = path.join(exportsDir, glbFilename);
    fs.writeFileSync(outPath, Buffer.from(glb));
    console.log(`\n3D model exported: ${outPath}`);
    console.log(`  Template Revision: ${bp.templateRevision}`);
    console.log(`  File size: ${glb.byteLength.toLocaleString()} bytes`);
    console.log(`  Total scene nodes/children: ${group.children.length}`);
  };

  await exportGlb(
    revisedSettings,
    revisedBP,
    'brownstone-4612-revised.glb',
    "King's Row Brownstone #4612 (Revised Character Clearance)"
  );

  await exportGlb(
    straightRunSettings,
    straightRunBP,
    'brownstone-4612-straight-run.glb',
    "King's Row Brownstone #4612 (Straight-Run 1-Unit Walkable)"
  );

  if (previewIdx >= 0) {
    const tallPreviewSettings = {
      ...PRESETS.kings_row,
      fireEscape: true,
      tallStaircase: true
    };
    const tallPreviewBP = generateBuildingBlueprint(tallPreviewSettings, {
      name: "King's Row Brownstone #4612 (With Secondary Tall Staircase)"
    });
    await exportGlb(
      tallPreviewSettings,
      tallPreviewBP,
      'brownstone-4612-tall-preview.glb',
      "King's Row Brownstone #4612 (With Secondary Tall Staircase)"
    );
  }
}

exportRevisedGLB().catch((err) => {
  console.error('Error exporting revised GLB:', err);
  process.exit(1);
});
