import { INFRA_BASE_BRIDGE_PARAMS } from '../config.js';
import { infraBuildBridgeProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile,
  infraRegisterValidator
} from '../core/registry.js';

export const FAM_BRG_SCHEMA = [
  {
    key: 'bridgeType',
    label: 'Bridge Engineering Type',
    type: 'select',
    options: [
      ['cable_stayed', 'Cable-Stayed Pylons & Fan Stays'],
      ['arch_deck', 'Deck Arch Ribs & Spandrels'],
      ['through_truss', 'Through-Truss Steel Span'],
      ['suspension', 'Suspension Towers & Catenary'],
      ['stone_viaduct', 'Historic Masonry Stone Viaduct'],
      ['box_girder', 'Tapered Concrete Box Girder']
    ],
    group: 'Bridge Structure',
    rngStream: 'profile'
  },
  { key: 'laneCount', label: 'Traffic Lanes', type: 'range', min: 1, max: 6, step: 1, group: 'Deck Geometry', rngStream: 'profile', safeMin: 2, safeMax: 4 },
  { key: 'laneWidth', label: 'Lane Width (m)', type: 'range', min: 2.8, max: 4.0, step: 0.1, group: 'Deck Geometry', rngStream: 'profile', safeMin: 3.0, safeMax: 3.6 },
  { key: 'includeWalkways', label: 'Side Pedestrian Walkways', type: 'boolean', group: 'Deck Geometry', rngStream: 'profile' },
  { key: 'walkwayWidth', label: 'Walkway Width (m)', type: 'range', min: 1.0, max: 3.0, step: 0.1, group: 'Deck Geometry', rngStream: 'profile', safeMin: 1.2, safeMax: 2.2 },
  { key: 'deckThickness', label: 'Deck Structural Depth (m)', type: 'range', min: 0.5, max: 1.6, step: 0.05, group: 'Bridge Structure', rngStream: 'elevation', safeMin: 0.7, safeMax: 1.1 },
  { key: 'towerHeightMeters', label: 'Tower / Pylon Height (m)', type: 'range', min: 10.0, max: 24.0, step: 0.5, group: 'Bridge Structure', rngStream: 'elevation', safeMin: 13.0, safeMax: 19.0 },
  { key: 'archRiseMeters', label: 'Arch Crown Rise (m)', type: 'range', min: 3.0, max: 9.0, step: 0.25, group: 'Bridge Structure', rngStream: 'elevation', safeMin: 4.5, safeMax: 7.0 },
  { key: 'cableCountPerSide', label: 'Stay Cables Per Fan', type: 'range', min: 3, max: 10, step: 1, group: 'Bridge Structure', rngStream: 'details', safeMin: 4, safeMax: 8 },
  {
    key: 'surfaceMaterial',
    label: 'Deck Surface',
    type: 'select',
    options: [
      ['asphalt', 'Asphalt Deck'],
      ['concrete', 'Brushed Concrete'],
      ['cobblestone', 'Historic Stone Deck']
    ],
    group: 'Materials',
    rngStream: 'materials'
  },
  { key: 'includeLighting', label: 'Bridge Lamps', type: 'boolean', group: 'Details', rngStream: 'details' },
  { key: 'wear', label: 'Surface Wear', type: 'range', min: 0, max: 1, step: 0.05, group: 'Materials', rngStream: 'materials', safeMin: 0.05, safeMax: 0.45 }
];

export const FAM_BRG_PRESETS = [
  {
    id: 'cable_stayed_bridge',
    label: 'Signature Cable-Stayed Bridge',
    description: 'Twin concrete/steel H-towers with radial metallic stay cables and flanked pedestrian walks.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'elevated',
    domain: 'road',
    params: { ...INFRA_BASE_BRIDGE_PARAMS, presetId: 'cable_stayed_bridge', bridgeType: 'cable_stayed', laneCount: 2, towerHeightMeters: 16.5, cableCountPerSide: 6 }
  },
  {
    id: 'arch_deck_bridge',
    label: 'Parabolic Steel Deck Arch Bridge',
    description: 'Twin curved structural steel arch ribs carrying vertical spandrel columns under the roadway.',
    eraStyle: 'modern_municipal',
    elevationMode: 'elevated',
    domain: 'road',
    params: { ...INFRA_BASE_BRIDGE_PARAMS, presetId: 'arch_deck_bridge', bridgeType: 'arch_deck', laneCount: 2, archRiseMeters: 5.8 }
  },
  {
    id: 'through_truss_bridge',
    label: 'Steel Through-Truss River Crossing',
    description: 'Deep steel Warren side trusses with overhead portal wind-bracing clearing 5m freight traffic.',
    eraStyle: 'early_industrial',
    elevationMode: 'elevated',
    domain: 'road',
    params: { ...INFRA_BASE_BRIDGE_PARAMS, presetId: 'through_truss_bridge', bridgeType: 'through_truss', laneCount: 2, trussHeightMeters: 5.5 }
  },
  {
    id: 'suspension_bridge',
    label: 'Twin-Tower Suspension Bridge',
    description: 'Classic draped parabolic main suspension cables and vertical steel suspenders across portals.',
    eraStyle: 'modern_municipal',
    elevationMode: 'elevated',
    domain: 'road',
    params: { ...INFRA_BASE_BRIDGE_PARAMS, presetId: 'suspension_bridge', bridgeType: 'suspension', laneCount: 4, towerHeightMeters: 17.5 }
  },
  {
    id: 'stone_viaduct_bridge',
    label: 'Historic Ashlar Stone Viaduct',
    description: 'Multi-bay masonry arch viaduct on heavy battered stone piers with cobblestone roadbed.',
    eraStyle: 'historic_european',
    elevationMode: 'elevated',
    domain: 'road',
    params: { ...INFRA_BASE_BRIDGE_PARAMS, presetId: 'stone_viaduct_bridge', bridgeType: 'stone_viaduct', laneCount: 2, surfaceMaterial: 'cobblestone', deckThickness: 1.0 }
  },
  {
    id: 'box_girder_overpass',
    label: 'Tapered Concrete Box-Girder Span',
    description: 'Sleek post-tensioned box-girder crossing with continuous concrete barriers and lamps.',
    eraStyle: 'modern_municipal',
    elevationMode: 'elevated',
    domain: 'road',
    params: { ...INFRA_BASE_BRIDGE_PARAMS, presetId: 'box_girder_overpass', bridgeType: 'box_girder', laneCount: 4, deckThickness: 1.1 }
  }
];

export function famBrgRegisterAll() {
  infraRegisterFamily({
    id: 'bridges',
    domain: 'road',
    label: 'Bridges & Structural Crossings',
    description: 'Cable-stayed, parabolic deck arch, steel through-truss, suspension, stone viaduct, and box-girder crossings.',
    implemented: true,
    plannedMilestone: 'Full Suite',
    supportedElevationModes: ['elevated'],
    schema: FAM_BRG_SCHEMA,
    defaults: INFRA_BASE_BRIDGE_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => infraBuildBridgeProfileFromParams(params, elevationMode, eraStyle)
  });

  infraRegisterValidator({
    id: 'val_bridge_span',
    domain: 'road',
    label: 'Bridge Deck Envelope Validator',
    validate: () => []
  });

  infraRegisterComponentType({
    id: 'bridge_span',
    familyId: 'bridges',
    domain: 'road',
    label: 'Structural Bridge Span',
    implemented: true,
    schema: FAM_BRG_SCHEMA,
    defaults: INFRA_BASE_BRIDGE_PARAMS
  });

  for (const preset of FAM_BRG_PRESETS) {
    infraRegisterPreset({ familyId: 'bridges', domain: preset.domain || 'road', ...preset });
    infraRegisterProfile(infraBuildBridgeProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle));
  }
}
