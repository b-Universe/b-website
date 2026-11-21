import { clamp, copy, hashBlueprintString, pick, rng32, roundNum } from '../utils.js';
import {
  BASE,
  B_UNITS_PER_METER,
  GENERATOR_META,
  PALETTE_FAMILIES,
  PRESETS,
  sanitiseConfig
} from '../config.js';
import { RAIL_DEFAULT_CONSISTS } from './rail-archetypes.js';
import {
  TRAINSET_SCHEMA_VERSION,
  areCouplersCompatible,
  getTrackGaugeSpec
} from './compatibility.js';
import { generateVehicleBlueprint, validateVehicleBlueprint } from '../core/blueprints.js';
import { generateCoherentPalette } from '../materials/palettes.js';
import { createRailVehicle, applyRailVehiclePose } from './rail-vehicle.js';
import { createTrackRoute, solveRailUnitOnRoute, trTrackNormalizeAngle } from './track-preview.js';

export const TRAINSET_STORAGE_KEY = 'b-remastered-city-trainset-presets-v1';

function trConsistMakeUnitEntry(presetOrCfg, index = 0, options = {}) {
  const base = typeof presetOrCfg === 'string'
    ? (PRESETS[presetOrCfg] || PRESETS.freight_boxcar)
    : (presetOrCfg || PRESETS.freight_boxcar);
  const cfg = sanitiseConfig({
    ...copy(BASE),
    ...copy(base),
    ...(options.overrides || {}),
    vehicleDomain: 'rail'
  });
  return {
    unitId: options.unitId || `unit_${index + 1}_${cfg.style}`,
    preset: base.style || cfg.style,
    reversed: Boolean(options.reversed),
    config: cfg
  };
}

export function createConsistFromPreset(presetId = 'freight_manifest', seedOverride = null) {
  const def = RAIL_DEFAULT_CONSISTS[presetId] || RAIL_DEFAULT_CONSISTS.freight_manifest;
  const seed = clamp(Math.floor(Number(seedOverride) || 4012), 1, 99999999);
  const consist = {
    schemaVersion: TRAINSET_SCHEMA_VERSION,
    presetId: def.id,
    name: def.name,
    description: def.description,
    seed,
    sharedLivery: Boolean(def.sharedLivery),
    couplingGap: clamp(Number(def.couplingGap) || 0.16, 0.06, 0.65),
    sharedPalette: def.sharedPalette ? copy(def.sharedPalette) : {
      bodyPrimaryColor: '#253c59',
      bodySecondaryColor: '#c8d2dc',
      liveryStripeColor: '#25a58d'
    },
    units: (def.units || []).map((u, idx) => trConsistMakeUnitEntry(u.preset, idx, {
      reversed: u.reversed,
      overrides: { ...(u.overrides || {}), seed: seed + idx * 101 }
    }))
  };

  if (consist.sharedLivery) {
    applySharedLiveryToConsist(consist, consist.sharedPalette);
  }
  return sanitiseConsist(consist);
}

export function sanitiseConsist(raw) {
  if (!raw || typeof raw !== 'object') {
    return createConsistFromPreset('freight_manifest');
  }
  const unitsIn = Array.isArray(raw.units) && raw.units.length > 0
    ? raw.units
    : RAIL_DEFAULT_CONSISTS.freight_manifest.units.map((u, idx) => trConsistMakeUnitEntry(u.preset, idx, u));

  const units = unitsIn.slice(0, 16).map((u, idx) => {
    const rawCfg = u?.config || PRESETS[u?.preset] || PRESETS.freight_boxcar;
    const cfg = sanitiseConfig({ ...copy(rawCfg), vehicleDomain: 'rail' });
    return {
      unitId: String(u?.unitId || `unit_${idx + 1}_${cfg.style}`),
      preset: u?.preset || cfg.style,
      reversed: Boolean(u?.reversed),
      config: cfg
    };
  });

  return {
    schemaVersion: TRAINSET_SCHEMA_VERSION,
    presetId: String(raw.presetId || 'custom'),
    name: String(raw.name || 'Custom Rail Consist').slice(0, 48),
    description: String(raw.description || 'Modular railway consist formation.').slice(0, 140),
    seed: clamp(Math.floor(Number(raw.seed) || 4012), 1, 99999999),
    sharedLivery: Boolean(raw.sharedLivery),
    couplingGap: roundNum(clamp(Number(raw.couplingGap) ?? 0.16, 0.06, 0.65), 3),
    sharedPalette: {
      bodyPrimaryColor: raw.sharedPalette?.bodyPrimaryColor || units[0]?.config?.bodyPrimaryColor || '#24426b',
      bodySecondaryColor: raw.sharedPalette?.bodySecondaryColor || units[0]?.config?.bodySecondaryColor || '#1f2731',
      liveryStripeColor: raw.sharedPalette?.liveryStripeColor || units[0]?.config?.liveryStripeColor || '#eab02e'
    },
    units
  };
}

export function addConsistUnit(consist, presetId = 'freight_boxcar', insertIndex = -1) {
  const next = sanitiseConsist(consist);
  if (next.units.length >= 16) return next;
  const idx = insertIndex >= 0 && insertIndex <= next.units.length ? insertIndex : next.units.length;
  const leadGauge = next.units[0]?.config?.railTrackGauge || 'standard_1435';
  const entry = trConsistMakeUnitEntry(presetId, next.units.length, {
    unitId: `unit_${Date.now()}_${next.units.length + 1}`,
    overrides: {
      railTrackGauge: leadGauge,
      seed: next.seed + (next.units.length + 1) * 137
    }
  });
  if (next.sharedLivery && next.sharedPalette) {
    entry.config.bodyPrimaryColor = next.sharedPalette.bodyPrimaryColor;
    entry.config.bodySecondaryColor = next.sharedPalette.bodySecondaryColor;
    entry.config.liveryStripeColor = next.sharedPalette.liveryStripeColor;
  }
  next.units.splice(idx, 0, entry);
  return sanitiseConsist(next);
}

export function removeConsistUnit(consist, index) {
  const next = sanitiseConsist(consist);
  if (next.units.length <= 1 || index < 0 || index >= next.units.length) return next;
  next.units.splice(index, 1);
  return sanitiseConsist(next);
}

export function duplicateConsistUnit(consist, index) {
  const next = sanitiseConsist(consist);
  if (next.units.length >= 16 || index < 0 || index >= next.units.length) return next;
  const src = next.units[index];
  const dup = {
    unitId: `unit_${Date.now()}_dup_${next.units.length + 1}`,
    preset: src.preset,
    reversed: src.reversed,
    config: copy(src.config)
  };
  dup.config.seed = (Number(src.config.seed) || 1000) + 17;
  next.units.splice(index + 1, 0, dup);
  return sanitiseConsist(next);
}

export function reorderConsistUnit(consist, fromIndex, toIndex) {
  const next = sanitiseConsist(consist);
  if (
    fromIndex < 0 || fromIndex >= next.units.length ||
    toIndex < 0 || toIndex >= next.units.length ||
    fromIndex === toIndex
  ) {
    return next;
  }
  const [moved] = next.units.splice(fromIndex, 1);
  next.units.splice(toIndex, 0, moved);
  return sanitiseConsist(next);
}

export function reverseConsistUnit(consist, index) {
  const next = sanitiseConsist(consist);
  if (index < 0 || index >= next.units.length) return next;
  next.units[index].reversed = !next.units[index].reversed;
  return sanitiseConsist(next);
}

export function applySharedLiveryToConsist(consist, paletteOverride = null, locks = new Set()) {
  const palette = paletteOverride || consist.sharedPalette || {
    bodyPrimaryColor: consist.units[0]?.config?.bodyPrimaryColor || '#253c59',
    bodySecondaryColor: consist.units[0]?.config?.bodySecondaryColor || '#c8d2dc',
    liveryStripeColor: consist.units[0]?.config?.liveryStripeColor || '#25a58d'
  };
  consist.sharedPalette = copy(palette);
  for (const unit of consist.units || []) {
    if (!locks.has('bodyPrimaryColor')) unit.config.bodyPrimaryColor = palette.bodyPrimaryColor;
    if (!locks.has('bodySecondaryColor')) unit.config.bodySecondaryColor = palette.bodySecondaryColor;
    if (!locks.has('liveryStripeColor')) unit.config.liveryStripeColor = palette.liveryStripeColor;
    unit.config = sanitiseConfig(unit.config);
  }
  return consist;
}

export function randomizeConsistUnit(consist, index, locks = new Set(), rngFn = null) {
  const next = sanitiseConsist(consist);
  if (index < 0 || index >= next.units.length) return next;
  const unit = next.units[index];
  const r = rngFn || rng32(((Number(unit.config.seed) || 1024) + Math.floor(Math.random() * 88888)) >>> 0);
  const palFam = unit.config.bodyFamily === 'rail_passenger_coach' ? 'passenger_rail' : pick(r, ['freight_rail', 'muted_industrial', 'construction_yellow']);
  const pal = generateCoherentPalette(palFam, Math.floor(r() * 999999) + 1, unit.config.roleVariant);
  for (const [k, v] of Object.entries(pal)) {
    if (!locks.has(k)) unit.config[k] = v;
  }
  if (!locks.has('railCargoType') && unit.config.bodyFamily === 'rail_freight_flatcar') {
    unit.config.railCargoType = pick(r, ['containers_double_20', 'container_40', 'lumber_stack', 'steel_pipes', 'crates_machinery']);
  }
  if (!locks.has('railLiveryPattern')) {
    unit.config.railLiveryPattern = pick(r, ['solid', 'two_tone_stripe', 'window_band', 'single_band', 'hazard_switcher']);
  }
  unit.config.seed = Math.floor(r() * 8999999) + 1000;
  unit.config = sanitiseConfig(unit.config);
  return next;
}

export function randomizeWholeConsist(consist, locks = new Set()) {
  const seed = Math.floor(Math.random() * 8999999) + 1000;
  const r = rng32(seed);
  const count = clamp(consist?.units?.length || 4, 2, 6);
  const leadStyle = locks.has('style') ? consist.units[0]?.config?.style : pick(r, ['diesel_locomotive', 'diesel_switcher']);
  const freightPool = ['freight_boxcar', 'freight_flatcar', 'freight_tank_car', 'passenger_coach'];
  let next = sanitiseConsist({
    ...consist,
    presetId: 'custom_random',
    name: `Random Consist #${seed % 1000}`,
    seed,
    units: [
      trConsistMakeUnitEntry(leadStyle, 0, { overrides: { seed } }),
      ...Array.from({ length: count - 1 }, (_, idx) => trConsistMakeUnitEntry(pick(r, freightPool), idx + 1, {
        reversed: r() > 0.78,
        overrides: { seed: seed + (idx + 1) * 131 }
      }))
    ]
  });
  for (let i = 0; i < next.units.length; i++) {
    next = randomizeConsistUnit(next, i, locks, r);
  }
  if (next.sharedLivery) {
    const pal = generateCoherentPalette(pick(r, Object.keys(PALETTE_FAMILIES)), seed + 71, 'transit');
    applySharedLiveryToConsist(next, {
      bodyPrimaryColor: pal.bodyPrimaryColor,
      bodySecondaryColor: pal.bodySecondaryColor,
      liveryStripeColor: pal.liveryStripeColor
    }, locks);
  }
  return next;
}

export function computeConsistLayout(consist, route = null, leadS = 0) {
  const clean = sanitiseConsist(consist);
  const unitBlueprints = clean.units.map((u) => generateVehicleBlueprint(u.config));
  const placements = [];
  const couplings = [];
  let cursorFrontS = Number(leadS) || 0;

  for (let i = 0; i < clean.units.length; i++) {
    const unit = clean.units[i];
    const bp = unitBlueprints[i];
    const compat = bp.transitCompatibility;
    const bodyLen = bp.dimensions.length;
    const couplerFrontReach = Math.abs(compat.coupling.pullFaceFrontZ) - bodyLen * 0.5;
    const couplerRearReach = Math.abs(compat.coupling.pullFaceRearZ) - bodyLen * 0.5;
    const leadReach = unit.reversed ? couplerRearReach : couplerFrontReach;
    const trailReach = unit.reversed ? couplerFrontReach : couplerRearReach;

    const unitCenterS = i === 0
      ? cursorFrontS - (bodyLen * 0.5 + leadReach)
      : cursorFrontS - (bodyLen * 0.5 + leadReach);

    const trailEndS = unitCenterS - (bodyLen * 0.5 + trailReach);

    let routePose = null;
    if (route) {
      routePose = solveRailUnitOnRoute({
        dimensions: bp.dimensions,
        rail: {
          bogies: bp.pivots.bogies.map((b) => ({
            id: b.id,
            pivotZ: b.anchor.z
          }))
        }
      }, route, unitCenterS, unit.reversed);
    }

    placements.push({
      index: i,
      unitId: unit.unitId,
      style: unit.config.style,
      reversed: unit.reversed,
      centerS: roundNum(unitCenterS, 4),
      arcLengthOffsetMeters: roundNum((leadS - unitCenterS), 4),
      frontPullFaceS: roundNum(unitCenterS + bodyLen * 0.5 + leadReach, 4),
      rearPullFaceS: roundNum(trailEndS, 4),
      routePose
    });

    if (i > 0) {
      const prevUnit = clean.units[i - 1];
      const prevBp = unitBlueprints[i - 1];
      const prevCouplerType = prevUnit.reversed
        ? prevBp.transitCompatibility.coupling.frontCouplerType
        : prevBp.transitCompatibility.coupling.rearCouplerType;
      const currCouplerType = unit.reversed
        ? compat.coupling.rearCouplerType
        : compat.coupling.frontCouplerType;
      const linkCheck = areCouplersCompatible(prevCouplerType, currCouplerType);

      let relativeYawDeg = 0;
      if (routePose && placements[i - 1]?.routePose) {
        const prevTrackYaw = placements[i - 1].routePose.yaw + (prevUnit.reversed ? Math.PI : 0);
        const currTrackYaw = routePose.yaw + (unit.reversed ? Math.PI : 0);
        const diff = Math.abs(trTrackNormalizeAngle(prevTrackYaw - currTrackYaw));
        relativeYawDeg = roundNum(diff * (180 / Math.PI), 2);
      }

      couplings.push({
        index: i - 1,
        fromUnitId: prevUnit.unitId,
        toUnitId: unit.unitId,
        fromCouplerType: prevCouplerType,
        toCouplerType: currCouplerType,
        gapMeters: clean.couplingGap,
        compatible: linkCheck.compatible,
        reason: linkCheck.reason,
        relativeYawDeg,
        maxAllowedYawDeg: linkCheck.maxYawDeg,
        yawExceeded: relativeYawDeg > linkCheck.maxYawDeg
      });
    }

    cursorFrontS = trailEndS - clean.couplingGap;
  }

  const firstFrontS = placements[0]?.frontPullFaceS ?? 0;
  const lastRearS = placements[placements.length - 1]?.rearPullFaceS ?? 0;
  const totalLength = roundNum(Math.max(0, firstFrontS - lastRearS), 3);

  return {
    consist: clean,
    unitBlueprints,
    placements,
    couplings,
    totalLength
  };
}

export function validateConsist(consist, route = null) {
  const errors = [];
  const warnings = [];
  const clean = sanitiseConsist(consist);
  const solved = computeConsistLayout(clean, route, 0);
  const leadGauge = clean.units[0]?.config?.railTrackGauge || 'standard_1435';

  let totalAxles = 0;
  let poweredCount = 0;
  let maxWidth = 0;
  let maxHeight = 0;
  let tightestMinCurve = 20;

  for (let i = 0; i < clean.units.length; i++) {
    const unit = clean.units[i];
    const unitVal = validateVehicleBlueprint(unit.config);
    if (!unitVal.ok) {
      errors.push(`Unit #${i + 1} (${unit.config.style}): ${unitVal.errors.join('; ')}`);
    }
    const bp = solved.unitBlueprints[i];
    totalAxles += bp.axles?.length || 4;
    if (bp.transitCompatibility?.identity?.powered) poweredCount++;
    maxWidth = Math.max(maxWidth, bp.bounds?.meters?.width || 3.0);
    maxHeight = Math.max(maxHeight, bp.bounds?.meters?.height || 4.2);
    tightestMinCurve = Math.max(tightestMinCurve, bp.transitCompatibility?.railway?.minimumCurveRadius || 24);

    if (unit.config.railTrackGauge !== leadGauge) {
      errors.push(`Unit #${i + 1} (${unit.config.railUnitNumber}) track gauge ${unit.config.railTrackGauge} mismatches lead unit gauge ${leadGauge}`);
    }

    const pose = solved.placements[i]?.routePose;
    if (pose && route?.mode === 'rail_curved') {
      if (pose.maxBogieYawDeg > 16.5) {
        errors.push(`Unit #${i + 1} bogie yaw ${pose.maxBogieYawDeg}° exceeds safe articulation limit (16.5°) on ${route.curveRadius}m curve`);
      } else if (pose.maxBogieYawDeg > 11.5) {
        warnings.push(`Unit #${i + 1} bogie steering high (${pose.maxBogieYawDeg}°) on ${route.curveRadius}m curve`);
      }
      if (pose.endThrowMeters > 0.65) {
        warnings.push(`Unit #${i + 1} curved overhang throw is ${pose.endThrowMeters}m — check platform clearance`);
      }
    }
  }

  for (const link of solved.couplings) {
    if (!link.compatible) {
      errors.push(`Coupling #${link.index + 1} (${link.fromUnitId} -> ${link.toUnitId}): ${link.reason}`);
    }
    if (link.yawExceeded) {
      errors.push(`Coupling #${link.index + 1} articulation ${link.relativeYawDeg}° exceeds limit (${link.maxAllowedYawDeg}°)`);
    }
  }

  if (poweredCount === 0) {
    warnings.push('Consist currently has no powered locomotive unit');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      unitCount: clean.units.length,
      totalLengthMeters: solved.totalLength,
      totalLengthBUnits: roundNum(solved.totalLength * B_UNITS_PER_METER, 1),
      totalAxles,
      poweredUnits: poweredCount,
      maxWidthMeters: roundNum(maxWidth, 3),
      maxHeightMeters: roundNum(maxHeight, 3),
      trackGaugeId: leadGauge,
      trackGaugeLabel: getTrackGaugeSpec(leadGauge).label,
      minimumCurveRadiusMeters: roundNum(tightestMinCurve, 1)
    },
    solved
  };
}

export function generateConsistBlueprint(consist, options = {}) {
  const clean = sanitiseConsist(consist);
  const route = options.route || null;
  const val = validateConsist(clean, route);
  const corePayload = {
    schemaVersion: TRAINSET_SCHEMA_VERSION,
    seed: clean.seed,
    units: clean.units.map((u) => ({ style: u.config.style, reversed: u.reversed, config: u.config })),
    couplingGap: clean.couplingGap
  };
  const revHash = hashBlueprintString(JSON.stringify(corePayload));

  return {
    schemaVersion: TRAINSET_SCHEMA_VERSION,
    generator: GENERATOR_META,
    trainsetId: `trainset_${clean.presetId}_${clean.seed}_${revHash.slice(0, 10)}`,
    trainsetRevision: `rev_${revHash}`,
    name: clean.name,
    description: clean.description,
    seed: clean.seed,
    sharedLivery: clean.sharedLivery,
    sharedPalette: clean.sharedPalette,
    couplingGap: clean.couplingGap,
    summary: val.summary,
    units: clean.units.map((u, i) => ({
      index: i,
      unitId: u.unitId,
      reversed: u.reversed,
      arcLengthOffsetMeters: val.solved.placements[i]?.arcLengthOffsetMeters || 0,
      vehicleBlueprint: val.solved.unitBlueprints[i]
    })),
    couplings: val.solved.couplings,
    validation: {
      ok: val.ok,
      errors: val.errors,
      warnings: val.warnings
    }
  };
}

export function validateConsistBlueprint(input) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['Input must be a JSON object'], warnings, consist: null, blueprint: null };
  }
  if (input.schemaVersion && input.schemaVersion !== TRAINSET_SCHEMA_VERSION) {
    warnings.push(`Expected schemaVersion ${TRAINSET_SCHEMA_VERSION}, got ${input.schemaVersion}`);
  }
  if (!Array.isArray(input.units) || input.units.length === 0) {
    errors.push('Trainset blueprint missing units array');
    return { ok: false, errors, warnings, consist: null, blueprint: null };
  }

  const normalizedUnits = input.units.map((u, idx) => ({
    unitId: u.unitId || `unit_${idx + 1}`,
    preset: u.preset || u.vehicleBlueprint?.style || u.config?.style || 'freight_boxcar',
    reversed: Boolean(u.reversed),
    config: u.vehicleBlueprint?.config || u.config || PRESETS[u.preset] || PRESETS.freight_boxcar
  }));

  const clean = sanitiseConsist({
    ...input,
    units: normalizedUnits
  });
  const val = validateConsist(clean);
  const bp = generateConsistBlueprint(clean);
  return {
    ok: val.ok,
    errors: [...errors, ...val.errors],
    warnings: [...warnings, ...val.warnings],
    consist: clean,
    blueprint: bp
  };
}

export function positionConsistOnRoute(consistGroup, route, leadDistanceS = 0, wheelSpinRad = 0, doorOpenFactor = null, poseOptions = {}) {
  if (!consistGroup?.userData?.consistData) return null;
  const consist = consistGroup.userData.consistData;
  const activeRoute = route || consistGroup.userData.route || createTrackRoute({ mode: 'rail_straight' });
  const solved = computeConsistLayout(consist, activeRoute, leadDistanceS);
  const unitGroups = consistGroup.userData.unitGroups || [];

  for (let i = 0; i < unitGroups.length; i++) {
    const uGrp = unitGroups[i];
    const placement = solved.placements[i];
    if (!uGrp || !placement?.routePose) continue;
    const pose = placement.routePose;
    uGrp.rotation.order = 'YXZ';
    uGrp.position.set(pose.position[0], pose.position[1], pose.position[2]);
    uGrp.rotation.set(pose.pitchRotX, pose.yaw, 0);

    const cfg = uGrp.userData?.unitConfig || {};
    const radius = Math.max(0.3, uGrp.userData?.layout?.dimensions?.wheelRadius || 0.45);
    const localSpin = (placement.reversed ? -1 : 1) * (wheelSpinRad / (radius / 0.48));
    const doorFactor = doorOpenFactor !== null ? doorOpenFactor : clamp(cfg.railDoorsOpen ?? 0, 0, 1);

    applyRailVehiclePose(uGrp, {
      frontBogieYawRad: pose.frontBogieLocalYaw,
      rearBogieYawRad: pose.rearBogieLocalYaw,
      wheelSpinRad: localSpin,
      doorOpenFactor: doorFactor,
      pantographHeight: poseOptions.pantographHeight ?? cfg.railPantographHeight ?? 0.85,
      tramArticulationRad: pose.tramArticulationRad || 0,
      cabinSwingRad: poseOptions.cabinSwingRad ?? pose.cabinSwingRad ?? 0
    });
  }

  consistGroup.userData.lastSolved = solved;
  return solved;
}

export function createConsistMeshGroup(rawConsist, options = {}) {
  const consist = sanitiseConsist(rawConsist);
  const root = new THREE.Group();
  root.name = `Trainset_${consist.presetId}_${consist.seed}`;

  const unitGroups = consist.units.map((unit, idx) => {
    const uGrp = createRailVehicle(unit.config, options);
    uGrp.name = `Unit_${idx}_${unit.config.style}`;
    uGrp.userData.consistUnitIndex = idx;
    uGrp.userData.consistUnitId = unit.unitId;
    uGrp.userData.reversed = unit.reversed;
    root.add(uGrp);
    return uGrp;
  });

  const baseLayout = computeConsistLayout(consist, null, 0);
  const defaultLength = Math.max(96, baseLayout.totalLength * 2.5);
  const leadBf = consist.units[0]?.config?.bodyFamily;
  const defaultMode = options.trackMode || (leadBf === 'rail_straddle_monorail'
    ? 'monorail_straddle'
    : leadBf === 'rail_suspended_monorail'
      ? 'monorail_suspended'
      : 'rail_straight');
  const route = options.route || createTrackRoute({
    mode: defaultMode,
    electrified: Boolean(options.electrified),
    trackGaugeId: consist.units[0]?.config?.railTrackGauge || 'standard_1435',
    totalLength: defaultLength
  });

  const leadS = Number.isFinite(Number(options.leadS))
    ? Number(options.leadS)
    : baseLayout.totalLength * 0.5;

  root.userData.consistData = consist;
  root.userData.unitGroups = unitGroups;
  root.userData.route = route;
  root.userData.consistBlueprint = generateConsistBlueprint(consist, { route });

  positionConsistOnRoute(root, route, leadS, Number(options.wheelSpinRad) || 0, options.doorOpenFactor ?? null, options);
  return root;
}
