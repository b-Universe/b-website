import { INFRA_BASE_WATERWAY_PARAMS } from '../config.js';
import { infraBuildWaterwayProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile
} from '../core/registry.js';

export const FAM_WAT_SCHEMA = [
  {
    key: 'waterwayType',
    label: 'Waterway Architecture',
    type: 'select',
    options: [
      ['canal', 'Navigable Urban Stone Canal'],
      ['flood_channel', 'Concrete Drainage / Floodway'],
      ['industrial_dock', 'Freight Quay & Finger Pier'],
      ['scenic_canal', 'Scenic Promenade Canal']
    ],
    group: 'Waterway Geometry',
    rngStream: 'profile'
  },
  { key: 'channelWidthMeters', label: 'Channel Water Width (m)', type: 'range', min: 5.0, max: 26.0, step: 0.5, group: 'Waterway Geometry', rngStream: 'profile', safeMin: 8.0, safeMax: 16.0 },
  { key: 'channelDepthMeters', label: 'Excavated Bed Depth (m)', type: 'range', min: 1.4, max: 4.5, step: 0.1, group: 'Waterway Geometry', rngStream: 'elevation', safeMin: 2.0, safeMax: 3.4 },
  { key: 'waterDepthMeters', label: 'Water Depth (m)', type: 'range', min: 0.8, max: 4.0, step: 0.1, group: 'Waterway Geometry', rngStream: 'elevation', safeMin: 1.5, safeMax: 2.8 },
  { key: 'includeTowpaths', label: 'Embankment Towpaths', type: 'boolean', group: 'Quay Walls & Furniture', rngStream: 'profile' },
  { key: 'towpathWidthMeters', label: 'Towpath Width (m)', type: 'range', min: 1.4, max: 4.5, step: 0.2, group: 'Quay Walls & Furniture', rngStream: 'profile', safeMin: 1.8, safeMax: 3.2 },
  {
    key: 'wallMaterial',
    label: 'Quay Wall Masonry',
    type: 'select',
    options: [
      ['stone_masonry', 'Cut Stone Masonry'],
      ['concrete', 'Marine Reinforced Concrete']
    ],
    group: 'Materials',
    rngStream: 'materials'
  },
  { key: 'includeRailings', label: 'Quay Edge Railings', type: 'boolean', group: 'Quay Walls & Furniture', rngStream: 'details' },
  { key: 'includeBollards', label: 'Mooring Bollards', type: 'boolean', group: 'Quay Walls & Furniture', rngStream: 'details' },
  { key: 'includePierSpurs', label: 'Timber Docking Pier Spur', type: 'boolean', group: 'Quay Walls & Furniture', rngStream: 'details' }
];

export const FAM_WAT_PRESETS = [
  {
    id: 'urban_stone_canal',
    label: 'Urban Stone Masonry Canal',
    description: 'Excavated ashlar-lined navigable canal with translucent water, iron railings, and towpaths.',
    eraStyle: 'historic_european',
    elevationMode: 'grade',
    domain: 'waterway',
    params: { ...INFRA_BASE_WATERWAY_PARAMS, presetId: 'urban_stone_canal', waterwayType: 'canal', channelWidthMeters: 12.0, wallMaterial: 'stone_masonry', includePierSpurs: false }
  },
  {
    id: 'concrete_flood_channel',
    label: 'Municipal Drainage Channel',
    description: 'Deep reinforced concrete flood-control waterway with continuous maintenance walkways.',
    eraStyle: 'modern_municipal',
    elevationMode: 'grade',
    domain: 'waterway',
    params: { ...INFRA_BASE_WATERWAY_PARAMS, presetId: 'concrete_flood_channel', waterwayType: 'flood_channel', channelWidthMeters: 9.5, channelDepthMeters: 3.2, waterDepthMeters: 1.4, wallMaterial: 'concrete', includeBollards: false }
  },
  {
    id: 'industrial_dock',
    label: 'Industrial Quay & Timber Finger Pier',
    description: 'Heavy commercial harbor channel equipped with mooring bollards and piling-supported pier spur.',
    eraStyle: 'early_industrial',
    elevationMode: 'grade',
    domain: 'waterway',
    params: { ...INFRA_BASE_WATERWAY_PARAMS, presetId: 'industrial_dock', waterwayType: 'industrial_dock', channelWidthMeters: 14.0, wallMaterial: 'concrete', includeRailings: false, includeBollards: true, includePierSpurs: true }
  },
  {
    id: 'scenic_embankment_canal',
    label: 'Wide Scenic Esplanade Canal',
    description: 'Generous 16m city canal flanked by cobblestone promenades, iron railings, and mooring posts.',
    eraStyle: 'historic_european',
    elevationMode: 'grade',
    domain: 'waterway',
    params: { ...INFRA_BASE_WATERWAY_PARAMS, presetId: 'scenic_embankment_canal', waterwayType: 'scenic_canal', channelWidthMeters: 16.0, towpathWidthMeters: 3.4, wallMaterial: 'stone_masonry', includeRailings: true }
  }
];

export function famWatRegisterAll() {
  infraRegisterFamily({
    id: 'waterways',
    domain: 'waterway',
    label: 'Waterways, Canals & Coastal',
    description: 'Navigable canals, stone/concrete quay embankments, floodways, docking piers, and towpaths.',
    implemented: true,
    plannedMilestone: 'Full Suite',
    supportedElevationModes: ['grade'],
    schema: FAM_WAT_SCHEMA,
    defaults: INFRA_BASE_WATERWAY_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => infraBuildWaterwayProfileFromParams(params, elevationMode, eraStyle)
  });

  infraRegisterComponentType({
    id: 'waterway_channel',
    familyId: 'waterways',
    domain: 'waterway',
    label: 'Navigable Canal / Quay Channel',
    implemented: true,
    schema: FAM_WAT_SCHEMA,
    defaults: INFRA_BASE_WATERWAY_PARAMS
  });

  for (const preset of FAM_WAT_PRESETS) {
    infraRegisterPreset({ familyId: 'waterways', domain: 'waterway', ...preset });
    infraRegisterProfile(infraBuildWaterwayProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle));
  }
}
