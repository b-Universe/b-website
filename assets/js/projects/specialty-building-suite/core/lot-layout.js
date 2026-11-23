import { clamp, roundNum } from '../utils.js';
import { registerAnchor, registerLaneClearance } from './placement-anchors.js';

const STALL_WIDTH = 2.6;
const STALL_DEPTH = 5.0;
const PARKING_AISLE_WIDTH = 6.0;
const PARKING_EDGE_GAP = 0.5;
const PARKING_ROW_MARGIN = STALL_DEPTH + PARKING_AISLE_WIDTH + PARKING_EDGE_GAP;

function planPerimeterParking(edges, driveways, count, placementCtx) {
  const { left, right, rear, front } = edges;
  const rowOffset = PARKING_EDGE_GAP + STALL_DEPTH * 0.5;
  const leftAisle = left + PARKING_EDGE_GAP + STALL_DEPTH;
  const rightAisle = right - PARKING_EDGE_GAP - STALL_DEPTH;
  const rearAisle = rear + PARKING_EDGE_GAP + STALL_DEPTH;
  const frontAisle = front - PARKING_EDGE_GAP - STALL_DEPTH;
  const aisles = [
    ['front', leftAisle, rightAisle, frontAisle - PARKING_AISLE_WIDTH, frontAisle],
    ['rear', leftAisle, rightAisle, rearAisle, rearAisle + PARKING_AISLE_WIDTH],
    ['left', leftAisle, leftAisle + PARKING_AISLE_WIDTH, rearAisle, frontAisle],
    ['right', rightAisle - PARKING_AISLE_WIDTH, rightAisle, rearAisle, frontAisle]
  ];
  for (const [side, minX, maxX, minZ, maxZ] of aisles) {
    registerLaneClearance(placementCtx, { id: `parking_aisle_${side}`, minX, maxX, minZ, maxZ });
  }

  const rows = [
    ['front', leftAisle, rightAisle, front - rowOffset, Math.PI],
    ['rear', leftAisle, rightAisle, rear + rowOffset, 0],
    ['left', rearAisle, frontAisle, left + rowOffset, Math.PI / 2],
    ['right', rearAisle, frontAisle, right - rowOffset, -Math.PI / 2]
  ].map(([side, start, end, fixed, rotationY], rowIndex) => {
    const alongX = rowIndex < 2;
    const capacity = Math.max(0, Math.floor((end - start) / STALL_WIDTH));
    const center = (start + end) * 0.5;
    const row = [];
    for (let i = 0; i < capacity; i++) {
      const position = center + (i - (capacity - 1) * 0.5) * STALL_WIDTH;
      const x = alongX ? position : fixed;
      const z = alongX ? fixed : position;
      if (side === 'front' && driveways.some((dw) => Math.abs(x - dw.x) < (dw.width + STALL_WIDTH) * 0.5 + 0.2)) continue;
      row.push({ id: `stall_${side}_${i}`, x, z, width: STALL_WIDTH, depth: STALL_DEPTH, rotationY });
    }
    const axis = alongX ? 'x' : 'z';
    return row.sort((a, b) => Math.abs(b[axis] - center) - Math.abs(a[axis] - center));
  });

  const stalls = [];
  for (let remaining = Math.min(count, rows.reduce((total, row) => total + row.length, 0)); remaining > 0;) {
    for (const row of rows) {
      const stall = remaining > 0 && row.pop();
      if (!stall) continue;
      stalls.push(stall);
      remaining--;
      const isSide = Math.abs(stall.rotationY) === Math.PI / 2;
      const halfX = (isSide ? stall.depth : stall.width) * 0.5;
      const halfZ = (isSide ? stall.width : stall.depth) * 0.5;
      registerLaneClearance(placementCtx, {
        id: `stall_zone_${stall.id}`,
        kind: 'parking_stall',
        minX: stall.x - halfX, maxX: stall.x + halfX,
        minZ: stall.z - halfZ, maxZ: stall.z + halfZ
      });
    }
  }
  return stalls;
}

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

  const isCivic = cfg.lotType === 'civic_plaza';
  const isIndustrial = cfg.lotType === 'industrial_service' || cfg.lotType === 'multi_building_facility';
  const isUrban = cfg.lotType === 'compact_urban';
  const surfaceKind = isCivic ? 'plaza_stone' : isUrban ? 'concrete' : 'asphalt';
  const swW = isCivic ? 3.2 : 2.4;
  const hasFrontWalk = cfg.sidewalkConfig !== 'none';
  const hasLeftWalk = cfg.sidewalkConfig === 'full_perimeter';
  const hasRightWalk = hasFrontWalk && (cfg.cornerLot || cfg.sidewalkConfig === 'corner_wrap' || hasLeftWalk);
  const requestedStalls = cfg.includeParking && cfg.parkingConfig !== 'none' ? (cfg.parkingCount || 0) : 0;
  const perimeterParking = options.perimeterParking && cfg.parkingConfig === 'wrap_around' && requestedStalls > 0;
  const footprint = options.footprintBounds || { minX: -bw * 0.5, maxX: bw * 0.5, minZ: -bd * 0.5, maxZ: bd * 0.5 };
  const leftPad = perimeterParking ? Math.max(sidePad, PARKING_ROW_MARGIN + (hasLeftWalk ? swW : 0)) : sidePad;
  const rightPad = perimeterParking ? Math.max(sidePad, PARKING_ROW_MARGIN + (hasRightWalk ? swW : 0)) : sidePad;
  const extraWidth = Math.max(0, cfg.lotWidth - (footprint.maxX - footprint.minX + leftPad + rightPad)) || 0;
  const minX = footprint.minX - leftPad - extraWidth * 0.5;
  const maxX = footprint.maxX + rightPad + extraWidth * 0.5;
  const lotW = maxX - minX;
  const halfW = lotW * 0.5;
  const centerX = (minX + maxX) * 0.5;
  const minZ = footprint.minZ - (perimeterParking ? Math.max(rearPad, PARKING_ROW_MARGIN) : rearPad);
  const minimumFront = footprint.maxZ + (perimeterParking ? Math.max(frontPad, PARKING_ROW_MARGIN + (hasFrontWalk ? swW : 0)) : frontPad);
  const maxZ = options.footprintBounds ? Math.max(minimumFront, minZ + cfg.lotDepth) : minimumFront;
  const actualLotD = maxZ - minZ;
  const parkingEdges = {
    left: minX + (hasLeftWalk ? swW : 0),
    right: maxX - (hasRightWalk ? swW : 0),
    rear: minZ,
    front: maxZ - (hasFrontWalk ? swW : 0)
  };

  // Sidewalks
  const sidewalks = [];
  if (hasFrontWalk) {
    sidewalks.push({
      id: 'sw_front',
      x: centerX,
      z: maxZ - swW * 0.5,
      width: lotW,
      depth: swW,
      y: 0.08
    });
    if (hasRightWalk) {
      sidewalks.push({
        id: 'sw_right',
        x: maxX - swW * 0.5,
        z: (minZ + maxZ) * 0.5,
        width: swW,
        depth: actualLotD,
        y: 0.08
      });
    }
    if (hasLeftWalk) {
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
  const parkingEntryOffset = PARKING_EDGE_GAP + STALL_DEPTH + PARKING_AISLE_WIDTH * 0.5;
  if (cfg.drivewayPlacement === 'dual' || cfg.drivewayPlacement === 'left') {
    const dx = perimeterParking ? parkingEdges.left + parkingEntryOffset : minX + Math.min(sidePad * 0.75 + 2.2, lotW * 0.25);
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
        minZ: footprint.maxZ + 0.5,
        maxZ: maxZ
      });
    }
  }
  if (cfg.drivewayPlacement === 'dual' || cfg.drivewayPlacement === 'right') {
    const dx = perimeterParking ? parkingEdges.right - parkingEntryOffset : maxX - Math.min(sidePad * 0.75 + 2.2, lotW * 0.25);
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
        minZ: footprint.maxZ + 0.5,
        maxZ: maxZ
      });
    }
  }

  // Parking stalls
  const parkingStalls = perimeterParking ? planPerimeterParking(parkingEdges, driveways, requestedStalls, placementCtx) : [];
  const stallW = STALL_WIDTH;
  const stallD = STALL_DEPTH;

  if (requestedStalls > 0 && !isUrban && !perimeterParking) {
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
        const sx = centerX - totalSpan * 0.5 + (i + 0.5) * stallW;
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
        const sx = centerX - totalSpan * 0.5 + (i + 0.5) * stallW;
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
  const serviceYard = cfg.serviceAccess && rearPad >= 3.2 && !perimeterParking ? {
    id: 'service_yard',
    x: -bw * 0.25,
    z: minZ + Math.min(rearPad * 0.45, 2.2),
    width: Math.min(bw * 0.55, 7.5),
    depth: Math.min(rearPad - 0.9, 3.6),
    fenced: isIndustrial || Boolean(options.fencedServiceYard)
  } : null;

  // Perimeter fence if industrial or secure facility
  const fences = [];
  if (options.fencedPerimeter || options.industrialFence) {
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
