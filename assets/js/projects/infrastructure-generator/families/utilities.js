import { INFRA_BASE_UTILITY_PARAMS } from '../config.js';
import { infraBuildUtilityProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile
} from '../core/registry.js';

export const FAM_UTIL_SCHEMA = [
  {
    key: 'utilityType',
    label: 'Utility Corridor System',
    type: 'select',
    options: [
      ['power_transmission', 'HV Lattice Steel Transmission Line'],
      ['street_power_poles', 'Distribution Timber Poles & Transformers'],
      ['telecom_trunk', 'Overhead Telecom Trunk Line'],
      ['pipe_rack_elevated', 'Elevated Industrial Steel Pipe Rack'],
      ['industrial_pipeline', 'Grounded Saddle Flanged Pipeline']
    ],
    group: 'Utility Network',
    rngStream: 'profile'
  },
  { key: 'towerHeightMeters', label: 'Tower / Rack Height (m)', type: 'range', min: 6.0, max: 24.0, step: 0.5, group: 'Utility Network', rngStream: 'elevation', safeMin: 8.0, safeMax: 16.0 },
  { key: 'poleSpacingMeters', label: 'Tower / Bent Spacing (m)', type: 'range', min: 10, max: 40, step: 2, group: 'Utility Network', rngStream: 'profile', safeMin: 16, safeMax: 28 },
  { key: 'wireCount', label: 'Conductors / Cables', type: 'range', min: 2, max: 4, step: 1, group: 'Utility Network', rngStream: 'details', safeMin: 3, safeMax: 4 },
  { key: 'pipeCount', label: 'Parallel Pipelines', type: 'range', min: 1, max: 3, step: 1, group: 'Pipelines', rngStream: 'details', safeMin: 2, safeMax: 3 },
  { key: 'pipeDiameterMeters', label: 'Pipe Diameter (m)', type: 'range', min: 0.25, max: 0.8, step: 0.05, group: 'Pipelines', rngStream: 'details', safeMin: 0.35, safeMax: 0.6 },
  { key: 'wear', label: 'Industrial Weathering', type: 'range', min: 0, max: 1, step: 0.05, group: 'Materials', rngStream: 'materials', safeMin: 0.05, safeMax: 0.45 }
];

export const FAM_UTIL_PRESETS = [
  {
    id: 'hv_transmission_line',
    label: 'HV Steel Lattice Transmission Corridor',
    description: '4-leg steel lattice transmission towers with dual cross-arms, ceramic insulators & sagging lines.',
    eraStyle: 'modern_municipal',
    elevationMode: 'aerial',
    domain: 'power',
    params: { ...INFRA_BASE_UTILITY_PARAMS, presetId: 'hv_transmission_line', utilityType: 'power_transmission', towerHeightMeters: 14.5, poleSpacingMeters: 26, corridorWidthMeters: 7.2 }
  },
  {
    id: 'street_power_poles',
    label: 'Timber Distribution Poles & Transformers',
    description: 'Creosote utility poles with braced cross-arms, pole-mounted transformer drums & distribution wires.',
    eraStyle: 'early_industrial',
    elevationMode: 'aerial',
    domain: 'power',
    params: { ...INFRA_BASE_UTILITY_PARAMS, presetId: 'street_power_poles', utilityType: 'street_power_poles', towerHeightMeters: 9.2, poleSpacingMeters: 18, wireCount: 3, corridorWidthMeters: 3.4 }
  },
  {
    id: 'pipe_rack_elevated',
    label: 'Elevated Industrial Pipe Rack',
    description: 'Grounded steel H-frame portals carrying color-coded chemical/water/steam pipelines cleanly over streets.',
    eraStyle: 'early_industrial',
    elevationMode: 'aerial',
    domain: 'pipe',
    params: { ...INFRA_BASE_UTILITY_PARAMS, presetId: 'pipe_rack_elevated', utilityType: 'pipe_rack_elevated', towerHeightMeters: 6.4, poleSpacingMeters: 12, pipeCount: 3, pipeDiameterMeters: 0.44, corridorWidthMeters: 3.6 }
  },
  {
    id: 'ground_pipeline',
    label: 'Grounded Flanged Utility Pipeline',
    description: 'Concrete cradle saddle line carrying heavy dual flanged utility conduits at grade.',
    eraStyle: 'neglected_urban',
    elevationMode: 'grade',
    domain: 'pipe',
    params: { ...INFRA_BASE_UTILITY_PARAMS, presetId: 'ground_pipeline', utilityType: 'industrial_pipeline', pipeCount: 2, pipeDiameterMeters: 0.55, corridorWidthMeters: 2.8 }
  }
];

export function famUtilRegisterAll() {
  infraRegisterFamily({
    id: 'utilities',
    domain: 'power',
    label: 'Utilities, Power & Pipelines',
    description: 'HV lattice transmission towers, timber power poles, telecom lines, and elevated/grade pipelines.',
    implemented: true,
    plannedMilestone: 'Full Suite',
    supportedElevationModes: ['aerial', 'grade'],
    schema: FAM_UTIL_SCHEMA,
    defaults: INFRA_BASE_UTILITY_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => infraBuildUtilityProfileFromParams(params, elevationMode, eraStyle)
  });

  infraRegisterComponentType({
    id: 'power_corridor',
    familyId: 'utilities',
    domain: 'power',
    label: 'Overhead Power / Telecom Line',
    implemented: true,
    schema: FAM_UTIL_SCHEMA,
    defaults: INFRA_BASE_UTILITY_PARAMS
  });

  infraRegisterComponentType({
    id: 'pipe_corridor',
    familyId: 'utilities',
    domain: 'pipe',
    label: 'Industrial Pipeline / Pipe Rack',
    implemented: true,
    schema: FAM_UTIL_SCHEMA,
    defaults: FAM_UTIL_PRESETS[2].params
  });

  for (const preset of FAM_UTIL_PRESETS) {
    infraRegisterPreset({ familyId: 'utilities', domain: preset.domain || 'power', ...preset });
    infraRegisterProfile(infraBuildUtilityProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle));
  }
}
