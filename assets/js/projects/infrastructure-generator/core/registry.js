import { infraCopy } from '../utils.js';

export const INFRA_REGISTRY = {
  families: new Map(),
  componentTypes: new Map(),
  profiles: new Map(),
  presets: new Map(),
  validators: new Map(),
  externalModules: new Map(),
  initialized: false
};

export function infraRegisterFamily(familyDef) {
  if (!familyDef || !familyDef.id) {
    throw new Error('infraRegisterFamily requires a valid family id');
  }
  const normalized = {
    id: String(familyDef.id),
    domain: String(familyDef.domain || familyDef.id),
    label: String(familyDef.label || familyDef.id),
    description: String(familyDef.description || ''),
    implemented: Boolean(familyDef.implemented),
    plannedMilestone: familyDef.plannedMilestone || null,
    supportedElevationModes: Array.isArray(familyDef.supportedElevationModes)
      ? [...familyDef.supportedElevationModes]
      : ['grade'],
    schema: Array.isArray(familyDef.schema) ? infraCopy(familyDef.schema) : [],
    defaults: familyDef.defaults ? infraCopy(familyDef.defaults) : {},
    buildProfile: typeof familyDef.buildProfile === 'function' ? familyDef.buildProfile : null,
    validateComponent: typeof familyDef.validateComponent === 'function' ? familyDef.validateComponent : null
  };
  INFRA_REGISTRY.families.set(normalized.id, normalized);
  return normalized;
}

export function infraRegisterComponentType(typeDef) {
  if (!typeDef || !typeDef.id) {
    throw new Error('infraRegisterComponentType requires a valid component type id');
  }
  const normalized = {
    id: String(typeDef.id),
    familyId: String(typeDef.familyId || 'roads'),
    domain: String(typeDef.domain || 'road'),
    label: String(typeDef.label || typeDef.id),
    implemented: typeDef.implemented !== false,
    schema: Array.isArray(typeDef.schema) ? infraCopy(typeDef.schema) : [],
    defaults: typeDef.defaults ? infraCopy(typeDef.defaults) : {}
  };
  INFRA_REGISTRY.componentTypes.set(normalized.id, normalized);
  return normalized;
}

export function infraRegisterProfile(profileSpec) {
  if (!profileSpec || !profileSpec.id) {
    throw new Error('infraRegisterProfile requires a valid profile id');
  }
  const normalized = infraCopy(profileSpec);
  INFRA_REGISTRY.profiles.set(normalized.id, normalized);
  return normalized;
}

export function infraRegisterPreset(presetDef) {
  if (!presetDef || !presetDef.id) {
    throw new Error('infraRegisterPreset requires a valid preset id');
  }
  const normalized = {
    id: String(presetDef.id),
    familyId: String(presetDef.familyId || 'roads'),
    domain: String(presetDef.domain || 'road'),
    label: String(presetDef.label || presetDef.id),
    description: String(presetDef.description || ''),
    eraStyle: presetDef.eraStyle || 'modern_municipal',
    elevationMode: presetDef.elevationMode || 'grade',
    params: presetDef.params ? infraCopy(presetDef.params) : {}
  };
  INFRA_REGISTRY.presets.set(normalized.id, normalized);
  return normalized;
}

export function infraRegisterValidator(validatorDef) {
  if (!validatorDef || !validatorDef.id || typeof validatorDef.validate !== 'function') {
    throw new Error('infraRegisterValidator requires id and validate(ctx) function');
  }
  INFRA_REGISTRY.validators.set(String(validatorDef.id), {
    id: String(validatorDef.id),
    domain: validatorDef.domain || 'all',
    label: String(validatorDef.label || validatorDef.id),
    validate: validatorDef.validate
  });
  return INFRA_REGISTRY.validators.get(String(validatorDef.id));
}

export function infraRegisterModule(moduleId, registerFn) {
  if (!moduleId || typeof registerFn !== 'function') {
    throw new Error('infraRegisterModule requires moduleId and registerFn');
  }
  INFRA_REGISTRY.externalModules.set(String(moduleId), registerFn);
  if (INFRA_REGISTRY.initialized) {
    registerFn({
      registerFamily: infraRegisterFamily,
      registerComponentType: infraRegisterComponentType,
      registerProfile: infraRegisterProfile,
      registerPreset: infraRegisterPreset,
      registerValidator: infraRegisterValidator
    });
  }
}

export function infraRunRegisteredModules() {
  const api = {
    registerFamily: infraRegisterFamily,
    registerComponentType: infraRegisterComponentType,
    registerProfile: infraRegisterProfile,
    registerPreset: infraRegisterPreset,
    registerValidator: infraRegisterValidator
  };
  for (const fn of INFRA_REGISTRY.externalModules.values()) {
    fn(api);
  }
}

export function infraGetFamily(id) {
  return INFRA_REGISTRY.families.get(String(id || '')) || null;
}

export function infraGetComponentType(id) {
  return INFRA_REGISTRY.componentTypes.get(String(id || '')) || null;
}

export function infraGetProfile(id) {
  return INFRA_REGISTRY.profiles.get(String(id || '')) || null;
}

export function infraGetPreset(id) {
  return INFRA_REGISTRY.presets.get(String(id || '')) || null;
}

export function infraListFamilies(options = {}) {
  const all = Array.from(INFRA_REGISTRY.families.values());
  if (options.implementedOnly) return all.filter((f) => f.implemented);
  return all;
}

export function infraListComponentTypes(familyId = null) {
  const all = Array.from(INFRA_REGISTRY.componentTypes.values());
  if (!familyId) return all;
  return all.filter((t) => t.familyId === familyId);
}

export function infraListPresets(familyId = null) {
  const all = Array.from(INFRA_REGISTRY.presets.values());
  if (!familyId) return all;
  return all.filter((p) => p.familyId === familyId);
}

export function infraListProfiles(domain = null) {
  const all = Array.from(INFRA_REGISTRY.profiles.values());
  if (!domain) return all;
  return all.filter((p) => p.domain === domain);
}

export function infraListValidators(domain = null) {
  const all = Array.from(INFRA_REGISTRY.validators.values());
  if (!domain) return all;
  return all.filter((v) => v.domain === 'all' || v.domain === domain);
}

export function infraResetRegistry(options = {}) {
  INFRA_REGISTRY.families.clear();
  INFRA_REGISTRY.componentTypes.clear();
  INFRA_REGISTRY.profiles.clear();
  INFRA_REGISTRY.presets.clear();
  INFRA_REGISTRY.validators.clear();
  if (!options.keepExternalModules) {
    INFRA_REGISTRY.externalModules.clear();
  }
  INFRA_REGISTRY.initialized = false;
}
