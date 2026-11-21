import { INFRA_BASE_RAIL_PARAMS, INFRA_BASE_ROAD_PARAMS, INFRA_DEFAULTS } from '../config.js';
import { infraBuildRailProfileFromParams, infraBuildRoadProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile,
  infraRegisterValidator
} from '../core/registry.js';

export const FAM_RAIL_SCHEMA = [
  { key: 'trackCount', label: 'Track Count', type: 'range', min: 1, max: 4, step: 1, group: 'Track Geometry', rngStream: 'profile', safeMin: 1, safeMax: 2 },
  {
    key: 'trackGauge',
    label: 'Track Gauge (m)',
    type: 'select',
    options: [
      ['1.435', 'Standard Gauge (1.435m)'],
      ['1.0', 'Narrow / Meter (1.000m)'],
      ['1.676', 'Broad / Heavy (1.676m)']
    ],
    group: 'Track Geometry',
    rngStream: 'profile'
  },
  { key: 'trackSpacing', label: 'Track Center Spacing (m)', type: 'range', min: 3.4, max: 5.4, step: 0.1, group: 'Track Geometry', rngStream: 'profile', safeMin: 3.6, safeMax: 4.8 },
  {
    key: 'ballastMaterial',
    label: 'Track Bed Material',
    type: 'select',
    options: [
      ['ballast_granite', 'Crushed Granite Ballast'],
      ['ballast_slag', 'Dark Industrial Slag'],
      ['concrete_slab', 'High-Speed Concrete Slab']
    ],
    group: 'Materials',
    rngStream: 'materials'
  },
  {
    key: 'sleeperMaterial',
    label: 'Sleeper / Tie Material',
    type: 'select',
    options: [
      ['wood', 'Creosote Timber'],
      ['concrete', 'Prestressed Concrete'],
      ['steel', 'Steel Ties']
    ],
    group: 'Materials',
    rngStream: 'materials'
  },
  { key: 'sleeperSpacing', label: 'Sleeper Spacing (m)', type: 'range', min: 0.48, max: 1.15, step: 0.05, group: 'Track Geometry', rngStream: 'profile', safeMin: 0.58, safeMax: 0.8 },
  { key: 'ballastDepth', label: 'Ballast Height (m)', type: 'range', min: 0.15, max: 0.55, step: 0.05, group: 'Track Geometry', rngStream: 'profile', safeMin: 0.2, safeMax: 0.35 },
  { key: 'abandonment', label: 'Abandonment / Rust', type: 'range', min: 0, max: 1, step: 0.05, group: 'Materials', rngStream: 'materials', safeMin: 0, safeMax: 0.45 },
  { key: 'includeCatenary', label: 'Overhead Catenary Wires', type: 'boolean', group: 'Systems & Furniture', rngStream: 'profile', falseBias: 0.45 },
  { key: 'includeThirdRail', label: 'Electrified Third Rail', type: 'boolean', group: 'Systems & Furniture', rngStream: 'profile', falseBias: 0.7 },
  { key: 'includeSignals', label: 'Trackside Block Signals', type: 'boolean', group: 'Systems & Furniture', rngStream: 'profile', falseBias: 0.4 },
  { key: 'includeFencing', label: 'Right-of-Way Fencing', type: 'boolean', group: 'Systems & Furniture', rngStream: 'profile', falseBias: 0.65 },
  { key: 'includeWalkway', label: 'Maintenance Walkway', type: 'boolean', group: 'Systems & Furniture', rngStream: 'profile', falseBias: 0.6 },
  { key: 'includeBufferStop', label: 'Dead-End Buffer Stop', type: 'boolean', group: 'Systems & Furniture', rngStream: 'profile', falseBias: 0.2 },
  {
    key: 'includePlatform',
    label: 'Station / Freight Platform',
    type: 'select',
    options: [
      ['none', 'No Platform'],
      ['left', 'Left Side Platform'],
      ['right', 'Right Side Platform'],
      ['both', 'Dual Side Platforms'],
      ['island', 'Center Island Platform']
    ],
    group: 'Systems & Furniture',
    rngStream: 'profile'
  },
  { key: 'supportSpacing', label: 'Viaduct Pier Spacing (m)', type: 'range', min: 10, max: 24, step: 1, group: 'Structural Supports', rngStream: 'elevation', safeMin: 12, safeMax: 18 },
  {
    key: 'supportStyle',
    label: 'Viaduct Pier Style',
    type: 'select',
    options: [
      ['double_pier', 'Double Concrete Bent'],
      ['single_pier', 'Hammerhead Pier'],
      ['straddle_portal', 'Wide Portal']
    ],
    group: 'Structural Supports',
    rngStream: 'elevation'
  }
];

export const FAM_RAIL_PRESETS = [
  {
    id: 'freight_single_track',
    label: 'Freight Single-Track Mainline',
    description: 'Heavy timber-tie single track on crushed granite ballast with roadside block signals.',
    eraStyle: 'early_industrial',
    elevationMode: 'grade',
    domain: 'rail',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'freight_single_track',
      trackCount: 1,
      trackGauge: 1.435,
      ballastMaterial: 'ballast_granite',
      sleeperMaterial: 'wood',
      includeSignals: true,
      includeBufferStop: true,
      wear: 0.28
    }
  },
  {
    id: 'freight_double_track',
    label: 'Freight Double-Track Corridor',
    description: 'Dual parallel freight tracks with wide slag/granite ballast, catenary gantries, and safety fencing.',
    eraStyle: 'modern_municipal',
    elevationMode: 'grade',
    domain: 'rail',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'freight_double_track',
      trackCount: 2,
      trackSpacing: 4.2,
      ballastMaterial: 'ballast_slag',
      sleeperMaterial: 'wood',
      includeSignals: true,
      includeFencing: true,
      includeCatenary: true,
      wear: 0.25
    }
  },
  {
    id: 'commuter_electrified',
    label: 'Commuter Electrified Rail',
    description: 'Concrete-tie dual passenger line with overhead catenary masts, signals, and side platform.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'grade',
    domain: 'rail',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'commuter_electrified',
      trackCount: 2,
      trackSpacing: 4.0,
      ballastMaterial: 'ballast_granite',
      sleeperMaterial: 'concrete',
      includeCatenary: true,
      includeSignals: true,
      includePlatform: 'right',
      wear: 0.1
    }
  },
  {
    id: 'high_speed_slab',
    label: 'High-Speed Slab Track',
    description: 'Ballastless concrete slab dual corridor with high catenary portals and security fencing.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'grade',
    domain: 'rail',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'high_speed_slab',
      trackCount: 2,
      trackSpacing: 4.4,
      ballastMaterial: 'concrete_slab',
      sleeperMaterial: 'concrete',
      includeCatenary: true,
      includeFencing: true,
      includeSignals: true,
      wear: 0.05
    }
  },
  {
    id: 'historic_steam_rail',
    label: 'Historic Timber Steam Line',
    description: 'Classic heritage single track with wide timber ties, dark slag bed, and bumper stop.',
    eraStyle: 'historic_european',
    elevationMode: 'grade',
    domain: 'rail',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'historic_steam_rail',
      trackCount: 1,
      trackGauge: 1.435,
      ballastMaterial: 'ballast_slag',
      sleeperMaterial: 'wood',
      sleeperSpacing: 0.62,
      includeSignals: true,
      includeBufferStop: true,
      wear: 0.35
    }
  },
  {
    id: 'narrow_gauge_mining',
    label: 'Narrow-Gauge Industrial Spur',
    description: 'Compact 1.000m meter-gauge industrial mining & logging siding with timber buffer.',
    eraStyle: 'early_industrial',
    elevationMode: 'grade',
    domain: 'rail',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'narrow_gauge_mining',
      trackCount: 1,
      trackGauge: 1.0,
      ballastMaterial: 'ballast_slag',
      sleeperMaterial: 'wood',
      sleeperSpacing: 0.72,
      includeBufferStop: true,
      abandonment: 0.18,
      wear: 0.42
    }
  },
  {
    id: 'elevated_metro_rail',
    label: 'Elevated Concrete Metro Viaduct',
    description: 'Twin-track elevated transit viaduct with third rail electrification, safety walkways, and piers.',
    eraStyle: 'modern_municipal',
    elevationMode: 'elevated',
    domain: 'rail',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'elevated_metro_rail',
      trackCount: 2,
      trackSpacing: 3.8,
      ballastMaterial: 'concrete_slab',
      sleeperMaterial: 'concrete',
      includeThirdRail: true,
      includeWalkway: true,
      includeSignals: true,
      deckThickness: 0.95,
      supportSpacing: 15,
      supportStyle: 'single_pier',
      wear: 0.12
    }
  },
  {
    id: 'abandoned_overgrown_rail',
    label: 'Abandoned Rusted Spur',
    description: 'Decommissioned industrial branch with rusted rails, missing/skewed ties, and weathered ballast.',
    eraStyle: 'early_industrial',
    elevationMode: 'grade',
    domain: 'rail',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'abandoned_overgrown_rail',
      trackCount: 1,
      ballastMaterial: 'ballast_slag',
      sleeperMaterial: 'wood',
      sleeperSpacing: 0.78,
      abandonment: 0.78,
      includeBufferStop: true,
      wear: 0.75
    }
  },
  {
    id: 'street_tram_boulevard',
    label: 'Shared Street-Running Tram Boulevard',
    description: '4-lane urban arterial with flush non-overlapping center double streetcar rails and overhead wires.',
    eraStyle: 'modern_municipal',
    elevationMode: 'grade',
    domain: 'road',
    params: {
      ...INFRA_BASE_ROAD_PARAMS,
      presetId: 'street_tram_boulevard',
      laneCount: 4,
      laneWidth: 3.1,
      sidewalkWidth: 2.6,
      embeddedTramMode: 'center_double',
      embeddedTramGauge: 1.435,
      includeTramPoles: true,
      includeTramPlatform: true,
      wear: 0.16
    }
  },
  {
    id: 'tram_only_corridor',
    label: 'Dedicated Streetcar Slab Corridor',
    description: 'Car-free paved twin-track light rail reservation with overhead contact wires.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'grade',
    domain: 'tram',
    params: {
      ...INFRA_BASE_RAIL_PARAMS,
      presetId: 'tram_only_corridor',
      trackCount: 2,
      trackSpacing: 3.4,
      trackGauge: 1.435,
      ballastMaterial: 'concrete_slab',
      includeCatenary: true,
      includeWalkway: true,
      includePlatform: 'island',
      wear: 0.1
    }
  }
];

function famRailValidateEdge({ sampled, edge }) {
  const out = [];
  if (edge.curveType === 'arc' && sampled && Math.abs(edge.curveBulge || 0) > 4) {
    const chord = Math.max(4, sampled.lengthMeters || 20);
    const estRadius = (chord * chord) / (8 * Math.abs(edge.curveBulge)) + Math.abs(edge.curveBulge) * 0.5;
    const minR = edge.domain === 'tram' ? INFRA_DEFAULTS.minTramCurveRadiusMeters : INFRA_DEFAULTS.minRailCurveRadiusMeters;
    if (estRadius < minR) {
      out.push({
        id: `rail_radius_${edge.id}`,
        severity: 'warning',
        category: 'geometry',
        targetKind: 'edge',
        targetId: edge.id,
        message: `Curve radius ~${estRadius.toFixed(1)}m is tighter than standard ${minR}m minimum`
      });
    }
  }
  return out;
}

export function famRailRegisterAll() {
  infraRegisterFamily({
    id: 'railways',
    domain: 'rail',
    label: 'Railways & Street-Running Trams',
    description: 'Freight, passenger, high-speed, narrow-gauge, abandoned rail lines, switches, crossings, and embedded trams.',
    implemented: true,
    plannedMilestone: 'Milestone 2',
    supportedElevationModes: ['grade', 'elevated'],
    schema: FAM_RAIL_SCHEMA,
    defaults: INFRA_BASE_RAIL_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => {
      if (params?.embeddedTramMode && params.embeddedTramMode !== 'none') {
        return infraBuildRoadProfileFromParams(params, elevationMode, eraStyle);
      }
      return infraBuildRailProfileFromParams(params, elevationMode, eraStyle);
    },
    validateComponent: famRailValidateEdge
  });

  infraRegisterValidator({
    id: 'val_rail_geometry',
    domain: 'rail',
    label: 'Railway Geometry & Gauge Validator',
    validate: famRailValidateEdge
  });
  infraRegisterValidator({
    id: 'val_tram_geometry',
    domain: 'tram',
    label: 'Streetcar & Tram Validator',
    validate: famRailValidateEdge
  });

  infraRegisterComponentType({
    id: 'rail_segment',
    familyId: 'railways',
    domain: 'rail',
    label: 'Railway Track Segment',
    implemented: true,
    schema: FAM_RAIL_SCHEMA,
    defaults: INFRA_BASE_RAIL_PARAMS
  });

  infraRegisterComponentType({
    id: 'rail_switch',
    familyId: 'railways',
    domain: 'rail',
    label: 'Railway Turnout / Switch',
    implemented: true,
    schema: [
      {
        key: 'switchState',
        label: 'Switch Route',
        type: 'select',
        options: [
          ['normal', 'Normal (Mainline)'],
          ['reverse', 'Reverse (Diverging Siding)']
        ],
        group: 'Switch Mechanics'
      }
    ],
    defaults: { switchState: 'normal' }
  });

  infraRegisterComponentType({
    id: 'tram_corridor',
    familyId: 'railways',
    domain: 'tram',
    label: 'Streetcar / Tram Corridor',
    implemented: true,
    schema: FAM_RAIL_SCHEMA,
    defaults: FAM_RAIL_PRESETS[9].params
  });

  for (const preset of FAM_RAIL_PRESETS) {
    infraRegisterPreset({
      familyId: 'railways',
      domain: preset.domain || 'rail',
      ...preset
    });
    const prof = preset.params?.embeddedTramMode && preset.params.embeddedTramMode !== 'none'
      ? infraBuildRoadProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle)
      : infraBuildRailProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle);
    infraRegisterProfile(prof);
  }
}
