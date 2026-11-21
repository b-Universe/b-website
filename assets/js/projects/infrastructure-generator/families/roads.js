import { INFRA_BASE_ROAD_PARAMS, INFRA_DEFAULTS } from '../config.js';
import { infraBuildRoadProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile
} from '../core/registry.js';

export const FAM_ROAD_SCHEMA = [
  { key: 'laneCount', label: 'Lane Count', type: 'range', min: 1, max: 6, step: 1, group: 'Geometry', rngStream: 'profile', safeMin: 1, safeMax: 4 },
  { key: 'laneWidth', label: 'Lane Width (m)', type: 'range', min: 2.5, max: 4.2, step: 0.1, group: 'Geometry', rngStream: 'profile', safeMin: 2.8, safeMax: 3.8 },
  { key: 'bidirectional', label: 'Two-Way Traffic', type: 'boolean', group: 'Geometry', rngStream: 'profile' },
  { key: 'includeSidewalks', label: 'Sidewalks & Curbs', type: 'boolean', group: 'Geometry', rngStream: 'profile', falseBias: 0.25 },
  { key: 'sidewalkWidth', label: 'Sidewalk Width (m)', type: 'range', min: 1.2, max: 4.5, step: 0.1, group: 'Geometry', rngStream: 'profile', safeMin: 1.6, safeMax: 3.2 },
  { key: 'curbHeight', label: 'Curb Height (m)', type: 'range', min: 0.08, max: 0.24, step: 0.01, group: 'Geometry', rngStream: 'profile', safeMin: 0.12, safeMax: 0.18 },
  { key: 'shoulderWidth', label: 'Shoulder Width (m)', type: 'range', min: 0, max: 2.5, step: 0.1, group: 'Geometry', rngStream: 'profile', safeMin: 0, safeMax: 1.2 },
  { key: 'vergeWidth', label: 'Grass Verge Width (m)', type: 'range', min: 0, max: 3.0, step: 0.2, group: 'Geometry', rngStream: 'profile', safeMin: 0, safeMax: 1.8 },
  { key: 'includeMedian', label: 'Center Median', type: 'boolean', group: 'Geometry', rngStream: 'profile', falseBias: 0.65 },
  { key: 'medianWidth', label: 'Median Width (m)', type: 'range', min: 0.8, max: 3.6, step: 0.1, group: 'Geometry', rngStream: 'profile', safeMin: 1.0, safeMax: 2.4 },
  {
    key: 'medianType',
    label: 'Median Style',
    type: 'select',
    options: [
      ['raised', 'Raised Concrete'],
      ['planted', 'Planted Verge']
    ],
    group: 'Geometry',
    rngStream: 'materials'
  },
  {
    key: 'surfaceMaterial',
    label: 'Road Surface',
    type: 'select',
    options: [
      ['asphalt', 'Asphalt'],
      ['concrete', 'Concrete'],
      ['cobblestone', 'Cobblestone'],
      ['brick', 'Brick Pavers'],
      ['gravel', 'Gravel']
    ],
    group: 'Materials',
    rngStream: 'materials'
  },
  {
    key: 'sidewalkMaterial',
    label: 'Sidewalk Surface',
    type: 'select',
    options: [
      ['concrete', 'Scored Concrete'],
      ['brick', 'Brick Walkway'],
      ['cobblestone', 'Stone Pavers']
    ],
    group: 'Materials',
    rngStream: 'materials'
  },
  {
    key: 'markingsStyle',
    label: 'Lane Markings',
    type: 'select',
    options: [
      ['standard', 'Standard Striping'],
      ['bus_lane', 'Curb Bus / Transit Striping'],
      ['none', 'Unmarked']
    ],
    group: 'Materials',
    rngStream: 'materials'
  },
  { key: 'wear', label: 'Surface Wear', type: 'range', min: 0, max: 1, step: 0.05, group: 'Materials', rngStream: 'materials', safeMin: 0.05, safeMax: 0.65 },
  { key: 'deckThickness', label: 'Elevated Deck Depth (m)', type: 'range', min: 0.4, max: 1.4, step: 0.05, group: 'Structural Supports', rngStream: 'elevation', safeMin: 0.55, safeMax: 0.95 },
  { key: 'supportSpacing', label: 'Pier Spacing (m)', type: 'range', min: 10, max: 24, step: 1, group: 'Structural Supports', rngStream: 'elevation', safeMin: 12, safeMax: 20 },
  {
    key: 'supportStyle',
    label: 'Pier Style',
    type: 'select',
    options: [
      ['double_pier', 'Double Column Bent'],
      ['single_pier', 'Single Hammerhead Pier'],
      ['straddle_portal', 'Wide Straddle Portal']
    ],
    group: 'Structural Supports',
    rngStream: 'elevation'
  },
  { key: 'includeBarriers', label: 'Elevated Barriers', type: 'boolean', group: 'Structural Supports', rngStream: 'profile' },
  {
    key: 'embeddedTramMode',
    label: 'Embedded Streetcar',
    type: 'select',
    options: [
      ['none', 'None (Road Only)'],
      ['center_single', 'Center Single Track'],
      ['center_double', 'Center Double Track'],
      ['grass_median_tram', 'Green Track Median'],
      ['side_single', 'Curbside Single Track']
    ],
    group: 'Streetcar / Tram',
    rngStream: 'profile'
  },
  {
    key: 'embeddedTramGauge',
    label: 'Tram Gauge (m)',
    type: 'select',
    options: [
      ['1.435', 'Standard Gauge (1.435m)'],
      ['1.0', 'Meter Gauge (1.000m)']
    ],
    group: 'Streetcar / Tram',
    rngStream: 'profile'
  },
  { key: 'includeTramPoles', label: 'Overhead Tram Wires', type: 'boolean', group: 'Streetcar / Tram', rngStream: 'profile', falseBias: 0.3 },
  { key: 'includeTramPlatform', label: 'Tram Boarding Island', type: 'boolean', group: 'Streetcar / Tram', rngStream: 'profile', falseBias: 0.7 }
];

export const FAM_ROAD_PRESETS = [
  {
    id: 'residential_2lane',
    label: 'Classic 2-Lane Residential',
    description: 'Standard two-way neighborhood street with concrete sidewalks and curbs.',
    eraStyle: 'modern_municipal',
    elevationMode: 'grade',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'residential_2lane',
      laneCount: 2,
      laneWidth: 3.1,
      includeSidewalks: true,
      sidewalkWidth: 2.2,
      vergeWidth: 0.8,
      includeMedian: false,
      surfaceMaterial: 'asphalt',
      markingsStyle: 'standard',
      wear: 0.15
    }
  },
  {
    id: 'urban_4lane_arterial',
    label: 'Downtown 4-Lane Arterial',
    description: 'Four-lane commercial avenue sized for city buses and freight trucks.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'grade',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'urban_4lane_arterial',
      laneCount: 4,
      laneWidth: 3.3,
      includeSidewalks: true,
      sidewalkWidth: 2.8,
      vergeWidth: 0,
      includeMedian: false,
      surfaceMaterial: 'asphalt',
      markingsStyle: 'standard',
      wear: 0.2
    }
  },
  {
    id: 'divided_boulevard',
    label: 'Divided Commercial Boulevard',
    description: 'Four-lane boulevard with planted center median and wide sidewalks.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'grade',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'divided_boulevard',
      laneCount: 4,
      laneWidth: 3.3,
      includeSidewalks: true,
      sidewalkWidth: 3.0,
      vergeWidth: 0,
      includeMedian: true,
      medianWidth: 1.8,
      medianType: 'planted',
      surfaceMaterial: 'asphalt',
      markingsStyle: 'standard',
      wear: 0.1
    }
  },
  {
    id: 'industrial_access',
    label: 'Industrial Access Road',
    description: 'Wide heavy-duty 2-lane freight road with gravel shoulders and weathered asphalt.',
    eraStyle: 'early_industrial',
    elevationMode: 'grade',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'industrial_access',
      laneCount: 2,
      laneWidth: 3.8,
      includeSidewalks: false,
      shoulderWidth: 1.2,
      vergeWidth: 0.6,
      includeMedian: false,
      surfaceMaterial: 'asphalt',
      markingsStyle: 'standard',
      wear: 0.48
    }
  },
  {
    id: 'historic_cobblestone',
    label: 'Historic Cobblestone Street',
    description: 'Old-world stone-paved street with brick sidewalks and unmarked roadway.',
    eraStyle: 'historic_european',
    elevationMode: 'grade',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'historic_cobblestone',
      laneCount: 2,
      laneWidth: 2.9,
      includeSidewalks: true,
      sidewalkWidth: 2.0,
      curbHeight: 0.14,
      includeMedian: false,
      surfaceMaterial: 'cobblestone',
      sidewalkMaterial: 'brick',
      markingsStyle: 'none',
      wear: 0.3
    }
  },
  {
    id: 'elevated_overpass',
    label: 'Elevated Urban Overpass',
    description: 'Box-girder elevated roadway with concrete jersey barriers and grounded support piers.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'elevated',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'elevated_overpass',
      laneCount: 2,
      laneWidth: 3.4,
      includeSidewalks: false,
      includeBarriers: true,
      deckThickness: 0.65,
      supportSpacing: 16,
      supportStyle: 'double_pier',
      surfaceMaterial: 'concrete',
      markingsStyle: 'standard',
      wear: 0.15
    }
  },
  {
    id: 'rural_two_lane',
    label: 'Rural Winding Gravel Road',
    description: 'Two-lane countryside gravel corridor with grassy verges and no curbs.',
    eraStyle: 'neglected_urban',
    elevationMode: 'grade',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'rural_two_lane',
      laneCount: 2,
      laneWidth: 3.0,
      includeSidewalks: false,
      shoulderWidth: 0.8,
      vergeWidth: 1.4,
      surfaceMaterial: 'gravel',
      markingsStyle: 'none',
      wear: 0.55
    }
  },
  {
    id: 'narrow_alley',
    label: 'Neglected Back Alley',
    description: 'Single-lane weathered concrete/asphalt service passage.',
    eraStyle: 'neglected_urban',
    elevationMode: 'grade',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'narrow_alley',
      laneCount: 1,
      laneWidth: 3.2,
      bidirectional: false,
      includeSidewalks: false,
      surfaceMaterial: 'asphalt',
      markingsStyle: 'none',
      wear: 0.7
    }
  }
];

export function famRoadRegisterAll() {
  infraRegisterFamily({
    id: 'roads',
    domain: 'road',
    label: 'Roads, Streets & Highways',
    description: 'Procedural roadway corridors, sidewalks, curbs, intersections, ramps, and elevated overpasses.',
    implemented: true,
    supportedElevationModes: ['grade', 'elevated'],
    schema: FAM_ROAD_SCHEMA,
    defaults: INFRA_BASE_ROAD_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => infraBuildRoadProfileFromParams(params, elevationMode, eraStyle),
    validateComponent: ({ sampled, edge }) => {
      const out = [];
      if (edge.params?.laneWidth < INFRA_DEFAULTS.laneWidthMeters - 0.8) {
        out.push({
          id: `road_narrow_${edge.id}`,
          severity: 'warning',
          category: 'clearance',
          targetKind: 'edge',
          targetId: edge.id,
          message: `Lane width ${edge.params.laneWidth}m is tight for large 2.52m trucks/buses`
        });
      }
      if (sampled && sampled.lengthMeters > 180) {
        out.push({
          id: `road_long_${edge.id}`,
          severity: 'warning',
          category: 'geometry',
          targetKind: 'edge',
          targetId: edge.id,
          message: `Very long road segment (${sampled.lengthMeters}m); consider splitting for intermediate nodes`
        });
      }
      return out;
    }
  });

  infraRegisterComponentType({
    id: 'road_segment',
    familyId: 'roads',
    domain: 'road',
    label: 'Road Segment',
    implemented: true,
    schema: FAM_ROAD_SCHEMA,
    defaults: INFRA_BASE_ROAD_PARAMS
  });

  infraRegisterComponentType({
    id: 'road_intersection',
    familyId: 'roads',
    domain: 'road',
    label: 'Road Intersection',
    implemented: true,
    schema: [
      { key: 'cornerRadius', label: 'Curb Corner Radius (m)', type: 'range', min: 1.2, max: 8.0, step: 0.2, group: 'Geometry' },
      { key: 'includeCrosswalks', label: 'Crosswalks & Stop Bars', type: 'boolean', group: 'Geometry' },
      { key: 'crosswalkDepth', label: 'Crosswalk Depth (m)', type: 'range', min: 1.8, max: 4.0, step: 0.1, group: 'Geometry' }
    ],
    defaults: {
      cornerRadius: INFRA_DEFAULTS.cornerRadiusMeters,
      includeCrosswalks: true,
      crosswalkDepth: INFRA_DEFAULTS.crosswalkDepthMeters
    }
  });

  for (const preset of FAM_ROAD_PRESETS) {
    infraRegisterPreset({
      familyId: 'roads',
      domain: 'road',
      ...preset
    });
    infraRegisterProfile(infraBuildRoadProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle));
  }
}
