import { treeClamp, treeCopy, treePick, treeRandBetween, treeRandInt, treeRng32, treeRoundNum } from '../utils.js';
import { TREE_BLUEPRINT_SCHEMA_VERSION, TREE_OPTIONS, TREE_RANDOM_CATEGORIES, sanitiseTreeConfig } from '../config.js';
import { TREE_PRESETS, TREE_SPECIES } from './species.js';
import { TREE_SEASON_PALETTES, generateCoherentTreePalette } from '../materials/palettes.js';
import { generateTreeBlueprint } from './blueprints.js';

export function applyTreeSeedVariation(rawCfg, locks = new Set()) {
  const base = sanitiseTreeConfig(rawCfg);
  const r = treeRng32(base.seed + 4099);
  const next = treeCopy(base);
  const isLocked = (k) => locks && locks.has(k);

  if (!isLocked('height')) {
    next.height = treeRoundNum(treeClamp(base.height * treeRandBetween(r, 0.86, 1.16), 1.3, 19.5), 1);
  }
  if (!isLocked('radius')) {
    next.radius = treeRoundNum(treeClamp(base.radius * treeRandBetween(r, 0.85, 1.18), 0.1, 1.5), 2);
  }
  if (!isLocked('curve')) {
    next.curve = treeRoundNum(treeClamp(base.curve + treeRandBetween(r, -0.15, 0.2), 0, 1.2), 2);
  }
  if (!isLocked('spread')) {
    next.spread = treeRoundNum(treeClamp(base.spread * treeRandBetween(r, 0.85, 1.18), 0.9, 8.5), 1);
  }
  if (!isLocked('branches')) {
    next.branches = treeClamp(base.branches + treeRandInt(r, -1, 2), 2, 12);
  }
  if (!isLocked('density')) {
    next.density = treeClamp(base.density + treeRandInt(r, -3, 4), 4, 34);
  }
  if (!isLocked('colorLeaf1') || !isLocked('colorLeaf2') || !isLocked('colorBark')) {
    const pal = generateCoherentTreePalette(base.season, base.seed + 77, base.species);
    if (!isLocked('colorLeaf1')) next.colorLeaf1 = pal.leaf1;
    if (!isLocked('colorLeaf2')) next.colorLeaf2 = pal.leaf2;
    if (!isLocked('colorBark')) next.colorBark = pal.bark;
    if (!isLocked('colorAccent')) next.colorAccent = pal.accent;
  }

  return sanitiseTreeConfig(next);
}

export function generateTreeVariations(rawCfg, count = 6, locks = new Set()) {
  const base = sanitiseTreeConfig(rawCfg);
  const results = [];
  for (let i = 0; i < count; i++) {
    const variantSeed = ((base.seed + (i + 1) * 7919) % 9999999) + 101;
    const seeded = { ...base, seed: variantSeed };
    const varied = applyTreeSeedVariation(seeded, locks);
    results.push({
      index: i,
      seed: variantSeed,
      label: `Seed #${variantSeed}`,
      config: varied
    });
  }
  return results;
}

export function randomizeTreeSettings(category, rawCfg, locks = new Set()) {
  const cfg = sanitiseTreeConfig(rawCfg);
  const r = treeRng32((cfg.seed + Date.now() % 100000) >>> 0);
  const next = treeCopy(cfg);
  const isLocked = (k) => locks && locks.has(k);

  const keys = category === 'all'
    ? Object.values(TREE_RANDOM_CATEGORIES).flat()
    : (TREE_RANDOM_CATEGORIES[category] || []);

  for (const key of keys) {
    if (isLocked(key)) continue;
    switch (key) {
      case 'height':
        next.height = treeRoundNum(treeRandBetween(r, cfg.species === 'bush' || cfg.species === 'bonsai' ? 1.5 : 4.2, cfg.species === 'redwood' ? 18.0 : 12.0), 1);
        break;
      case 'radius':
        next.radius = treeRoundNum(treeRandBetween(r, 0.18, cfg.species === 'baobab' || cfg.species === 'redwood' ? 1.25 : 0.72), 2);
        break;
      case 'taper':
        next.taper = treeRoundNum(treeRandBetween(r, 0.35, 0.88), 2);
        break;
      case 'curve':
        next.curve = treeRoundNum(treeRandBetween(r, 0.05, 0.75), 2);
        break;
      case 'radialSegments':
        next.radialSegments = treeRandInt(r, 4, 8);
        break;
      case 'rootFlare':
        next.rootFlare = treeRoundNum(treeRandBetween(r, 0.15, 0.85), 2);
        break;
      case 'rootStyle':
        next.rootStyle = treePick(r, TREE_OPTIONS.rootStyle).value;
        break;
      case 'branches':
        next.branches = treeRandInt(r, 3, 10);
        break;
      case 'secondaryBranches':
        next.secondaryBranches = treeRandInt(r, 1, 3);
        break;
      case 'gnarl':
        next.gnarl = treeRoundNum(treeRandBetween(r, 0.1, 0.7), 2);
        break;
      case 'branchStartRatio':
        next.branchStartRatio = treeRoundNum(treeRandBetween(r, 0.35, 0.68), 2);
        break;
      case 'branchLift':
        next.branchLift = treeRoundNum(treeRandBetween(r, 0.3, 0.9), 2);
        break;
      case 'spread':
        next.spread = treeRoundNum(treeRandBetween(r, 2.0, 6.2), 1);
        break;
      case 'canopyHeight':
        next.canopyHeight = treeRoundNum(treeRandBetween(r, 0.65, 1.5), 2);
        break;
      case 'density':
        next.density = treeRandInt(r, 8, 26);
        break;
      case 'clusterSize':
        next.clusterSize = treeRoundNum(treeRandBetween(r, 0.9, 1.9), 2);
        break;
      case 'polyDetail':
        next.polyDetail = treeRandInt(r, 0, 1);
        break;
      case 'jitter':
        next.jitter = treeRoundNum(treeRandBetween(r, 0.08, 0.32), 2);
        break;
      case 'leafStyle':
        next.leafStyle = treePick(r, TREE_OPTIONS.leafStyle).value;
        break;
      case 'canopyShape':
        next.canopyShape = treePick(r, TREE_OPTIONS.canopyShape).value;
        break;
      case 'mossCoverage':
        next.mossCoverage = treeRoundNum(r() > 0.45 ? treeRandBetween(r, 0.1, 0.65) : 0, 2);
        break;
      case 'vineDensity':
        next.vineDensity = treeRoundNum(r() > 0.6 ? treeRandBetween(r, 0.2, 0.7) : 0, 2);
        break;
      case 'shelfMushrooms':
        next.shelfMushrooms = treeRoundNum(r() > 0.6 ? treeRandBetween(r, 0.2, 0.7) : 0, 2);
        break;
      case 'hollowEnabled':
        next.hollowEnabled = r() > 0.72;
        break;
      case 'fruitDensity':
        next.fruitDensity = treeRoundNum(treeRandBetween(r, 0.25, 0.85), 2);
        break;
      case 'detailProp':
        next.detailProp = treePick(r, TREE_OPTIONS.detailProp).value;
        break;
      case 'groundAttachment':
        next.groundAttachment = treePick(r, ['natural', 'natural', 'natural', 'city_grate', 'stone_planter', 'wood_planter']);
        break;
      case 'season': {
        const seasons = Object.keys(TREE_SEASON_PALETTES);
        next.season = treePick(r, seasons);
        break;
      }
      case 'colorLeaf1':
      case 'colorLeaf2':
      case 'colorBark':
      case 'colorAccent':
      case 'snow': {
        const pal = generateCoherentTreePalette(next.season || cfg.season, cfg.seed + treeRandInt(r, 1, 9999), cfg.species);
        if (!isLocked('colorLeaf1')) next.colorLeaf1 = pal.leaf1;
        if (!isLocked('colorLeaf2')) next.colorLeaf2 = pal.leaf2;
        if (!isLocked('colorBark')) next.colorBark = pal.bark;
        if (!isLocked('colorAccent')) next.colorAccent = pal.accent;
        if (!isLocked('snow')) next.snow = pal.snow;
        break;
      }
      case 'colorVar':
        next.colorVar = treeRoundNum(treeRandBetween(r, 0.08, 0.3), 2);
        break;
      case 'emissiveIntensity':
        next.emissiveIntensity = cfg.species === 'fantasy' ? treeRoundNum(treeRandBetween(r, 0.4, 0.95), 2) : 0;
        break;
      default:
        break;
    }
  }

  return sanitiseTreeConfig(next);
}

export function buildBiomeGrovePack(rawCfg, count = 12) {
  const base = sanitiseTreeConfig(rawCfg);
  const seedInt = (Number(base.seed) || 1337) >>> 0;
  const r = treeRng32(seedInt + 991);
  const targetCount = Math.max(2, Math.min(32, Math.round(Number(count) || 12)));
  const presetKeys = Object.keys(TREE_PRESETS);

  const trees = [];
  for (let i = 0; i < targetCount; i++) {
    const tSeed = seedInt + (i + 1) * 239;
    let chosenPreset;
    if (i === 0) {
      chosenPreset = base;
    } else if (i % 3 === 0) {
      const sameCategory = presetKeys.filter((k) => TREE_PRESETS[k].category === TREE_SPECIES.find((s) => s.id === base.species)?.category);
      const k = treePick(r, sameCategory.length ? sameCategory : presetKeys);
      chosenPreset = TREE_PRESETS[k];
    } else {
      const k = treePick(r, presetKeys);
      chosenPreset = TREE_PRESETS[k];
    }
    const varied = applyTreeSeedVariation({ ...chosenPreset, seed: tSeed }, new Set());
    trees.push(generateTreeBlueprint(varied));
  }

  return {
    type: 'b-biome-grove-pack',
    schemaVersion: TREE_BLUEPRINT_SCHEMA_VERSION,
    seed: seedInt,
    treeCount: trees.length,
    generatedAt: new Date().toISOString(),
    trees
  };
}
