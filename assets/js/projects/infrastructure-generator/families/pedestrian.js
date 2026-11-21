import { INFRA_BASE_PEDESTRIAN_PARAMS, INFRA_DEFAULTS } from '../config.js';
import { infraBuildPedestrianProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile,
  infraRegisterValidator
} from '../core/registry.js';

export const FAM_PED_SCHEMA = [
  {
    key: 'pedestrianType',
    label: 'Circulation Type',
    type: 'select',
    options: [
      ['walkway', 'Promenade / Landscaped Walkway'],
      ['skybridge', 'Enclosed Glass Skybridge'],
      ['stairs_corridor', 'Stepped Grand Stairway'],
      ['ada_ramp', 'Accessible ADA Ramp'],
      ['plaza_promenade', 'Wide Civic Plaza Corridor']
    ],
    group: 'Circulation Layout',
    rngStream: 'profile'
  },
  { key: 'walkwayWidth', label: 'Clear Path Width (m)', type: 'range', min: 1.8, max: 10.0, step: 0.2, group: 'Circulation Layout', rngStream: 'profile', safeMin: 2.4, safeMax: 6.0 },
  {
    key: 'surfaceMaterial',
    label: 'Paving Material',
    type: 'select',
    options: [
      ['tile_plaza', 'Architectural Plaza Tile'],
      ['concrete', 'Brushed Concrete'],
      ['brick', 'Herringbone Brick'],
      ['cobblestone', 'Historic Cobblestone']
    ],
    group: 'Materials',
    rngStream: 'materials'
  },
  { key: 'maxStepRiseMeters', label: 'Max Step Rise (m)', type: 'range', min: 0.12, max: 0.24, step: 0.01, group: 'Circulation Layout', rngStream: 'profile', safeMin: 0.16, safeMax: 0.21 },
  { key: 'includePlanters', label: 'Landscaped Verge Planters', type: 'boolean', group: 'Details', rngStream: 'details' },
  { key: 'includeHandrails', label: 'Continuous Guardrails', type: 'boolean', group: 'Details', rngStream: 'details' },
  { key: 'includeCanopy', label: 'Overhead Canopy Roof', type: 'boolean', group: 'Details', rngStream: 'details' },
  { key: 'includeLighting', label: 'Pedestrian Lamps', type: 'boolean', group: 'Details', rngStream: 'details' },
  { key: 'wear', label: 'Surface Wear', type: 'range', min: 0, max: 1, step: 0.05, group: 'Materials', rngStream: 'materials', safeMin: 0.05, safeMax: 0.35 }
];

export const FAM_PED_PRESETS = [
  {
    id: 'city_promenade',
    label: 'Tree-Lined City Promenade',
    description: 'Architectural plaza tile walkway flanked by grass verge planters and globe streetlamps.',
    eraStyle: 'modern_municipal',
    elevationMode: 'grade',
    domain: 'pedestrian',
    params: { ...INFRA_BASE_PEDESTRIAN_PARAMS, presetId: 'city_promenade', pedestrianType: 'walkway', walkwayWidth: 4.2, surfaceMaterial: 'tile_plaza', includePlanters: true }
  },
  {
    id: 'skybridge_glass',
    label: 'Elevated Glass Skybridge',
    description: 'Enclosed elevated steel Vierendeel pedestrian bridge with full glazing and canopy roof.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'elevated',
    domain: 'pedestrian',
    params: { ...INFRA_BASE_PEDESTRIAN_PARAMS, presetId: 'skybridge_glass', pedestrianType: 'skybridge', walkwayWidth: 3.4, surfaceMaterial: 'tile_plaza', includePlanters: false, includeCanopy: true }
  },
  {
    id: 'grand_stairway',
    label: 'B-Compliant Grand Civic Stairway',
    description: 'Stepped exterior staircase generating B-Remastered compliant treads (<= 0.2438m rise) & handrails.',
    eraStyle: 'historic_european',
    elevationMode: 'grade',
    domain: 'pedestrian',
    params: { ...INFRA_BASE_PEDESTRIAN_PARAMS, presetId: 'grand_stairway', pedestrianType: 'stairs_corridor', walkwayWidth: 3.8, surfaceMaterial: 'cobblestone', includePlanters: false, includeHandrails: true }
  },
  {
    id: 'ada_accessible_ramp',
    label: 'Accessible Barrier-Free Ramp',
    description: 'Gentle wheelchair-friendly concrete ramp with raised edge curbs and twin-height steel handrails.',
    eraStyle: 'modern_municipal',
    elevationMode: 'grade',
    domain: 'pedestrian',
    params: { ...INFRA_BASE_PEDESTRIAN_PARAMS, presetId: 'ada_accessible_ramp', pedestrianType: 'ada_ramp', walkwayWidth: 2.4, surfaceMaterial: 'concrete', includePlanters: false, includeHandrails: true }
  },
  {
    id: 'historic_plaza_walk',
    label: 'Wide Herringbone Plaza Walkway',
    description: 'Extra-wide civic pedestrian concourse paved in herringbone brick for station approaches.',
    eraStyle: 'historic_european',
    elevationMode: 'grade',
    domain: 'pedestrian',
    params: { ...INFRA_BASE_PEDESTRIAN_PARAMS, presetId: 'historic_plaza_walk', pedestrianType: 'plaza_promenade', walkwayWidth: 7.5, surfaceMaterial: 'brick', includePlanters: false }
  }
];

function famPedValidateEdge({ edge }) {
  const out = [];
  if (Number(edge.params?.maxStepRiseMeters) > INFRA_DEFAULTS.maxPlayerStepRiseMeters) {
    out.push({
      id: `ped_rise_${edge.id}`,
      severity: 'error',
      category: 'gameplay',
      targetKind: 'edge',
      targetId: edge.id,
      message: `Step rise ${edge.params.maxStepRiseMeters}m exceeds B limit ${INFRA_DEFAULTS.maxPlayerStepRiseMeters}m`
    });
  }
  return out;
}

export function famPedRegisterAll() {
  infraRegisterFamily({
    id: 'pedestrian',
    domain: 'pedestrian',
    label: 'Pedestrian & Multi-Level Circulation',
    description: 'City promenades, enclosed glass skybridges, B-compliant staircases, ADA ramps, and brick plazas.',
    implemented: true,
    plannedMilestone: 'Full Suite',
    supportedElevationModes: ['grade', 'elevated'],
    schema: FAM_PED_SCHEMA,
    defaults: INFRA_BASE_PEDESTRIAN_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => infraBuildPedestrianProfileFromParams(params, elevationMode, eraStyle),
    validateComponent: famPedValidateEdge
  });

  infraRegisterValidator({
    id: 'val_ped_circulation',
    domain: 'pedestrian',
    label: 'Pedestrian Circulation & ADA Validator',
    validate: famPedValidateEdge
  });

  infraRegisterComponentType({
    id: 'pedestrian_corridor',
    familyId: 'pedestrian',
    domain: 'pedestrian',
    label: 'Pedestrian Walkway / Skybridge / Stair',
    implemented: true,
    schema: FAM_PED_SCHEMA,
    defaults: INFRA_BASE_PEDESTRIAN_PARAMS
  });

  for (const preset of FAM_PED_PRESETS) {
    infraRegisterPreset({ familyId: 'pedestrian', domain: preset.domain || 'pedestrian', ...preset });
    infraRegisterProfile(infraBuildPedestrianProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle));
  }
}
