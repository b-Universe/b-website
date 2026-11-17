import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { SoftwareCanvas } from './lib/software-canvas.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function makeMockCanvas(w = 256, h = 256) {
  const c = new SoftwareCanvas(w, h);
  const origGetCtx = c.getContext.bind(c);
  c.getContext = (type) => {
    const ctx = origGetCtx(type);
    if (ctx) {
      if (!ctx.drawImage) ctx.drawImage = () => {};
      if (!ctx.translate) ctx.translate = () => {};
      if (!ctx.scale) ctx.scale = () => {};
      if (!ctx.rotate) ctx.rotate = () => {};
      if (!ctx.save) ctx.save = () => {};
      if (!ctx.restore) ctx.restore = () => {};
      if (!ctx.putImageData) ctx.putImageData = () => {};
    }
    return ctx;
  };
  return c;
}

function setupEnvironment() {
  global.HTMLCanvasElement = SoftwareCanvas;
  if (typeof global.ImageData === 'undefined') {
    global.ImageData = class ImageData {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };
  }
  global.self = global;
  global.window = global;
  global.document = {
    readyState: 'complete',
    addEventListener() {},
    createElement(tag) {
      if (tag === 'canvas') return makeMockCanvas(256, 256);
      return { style: {}, classList: { toggle() {}, add() {}, remove() {} }, appendChild() {}, querySelectorAll() { return []; } };
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; }
  };

  const threeCode = fs.readFileSync(path.join(ROOT, 'scripts/vendor/three.min.js'), 'utf8');
  vm.runInThisContext(threeCode, { filename: 'three.min.js' });
}

function bench(label, iterations, fn) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn(i);
  }
  const totalMs = performance.now() - start;
  const perOpMs = totalMs / iterations;
  console.log(`${label}: ${totalMs.toFixed(2)} ms total (${perOpMs.toFixed(4)} ms/op over ${iterations} ops)`);
  return { totalMs, perOpMs };
}

async function runBenchmark() {
  setupEnvironment();

  const assemblies = await import('../assets/js/projects/city-object-suite/core/assemblies.js');
  const registry = await import('../assets/js/projects/city-object-suite/core/registry.js');
  const blueprints = await import('../assets/js/projects/city-object-suite/core/blueprints.js');

  const t0 = performance.now();
  const families = assemblies.ensureCityObjectRegistry();
  const initMs = performance.now() - t0;
  const presetCount = families.reduce((sum, fam) => sum + (fam.presets?.length || 0), 0);
  console.log(`Cold registry init (${families.length} families, ${presetCount} presets): ${initMs.toFixed(2)} ms`);

  bench('searchCatalog (current catalog, 500 queries)', 500, (i) => {
    const terms = ['desk', 'lamp', 'dumpster', 'medical', 'police', ''];
    registry.searchCatalog(terms[i % terms.length], { spaceGroup: 'all' });
  });

  // Synthetic 1,000-family / 5,000-preset scale benchmark
  const syntheticCount = 1000;
  for (let i = 0; i < syntheticCount; i++) {
    const famId = `bench_synthetic_family_${i}`;
    registry.registerObjectFamily({
      id: famId,
      categoryId: 'office_public_interiors',
      categories: ['office_public_interiors'],
      subcategory: 'Benchmark Synthetic Props',
      label: `Synthetic Prop ${i}`,
      description: `Synthetic scalability benchmark family ${i} for catalog indexing verification`,
      attachmentProfile: 'ground_standing',
      locationContext: i % 2 === 0 ? 'interior' : 'exterior',
      tags: [`bench_tag_${i % 25}`, 'synthetic', 'scale_test'],
      environmentTags: [`env_${i % 10}`],
      schema: [{ key: 'width', label: 'Width', type: 'range', min: 0.4, max: 2.0, step: 0.1, default: 1.0 }],
      presets: Array.from({ length: 5 }, (_, pIdx) => ({
        id: `${famId}_preset_${pIdx}`,
        label: `Synthetic Preset ${i}-${pIdx}`,
        locationContext: i % 2 === 0 ? 'interior' : 'exterior',
        values: { width: 0.8 + pIdx * 0.2 }
      })),
      buildGeometry() {}
    });
  }

  const allExpanded = registry.getAllObjectFamilies();
  const expandedPresets = allExpanded.reduce((sum, f) => sum + (f.presets?.length || 0), 0);
  console.log(`Expanded catalog size: ${allExpanded.length} families, ${expandedPresets} presets`);

  bench('searchCatalog (1,000+ families / 5,000+ presets, 500 queries)', 500, (i) => {
    const terms = ['synthetic', 'bench_tag_7', 'preset 450', 'desk', 'police', ''];
    registry.searchCatalog(terms[i % terms.length], { spaceGroup: 'all' });
  });

  bench('Single-object build + blueprint (mailbox_cluster, 50 ops)', 50, (i) => {
    const cfg = registry.buildDefaultConfigForFamily('mailbox_cluster');
    cfg.seed = 100 + i;
    assemblies.buildCityObject(cfg);
  });

  bench('Complex-object build + blueprint (computer_workstation, 50 ops)', 50, (i) => {
    const cfg = registry.buildDefaultConfigForFamily('computer_workstation', 'dual_monitor_developer_rig');
    cfg.seed = 200 + i;
    assemblies.buildCityObject(cfg);
  });

  bench('Assembly build + blueprint (basic_office_workstation, 25 ops)', 25, (i) => {
    const cfg = registry.buildDefaultConfigForFamily('basic_office_workstation');
    cfg.seed = 300 + i;
    assemblies.buildCityObject(cfg);
  });

  const sampleSingle = assemblies.buildCityObject(registry.buildDefaultConfigForFamily('office_desk')).userData.blueprint;
  const sampleAssembly = assemblies.buildCityObject(registry.buildDefaultConfigForFamily('basic_office_workstation')).userData.blueprint;

  bench('validateObjectBlueprint + checkBlueprintCompatibility (1,000 ops)', 1000, (i) => {
    const target = i % 2 === 0 ? sampleSingle : sampleAssembly;
    blueprints.checkBlueprintCompatibility(target);
  });
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
