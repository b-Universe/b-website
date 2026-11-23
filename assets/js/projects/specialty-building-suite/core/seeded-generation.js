import { clamp, copy, forkRng, randBetween, randInt, pick, mixHex, roundNum } from '../utils.js';
import { VARIATION_STRENGTHS, MATERIAL_FAMILIES } from '../config.js';
import { getSpecialtyFamily, getSchemaForFamily, sanitiseSpecialtyConfig } from './registry.js';

export function createBuildingRngStreams(seed = 2026) {
  const base = (Number(seed) || 2026) >>> 0;
  return {
    base,
    structure: forkRng(base, 'structure'),
    lot: forkRng(base, 'lot'),
    materials: forkRng(base, 'materials'),
    objects: forkRng(base, 'objects'),
    decoration: forkRng(base, 'decoration')
  };
}

export function getVariationFactor(strengthId = 'subtle') {
  const found = VARIATION_STRENGTHS.find((v) => v.id === strengthId);
  return found ? found.factor : 0.28;
}

export function applySeedVariation(rawCfg, locks = new Set()) {
  const cfg = sanitiseSpecialtyConfig(rawCfg);
  const factor = getVariationFactor(cfg.variationStrength);
  if (factor <= 0.001) return cfg;

  const streams = createBuildingRngStreams(cfg.seed);
  const out = copy(cfg);
  const fam = getSpecialtyFamily(cfg.familyId);
  const minW = fam?.minWidth || 4.0;
  const maxW = fam?.maxWidth || 62.0;
  const minD = fam?.minDepth || 3.5;
  const maxD = fam?.maxDepth || 50.0;

  if (!locks.has('width')) {
    out.width = roundNum(clamp(cfg.width * (1 + (streams.structure() - 0.5) * 0.22 * factor), minW, maxW), 1);
  }
  if (!locks.has('depth')) {
    out.depth = roundNum(clamp(cfg.depth * (1 + (streams.structure() - 0.5) * 0.22 * factor), minD, maxD), 1);
  }
  if (!locks.has('floorHeight')) {
    out.floorHeight = roundNum(clamp(cfg.floorHeight + (streams.structure() - 0.5) * 0.45 * factor, 2.7, 7.2), 1);
  }
  if (!locks.has('windowDensity')) {
    out.windowDensity = roundNum(clamp(cfg.windowDensity + (streams.structure() - 0.5) * 0.28 * factor, 0.15, 0.98), 2);
  }
  if (!locks.has('parapetHeight')) {
    out.parapetHeight = roundNum(clamp(cfg.parapetHeight + (streams.structure() - 0.5) * 0.25 * factor, 0.12, 1.3), 2);
  }
  if (!locks.has('frontSetback') && cfg.includeLot) {
    out.frontSetback = roundNum(clamp(cfg.frontSetback + (streams.lot() - 0.5) * 2.2 * factor, 2.0, 22), 1);
  }
  if (!locks.has('parkingCount') && cfg.includeLot && cfg.parkingCount > 0) {
    out.parkingCount = clamp(cfg.parkingCount + Math.round((streams.lot() - 0.5) * 4 * factor), 1, fam?.maxParkingCount ?? 26);
  }
  if (!locks.has('primaryColor') && factor >= 0.45) {
    const tintTarget = streams.materials() > 0.5 ? '#e4e8ec' : '#3a4654';
    out.primaryColor = mixHex(cfg.primaryColor, tintTarget, 0.12 * factor);
  }
  if (!locks.has('secondaryColor') && factor >= 0.45) {
    const tintTarget = streams.materials() > 0.5 ? '#26466d' : '#7a3b2e';
    out.secondaryColor = mixHex(cfg.secondaryColor, tintTarget, 0.14 * factor);
  }
  if (!locks.has('outdoorObjectDensity')) {
    out.outdoorObjectDensity = roundNum(clamp(cfg.outdoorObjectDensity + (streams.objects() - 0.5) * 0.25 * factor, 0.25, 1.0), 2);
  }

  return sanitiseSpecialtyConfig(out);
}

export function randomizeSettings(rawCfg, scope = 'all', locks = new Set()) {
  const cfg = sanitiseSpecialtyConfig(rawCfg);
  const next = copy(cfg);
  const r = forkRng((cfg.seed || 2026) + Math.floor(Math.random() * 99999), scope);
  const schema = getSchemaForFamily(cfg.familyId);

  for (const field of schema) {
    if (!field.key || locks.has(field.key)) continue;
    if (field.key === 'seed' || field.key === 'exportScope' || field.key === 'lightingTime') continue;
    if (scope !== 'all' && field.tab !== scope) continue;

    if (field.type === 'range' || field.type === 'number') {
      const step = field.step || 0.1;
      const raw = randBetween(r, field.min ?? 0, field.max ?? 1);
      next[field.key] = roundNum(Math.round(raw / step) * step, 2);
    } else if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      const getOptId = (opt) => (Array.isArray(opt) ? opt[0] : opt?.id);
      if (field.key === 'lotType' && cfg.includeLot) {
        const nonEmpty = field.options.filter((opt) => getOptId(opt) !== 'none');
        next[field.key] = getOptId(pick(r, nonEmpty));
      } else {
        next[field.key] = getOptId(pick(r, field.options));
      }
    } else if (field.type === 'boolean') {
      if (field.key === 'includeBuildingLayer' || field.key === 'includeLot' || field.key === 'includeObjectsLayer') continue;
      next[field.key] = r() > 0.35;
    } else if (field.type === 'color') {
      const palette = ['#8d4c3b', '#c9d4dc', '#3b5875', '#d9a441', '#456b52', '#525a64', '#b84035', '#dfd7c8'];
      next[field.key] = pick(r, palette);
    }
  }

  if (scope === 'all' && !locks.has('exteriorMaterial')) {
    next.exteriorMaterial = pick(r, MATERIAL_FAMILIES).id;
  }

  return sanitiseSpecialtyConfig(next);
}
