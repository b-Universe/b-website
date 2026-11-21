import { INFRA_BASE_TUNNEL_PARAMS } from '../config.js';
import { infraBuildTunnelProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile
} from '../core/registry.js';

export const FAM_TUN_SCHEMA = [
  {
    key: 'tunnelShape',
    label: 'Bore Profile Shape',
    type: 'select',
    options: [
      ['arch', 'Arched Concrete Vault'],
      ['circular', 'Circular TBM Shield Bore'],
      ['box', 'Cut-and-Cover Box Section']
    ],
    group: 'Tunnel Geometry',
    rngStream: 'profile'
  },
  {
    key: 'interiorMode',
    label: 'Interior Corridor Mode',
    type: 'select',
    options: [
      ['road', 'Highway / Vehicular Road'],
      ['metro', 'Twin-Track Electrified Metro'],
      ['rail', 'Single-Track Freight Rail']
    ],
    group: 'Tunnel Geometry',
    rngStream: 'profile'
  },
  { key: 'clearWidthMeters', label: 'Interior Width (m)', type: 'range', min: 5.0, max: 14.0, step: 0.2, group: 'Tunnel Geometry', rngStream: 'profile', safeMin: 6.0, safeMax: 11.0 },
  { key: 'clearHeightMeters', label: 'Clear Crown Height (m)', type: 'range', min: 4.2, max: 7.2, step: 0.2, group: 'Tunnel Geometry', rngStream: 'profile', safeMin: 4.8, safeMax: 6.2 },
  { key: 'wallThicknessMeters', label: 'Lining Wall Thickness (m)', type: 'range', min: 0.4, max: 1.0, step: 0.05, group: 'Tunnel Geometry', rngStream: 'profile', safeMin: 0.45, safeMax: 0.75 },
  { key: 'includeWalkways', label: 'Emergency Walkways', type: 'boolean', group: 'Interior Systems', rngStream: 'details' },
  { key: 'includePortals', label: 'Concrete Portal Headwalls', type: 'boolean', group: 'Interior Systems', rngStream: 'details' },
  { key: 'includeLighting', label: 'Ceiling Luminaire Strips', type: 'boolean', group: 'Interior Systems', rngStream: 'details' },
  { key: 'includeJetFans', label: 'Ventilation Jet Fans', type: 'boolean', group: 'Interior Systems', rngStream: 'details' },
  { key: 'wear', label: 'Lining Weathering', type: 'range', min: 0, max: 1, step: 0.05, group: 'Materials', rngStream: 'materials', safeMin: 0.05, safeMax: 0.4 }
];

export const FAM_TUN_PRESETS = [
  {
    id: 'highway_arch_tunnel',
    label: '2-Lane Highway Arch Tunnel',
    description: 'Concrete arched road bore with real open interior volume, portal headwalls, lights, and jet fans.',
    eraStyle: 'modern_municipal',
    elevationMode: 'underground',
    domain: 'road',
    params: { ...INFRA_BASE_TUNNEL_PARAMS, presetId: 'highway_arch_tunnel', tunnelShape: 'arch', interiorMode: 'road', clearWidthMeters: 8.6, clearHeightMeters: 5.2, includeJetFans: true }
  },
  {
    id: 'twin_road_box_tunnel',
    label: 'Cut-and-Cover Concrete Box Underpass',
    description: 'Wide rectangular reinforced concrete vehicular underpass with raised emergency walkways.',
    eraStyle: 'modern_municipal',
    elevationMode: 'underground',
    domain: 'road',
    params: { ...INFRA_BASE_TUNNEL_PARAMS, presetId: 'twin_road_box_tunnel', tunnelShape: 'box', interiorMode: 'road', clearWidthMeters: 10.4, clearHeightMeters: 5.4, includeJetFans: false }
  },
  {
    id: 'circular_tbm_bore',
    label: 'Circular TBM Road Bore',
    description: 'Deep bored circular express tunnel with overhead ventilation jet fans and lighting strips.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'underground',
    domain: 'road',
    params: { ...INFRA_BASE_TUNNEL_PARAMS, presetId: 'circular_tbm_bore', tunnelShape: 'circular', interiorMode: 'road', clearWidthMeters: 8.2, clearHeightMeters: 5.4, includeJetFans: true }
  },
  {
    id: 'underground_metro_box',
    label: 'Underground Twin-Track Subway Box',
    description: 'Cut-and-cover dual-track subway bore with steel rails, electrified third rail, and escape walks.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'underground',
    domain: 'rail',
    params: { ...INFRA_BASE_TUNNEL_PARAMS, presetId: 'underground_metro_box', tunnelShape: 'box', interiorMode: 'metro', clearWidthMeters: 8.8, clearHeightMeters: 5.0, includeJetFans: false }
  }
];

export function famTunRegisterAll() {
  infraRegisterFamily({
    id: 'tunnels',
    domain: 'road',
    label: 'Tunnels & Underground Corridors',
    description: 'Arched, circular TBM, and cut-and-cover box road/metro bores with real interior volume & portals.',
    implemented: true,
    plannedMilestone: 'Full Suite',
    supportedElevationModes: ['underground'],
    schema: FAM_TUN_SCHEMA,
    defaults: INFRA_BASE_TUNNEL_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => infraBuildTunnelProfileFromParams(params, elevationMode, eraStyle)
  });

  infraRegisterComponentType({
    id: 'tunnel_bore',
    familyId: 'tunnels',
    domain: 'road',
    label: 'Underground Tunnel Bore',
    implemented: true,
    schema: FAM_TUN_SCHEMA,
    defaults: INFRA_BASE_TUNNEL_PARAMS
  });

  for (const preset of FAM_TUN_PRESETS) {
    infraRegisterPreset({ familyId: 'tunnels', domain: preset.domain || 'road', ...preset });
    infraRegisterProfile(infraBuildTunnelProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle));
  }
}
