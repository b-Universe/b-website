import { clamp, roundNum } from '../utils.js';
import { OPTIONS, sanitisePreset } from '../config.js';
import { segmentsForFloor } from './layouts.js';

export function computeDefaultEntranceGameplay(cfg) {
  const groundUse = cfg.groundUse || 'residential';
  const doorStyle = cfg.doorStyle || 'stoop';
  const floorHeight = Number(cfg.floorHeight) || 3.3;
  const rawSteps = Number.isFinite(Number(cfg.entranceSteps)) ? Number(cfg.entranceSteps) : 3;
  const wideDoor = doorStyle === 'double' || groundUse === 'lobby' || groundUse === 'shop';
  const doorWidth = wideDoor ? 2.5 : 1.55;
  const doorHeight = floorHeight * 0.68;
  const steps = groundUse === 'shop' ? 0 : (doorStyle === 'stoop' ? Math.max(1, rawSteps) : rawSteps);
  const stepH = 0.14;
  const stepD = 0.34;
  const landingD = doorStyle === 'stoop' ? 0.95 : 0.65;
  const totalRise = steps * stepH;
  const totalStepDepth = steps > 0 ? landingD + (steps - 1) * stepD : 0;
  const stoopW = wideDoor ? 3.2 : 2.4;

  const triggerWidth = Number(clamp(Math.max(doorWidth + 0.85, steps > 0 ? stoopW : 2.4), 1.0, 8.0).toFixed(1));
  const triggerHeight = Number(clamp(Math.max(2.4, doorHeight + totalRise + 0.35), 1.8, 6.0).toFixed(1));
  const triggerDepth = Number(clamp(Math.max(1.8, totalStepDepth + 1.35), 1.0, 8.0).toFixed(1));

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
  const doorWidth = wideDoor ? 2.5 : 1.55;
  const doorHeight = cfg.floorHeight * 0.68;
  const steps = cfg.groundUse === 'shop' ? 0 : (cfg.doorStyle === 'stoop' ? Math.max(1, cfg.entranceSteps) : cfg.entranceSteps);
  const stepH = 0.14;
  const stepD = 0.34;
  const landingD = cfg.doorStyle === 'stoop' ? 0.95 : 0.65;
  const totalRise = steps * stepH;
  const totalStepDepth = steps > 0 ? landingD + (steps - 1) * stepD : 0;
  const stoopW = wideDoor ? 3.2 : 2.4;
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
  const doorWidth = 1.55;
  const doorHeight = cfg.floorHeight * 0.68;
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

export function buildEntranceDefinition(layout, cfg, meta) {
  const autoDefaults = computeDefaultEntranceGameplay(cfg);
  const enabled = typeof cfg.entranceEnabled === 'boolean' ? cfg.entranceEnabled : autoDefaults.entranceEnabled;
  const category = OPTIONS.entranceCategory.some((x) => x[0] === cfg.entranceCategory)
    ? cfg.entranceCategory
    : autoDefaults.entranceCategory;
  const interactive = Boolean(enabled && category !== 'decorative');
  const decorative = !interactive;
  const lockedByDefault = typeof cfg.entranceLocked === 'boolean' ? cfg.entranceLocked : autoDefaults.entranceLocked;
  const interactionLabel = String(cfg.interactionLabel ?? autoDefaults.interactionLabel).trim() || autoDefaults.interactionLabel;
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

  const anchorX = roundNum(layout.cx, 4);
  const anchorY = roundNum(layout.totalRise, 4);
  const anchorZ = roundNum(layout.wallZ, 4);
  const nx = roundNum(layout.normal.x, 4);
  const ny = roundNum(layout.normal.y, 4);
  const nz = roundNum(layout.normal.z, 4);
  const rotY = roundNum(layout.rotY, 4);
  const degreesY = roundNum((layout.rotY * 180) / Math.PI, 2);

  const doorWidth = roundNum(layout.doorWidth, 3);
  const doorHeight = roundNum(layout.doorHeight, 3);
  const thresholdElevation = roundNum(layout.totalRise, 4);

  // Trigger center offset
  const offsetForward = roundNum(trigD * 0.5 - 0.25, 4);
  const offsetUp = roundNum(trigH * 0.5 - thresholdElevation, 4);
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
    y: 0,
    z: roundNum(anchorZ + layout.normal.z * approachDist, 4)
  };
  const safePosition = {
    x: roundNum(anchorX + layout.normal.x * safeDist, 4),
    y: 0,
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

  const effectiveDoorStyle = isCorner ? 'single' : cfg.doorStyle;

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

  return entrances;
}
