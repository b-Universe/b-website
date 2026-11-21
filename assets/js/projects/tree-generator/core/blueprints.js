import { treeHashString, treeRoundNum } from '../utils.js';
import { TREE_BLUEPRINT_SCHEMA_VERSION, TREE_B_UNITS_PER_METER, TREE_CONFIG_KEYS, sanitiseTreeConfig } from '../config.js';
import { getSpeciesMeta, TREE_SPECIES } from './species.js';
import { resolveTreeLayout } from './layout.js';

export function generateTreeBlueprint(rawCfg, options = {}) {
  const cfg = sanitiseTreeConfig(rawCfg);
  const layout = options.layout || resolveTreeLayout(cfg);
  const speciesMeta = getSpeciesMeta(cfg.species);

  const corePayload = {
    schemaVersion: TREE_BLUEPRINT_SCHEMA_VERSION,
    species: cfg.species,
    speciesName: speciesMeta.name,
    category: speciesMeta.category,
    seed: cfg.seed,
    config: cfg
  };

  const revisionHash = 'rev_' + treeHashString(JSON.stringify(corePayload)).slice(0, 16);
  const templateId = `tree_tpl_${cfg.species}_${cfg.seed}_${treeHashString(cfg.species + ':' + cfg.seed).slice(0, 10)}`;

  const lodStats = options.lodStats || null;

  return {
    schemaVersion: TREE_BLUEPRINT_SCHEMA_VERSION,
    templateId,
    revisionHash,
    generator: 'b-tree-generator',
    species: cfg.species,
    speciesName: speciesMeta.name,
    category: speciesMeta.category,
    bUnitsPerMeter: TREE_B_UNITS_PER_METER,
    seed: cfg.seed,
    config: cfg,
    bounds: layout.bounds,
    collisionBounds: layout.collisionBounds,
    interaction: layout.interaction,
    windProfile: layout.windProfile,
    foliageMaterial: {
      mode: cfg.foliageTextureMode,
      grassTextureEnabled: cfg.foliageGrassTexture,
      textureAsset: cfg.foliageGrassTexture ? '/assets/structural-materials/grass_block_top.png' : null,
      textureResolution: cfg.foliageGrassTexture ? 16 : 0,
      filtering: 'nearest',
      textureScale: cfg.foliageTextureScale,
      tintStrength: cfg.foliageTintStrength,
      colorVariation: cfg.foliageTextureVariation
    },
    attachments: {
      groundAttachment: cfg.groundAttachment,
      planterRadius: treeRoundNum(layout.planterRadius, 3),
      trunkTop: {
        x: treeRoundNum(layout.trunkTop.x, 3),
        y: treeRoundNum(layout.trunkTop.y, 3),
        z: treeRoundNum(layout.trunkTop.z, 3)
      },
      branchAnchors: layout.branchAnchors,
      detailProp: cfg.detailProp,
      fruitType: cfg.fruitType,
      placedDetailCount: cfg.placedDetails.length,
      placedDetails: cfg.placedDetails
    },
    lodBudget: lodStats || {
      lod0TargetTris: Math.round(180 + cfg.density * (cfg.polyDetail + 1) * 32),
      lod1Ratio: 0.42,
      lod2Style: cfg.lod2Style,
      lod3Tris: 4,
      atlasResolution: cfg.atlasRes
    }
  };
}

export function validateTreeBlueprint(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['Blueprint must be a non-null JSON object'], warnings };
  }

  if (data.schemaVersion !== TREE_BLUEPRINT_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion: expected ${TREE_BLUEPRINT_SCHEMA_VERSION}`);
  }

  if (!TREE_SPECIES.some((s) => s.id === data.species)) {
    errors.push(`Unknown tree species: ${data.species}`);
  }

  if (!data.config || typeof data.config !== 'object') {
    errors.push('Missing config object');
  }

  const m = data.bounds && data.bounds.meters;
  if (!m || !(m.width > 0) || !(m.height > 0) || !(m.length > 0)) {
    errors.push('Invalid bounds.meters dimensions');
  }

  const bu = data.bounds && data.bounds.bGameUnits;
  if (!bu || !(bu.width > 0) || !(bu.height > 0)) {
    errors.push('Invalid bounds.bGameUnits dimensions');
  }

  if (!data.collisionBounds || !data.collisionBounds.trunkCylinder || !data.collisionBounds.canopyBox) {
    errors.push('Missing collisionBounds trunkCylinder or canopyBox');
  }

  if (!data.interaction || typeof data.interaction.harvestRingRadius !== 'number') {
    errors.push('Missing interaction metadata');
  }

  if (data.config && data.config.height > 18 && data.config.radius < 0.25) {
    warnings.push('Tall tree with very slender trunk radius');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function checkTreeBlueprintCompatibility(parsed) {
  const issues = [];
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { compatible: false, issues: ['File is not a JSON object'] };
  }

  const isBlueprint = Boolean(parsed.schemaVersion || parsed.templateId || parsed.config);
  const cfgObj = parsed.config && typeof parsed.config === 'object' ? parsed.config : parsed;

  if (parsed.schemaVersion && parsed.schemaVersion !== TREE_BLUEPRINT_SCHEMA_VERSION) {
    issues.push(`Schema version "${parsed.schemaVersion}" differs from "${TREE_BLUEPRINT_SCHEMA_VERSION}"`);
  }

  if (cfgObj.species && !TREE_SPECIES.some((s) => s.id === cfgObj.species)) {
    issues.push(`Unknown species "${cfgObj.species}"`);
  }

  if (isBlueprint && parsed.schemaVersion === TREE_BLUEPRINT_SCHEMA_VERSION) {
    const val = validateTreeBlueprint(parsed);
    if (!val.ok) {
      issues.push(...val.errors);
    }
  }

  const unknownKeys = Object.keys(cfgObj).filter(
    (k) => !TREE_CONFIG_KEYS.includes(k) && k !== 'shrubVariant'
  );
  if (unknownKeys.length > 10) {
    issues.push(`Contains ${unknownKeys.length} unrecognized config keys`);
  }

  return { compatible: issues.length === 0, issues, extractedConfig: cfgObj };
}
