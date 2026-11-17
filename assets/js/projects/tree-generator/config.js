import { treeClamp, treeCopy, treeNormalizeHex } from './utils.js';
import { TREE_SPECIES, TREE_PRESETS, SPECIES_DEFAULT_PRESETS } from './core/species.js';
import { sanitisePlacedDetailsList } from './geometry/details.js';

export const TREE_BLUEPRINT_SCHEMA_VERSION = 'b.tree.v1';
export const TREE_B_UNITS_PER_METER = 16.404199475065617;

export const TREE_BASE = {
  species: 'oak',
  seed: 1337,
  variation: 0.25,
  // Trunk & Roots
  height: 6.5,
  radius: 0.52,
  taper: 0.62,
  curve: 0.22,
  radialSegments: 6,
  rootFlare: 0.45,
  rootStyle: 'buttress',
  // Branches
  branches: 5,
  secondaryBranches: 2,
  gnarl: 0.30,
  branchStartRatio: 0.42,
  branchLift: 0.55,
  // Canopy & Foliage
  spread: 3.7,
  canopyHeight: 1.0,
  density: 14,
  clusterSize: 1.45,
  polyDetail: 1,
  jitter: 0.18,
  leafStyle: 'icosahedron',
  canopyShape: 'dome',
  // Species-Specific Variants
  shrubVariant: 'basic',
  berryDensity: 0.45,
  berryColor: '#ff2a55',
  berrySize: 0.18,
  blossomDensity: 0.45,
  blossomColor: '#ffb6c1',
  blossomSize: 0.20,
  topiaryShape: 'tiered_spheres',
  fantasyForm: 'crystal',
  // Details & Storytelling Props
  groundAttachment: 'natural',
  planterColor: '#6d757d',
  mossCoverage: 0.12,
  vineDensity: 0.0,
  shelfMushrooms: 0.0,
  hollowEnabled: false,
  fruitType: 'none',
  fruitDensity: 0.5,
  fruitColor: '#e63946',
  detailProp: 'none',
  // Seasons, Materials & FX
  season: 'summer',
  colorLeaf1: '#3b7a2e',
  colorLeaf2: '#5a9e38',
  colorBark: '#5c4028',
  colorAccent: '#e8f4f8',
  colorVar: 0.16,
  snow: 0.0,
  barkTextureStyle: 'flat_vertex',
  emissiveIntensity: 0.0,
  windStrength: 0.25,
  ambientFx: 'auto',
  // Studio Preview Settings
  lod2Style: 'billboard',
  lightingMode: 'day',
  environmentStage: 'meadow',
  atlasRes: 512,
  convertToBUnitsOnExport: false,
  placedDetails: []
};

export const TREE_CONFIG_KEYS = Object.keys(TREE_BASE);

export const TREE_OPTIONS = {
  rootStyle: [
    { value: 'none', label: 'Flush Base' },
    { value: 'flared', label: 'Flared Collar' },
    { value: 'buttress', label: 'Root Buttresses' },
    { value: 'twisted', label: 'Twisted Roots' },
    { value: 'stilt', label: 'Aerial Stilt Roots' }
  ],
  leafStyle: [
    { value: 'icosahedron', label: 'Classic Faceted (Osrs)' },
    { value: 'octahedron', label: 'Sharp Crystal Leaf' },
    { value: 'dodecahedron', label: 'Puffy Broad Cluster' },
    { value: 'faceted_pad', label: 'Layered Canopy Pad' },
    { value: 'cone_tuft', label: 'Evergreen Tuft' }
  ],
  canopyShape: [
    { value: 'dome', label: 'Rounded Dome' },
    { value: 'oval', label: 'Tall Oval' },
    { value: 'layered', label: 'Layered Pads' },
    { value: 'umbrella', label: 'Flat Umbrella' },
    { value: 'cone', label: 'Spire Cone' }
  ],
  shrubVariant: [
    { value: 'basic', label: 'Basic Shrub' },
    { value: 'berry', label: 'Berry Bush' },
    { value: 'flowering', label: 'Flowering Shrub' }
  ],
  topiaryShape: [
    { value: 'sphere', label: 'Single Sphere' },
    { value: 'tiered_spheres', label: 'Tiered Spheres' },
    { value: 'spiral', label: 'Sculpted Spiral' },
    { value: 'cone', label: 'Formal Cone' },
    { value: 'hedge_box', label: 'Trimmed Box Hedge' }
  ],
  fantasyForm: [
    { value: 'crystal', label: 'Crystal Spire' },
    { value: 'mushroom', label: 'Giant Glowshroom' },
    { value: 'arcane_willow', label: 'Arcane Mana Tree' }
  ],
  groundAttachment: [
    { value: 'natural', label: 'Natural Ground' },
    { value: 'city_grate', label: 'City Tree Grate' },
    { value: 'stone_planter', label: 'Stone Curb Planter' },
    { value: 'wood_planter', label: 'Timber Planter Box' },
    { value: 'bonsai_pot', label: 'Ceramic Bonsai Pot' }
  ],
  fruitType: [
    { value: 'none', label: 'None' },
    { value: 'apples', label: 'Apples / Fruit' },
    { value: 'pinecones', label: 'Pinecones' },
    { value: 'coconuts', label: 'Coconuts' },
    { value: 'bananas', label: 'Banana Bunch' },
    { value: 'cactus_bloom', label: 'Cactus Blossoms' }
  ],
  detailProp: [
    { value: 'none', label: 'None' },
    { value: 'lanterns', label: 'Hanging Lanterns' },
    { value: 'birdhouse', label: 'Wooden Birdhouse' },
    { value: 'swing', label: 'Rope Tree Swing' },
    { value: 'fallen_leaves', label: 'Fallen Leaf Ring' }
  ],
  season: [
    { value: 'spring', label: 'Spring' },
    { value: 'summer', label: 'Summer' },
    { value: 'autumn', label: 'Autumn' },
    { value: 'winter', label: 'Winter' },
    { value: 'blossom', label: 'Sakura Blossom' },
    { value: 'tropical', label: 'Tropical Lush' },
    { value: 'arid', label: 'Savanna Dry' },
    { value: 'twilight', label: 'Twilight Dusk' },
    { value: 'arcane', label: 'Arcane Glow' },
    { value: 'corrupted', label: 'Shadow Blight' }
  ],
  barkTextureStyle: [
    { value: 'flat_vertex', label: 'Crisp Vertex Shaded' },
    { value: 'grained_bark', label: 'Procedural Furrowed Grain' },
    { value: 'birch_lenticel', label: 'Birch Lenticel Bands' },
    { value: 'mossy_bark', label: 'Mossy Bark Grain' },
    { value: 'cracked_dry', label: 'Cracked Deadwood' }
  ],
  ambientFx: [
    { value: 'auto', label: 'Auto (Match Season)' },
    { value: 'none', label: 'Off' },
    { value: 'leaves', label: 'Drifting Leaves' },
    { value: 'petals', label: 'Sakura Petals' },
    { value: 'snow', label: 'Snow Flurries' },
    { value: 'fireflies', label: 'Forest Fireflies' }
  ],
  lod2Style: [
    { value: 'billboard', label: 'Multi-Angle Billboards + Iso Cap' },
    { value: 'hemisphere', label: 'Seasonal Hemisphere Impostor' },
    { value: 'hybrid', label: 'Hybrid Dome + Crossed Billboard' }
  ],
  lightingMode: [
    { value: 'day', label: 'Sunny Daylight' },
    { value: 'golden_hour', label: 'Golden Hour' },
    { value: 'dusk', label: 'Twilight Dusk' },
    { value: 'night', label: 'Moonlit Night' }
  ],
  environmentStage: [
    { value: 'meadow', label: 'Grassy Meadow' },
    { value: 'forest_floor', label: 'Mossy Forest Floor' },
    { value: 'city_sidewalk', label: 'Urban Sidewalk' },
    { value: 'desert_sand', label: 'Desert Dunes' },
    { value: 'snow_tundra', label: 'Snowy Tundra' },
    { value: 'studio', label: 'Studio Pad' },
    { value: 'none', label: 'No Ground' }
  ]
};

export const TREE_SCHEMA = {
  form: [
    { key: 'height', label: 'Tree Height', type: 'range', min: 1.2, max: 20.0, step: 0.1, unit: 'm', group: 'Trunk Dimensions' },
    { key: 'radius', label: 'Trunk Thickness', type: 'range', min: 0.08, max: 1.6, step: 0.02, unit: 'm' },
    { key: 'taper', label: 'Trunk Taper', type: 'range', min: 0.15, max: 0.95, step: 0.01 },
    { key: 'curve', label: 'Trunk Lean & Curve', type: 'range', min: 0.0, max: 1.3, step: 0.02 },
    { key: 'radialSegments', label: 'Bark Radial Facets', type: 'range', min: 3, max: 10, step: 1, unit: ' sides' },
    { key: 'rootStyle', label: 'Root Base Style', type: 'select', options: 'rootStyle', group: 'Roots & Base' },
    { key: 'rootFlare', label: 'Root Flare Spread', type: 'range', min: 0.0, max: 1.0, step: 0.02 },
    { key: 'variation', label: 'Forest Variation Jitter', type: 'range', min: 0.0, max: 0.65, step: 0.01 }
  ],
  branches: [
    { key: 'branches', label: 'Primary Limbs', type: 'range', min: 0, max: 14, step: 1, group: 'Branch Structure' },
    { key: 'secondaryBranches', label: 'Secondary Forks / Limb', type: 'range', min: 0, max: 4, step: 1 },
    { key: 'gnarl', label: 'Twist & Gnarl', type: 'range', min: 0.0, max: 1.0, step: 0.02 },
    { key: 'branchStartRatio', label: 'Branch Start Height', type: 'range', min: 0.25, max: 0.85, step: 0.02 },
    { key: 'branchLift', label: 'Upward Branch Angle', type: 'range', min: 0.15, max: 1.15, step: 0.02 },
    { key: 'fantasyForm', label: 'Fantasy Archetype', type: 'select', options: 'fantasyForm', speciesFilter: ['fantasy'], group: 'Archetype Variants' },
    { key: 'topiaryShape', label: 'Topiary Sculpt Shape', type: 'select', options: 'topiaryShape', speciesFilter: ['topiary'] },
    { key: 'shrubVariant', label: 'Shrub Variant', type: 'select', options: 'shrubVariant', speciesFilter: ['bush'] }
  ],
  canopy: [
    { key: 'spread', label: 'Canopy Spread Width', type: 'range', min: 0.8, max: 9.0, step: 0.1, unit: 'm', group: 'Crown Envelope' },
    { key: 'canopyHeight', label: 'Canopy Vertical Stretch', type: 'range', min: 0.35, max: 2.2, step: 0.05 },
    { key: 'density', label: 'Foliage Density (Clusters)', type: 'range', min: 2, max: 38, step: 1 },
    { key: 'clusterSize', label: 'Cluster Scale', type: 'range', min: 0.45, max: 3.0, step: 0.05 },
    { key: 'leafStyle', label: 'Cluster Geometry Style', type: 'select', options: 'leafStyle', group: 'Low-Poly Faceting' },
    { key: 'canopyShape', label: 'Crown Silhouette', type: 'select', options: 'canopyShape' },
    { key: 'polyDetail', label: 'Poly Subdivision', type: 'range', min: 0, max: 2, step: 1 },
    { key: 'jitter', label: 'Facet Crunch Jitter', type: 'range', min: 0.0, max: 0.45, step: 0.01 },
    { key: 'berryDensity', label: 'Berry Density', type: 'range', min: 0.0, max: 1.0, step: 0.05, speciesFilter: ['bush'], group: 'Shrub Accents' },
    { key: 'berrySize', label: 'Berry Size', type: 'range', min: 0.08, max: 0.35, step: 0.01, speciesFilter: ['bush'] },
    { key: 'berryColor', label: 'Berry Hue', type: 'color', speciesFilter: ['bush'] },
    { key: 'blossomDensity', label: 'Blossom Density', type: 'range', min: 0.0, max: 1.0, step: 0.05, speciesFilter: ['bush'] },
    { key: 'blossomSize', label: 'Blossom Size', type: 'range', min: 0.08, max: 0.35, step: 0.01, speciesFilter: ['bush'] },
    { key: 'blossomColor', label: 'Blossom Petal Hue', type: 'color', speciesFilter: ['bush'] }
  ],
  details: [
    { key: 'groundAttachment', label: 'Ground / Planter Base', type: 'select', options: 'groundAttachment', group: 'Planters & Grounding' },
    { key: 'planterColor', label: 'Planter / Pot Color', type: 'color' },
    { key: 'mossCoverage', label: 'Trunk Moss Coverage', type: 'range', min: 0.0, max: 1.0, step: 0.05, group: 'Organic Weathering' },
    { key: 'vineDensity', label: 'Hanging Vines', type: 'range', min: 0.0, max: 1.0, step: 0.05 },
    { key: 'shelfMushrooms', label: 'Shelf Mushrooms', type: 'range', min: 0.0, max: 1.0, step: 0.05 },
    { key: 'hollowEnabled', label: 'Trunk Hollow & Knot', type: 'checkbox' },
    { key: 'fruitType', label: 'Fruit / Cone Attachment', type: 'select', options: 'fruitType', group: 'Props & Fruit' },
    { key: 'fruitDensity', label: 'Fruit / Cone Density', type: 'range', min: 0.0, max: 1.0, step: 0.05 },
    { key: 'fruitColor', label: 'Fruit Accent Color', type: 'color' },
    { key: 'detailProp', label: 'Storytelling Prop', type: 'select', options: 'detailProp' }
  ],
  seasons: [
    { key: 'season', label: 'Seasonal & Biome Palette', type: 'select', options: 'season', group: 'Season & Weather' },
    { key: 'snow', label: 'Snow / Blossom Cap', type: 'range', min: 0.0, max: 1.0, step: 0.02 },
    { key: 'windStrength', label: 'Live Wind Sway', type: 'range', min: 0.0, max: 1.0, step: 0.05, group: 'Motion & Atmosphere' },
    { key: 'ambientFx', label: 'Ambient Particles', type: 'select', options: 'ambientFx' },
    { key: 'lightingMode', label: 'Viewport Time Of Day', type: 'select', options: 'lightingMode' },
    { key: 'environmentStage', label: 'Environment Ground Stage', type: 'select', options: 'environmentStage' }
  ],
  materials: [
    { key: 'colorLeaf1', label: 'Primary Foliage', type: 'color', group: 'Color Palette' },
    { key: 'colorLeaf2', label: 'Secondary Foliage', type: 'color' },
    { key: 'colorBark', label: 'Trunk & Limb Bark', type: 'color' },
    { key: 'colorAccent', label: 'Snow / Blossom / Accent', type: 'color' },
    { key: 'colorVar', label: 'Per-Facet Color Variance', type: 'range', min: 0.0, max: 0.5, step: 0.01, group: 'Surface Shading' },
    { key: 'barkTextureStyle', label: 'Bark Surface Finish', type: 'select', options: 'barkTextureStyle' },
    { key: 'emissiveIntensity', label: 'Arcane / Lantern Glow', type: 'range', min: 0.0, max: 1.0, step: 0.05 }
  ],
  export: [
    { key: 'lod2Style', label: 'Lod 2 Impostor Style', type: 'select', options: 'lod2Style', group: 'Lod & Atlas Settings' },
    { key: 'atlasRes', label: 'Billboard Atlas Resolution', type: 'range', min: 256, max: 1024, step: 256, unit: 'px' },
    { key: 'convertToBUnitsOnExport', label: 'Convert Glb To B Units (Z-Up)', type: 'checkbox', group: 'B Remastered Engine' }
  ]
};

export const TREE_RANDOM_CATEGORIES = {
  form: ['height', 'radius', 'taper', 'curve', 'radialSegments', 'rootFlare', 'rootStyle'],
  branches: ['branches', 'secondaryBranches', 'gnarl', 'branchStartRatio', 'branchLift'],
  canopy: ['spread', 'canopyHeight', 'density', 'clusterSize', 'polyDetail', 'jitter', 'leafStyle', 'canopyShape'],
  details: ['mossCoverage', 'vineDensity', 'shelfMushrooms', 'hollowEnabled', 'fruitDensity', 'detailProp', 'groundAttachment'],
  palette: ['season', 'colorLeaf1', 'colorLeaf2', 'colorBark', 'colorAccent', 'colorVar', 'snow', 'emissiveIntensity']
};

const VALID_SPECIES_IDS = new Set(TREE_SPECIES.map((s) => s.id));

function sanitizeOption(value, optionKey, fallback) {
  const list = TREE_OPTIONS[optionKey];
  if (!list) return fallback;
  return list.some((o) => o.value === value) ? value : fallback;
}

export function sanitiseTreeConfig(raw = {}) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const species = VALID_SPECIES_IDS.has(src.species) ? src.species : TREE_BASE.species;
  const presetKey = SPECIES_DEFAULT_PRESETS[species] || 'lumbridge_oak';
  const speciesBase = TREE_PRESETS[presetKey] || {};
  const merged = { ...TREE_BASE, ...speciesBase, ...src, species };

  // Backward compatibility for legacy shrub JSON without shrubVariant
  if (species === 'bush' && src.shrubVariant === undefined) {
    if ((Number(src.snow) || 0) > 0.05 || (typeof src.colorAccent === 'string' && src.colorAccent.toLowerCase() === '#ff3860')) {
      merged.shrubVariant = 'berry';
    }
  }
  if (species !== 'bush') {
    merged.shrubVariant = 'basic';
  }

  const out = {};
  out.species = species;
  out.seed = Math.max(1, Math.min(99999999, Math.round(Number(merged.seed) || 1337)));
  out.variation = treeClamp(Number(merged.variation ?? TREE_BASE.variation), 0, 0.65);

  out.height = treeClamp(Number(merged.height ?? TREE_BASE.height), 1.2, 20.0);
  out.radius = treeClamp(Number(merged.radius ?? TREE_BASE.radius), 0.08, 1.6);
  out.taper = treeClamp(Number(merged.taper ?? TREE_BASE.taper), 0.15, 0.95);
  out.curve = treeClamp(Number(merged.curve ?? TREE_BASE.curve), 0.0, 1.3);
  out.radialSegments = Math.round(treeClamp(Number(merged.radialSegments ?? TREE_BASE.radialSegments), 3, 10));
  out.rootFlare = treeClamp(Number(merged.rootFlare ?? TREE_BASE.rootFlare), 0.0, 1.0);
  out.rootStyle = sanitizeOption(merged.rootStyle, 'rootStyle', TREE_BASE.rootStyle);

  out.branches = Math.round(treeClamp(Number(merged.branches ?? TREE_BASE.branches), 0, 14));
  out.secondaryBranches = Math.round(treeClamp(Number(merged.secondaryBranches ?? TREE_BASE.secondaryBranches), 0, 4));
  out.gnarl = treeClamp(Number(merged.gnarl ?? TREE_BASE.gnarl), 0.0, 1.0);
  out.branchStartRatio = treeClamp(Number(merged.branchStartRatio ?? TREE_BASE.branchStartRatio), 0.25, 0.85);
  out.branchLift = treeClamp(Number(merged.branchLift ?? TREE_BASE.branchLift), 0.15, 1.15);

  out.spread = treeClamp(Number(merged.spread ?? TREE_BASE.spread), 0.8, 9.0);
  out.canopyHeight = treeClamp(Number(merged.canopyHeight ?? TREE_BASE.canopyHeight), 0.35, 2.2);
  out.density = Math.round(treeClamp(Number(merged.density ?? TREE_BASE.density), 2, 38));
  out.clusterSize = treeClamp(Number(merged.clusterSize ?? TREE_BASE.clusterSize), 0.45, 3.0);
  out.polyDetail = Math.round(treeClamp(Number(merged.polyDetail ?? TREE_BASE.polyDetail), 0, 2));
  out.jitter = treeClamp(Number(merged.jitter ?? TREE_BASE.jitter), 0.0, 0.45);
  out.leafStyle = sanitizeOption(merged.leafStyle, 'leafStyle', TREE_BASE.leafStyle);
  out.canopyShape = sanitizeOption(merged.canopyShape, 'canopyShape', TREE_BASE.canopyShape);

  out.shrubVariant = sanitizeOption(merged.shrubVariant, 'shrubVariant', 'basic');
  out.berryDensity = treeClamp(Number(merged.berryDensity ?? TREE_BASE.berryDensity), 0, 1);
  out.berryColor = treeNormalizeHex(merged.berryColor, TREE_BASE.berryColor);
  out.berrySize = treeClamp(Number(merged.berrySize ?? TREE_BASE.berrySize), 0.08, 0.35);
  out.blossomDensity = treeClamp(Number(merged.blossomDensity ?? TREE_BASE.blossomDensity), 0, 1);
  out.blossomColor = treeNormalizeHex(merged.blossomColor, TREE_BASE.blossomColor);
  out.blossomSize = treeClamp(Number(merged.blossomSize ?? TREE_BASE.blossomSize), 0.08, 0.35);
  out.topiaryShape = sanitizeOption(merged.topiaryShape, 'topiaryShape', TREE_BASE.topiaryShape);
  out.fantasyForm = sanitizeOption(merged.fantasyForm, 'fantasyForm', TREE_BASE.fantasyForm);

  out.groundAttachment = sanitizeOption(merged.groundAttachment, 'groundAttachment', TREE_BASE.groundAttachment);
  out.planterColor = treeNormalizeHex(merged.planterColor, TREE_BASE.planterColor);
  out.mossCoverage = treeClamp(Number(merged.mossCoverage ?? TREE_BASE.mossCoverage), 0, 1);
  out.vineDensity = treeClamp(Number(merged.vineDensity ?? TREE_BASE.vineDensity), 0, 1);
  out.shelfMushrooms = treeClamp(Number(merged.shelfMushrooms ?? TREE_BASE.shelfMushrooms), 0, 1);
  out.hollowEnabled = Boolean(merged.hollowEnabled);
  out.fruitType = sanitizeOption(merged.fruitType, 'fruitType', TREE_BASE.fruitType);
  out.fruitDensity = treeClamp(Number(merged.fruitDensity ?? TREE_BASE.fruitDensity), 0, 1);
  out.fruitColor = treeNormalizeHex(merged.fruitColor, TREE_BASE.fruitColor);
  out.detailProp = sanitizeOption(merged.detailProp, 'detailProp', TREE_BASE.detailProp);

  out.season = sanitizeOption(merged.season, 'season', TREE_BASE.season);
  out.colorLeaf1 = treeNormalizeHex(merged.colorLeaf1, TREE_BASE.colorLeaf1);
  out.colorLeaf2 = treeNormalizeHex(merged.colorLeaf2, TREE_BASE.colorLeaf2);
  out.colorBark = treeNormalizeHex(merged.colorBark, TREE_BASE.colorBark);
  out.colorAccent = treeNormalizeHex(merged.colorAccent, TREE_BASE.colorAccent);
  out.colorVar = treeClamp(Number(merged.colorVar ?? TREE_BASE.colorVar), 0, 0.5);
  out.snow = treeClamp(Number(merged.snow ?? TREE_BASE.snow), 0, 1);
  out.barkTextureStyle = sanitizeOption(merged.barkTextureStyle, 'barkTextureStyle', TREE_BASE.barkTextureStyle);
  out.emissiveIntensity = treeClamp(Number(merged.emissiveIntensity ?? TREE_BASE.emissiveIntensity), 0, 1);
  out.windStrength = treeClamp(Number(merged.windStrength ?? TREE_BASE.windStrength), 0, 1);
  out.ambientFx = sanitizeOption(merged.ambientFx, 'ambientFx', TREE_BASE.ambientFx);

  out.lod2Style = sanitizeOption(merged.lod2Style, 'lod2Style', TREE_BASE.lod2Style);
  out.lightingMode = sanitizeOption(merged.lightingMode, 'lightingMode', TREE_BASE.lightingMode);
  out.environmentStage = sanitizeOption(merged.environmentStage, 'environmentStage', TREE_BASE.environmentStage);
  const res = Number(merged.atlasRes) || 512;
  out.atlasRes = res >= 1024 ? 1024 : (res <= 256 ? 256 : 512);
  out.convertToBUnitsOnExport = Boolean(merged.convertToBUnitsOnExport);
  out.placedDetails = sanitisePlacedDetailsList(
    src.placedDetails !== undefined ? src.placedDetails : merged.placedDetails
  );

  return out;
}

export function applyTreePresetWithLocks(currentCfg, presetObj, locks = new Set()) {
  const safePreset = sanitiseTreeConfig(presetObj);
  const next = treeCopy(safePreset);
  if (locks && typeof locks.forEach === 'function') {
    locks.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(currentCfg, key)) {
        next[key] = currentCfg[key];
      }
    });
  }
  return sanitiseTreeConfig(next);
}
