import { clamp, roundNum } from '../utils.js';
import { OPTIONS, sanitisePreset } from '../config.js';
import { segmentsForFloor, subtractIntervals } from './layouts.js';

export function resolveDoorDimensions(cfg, wide = false) {
  const floorHeight = Number(cfg?.floorHeight) || 3.2;
  const doorScale = Number(cfg?.doorScale) > 0 ? Number(cfg.doorScale) : 1.0;
  const baseW = wide ? 1.76 : 1.06;
  const baseH = wide
    ? clamp(floorHeight * 0.60, 2.04, 2.22)
    : clamp(floorHeight * 0.57, 1.96, 2.12);
  const width = Number(cfg?.doorWidth) > 0 ? Number(cfg.doorWidth) : Number((baseW * doorScale).toFixed(4));
  const height = Number(cfg?.doorHeight) > 0 ? Number(cfg.doorHeight) : Number((baseH * doorScale).toFixed(4));
  return { baseW, baseH, doorScale, width, height };
}

function resolvePrimaryStoopMetrics(doorStyle, wideDoor, doorWidth, steps) {
  const stepH = 0.135;
  const stepD = 0.27;
  const landingD = doorStyle === 'stoop' ? 0.82 : 0.58;
  const totalRise = steps * stepH;
  const totalStepDepth = steps > 0 ? landingD + (steps - 1) * stepD : 0;
  const stoopW = wideDoor
    ? clamp(Number((doorWidth + 0.72).toFixed(3)), 2.0, 2.8)
    : clamp(Number((doorWidth + 0.66).toFixed(3)), 1.5, 2.1);
  return { stepH, stepD, landingD, totalRise, totalStepDepth, stoopW };
}

export function computeDefaultEntranceGameplay(cfg) {
  const groundUse = cfg.groundUse || 'residential';
  const doorStyle = cfg.doorStyle || 'stoop';
  const rawSteps = Number.isFinite(Number(cfg.entranceSteps)) ? Number(cfg.entranceSteps) : 3;
  const wideDoor = doorStyle === 'double' || groundUse === 'lobby' || groundUse === 'shop';
  const { width: doorWidth, height: doorHeight } = resolveDoorDimensions(cfg, wideDoor);
  const steps = groundUse === 'shop' ? 0 : (doorStyle === 'stoop' ? Math.max(1, rawSteps) : rawSteps);
  const { totalRise, totalStepDepth, stoopW } = resolvePrimaryStoopMetrics(doorStyle, wideDoor, doorWidth, steps);

  const triggerWidth = Number(clamp(Math.max(doorWidth + 0.72, steps > 0 ? stoopW : 2.0), 1.0, 8.0).toFixed(1));
  const triggerHeight = Number(clamp(Math.max(2.2, doorHeight + totalRise + 0.30), 1.8, 6.0).toFixed(1));
  const triggerDepth = Number(clamp(Math.max(1.6, totalStepDepth + 1.25), 1.0, 8.0).toFixed(1));

  let entranceCategory = 'apartment';
  let interactionLabel = 'Enter Building';
  if (groundUse === 'shop') {
    entranceCategory = 'shop';
    interactionLabel = 'Enter Shop';
  } else if (groundUse === 'lobby') {
    entranceCategory = 'generic';
    interactionLabel = 'Enter Lobby';
  } else if (cfg.style === 'abandoned') {
    entranceCategory = 'mission';
    interactionLabel = 'Enter Hideout';
  }

  return {
    entranceEnabled: true,
    entranceCategory,
    interactionDistance: 2.5,
    triggerWidth,
    triggerHeight,
    triggerDepth,
    entranceLocked: cfg.style === 'abandoned' && (Number(cfg.damage) || 0) >= 0.45,
    interactionLabel
  };
}

export function computePrimaryEntranceLayout(seg, cfg) {
  const cut = seg.cornerCut || 0;
  const usableW = seg.w - cut;
  const cx = seg.x - cut * 0.5;
  const wallZ = seg.z + seg.d * 0.5;
  const wideDoor = cfg.doorStyle === 'double' || cfg.groundUse === 'lobby' || cfg.groundUse === 'shop';
  const { width: doorWidth, height: doorHeight } = resolveDoorDimensions(cfg, wideDoor);
  const steps = cfg.groundUse === 'shop' ? 0 : (cfg.doorStyle === 'stoop' ? Math.max(1, cfg.entranceSteps) : cfg.entranceSteps);
  const { stepH, stepD, landingD, totalRise, totalStepDepth, stoopW } = resolvePrimaryStoopMetrics(
    cfg.doorStyle || 'stoop',
    wideDoor,
    doorWidth,
    steps
  );
  return {
    cut,
    usableW,
    cx,
    wallZ,
    wideDoor,
    doorWidth,
    doorHeight,
    steps,
    stepH,
    stepD,
    landingD,
    totalRise,
    totalStepDepth,
    stoopW,
    rotY: 0,
    normal: { x: 0, y: 0, z: 1 },
    facade: 'front'
  };
}

export function computeCornerEntranceLayout(seg, cfg) {
  const cut = seg.cornerCut || 0;
  const cx = seg.x + seg.w * 0.5 - cut * 0.5;
  const cz = seg.z + seg.d * 0.5 - cut * 0.5;
  const { width: doorWidth, height: doorHeight } = resolveDoorDimensions(cfg, false);
  const rotY = Math.PI / 4;
  const invSqrt2 = Math.SQRT1_2;
  return {
    cut,
    cx,
    wallZ: cz,
    wideDoor: false,
    doorWidth,
    doorHeight,
    steps: 0,
    stepH: 0,
    stepD: 0,
    landingD: 0,
    totalRise: 0,
    totalStepDepth: 0,
    stoopW: 0,
    rotY,
    normal: { x: invSqrt2, y: 0, z: invSqrt2 },
    facade: 'corner_front_right'
  };
}

export function computeRearEntranceLayout(groundSegments, cfg) {
  const primary = groundSegments[0];
  if (!primary) return null;
  const rearExt = groundSegments.find((s) => s.isExtension && s.extIndex === 0);
  const targetSeg = rearExt || primary;
  const segIndex = groundSegments.indexOf(targetSeg);
  const segId = segIndex === 0 ? 'segment_0_main' : `segment_${segIndex}_ext_${targetSeg.extIndex ?? 0}`;

  let cx = targetSeg.x;
  if (!rearExt) {
    const spanStart = primary.x - primary.w * 0.5 + 0.4;
    const spanEnd = primary.x + primary.w * 0.5 - 0.4;
    const spans = subtractIntervals(spanStart, spanEnd, primary.occlusions?.back || []);
    if (spans.length > 0) {
      spans.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
      cx = (spans[0][0] + spans[0][1]) * 0.5;
    }
  }

  const wallZ = targetSeg.z - targetSeg.d * 0.5;
  const style = cfg.rearDoorStyle || 'single';
  const wideDoor = style === 'double';
  const doorWidth = wideDoor ? 1.66 : (style === 'metal' ? 1.06 : 1.04);
  const doorHeight = clamp(cfg.floorHeight * 0.57, 1.96, 2.12);
  const stepH = 0.12;
  const stepD = 0.27;
  const landingD = 0.58;
  const steps = 1;

  return {
    cut: 0,
    usableW: targetSeg.w,
    cx,
    wallZ,
    wideDoor,
    doorWidth,
    doorHeight,
    steps,
    stepH,
    stepD,
    landingD,
    totalRise: stepH,
    totalStepDepth: landingD,
    stoopW: doorWidth + 0.5,
    rotY: Math.PI,
    normal: { x: 0, y: 0, z: -1 },
    facade: 'back',
    segmentIndex: segIndex,
    segmentId: segId
  };
}

export function computeSideEntranceLayout(groundSegments, cfg, side = 'left') {
  const primary = groundSegments[0];
  if (!primary) return null;
  const cut = side === 'right' ? (primary.cornerCut || 0) : 0;
  const spanStart = primary.z - primary.d * 0.5 + 0.45;
  const spanEnd = primary.z + primary.d * 0.5 - cut - 0.45;
  const spans = subtractIntervals(spanStart, spanEnd, primary.occlusions?.[side] || []);
  if (spans.length === 0) return null;
  spans.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  const cz = (spans[0][0] + spans[0][1]) * 0.5;
  const cx = side === 'left' ? primary.x - primary.w * 0.5 : primary.x + primary.w * 0.5;
  const rotY = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
  const normal = side === 'left' ? { x: -1, y: 0, z: 0 } : { x: 1, y: 0, z: 0 };
  const doorWidth = 1.35;
  const doorHeight = clamp(cfg.floorHeight * 0.65, 2.1, 2.4);
  const stepH = 0.12;
  const stepD = 0.35;
  const landingD = 0.65;

  return {
    cut: 0,
    usableW: spans[0][1] - spans[0][0],
    cx,
    wallZ: cz,
    wideDoor: false,
    doorWidth,
    doorHeight,
    steps: 1,
    stepH,
    stepD,
    landingD,
    totalRise: stepH,
    totalStepDepth: landingD,
    stoopW: doorWidth + 0.5,
    rotY,
    normal,
    facade: side,
    segmentIndex: 0,
    segmentId: 'segment_0_main'
  };
}

export function computeBasementEntranceLayout(groundSegments, cfg) {
  const primary = groundSegments[0];
  if (!primary) return null;
  const cut = primary.cornerCut || 0;
  const mainCx = primary.x - cut * 0.5;
  const minClearX = primary.x - primary.w * 0.5 + 0.9;
  const offsetDistance = Math.max(2.4, primary.w * 0.28);
  const cx = clamp(mainCx - offsetDistance, minClearX, mainCx - 1.8);
  const wallZ = primary.z + primary.d * 0.5;

  return {
    cut: 0,
    usableW: 1.8,
    cx,
    wallZ,
    wideDoor: false,
    doorWidth: 1.6,
    doorHeight: 1.25,
    steps: 0,
    stepH: 0,
    stepD: 0,
    landingD: 0,
    totalRise: 0,
    totalStepDepth: 1.5,
    stoopW: 1.8,
    rotY: 0,
    normal: { x: 0, y: 0, z: 1 },
    facade: 'front',
    segmentIndex: 0,
    segmentId: 'segment_0_main'
  };
}

export function computeDeliveryEntranceLayout(groundSegments, cfg) {
  const primary = groundSegments[0];
  if (!primary) return null;
  let side = cfg.rearEntrance ? 'left' : 'back';
  if (side === 'left') {
    const spanStart = primary.z - primary.d * 0.5 + 0.6;
    const spanEnd = primary.z + primary.d * 0.5 - 0.6;
    const spans = subtractIntervals(spanStart, spanEnd, primary.occlusions?.left || []);
    if (spans.length === 0 || spans[0][1] - spans[0][0] < 2.6) {
      side = 'back';
    }
  }

  let cx, cz, rotY, normal, facade;
  if (side === 'back') {
    const rearExt = groundSegments.find((s) => s.isExtension && s.extIndex === 0);
    const target = rearExt || primary;
    cx = target.x + (cfg.rearEntrance ? 1.5 : 0);
    cz = target.z - target.d * 0.5;
    rotY = Math.PI;
    normal = { x: 0, y: 0, z: -1 };
    facade = 'back';
  } else {
    cx = primary.x - primary.w * 0.5;
    cz = primary.z;
    rotY = -Math.PI / 2;
    normal = { x: -1, y: 0, z: 0 };
    facade = 'left';
  }

  return {
    cut: 0,
    usableW: 2.8,
    cx,
    wallZ: cz,
    wideDoor: true,
    doorWidth: 2.5,
    doorHeight: 2.55,
    steps: 1,
    stepH: 0.16,
    stepD: 0.45,
    landingD: 0.95,
    totalRise: 0.16,
    totalStepDepth: 0.95,
    stoopW: 3.0,
    rotY,
    normal,
    facade,
    segmentIndex: 0,
    segmentId: 'segment_0_main'
  };
}

export function computeRooftopEntranceLayout(topSegments, cfg) {
  const topSeg = topSegments[0];
  if (!topSeg) return null;
  const topRoofY = cfg.floors * cfg.floorHeight;
  const hW = Number(cfg.roofAccessWidth) || 2.4;
  const hD = Number(cfg.roofAccessDepth) || 3.2;
  const hH = Number(cfg.roofAccessHeight) || 2.3;
  const hx = 0;
  const hz = clamp(-topSeg.d * 0.15, -topSeg.d * 0.5 + hD * 0.5 + 0.8, topSeg.d * 0.5 - hD * 0.5 - 0.8);
  const doorSide = cfg.roofAccessDoorSide || 'front';

  let cx = hx;
  let wallZ = hz;
  let rotY = 0;
  let normal = { x: 0, y: 0, z: 1 };

  if (doorSide === 'front') {
    wallZ = hz + hD * 0.5;
    rotY = 0;
    normal = { x: 0, y: 0, z: 1 };
  } else if (doorSide === 'back') {
    wallZ = hz - hD * 0.5;
    rotY = Math.PI;
    normal = { x: 0, y: 0, z: -1 };
  } else if (doorSide === 'left') {
    cx = hx - hW * 0.5;
    rotY = -Math.PI / 2;
    normal = { x: -1, y: 0, z: 0 };
  } else if (doorSide === 'right') {
    cx = hx + hW * 0.5;
    rotY = Math.PI / 2;
    normal = { x: 1, y: 0, z: 0 };
  }

  return {
    cut: 0,
    usableW: hW,
    cx,
    wallZ,
    wideDoor: false,
    doorWidth: 1.15,
    doorHeight: Math.min(2.05, hH - 0.2),
    steps: 0,
    stepH: 0,
    stepD: 0,
    landingD: 0.6,
    totalRise: 0,
    totalStepDepth: 0.6,
    stoopW: 1.4,
    rotY,
    normal,
    facade: 'roof_' + doorSide,
    elevation: topRoofY,
    segmentIndex: 0,
    segmentId: 'segment_0_roof_headhouse'
  };
}

export function buildEntranceDefinition(layout, cfg, meta) {
  const autoDefaults = computeDefaultEntranceGameplay(cfg);
  const enabled = typeof cfg.entranceEnabled === 'boolean' ? cfg.entranceEnabled : autoDefaults.entranceEnabled;
  const category = meta.category || (OPTIONS.entranceCategory.some((x) => x[0] === cfg.entranceCategory)
    ? cfg.entranceCategory
    : autoDefaults.entranceCategory);
  const interactive = Boolean(enabled && category !== 'decorative');
  const decorative = !interactive;
  const lockedByDefault = typeof cfg.entranceLocked === 'boolean' ? cfg.entranceLocked : autoDefaults.entranceLocked;
  const interactionLabel = meta.interactionLabel || (String(cfg.interactionLabel ?? autoDefaults.interactionLabel).trim() || autoDefaults.interactionLabel);
  const maxDistance = roundNum(clamp(Number(cfg.interactionDistance) || autoDefaults.interactionDistance, 1.0, 8.0), 3);

  const isCorner = meta.role === 'corner_secondary';
  const trigW = roundNum(
    isCorner
      ? clamp(Math.min(Number(cfg.triggerWidth) || autoDefaults.triggerWidth, Math.max(1.8, layout.cut * Math.SQRT2)), 1.0, 8.0)
      : clamp(Number(cfg.triggerWidth) || autoDefaults.triggerWidth, 1.0, 8.0),
    3
  );
  const trigH = roundNum(
    isCorner
      ? clamp(Math.max(2.3, layout.doorHeight + 0.3), 1.8, 6.0)
      : clamp(Number(cfg.triggerHeight) || autoDefaults.triggerHeight, 1.8, 6.0),
    3
  );
  const trigD = roundNum(
    isCorner
      ? clamp(Math.min(Number(cfg.triggerDepth) || autoDefaults.triggerDepth, 2.2), 1.0, 8.0)
      : clamp(Number(cfg.triggerDepth) || autoDefaults.triggerDepth, 1.0, 8.0),
    3
  );

  const baseElev = Number(layout.elevation) || 0;
  const anchorX = roundNum(layout.cx, 4);
  const anchorY = roundNum(baseElev + layout.totalRise, 4);
  const anchorZ = roundNum(layout.wallZ, 4);
  const nx = roundNum(layout.normal.x, 4);
  const ny = roundNum(layout.normal.y, 4);
  const nz = roundNum(layout.normal.z, 4);
  const rotY = roundNum(layout.rotY, 4);
  const degreesY = roundNum((layout.rotY * 180) / Math.PI, 2);

  const doorWidth = roundNum(layout.doorWidth, 3);
  const doorHeight = roundNum(layout.doorHeight, 3);
  const thresholdElevation = roundNum(baseElev + layout.totalRise, 4);

  // Trigger center offset
  const offsetForward = roundNum(trigD * 0.5 - 0.25, 4);
  const offsetUp = roundNum(trigH * 0.5 - (thresholdElevation - baseElev), 4);
  const centerOffset = { x: 0, y: offsetUp, z: offsetForward };

  // Local trigger center
  const localCenter = {
    x: roundNum(anchorX + layout.normal.x * offsetForward, 4),
    y: roundNum(anchorY + offsetUp, 4),
    z: roundNum(anchorZ + layout.normal.z * offsetForward, 4)
  };

  // Navigation positions
  const stepFrontDist = layout.totalStepDepth;
  const approachDist = roundNum(stepFrontDist + 0.85, 4);
  const safeDist = roundNum(stepFrontDist + 1.75, 4);
  const landingDist = roundNum(layout.steps > 0 ? Math.min(layout.landingD * 0.5, 0.42) : 0.35, 4);

  const approachPosition = {
    x: roundNum(anchorX + layout.normal.x * approachDist, 4),
    y: roundNum(baseElev, 4),
    z: roundNum(anchorZ + layout.normal.z * approachDist, 4)
  };
  const safePosition = {
    x: roundNum(anchorX + layout.normal.x * safeDist, 4),
    y: roundNum(baseElev, 4),
    z: roundNum(anchorZ + layout.normal.z * safeDist, 4)
  };
  const landingPosition = {
    x: roundNum(anchorX + layout.normal.x * landingDist, 4),
    y: thresholdElevation,
    z: roundNum(anchorZ + layout.normal.z * landingDist, 4)
  };

  const enterYawRad = roundNum(Math.atan2(-layout.normal.x, -layout.normal.z), 4);
  const exitYawRad = roundNum(Math.atan2(layout.normal.x, layout.normal.z), 4);

  const playerFacing = {
    x: roundNum(-layout.normal.x, 4),
    y: 0,
    z: roundNum(-layout.normal.z, 4),
    yawRadians: enterYawRad,
    yawDegrees: roundNum((enterYawRad * 180) / Math.PI, 2)
  };
  const exitFacing = {
    x: nx,
    y: 0,
    z: nz,
    yawRadians: exitYawRad,
    yawDegrees: roundNum((exitYawRad * 180) / Math.PI, 2)
  };

  const effectiveDoorStyle = isCorner ? 'single' : (meta.doorStyle || cfg.doorStyle);

  const door = {
    position: { x: anchorX, y: anchorY, z: anchorZ },
    centerPosition: { x: anchorX, y: roundNum(anchorY + doorHeight * 0.5, 4), z: anchorZ },
    rotation: { x: 0, y: rotY, z: 0, degreesY },
    normal: { x: nx, y: ny, z: nz },
    width: doorWidth,
    height: doorHeight,
    thresholdElevation,
    segmentIndex: meta.segmentIndex,
    segmentId: meta.segmentId,
    facade: layout.facade,
    doorStyle: effectiveDoorStyle,
    isDouble: Boolean(layout.wideDoor)
  };

  const trigger = {
    shape: 'box',
    width: trigW,
    height: trigH,
    depth: trigD,
    centerOffset,
    localCenter,
    bounds: {
      min: {
        x: roundNum(-trigW * 0.5, 4),
        y: roundNum(offsetUp - trigH * 0.5, 4),
        z: roundNum(offsetForward - trigD * 0.5, 4)
      },
      max: {
        x: roundNum(trigW * 0.5, 4),
        y: roundNum(offsetUp + trigH * 0.5, 4),
        z: roundNum(offsetForward + trigD * 0.5, 4)
      }
    },
    maxDistance,
    requiresExplicitInteraction: interactive
  };

  const navigation = {
    approachPosition,
    safePosition,
    landingPosition,
    playerFacing,
    exitFacing,
    hasSteps: layout.steps > 0,
    stepCount: layout.steps,
    stepHeight: layout.steps > 0 ? roundNum(layout.stepH, 3) : 0,
    stepDepth: layout.steps > 0 ? roundNum(layout.stepD, 3) : 0,
    landingDepth: layout.steps > 0 ? roundNum(layout.landingD, 3) : 0,
    totalStepDepth: roundNum(layout.totalStepDepth, 4),
    stoopWidth: layout.steps > 0 ? roundNum(layout.stoopW, 3) : 0,
    hasElevatedLanding: thresholdElevation > 0,
    landingElevation: thresholdElevation
  };

  const gameplay = {
    category,
    enabled,
    interactive,
    decorative,
    lockedByDefault,
    interactionLabel: isCorner && interactionLabel === 'Enter Building' ? 'Enter Corner Shop' : interactionLabel,
    requiresExplicitInteraction: interactive
  };

  return {
    id: meta.id,
    label: meta.label,
    role: meta.role,
    category: gameplay.category,
    enabled: gameplay.enabled,
    interactive: gameplay.interactive,
    decorative: gameplay.decorative,
    lockedByDefault: gameplay.lockedByDefault,
    interactionLabel: gameplay.interactionLabel,
    position: door.position,
    centerPosition: door.centerPosition,
    rotation: door.rotation,
    normal: door.normal,
    width: door.width,
    height: door.height,
    thresholdElevation: door.thresholdElevation,
    segmentIndex: door.segmentIndex,
    segmentId: door.segmentId,
    facade: door.facade,
    doorStyle: door.doorStyle,
    isDouble: door.isDouble,
    triggerShape: trigger.shape,
    triggerWidth: trigger.width,
    triggerHeight: trigger.height,
    triggerDepth: trigger.depth,
    triggerCenterOffset: trigger.centerOffset,
    maxInteractionDistance: trigger.maxDistance,
    requiresExplicitInteraction: trigger.requiresExplicitInteraction,
    approachPosition: navigation.approachPosition,
    safePosition: navigation.safePosition,
    landingPosition: navigation.landingPosition,
    playerFacing: navigation.playerFacing,
    exitFacing: navigation.exitFacing,
    hasSteps: navigation.hasSteps,
    stepCount: navigation.stepCount,
    stepHeight: navigation.stepHeight,
    stepDepth: navigation.stepDepth,
    landingDepth: navigation.landingDepth,
    totalStepDepth: navigation.totalStepDepth,
    hasElevatedLanding: navigation.hasElevatedLanding,
    landingElevation: navigation.landingElevation,
    door,
    trigger,
    navigation,
    gameplay
  };
}

export function computeBuildingEntrances(rawCfg, groundSegmentsInput = null) {
  const cfg = sanitisePreset(rawCfg);
  const groundSegments = groundSegmentsInput || segmentsForFloor(cfg, 0);
  const primary = groundSegments[0];
  if (!primary) return [];

  const entrances = [];
  const mainLayout = computePrimaryEntranceLayout(primary, cfg);
  entrances.push(
    buildEntranceDefinition(mainLayout, cfg, {
      id: 'entrance_main',
      label: cfg.groundUse === 'shop' ? 'Main Storefront Entrance' : cfg.groundUse === 'lobby' ? 'Main Lobby Entrance' : 'Main Building Entrance',
      role: 'main',
      segmentIndex: 0,
      segmentId: 'segment_0_main'
    })
  );

  if (cfg.groundUse === 'shop') {
    for (let j = 0; j < groundSegments.length; j++) {
      const seg = groundSegments[j];
      if ((seg.cornerCut || 0) > 0.05) {
        const cornerLayout = computeCornerEntranceLayout(seg, cfg);
        const id = j === 0 ? 'entrance_corner' : `entrance_corner_${j}`;
        entrances.push(
          buildEntranceDefinition(cornerLayout, cfg, {
            id,
            label: 'Corner Storefront Entrance',
            role: 'corner_secondary',
            segmentIndex: j,
            segmentId: j === 0 ? 'segment_0_main' : `segment_${j}_wing`
          })
        );
      }
    }
  }

  if (cfg.rearEntrance) {
    const rearLayout = computeRearEntranceLayout(groundSegments, cfg);
    if (rearLayout) {
      entrances.push(
        buildEntranceDefinition(rearLayout, cfg, {
          id: 'entrance_rear',
          label: 'Rear Service Entrance',
          role: 'rear_service',
          category: 'service',
          doorStyle: cfg.rearDoorStyle || 'single',
          segmentIndex: rearLayout.segmentIndex,
          segmentId: rearLayout.segmentId,
          interactionLabel: 'Enter Service Door'
        })
      );
    }
  }

  if (cfg.sideEntrance === 'left' || cfg.sideEntrance === 'both') {
    const sideLeftLayout = computeSideEntranceLayout(groundSegments, cfg, 'left');
    if (sideLeftLayout) {
      entrances.push(
        buildEntranceDefinition(sideLeftLayout, cfg, {
          id: 'entrance_side_left',
          label: 'Left Side Entrance',
          role: 'side_left',
          category: 'secondary',
          doorStyle: 'single',
          segmentIndex: sideLeftLayout.segmentIndex,
          segmentId: sideLeftLayout.segmentId,
          interactionLabel: 'Enter Side Door'
        })
      );
    }
  }

  if (cfg.sideEntrance === 'right' || cfg.sideEntrance === 'both') {
    const sideRightLayout = computeSideEntranceLayout(groundSegments, cfg, 'right');
    if (sideRightLayout) {
      entrances.push(
        buildEntranceDefinition(sideRightLayout, cfg, {
          id: 'entrance_side_right',
          label: 'Right Side Entrance',
          role: 'side_right',
          category: 'secondary',
          doorStyle: 'single',
          segmentIndex: sideRightLayout.segmentIndex,
          segmentId: sideRightLayout.segmentId,
          interactionLabel: 'Enter Side Door'
        })
      );
    }
  }

  if (cfg.basementEntrance) {
    const baseLayout = computeBasementEntranceLayout(groundSegments, cfg);
    if (baseLayout) {
      entrances.push(
        buildEntranceDefinition(baseLayout, cfg, {
          id: 'entrance_basement',
          label: 'Basement Cellar Entrance',
          role: 'basement_access',
          category: 'service',
          doorStyle: 'single',
          segmentIndex: baseLayout.segmentIndex,
          segmentId: baseLayout.segmentId,
          interactionLabel: 'Access Basement'
        })
      );
    }
  }

  if (cfg.deliveryEntrance) {
    const delivLayout = computeDeliveryEntranceLayout(groundSegments, cfg);
    if (delivLayout) {
      entrances.push(
        buildEntranceDefinition(delivLayout, cfg, {
          id: 'entrance_delivery',
          label: 'Commercial Delivery Bay',
          role: 'delivery_entrance',
          category: 'service',
          doorStyle: 'double',
          segmentIndex: delivLayout.segmentIndex,
          segmentId: delivLayout.segmentId,
          interactionLabel: 'Delivery Bay'
        })
      );
    }
  }

  if (cfg.roofAccess) {
    const topSegments = segmentsForFloor(cfg, Math.max(0, cfg.floors - 1));
    const roofLayout = computeRooftopEntranceLayout(topSegments, cfg);
    if (roofLayout) {
      entrances.push(
        buildEntranceDefinition(roofLayout, cfg, {
          id: 'entrance_roof',
          label: 'Rooftop Stairwell Access',
          role: 'roof_access',
          category: 'roof_access',
          doorStyle: 'single',
          segmentIndex: roofLayout.segmentIndex,
          segmentId: roofLayout.segmentId,
          interactionLabel: 'Enter Stairwell'
        })
      );
    }
  }

  return entrances;
}

export function computePlayerReferenceSpots(blueprint) {
  const spots = [];
  const mainEnt = blueprint?.entrances?.find((e) => e.id === 'entrance_main' || e.role === 'main') || blueprint?.entrances?.[0];
  if (mainEnt) {
    const nrm = mainEnt.approachNormal || { x: 0, z: 1 };
    const faceWallYaw = Math.atan2(-(nrm.x || 0), -(nrm.z || 1));
    const landingPos = mainEnt.navigation?.landingPosition || mainEnt.position;
    if (landingPos) {
      spots.push({
        id: 'front_door',
        label: 'Front Door',
        position: {
          x: roundNum(landingPos.x, 3),
          y: roundNum(mainEnt.navigation?.landingElevation ?? landingPos.y ?? 0, 3),
          z: roundNum(landingPos.z, 3)
        },
        yawRadians: roundNum(faceWallYaw, 4)
      });
    }
    const approachPos = mainEnt.navigation?.approachPosition;
    if (approachPos) {
      spots.push({
        id: 'front_stoop',
        label: 'Front Stoop',
        position: {
          x: roundNum(approachPos.x, 3),
          y: 0,
          z: roundNum(approachPos.z, 3)
        },
        yawRadians: roundNum(faceWallYaw, 4)
      });
    }
  }

  const fe = blueprint?.metadata?.fireEscape;
  if (fe && Array.isArray(fe.components)) {
    const landings = fe.components.filter((c) => c.type === 'landing');
    const fl1 = landings.find((l) => l.id === 'fe_landing_f1') || landings[0];
    const topL = landings[landings.length - 1];
    const dropLadder = fe.components.find((c) => c.id === 'fe_ladder_drop');
    const roofLadder = fe.components.find((c) => c.id === 'fe_ladder_roof');
    const streetFlight = fe.components.find((c) => c.id === 'fe_flight_f0_to_f1');
    if (fl1 && fl1.position && fl1.orientation) {
      const nrm = fl1.orientation;
      const tan = { x: nrm.z, z: -nrm.x };
      const deckW = fl1.dimensions?.width || 2.8;
      const deckD = fl1.dimensions?.depth || 2.25;
      const faceLeftYaw = Math.atan2(-tan.x, -tan.z);

      if (dropLadder && dropLadder.position) {
        const ladderNrm = dropLadder.orientation || nrm;
        spots.push({
          id: 'drop_ladder',
          label: 'Drop Ladder',
          position: {
            x: roundNum(dropLadder.position.x + ladderNrm.x * 0.45, 3),
            y: 0,
            z: roundNum(dropLadder.position.z + ladderNrm.z * 0.45, 3)
          },
          yawRadians: roundNum(Math.atan2(-ladderNrm.x, -ladderNrm.z), 4)
        });
      } else if (streetFlight && streetFlight.start) {
        spots.push({
          id: 'drop_ladder',
          label: 'Street Stair Entry',
          position: {
            x: roundNum(streetFlight.start.x + tan.x * 0.45, 3),
            y: 0,
            z: roundNum(streetFlight.start.z + tan.z * 0.45, 3)
          },
          yawRadians: roundNum(faceLeftYaw, 4)
        });
      } else {
        spots.push({
          id: 'drop_ladder',
          label: 'Drop Ladder',
          position: {
            x: roundNum(fl1.position.x + nrm.x * (deckD * 0.05) + tan.x * (deckW * 0.5 + 0.55), 3),
            y: 0,
            z: roundNum(fl1.position.z + nrm.z * (deckD * 0.05) + tan.z * (deckW * 0.5 + 0.55), 3)
          },
          yawRadians: roundNum(faceLeftYaw, 4)
        });
      }

      const fl1Y = roundNum(fl1.topSurfaceElevation ?? fl1.elevation ?? 3.4, 3);
      const standSign = fe.layoutStyle === 'alternating_switchback' ? -1 : 1;
      spots.push({
        id: 'stair_landing',
        label: 'Stair Landing',
        position: {
          x: roundNum(fl1.position.x + tan.x * standSign * (deckW * 0.5 - 0.50), 3),
          y: fl1Y,
          z: roundNum(fl1.position.z + tan.z * standSign * (deckW * 0.5 - 0.50), 3)
        },
        yawRadians: roundNum(fe.layoutStyle === 'alternating_switchback' ? Math.atan2(tan.x, tan.z) : faceLeftYaw, 4)
      });

      if (topL && topL.position && fe.hasRoofAccess !== false) {
        const topY = roundNum(topL.topSurfaceElevation ?? topL.elevation ?? fl1Y, 3);
        if (roofLadder && roofLadder.position) {
          const rNrm = roofLadder.orientation || nrm;
          spots.push({
            id: 'roof_access',
            label: 'Roof Access',
            position: {
              x: roundNum(roofLadder.position.x + rNrm.x * 0.48, 3),
              y: topY,
              z: roundNum(roofLadder.position.z + rNrm.z * 0.48, 3)
            },
            yawRadians: roundNum(Math.atan2(-rNrm.x, -rNrm.z), 4)
          });
        } else {
          const roofZOff = Math.min(deckD * 0.55, 0.78) - deckD * 0.5;
          spots.push({
            id: 'roof_access',
            label: 'Roof Access',
            position: {
              x: roundNum(topL.position.x + nrm.x * roofZOff - tan.x * (deckW * 0.5 - 0.50), 3),
              y: topY,
              z: roundNum(topL.position.z + nrm.z * roofZOff - tan.z * (deckW * 0.5 - 0.50), 3)
            },
            yawRadians: roundNum(faceLeftYaw, 4)
          });
        }
      }
    }
  }

  const tall = blueprint?.metadata?.tallStaircase;
  if (blueprint?.metadata?.hasTallStaircase && tall && Array.isArray(tall.landings) && tall.landings.length) {
    const entryL = tall.landings[0];
    const topTall = tall.landings[tall.landings.length - 1];
    if (entryL?.position) {
      spots.push({
        id: 'tall_stair_entry',
        label: 'Tall Stair Entry',
        position: {
          x: roundNum(entryL.position.x, 3),
          y: roundNum(entryL.topSurfaceElevation ?? entryL.elevation ?? 0, 3),
          z: roundNum(entryL.position.z, 3)
        },
        yawRadians: 0
      });
    }
    if (topTall?.position) {
      spots.push({
        id: 'tall_stair_landing',
        label: 'Tall Stair Landing',
        position: {
          x: roundNum(topTall.position.x, 3),
          y: roundNum(topTall.topSurfaceElevation ?? topTall.elevation ?? 0, 3),
          z: roundNum(topTall.position.z, 3)
        },
        yawRadians: 0
      });
    }
  }

  return spots;
}
