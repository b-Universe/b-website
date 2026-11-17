import { clamp, roundNum } from '../utils.js';
import { registerAnchor, registerLaneClearance } from './placement-anchors.js';

export function computeLotLayout(cfg, buildingBox, placementCtx = null, options = {}) {
  const enabled = Boolean(cfg.includeLot && cfg.lotType !== 'none');
  const bw = buildingBox?.width || cfg.width;
  const bd = buildingBox?.depth || cfg.depth;

  if (!enabled) {
    return {
      enabled: false,
      lotType: 'none',
      bounds: {
        minX: roundNum(-bw * 0.5, 4),
        maxX: roundNum(bw * 0.5, 4),
        minZ: roundNum(-bd * 0.5, 4),
        maxZ: roundNum(bd * 0.5, 4),
        width: roundNum(bw, 4),
        depth: roundNum(bd, 4)
      },
      sidewalks: [],
      driveways: [],
      parkingStalls: [],
      landscapingBeds: [],
      fences: [],
      patio: null,
      serviceYard: null,
      loadingApron: null
    };
  }

  const frontPad = clamp(cfg.frontSetback || 6.0, 1.8, 24.0);
  const sidePad = clamp(cfg.sideSetback || 3.5, 1.2, 18.0);
  const rearPad = clamp(options.rearMargin ?? (cfg.serviceAccess ? 4.8 : 2.8), 1.5, 18.0);

  const lotW = Math.max(cfg.lotWidth || (bw + sidePad * 2), bw + sidePad * 2);
  const lotD = Math.max(cfg.lotDepth || (bd + frontPad + rearPad), bd + frontPad + rearPad);

  const halfW = lotW * 0.5;
  // Center building along X, offset along Z so frontSetback is in +Z
  const bldgCenterZ = -lotD * 0.5 + rearPad + bd * 0.5;
  const lotMinZ = bldgCenterZ - bd * 0.5 - rearPad;
  const lotMaxZ = bldgCenterZ + bd * 0.5 + frontPad;
  const actualLotD = lotMaxZ - lotMinZ;

  // Keep building centered at origin and offset lot around it
  const minX = -halfW;
  const maxX = halfW;
  const minZ = -bd * 0.5 - rearPad;
  const maxZ = bd * 0.5 + frontPad;

  const isCivic = cfg.lotType === 'civic_plaza';
  const isIndustrial = cfg.lotType === 'industrial_service' || cfg.lotType === 'multi_building_facility';
  const isUrban = cfg.lotType === 'compact_urban';
  const surfaceKind = isCivic ? 'plaza_stone' : isUrban ? 'concrete' : 'asphalt';

  // Sidewalks
  const sidewalks = [];
  const swW = isCivic ? 3.2 : 2.4;
  if (cfg.sidewalkConfig !== 'none') {
    sidewalks.push({
      id: 'sw_front',
      x: 0,
      z: maxZ - swW * 0.5,
      width: lotW,
      depth: swW,
      y: 0.08
    });
    if (cfg.cornerLot || cfg.sidewalkConfig === 'corner_wrap' || cfg.sidewalkConfig === 'full_perimeter') {
      sidewalks.push({
        id: 'sw_right',
        x: maxX - swW * 0.5,
        z: (minZ + maxZ) * 0.5,
        width: swW,
        depth: actualLotD,
        y: 0.08
      });
    }
    if (cfg.sidewalkConfig === 'full_perimeter') {
      sidewalks.push({
        id: 'sw_left',
        x: minX + swW * 0.5,
        z: (minZ + maxZ) * 0.5,
        width: swW,
        depth: actualLotD,
        y: 0.08
      });
    }
  }

  // Driveways & circulation lanes
  const driveways = [];
  const dw = isIndustrial ? 5.2 : 4.2;
  if (cfg.drivewayPlacement === 'dual' || cfg.drivewayPlacement === 'left') {
    const dx = minX + Math.min(sidePad * 0.75 + 2.2, lotW * 0.25);
    driveways.push({
      id: 'driveway_left',
      x: dx,
      z: maxZ - swW * 0.5,
      width: dw,
      depth: swW + 0.4
    });
    if (placementCtx) {
      registerLaneClearance(placementCtx, {
        id: 'lane_left_entry',
        kind: 'driveway',
        minX: dx - dw * 0.55,
        maxX: dx + dw * 0.55,
        minZ: bd * 0.5 + 0.5,
        maxZ: maxZ
      });
    }
  }
  if (cfg.drivewayPlacement === 'dual' || cfg.drivewayPlacement === 'right') {
    const dx = maxX - Math.min(sidePad * 0.75 + 2.2, lotW * 0.25);
    driveways.push({
      id: 'driveway_right',
      x: dx,
      z: maxZ - swW * 0.5,
      width: dw,
      depth: swW + 0.4
    });
    if (placementCtx) {
      registerLaneClearance(placementCtx, {
        id: 'lane_right_entry',
        kind: 'driveway',
        minX: dx - dw * 0.55,
        maxX: dx + dw * 0.55,
        minZ: bd * 0.5 + 0.5,
        maxZ: maxZ
      });
    }
  }

  // Parking stalls
  const parkingStalls = [];
  const requestedStalls = cfg.includeParking && cfg.parkingConfig !== 'none' ? (cfg.parkingCount || 0) : 0;
  const stallW = 2.6;
  const stallD = 5.0;

  if (requestedStalls > 0 && !isUrban) {
    if (cfg.parkingConfig === 'side_lot' || (cfg.parkingConfig === 'wrap_around' && sidePad >= 5.2)) {
      const sideX = minX + 3.2;
      const maxFit = Math.max(1, Math.floor((actualLotD - swW - 4.0) / stallW));
      const count = Math.min(requestedStalls, maxFit);
      for (let i = 0; i < count; i++) {
        const sz = maxZ - swW - 3.0 - i * stallW;
        parkingStalls.push({
          id: `stall_side_${i}`,
          x: sideX,
          z: sz,
          width: stallD,
          depth: stallW,
          rotationY: Math.PI / 2
        });
        if (placementCtx) {
          registerLaneClearance(placementCtx, {
            id: `stall_zone_side_${i}`,
            kind: 'parking_stall',
            minX: sideX - stallD * 0.5,
            maxX: sideX + stallD * 0.5,
            minZ: sz - stallW * 0.5,
            maxZ: sz + stallW * 0.5
          });
        }
      }
    } else if (cfg.parkingConfig === 'rear_yard' && rearPad >= 5.5) {
      const rz = minZ + 3.0;
      const maxFit = Math.max(1, Math.floor((lotW - 4.0) / stallW));
      const count = Math.min(requestedStalls, maxFit);
      const totalSpan = count * stallW;
      for (let i = 0; i < count; i++) {
        const sx = -totalSpan * 0.5 + (i + 0.5) * stallW;
        parkingStalls.push({
          id: `stall_rear_${i}`,
          x: sx,
          z: rz,
          width: stallW,
          depth: stallD,
          rotationY: 0
        });
      }
    } else if (frontPad >= 6.2) {
      // Front row along sidewalk inner edge (skipping driveway mouths)
      const fz = maxZ - swW - stallD * 0.5 - 0.6;
      const maxFit = Math.max(1, Math.floor((lotW - 6.0) / stallW));
      const count = Math.min(requestedStalls, maxFit);
      const totalSpan = count * stallW;
      for (let i = 0; i < count; i++) {
        const sx = -totalSpan * 0.5 + (i + 0.5) * stallW;
        const hitsDriveway = driveways.some((d) => Math.abs(sx - d.x) < d.width * 0.62);
        if (hitsDriveway) continue;
        parkingStalls.push({
          id: `stall_front_${i}`,
          x: sx,
          z: fz,
          width: stallW,
          depth: stallD,
          rotationY: 0
        });
        if (placementCtx) {
          registerLaneClearance(placementCtx, {
            id: `stall_zone_front_${i}`,
            kind: 'parking_stall',
            minX: sx - stallW * 0.5,
            maxX: sx + stallW * 0.5,
            minZ: fz - stallD * 0.5,
            maxZ: fz + stallD * 0.5
          });
        }
      }
    }
  }

  // Service yard / fenced rear zone
  const serviceYard = cfg.serviceAccess && rearPad >= 3.2 ? {
    id: 'service_yard',
    x: -bw * 0.25,
    z: minZ + Math.min(rearPad * 0.45, 2.2),
    width: Math.min(bw * 0.55, 7.5),
    depth: Math.min(rearPad - 0.9, 3.6),
    fenced: isIndustrial || Boolean(options.fencedServiceYard)
  } : null;

  // Perimeter fence if industrial or secure facility
  const fences = [];
  if (options.fencedPerimeter) {
    fences.push({
      id: 'perimeter_fence',
      minX: minX + 0.3,
      maxX: maxX - 0.3,
      minZ: minZ + 0.3,
      maxZ: maxZ - swW - 0.3,
      gateOpenFront: true,
      height: options.fenceHeight || 2.1
    });
  } else if (serviceYard && serviceYard.fenced) {
    fences.push({
      id: 'service_yard_fence',
      minX: serviceYard.x - serviceYard.width * 0.5,
      maxX: serviceYard.x + serviceYard.width * 0.5,
      minZ: serviceYard.z - serviceYard.depth * 0.5,
      maxZ: serviceYard.z + serviceYard.depth * 0.5,
      gateOpenFront: false,
      height: 1.9
    });
  }

  // Landscaping planter strips along front corners
  const landscapingBeds = [];
  if (cfg.includeLandscaping && !isIndustrial) {
    const bedW = Math.min(3.2, Math.max(1.4, sidePad * 0.6));
    const bedD = 1.6;
    const bz = maxZ - swW - bedD * 0.5 - 0.35;
    if (lotW >= bw + 4.5) {
      landscapingBeds.push({ id: 'bed_front_left', x: minX + bedW * 0.5 + 0.5, z: bz, width: bedW, depth: bedD, hasTree: true });
      landscapingBeds.push({ id: 'bed_front_right', x: maxX - bedW * 0.5 - 0.5, z: bz, width: bedW, depth: bedD, hasTree: true });
    }
  }

  // Register standard lot anchors
  if (placementCtx) {
    const swY = 0.08;
    registerAnchor(placementCtx, {
      id: 'sidewalk_front_left',
      category: 'sidewalk',
      position: [-Math.min(bw * 0.42, halfW - 1.5), swY, maxZ - swW * 0.55],
      surfaceY: swY,
      rotationY: 0
    });
    registerAnchor(placementCtx, {
      id: 'sidewalk_front_right',
      category: 'sidewalk',
      position: [Math.min(bw * 0.42, halfW - 1.5), swY, maxZ - swW * 0.55],
      surfaceY: swY,
      rotationY: 0
    });
    registerAnchor(placementCtx, {
      id: 'roadside_sign_corner',
      category: 'roadside',
      position: [maxX - 1.9, 0.08, maxZ - swW - 1.2],
      surfaceY: 0.08,
      rotationY: 0
    });
    registerAnchor(placementCtx, {
      id: 'service_yard_dumpster',
      category: 'service_yard',
      position: [minX + 2.4, 0.02, minZ + 1.8],
      surfaceY: 0.02,
      rotationY: 0
    });
  }

  return {
    enabled: true,
    lotType: cfg.lotType,
    surfaceKind,
    bounds: {
      minX: roundNum(minX, 4),
      maxX: roundNum(maxX, 4),
      minZ: roundNum(minZ, 4),
      maxZ: roundNum(maxZ, 4),
      width: roundNum(lotW, 4),
      depth: roundNum(actualLotD, 4)
    },
    sidewalkWidth: swW,
    sidewalks,
    driveways,
    parkingStalls,
    landscapingBeds,
    fences,
    serviceYard,
    patio: options.patio || null,
    loadingApron: options.loadingApron || null
  };
}
