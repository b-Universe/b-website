import { copy, clamp, colorHex } from '../utils.js';
import {
  BASE_BUILDING_CONFIG,
  BUILDING_CATEGORIES,
  SHARED_SCHEMA_FIELDS,
  ARCHITECTURAL_ERAS,
  MATERIAL_FAMILIES,
  CONDITION_LEVELS,
  LOT_TYPES,
  ROOF_STYLES,
  WINDOW_STYLES,
  ENTRANCE_LOCATIONS,
  SIGNAGE_STYLES,
  PARKING_CONFIGS,
  SIDEWALK_CONFIGS
} from '../config.js';

const FAMILY_MAP = new Map();
const PRESET_MAP = new Map();
const CATEGORY_MAP = new Map(BUILDING_CATEGORIES.map((c) => [c.id, c]));

function validId(list, value, fallback) {
  return list.some((item) => item.id === value) ? value : fallback;
}

export function registerSpecialtyFamily(familyDef) {
  if (!familyDef || !familyDef.id) {
    throw new Error('Specialty building family requires an id');
  }
  const normalized = {
    categoryId: 'commercial_services',
    categories: [],
    label: familyDef.id,
    description: '',
    environmentTags: [],
    supportedLotTypes: ['standalone_commercial', 'compact_urban', 'corner_commercial', 'none'],
    defaultObjectGroups: ['site_amenities', 'waste_utility', 'rooftop_mep', 'signage_lighting'],
    featureSchema: [],
    presets: [],
    defaults: {},
    buildStructure: null,
    planObjects: null,
    ...familyDef
  };
  normalized.categories = Array.from(new Set([normalized.categoryId, ...(normalized.categories || [])].filter(Boolean)));
  normalized.presets = (normalized.presets || []).map((preset) => ({
    ...preset,
    familyId: normalized.id,
    categoryId: normalized.categoryId,
    environmentTags: Array.from(new Set([...(normalized.environmentTags || []), ...(preset.environmentTags || [])])),
    params: { ...(normalized.defaults || {}), ...(preset.params || {}) }
  }));

  normalized._searchText = [
    normalized.id,
    normalized.label,
    normalized.description,
    normalized.categoryId,
    ...(normalized.environmentTags || []),
    ...normalized.presets.flatMap((p) => [p.id, p.label, p.description || '', ...(p.environmentTags || [])])
  ].join(' ').toLowerCase();

  FAMILY_MAP.set(normalized.id, normalized);
  for (const preset of normalized.presets) {
    PRESET_MAP.set(preset.id, preset);
  }
  return normalized;
}

export function getSpecialtyFamily(familyId) {
  return FAMILY_MAP.get(familyId) || null;
}

export function getAllSpecialtyFamilies() {
  return Array.from(FAMILY_MAP.values());
}

export function getSpecialtyPreset(presetId) {
  return PRESET_MAP.get(presetId) || null;
}

export function getAllSpecialtyPresets() {
  return Array.from(PRESET_MAP.values());
}

export function getPresetsForSpecialtyFamily(familyId) {
  const fam = getSpecialtyFamily(familyId);
  return fam ? fam.presets : [];
}

export function getSpecialtyCategoryMeta(categoryId) {
  return CATEGORY_MAP.get(categoryId) || BUILDING_CATEGORIES[0];
}

export function searchSpecialtyCatalog(query = '', filters = {}) {
  const q = String(query || '').trim().toLowerCase();
  const cat = filters.categoryId && filters.categoryId !== 'all' ? filters.categoryId : null;
  const tag = filters.environmentTag && filters.environmentTag !== 'all' ? filters.environmentTag.toLowerCase() : null;
  const era = filters.architecturalEra && filters.architecturalEra !== 'all' ? filters.architecturalEra : null;

  return getAllSpecialtyFamilies().filter((fam) => {
    if (cat && !fam.categories.includes(cat)) return false;
    if (tag) {
      const hasTag = fam.environmentTags.some((t) => t.toLowerCase() === tag)
        || fam.presets.some((p) => p.environmentTags.some((t) => t.toLowerCase() === tag));
      if (!hasTag) return false;
    }
    if (era) {
      const hasEra = fam.presets.some((p) => p.params?.architecturalEra === era);
      if (!hasEra) return false;
    }
    if (q && !fam._searchText.includes(q)) return false;
    return true;
  });
}

export function getSchemaForFamily(familyId) {
  const fam = getSpecialtyFamily(familyId);
  const familyFields = (fam?.featureSchema || []).map((f) => ({
    ...f,
    tab: f.tab || 'features',
    isFamilySpecific: true
  }));
  return [...SHARED_SCHEMA_FIELDS, ...familyFields];
}

export function buildDefaultSpecialtyConfig(familyId = 'gas_station', presetId = null) {
  const fam = getSpecialtyFamily(familyId) || getAllSpecialtyFamilies()[0] || null;
  const preset = (presetId && getSpecialtyPreset(presetId)) || (fam && fam.presets[0]) || null;
  const base = copy(BASE_BUILDING_CONFIG);
  if (fam) {
    base.familyId = fam.id;
    Object.assign(base, copy(fam.defaults || {}));
  }
  if (preset) {
    base.familyId = preset.familyId;
    base.presetId = preset.id;
    Object.assign(base, copy(preset.params || {}));
  }
  return sanitiseSpecialtyConfig(base);
}

export function sanitiseSpecialtyConfig(rawCfg = {}) {
  const fam = getSpecialtyFamily(rawCfg.familyId) || getAllSpecialtyFamilies()[0] || null;
  const preset = (rawCfg.presetId && getSpecialtyPreset(rawCfg.presetId)) || (fam && fam.presets[0]) || null;

  const merged = {
    ...copy(BASE_BUILDING_CONFIG),
    ...(fam ? copy(fam.defaults || {}) : {}),
    ...(preset && preset.familyId === fam?.id ? copy(preset.params || {}) : {}),
    ...copy(rawCfg || {})
  };

  if (fam) merged.familyId = fam.id;
  if (preset && preset.familyId === fam?.id) merged.presetId = preset.id;
  else if (fam && fam.presets[0]) merged.presetId = fam.presets[0].id;

  merged.seed = clamp(Math.round(Number(merged.seed) || 2026), 1, 99999999);
  merged.width = clamp(merged.width, 3.5, 64);
  merged.depth = clamp(merged.depth, 3.0, 52);
  merged.floors = clamp(Math.round(Number(merged.floors) || 1), 1, 12);
  merged.floorHeight = clamp(merged.floorHeight, 2.6, 7.5);
  merged.roofPitchHeight = clamp(merged.roofPitchHeight, 0.4, 4.5);
  merged.parapetHeight = clamp(merged.parapetHeight, 0.1, 1.5);
  merged.windowDensity = clamp(merged.windowDensity, 0, 1);
  merged.entranceCount = clamp(Math.round(Number(merged.entranceCount) || 1), 1, 3);
  merged.outdoorObjectDensity = clamp(merged.outdoorObjectDensity, 0, 1);

  merged.architecturalEra = validId(ARCHITECTURAL_ERAS, merged.architecturalEra, 'contemporary');
  merged.exteriorMaterial = validId(MATERIAL_FAMILIES, merged.exteriorMaterial, 'mixed_commercial');
  merged.condition = validId(CONDITION_LEVELS, merged.condition, 'clean');
  merged.lotType = validId(LOT_TYPES, merged.lotType, 'standalone_commercial');
  merged.roofStyle = validId(ROOF_STYLES, merged.roofStyle, 'flat');
  merged.windowStyle = validId(WINDOW_STYLES, merged.windowStyle, 'storefront');
  merged.entranceLocation = validId(ENTRANCE_LOCATIONS, merged.entranceLocation, 'front_center');
  merged.signageStyle = validId(SIGNAGE_STYLES, merged.signageStyle, 'illuminated_fascia');
  merged.parkingConfig = validId(PARKING_CONFIGS, merged.parkingConfig, 'front_row');
  merged.sidewalkConfig = validId(SIDEWALK_CONFIGS, merged.sidewalkConfig, 'front_only');

  merged.lotWidth = clamp(Math.max(merged.lotWidth, merged.width + 2), 8, 96);
  merged.lotDepth = clamp(Math.max(merged.lotDepth, merged.depth + 2), 8, 88);
  merged.frontSetback = clamp(merged.frontSetback, 1.5, 24);
  merged.sideSetback = clamp(merged.sideSetback, 1.0, 18);
  merged.parkingCount = clamp(Math.round(Number(merged.parkingCount) || 0), 0, 28);

  merged.primaryColor = colorHex(merged.primaryColor, '#d9dfe6');
  merged.secondaryColor = colorHex(merged.secondaryColor, '#2c4a6e');
  merged.accentColor = colorHex(merged.accentColor, '#d93c2b');
  merged.trimColor = colorHex(merged.trimColor, '#36414c');
  merged.glassColor = colorHex(merged.glassColor, '#4e83a6');

  merged.signText = String(merged.signText || fam?.label || 'Specialty Building').slice(0, 36);
  merged.includeBuildingLayer = merged.includeBuildingLayer !== false;
  merged.includeLot = merged.includeLot !== false && merged.lotType !== 'none';
  merged.includeObjectsLayer = merged.includeObjectsLayer !== false;
  merged.disabledObjectGroups = Array.isArray(merged.disabledObjectGroups) ? merged.disabledObjectGroups : [];

  // Clamp family-specific schema bounds
  if (fam && Array.isArray(fam.featureSchema)) {
    for (const field of fam.featureSchema) {
      if (!field.key) continue;
      if (merged[field.key] === undefined && field.default !== undefined) {
        merged[field.key] = field.default;
      }
      if (field.type === 'range' || field.type === 'number') {
        const val = Number(merged[field.key]);
        merged[field.key] = clamp(Number.isFinite(val) ? val : (field.default ?? field.min ?? 0), field.min ?? -999, field.max ?? 999);
        if (field.step && field.step >= 1) merged[field.key] = Math.round(merged[field.key]);
      } else if (field.type === 'boolean') {
        merged[field.key] = Boolean(merged[field.key]);
      } else if (field.type === 'select' && Array.isArray(field.options)) {
        const optId = (opt) => (Array.isArray(opt) ? opt[0] : opt?.id);
        const valid = field.options.some((opt) => optId(opt) === merged[field.key]);
        if (!valid) merged[field.key] = field.default ?? optId(field.options[0]);
      }
    }
  }

  return merged;
}

export function applySpecialtyPresetWithLocks(currentCfg, presetId, locks = new Set()) {
  const preset = getSpecialtyPreset(presetId);
  if (!preset) return sanitiseSpecialtyConfig(currentCfg);
  const next = buildDefaultSpecialtyConfig(preset.familyId, preset.id);
  next.seed = currentCfg?.seed || next.seed;
  next.variationStrength = currentCfg?.variationStrength || next.variationStrength;
  next.lightingTime = currentCfg?.lightingTime || next.lightingTime;

  const sameFamily = currentCfg && currentCfg.familyId === preset.familyId;
  for (const key of locks) {
    if (currentCfg && currentCfg[key] !== undefined) {
      if (sameFamily || ['seed', 'variationStrength', 'lightingTime', 'primaryColor', 'secondaryColor', 'accentColor', 'trimColor', 'glassColor', 'condition', 'architecturalEra'].includes(key)) {
        next[key] = copy(currentCfg[key]);
      }
    }
  }
  return sanitiseSpecialtyConfig(next);
}
