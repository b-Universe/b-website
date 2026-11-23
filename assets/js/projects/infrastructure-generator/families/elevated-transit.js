import { INFRA_BASE_ELEVATED_PARAMS, INFRA_DEFAULTS } from '../config.js';
import { infraBuildElevatedTransitProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile,
  infraRegisterValidator
} from '../core/registry.js';

export const FAM_ELEV_SCHEMA = [
  {
    key: 'transitSystem',
    label: 'Transit System',
    type: 'select',
    options: [
      ['suspended_monorail', 'Suspended Monorail (Top-Hung)'],
      ['straddle_monorail', 'Straddle-Beam Monorail'],
      ['elevated_steel_metro', 'Elevated Steel Truss Metro']
    ],
    group: 'System Architecture',
    rngStream: 'profile'
  },
  {
    key: 'structuralStyle',
    label: 'Guideway Structure',
    type: 'select',
    options: [
      ['wuppertal_steel', 'Wuppertal Steel Warren Truss'],
      ['modern_box', 'Modern Concrete/Steel Box Girder'],
      ['single_podway', 'Streamlined Single Podway'],
      ['futuristic_shroud', 'Futuristic Illuminated Shroud'],
      ['industrial_truss', 'Heavy Industrial Truss']
    ],
    group: 'System Architecture',
    rngStream: 'profile'
  },
  { key: 'trackCount', label: 'Track / Lane Count', type: 'range', min: 1, max: 2, step: 1, group: 'System Architecture', rngStream: 'profile', safeMin: 1, safeMax: 2 },
  { key: 'trackSpacing', label: 'Track Spacing (m)', type: 'range', min: 2.8, max: 5.0, step: 0.1, group: 'System Architecture', rngStream: 'profile', safeMin: 3.2, safeMax: 4.2 },
  { key: 'guidewayWidth', label: 'Guideway Span Width (m)', type: 'range', min: 1.6, max: 7.4, step: 0.2, group: 'System Architecture', rngStream: 'profile', safeMin: 2.2, safeMax: 6.2 },
  { key: 'guidewayDepth', label: 'Truss / Girder Depth (m)', type: 'range', min: 0.9, max: 2.6, step: 0.05, group: 'System Architecture', rngStream: 'profile', safeMin: 1.4, safeMax: 2.1 },
  { key: 'hangingDropMeters', label: 'Hanging Cabin Drop (m)', type: 'range', min: 2.6, max: 4.8, step: 0.1, group: 'Clearance Envelope', rngStream: 'elevation', safeMin: 3.2, safeMax: 4.0 },
  { key: 'hangingWidthMeters', label: 'Cabin Width Envelope (m)', type: 'range', min: 1.8, max: 3.2, step: 0.05, group: 'Clearance Envelope', rngStream: 'elevation', safeMin: 2.2, safeMax: 2.7 },
  { key: 'includeMaintenanceWalkway', label: 'Maintenance Catwalk', type: 'boolean', group: 'Station & Walkways', rngStream: 'profile', falseBias: 0.25 },
  { key: 'includeStation', label: 'Elevated Boarding Station', type: 'boolean', group: 'Station & Walkways', rngStream: 'profile', falseBias: 0.7 },
  { key: 'stationArchitecture', label: 'Station Architecture', type: 'select', options: [
    ['industrial_open', 'Industrial Open-Air'], ['neighborhood_commuter', 'Neighborhood Commuter'],
    ['metropolitan_enclosed', 'Metropolitan Enclosed']
  ], group: 'Station & Walkways', rngStream: 'profile' },
  { key: 'stationCanopy', label: 'Canopy', type: 'select', options: [
    ['preset', 'Preset Roof'], ['corrugated', 'Corrugated Steel'], ['flat', 'Flat Steel'], ['pitched', 'Pitched Steel'], ['glazed', 'Glazed Roof']
  ], group: 'Station & Walkways', rngStream: 'profile' },
  { key: 'stationCoverage', label: 'Canopy Coverage (%)', type: 'range', min: 45, max: 100, step: 5, group: 'Station & Walkways', rngStream: 'profile', safeMin: 55, safeMax: 95 },
  { key: 'stationPlatformWidth', label: 'Platform Width (m)', type: 'range', min: 3.3, max: 4.4, step: 0.1, group: 'Station & Walkways', rngStream: 'profile', safeMin: 3.4, safeMax: 4.1 },
  { key: 'stationGlass', label: 'Wind Screen Coverage (%)', type: 'range', min: 0, max: 100, step: 5, group: 'Station & Walkways', rngStream: 'profile' },
  { key: 'stationStairCover', label: 'Stair Tower Cover', type: 'select', options: [
    ['preset', 'Preset Tower'], ['open', 'Open with Entry Hood'], ['covered', 'Covered Tower'], ['enclosed', 'Glazed Tower']
  ], group: 'Station & Walkways', rngStream: 'profile' },
  { key: 'stationLift', label: 'Accessible Lift', type: 'boolean', group: 'Station & Walkways', rngStream: 'profile' },
  { key: 'stationSeating', label: 'Benches per Platform', type: 'range', min: 0, max: 5, step: 1, group: 'Station & Walkways', rngStream: 'materials' },
  { key: 'stationLighting', label: 'Lighting Density', type: 'range', min: 1, max: 3, step: 1, group: 'Station & Walkways', rngStream: 'materials' },
  { key: 'stationDetail', label: 'Passenger Facility Density', type: 'range', min: 0, max: 3, step: 1, group: 'Station & Walkways', rngStream: 'materials' },
  { key: 'stationStairStyle', label: 'Station Stair Finish', type: 'select', options: [
    ['grated', 'Industrial grating'], ['ribbed', 'Ribbed steel'], ['concrete', 'Concrete infill']
  ], group: 'Station & Walkways', rngStream: 'materials' },
  {
    key: 'supportStyle',
    label: 'Pylon / Portal Style',
    type: 'select',
    options: [
      ['a_frame_wuppertal', 'Wuppertal A-Frame Portal'],
      ['steel_lattice_portal', 'Steel Lattice Portal'],
      ['t_pylon', 'Central T-Pylon'],
      ['y_pylon', 'Braced Y-Pylon'],
      ['cantilever_l', 'Roadside L-Cantilever'],
      ['straddle_portal', 'Wide Road-Straddle Portal']
    ],
    group: 'Structural Supports',
    rngStream: 'elevation'
  },
  { key: 'supportSpacing', label: 'Pylon Spacing (m)', type: 'range', min: 12, max: 26, step: 1, group: 'Structural Supports', rngStream: 'elevation', safeMin: 14, safeMax: 22 },
  { key: 'wear', label: 'Steel Weathering', type: 'range', min: 0, max: 1, step: 0.05, group: 'Materials', rngStream: 'materials', safeMin: 0.05, safeMax: 0.45 }
];

export const FAM_ELEV_PRESETS = [
  {
    id: 'wuppertal_steel_double',
    label: 'Wuppertal Steel Suspended Double',
    description: 'Classic riveted Warren-truss twin suspended monorail carried on straddling A-frame arches.',
    eraStyle: 'historic_european',
    elevationMode: 'suspended',
    domain: 'suspended_rail',
    params: {
      ...INFRA_BASE_ELEVATED_PARAMS,
      presetId: 'wuppertal_steel_double',
      transitSystem: 'suspended_monorail',
      structuralStyle: 'wuppertal_steel',
      trackCount: 2,
      trackSpacing: 3.6,
      guidewayWidth: 5.4,
      guidewayDepth: 1.75,
      hangingDropMeters: 3.6,
      hangingWidthMeters: 2.55,
      supportStyle: 'a_frame_wuppertal',
      includeMaintenanceWalkway: true,
      includeStation: false,
      wear: 0.2
    }
  },
  {
    id: 'modern_suspended_double',
    label: 'Modern Box Suspended Monorail',
    description: 'Clean twin suspended transit line inside tapered box girders on central T-pylons.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'suspended',
    domain: 'suspended_rail',
    params: {
      ...INFRA_BASE_ELEVATED_PARAMS,
      presetId: 'modern_suspended_double',
      transitSystem: 'suspended_monorail',
      structuralStyle: 'modern_box',
      trackCount: 2,
      trackSpacing: 3.4,
      guidewayWidth: 5.0,
      guidewayDepth: 1.45,
      hangingDropMeters: 3.5,
      supportStyle: 't_pylon',
      includeMaintenanceWalkway: true,
      wear: 0.08
    }
  },
  {
    id: 'suspended_single_podway',
    label: 'Single-Track Suspended Podway',
    description: 'Compact single-beam overhead automated shuttle line supported by roadside L-cantilevers.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'suspended',
    domain: 'suspended_rail',
    params: {
      ...INFRA_BASE_ELEVATED_PARAMS,
      presetId: 'suspended_single_podway',
      transitSystem: 'suspended_monorail',
      structuralStyle: 'single_podway',
      trackCount: 1,
      guidewayWidth: 2.2,
      guidewayDepth: 1.25,
      hangingDropMeters: 3.1,
      hangingWidthMeters: 2.0,
      supportStyle: 'cantilever_l',
      includeMaintenanceWalkway: false,
      wear: 0.05
    }
  },
  {
    id: 'futuristic_enclosed_suspended',
    label: 'Futuristic Shrouded Suspended Rail',
    description: 'Aerodynamic faceted twin-track overhead guideway with glowing accent strips and Y-pylons.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'suspended',
    domain: 'suspended_rail',
    params: {
      ...INFRA_BASE_ELEVATED_PARAMS,
      presetId: 'futuristic_enclosed_suspended',
      transitSystem: 'suspended_monorail',
      structuralStyle: 'futuristic_shroud',
      trackCount: 2,
      trackSpacing: 3.6,
      guidewayWidth: 5.2,
      guidewayDepth: 1.6,
      hangingDropMeters: 3.4,
      supportStyle: 'y_pylon',
      includeMaintenanceWalkway: false,
      wear: 0.04
    }
  },
  {
    id: 'industrial_suspended_cargo',
    label: 'Industrial Suspended Freight Monorail',
    description: 'Heavy braced truss monorail crane/cargo guideway carried on lattice steel portal towers.',
    eraStyle: 'early_industrial',
    elevationMode: 'suspended',
    domain: 'suspended_rail',
    params: {
      ...INFRA_BASE_ELEVATED_PARAMS,
      presetId: 'industrial_suspended_cargo',
      transitSystem: 'suspended_monorail',
      structuralStyle: 'industrial_truss',
      trackCount: 2,
      trackSpacing: 4.0,
      guidewayWidth: 5.8,
      guidewayDepth: 2.05,
      hangingDropMeters: 3.8,
      supportStyle: 'steel_lattice_portal',
      includeMaintenanceWalkway: true,
      wear: 0.35
    }
  },
  {
    id: 'straddle_beam_monorail',
    label: 'Straddle-Beam Concrete Monorail',
    description: 'Twin concrete Alweg-style monorail beams with steel guideway strips and T-pylons.',
    eraStyle: 'modern_municipal',
    elevationMode: 'elevated',
    domain: 'monorail',
    params: {
      ...INFRA_BASE_ELEVATED_PARAMS,
      presetId: 'straddle_beam_monorail',
      transitSystem: 'straddle_monorail',
      structuralStyle: 'modern_box',
      trackCount: 2,
      trackSpacing: 3.6,
      guidewayWidth: 4.8,
      guidewayDepth: 1.5,
      hangingDropMeters: 0,
      supportStyle: 't_pylon',
      includeMaintenanceWalkway: false,
      wear: 0.14
    }
  },
  {
    id: 'elevated_steel_metro',
    label: 'Elevated Steel Truss "L" Metro',
    description: 'Historic twin-track steel plate/Warren girder elevated subway structure with third rail and catwalk.',
    eraStyle: 'early_industrial',
    elevationMode: 'elevated',
    domain: 'rail',
    params: {
      ...INFRA_BASE_ELEVATED_PARAMS,
      presetId: 'elevated_steel_metro',
      transitSystem: 'elevated_steel_metro',
      structuralStyle: 'industrial_truss',
      trackCount: 2,
      trackSpacing: 3.8,
      guidewayWidth: 7.2,
      guidewayDepth: 1.25,
      hangingDropMeters: 0,
      supportStyle: 'steel_lattice_portal',
      includeMaintenanceWalkway: true,
      wear: 0.28
    }
  },
  {
    id: 'suspended_station_corridor',
    label: 'Wuppertal Station & Switchback Access',
    description: 'Suspended double monorail complete with elevated glass-and-steel boarding platforms and street stairs.',
    eraStyle: 'historic_european',
    elevationMode: 'suspended',
    domain: 'suspended_rail',
    params: {
      ...INFRA_BASE_ELEVATED_PARAMS,
      presetId: 'suspended_station_corridor',
      transitSystem: 'suspended_monorail',
      structuralStyle: 'wuppertal_steel',
      trackCount: 2,
      trackSpacing: 3.6,
      guidewayWidth: 5.4,
      guidewayDepth: 1.75,
      hangingDropMeters: 3.6,
      hangingWidthMeters: 2.55,
      supportStyle: 'a_frame_wuppertal',
      includeMaintenanceWalkway: true,
      includeStation: true,
      stationStairStyle: 'concrete',
      wear: 0.16
    }
  }
];

for (const [stationArchitecture, label, width, coverage, glass, seating] of [
  ['industrial_open', 'Industrial Open-Air', 3.55, 72, 0, 2],
  ['neighborhood_commuter', 'Neighborhood Commuter', 3.85, 82, 55, 3],
  ['metropolitan_enclosed', 'Metropolitan Enclosed', 4.15, 96, 100, 4]
]) {
  const source = FAM_ELEV_PRESETS[4];
  const id = `suspended_station_${stationArchitecture}`;
  FAM_ELEV_PRESETS.push({
    ...source, id, label, description: `${label} station with sheltered platforms and accessible street entrances.`,
    params: { ...source.params, presetId: id, includeStation: true, trackCount: 1, stationArchitecture,
      stationPlatformWidth: width, stationCoverage: coverage, stationGlass: glass, stationSeating: seating }
  });
}

function famElevValidateEdge({ sampled, edge }) {
  const out = [];
  const p = edge.params || {};
  const isSuspended = edge.domain === 'suspended_rail' || edge.elevationMode === 'suspended' || p.transitSystem === 'suspended_monorail';
  if (isSuspended && sampled?.frames?.length) {
    const drop = Number(p.hangingDropMeters) || INFRA_DEFAULTS.suspendedHangingDropMeters;
    let minGroundGap = Infinity;
    for (const f of sampled.frames) {
      const gap = f.position[1] - drop;
      if (gap < minGroundGap) minGroundGap = gap;
    }
    if (minGroundGap < INFRA_DEFAULTS.suspendedMinStreetClearanceMeters - 1e-3) {
      out.push({
        id: `susp_ground_clear_${edge.id}`,
        severity: 'error',
        category: 'clearance',
        targetKind: 'edge',
        targetId: edge.id,
        message: `Suspended cabin bottom clears ground by only ${minGroundGap.toFixed(2)}m (< ${INFRA_DEFAULTS.suspendedMinStreetClearanceMeters}m street envelope)`
      });
    }
  }
  return out;
}

export function famElevRegisterAll() {
  infraRegisterFamily({
    id: 'elevated_transit',
    domain: 'suspended_rail',
    label: 'Elevated & Suspended Transit',
    description: 'Wuppertal suspended monorails, podways, straddle-beam monorails, elevated steel metro, and stations.',
    implemented: true,
    plannedMilestone: 'Milestone 2',
    supportedElevationModes: ['suspended', 'elevated'],
    schema: FAM_ELEV_SCHEMA,
    defaults: INFRA_BASE_ELEVATED_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => infraBuildElevatedTransitProfileFromParams(params, elevationMode, eraStyle),
    validateComponent: famElevValidateEdge
  });

  infraRegisterValidator({
    id: 'val_elev_suspended',
    domain: 'suspended_rail',
    label: 'Suspended Monorail Envelope Validator',
    validate: famElevValidateEdge
  });
  infraRegisterValidator({
    id: 'val_elev_monorail',
    domain: 'monorail',
    label: 'Straddle Monorail Validator',
    validate: famElevValidateEdge
  });

  infraRegisterComponentType({
    id: 'suspended_guideway',
    familyId: 'elevated_transit',
    domain: 'suspended_rail',
    label: 'Suspended Monorail Guideway',
    implemented: true,
    schema: FAM_ELEV_SCHEMA,
    defaults: INFRA_BASE_ELEVATED_PARAMS
  });

  infraRegisterComponentType({
    id: 'monorail_guideway',
    familyId: 'elevated_transit',
    domain: 'monorail',
    label: 'Straddle-Beam Monorail Guideway',
    implemented: true,
    schema: FAM_ELEV_SCHEMA,
    defaults: FAM_ELEV_PRESETS[5].params
  });

  infraRegisterComponentType({
    id: 'suspended_station',
    familyId: 'elevated_transit',
    domain: 'suspended_rail',
    label: 'Suspended Monorail Station',
    implemented: true,
    schema: FAM_ELEV_SCHEMA,
    defaults: FAM_ELEV_PRESETS[7].params
  });

  for (const preset of FAM_ELEV_PRESETS) {
    infraRegisterPreset({
      familyId: 'elevated_transit',
      domain: preset.domain || 'suspended_rail',
      ...preset
    });
    infraRegisterProfile(infraBuildElevatedTransitProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle));
  }
}
