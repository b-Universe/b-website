import { roundNum, hashBlueprintString } from '../utils.js';
import {
  BLUEPRINT_SCHEMA_VERSION,
  B_UNITS_PER_METER,
  GENERATOR_META,
  OPTIONS,
  getStyle,
  sanitiseConfig
} from '../config.js';
import { resolveVehicleLayout } from './layout.js';

function bpVecToBUnits(x, y, z) {
  return {
    x: roundNum(x * B_UNITS_PER_METER, 2),
    y: roundNum(-z * B_UNITS_PER_METER, 2),
    z: roundNum(y * B_UNITS_PER_METER, 2)
  };
}

export function computeVehicleBounds(cfg, layout) {
  const d = layout.dimensions;
  if (layout.rail) {
    const rail = layout.rail;
    const maxHalfW = roundNum(Math.max(d.halfWidth + (cfg.railHandrails ? 0.08 : 0.02), rail.gauge.railCenterHalfX + 0.25), 4);
    const topY = roundNum(rail.maxHeightWithEquipment, 4);
    const minZ = roundNum(rail.couplers.rearPullFaceZ, 4);
    const maxZ = roundNum(rail.couplers.frontPullFaceZ, 4);
    const totalWidth = roundNum(maxHalfW * 2, 4);
    const totalLength = roundNum(maxZ - minZ, 4);
    const padW = roundNum(Math.max(rail.gauge.sleeperWidth, totalWidth + 0.4), 3);
    const padL = roundNum(totalLength + 0.5, 3);

    return {
      meters: {
        minX: -maxHalfW,
        maxX: maxHalfW,
        minY: 0,
        maxY: topY,
        minZ,
        maxZ,
        width: totalWidth,
        length: totalLength,
        height: topY
      },
      bGameUnits: {
        unitsPerMeter: B_UNITS_PER_METER,
        width: roundNum(totalWidth * B_UNITS_PER_METER, 1),
        length: roundNum(totalLength * B_UNITS_PER_METER, 1),
        height: roundNum(topY * B_UNITS_PER_METER, 1),
        min: bpVecToBUnits(-maxHalfW, 0, maxZ),
        max: bpVecToBUnits(maxHalfW, topY, minZ)
      },
      parkingFootprint: {
        meters: { width: padW, length: padL },
        bGameUnits: {
          width: roundNum(padW * B_UNITS_PER_METER, 1),
          length: roundNum(padL * B_UNITS_PER_METER, 1)
        }
      },
      collisionBounds: {
        compositeBox: {
          center: { x: 0, y: roundNum(topY * 0.5, 4), z: roundNum((minZ + maxZ) * 0.5, 4) },
          size: { x: totalWidth, y: topY, z: totalLength }
        },
        lowerHullBox: {
          center: { x: 0, y: roundNum(rail.zones.deckY * 0.5, 4), z: 0 },
          size: { x: d.width, y: roundNum(rail.zones.deckY, 4), z: d.length }
        },
        upperCabinBox: {
          center: { x: 0, y: roundNum((rail.zones.deckY + d.height) * 0.5, 4), z: 0 },
          size: { x: d.width, y: roundNum(d.height - rail.zones.deckY, 4), z: d.length }
        },
        cargoBox: {
          center: { x: 0, y: roundNum((rail.zones.deckY + d.height) * 0.5, 4), z: 0 },
          size: { x: d.width, y: roundNum(d.height - rail.zones.deckY, 4), z: d.length }
        },
        wheels: layout.axles.flatMap((axle) => ([
          {
            id: `${axle.id}_left`,
            center: { x: -axle.wheelCenterX, y: d.wheelRadius, z: axle.z },
            radius: d.wheelRadius,
            width: d.wheelThickness
          },
          {
            id: `${axle.id}_right`,
            center: { x: axle.wheelCenterX, y: d.wheelRadius, z: axle.z },
            radius: d.wheelRadius,
            width: d.wheelThickness
          }
        ]))
      }
    };
  }

  const maxHalfW = roundNum(
    Math.max(
      d.halfWidth + cfg.fenderFlare,
      d.trackWidth * 0.5 + d.wheelThickness * (cfg.dualRearWheels ? 0.65 : 0.52)
    ),
    4
  );
  const accessoryExtraH = (cfg.lightBar !== 'none' ? 0.16 : 0) +
    (cfg.taxiSign ? 0.18 : 0) +
    (cfg.roofRack === 'ice_cream_cone'
      ? 0.78
      : cfg.roofRack === 'fire_ladder'
        ? 0.48
        : (cfg.roofRack !== 'none' ? 0.22 : 0));
  const topY = roundNum(Math.max(d.height, d.cargoRoofTopY) + accessoryExtraH, 4);
  const rearExtra = cfg.rearAttachment === 'compactor_hopper'
    ? 0.62
    : cfg.rearAttachment === 'mixer_chute'
      ? 0.5
      : (cfg.rearAttachment !== 'none' ? 0.16 : 0.06);
  const frontExtra = cfg.frontAttachment === 'loader_bucket'
    ? 0.88
    : cfg.frontAttachment === 'sweeper_brushes'
      ? 0.48
      : (cfg.frontAttachment !== 'none' ? 0.18 : 0.06);
  const minZ = roundNum(-d.length * 0.5 - rearExtra, 4);
  const maxZ = roundNum(d.length * 0.5 + frontExtra, 4);

  const totalWidth = roundNum(maxHalfW * 2, 4);
  const totalLength = roundNum(maxZ - minZ, 4);

  const parkingPadW = roundNum(Math.max(2.3, totalWidth + 0.48), 3);
  const parkingPadL = roundNum(Math.max(4.4, totalLength + 0.65), 3);

  const cabSec = layout.sections.cabin;
  const rearSec = layout.sections.rear;

  return {
    meters: {
      minX: -maxHalfW,
      maxX: maxHalfW,
      minY: 0,
      maxY: topY,
      minZ,
      maxZ,
      width: totalWidth,
      length: totalLength,
      height: topY
    },
    bGameUnits: {
      unitsPerMeter: B_UNITS_PER_METER,
      width: roundNum(totalWidth * B_UNITS_PER_METER, 1),
      length: roundNum(totalLength * B_UNITS_PER_METER, 1),
      height: roundNum(topY * B_UNITS_PER_METER, 1),
      min: bpVecToBUnits(-maxHalfW, 0, maxZ),
      max: bpVecToBUnits(maxHalfW, topY, minZ)
    },
    parkingFootprint: {
      meters: { width: parkingPadW, length: parkingPadL },
      bGameUnits: {
        width: roundNum(parkingPadW * B_UNITS_PER_METER, 1),
        length: roundNum(parkingPadL * B_UNITS_PER_METER, 1)
      }
    },
    collisionBounds: {
      compositeBox: {
        center: { x: 0, y: roundNum(topY * 0.5, 4), z: roundNum((minZ + maxZ) * 0.5, 4) },
        size: { x: totalWidth, y: topY, z: totalLength }
      },
      lowerHullBox: {
        center: { x: 0, y: roundNum((d.groundClearance + d.beltY) * 0.5, 4), z: 0 },
        size: { x: d.width, y: roundNum(d.beltY - d.groundClearance, 4), z: d.length }
      },
      upperCabinBox: {
        center: {
          x: 0,
          y: roundNum((d.beltY + d.height) * 0.5, 4),
          z: roundNum((cabSec.greenhouseBottomStartZ + cabSec.endZ) * 0.5, 4)
        },
        size: {
          x: roundNum(d.width * d.roofWidthRatio, 4),
          y: d.greenhouseHeight,
          z: roundNum(cabSec.endZ - cabSec.greenhouseBottomStartZ, 4)
        }
      },
      cargoBox: {
        center: {
          x: 0,
          y: roundNum((d.groundClearance + d.cargoRoofTopY) * 0.5, 4),
          z: roundNum((rearSec.startZ + rearSec.endZ) * 0.5, 4)
        },
        size: {
          x: d.width,
          y: roundNum(d.cargoRoofTopY - d.groundClearance, 4),
          z: rearSec.length
        }
      },
      wheels: layout.axles.flatMap((axle) => ([
        {
          id: `${axle.id}_left`,
          center: { x: -axle.wheelCenterX, y: d.wheelRadius, z: axle.z },
          radius: d.wheelRadius,
          width: d.wheelThickness
        },
        {
          id: `${axle.id}_right`,
          center: { x: axle.wheelCenterX, y: d.wheelRadius, z: axle.z },
          radius: d.wheelRadius,
          width: d.wheelThickness
        }
      ]))
    }
  };
}

export function generateVehicleBlueprint(rawCfg, options = {}) {
  const cfg = sanitiseConfig(rawCfg);
  const layout = options.layout || resolveVehicleLayout(cfg);
  const bounds = computeVehicleBounds(cfg, layout);
  const arch = getStyle(cfg.style);

  const accessorySet = [];
  if (cfg.taxiSign) accessorySet.push('taxi_sign');
  if (cfg.lightBar !== 'none') accessorySet.push(`light_bar:${cfg.lightBar}`);
  if (cfg.roofRack !== 'none') accessorySet.push(`roof_rack:${cfg.roofRack}`);
  if (cfg.frontAttachment !== 'none') accessorySet.push(`front:${cfg.frontAttachment}`);
  if (cfg.rearAttachment !== 'none') accessorySet.push(`rear:${cfg.rearAttachment}`);
  if (cfg.sideUtility !== 'none') accessorySet.push(`side:${cfg.sideUtility}`);
  if (cfg.busRouteSign) accessorySet.push('bus_route_sign');

  const corePayload = {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    style: cfg.style,
    seed: cfg.seed,
    config: cfg
  };
  const revHash = hashBlueprintString(JSON.stringify(corePayload));
  const templateId = `veh_tpl_${cfg.style}_${cfg.seed}_${revHash.slice(0, 12)}`;
  const templateRevision = `rev_${revHash}`;

  return {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    generator: GENERATOR_META,
    templateId,
    templateRevision,
    seed: cfg.seed,
    style: cfg.style,
    archetype: cfg.style,
    archetypeLabel: arch.label,
    vehicleDomain: layout.rail ? 'rail' : 'road',
    usageVariant: cfg.roleVariant,
    dimensions: layout.dimensions,
    wheelbase: layout.dimensions.wheelbase,
    axles: layout.axles,
    bodyStyle: {
      bodyFamily: cfg.bodyFamily,
      silhouetteFamily: cfg.silhouetteFamily,
      rooflineStyle: cfg.rooflineStyle,
      boxiness: layout.dimensions.boxiness,
      cabCargoSeparation: layout.sections.gap.length
    },
    sections: layout.sections,
    doorsAndWindows: {
      doorLayout: cfg.doorLayout,
      slidingDoor: cfg.slidingDoor,
      busDoorPlacement: cfg.busDoorPlacement,
      busDoors: layout.busDoors,
      rearCargoDoor: cfg.rearCargoDoor,
      sideWindowSegmentation: cfg.sideWindowSegmentation,
      busWindowBays: cfg.busWindowBays,
      vanPartialWindows: cfg.vanPartialWindows,
      windowTint: cfg.windowTint
    },
    accessorySet,
    materials: {
      paletteFamily: cfg.paletteFamily,
      wearLevel: cfg.wearLevel,
      primary: { material: cfg.bodyPrimaryMaterial, color: cfg.bodyPrimaryColor },
      secondary: { material: cfg.bodySecondaryMaterial, color: cfg.bodySecondaryColor },
      trim: { material: cfg.trimMaterial, color: cfg.trimColor },
      bumper: { material: cfg.bumperMaterial, color: cfg.bumperColor },
      rim: { material: cfg.wheelRimMaterial, color: cfg.wheelRimColor },
      tire: { material: cfg.tireMaterial, color: cfg.tireColor },
      glass: { material: cfg.glassMaterial, color: cfg.glassColor },
      utility: { material: cfg.utilityMaterial, color: cfg.utilityColor },
      liveryStripeColor: cfg.liveryStripeColor
    },
    parkingFootprint: bounds.parkingFootprint,
    collisionBounds: bounds.collisionBounds,
    bounds: {
      meters: bounds.meters,
      bGameUnits: bounds.bGameUnits
    },
    validation: layout.validation,
    transitCompatibility: layout.rail ? layout.rail.compatibility : null,
    pivots: layout.rail ? layout.rail.pivots : null,
    config: cfg,
    geometryStats: options.geometryStats || null
  };
}

export function validateVehicleBlueprint(input) {
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

  if (rawCfg.bodyFamily && !OPTIONS.bodyFamily.some(([id]) => id === rawCfg.bodyFamily)) {
    warnings.push(`Unrecognised bodyFamily "${rawCfg.bodyFamily}", clamped to archetype default`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, config: null, blueprint: null };
  }

  const cleanCfg = sanitiseConfig(rawCfg);
  const bp = generateVehicleBlueprint(cleanCfg);

  if (!bp.axles || bp.axles.length < 2) {
    errors.push('Vehicle Layout Produced Fewer Than 2 Axles');
  }
  if (bp.sections.rear.length <= 0 || bp.sections.cabin.length <= 0 || bp.sections.hood.length <= 0) {
    errors.push('Vehicle Layout Produced Non-Positive Section Length');
  }
  if (bp.dimensions.wheelRadius * 2 >= bp.dimensions.wheelArchTopY) {
    errors.push('Wheel Radius Exceeds Wheel Arch Clearance');
  }
  for (const w of bp.validation?.warnings || []) {
    warnings.push(w);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    config: cleanCfg,
    blueprint: bp
  };
}
