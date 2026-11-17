import { clamp, copy, roundNum, forkRng, mixHex, darkenHex, lightenHex } from '../utils.js';
import { CONDITION_LEVELS, VARIATION_MODES } from './categories.js';
import {
  COMMON_MATERIAL_KEYS,
  getObjectFamily,
  sanitiseObjectConfig
} from './registry.js';
import { URBAN_PALETTES, generateObjectPalette } from '../materials/palettes.js';

function varSpreadForMode(modeId) {
  const mode = VARIATION_MODES.find((m) => m.id === modeId);
  return mode ? mode.spread : 0.12;
}

function varJitterColor(hex, r, amount) {
  if (!hex || amount <= 0) return hex;
  const shift = (r() - 0.5) * 2 * amount;
  if (shift >= 0) return lightenHex(hex, clamp(shift, 0, 0.25));
  return darkenHex(hex, clamp(-shift, 0, 0.25));
}

export function applyObjectSeedVariation(rawCfg, locks = new Set()) {
  const base = sanitiseObjectConfig(rawCfg);
  const spread = varSpreadForMode(base.variationMode);
  if (spread <= 0) return base;

  const family = getObjectFamily(base.familyId);
  const next = copy(base);
  const r = forkRng(base.seed, 4099);

  if (family && Array.isArray(family.schema)) {
    for (const field of family.schema) {
      if (field.group) continue;
      const key = field.key;
      if (locks.has(key)) continue;

      if (field.type === 'number' || field.type === 'range') {
        const val = Number(next[key]);
        if (!Number.isFinite(val)) continue;
        const min = field.min ?? 0;
        const max = field.max ?? 100;
        const span = max - min;
        if (span <= 0) continue;

        const isCount = (field.step || 0.01) >= 1;
        const effectiveSpread = field.tab === 'details' ? spread * 1.15 : spread * 0.75;
        const delta = (r() - 0.5) * 2 * span * effectiveSpread;
        let candidate = clamp(val + delta, min, max);
        if (isCount && spread < 0.18) {
          candidate = val;
        }
        next[key] = field.step && field.step >= 1
          ? Math.round(candidate)
          : roundNum(candidate, 3);
      } else if (field.type === 'boolean' && field.tab === 'details' && spread >= 0.12) {
        if (r() < spread * 0.65) {
          next[key] = !next[key];
        }
      }
    }
  }

  const colorKeys = ['primaryColor', 'secondaryColor', 'accentColor', 'frameColor'];
  for (const ck of colorKeys) {
    if (!locks.has(ck)) {
      next[ck] = varJitterColor(next[ck], r, spread * 0.45);
    }
  }

  return sanitiseObjectConfig(next);
}

export function generateVariationCandidates(rawCfg, count = 6, locks = new Set()) {
  const base = sanitiseObjectConfig(rawCfg);
  const total = clamp(Math.round(count || 6), 1, 12);
  const candidates = [];
  const paletteKeys = Object.keys(URBAN_PALETTES);
  const conditionPool = ['clean', 'lightly_worn', 'weathered', 'neglected', 'new'];

  for (let i = 0; i < total; i++) {
    const derivedSeed = ((base.seed + i * 1009 + 17) % 99999998) + 1;
    const r = forkRng(derivedSeed, 7919 + i);
    const seedCfg = copy(base);
    if (!locks.has('seed')) seedCfg.seed = derivedSeed;
    if (seedCfg.variationMode === 'none') seedCfg.variationMode = 'moderate';

    if (!locks.has('condition') && i > 0) {
      seedCfg.condition = conditionPool[i % conditionPool.length];
    }

    if (!locks.has('paletteFamily') && i >= 2) {
      seedCfg.paletteFamily = paletteKeys[(paletteKeys.indexOf(base.paletteFamily) + i) % paletteKeys.length];
    }

    const pal = generateObjectPalette(seedCfg.paletteFamily, derivedSeed, seedCfg.condition);
    for (const key of COMMON_MATERIAL_KEYS) {
      if (key === 'condition' || key === 'paletteFamily') continue;
      if (!locks.has(key) && pal[key] !== undefined && i > 0) {
        seedCfg[key] = pal[key];
      }
    }

    const varied = applyObjectSeedVariation(seedCfg, locks);
    if (!locks.has('primaryColor') && i === 1) {
      varied.primaryColor = mixHex(varied.primaryColor, pal.accentColor, 0.22);
    }

    const letter = String.fromCharCode(65 + i);
    const condMeta = CONDITION_LEVELS.find((c) => c.id === varied.condition) || CONDITION_LEVELS[1];
    candidates.push({
      index: i,
      label: i === 0 ? 'Current Base' : `Variant ${letter}`,
      subtitle: `${condMeta.label} | Seed ${varied.seed}`,
      seed: varied.seed,
      config: varied
    });
  }

  return candidates;
}

export function randomizeObjectSettings(rawCfg, scope = 'all', locks = new Set()) {
  const base = sanitiseObjectConfig(rawCfg);
  const family = getObjectFamily(base.familyId);
  const next = copy(base);
  const randomSeed = Math.floor(Math.random() * 900000) + 10000;
  const r = forkRng(randomSeed, 31337);

  if ((scope === 'all' || scope === 'seed') && !locks.has('seed')) {
    next.seed = randomSeed;
  }

  if (scope === 'all' || scope === 'condition') {
    if (!locks.has('condition')) {
      const idx = Math.floor(r() * CONDITION_LEVELS.length);
      next.condition = CONDITION_LEVELS[idx].id;
    }
    const wearFrac = r();
    if (!locks.has('rustAmount') && next.rustAmount !== undefined) next.rustAmount = roundNum(wearFrac * 0.85, 2);
    if (!locks.has('grimeAmount') && next.grimeAmount !== undefined) next.grimeAmount = roundNum(wearFrac * 0.9, 2);
  }

  if (scope === 'all' || scope === 'materials') {
    const palKeys = Object.keys(URBAN_PALETTES);
    const palId = !locks.has('paletteFamily')
      ? palKeys[Math.floor(r() * palKeys.length)]
      : next.paletteFamily;
    const generated = generateObjectPalette(palId, randomSeed, next.condition);
    for (const key of COMMON_MATERIAL_KEYS) {
      if (key === 'condition') continue;
      if (!locks.has(key) && generated[key] !== undefined) {
        next[key] = generated[key];
      }
    }
  }

  if (family && Array.isArray(family.schema)) {
    for (const field of family.schema) {
      if (field.group) continue;
      const key = field.key;
      if (locks.has(key)) continue;

      const matchesScope = scope === 'all'
        || (scope === 'dimensions' && field.tab === 'structure')
        || (scope === 'details' && field.tab === 'details');
      if (!matchesScope) continue;

      if (field.type === 'select' && field.options?.length) {
        next[key] = field.options[Math.floor(r() * field.options.length)][0];
      } else if (field.type === 'boolean') {
        next[key] = r() > 0.35;
      } else if (field.type === 'number' || field.type === 'range') {
        const min = field.min ?? 0;
        const max = field.max ?? 100;
        const raw = min + r() * (max - min);
        next[key] = (field.step || 0.01) >= 1 ? Math.round(raw) : roundNum(raw, 2);
      }
    }
  }

  return sanitiseObjectConfig(next);
}
