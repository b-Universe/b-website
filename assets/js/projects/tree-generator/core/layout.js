import { treeClamp, treeRoundNum, treeRng32 } from '../utils.js';
import { TREE_B_UNITS_PER_METER, sanitiseTreeConfig } from '../config.js';
import { getSpeciesMeta } from './species.js';

export function treeVecToBUnits(x, y, z) {
  return {
    x: treeRoundNum(x * TREE_B_UNITS_PER_METER, 2),
    y: treeRoundNum(-z * TREE_B_UNITS_PER_METER, 2),
    z: treeRoundNum(y * TREE_B_UNITS_PER_METER, 2)
  };
}

export function resolveTreeLayout(rawCfg, seedOffset = 0) {
  const cfg = sanitiseTreeConfig(rawCfg);
  const meta = getSpeciesMeta(cfg.species);
  const rng = treeRng32(cfg.seed + seedOffset * 7919);

  const vScale = seedOffset > 0 ? cfg.variation : 0;
  const height = treeClamp(cfg.height * (1 + (rng() - 0.5) * vScale * 0.7), 1.0, 24.0);
  const baseRadius = treeClamp(cfg.radius * (1 + (rng() - 0.5) * vScale * 0.5), 0.06, 2.0);
  const spread = treeClamp(cfg.spread * (1 + (rng() - 0.5) * vScale * 0.65), 0.6, 11.0);
  const curve = treeClamp(cfg.curve + (rng() - 0.5) * vScale * 0.4, 0, 1.4);
  const curveAngle = rng() * Math.PI * 2;

  // Planter or bonsai pot base offset so trunk sits naturally inside soil bed
  const planterLift = cfg.groundAttachment === 'bonsai_pot'
    ? 0.34
    : (cfg.groundAttachment === 'stone_planter' || cfg.groundAttachment === 'wood_planter' ? 0.42 : 0.0);

  let trunkRatio = 0.72;
  if (cfg.species === 'bush') trunkRatio = 0.35;
  else if (cfg.species === 'topiary') trunkRatio = 0.48;
  else if (cfg.species === 'bonsai') trunkRatio = 0.68;
  else if (cfg.species === 'palm' || cfg.species === 'banana_palm') trunkRatio = 0.90;
  else if (cfg.species === 'cypress') trunkRatio = 0.85;
  else if (cfg.species === 'redwood') trunkRatio = 0.88;
  else if (cfg.species === 'cactus') trunkRatio = 0.92;
  else if (cfg.species === 'baobab') trunkRatio = 0.76;
  else if (cfg.species === 'mangrove') trunkRatio = 0.62;
  else if (cfg.species === 'fantasy' && cfg.fantasyForm === 'mushroom') trunkRatio = 0.74;

  const trunkHeight = Math.max(0.55, height * trunkRatio);
  const topRadius = Math.max(0.035, baseRadius * (1.0 - cfg.taper * 0.85));
  const stiltLift = cfg.species === 'mangrove' ? Math.min(1.6, height * 0.22) : 0.0;
  const trunkStartY = planterLift + stiltLift;

  const bendX = Math.cos(curveAngle) * curve * trunkHeight * 0.35;
  const bendZ = Math.sin(curveAngle) * curve * trunkHeight * 0.35;

  const evalTrunkPoint = (t) => {
    const tt = treeClamp(t, 0, 1);
    const bend = Math.pow(tt, 1.65) * curve * trunkHeight * 0.35;
    return {
      x: Math.cos(curveAngle) * bend,
      y: trunkStartY + tt * trunkHeight,
      z: Math.sin(curveAngle) * bend
    };
  };

  const trunkTop = evalTrunkPoint(1);
  const rootFlareMultiplier = 1.0 + cfg.rootFlare * 0.55;
  const rootBaseRadius = baseRadius * rootFlareMultiplier;

  // Canopy Envelope Estimation
  const isFoliageFree = cfg.species === 'dead';
  const canopyRadius = isFoliageFree
    ? Math.max(baseRadius * 1.8, spread * 0.48)
    : Math.max(0.65, spread * 0.58 + cfg.clusterSize * 0.32);

  const crownBaseY = cfg.species === 'bush'
    ? planterLift + 0.1
    : (cfg.species === 'pine' || cfg.species === 'cypress'
      ? trunkStartY + height * 0.22
      : trunkStartY + trunkHeight * cfg.branchStartRatio);

  const crownTopY = isFoliageFree
    ? trunkTop.y + height * 0.22
    : Math.max(trunkTop.y + cfg.clusterSize * cfg.canopyHeight * 0.7, height + planterLift + 0.35);

  const totalHeight = Math.max(crownTopY, trunkTop.y + 0.4);
  const halfExtentXZ = Math.max(canopyRadius, rootBaseRadius + 0.3, Math.abs(bendX) + canopyRadius * 0.65, Math.abs(bendZ) + canopyRadius * 0.65);

  const planterRadius = cfg.groundAttachment === 'bonsai_pot'
    ? Math.max(0.75, spread * 0.42)
    : (cfg.groundAttachment !== 'natural' ? Math.max(0.95, baseRadius * 2.2) : rootBaseRadius);

  const rootCount = cfg.rootStyle === 'none'
    ? 0
    : (cfg.rootStyle === 'stilt' ? 6 : Math.max(3, Math.min(8, Math.round(3 + cfg.rootFlare * 4))));

  // Branch anchor schedule
  const branchAnchors = [];
  for (let b = 0; b < cfg.branches; b++) {
    const frac = cfg.branches <= 1 ? 0.5 : b / (cfg.branches - 1);
    const t = treeClamp(cfg.branchStartRatio + frac * (0.94 - cfg.branchStartRatio), 0.25, 0.96);
    const origin = evalTrunkPoint(t);
    const angle = (b * 2.399963) + (rng() - 0.5) * 0.45;
    branchAnchors.push({
      index: b,
      t: treeRoundNum(t, 3),
      angle: treeRoundNum(angle, 4),
      origin: {
        x: treeRoundNum(origin.x, 3),
        y: treeRoundNum(origin.y, 3),
        z: treeRoundNum(origin.z, 3)
      }
    });
  }

  // Interaction & gameplay collider radii
  const trunkColliderRadius = treeRoundNum(Math.max(0.18, baseRadius * 1.05), 3);
  const trunkColliderHeight = treeRoundNum(Math.max(1.2, Math.min(trunkHeight + trunkStartY, 4.2)), 3);
  const harvestRingRadius = treeRoundNum(Math.max(trunkColliderRadius + 0.85, Math.min(2.6, baseRadius * 2.4 + 0.75)), 3);
  const shadeRadius = treeRoundNum(canopyRadius * 0.92, 3);

  const boundsMeters = {
    minX: treeRoundNum(-halfExtentXZ, 3),
    maxX: treeRoundNum(halfExtentXZ, 3),
    minY: 0,
    maxY: treeRoundNum(totalHeight, 3),
    minZ: treeRoundNum(-halfExtentXZ, 3),
    maxZ: treeRoundNum(halfExtentXZ, 3),
    width: treeRoundNum(halfExtentXZ * 2, 3),
    length: treeRoundNum(halfExtentXZ * 2, 3),
    height: treeRoundNum(totalHeight, 3)
  };

  return {
    species: cfg.species,
    category: meta.category,
    curveAngle,
    planterLift,
    stiltLift,
    trunkStartY,
    trunkHeight,
    baseRadius,
    topRadius,
    rootBaseRadius,
    planterRadius,
    rootCount,
    trunkTop,
    crownBaseY,
    crownTopY,
    canopyRadius,
    totalHeight,
    branchAnchors,
    bounds: {
      meters: boundsMeters,
      bGameUnits: {
        unitsPerMeter: TREE_B_UNITS_PER_METER,
        width: treeRoundNum(boundsMeters.width * TREE_B_UNITS_PER_METER, 1),
        length: treeRoundNum(boundsMeters.length * TREE_B_UNITS_PER_METER, 1),
        height: treeRoundNum(boundsMeters.height * TREE_B_UNITS_PER_METER, 1),
        min: treeVecToBUnits(boundsMeters.minX, boundsMeters.minY, boundsMeters.maxZ),
        max: treeVecToBUnits(boundsMeters.maxX, boundsMeters.maxY, boundsMeters.minZ)
      }
    },
    collisionBounds: {
      trunkCylinder: {
        center: {
          x: treeRoundNum(bendX * 0.25, 3),
          y: treeRoundNum(trunkColliderHeight * 0.5, 3),
          z: treeRoundNum(bendZ * 0.25, 3)
        },
        radius: trunkColliderRadius,
        height: trunkColliderHeight,
        passable: cfg.species === 'bush' && height < 1.8
      },
      canopyBox: {
        center: {
          x: treeRoundNum(bendX * 0.75, 3),
          y: treeRoundNum((crownBaseY + totalHeight) * 0.5, 3),
          z: treeRoundNum(bendZ * 0.75, 3)
        },
        size: {
          x: treeRoundNum(canopyRadius * 2, 3),
          y: treeRoundNum(Math.max(0.5, totalHeight - crownBaseY), 3),
          z: treeRoundNum(canopyRadius * 2, 3)
        }
      },
      baseFootprint: {
        radius: treeRoundNum(Math.max(rootBaseRadius, planterRadius), 3),
        width: treeRoundNum(Math.max(rootBaseRadius, planterRadius) * 2, 3),
        length: treeRoundNum(Math.max(rootBaseRadius, planterRadius) * 2, 3)
      }
    },
    interaction: {
      harvestable: cfg.species !== 'topiary' && cfg.species !== 'bonsai',
      woodcuttingTier: cfg.species === 'redwood' || cfg.species === 'yew' || cfg.species === 'fantasy' ? 'high' : (cfg.species === 'bush' ? 'forage' : 'standard'),
      harvestRingRadius,
      shadeRadius,
      approachPositions: [
        { x: treeRoundNum(harvestRingRadius, 3), y: 0, z: 0 },
        { x: treeRoundNum(-harvestRingRadius, 3), y: 0, z: 0 },
        { x: 0, y: 0, z: treeRoundNum(harvestRingRadius, 3) },
        { x: 0, y: 0, z: treeRoundNum(-harvestRingRadius, 3) }
      ]
    },
    windProfile: {
      swayFrequency: cfg.species === 'bamboo' || cfg.species === 'palm' ? 1.45 : (cfg.species === 'redwood' ? 0.65 : 1.05),
      swayAmplitude: treeRoundNum(cfg.windStrength * (cfg.species === 'dead' ? 0.15 : 1.0), 3),
      stiffness: treeRoundNum(treeClamp(baseRadius / Math.max(1, height * 0.12), 0.2, 2.5), 3)
    }
  };
}
