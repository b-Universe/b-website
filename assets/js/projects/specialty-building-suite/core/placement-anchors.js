import { clamp, roundNum } from '../utils.js';

export const ANCHOR_CATEGORIES = [
  'storefront',
  'window_display',
  'entrance',
  'sidewalk',
  'parking',
  'service_yard',
  'roof',
  'wall',
  'loading_dock',
  'patio',
  'drive_thru',
  'fuel_island',
  'equipment_frontage',
  'interior_display',
  'roadside'
];

export function createPlacementContext(cfg) {
  return {
    anchors: new Map(),
    buildingFootprints: [],
    entranceClearances: [],
    laneClearances: [],
    roofBounds: [],
    placedBoxes: [],
    diagnostics: {
      placedCount: 0,
      nudgedCount: 0,
      rejectedCollisions: [],
      missingDependencies: []
    },
    cfg
  };
}

export function registerAnchor(ctx, anchorDef) {
  if (!ctx || !anchorDef || !anchorDef.id) return null;
  const anchor = {
    id: anchorDef.id,
    category: anchorDef.category || 'storefront',
    position: [
      roundNum(anchorDef.position?.[0] || 0, 4),
      roundNum(anchorDef.position?.[1] || 0, 4),
      roundNum(anchorDef.position?.[2] || 0, 4)
    ],
    rotationY: roundNum(anchorDef.rotationY || 0, 4),
    normal: anchorDef.normal || [0, 0, 1],
    surfaceY: roundNum(anchorDef.surfaceY ?? anchorDef.position?.[1] ?? 0, 4),
    span: anchorDef.span || null,
    bounds: anchorDef.bounds || null
  };
  ctx.anchors.set(anchor.id, anchor);
  return anchor;
}

export function registerBuildingFootprint(ctx, boxDef) {
  if (!ctx || !boxDef) return;
  ctx.buildingFootprints.push({
    id: boxDef.id || `bldg_${ctx.buildingFootprints.length}`,
    minX: roundNum(boxDef.minX, 4),
    maxX: roundNum(boxDef.maxX, 4),
    minZ: roundNum(boxDef.minZ, 4),
    maxZ: roundNum(boxDef.maxZ, 4),
    maxY: roundNum(boxDef.maxY || 4, 4)
  });
}

export function registerEntranceClearance(ctx, entranceDef) {
  if (!ctx || !entranceDef) return;
  const pos = entranceDef.position || { x: 0, y: 0, z: 0 };
  const n = entranceDef.normal || { x: 0, y: 0, z: 1 };
  const clearW = entranceDef.clearanceWidth || (entranceDef.role === 'garage' || entranceDef.role === 'loading' ? 3.8 : 2.1);
  const clearD = entranceDef.clearanceDepth || (entranceDef.role === 'garage' || entranceDef.role === 'loading' ? 4.5 : 2.2);
  const cx = pos.x + n.x * (clearD * 0.5 + 0.15);
  const cz = pos.z + n.z * (clearD * 0.5 + 0.15);
  const absX = Math.abs(n.x) > 0.5;
  const hx = (absX ? clearD : clearW) * 0.5;
  const hz = (absX ? clearW : clearD) * 0.5;
  ctx.entranceClearances.push({
    id: entranceDef.id,
    role: entranceDef.role,
    minX: roundNum(cx - hx, 4),
    maxX: roundNum(cx + hx, 4),
    minZ: roundNum(cz - hz, 4),
    maxZ: roundNum(cz + hz, 4),
    minY: roundNum(pos.y || 0, 4),
    maxY: roundNum((pos.y || 0) + 2.8, 4)
  });
}

export function registerLaneClearance(ctx, laneBox) {
  if (!ctx || !laneBox) return;
  ctx.laneClearances.push({
    id: laneBox.id || `lane_${ctx.laneClearances.length}`,
    kind: laneBox.kind || 'driveway',
    minX: roundNum(laneBox.minX, 4),
    maxX: roundNum(laneBox.maxX, 4),
    minZ: roundNum(laneBox.minZ, 4),
    maxZ: roundNum(laneBox.maxZ, 4)
  });
}

export function registerRoofBound(ctx, roofBox) {
  if (!ctx || !roofBox) return;
  ctx.roofBounds.push({
    id: roofBox.id || `roof_${ctx.roofBounds.length}`,
    minX: roundNum(roofBox.minX, 4),
    maxX: roundNum(roofBox.maxX, 4),
    minZ: roundNum(roofBox.minZ, 4),
    maxZ: roundNum(roofBox.maxZ, 4),
    y: roundNum(roofBox.y, 4)
  });
}

function boxesOverlap2D(a, b, pad = 0.04) {
  return (
    a.minX < b.maxX - pad &&
    a.maxX > b.minX + pad &&
    a.minZ < b.maxZ - pad &&
    a.maxZ > b.minZ + pad
  );
}

function boxesOverlap3D(a, b, pad = 0.04) {
  if (!boxesOverlap2D(a, b, pad)) return false;
  return a.minY < b.maxY - pad && a.maxY > b.minY + pad;
}

export function resolveSpecWorldPose(ctx, spec) {
  const anchor = spec.anchorId ? ctx.anchors.get(spec.anchorId) : null;
  const localPos = spec.localOffset || spec.position || [0, 0, 0];
  const baseRot = anchor ? anchor.rotationY : 0;
  const rotY = baseRot + (spec.rotationY || 0);

  let wx = localPos[0] || 0;
  let wy = localPos[1] || 0;
  let wz = localPos[2] || 0;

  if (anchor) {
    const c = Math.cos(baseRot);
    const s = Math.sin(baseRot);
    const rx = wx * c + wz * s;
    const rz = -wx * s + wz * c;
    wx = anchor.position[0] + rx;
    wy = anchor.surfaceY + (localPos[1] || 0);
    wz = anchor.position[2] + rz;
  }

  return {
    anchor,
    x: roundNum(wx, 4),
    y: roundNum(wy, 4),
    z: roundNum(wz, 4),
    rotationY: roundNum(rotY, 4)
  };
}

export function validateAndReservePlacement(ctx, spec, halfExtents) {
  const pose = resolveSpecWorldPose(ctx, spec);
  const hx = Math.max(0.12, (halfExtents?.x || 0.35) * (spec.scale || 1));
  const hy = Math.max(0.12, (halfExtents?.y || 0.45) * (spec.scale || 1));
  const hz = Math.max(0.12, (halfExtents?.z || 0.35) * (spec.scale || 1));

  // Rotated AABB extent in XZ
  const absCos = Math.abs(Math.cos(pose.rotationY));
  const absSin = Math.abs(Math.sin(pose.rotationY));
  const ex = hx * absCos + hz * absSin;
  const ez = hx * absSin + hz * absCos;

  let x = pose.x;
  let y = pose.y;
  let z = pose.z;
  let nudged = false;

  const isRoof = pose.anchor?.category === 'roof' || spec.placementLayer === 'roof';
  const isWall = pose.anchor?.category === 'wall' || spec.placementLayer === 'wall';
  const isInterior = pose.anchor?.category === 'interior_display' || spec.placementLayer === 'interior';

  // Ensure grounded on surface unless wall/roof/interior
  if (!isRoof && !isWall && !isInterior && !spec.allowElevated) {
    y = Math.max(0, pose.anchor ? pose.anchor.surfaceY : 0);
  }

  // Clamp inside roof bounds if rooftop prop
  if (isRoof && ctx.roofBounds.length > 0 && !spec.skipRoofClamp) {
    const rb = ctx.roofBounds[0];
    const margin = 0.25;
    const clampedX = clamp(x, rb.minX + ex + margin, rb.maxX - ex - margin);
    const clampedZ = clamp(z, rb.minZ + ez + margin, rb.maxZ - ez - margin);
    if (Math.abs(clampedX - x) > 0.01 || Math.abs(clampedZ - z) > 0.01) {
      x = clampedX;
      z = clampedZ;
      nudged = true;
    }
    y = rb.y;
  }

  const makeBox = (cx, cy, cz) => ({
    minX: cx - ex,
    maxX: cx + ex,
    minY: cy,
    maxY: cy + hy * 2,
    minZ: cz - ez,
    maxZ: cz + ez
  });

  let candBox = makeBox(x, y, z);

  // Check entrance clearances for ground exterior objects
  if (!isRoof && !isWall && !isInterior && !spec.allowInEntrance) {
    for (const ent of ctx.entranceClearances) {
      if (boxesOverlap2D(candBox, ent, 0.02)) {
        // Attempt lateral nudge outside entrance clearance
        const dxLeft = ent.minX - ex - 0.12;
        const dxRight = ent.maxX + ex + 0.12;
        const altX = Math.abs(x - dxLeft) < Math.abs(x - dxRight) ? dxLeft : dxRight;
        const testBox = makeBox(altX, y, z);
        if (!ctx.buildingFootprints.some((b) => boxesOverlap2D(testBox, b, 0.02))) {
          x = altX;
          candBox = testBox;
          nudged = true;
        } else {
          ctx.diagnostics.rejectedCollisions.push({
            familyId: spec.familyId,
            presetId: spec.presetId,
            reason: `Blocked entrance ${ent.id}`
          });
          return { accepted: false, reason: 'blocked_entrance' };
        }
      }
    }
  }

  // Check building wall intrusion for exterior ground objects
  if (!isRoof && !isWall && !isInterior && !spec.allowInsideBuilding) {
    for (const bldg of ctx.buildingFootprints) {
      if (boxesOverlap2D(candBox, bldg, 0.03)) {
        // Push outward along nearest axis
        const pushFront = bldg.maxZ + ez + 0.08;
        const pushBack = bldg.minZ - ez - 0.08;
        const pushLeft = bldg.minX - ex - 0.08;
        const pushRight = bldg.maxX + ex + 0.08;
        const candidates = [
          { x, z: pushFront, dist: Math.abs(z - pushFront) },
          { x, z: pushBack, dist: Math.abs(z - pushBack) },
          { x: pushLeft, z, dist: Math.abs(x - pushLeft) },
          { x: pushRight, z, dist: Math.abs(x - pushRight) }
        ].sort((a, b) => a.dist - b.dist);
        x = candidates[0].x;
        z = candidates[0].z;
        candBox = makeBox(x, y, z);
        nudged = true;
      }
    }
  }

  // Check vehicle lane clearance for ground props
  if (!isRoof && !isWall && !isInterior && !spec.allowInLane) {
    for (const lane of ctx.laneClearances) {
      if (boxesOverlap2D(candBox, lane, 0.04)) {
        ctx.diagnostics.rejectedCollisions.push({
          familyId: spec.familyId,
          presetId: spec.presetId,
          reason: `Blocked vehicle lane ${lane.id}`
        });
        return { accepted: false, reason: 'blocked_lane' };
      }
    }
  }

  // Check overlap against already placed props
  if (!spec.allowOverlap) {
    for (const prev of ctx.placedBoxes) {
      if (boxesOverlap3D(candBox, prev, 0.05)) {
        // Try a small lateral shift before rejecting
        let resolved = false;
        for (const offset of [ex * 2.1 + 0.15, -(ex * 2.1 + 0.15), ez * 2.1 + 0.15, -(ez * 2.1 + 0.15)]) {
          const tx = Math.abs(offset) === ex * 2.1 + 0.15 ? x + offset : x;
          const tz = Math.abs(offset) === ez * 2.1 + 0.15 ? z + offset : z;
          const testBox = makeBox(tx, y, tz);
          const hitsPrev = ctx.placedBoxes.some((p) => boxesOverlap3D(testBox, p, 0.05));
          const hitsBldg = !isRoof && !isWall && !isInterior && !spec.allowInsideBuilding &&
            ctx.buildingFootprints.some((b) => boxesOverlap2D(testBox, b, 0.03));
          const hitsEnt = !isRoof && !isWall && !isInterior && !spec.allowInEntrance &&
            ctx.entranceClearances.some((e) => boxesOverlap2D(testBox, e, 0.02));
          if (!hitsPrev && !hitsBldg && !hitsEnt) {
            x = tx;
            z = tz;
            candBox = testBox;
            nudged = true;
            resolved = true;
            break;
          }
        }
        if (!resolved) {
          ctx.diagnostics.rejectedCollisions.push({
            familyId: spec.familyId,
            presetId: spec.presetId,
            reason: `Overlapped existing prop ${prev.familyId}`
          });
          return { accepted: false, reason: 'prop_overlap' };
        }
      }
    }
  }

  ctx.placedBoxes.push({
    ...candBox,
    familyId: spec.familyId,
    presetId: spec.presetId
  });
  ctx.diagnostics.placedCount += 1;
  if (nudged) ctx.diagnostics.nudgedCount += 1;

  return {
    accepted: true,
    nudged,
    position: [roundNum(x, 4), roundNum(y, 4), roundNum(z, 4)],
    rotationY: pose.rotationY,
    bounds: candBox
  };
}
