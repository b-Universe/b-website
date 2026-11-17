import { clamp, copy, roundNum, colorHex } from '../utils.js';
import {
  OBJECT_CATEGORIES,
  ATTACHMENT_PROFILES,
  CONDITION_LEVELS,
  VARIATION_MODES
} from './categories.js';
import { OBJECT_MATERIAL_FAMILIES, URBAN_PALETTES } from '../materials/palettes.js';

const FAMILY_MAP = new Map();
const PRESET_MAP = new Map();
const CATEGORY_MAP = new Map(OBJECT_CATEGORIES.map((c) => [c.id, c]));
const GENERATOR_MODULES = new Set();

let regCachedTags = null;
let regCachedEnvTags = null;

export function registerGeneratorModule(registerFn) {
  if (typeof registerFn !== 'function') return;
  GENERATOR_MODULES.add(registerFn);
}

export function runRegisteredGeneratorModules() {
  for (const fn of GENERATOR_MODULES) {
    fn();
  }
}

export function hasObjectFamily(familyId) {
  return FAMILY_MAP.has(familyId);
}

export const COMMON_MATERIAL_KEYS = [
  'paletteFamily',
  'condition',
  'primaryMaterial',
  'primaryColor',
  'secondaryMaterial',
  'secondaryColor',
  'accentMaterial',
  'accentColor',
  'frameMaterial',
  'frameColor',
  'woodColor',
  'concreteColor',
  'glassColor',
  'glassOpacity',
  'emissiveColor'
];

function regValidChoice(list, value, fallback) {
  if (!Array.isArray(list) || !list.length) return fallback;
  return list.some(([id]) => id === value) ? value : fallback;
}

export function registerObjectFamily(familyDef) {
  if (!familyDef || !familyDef.id) {
    throw new Error('Object family definition requires an id');
  }
  const detailGroupRe = /detail|option|hardware|wear|decal|lid|trim|support|luminaire|light|hologram|mechanical|mounting/i;
  let currentGroupTab = 'structure';
  const normalizedSchema = Array.isArray(familyDef.schema)
    ? familyDef.schema.map((field) => {
      if (field.group) {
        currentGroupTab = detailGroupRe.test(field.group) ? 'details' : 'structure';
        return { ...field, tab: field.tab || currentGroupTab };
      }
      return {
        ...field,
        label: field.label || field.name || field.key,
        tab: field.tab || currentGroupTab
      };
    })
    : [];

  const normalized = {
    isAssembly: false,
    attachmentProfile: 'ground_standing',
    supportedAttachments: [familyDef.attachmentProfile || 'ground_standing'],
    architecturalStyle: 'municipal',
    sizeClass: 'medium',
    functionalRole: 'functional',
    locationContext: familyDef.locationContext || (familyDef.categoryId === 'office_public_interiors' ? 'interior' : 'exterior'),
    environmentTags: Array.isArray(familyDef.environmentTags) ? familyDef.environmentTags : [],
    subcategories: Array.isArray(familyDef.subcategories) ? familyDef.subcategories : [familyDef.subcategory].filter(Boolean),
    surfaceRelationship: familyDef.surfaceRelationship || null,
    tags: [],
    materialSlots: ['primary', 'secondary', 'frame'],
    presets: [],
    interaction: null,
    ...familyDef,
    categories: Array.from(new Set([familyDef.categoryId, ...(familyDef.categories || [])].filter(Boolean))),
    schema: normalizedSchema
  };
  const rootPaletteKeys = new Set([
    'paletteFamily',
    'condition',
    'attachmentProfile',
    'primaryMaterial',
    'secondaryMaterial',
    'accentMaterial',
    'frameMaterial',
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'frameColor',
    'emissiveColor'
  ]);
  normalized.presets = normalized.presets.map((p) => {
    const rawParams = p.params || p.values || {};
    const cleanParams = { ...rawParams };
    const promoted = {};
    for (const key of rootPaletteKeys) {
      if (cleanParams[key] !== undefined && p[key] === undefined) {
        promoted[key] = cleanParams[key];
      }
    }
    return {
      ...p,
      ...promoted,
      params: cleanParams,
      locationContext: p.locationContext || normalized.locationContext
    };
  });
  const catMeta = CATEGORY_MAP.get(normalized.categoryId) || OBJECT_CATEGORIES[0];
  normalized._tagSet = new Set((normalized.tags || []).map((t) => String(t).toLowerCase()));
  normalized._envSet = new Set((normalized.environmentTags || []).map((t) => String(t).toLowerCase()));
  normalized._locSet = new Set([
    normalized.locationContext || 'exterior',
    ...normalized.presets.map((p) => p.locationContext).filter(Boolean)
  ]);
  normalized._subSet = new Set([
    normalized.subcategory,
    ...(normalized.subcategories || []),
    ...normalized.presets.map((p) => p.subcategory).filter(Boolean)
  ].filter(Boolean));
  normalized._searchText = [
    normalized.id,
    normalized.label,
    normalized.description,
    normalized.subcategory,
    ...(normalized.subcategories || []),
    normalized.architecturalStyle,
    normalized.attachmentProfile,
    normalized.locationContext || '',
    catMeta.label,
    catMeta.shortLabel,
    ...(normalized.tags || []),
    ...(normalized.environmentTags || []),
    ...normalized.presets.flatMap((p) => [p.id, p.label, p.subcategory || '', ...(p.tags || [])])
  ].join(' ').toLowerCase();

  FAMILY_MAP.set(normalized.id, normalized);
  regCachedTags = null;
  regCachedEnvTags = null;

  for (const preset of normalized.presets) {
    const pId = preset.id;
    PRESET_MAP.set(pId, {
      ...preset,
      familyId: normalized.id,
      categoryId: normalized.categoryId,
      categories: normalized.categories,
      subcategory: preset.subcategory || normalized.subcategory,
      locationContext: preset.locationContext || normalized.locationContext
    });
  }
  return normalized;
}

export function getObjectFamily(familyId) {
  if (FAMILY_MAP.has(familyId)) return FAMILY_MAP.get(familyId);
  return FAMILY_MAP.values().next().value || null;
}

export function getAllObjectFamilies() {
  return Array.from(FAMILY_MAP.values());
}

export function getObjectPreset(presetId) {
  return PRESET_MAP.get(presetId) || null;
}

export function getAllObjectPresets() {
  return Array.from(PRESET_MAP.values());
}

export function getPresetsForFamily(familyId) {
  const fam = getObjectFamily(familyId);
  return fam ? fam.presets : [];
}

export function getCategoryMeta(categoryId) {
  return CATEGORY_MAP.get(categoryId) || OBJECT_CATEGORIES[0];
}

export function getAllCatalogTags() {
  if (regCachedTags) return regCachedTags;
  const set = new Set();
  for (const fam of FAMILY_MAP.values()) {
    for (const t of fam.tags || []) set.add(String(t).toLowerCase());
  }
  regCachedTags = Array.from(set).sort();
  return regCachedTags;
}

export function getAllEnvironmentTags() {
  if (regCachedEnvTags) return regCachedEnvTags;
  const set = new Set();
  for (const fam of FAMILY_MAP.values()) {
    for (const t of fam.environmentTags || []) set.add(String(t).toLowerCase());
  }
  regCachedEnvTags = Array.from(set).sort();
  return regCachedEnvTags;
}

export function searchCatalog(query = '', filters = {}, favoritesSet = new Set()) {
  const q = String(query || '').trim().toLowerCase();
  const spaceFilter = filters.spaceGroup || 'all';
  const catFilter = filters.categoryId || 'all';
  const subFilter = filters.subcategory || 'all';
  const attachFilter = filters.attachmentProfile || 'all';
  const styleFilter = filters.architecturalStyle || 'all';
  const sizeFilter = filters.sizeClass || 'all';
  const roleFilter = filters.functionalRole || 'all';
  const tagFilter = String(filters.tag || 'all').toLowerCase();
  const locFilter = filters.locationContext || 'all';
  const envFilter = String(filters.environmentTag || 'all').toLowerCase();
  const favOnly = Boolean(filters.favoritesOnly);

  const results = [];
  for (const fam of FAMILY_MAP.values()) {
    const famCats = fam.categories || [fam.categoryId];
    if (spaceFilter !== 'all') {
      const catSpaceMatch = famCats.some((cid) => getCategoryMeta(cid).spaceGroup === spaceFilter);
      const locMatch = (spaceFilter === 'interior' && (fam.locationContext === 'interior' || fam.locationContext === 'both' || (fam.presets || []).some((p) => p.locationContext === 'interior' || p.locationContext === 'both')))
        || (spaceFilter === 'exterior' && (fam.locationContext === 'exterior' || fam.locationContext === 'both' || (fam.presets || []).some((p) => p.locationContext === 'exterior' || p.locationContext === 'both')));
      if (spaceFilter === 'interior' || spaceFilter === 'exterior') {
        if (!catSpaceMatch && !locMatch) continue;
      } else if (!catSpaceMatch) {
        continue;
      }
    }
    if (catFilter !== 'all' && !famCats.includes(catFilter)) continue;
    if (subFilter !== 'all') {
      const subMatch = fam._subSet
        ? fam._subSet.has(subFilter)
        : (fam.subcategory === subFilter
          || (fam.subcategories || []).includes(subFilter)
          || (fam.presets || []).some((p) => p.subcategory === subFilter));
      if (!subMatch) continue;
    }
    if (attachFilter !== 'all') {
      const supported = fam.supportedAttachments || [fam.attachmentProfile];
      if (fam.attachmentProfile !== attachFilter && !supported.includes(attachFilter)) continue;
    }
    if (styleFilter !== 'all' && fam.architecturalStyle !== styleFilter) continue;
    if (sizeFilter !== 'all' && fam.sizeClass !== sizeFilter) continue;
    if (roleFilter !== 'all' && fam.functionalRole !== roleFilter) continue;
    if (locFilter !== 'all') {
      const locs = fam._locSet || new Set([fam.locationContext || 'exterior', ...(fam.presets || []).map((p) => p.locationContext).filter(Boolean)]);
      const hasInterior = locs.has('interior') || locs.has('both');
      const hasExterior = locs.has('exterior') || locs.has('both');
      if (locFilter === 'interior' && !hasInterior) continue;
      if (locFilter === 'exterior' && !hasExterior) continue;
      if (locFilter === 'both' && !(locs.has('both') || (hasInterior && hasExterior))) continue;
    }
    if (envFilter !== 'all') {
      const hasEnv = (fam._envSet ? fam._envSet.has(envFilter) : (fam.environmentTags || []).some((t) => t.toLowerCase() === envFilter))
        || (fam._tagSet ? fam._tagSet.has(envFilter) : (fam.tags || []).some((t) => t.toLowerCase() === envFilter));
      if (!hasEnv) continue;
    }
    if (tagFilter !== 'all' && !(fam._tagSet ? fam._tagSet.has(tagFilter) : (fam.tags || []).some((t) => t.toLowerCase() === tagFilter))) continue;
    if (favOnly && !favoritesSet.has(fam.id) && !fam.presets.some((p) => favoritesSet.has(`preset:${p.id}`))) {
      continue;
    }

    if (q) {
      const haystack = fam._searchText || '';
      if (!haystack.includes(q)) continue;
    }

    results.push(fam);
  }
  return results;
}

export function buildDefaultConfigForFamily(familyId, presetId = null) {
  const fam = getObjectFamily(familyId);
  if (!fam) {
    return {
      familyId: '',
      presetId: '',
      seed: 1024,
      variationMode: 'moderate',
      condition: 'clean',
      paletteFamily: 'municipal',
      attachmentProfile: 'ground_standing',
      lightingTime: 'day'
    };
  }

  const preset = (presetId && PRESET_MAP.get(presetId)?.familyId === fam.id)
    ? PRESET_MAP.get(presetId)
    : fam.presets[0] || {};

  const cfg = {
    familyId: fam.id,
    presetId: preset.id || `${fam.id}_default`,
    seed: preset.seed || 1024,
    variationMode: 'moderate',
    condition: preset.condition || 'clean',
    paletteFamily: preset.paletteFamily || fam.defaultPalette || 'municipal',
    attachmentProfile: preset.attachmentProfile || fam.attachmentProfile || 'ground_standing',
    lightingTime: 'day',
    primaryMaterial: preset.primaryMaterial || fam.defaultMaterials?.primaryMaterial || 'painted_steel',
    primaryColor: preset.primaryColor || fam.defaultMaterials?.primaryColor || '#2d6847',
    secondaryMaterial: preset.secondaryMaterial || fam.defaultMaterials?.secondaryMaterial || 'galvanized_metal',
    secondaryColor: preset.secondaryColor || fam.defaultMaterials?.secondaryColor || '#98a3ad',
    accentMaterial: preset.accentMaterial || fam.defaultMaterials?.accentMaterial || 'painted_steel',
    accentColor: preset.accentColor || fam.defaultMaterials?.accentColor || '#e5a832',
    frameMaterial: preset.frameMaterial || fam.defaultMaterials?.frameMaterial || 'cast_iron',
    frameColor: preset.frameColor || fam.defaultMaterials?.frameColor || '#252b31',
    woodColor: preset.woodColor || '#8d5b34',
    concreteColor: preset.concreteColor || '#8a8f94',
    glassColor: preset.glassColor || '#4c7996',
    glassOpacity: preset.glassOpacity !== undefined ? preset.glassOpacity : 0.35,
    emissiveColor: preset.emissiveColor || '#4de2ff'
  };

  for (const field of fam.schema || []) {
    if (field.group) continue;
    const key = field.key;
    if (preset.params && preset.params[key] !== undefined) {
      cfg[key] = preset.params[key];
    } else if (field.default !== undefined) {
      cfg[key] = field.default;
    } else if (field.type === 'boolean') {
      cfg[key] = false;
    } else if (field.type === 'select' && field.options?.length) {
      cfg[key] = field.options[0][0];
    } else if (field.type === 'text') {
      cfg[key] = '';
    } else {
      cfg[key] = field.min ?? 1;
    }
  }

  return sanitiseObjectConfig(cfg);
}

export function sanitiseObjectConfig(rawCfg = {}) {
  const fam = getObjectFamily(rawCfg.familyId);
  if (!fam) return copy(rawCfg);

  const preset = (rawCfg.presetId && PRESET_MAP.get(rawCfg.presetId)?.familyId === fam.id)
    ? PRESET_MAP.get(rawCfg.presetId)
    : fam.presets[0] || {};

  const out = {
    familyId: fam.id,
    presetId: preset.id || `${fam.id}_default`,
    seed: clamp(Math.floor(Number(rawCfg.seed) || preset.seed || 1024), 1, 99999999),
    variationMode: VARIATION_MODES.some((m) => m.id === rawCfg.variationMode) ? rawCfg.variationMode : 'moderate',
    condition: CONDITION_LEVELS.some((c) => c.id === rawCfg.condition) ? rawCfg.condition : (preset.condition || 'clean'),
    paletteFamily: URBAN_PALETTES[rawCfg.paletteFamily] ? rawCfg.paletteFamily : (preset.paletteFamily || fam.defaultPalette || 'municipal'),
    attachmentProfile: (fam.supportedAttachments || [fam.attachmentProfile]).includes(rawCfg.attachmentProfile)
      ? rawCfg.attachmentProfile
      : (ATTACHMENT_PROFILES[fam.attachmentProfile] ? fam.attachmentProfile : 'ground_standing'),
    lightingTime: ['day', 'golden_hour', 'dusk', 'night'].includes(rawCfg.lightingTime) ? rawCfg.lightingTime : 'day',
    primaryMaterial: OBJECT_MATERIAL_FAMILIES[rawCfg.primaryMaterial] ? rawCfg.primaryMaterial : (preset.primaryMaterial || 'painted_steel'),
    primaryColor: colorHex(rawCfg.primaryColor, preset.primaryColor || '#2d6847'),
    secondaryMaterial: OBJECT_MATERIAL_FAMILIES[rawCfg.secondaryMaterial] ? rawCfg.secondaryMaterial : (preset.secondaryMaterial || 'galvanized_metal'),
    secondaryColor: colorHex(rawCfg.secondaryColor, preset.secondaryColor || '#98a3ad'),
    accentMaterial: OBJECT_MATERIAL_FAMILIES[rawCfg.accentMaterial] ? rawCfg.accentMaterial : (preset.accentMaterial || 'painted_steel'),
    accentColor: colorHex(rawCfg.accentColor, preset.accentColor || '#e5a832'),
    frameMaterial: OBJECT_MATERIAL_FAMILIES[rawCfg.frameMaterial] ? rawCfg.frameMaterial : (preset.frameMaterial || 'cast_iron'),
    frameColor: colorHex(rawCfg.frameColor, preset.frameColor || '#252b31'),
    woodColor: colorHex(rawCfg.woodColor, preset.woodColor || '#8d5b34'),
    concreteColor: colorHex(rawCfg.concreteColor, preset.concreteColor || '#8a8f94'),
    glassColor: colorHex(rawCfg.glassColor, preset.glassColor || '#4c7996'),
    glassOpacity: roundNum(
      clamp(
        Number.isFinite(Number(rawCfg.glassOpacity)) ? Number(rawCfg.glassOpacity) : (preset.glassOpacity ?? 0.35),
        0.05,
        1.0
      ),
      2
    ),
    emissiveColor: colorHex(rawCfg.emissiveColor, preset.emissiveColor || '#4de2ff')
  };

  for (const field of fam.schema || []) {
    if (field.group) continue;
    const key = field.key;
    const rawVal = rawCfg[key] !== undefined ? rawCfg[key] : (preset.params?.[key] ?? field.default);

    if (field.type === 'boolean') {
      out[key] = Boolean(rawVal);
    } else if (field.type === 'select') {
      const fallback = preset.params?.[key] ?? field.default ?? field.options?.[0]?.[0];
      out[key] = regValidChoice(field.options, rawVal, fallback);
    } else if (field.type === 'text') {
      out[key] = String(rawVal ?? field.default ?? '').slice(0, field.maxLength || 36);
    } else if (field.type === 'color') {
      out[key] = colorHex(rawVal, field.default || '#ffffff');
    } else {
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step || 0.01;
      const fallback = Number(preset.params?.[key] ?? field.default ?? min);
      const num = Number.isFinite(Number(rawVal)) ? Number(rawVal) : fallback;
      const clamped = clamp(num, min, max);
      const snapped = step >= 1
        ? Math.round(clamped / step) * step
        : roundNum(Math.round(clamped / step) * step, 4);
      out[key] = clamp(snapped, min, max);
    }
  }

  return out;
}

export function applyObjectPresetWithLocks(currentState, targetPresetId, locks = new Set()) {
  const preset = getObjectPreset(targetPresetId);
  if (!preset) return sanitiseObjectConfig(currentState);

  const next = buildDefaultConfigForFamily(preset.familyId, preset.id);
  const sameFamily = currentState && currentState.familyId === preset.familyId;

  for (const key of locks) {
    if (currentState && currentState[key] !== undefined) {
      if (sameFamily || COMMON_MATERIAL_KEYS.includes(key) || key === 'seed' || key === 'variationMode') {
        next[key] = copy(currentState[key]);
      }
    }
  }

  return sanitiseObjectConfig(next);
}
