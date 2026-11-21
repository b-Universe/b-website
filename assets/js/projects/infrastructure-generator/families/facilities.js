import { INFRA_BASE_FACILITY_PARAMS } from '../config.js';
import { infraBuildFacilityProfileFromParams } from '../core/profiles.js';
import {
  infraRegisterComponentType,
  infraRegisterFamily,
  infraRegisterPreset,
  infraRegisterProfile
} from '../core/registry.js';

export const FAM_FAC_SCHEMA = [
  {
    key: 'facilityType',
    label: 'Facility Module Type',
    type: 'select',
    options: [
      ['protected_bikeway', 'Curb-Protected Two-Way Bikeway'],
      ['bus_rapid_bay', 'BRT Bus Rapid Transit Bay & Shelter'],
      ['surface_parking_bay', 'Double-Sided Parking Bay Corridor'],
      ['freight_loading_yard', 'Logistics Freight Loading Dock & Apron']
    ],
    group: 'Facility Configuration',
    rngStream: 'profile'
  },
  { key: 'corridorWidthMeters', label: 'Facility Width (m)', type: 'range', min: 2.2, max: 10.0, step: 0.2, group: 'Facility Configuration', rngStream: 'profile', safeMin: 2.6, safeMax: 6.0 },
  { key: 'includeCurbBuffer', label: 'Raised Protective Curbs', type: 'boolean', group: 'Facility Details', rngStream: 'details' },
  { key: 'includeBollards', label: 'Safety Bollards', type: 'boolean', group: 'Facility Details', rngStream: 'details' },
  { key: 'includeLighting', label: 'Facility Flood/Area Lamps', type: 'boolean', group: 'Facility Details', rngStream: 'details' },
  { key: 'wear', label: 'Surface Wear', type: 'range', min: 0, max: 1, step: 0.05, group: 'Materials', rngStream: 'materials', safeMin: 0.05, safeMax: 0.4 }
];

export const FAM_FAC_PRESETS = [
  {
    id: 'protected_bikeway',
    label: 'Curb-Protected Green Bikeway',
    description: 'Dedicated two-way striped green bicycle highway separated by raised concrete curbs and bollards.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'grade',
    domain: 'cycle',
    params: { ...INFRA_BASE_FACILITY_PARAMS, presetId: 'protected_bikeway', facilityType: 'protected_bikeway', corridorWidthMeters: 3.4, includeCurbBuffer: true, includeBollards: true }
  },
  {
    id: 'bus_rapid_bay',
    label: 'BRT Transit Station & Bus Pull-Off',
    description: 'Concrete BRT bus pad with raised glass-and-steel shelter platform, tactile curb & route totem.',
    eraStyle: 'contemporary_transit',
    elevationMode: 'grade',
    domain: 'road',
    params: { ...INFRA_BASE_FACILITY_PARAMS, presetId: 'bus_rapid_bay', facilityType: 'bus_rapid_bay', includePlatformShelter: true }
  },
  {
    id: 'surface_parking_bay',
    label: 'Municipal Parking Bay Corridor',
    description: 'Two-way asphalt drive aisle flanked by striped parking stalls, wheel stops, and LED lot poles.',
    eraStyle: 'modern_municipal',
    elevationMode: 'grade',
    domain: 'road',
    params: { ...INFRA_BASE_FACILITY_PARAMS, presetId: 'surface_parking_bay', facilityType: 'surface_parking_bay', includeLighting: true }
  },
  {
    id: 'freight_loading_yard',
    label: 'Logistics Freight Loading Dock & Apron',
    description: 'Heavy concrete semi-truck marshaling yard beside a raised loading dock with rubber bumpers & bollards.',
    eraStyle: 'early_industrial',
    elevationMode: 'grade',
    domain: 'road',
    params: { ...INFRA_BASE_FACILITY_PARAMS, presetId: 'freight_loading_yard', facilityType: 'freight_loading_yard' }
  }
];

export function famFacRegisterAll() {
  infraRegisterFamily({
    id: 'facilities',
    domain: 'road',
    label: 'Transit Facilities, Parking & Bike',
    description: 'Protected bikeways, BRT bus bays with shelters, parking bay corridors, and freight loading docks.',
    implemented: true,
    plannedMilestone: 'Full Suite',
    supportedElevationModes: ['grade'],
    schema: FAM_FAC_SCHEMA,
    defaults: INFRA_BASE_FACILITY_PARAMS,
    buildProfile: (params, elevationMode, eraStyle) => infraBuildFacilityProfileFromParams(params, elevationMode, eraStyle)
  });

  infraRegisterComponentType({
    id: 'cycle_corridor',
    familyId: 'facilities',
    domain: 'cycle',
    label: 'Protected Bicycle Corridor',
    implemented: true,
    schema: FAM_FAC_SCHEMA,
    defaults: FAM_FAC_PRESETS[0].params
  });

  infraRegisterComponentType({
    id: 'facility_bay',
    familyId: 'facilities',
    domain: 'road',
    label: 'Transit / Parking / Logistics Bay',
    implemented: true,
    schema: FAM_FAC_SCHEMA,
    defaults: FAM_FAC_PRESETS[1].params
  });

  for (const preset of FAM_FAC_PRESETS) {
    infraRegisterPreset({ familyId: 'facilities', domain: preset.domain || 'road', ...preset });
    infraRegisterProfile(infraBuildFacilityProfileFromParams(preset.params, preset.elevationMode, preset.eraStyle));
  }
}
