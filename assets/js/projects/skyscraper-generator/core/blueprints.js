import { roundNum, clamp } from '../utils.js';
import {
  BLUEPRINT_SCHEMA_VERSION,
  B_UNITS_PER_METER,
  GENERATOR_META,
  OPTIONS,
  getStyle,
  sanitiseConfig
} from '../config.js';
import { resolveTowerComplex } from './towers.js';
import { computeSkyscraperEntrances } from './entrances.js';

function bpEstimateCrownHeight(cfg) {
  const crownStyle = cfg.crownStyle || 'flat';
  const crownH = clamp(Number(cfg.crownHeight) || 0, 0, 36);
  const spireH = cfg.spireStyle && cfg.spireStyle !== 'none'
    ? clamp(Number(cfg.spireHeight) || 0, 0, 80) + 0.7
    : 0;
  let effectiveCrown = 0;
  if (crownStyle === 'flat') effectiveCrown = Math.min(2.6, Math.max(0.85, crownH * 0.25));
  else if (crownStyle === 'slanted') effectiveCrown = crownH * 1.42;
  else if (crownStyle === 'domed') effectiveCrown = crownH + 2.2;
  else effectiveCrown = crownH;
  return {
    crownHeight: roundNum(effectiveCrown, 3),
    spireHeight: roundNum(spireH, 3),
    totalAddition: roundNum(effectiveCrown + spireH, 3)
  };
}

function bpVecToBUnits(x, y, z) {
  return {
    x: roundNum(x * B_UNITS_PER_METER, 2),
    y: roundNum(-z * B_UNITS_PER_METER, 2),
    z: roundNum(y * B_UNITS_PER_METER, 2)
  };
}

export function computeSkyscraperBounds(cfg, complex, entrances = [], crownMetrics = null) {
  const fb = complex.footprintBounds;
  const est = bpEstimateCrownHeight(cfg);
  const roofBaseY = complex.maxTowerHeight;
  const crownTopY = crownMetrics ? crownMetrics.crownTopY : roundNum(roofBaseY + est.crownHeight, 3);
  const spireTopY = crownMetrics ? crownMetrics.topY : roundNum(roofBaseY + est.totalAddition, 3);
  const plazaW = complex.plaza.enabled ? complex.plaza.width : fb.width;
  const plazaD = complex.plaza.enabled ? complex.plaza.depth : fb.depth;

  return {
    meters: {
      minX: fb.minX,
      maxX: fb.maxX,
      minZ: fb.minZ,
      maxZ: fb.maxZ,
      width: fb.width,
      depth: fb.depth,
      roofBaseY: roundNum(roofBaseY, 3),
      crownTopY: roundNum(crownTopY, 3),
      spireTopY: roundNum(spireTopY, 3),
      height: roundNum(spireTopY, 3),
      plazaWidth: plazaW,
      plazaDepth: plazaD
    },
    bGameUnits: {
      unitsPerMeter: B_UNITS_PER_METER,
      width: roundNum(fb.width * B_UNITS_PER_METER, 1),
      depth: roundNum(fb.depth * B_UNITS_PER_METER, 1),
      height: roundNum(spireTopY * B_UNITS_PER_METER, 1),
      plazaWidth: roundNum(plazaW * B_UNITS_PER_METER, 1),
      plazaDepth: roundNum(plazaD * B_UNITS_PER_METER, 1),
      min: bpVecToBUnits(fb.minX, 0, fb.maxZ),
      max: bpVecToBUnits(fb.maxX, spireTopY, fb.minZ)
    },
    totalFloors: complex.totalFloors,
    maxTowerFloors: complex.maxSingleTowerFloors || complex.totalFloors,
    towerCount: complex.towers.length,
    entranceCount: entrances.length
  };
}

export function generateSkyscraperBlueprint(rawCfg, options = {}) {
  const cfg = sanitiseConfig(rawCfg);
  const complex = options.complex || resolveTowerComplex(cfg);
  const entrances = options.entrances || computeSkyscraperEntrances(cfg, complex);
  const bounds = computeSkyscraperBounds(cfg, complex, entrances, options.crownMetrics || null);
  const styleDesc = getStyle(cfg.style);

  return {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    generator: GENERATOR_META,
    seed: cfg.seed,
    style: cfg.style,
    styleLabel: styleDesc.label,
    config: cfg,
    bounds,
    towers: complex.towers.map((t) => ({
      index: t.index,
      position: { x: t.x, y: 0, z: t.z },
      rotDeg: t.rotDeg,
      mirrorX: t.mirrorX,
      totalFloors: t.stack.totalFloors,
      totalHeight: t.stack.totalHeight,
      bounds: t.bounds,
      sections: t.stack.sections.map((s) => ({
        id: s.id,
        role: s.role,
        label: s.label,
        floors: s.floors,
        startFloor: s.startFloor,
        endFloor: s.endFloor,
        floorHeight: s.floorHeight,
        height: s.height,
        baseElevation: s.baseElevation,
        topElevation: s.topElevation,
        width: s.width,
        depth: s.depth,
        footprint: s.footprint,
        cornerTreatment: s.cornerTreatment,
        facadeStyle: s.facadeStyle,
        windowPattern: s.windowPattern,
        materialRole: s.materialRole,
        taperX: s.taperX,
        taperZ: s.taperZ,
        twistDeg: s.twistDeg,
        flareBase: s.flareBase,
        slantedTopDeg: s.slantedTopDeg,
        diagonalBrace: s.diagonalBrace,
        transitionMode: s.transitionMode,
        transitionDiagnostics: s.transitionDiagnostics
      })),
      diagnostics: t.stack.diagnostics
    })),
    skybridges: complex.skybridges,
    trusses: complex.trusses,
    entrances,
    ground: {
      plaza: complex.plaza,
      podium: complex.podium,
      entranceStyle: cfg.entranceStyle,
      monumentalStairs: cfg.monumentalStairs,
      exteriorColumns: cfg.exteriorColumns,
      retailStorefronts: cfg.retailStorefronts,
      loadingBay: cfg.loadingBay,
      parkingEntrance: cfg.parkingEntrance,
      signEnabled: cfg.signEnabled,
      signText: cfg.signText
    },
    roof: {
      crownStyle: cfg.crownStyle,
      crownHeight: cfg.crownHeight,
      crownSteps: cfg.crownSteps,
      crownCurvature: cfg.crownCurvature,
      spireStyle: cfg.spireStyle,
      spireHeight: cfg.spireHeight,
      antennaMasts: cfg.antennaMasts,
      commArrays: cfg.commArrays,
      mechPenthouse: cfg.mechPenthouse,
      waterTanks: cfg.waterTanks,
      hvacUnits: cfg.hvacUnits,
      helipad: cfg.helipad,
      crownLighting: cfg.crownLighting
    },
    lighting: {
      lightingTime: cfg.lightingTime,
      litWindowRatio: cfg.litWindowRatio,
      warmCoolBalance: cfg.warmCoolBalance,
      occupiedFloorGrouping: cfg.occupiedFloorGrouping,
      darkFloorChance: cfg.darkFloorChance,
      lightingSeed: cfg.lightingSeed
    },
    geometryStats: options.geometryStats || null
  };
}

export function validateSkyscraperBlueprint(input) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['Input Must Be A Json Object'], warnings, config: null, blueprint: null };
  }

  let rawCfg = input;
  if (input.schemaVersion) {
    if (input.schemaVersion !== BLUEPRINT_SCHEMA_VERSION) {
      warnings.push(`Expected schemaVersion ${BLUEPRINT_SCHEMA_VERSION}, got ${input.schemaVersion}`);
    }
    if (!input.config || typeof input.config !== 'object') {
      errors.push('Blueprint Object Missing config Field');
    } else {
      rawCfg = input.config;
    }
  }

  if (rawCfg.footprint && !OPTIONS.footprint.some(([id]) => id === rawCfg.footprint)) {
    warnings.push(`Unrecognised footprint "${rawCfg.footprint}", clamped to default`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, config: null, blueprint: null };
  }

  const cleanCfg = sanitiseConfig(rawCfg);
  const bp = generateSkyscraperBlueprint(cleanCfg);

  if (!bp.towers || bp.towers.length === 0) {
    errors.push('Tower Complex Produced Zero Towers');
  }
  for (const sb of bp.skybridges) {
    if (sb.spanLength <= 0.5 || sb.elevationY <= 0) {
      errors.push(`Invalid Skybridge ${sb.id}`);
    }
  }
  for (const t of bp.towers || []) {
    if (t.diagnostics && t.diagnostics.verticalGapCount > 0) {
      errors.push(`Tower ${t.index} Detected ${t.diagnostics.verticalGapCount} Vertical Section Gap(s)`);
    }
    for (const w of t.diagnostics?.warnings || []) {
      warnings.push(w);
    }
  }
  if (bp.entrances.length === 0) {
    warnings.push('No Ground Entrances Defined');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    config: cleanCfg,
    blueprint: bp
  };
}
