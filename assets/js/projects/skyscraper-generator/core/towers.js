import { clamp, copy, lerp, roundNum } from '../utils.js';
import { resolveStackedSections } from './sections.js';
import { computeSliceTransform, transformVertexXZ } from '../geometry/footprints-mesh.js';

function towerFindSectionAtY(tower, y) {
  const secs = tower.stack.sections;
  for (const s of secs) {
    if (y >= s.baseElevation - 0.01 && y <= s.topElevation + 0.01) {
      return s;
    }
  }
  return secs[secs.length - 1] || null;
}

function towerCastSingleRay(verts, ox, oz, dirX, dirZ) {
  let bestT = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const rx = dirX;
    const rz = dirZ;
    const sx = b.x - a.x;
    const sz = b.z - a.z;
    const denom = rx * sz - rz * sx;
    if (Math.abs(denom) < 1e-6) continue;
    const qpx = a.x - ox;
    const qpz = a.z - oz;
    const t = (qpx * sz - qpz * sx) / denom;
    const u = (qpx * rz - qpz * rx) / denom;
    if (t > 0 && u >= -0.001 && u <= 1.001) {
      bestT = Math.max(bestT, t);
    }
  }
  return bestT;
}

function towerRayExitDistance(section, dirX, dirZ, y, halfWidth = 0) {
  if (!section || !section.polygon || !section.polygon.vertices) return (section?.width || 20) * 0.45;
  const frac = clamp((y - section.baseElevation) / Math.max(0.1, section.height), 0, 1);
  const tr = computeSliceTransform(section, frac, section.height, 0);
  const verts = section.polygon.vertices.map((v) =>
    transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, section.offsetX || 0, section.offsetZ || 0)
  );
  const cx = section.offsetX || 0;
  const cz = section.offsetZ || 0;
  const centerHit = towerCastSingleRay(verts, cx, cz, dirX, dirZ);
  if (halfWidth <= 0.25) {
    return centerHit > 0.5 ? centerHit : Math.max(4, Math.min(section.width, section.depth) * 0.42);
  }

  // Cast parallel rays across the connection width and pick the innermost wall depth so the whole bridge embeds solidly
  const px = -dirZ;
  const pz = dirX;
  const hits = [];
  if (centerHit > 0.5) hits.push(centerHit);
  for (const side of [-0.82, 0.82]) {
    const ox = cx + px * (halfWidth * side);
    const oz = cz + pz * (halfWidth * side);
    const h = towerCastSingleRay(verts, ox, oz, dirX, dirZ);
    if (h > 0.5 && (centerHit <= 0.5 || h >= centerHit * 0.45)) {
      hits.push(h);
    }
  }
  if (hits.length === 0) return Math.max(4, Math.min(section.width, section.depth) * 0.42);
  return Math.min(...hits);
}

function towerBuildSpecs(cfg) {
  const count = clamp(Math.round(Number(cfg.towerCount) || 1), 1, 4);
  const arr = cfg.towerArrangement || 'single';
  const spacing = clamp(Number(cfg.towerSpacing) || 26, 16, 80);
  const secHR = clamp(Number(cfg.secondaryTowerHeightRatio) || 0.85, 0.4, 1.3);
  const secScale = clamp(Number(cfg.secondaryTowerScale) || 0.92, 0.55, 1.35);
  const secOffZ = clamp(Number(cfg.secondaryTowerOffsetZ) || 0, -24, 24);
  const secRot = clamp(Number(cfg.secondaryTowerRotationDeg) || 0, -180, 180);

  if (count === 1) {
    return [{ index: 0, x: 0, z: 0, rotDeg: 0, heightRatio: 1, widthScale: 1, depthScale: 1, mirrorX: false }];
  }

  if (count === 2) {
    const isAtrium = arr === 'split_core_atrium';
    let mirrored = !isAtrium && (arr === 'twin_mirrored' || arr === 'twin_asymmetrical');
    // Guard against double-negation when both 180-degree rotation and X mirroring are requested
    if (mirrored && Math.abs(secRot) >= 135) {
      mirrored = false;
    }
    const secondHR = arr === 'twin_identical' || arr === 'twin_mirrored' || isAtrium ? 1.0 : secHR;
    const secondScale = arr === 'twin_identical' || arr === 'twin_mirrored' || isAtrium ? 1.0 : secScale;
    return [
      { index: 0, x: -spacing * 0.5, z: 0, rotDeg: 0, heightRatio: 1, widthScale: 1, depthScale: 1, mirrorX: false },
      {
        index: 1,
        x: spacing * 0.5,
        z: isAtrium ? 0 : secOffZ,
        rotDeg: isAtrium ? 0 : secRot,
        heightRatio: secondHR,
        widthScale: secondScale,
        depthScale: secondScale,
        mirrorX: mirrored
      }
    ];
  }

  if (count === 3) {
    return [
      { index: 0, x: 0, z: -spacing * 0.28, rotDeg: 0, heightRatio: 1.0, widthScale: 1.0, depthScale: 1.0, mirrorX: false },
      { index: 1, x: -spacing * 0.62, z: spacing * 0.34 + secOffZ * 0.4, rotDeg: secRot, heightRatio: secHR, widthScale: secScale, depthScale: secScale, mirrorX: false },
      { index: 2, x: spacing * 0.62, z: spacing * 0.34 - secOffZ * 0.4, rotDeg: -secRot, heightRatio: lerp(1.0, secHR, 0.7), widthScale: lerp(1.0, secScale, 0.8), depthScale: lerp(1.0, secScale, 0.8), mirrorX: true }
    ];
  }

  // Quad plaza
  const half = spacing * 0.52;
  return [
    { index: 0, x: -half, z: -half * 0.85, rotDeg: 0, heightRatio: 1.0, widthScale: 1.0, depthScale: 1.0, mirrorX: false },
    { index: 1, x: half, z: -half * 0.85 + secOffZ * 0.3, rotDeg: secRot, heightRatio: secHR, widthScale: secScale, depthScale: secScale, mirrorX: true },
    { index: 2, x: -half, z: half * 0.85, rotDeg: 0, heightRatio: lerp(1.0, secHR, 0.5), widthScale: lerp(1.0, secScale, 0.6), depthScale: lerp(1.0, secScale, 0.6), mirrorX: false },
    { index: 3, x: half, z: half * 0.85 - secOffZ * 0.3, rotDeg: -secRot, heightRatio: lerp(secHR, 1.0, 0.3), widthScale: secScale, depthScale: secScale, mirrorX: true }
  ];
}

function towerComputePointWorld(tower, localX, localZ) {
  const cos = Math.cos((tower.rotDeg * Math.PI) / 180);
  const sin = Math.sin((tower.rotDeg * Math.PI) / 180);
  return {
    x: tower.x + localX * cos + localZ * sin,
    z: tower.z - localX * sin + localZ * cos
  };
}

function towerComputePairConnection(towerA, towerB, y, halfConnWidth = 2.2) {
  const secA = towerFindSectionAtY(towerA, y);
  const secB = towerFindSectionAtY(towerB, y);
  if (!secA || !secB) return null;

  const centerA = towerComputePointWorld(towerA, secA.offsetX || 0, secA.offsetZ || 0);
  const centerB = towerComputePointWorld(towerB, secB.offsetX || 0, secB.offsetZ || 0);
  const dx = centerB.x - centerA.x;
  const dz = centerB.z - centerA.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.5) return null;

  const ux = dx / dist;
  const uz = dz / dist;

  // Transform world unit direction into each tower's local XZ frame
  const radA = (-towerA.rotDeg * Math.PI) / 180;
  const lxA = ux * Math.cos(radA) + uz * Math.sin(radA);
  const lzA = -ux * Math.sin(radA) + uz * Math.cos(radA);

  const radB = (-towerB.rotDeg * Math.PI) / 180;
  const lxB = -ux * Math.cos(radB) - uz * Math.sin(radB);
  const lzB = ux * Math.sin(radB) - uz * Math.cos(radB);

  const reachA = towerRayExitDistance(secA, lxA, lzA, y, halfConnWidth);
  const reachB = towerRayExitDistance(secB, lxB, lzB, y, halfConnWidth);
  const clearGap = dist - reachA - reachB;
  if (clearGap < 1.2) return null;

  // Inset anchors into facing walls to avoid gaps
  const embed = 0.85;
  const start = {
    x: roundNum(centerA.x + ux * Math.max(0.5, reachA - embed), 3),
    z: roundNum(centerA.z + uz * Math.max(0.5, reachA - embed), 3)
  };
  const end = {
    x: roundNum(centerB.x - ux * Math.max(0.5, reachB - embed), 3),
    z: roundNum(centerB.z - uz * Math.max(0.5, reachB - embed), 3)
  };
  return {
    start,
    end,
    clearGap: roundNum(clearGap, 3),
    spanLength: roundNum(Math.hypot(end.x - start.x, end.z - start.z), 3)
  };
}

export function resolveTowerComplex(cfg) {
  const specs = towerBuildSpecs(cfg);
  const towers = [];

  let complexMinX = Infinity;
  let complexMaxX = -Infinity;
  let complexMinZ = Infinity;
  let complexMaxZ = -Infinity;
  let maxTowerHeight = 0;
  let totalFloors = 0;
  let maxSingleTowerFloors = 0;

  for (const spec of specs) {
    const towerCfg = copy(cfg);
    if (spec.mirrorX && Array.isArray(towerCfg.sections)) {
      towerCfg.sections = towerCfg.sections.map((s) => ({
        ...s,
        offsetX: -(Number(s.offsetX) || 0),
        slantedTopDeg: -(Number(s.slantedTopDeg) || 0),
        rotationDeg: -(Number(s.rotationDeg) || 0),
        twistDeg: -(Number(s.twistDeg) || 0)
      }));
    }

    const stack = resolveStackedSections(towerCfg, {
      heightRatio: spec.heightRatio,
      widthScale: spec.widthScale,
      depthScale: spec.depthScale
    });

    let tMinX = Infinity;
    let tMaxX = -Infinity;
    let tMinZ = Infinity;
    let tMaxZ = -Infinity;

    for (const sec of stack.sections) {
      for (const v of sec.polygon.vertices) {
        const pt = transformVertexXZ(v, 1, 1, (sec.baseRotationDeg * Math.PI) / 180, sec.offsetX || 0, sec.offsetZ || 0);
        const worldPt = towerComputePointWorld(spec, pt.x, pt.z);
        tMinX = Math.min(tMinX, worldPt.x);
        tMaxX = Math.max(tMaxX, worldPt.x);
        tMinZ = Math.min(tMinZ, worldPt.z);
        tMaxZ = Math.max(tMaxZ, worldPt.z);
      }
    }

    complexMinX = Math.min(complexMinX, tMinX);
    complexMaxX = Math.max(complexMaxX, tMaxX);
    complexMinZ = Math.min(complexMinZ, tMinZ);
    complexMaxZ = Math.max(complexMaxZ, tMaxZ);
    maxTowerHeight = Math.max(maxTowerHeight, stack.totalHeight);
    totalFloors += stack.totalFloors;
    maxSingleTowerFloors = Math.max(maxSingleTowerFloors, stack.totalFloors);

    towers.push({
      ...spec,
      stack,
      bounds: {
        minX: roundNum(tMinX, 3),
        maxX: roundNum(tMaxX, 3),
        minZ: roundNum(tMinZ, 3),
        maxZ: roundNum(tMaxZ, 3),
        width: roundNum(tMaxX - tMinX, 3),
        depth: roundNum(tMaxZ - tMinZ, 3),
        height: stack.totalHeight
      }
    });
  }

  // Compute skybridges & inter-tower open structural trusses
  const skybridges = [];
  const trusses = [];

  if (towers.length >= 2) {
    const pairs = [];
    for (let i = 0; i < towers.length - 1; i++) {
      pairs.push([0, i + 1]);
    }
    if (towers.length === 4) {
      pairs.push([2, 3]);
    }

    const reqBridges = clamp(Math.round(Number(cfg.bridgeCount) || 0), 0, 6);
    const startFloor = clamp(Math.round(Number(cfg.bridgeStartFloor) || 12), 2, 60);
    const floorStep = clamp(Math.round(Number(cfg.bridgeFloorSpacing) || 8), 2, 24);
    const bridgeW = clamp(Number(cfg.bridgeWidth) || 5.2, 2.5, 14);
    const bridgeH = clamp(Number(cfg.bridgeHeight) || 4.2, 2.5, 10);
    const avgFloorH = clamp(Number(cfg.floorHeight) || 3.8, 2.8, 6.5);

    if (reqBridges > 0) {
      for (let b = 0; b < reqBridges; b++) {
        const [aIdx, bIdx] = pairs[b % pairs.length];
        const tierIdx = Math.floor(b / pairs.length);
        const tA = towers[aIdx];
        const tB = towers[bIdx];

        const minSharedY = Math.max(tA.stack.baseElevation, tB.stack.baseElevation) + 4.0;
        const maxSharedY = Math.min(tA.stack.totalHeight, tB.stack.totalHeight) - bridgeH - 2.0;
        if (maxSharedY <= minSharedY) continue;

        const targetFloor = startFloor + tierIdx * floorStep;
        let bridgeY = clamp(targetFloor * avgFloorH, minSharedY, maxSharedY);

        // Prevent vertically colliding bridges on the same tower pair
        const existingOnPair = skybridges.filter((sb) => sb.fromTower === aIdx && sb.toTower === bIdx);
        for (const prev of existingOnPair) {
          if (Math.abs(bridgeY - prev.elevationY) < bridgeH + 2.2) {
            bridgeY = clamp(prev.elevationY + bridgeH + floorStep * avgFloorH * 0.45, minSharedY, maxSharedY);
          }
        }
        if (existingOnPair.some((prev) => Math.abs(bridgeY - prev.elevationY) < bridgeH * 0.9)) {
          bridgeY = clamp(lerp(minSharedY, maxSharedY, 0.85), minSharedY, maxSharedY);
        }
        if (existingOnPair.some((prev) => Math.abs(bridgeY - prev.elevationY) < bridgeH * 0.9)) continue;

        const conn = towerComputePairConnection(tA, tB, bridgeY + bridgeH * 0.5, bridgeW * 0.5);
        if (!conn) continue;

        skybridges.push({
          id: `bridge_${b}`,
          fromTower: aIdx,
          toTower: bIdx,
          floor: Math.round(bridgeY / avgFloorH),
          elevationY: roundNum(bridgeY, 3),
          width: bridgeW,
          height: bridgeH,
          start: conn.start,
          end: conn.end,
          spanLength: conn.spanLength,
          clearGap: conn.clearGap,
          enclosed: cfg.bridgeEnclosed !== false,
          glass: cfg.bridgeGlass !== false,
          trusses: cfg.bridgeTrusses !== false
        });
      }
    }

    if (cfg.interTowerTrussFrame) {
      const [aIdx, bIdx] = pairs[0];
      const tA = towers[aIdx];
      const tB = towers[bIdx];
      const maxTrussTop = Math.min(tA.stack.totalHeight, tB.stack.totalHeight) * 0.72;
      const matchingBridge = skybridges.find((sb) => sb.fromTower === aIdx && sb.toTower === bIdx);
      const lowY = Math.max(tA.stack.baseElevation, tB.stack.baseElevation) + 6.0;
      const highY = matchingBridge
        ? Math.max(lowY + 12, matchingBridge.elevationY - 0.5)
        : maxTrussTop;

      if (highY > lowY + 8) {
        const trussDepth = clamp(bridgeW * 0.75, 2.5, 6.5);
        const conn = towerComputePairConnection(tA, tB, (lowY + highY) * 0.5, trussDepth * 0.5);
        if (conn && conn.clearGap >= 2.0) {
          trusses.push({
            id: 'inter_truss_main',
            fromTower: aIdx,
            toTower: bIdx,
            bottomY: roundNum(lowY, 3),
            topY: roundNum(highY, 3),
            depth: trussDepth,
            start: conn.start,
            end: conn.end,
            spanLength: conn.spanLength,
            levels: clamp(Math.round((highY - lowY) / 7.5), 2, 7)
          });
        }
      }
    }
  }

  const rawComplexW = Math.max(12, complexMaxX - complexMinX);
  const rawComplexD = Math.max(12, complexMaxZ - complexMinZ);
  const podiumPad = cfg.connectedPodium ? 6 : 3.5;
  const podiumH = cfg.raisedPodium ? clamp(Number(cfg.podiumElevation) || 1.2, 0.4, 3.2) : 0;

  const plazaW = Math.max(Number(cfg.plazaWidth) || 48, rawComplexW + 12);
  const plazaD = Math.max(Number(cfg.plazaDepth) || 42, rawComplexD + 12);

  return {
    towers,
    skybridges,
    trusses,
    totalFloors,
    maxSingleTowerFloors,
    maxTowerHeight: roundNum(maxTowerHeight, 3),
    footprintBounds: {
      minX: roundNum(complexMinX, 3),
      maxX: roundNum(complexMaxX, 3),
      minZ: roundNum(complexMinZ, 3),
      maxZ: roundNum(complexMaxZ, 3),
      width: roundNum(rawComplexW, 3),
      depth: roundNum(rawComplexD, 3),
      centerX: roundNum((complexMinX + complexMaxX) * 0.5, 3),
      centerZ: roundNum((complexMinZ + complexMaxZ) * 0.5, 3)
    },
    podium: {
      enabled: Boolean(cfg.connectedPodium && towers.length > 1) || podiumH > 0,
      connected: Boolean(cfg.connectedPodium && towers.length > 1),
      centerX: roundNum((complexMinX + complexMaxX) * 0.5, 3),
      centerZ: roundNum((complexMinZ + complexMaxZ) * 0.5, 3),
      width: roundNum(rawComplexW + podiumPad * 2, 3),
      depth: roundNum(rawComplexD + podiumPad * 2, 3),
      height: podiumH
    },
    plaza: {
      enabled: cfg.plazaEnabled !== false,
      width: roundNum(plazaW, 3),
      depth: roundNum(plazaD, 3),
      elevation: 0
    }
  };
}
