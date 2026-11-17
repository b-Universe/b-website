import { clamp, degToRad, copy } from '../utils.js';
import { CONDITION_LEVELS } from './categories.js';
import {
  getObjectFamily,
  getAllObjectFamilies,
  buildDefaultConfigForFamily,
  sanitiseObjectConfig,
  registerGeneratorModule,
  runRegisteredGeneratorModules
} from './registry.js';
import { resolveObjectMaterialBundle } from '../materials/materials.js';
import { ObjectBatcher } from '../geometry/primitives.js';
import { generateObjectBlueprint } from './blueprints.js';
import { applyObjectSeedVariation } from './variation.js';

import { registerPostalAndWasteFamilies } from '../generators/postal-waste.js';
import { registerUtilitiesAndPipesFamilies } from '../generators/utilities-pipes.js';
import { registerFurnitureAndTrafficFamilies } from '../generators/furniture-traffic.js';
import { registerTransitVendorsAndCommercialFamilies } from '../generators/transit-vendors-commercial.js';
import { registerResidentialIndustrialAndConstructionFamilies } from '../generators/residential-industrial-construction.js';
import { registerParksSafetyLightingAndRooftopFamilies } from '../generators/parks-safety-lighting-rooftop.js';
import { registerMobilityWaterfrontClutterAndFuturisticFamilies } from '../generators/mobility-waterfront-clutter-futuristic.js';
import { registerOfficeFurnitureAndSeatingFamilies } from '../generators/office-furniture-seating.js';
import { registerOfficeTechAndMachinesFamilies } from '../generators/office-tech-machines.js';
import { registerOfficeStorageAndPartitionsFamilies } from '../generators/office-storage-partitions.js';
import { registerOfficeLobbiesAmenitiesAndCivicFamilies } from '../generators/office-lobbies-amenities-civic.js';
import { registerMunicipalPoliceClinicsAndLabsFamilies } from '../generators/municipal-police-clinics-labs.js';
import { registerTradesCubiclesAndSimsMiscFamilies } from '../generators/trades-cubicles-sims-misc.js';
import { registerArcadeControlsModule } from '../generators/arcade-controls.js';
import { registerArcadeCabinetFamilies } from '../generators/arcade-cabinets.js';
import { registerArcadeRacingAndRhythmFamilies } from '../generators/arcade-racing-rhythm.js';
import { registerArcadePinballAndSkillFamilies } from '../generators/arcade-pinball-skill.js';
import { registerArcadeRedemptionAndPrizeFamilies } from '../generators/arcade-redemption-prizes.js';
import { registerArcadeFurnitureAndDecorFamilies } from '../generators/arcade-furniture-decor.js';
import { registerArcadeModernAndRetailFamilies } from '../generators/arcade-modern-entertainment.js';
import { registerResidentialHouseholdFamilies } from '../generators/residential-household.js';
import { registerCommerceSignageAndVendingFamilies } from '../generators/commerce-signage-vending.js';
import { registerClutterBooksAudioAndPlatesFamilies } from '../generators/clutter-books-audio-plates.js';
import { registerGasAndAutoEquipmentFamilies } from '../generators/gas-auto-equipment.js';
import { registerGymEquipmentFamilies } from '../generators/gym-fitness-equipment.js';
import { registerSpecialtyRetailDisplayFamilies } from '../generators/specialty-retail-displays.js';
import { registerBathroomKitchenPatioFamilies } from '../generators/bathroom-kitchen-patio.js';
import { registerGymLockerRecoveryFamilies } from '../generators/gym-locker-recovery.js';
import { registerStreetPostalConstructionFamilies } from '../generators/street-postal-construction.js';
import { registerHolidayChristmasFamilies } from '../generators/holiday-christmas.js';
import { registerHolidayThanksgivingFamilies } from '../generators/holiday-thanksgiving.js';
import { registerCompositeAssemblies } from '../generators/composite-assemblies.js';

export { registerCompositeAssemblies, registerGeneratorModule, runRegisteredGeneratorModules };

let asmRegistryInitialized = false;

export function ensureCityObjectRegistry() {
  if (asmRegistryInitialized && getAllObjectFamilies().length > 0) {
    return getAllObjectFamilies();
  }
  registerPostalAndWasteFamilies();
  registerUtilitiesAndPipesFamilies();
  registerFurnitureAndTrafficFamilies();
  registerTransitVendorsAndCommercialFamilies();
  registerResidentialIndustrialAndConstructionFamilies();
  registerParksSafetyLightingAndRooftopFamilies();
  registerMobilityWaterfrontClutterAndFuturisticFamilies();
  registerOfficeFurnitureAndSeatingFamilies();
  registerOfficeTechAndMachinesFamilies();
  registerOfficeStorageAndPartitionsFamilies();
  registerOfficeLobbiesAmenitiesAndCivicFamilies();
  registerMunicipalPoliceClinicsAndLabsFamilies();
  registerTradesCubiclesAndSimsMiscFamilies();
  registerArcadeControlsModule();
  registerArcadeCabinetFamilies();
  registerArcadeRacingAndRhythmFamilies();
  registerArcadePinballAndSkillFamilies();
  registerArcadeRedemptionAndPrizeFamilies();
  registerArcadeFurnitureAndDecorFamilies();
  registerArcadeModernAndRetailFamilies();
  registerResidentialHouseholdFamilies();
  registerCommerceSignageAndVendingFamilies();
  registerClutterBooksAudioAndPlatesFamilies();
  registerGasAndAutoEquipmentFamilies();
  registerGymEquipmentFamilies();
  registerSpecialtyRetailDisplayFamilies();
  registerBathroomKitchenPatioFamilies();
  registerGymLockerRecoveryFamilies();
  registerStreetPostalConstructionFamilies();
  registerHolidayChristmasFamilies();
  registerHolidayThanksgivingFamilies();
  registerCompositeAssemblies();
  runRegisteredGeneratorModules();
  asmRegistryInitialized = true;
  return getAllObjectFamilies();
}

export function buildSingleObjectGroup(rawCfg, options = {}) {
  ensureCityObjectRegistry();
  const baseCfg = sanitiseObjectConfig(rawCfg);
  const effectiveCfg = options.applyVariation === false
    ? baseCfg
    : applyObjectSeedVariation(baseCfg, options.locks || new Set());

  const family = getObjectFamily(effectiveCfg.familyId);
  if (!family) {
    throw new Error(`Unknown city object family: ${effectiveCfg.familyId}`);
  }

  const group = new THREE.Group();
  group.name = `CityObject_${family.id}`;
  const mats = resolveObjectMaterialBundle(effectiveCfg, {
    lightingTime: options.lightingTime || effectiveCfg.lightingTime
  });
  const batcher = new ObjectBatcher();
  const meta = {
    lightSources: [],
    snapAnchors: [],
    interaction: family.interaction ? { ...family.interaction } : null
  };

  family.buildGeometry(group, effectiveCfg, batcher, mats, meta);
  batcher.finalize(group, mats, {
    castShadow: options.castShadow !== false,
    receiveShadow: options.receiveShadow !== false
  });

  const blueprint = generateObjectBlueprint(effectiveCfg, group, meta);
  group.userData.config = effectiveCfg;
  group.userData.blueprint = blueprint;
  group.userData.runtimeMeta = meta;
  group.blueprint = blueprint;

  return group;
}

function asmBuildChildSpec(parentCfg, childSpec, index) {
  const baseChild = buildDefaultConfigForFamily(childSpec.familyId, childSpec.presetId);
  baseChild.seed = (parentCfg.seed || 1024) + (index + 1) * 131;
  baseChild.variationMode = parentCfg.variationMode || 'moderate';
  baseChild.lightingTime = parentCfg.lightingTime || 'day';

  if (parentCfg.unifyCondition !== false) {
    baseChild.condition = parentCfg.condition || 'clean';
  }
  if (parentCfg.glassOpacity !== undefined) {
    baseChild.glassOpacity = parentCfg.glassOpacity;
  }
  if (parentCfg.unifyPalette) {
    baseChild.paletteFamily = parentCfg.paletteFamily;
    for (const mk of [
      'primaryMaterial',
      'primaryColor',
      'secondaryMaterial',
      'secondaryColor',
      'accentMaterial',
      'accentColor',
      'frameMaterial',
      'frameColor',
      'woodColor',
      'concreteColor',
      'glassColor',
      'glassOpacity',
      'emissiveColor'
    ]) {
      if (parentCfg[mk] !== undefined) baseChild[mk] = parentCfg[mk];
    }
  }
  if (childSpec.overrides) {
    Object.assign(baseChild, copy(childSpec.overrides));
  }
  return sanitiseObjectConfig(baseChild);
}

function asmBuildCompositeGroup(family, cfg, options = {}) {
  const asmGroup = new THREE.Group();
  asmGroup.name = `CityAssembly_${family.id}`;

  const specs = family.getComponents(cfg);
  const spread = clamp(Number(cfg.spacingScale) || 1, 0.75, 1.45);
  const componentsMeta = [];
  const allLights = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const childCfg = asmBuildChildSpec(cfg, spec, i);
    const childGroup = buildSingleObjectGroup(childCfg, {
      ...options,
      locks: new Set()
    });

    const pos = spec.pos || [0, 0, 0];
    const rotDeg = spec.rotDeg || [0, 0, 0];
    const scale = spec.scale || 1;
    const px = (pos[0] || 0) * spread;
    const py = pos[1] || 0;
    const pz = (pos[2] || 0) * spread;

    childGroup.name = `AssemblyComponent_${spec.componentId}`;
    childGroup.position.set(px, py, pz);
    childGroup.rotation.set(
      degToRad(rotDeg[0] || 0),
      degToRad(rotDeg[1] || 0),
      degToRad(rotDeg[2] || 0)
    );
    childGroup.scale.setScalar(scale);
    childGroup.userData.assemblyComponentId = spec.componentId;
    asmGroup.add(childGroup);

    const childBp = childGroup.userData.blueprint;
    componentsMeta.push({
      componentId: spec.componentId,
      familyId: childCfg.familyId,
      presetId: childCfg.presetId,
      label: spec.label || childBp?.identity?.familyLabel || spec.familyId,
      attachmentProfile: childCfg.attachmentProfile,
      localPositionMeters: [px, py, pz],
      localRotationDeg: [rotDeg[0] || 0, rotDeg[1] || 0, rotDeg[2] || 0],
      localScale: scale,
      revisionHash: childBp?.identity?.revisionHash || null
    });

    if (childBp?.lighting?.lightSources) {
      for (const ls of childBp.lighting.lightSources) {
        allLights.push({
          id: `${spec.componentId}_${ls.id}`,
          position: [
            (ls.positionMeters?.[0] || 0) + px,
            (ls.positionMeters?.[1] || 0) + py,
            (ls.positionMeters?.[2] || 0) + pz
          ],
          color: ls.color,
          radius: ls.radiusMeters,
          enabled: ls.enabled
        });
      }
    }
  }

  const runtimeMeta = {
    components: componentsMeta,
    lightSources: allLights,
    interaction: {
      interactable: true,
      actionType: 'multi_prop_scene',
      componentCount: componentsMeta.length
    }
  };
  const blueprint = generateObjectBlueprint(cfg, asmGroup, runtimeMeta);
  asmGroup.userData.config = cfg;
  asmGroup.userData.blueprint = blueprint;
  asmGroup.userData.runtimeMeta = runtimeMeta;
  asmGroup.blueprint = blueprint;

  return asmGroup;
}

export function buildCityObject(rawCfg, options = {}) {
  ensureCityObjectRegistry();
  const cfg = sanitiseObjectConfig(rawCfg);
  const family = getObjectFamily(cfg.familyId);
  if (!family) {
    throw new Error(`Unknown city object family: ${cfg.familyId}`);
  }
  if (family.isAssembly && typeof family.getComponents === 'function') {
    return asmBuildCompositeGroup(family, cfg, options);
  }
  return buildSingleObjectGroup(cfg, options);
}
