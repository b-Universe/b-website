import { clamp, roundNum, hashBlueprintString } from '../utils.js';
import {
  BLUEPRINT_SCHEMA_VERSION,
  ASSEMBLY_SCHEMA_VERSION,
  B_UNITS_PER_METER,
  GENERATOR_META,
  ATTACHMENT_PROFILES,
  CONDITION_LEVELS
} from './categories.js';
import { getObjectFamily, getObjectPreset, getCategoryMeta, hasObjectFamily } from './registry.js';

export function bpVecToBUnits(x = 0, y = 0, z = 0) {
  return {
    x: roundNum(x * B_UNITS_PER_METER, 3),
    y: roundNum(-z * B_UNITS_PER_METER, 3),
    z: roundNum(y * B_UNITS_PER_METER, 3)
  };
}

export function bpComputeMeshStats(root) {
  let meshCount = 0;
  let vertexCount = 0;
  let triangleCount = 0;
  let hasInstancedMesh = false;

  if (root) {
    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      if (obj.isInstancedMesh) hasInstancedMesh = true;
      if (!obj.isMesh || !obj.geometry) return;
      meshCount += 1;
      const pos = obj.geometry.attributes?.position;
      const idx = obj.geometry.index;
      if (pos) vertexCount += pos.count;
      if (idx) {
        triangleCount += Math.floor(idx.count / 3);
      } else if (pos) {
        triangleCount += Math.floor(pos.count / 3);
      }
    });
  }

  let min = { x: 0, y: 0, z: 0 };
  let max = { x: 0, y: 0, z: 0 };
  if (root && meshCount > 0 && typeof THREE !== 'undefined' && THREE.Box3) {
    const box = new THREE.Box3().setFromObject(root);
    if (!box.isEmpty()) {
      min = {
        x: roundNum(box.min.x, 4),
        y: roundNum(box.min.y, 4),
        z: roundNum(box.min.z, 4)
      };
      max = {
        x: roundNum(box.max.x, 4),
        y: roundNum(box.max.y, 4),
        z: roundNum(box.max.z, 4)
      };
    }
  }

  const sizeX = roundNum(Math.max(0, max.x - min.x), 4);
  const sizeY = roundNum(Math.max(0, max.y - min.y), 4);
  const sizeZ = roundNum(Math.max(0, max.z - min.z), 4);
  const center = {
    x: roundNum((min.x + max.x) * 0.5, 4),
    y: roundNum((min.y + max.y) * 0.5, 4),
    z: roundNum((min.z + max.z) * 0.5, 4)
  };

  return {
    meshCount,
    vertexCount,
    triangleCount,
    hasInstancedMesh,
    min,
    max,
    sizeX,
    sizeY,
    sizeZ,
    center
  };
}

export function computeObjectPlacementAndBounds(cfg, stats, runtimeMeta = {}) {
  const profile = ATTACHMENT_PROFILES[cfg.attachmentProfile] || ATTACHMENT_PROFILES.ground_standing;
  const halfX = roundNum(Math.max(0.02, stats.sizeX * 0.5), 4);
  const halfY = roundNum(Math.max(0.02, stats.sizeY * 0.5), 4);
  const halfZ = roundNum(Math.max(0.02, stats.sizeZ * 0.5), 4);

  const collisionDisabled = Boolean(profile.passable || runtimeMeta.passable);
  const anchors = Array.isArray(runtimeMeta.snapAnchors)
    ? runtimeMeta.snapAnchors.map((a) => ({
      id: a.id,
      positionMeters: (a.position || [0, 0, 0]).map((v) => roundNum(v, 4)),
      bGamePosition: bpVecToBUnits(a.position?.[0] || 0, a.position?.[1] || 0, a.position?.[2] || 0),
      normal: a.normal || [0, 1, 0]
    }))
    : [];

  return {
    attachmentProfile: profile.id,
    attachmentLabel: profile.label,
    originRule: profile.originDesc,
    surfaceNormal: [...profile.surfaceNormal],
    requiresWall: Boolean(profile.requiresWall),
    flushEmbed: Boolean(profile.flushEmbed),
    defaultStage: profile.defaultStage,
    surfaceRelationship: runtimeMeta.surfaceRelationship || null,
    anchors,
    elevationOffsetMeters: roundNum(runtimeMeta.elevationOffset || 0, 4),
    footprintMeters: {
      width: stats.sizeX,
      depth: stats.sizeZ,
      areaSqMeters: roundNum(stats.sizeX * stats.sizeZ, 4)
    },
    collisionProxy: {
      shape: 'box',
      passable: collisionDisabled,
      centerMeters: [stats.center.x, stats.center.y, stats.center.z],
      halfExtentsMeters: [halfX, halfY, halfZ],
      bGameCenter: bpVecToBUnits(stats.center.x, stats.center.y, stats.center.z),
      bGameHalfExtents: {
        x: roundNum(halfX * B_UNITS_PER_METER, 3),
        y: roundNum(halfZ * B_UNITS_PER_METER, 3),
        z: roundNum(halfY * B_UNITS_PER_METER, 3)
      }
    }
  };
}

export function bpExtractDisplaySurfaces(root) {
  const surfaces = [];
  if (!root || typeof root.traverse !== 'function') return surfaces;
  if (typeof root.updateMatrixWorld === 'function') {
    root.updateMatrixWorld(true);
  }
  const rootInv = new THREE.Matrix4();
  if (root.matrixWorld) {
    rootInv.copy(root.matrixWorld).invert();
  }
  const relMat = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');

  root.traverse((obj) => {
    if (!obj || !obj.isMesh || !obj.userData) return;
    const isScreen = obj.userData.materialRole === 'screenFace' || Boolean(obj.userData.screenSurface);
    if (!isScreen) return;
    const meta = obj.userData.screenSurface || {};
    const geomParams = obj.geometry && obj.geometry.parameters ? obj.geometry.parameters : {};
    const widthM = Number(meta.widthMeters || geomParams.width || 0.4);
    const heightM = Number(meta.heightMeters || geomParams.height || 0.3);
    const hw = widthM * 0.5;
    const hh = heightM * 0.5;

    relMat.multiplyMatrices(rootInv, obj.matrixWorld);
    quat.setFromRotationMatrix(relMat);
    euler.setFromQuaternion(quat, 'YXZ');

    const centerVec = new THREE.Vector3(0, 0, 0).applyMatrix4(relMat);
    const normalVec = new THREE.Vector3(0, 0, 1).transformDirection(relMat).normalize();
    const localCorners = [
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(-hw, -hh, 0)
    ];
    const cornerOrder = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    const corners = localCorners.map((pt, idx) => {
      pt.applyMatrix4(relMat);
      return {
        corner: cornerOrder[idx],
        meters: { x: roundNum(pt.x, 4), y: roundNum(pt.y, 4), z: roundNum(pt.z, 4) },
        bGame: bpVecToBUnits(pt.x, pt.y, pt.z)
      };
    });

    const fovDeg = 42;
    const halfMaxDim = Math.max(hw, hh);
    const fitDistance = clamp(
      (halfMaxDim / Math.tan((fovDeg * 0.5 * Math.PI) / 180)) * 1.45,
      0.38,
      2.6
    );
    const camPos = centerVec.clone().addScaledVector(normalVec, fitDistance);

    surfaces.push({
      id: `${meta.role || 'display_screen'}_${surfaces.length + 1}`,
      meshName: obj.name || `ScreenFace_${surfaces.length + 1}`,
      role: meta.role || 'display_screen',
      screenMode: meta.mode || 'desktop_ui',
      shape: meta.shape || 'flat_lcd',
      isCurvedCRT: Boolean(meta.isCurvedCRT),
      centerPosition: {
        x: roundNum(centerVec.x, 4),
        y: roundNum(centerVec.y, 4),
        z: roundNum(centerVec.z, 4)
      },
      normal: {
        x: roundNum(normalVec.x, 4),
        y: roundNum(normalVec.y, 4),
        z: roundNum(normalVec.z, 4)
      },
      rotation: {
        x: roundNum(euler.x, 4),
        y: roundNum(euler.y, 4),
        z: roundNum(euler.z, 4),
        degreesY: roundNum((euler.y * 180) / Math.PI, 2),
        degreesX: roundNum((euler.x * 180) / Math.PI, 2)
      },
      width: roundNum(widthM, 4),
      height: roundNum(heightM, 4),
      aspectRatio: roundNum(widthM / Math.max(0.01, heightM), 4),
      bGameCenter: bpVecToBUnits(centerVec.x, centerVec.y, centerVec.z),
      bGameSize: {
        width: roundNum(widthM * B_UNITS_PER_METER, 3),
        height: roundNum(heightM * B_UNITS_PER_METER, 3)
      },
      corners,
      zoomCamera: {
        cameraPositionMeters: { x: roundNum(camPos.x, 4), y: roundNum(camPos.y, 4), z: roundNum(camPos.z, 4) },
        lookAtMeters: { x: roundNum(centerVec.x, 4), y: roundNum(centerVec.y, 4), z: roundNum(centerVec.z, 4) },
        bGameCameraPosition: bpVecToBUnits(camPos.x, camPos.y, camPos.z),
        bGameLookAt: bpVecToBUnits(centerVec.x, centerVec.y, centerVec.z),
        viewDistanceMeters: roundNum(fitDistance, 4),
        fovDeg
      }
    });
  });

  return surfaces;
}

export function generateObjectBlueprint(cfg, root, runtimeMeta = {}) {
  const family = getObjectFamily(cfg.familyId);
  const preset = getObjectPreset(cfg.presetId);
  const category = getCategoryMeta(family?.categoryId || '01_postal');
  const stats = bpComputeMeshStats(root);
  const placement = computeObjectPlacementAndBounds(cfg, stats, {
    ...runtimeMeta,
    surfaceRelationship: runtimeMeta.surfaceRelationship || family?.surfaceRelationship || null
  });
  const conditionMeta = CONDITION_LEVELS.find((c) => c.id === cfg.condition) || CONDITION_LEVELS[1];

  const isAssembly = Boolean(family?.isAssembly || (runtimeMeta.components && runtimeMeta.components.length));
  const schemaVersion = isAssembly ? ASSEMBLY_SCHEMA_VERSION : BLUEPRINT_SCHEMA_VERSION;
  const canonicalPayload = JSON.stringify({ cfg, isAssembly, components: runtimeMeta.components || null });
  const revisionHash = hashBlueprintString(canonicalPayload);

  const lightSources = Array.isArray(runtimeMeta.lightSources)
    ? runtimeMeta.lightSources.map((ls, index) => ({
      id: ls.id || `light_${index + 1}`,
      positionMeters: (ls.position || [0, 1, 0]).map((v) => roundNum(v, 4)),
      bGamePosition: bpVecToBUnits(ls.position?.[0] || 0, ls.position?.[1] || 1, ls.position?.[2] || 0),
      color: ls.color || cfg.emissiveColor || '#ffe394',
      radiusMeters: roundNum(ls.radius || 5, 2),
      enabled: ls.enabled !== false
    }))
    : [];

  const displaySurfaces = bpExtractDisplaySurfaces(root);
  const baseInteraction = runtimeMeta.interaction || family?.interaction || {
    interactable: false,
    actionType: 'decorative_prop'
  };
  const interaction = displaySurfaces.length > 0
    ? { ...baseInteraction, screens: displaySurfaces }
    : { ...baseInteraction };

  const blueprint = {
    schemaVersion,
    generator: { ...GENERATOR_META },
    identity: {
      familyId: family?.id || cfg.familyId,
      familyLabel: family?.label || cfg.familyId,
      presetId: cfg.presetId,
      presetLabel: preset?.label || family?.label || cfg.presetId,
      categoryId: category.id,
      categoryLabel: category.label,
      subcategory: family?.subcategory || category.subcategories[0],
      locationContext: family?.locationContext || 'exterior',
      environmentTags: [...(family?.environmentTags || [])],
      seed: cfg.seed,
      variationMode: cfg.variationMode || 'moderate',
      architecturalStyle: family?.architecturalStyle || 'municipal',
      sizeClass: family?.sizeClass || 'medium',
      functionalRole: family?.functionalRole || 'functional',
      tags: [...(family?.tags || [])],
      revisionHash
    },
    condition: {
      level: conditionMeta.id,
      label: conditionMeta.label,
      wearScore: conditionMeta.wearScore,
      supportsWeatheringVariants: true
    },
    placement,
    dimensions: {
      widthMeters: stats.sizeX,
      heightMeters: stats.sizeY,
      depthMeters: stats.sizeZ,
      volumeCubicMeters: roundNum(stats.sizeX * stats.sizeY * stats.sizeZ, 4),
      boundsMeters: {
        min: stats.min,
        max: stats.max,
        center: stats.center
      },
      bGameUnits: {
        scalePerMeter: B_UNITS_PER_METER,
        width: roundNum(stats.sizeX * B_UNITS_PER_METER, 3),
        depth: roundNum(stats.sizeZ * B_UNITS_PER_METER, 3),
        height: roundNum(stats.sizeY * B_UNITS_PER_METER, 3),
        min: bpVecToBUnits(stats.min.x, stats.min.y, stats.min.z),
        max: bpVecToBUnits(stats.max.x, stats.max.y, stats.max.z),
        center: bpVecToBUnits(stats.center.x, stats.center.y, stats.center.z)
      }
    },
    materials: {
      paletteFamily: cfg.paletteFamily,
      slots: [...(family?.materialSlots || ['primary', 'secondary', 'frame'])],
      primaryMaterial: cfg.primaryMaterial,
      primaryColor: cfg.primaryColor,
      secondaryMaterial: cfg.secondaryMaterial,
      secondaryColor: cfg.secondaryColor,
      accentMaterial: cfg.accentMaterial,
      accentColor: cfg.accentColor,
      frameMaterial: cfg.frameMaterial,
      frameColor: cfg.frameColor,
      woodColor: cfg.woodColor,
      concreteColor: cfg.concreteColor,
      glassColor: cfg.glassColor,
      emissiveColor: cfg.emissiveColor
    },
    lighting: {
      lightingTime: cfg.lightingTime || 'day',
      lightCount: lightSources.length,
      lightSources
    },
    interaction,
    displaySurfaces,
    geometryStats: {
      meshCount: stats.meshCount,
      vertexCount: stats.vertexCount,
      triangleCount: stats.triangleCount,
      hasInstancedMesh: stats.hasInstancedMesh
    },
    parameters: { ...cfg }
  };

  if (isAssembly && Array.isArray(runtimeMeta.components)) {
    blueprint.components = runtimeMeta.components.map((comp) => ({
      componentId: comp.componentId,
      familyId: comp.familyId,
      presetId: comp.presetId,
      label: comp.label,
      attachmentProfile: comp.attachmentProfile,
      localPositionMeters: comp.localPositionMeters.map((v) => roundNum(v, 4)),
      localRotationDeg: comp.localRotationDeg.map((v) => roundNum(v, 2)),
      localScale: roundNum(comp.localScale || 1, 4),
      bGameLocalPosition: bpVecToBUnits(
        comp.localPositionMeters[0] || 0,
        comp.localPositionMeters[1] || 0,
        comp.localPositionMeters[2] || 0
      ),
      revisionHash: comp.revisionHash || null
    }));
  }

  return blueprint;
}

export function validateObjectBlueprint(bp) {
  const errors = [];
  if (!bp || typeof bp !== 'object') {
    return { valid: false, errors: ['Blueprint must be an object'] };
  }
  if (bp.schemaVersion !== BLUEPRINT_SCHEMA_VERSION && bp.schemaVersion !== ASSEMBLY_SCHEMA_VERSION) {
    errors.push(`Unexpected schemaVersion: ${bp.schemaVersion}`);
  }
  if (!bp.identity || !bp.identity.familyId || !bp.identity.revisionHash) {
    errors.push('Missing identity metadata');
  }
  if (!bp.placement || !bp.placement.collisionProxy || !bp.placement.attachmentProfile) {
    errors.push('Missing placement or collisionProxy metadata');
  }
  if (!bp.dimensions || !bp.dimensions.bGameUnits) {
    errors.push('Missing dimensions or bGameUnits');
  }
  if (!bp.geometryStats || bp.geometryStats.meshCount <= 0 || bp.geometryStats.triangleCount <= 0) {
    errors.push('Geometry stats report zero meshes or triangles');
  }
  if (bp.geometryStats && bp.geometryStats.hasInstancedMesh) {
    errors.push('InstancedMesh detected; must emit standard Mesh objects for Glb export');
  }
  if (!bp.materials || typeof bp.materials !== 'object') {
    errors.push('Missing materials metadata');
  }
  if (!bp.parameters || typeof bp.parameters !== 'object') {
    errors.push('Missing parameters payload');
  }
  if (!bp.lighting || typeof bp.lighting !== 'object') {
    errors.push('Missing lighting metadata');
  }
  if (bp.displaySurfaces !== undefined) {
    if (!Array.isArray(bp.displaySurfaces)) {
      errors.push('displaySurfaces must be an array');
    } else {
      for (let i = 0; i < bp.displaySurfaces.length; i++) {
        const ds = bp.displaySurfaces[i];
        if (!ds || !ds.centerPosition || !ds.normal || !Array.isArray(ds.corners) || ds.corners.length !== 4 || !ds.zoomCamera) {
          errors.push(`displaySurfaces[${i}] missing required transform or zoomCamera metadata`);
          break;
        }
      }
    }
  }
  if (bp.schemaVersion === ASSEMBLY_SCHEMA_VERSION) {
    if (!Array.isArray(bp.components) || bp.components.length === 0) {
      errors.push('Assembly blueprint missing components array');
    } else {
      for (let i = 0; i < bp.components.length; i++) {
        const comp = bp.components[i];
        if (!comp || !comp.componentId || !comp.familyId || !comp.localPositionMeters) {
          errors.push(`Assembly component at index ${i} missing required placement fields`);
          break;
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function checkBlueprintCompatibility(bp) {
  const base = validateObjectBlueprint(bp);
  const errors = [...base.errors];
  const warnings = [];
  const familyId = bp?.identity?.familyId || bp?.parameters?.familyId || '';
  const presetId = bp?.identity?.presetId || bp?.parameters?.presetId || '';
  const unknownFamily = !familyId || !hasObjectFamily(familyId);
  let unknownPreset = false;
  const extraParams = [];

  if (unknownFamily) {
    errors.push(`Unknown object family: ${familyId || '(missing)'}`);
  } else {
    const fam = getObjectFamily(familyId);
    if (presetId && !(fam.presets || []).some((p) => p.id === presetId)) {
      unknownPreset = true;
      warnings.push(`Preset "${presetId}" not found in family "${familyId}"; parameters will be sanitised to defaults`);
    }
    if (bp?.parameters && typeof bp.parameters === 'object') {
      const knownKeys = new Set([
        'familyId', 'presetId', 'seed', 'variationMode', 'condition', 'scaleMultiplier',
        'primaryColor', 'secondaryColor', 'accentColor', 'frameColor', 'metalColor',
        ...(fam.schema || []).map((f) => f.key)
      ]);
      for (const k of Object.keys(bp.parameters)) {
        if (!knownKeys.has(k)) {
          extraParams.push(k);
        }
      }
      if (extraParams.length > 0) {
        warnings.push(`Unrecognized parameters ignored during sanitisation: ${extraParams.join(', ')}`);
      }
    }
    if (bp?.schemaVersion === ASSEMBLY_SCHEMA_VERSION && Array.isArray(bp.components)) {
      for (const comp of bp.components) {
        if (comp?.familyId && !hasObjectFamily(comp.familyId)) {
          errors.push(`Assembly component "${comp.componentId || 'unknown'}" references unknown family "${comp.familyId}"`);
        }
      }
    }
  }

  return {
    compatible: errors.length === 0 && !unknownFamily,
    errors,
    warnings,
    unknownFamily,
    unknownPreset,
    extraParams
  };
}
