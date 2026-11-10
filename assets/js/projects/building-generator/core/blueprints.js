import { clamp, copy, roundNum, hashBlueprintString, rng32 } from '../utils.js';
import { BASE, BLUEPRINT_SCHEMA_VERSION, GENERATOR_META, getStyle, sanitisePreset } from '../config.js';
import { segmentsForFloor, chooseFireEscapePlacement } from './layouts.js';
import { computeBuildingEntrances, computePrimaryEntranceLayout } from './entrances.js';

export function computeBuildingBounds(rawCfg) {
  const cfg = sanitisePreset(rawCfg);
  const groundSegments = segmentsForFloor(cfg, 0);
  const topSegments = segmentsForFloor(cfg, Math.max(0, cfg.floors - 1));
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let f = 0; f < cfg.floors; f++) {
    const segs = segmentsForFloor(cfg, f);
    for (const s of segs) {
      minX = Math.min(minX, s.x - s.w * 0.5);
      maxX = Math.max(maxX, s.x + s.w * 0.5);
      minZ = Math.min(minZ, s.z - s.d * 0.5);
      maxZ = Math.max(maxZ, s.z + s.d * 0.5);
    }
  }

  const primary = groundSegments[0];
  const mainLayout = primary ? computePrimaryEntranceLayout(primary, cfg) : null;
  const stoopFrontZ = mainLayout ? mainLayout.wallZ + mainLayout.totalStepDepth : maxZ;
  const fullMaxZ = Math.max(maxZ, stoopFrontZ);

  const wallHeight = roundNum(cfg.floors * cfg.floorHeight, 3);
  const roofExtra = cfg.roofType === 'pitched'
    ? 2.2
    : cfg.roofType === 'mansard'
      ? 1.55
      : cfg.roofType === 'stepped'
        ? 1.4
        : (cfg.parapet ? cfg.parapetHeight : 0.2);
  const totalHeightWithRoof = roundNum(wallHeight + roofExtra, 3);

  const serializeSeg = (s, idx) => ({
    index: idx,
    id: idx === 0 ? 'segment_0_main' : s.isExtension ? `segment_${idx}_ext_${s.extIndex}` : `segment_${idx}_wing`,
    x: roundNum(s.x, 4),
    z: roundNum(s.z, 4),
    width: roundNum(s.w, 4),
    depth: roundNum(s.d, 4),
    isMain: Boolean(s.isMain),
    isExtension: Boolean(s.isExtension),
    cornerCut: roundNum(s.cornerCut || 0, 4),
    minX: roundNum(s.x - s.w * 0.5, 4),
    maxX: roundNum(s.x + s.w * 0.5, 4),
    minZ: roundNum(s.z - s.d * 0.5, 4),
    maxZ: roundNum(s.z + s.d * 0.5, 4)
  });

  return {
    width: roundNum(cfg.width, 3),
    depth: roundNum(cfg.depth, 3),
    wallHeight,
    totalHeightWithRoof,
    floors: cfg.floors,
    floorHeight: roundNum(cfg.floorHeight, 3),
    localBoundingBox: {
      min: { x: roundNum(minX, 4), y: 0, z: roundNum(minZ, 4) },
      max: { x: roundNum(maxX, 4), y: totalHeightWithRoof, z: roundNum(fullMaxZ, 4) },
      size: {
        x: roundNum(maxX - minX, 4),
        y: totalHeightWithRoof,
        z: roundNum(fullMaxZ - minZ, 4)
      },
      center: {
        x: roundNum((minX + maxX) * 0.5, 4),
        y: roundNum(totalHeightWithRoof * 0.5, 4),
        z: roundNum((minZ + fullMaxZ) * 0.5, 4)
      }
    },
    footprint: {
      type: cfg.footprint,
      hasExtensions: cfg.extension > 0,
      extensionCount: cfg.extension,
      hasSetbacks: cfg.setback > 0 && cfg.floors >= 2,
      setbackStartFloor: Math.floor(cfg.floors * 0.6) + 1,
      setbackAmount: roundNum(cfg.setback, 3),
      cornerCut: roundNum(primary?.cornerCut || 0, 4),
      groundSegments: groundSegments.map(serializeSeg),
      topFloorSegments: topSegments.map(serializeSeg)
    }
  };
}

export function generateBuildingBlueprint(rawCfg, options = {}) {
  const settings = sanitisePreset(rawCfg);
  // Normalize preview-only inspection fields for export
  const blueprintSettings = {
    ...copy(settings),
    cutaway: false,
    inspectedFloor: 0
  };

  const groundSegments = segmentsForFloor(blueprintSettings, 0);
  const bounds = computeBuildingBounds(blueprintSettings);
  const entrances = computeBuildingEntrances(blueprintSettings, groundSegments);
  const firePlacement = chooseFireEscapePlacement(groundSegments, blueprintSettings, rng32(blueprintSettings.seed + 313));

  // Derive stable template ID from style, seed, and geometry settings
  const templateIdentityPayload = JSON.stringify({
    style: blueprintSettings.style,
    seed: blueprintSettings.seed,
    width: blueprintSettings.width,
    depth: blueprintSettings.depth,
    floors: blueprintSettings.floors,
    floorHeight: blueprintSettings.floorHeight,
    footprint: blueprintSettings.footprint,
    extension: blueprintSettings.extension,
    setback: blueprintSettings.setback,
    cornerCut: blueprintSettings.cornerCut,
    roofType: blueprintSettings.roofType,
    groundUse: blueprintSettings.groundUse,
    doorStyle: blueprintSettings.doorStyle,
    entranceSteps: blueprintSettings.entranceSteps
  });
  const templateHash = hashBlueprintString(templateIdentityPayload).slice(0, 12);
  const templateId = options.templateId || `bldg_tpl_${blueprintSettings.style}_${blueprintSettings.seed}_${templateHash}`;

  const styleDescriptor = getStyle(blueprintSettings.style);
  const name = String(options.name || `${styleDescriptor.label} #${blueprintSettings.seed}`).trim();

  const revisionPayload = JSON.stringify({
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    settings: blueprintSettings,
    bounds,
    entrances
  });
  const templateRevision = `rev_${hashBlueprintString(revisionPayload)}`;

  const interactiveEntrances = entrances.filter((e) => e.interactive);

  return {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    generator: copy(GENERATOR_META),
    templateId,
    templateRevision,
    name,
    seed: blueprintSettings.seed,
    settings: blueprintSettings,
    bounds,
    entrances,
    metadata: {
      styleId: blueprintSettings.style,
      styleLabel: styleDescriptor.label,
      groundUse: blueprintSettings.groundUse,
      interiorMode: blueprintSettings.interiorMode,
      hasFireEscape: Boolean(firePlacement),
      fireEscapeSide: firePlacement ? firePlacement.side : null,
      totalEntranceCount: entrances.length,
      interactiveEntranceCount: interactiveEntrances.length,
      primaryEntranceId: entrances[0]?.id || null,
      damageLevel: blueprintSettings.damage,
      ageLevel: blueprintSettings.age,
      tags: [
        blueprintSettings.style,
        blueprintSettings.footprint,
        blueprintSettings.groundUse,
        ...(blueprintSettings.cornerCut > 0 ? ['corner-cut'] : []),
        ...(blueprintSettings.setback > 0 ? ['setback'] : []),
        ...(blueprintSettings.extension > 0 ? ['extensions'] : []),
        ...(interactiveEntrances.length > 0 ? ['interactive'] : ['decorative'])
      ],
      extensions: options.metadataExtensions && typeof options.metadataExtensions === 'object'
        ? copy(options.metadataExtensions)
        : {}
    }
  };
}

export function validateBuildingBlueprint(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Blueprint data must be a JSON object'] };
  }

  if ('schemaVersion' in input && input.schemaVersion !== undefined) {
    if (input.schemaVersion !== BLUEPRINT_SCHEMA_VERSION) {
      return {
        valid: false,
        errors: [`Unsupported blueprint schemaVersion "${String(input.schemaVersion)}". Expected "${BLUEPRINT_SCHEMA_VERSION}".`]
      };
    }
  }

  const isBlueprintV1 = input.schemaVersion === BLUEPRINT_SCHEMA_VERSION;
  const rawSettings = isBlueprintV1
    ? input.settings
    : (input.settings && typeof input.settings === 'object' && !Array.isArray(input.settings) ? input.settings : input);

  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    return { valid: false, errors: ['Missing or invalid building settings object'] };
  }

  const hasKnownSettingKey = Object.keys(rawSettings).some((k) => k in BASE);
  if (!hasKnownSettingKey) {
    return { valid: false, errors: ['JSON does not contain any recognized building settings'] };
  }

  const mergedRaw = { ...copy(rawSettings) };
  if (isBlueprintV1 && input.seed !== undefined && mergedRaw.seed === undefined) {
    mergedRaw.seed = input.seed;
  }

  if (isBlueprintV1) {
    if (input.entrances !== undefined) {
      if (!Array.isArray(input.entrances)) {
        errors.push('Blueprint "entrances" field must be an array');
      } else {
        const seenIds = new Set();
        for (let i = 0; i < input.entrances.length; i++) {
          const ent = input.entrances[i];
          if (!ent || typeof ent !== 'object') {
            errors.push(`Entrance at index ${i} must be an object`);
            continue;
          }
          if (!ent.id || typeof ent.id !== 'string') {
            errors.push(`Entrance at index ${i} is missing a string "id"`);
          } else if (seenIds.has(ent.id)) {
            errors.push(`Duplicate entrance ID "${ent.id}"`);
          } else {
            seenIds.add(ent.id);
          }
          const pos = ent.door?.position || ent.position;
          if (!pos || !Number.isFinite(Number(pos.x)) || !Number.isFinite(Number(pos.y)) || !Number.isFinite(Number(pos.z))) {
            errors.push(`Entrance "${ent.id || i}" has invalid door position coordinates`);
          }
        }
        // If settings omit gameplay entrance fields, hydrate from primary entrance in blueprint
        const mainEnt = input.entrances.find((e) => e && (e.id === 'entrance_main' || e.role === 'main')) || input.entrances[0];
        if (mainEnt && typeof mainEnt === 'object') {
          if (mergedRaw.entranceEnabled === undefined && typeof mainEnt.enabled === 'boolean') mergedRaw.entranceEnabled = mainEnt.enabled;
          if (mergedRaw.entranceCategory === undefined && typeof mainEnt.category === 'string') mergedRaw.entranceCategory = mainEnt.category;
          if (mergedRaw.entranceLocked === undefined && typeof mainEnt.lockedByDefault === 'boolean') mergedRaw.entranceLocked = mainEnt.lockedByDefault;
          if (mergedRaw.interactionLabel === undefined && typeof mainEnt.interactionLabel === 'string') mergedRaw.interactionLabel = mainEnt.interactionLabel;
          const trig = mainEnt.trigger || mainEnt;
          if (mergedRaw.triggerWidth === undefined && Number.isFinite(Number(trig.width ?? trig.triggerWidth))) mergedRaw.triggerWidth = Number(trig.width ?? trig.triggerWidth);
          if (mergedRaw.triggerHeight === undefined && Number.isFinite(Number(trig.height ?? trig.triggerHeight))) mergedRaw.triggerHeight = Number(trig.height ?? trig.triggerHeight);
          if (mergedRaw.triggerDepth === undefined && Number.isFinite(Number(trig.depth ?? trig.triggerDepth))) mergedRaw.triggerDepth = Number(trig.depth ?? trig.triggerDepth);
          if (mergedRaw.interactionDistance === undefined && Number.isFinite(Number(trig.maxDistance ?? trig.maxInteractionDistance))) {
            mergedRaw.interactionDistance = Number(trig.maxDistance ?? trig.maxInteractionDistance);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  try {
    const sanitised = sanitisePreset(mergedRaw);
    const blueprint = generateBuildingBlueprint(sanitised, {
      name: typeof input.name === 'string' && input.name.trim() ? input.name.trim() : undefined,
      templateId: typeof input.templateId === 'string' && input.templateId.trim() ? input.templateId.trim() : undefined,
      metadataExtensions: input.metadata?.extensions
    });
    return {
      valid: true,
      isLegacySettings: !isBlueprintV1,
      errors: [],
      settings: sanitised,
      blueprint
    };
  } catch (err) {
    return {
      valid: false,
      errors: [err.message || 'Blueprint settings could not be sanitised']
    };
  }
}
