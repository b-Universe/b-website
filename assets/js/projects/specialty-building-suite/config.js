export const BLUEPRINT_SCHEMA_VERSION = 'b.specialty-building.v1';
export const B_UNITS_PER_METER = 16.404199475065617;
export const STORAGE_KEY = 'b_specialty_building_suite_saved_v1';

export const GENERATOR_META = {
  name: 'B Remastered 3d Specialty Building Suite',
  version: '1.0.0',
  coordinateSpace: 'right-handed-y-up-meters',
  bGameCoordinateSpace: 'z-up-b-game-units'
};

export const BUILDING_CATEGORIES = [
  { id: 'all', label: 'All Categories', shortLabel: 'All', icon: 'fa-city' },
  { id: 'food_hospitality', label: 'Food & Hospitality', shortLabel: 'Food', icon: 'fa-utensils' },
  { id: 'retail_shopping', label: 'Retail & Shopping', shortLabel: 'Retail', icon: 'fa-bag-shopping' },
  { id: 'automotive_transport', label: 'Automotive & Transportation', shortLabel: 'Automotive', icon: 'fa-gas-pump' },
  { id: 'civic_government', label: 'Civic & Government', shortLabel: 'Civic', icon: 'fa-landmark' },
  { id: 'emergency_healthcare', label: 'Emergency & Healthcare', shortLabel: 'Emergency', icon: 'fa-hospital' },
  { id: 'entertainment_recreation', label: 'Entertainment & Recreation', shortLabel: 'Recreation', icon: 'fa-dumbbell' },
  { id: 'industrial_infrastructure', label: 'Industrial & Infrastructure', shortLabel: 'Industrial', icon: 'fa-industry' },
  { id: 'lodging_accommodation', label: 'Lodging & Accommodation', shortLabel: 'Lodging', icon: 'fa-hotel' },
  { id: 'commercial_services', label: 'Commercial Services', shortLabel: 'Services', icon: 'fa-wrench' },
  { id: 'municipal_community', label: 'Municipal & Community Facilities', shortLabel: 'Municipal', icon: 'fa-fire-extinguisher' }
];

export const ARCHITECTURAL_ERAS = [
  { id: 'early_20th', label: 'Early 20th Century' },
  { id: '1940s_1950s', label: '1940s-1950s' },
  { id: '1960s_1970s', label: '1960s-1970s' },
  { id: '1980s_1990s', label: '1980s-1990s' },
  { id: 'early_2000s', label: 'Early 2000s' },
  { id: 'contemporary', label: 'Contemporary' },
  { id: 'retro_futuristic', label: 'Retro-Futuristic' },
  { id: 'futuristic', label: 'Futuristic' }
];

export const MATERIAL_FAMILIES = [
  { id: 'brick', label: 'Brick', defaultColor: '#8d4c3b' },
  { id: 'concrete', label: 'Concrete', defaultColor: '#90969c' },
  { id: 'stucco', label: 'Stucco', defaultColor: '#d9ccb8' },
  { id: 'stone', label: 'Stone', defaultColor: '#9e9788' },
  { id: 'painted_wood', label: 'Painted Wood', defaultColor: '#6b8599' },
  { id: 'glass', label: 'Glass Curtain', defaultColor: '#4d7c99' },
  { id: 'metal_siding', label: 'Metal Siding', defaultColor: '#6d7a87' },
  { id: 'industrial_steel', label: 'Industrial Steel', defaultColor: '#4c5763' },
  { id: 'tile', label: 'Ceramic Tile', defaultColor: '#c9d4dc' },
  { id: 'decorative_masonry', label: 'Decorative Masonry', defaultColor: '#a68265' },
  { id: 'mixed_commercial', label: 'Mixed Commercial', defaultColor: '#7a8794' }
];

export const CONDITION_LEVELS = [
  { id: 'new', label: 'New', wear: 0.0 },
  { id: 'clean', label: 'Clean', wear: 0.1 },
  { id: 'lightly_worn', label: 'Lightly Worn', wear: 0.25 },
  { id: 'weathered', label: 'Weathered', wear: 0.48 },
  { id: 'neglected', label: 'Neglected', wear: 0.7 },
  { id: 'damaged', label: 'Damaged', wear: 0.85 },
  { id: 'abandoned', label: 'Abandoned', wear: 1.0 }
];

export const LOT_TYPES = [
  { id: 'none', label: 'No Lot (Building Only)' },
  { id: 'compact_urban', label: 'Compact Urban Lot' },
  { id: 'corner_commercial', label: 'Corner Commercial Lot' },
  { id: 'small_suburban', label: 'Small Suburban Lot' },
  { id: 'standalone_commercial', label: 'Standalone Commercial Property' },
  { id: 'roadside_service', label: 'Roadside Service Lot' },
  { id: 'industrial_service', label: 'Industrial Service Lot' },
  { id: 'civic_plaza', label: 'Civic Plaza' },
  { id: 'multi_building_facility', label: 'Multi-Building Facility' }
];

export const VARIATION_STRENGTHS = [
  { id: 'none', label: 'None (Exact Preset)', factor: 0 },
  { id: 'subtle', label: 'Subtle', factor: 0.28 },
  { id: 'moderate', label: 'Moderate', factor: 0.65 },
  { id: 'strong', label: 'Strong', factor: 1.0 }
];

export const ROOF_STYLES = [
  { id: 'flat', label: 'Flat Parapet' },
  { id: 'pitched', label: 'Pitched Gable' },
  { id: 'hip', label: 'Hip Roof' },
  { id: 'mansard', label: 'Mansard' },
  { id: 'shed', label: 'Sloped Shed' },
  { id: 'sawtooth', label: 'Industrial Sawtooth' },
  { id: 'stepped', label: 'Stepped Deco' }
];

export const WINDOW_STYLES = [
  { id: 'storefront', label: 'Large Storefront' },
  { id: 'sash', label: 'Classic Sash' },
  { id: 'modern', label: 'Modern Ribbon' },
  { id: 'arched', label: 'Arched Vintage' },
  { id: 'industrial', label: 'Industrial Multi-Pane' },
  { id: 'barred', label: 'Security Barred' }
];

export const ENTRANCE_LOCATIONS = [
  { id: 'front_center', label: 'Front Center' },
  { id: 'front_left', label: 'Front Left' },
  { id: 'front_right', label: 'Front Right' },
  { id: 'corner', label: 'Corner Angled' }
];

export const SIGNAGE_STYLES = [
  { id: 'illuminated_fascia', label: 'Illuminated Fascia' },
  { id: 'neon_marquee', label: 'Neon Marquee' },
  { id: 'engraved_stone', label: 'Engraved Stone / Plaque' },
  { id: 'blade_sign', label: 'Projecting Blade Sign' },
  { id: 'industrial_painted', label: 'Painted Industrial' },
  { id: 'minimal', label: 'Minimal Trim' }
];

export const PARKING_CONFIGS = [
  { id: 'none', label: 'None' },
  { id: 'front_row', label: 'Front Row' },
  { id: 'side_lot', label: 'Side Lot' },
  { id: 'wrap_around', label: 'Wrap-Around' },
  { id: 'rear_yard', label: 'Rear Service Lot' }
];

export const SIDEWALK_CONFIGS = [
  { id: 'none', label: 'None' },
  { id: 'front_only', label: 'Front Street Sidewalk' },
  { id: 'corner_wrap', label: 'Corner Wrap Sidewalk' },
  { id: 'full_perimeter', label: 'Full Perimeter Apron' }
];

export const ENVIRONMENT_TAGS = [
  'urban',
  'downtown',
  'suburban',
  'highway',
  'industrial',
  'civic',
  'superhero_city',
  'retro',
  'nightlife',
  'medical',
  'retail',
  'service'
];

export const BASE_BUILDING_CONFIG = {
  familyId: 'gas_station',
  presetId: 'modern_corporate_gas_station',
  seed: 2026,
  variationStrength: 'subtle',
  lightingTime: 'day',

  // Layer visibility toggles
  includeBuildingLayer: true,
  includeLot: true,
  includeObjectsLayer: true,

  // Structure
  width: 12.0,
  depth: 8.0,
  floors: 1,
  floorHeight: 3.6,
  roofStyle: 'flat',
  roofPitchHeight: 1.6,
  parapetHeight: 0.45,

  // Facade
  windowDensity: 0.72,
  windowStyle: 'storefront',
  entranceLocation: 'front_center',
  entranceCount: 1,
  signageStyle: 'illuminated_fascia',
  signText: 'STARFUEL MART',
  interiorDisplay: true,

  // Materials & Style
  architecturalEra: 'contemporary',
  exteriorMaterial: 'mixed_commercial',
  primaryColor: '#d9dfe6',
  secondaryColor: '#2c4a6e',
  accentColor: '#d93c2b',
  trimColor: '#36414c',
  glassColor: '#4e83a6',
  condition: 'clean',

  // Lot
  lotType: 'roadside_service',
  lotWidth: 26.0,
  lotDepth: 22.0,
  frontSetback: 9.5,
  sideSetback: 4.5,
  parkingConfig: 'front_row',
  parkingCount: 6,
  sidewalkConfig: 'front_only',
  drivewayPlacement: 'dual',
  cornerLot: false,
  serviceAccess: true,

  // Shared Feature Checkboxes
  includeParking: true,
  includeLandscaping: true,
  includeDumpsters: true,
  includeRooftopHvac: true,
  includeIlluminatedSigns: true,
  includeUtilityPipes: true,
  includeSecurityCameras: true,
  includeWindowAds: true,
  includeBenches: true,
  includeOutdoorVending: true,
  includeRoofAccess: false,
  includeServiceEntrance: true,

  // Object density & group controls
  outdoorObjectDensity: 0.85,
  exteriorLighting: true,
  disabledObjectGroups: [],

  // Export scope
  exportScope: 'complete_property'
};

export const SHARED_CONTROL_TABS = [
  { id: 'structure', label: 'Structure', icon: 'fa-vector-square' },
  { id: 'facade', label: 'Facade', icon: 'fa-border-all' },
  { id: 'roof', label: 'Roof', icon: 'fa-home' },
  { id: 'lot', label: 'Lot', icon: 'fa-road' },
  { id: 'features', label: 'Features', icon: 'fa-sliders' },
  { id: 'objects', label: 'Objects', icon: 'fa-cubes' },
  { id: 'materials', label: 'Materials', icon: 'fa-palette' },
  { id: 'lighting', label: 'Lighting', icon: 'fa-lightbulb' },
  { id: 'export', label: 'Export', icon: 'fa-file-export' }
];

export const SHARED_SCHEMA_FIELDS = [
  // Structure tab
  { tab: 'structure', group: 'Primary Dimensions', key: 'width', label: 'Building Width', type: 'range', min: 3.5, max: 52, step: 0.5, unit: 'm' },
  { tab: 'structure', key: 'depth', label: 'Building Depth', type: 'range', min: 3.0, max: 40, step: 0.5, unit: 'm' },
  { tab: 'structure', key: 'floors', label: 'Floor Count', type: 'range', min: 1, max: 10, step: 1, unit: 'fl' },
  { tab: 'structure', key: 'floorHeight', label: 'Floor Height', type: 'range', min: 2.6, max: 7.5, step: 0.1, unit: 'm' },
  {
    tab: 'structure',
    group: 'Era & Style',
    key: 'architecturalEra',
    label: 'Architectural Era',
    type: 'select',
    options: ARCHITECTURAL_ERAS.map((e) => [e.id, e.label])
  },
  {
    tab: 'structure',
    key: 'condition',
    label: 'Building Condition',
    type: 'select',
    options: CONDITION_LEVELS.map((c) => [c.id, c.label])
  },

  // Facade tab
  { tab: 'facade', group: 'Openings & Glazing', key: 'windowDensity', label: 'Window Density', type: 'range', min: 0, max: 1, step: 0.05 },
  {
    tab: 'facade',
    key: 'windowStyle',
    label: 'Window Style',
    type: 'select',
    options: WINDOW_STYLES.map((w) => [w.id, w.label])
  },
  {
    tab: 'facade',
    key: 'entranceLocation',
    label: 'Entrance Location',
    type: 'select',
    options: ENTRANCE_LOCATIONS.map((e) => [e.id, e.label])
  },
  { tab: 'facade', key: 'entranceCount', label: 'Public Entrances', type: 'range', min: 1, max: 3, step: 1 },
  { tab: 'facade', group: 'Signage & Display', key: 'signText', label: 'Signage Text', type: 'text' },
  {
    tab: 'facade',
    key: 'signageStyle',
    label: 'Signage Style',
    type: 'select',
    options: SIGNAGE_STYLES.map((s) => [s.id, s.label])
  },
  { tab: 'facade', key: 'includeIlluminatedSigns', label: 'Illuminated Signage', type: 'boolean' },
  { tab: 'facade', key: 'includeWindowAds', label: 'Window Advertisements', type: 'boolean' },
  { tab: 'facade', key: 'interiorDisplay', label: 'Interior Window Display', type: 'boolean' },

  // Roof tab
  {
    tab: 'roof',
    group: 'Roof Architecture',
    key: 'roofStyle',
    label: 'Roof Style',
    type: 'select',
    options: ROOF_STYLES.map((r) => [r.id, r.label])
  },
  { tab: 'roof', key: 'roofPitchHeight', label: 'Roof Pitch / Crown Height', type: 'range', min: 0.4, max: 4.5, step: 0.1, unit: 'm' },
  { tab: 'roof', key: 'parapetHeight', label: 'Parapet Height', type: 'range', min: 0.1, max: 1.5, step: 0.05, unit: 'm' },
  { tab: 'roof', group: 'Rooftop Systems', key: 'includeRooftopHvac', label: 'Rooftop Hvac & Vents', type: 'boolean' },
  { tab: 'roof', key: 'includeRoofAccess', label: 'Roof Access Hatch / Headhouse', type: 'boolean' },

  // Lot tab
  { tab: 'lot', group: 'Site Enablement', key: 'includeLot', label: 'Include Surrounding Lot', type: 'boolean' },
  {
    tab: 'lot',
    key: 'lotType',
    label: 'Lot Configuration',
    type: 'select',
    options: LOT_TYPES.map((l) => [l.id, l.label])
  },
  { tab: 'lot', key: 'lotWidth', label: 'Lot Width', type: 'range', min: 8, max: 72, step: 1, unit: 'm' },
  { tab: 'lot', key: 'lotDepth', label: 'Lot Depth', type: 'range', min: 8, max: 68, step: 1, unit: 'm' },
  { tab: 'lot', key: 'frontSetback', label: 'Front Setback', type: 'range', min: 1.5, max: 24, step: 0.5, unit: 'm' },
  { tab: 'lot', key: 'sideSetback', label: 'Side Setback', type: 'range', min: 1.0, max: 18, step: 0.5, unit: 'm' },
  {
    tab: 'lot',
    group: 'Circulation & Parking',
    key: 'parkingConfig',
    label: 'Parking Layout',
    type: 'select',
    options: PARKING_CONFIGS.map((p) => [p.id, p.label])
  },
  { tab: 'lot', key: 'parkingCount', label: 'Parking Stalls', type: 'range', min: 0, max: 28, step: 1 },
  {
    tab: 'lot',
    key: 'sidewalkConfig',
    label: 'Sidewalk Configuration',
    type: 'select',
    options: SIDEWALK_CONFIGS.map((s) => [s.id, s.label])
  },
  {
    tab: 'lot',
    key: 'drivewayPlacement',
    label: 'Driveway Access',
    type: 'select',
    options: [
      ['none', 'None'],
      ['left', 'Left Curb Cut'],
      ['right', 'Right Curb Cut'],
      ['dual', 'Dual Pass-Through'],
      ['rear', 'Rear Alley Access']
    ]
  },
  { tab: 'lot', key: 'cornerLot', label: 'Corner Lot Side Street', type: 'boolean' },
  { tab: 'lot', key: 'serviceAccess', label: 'Service Access Zone', type: 'boolean' },
  { tab: 'lot', key: 'includeParking', label: 'Include Parking Stripes', type: 'boolean' },
  { tab: 'lot', key: 'includeLandscaping', label: 'Include Landscaping', type: 'boolean' },

  // Features tab (shared baseline checkboxes; family-specific controls append here)
  { tab: 'features', group: 'Shared Site & Building Features', key: 'includeServiceEntrance', label: 'Service / Rear Entrance', type: 'boolean' },
  { tab: 'features', key: 'includeDumpsters', label: 'Service Dumpsters & Waste', type: 'boolean' },
  { tab: 'features', key: 'includeUtilityPipes', label: 'Exterior Utility Pipes & Meters', type: 'boolean' },
  { tab: 'features', key: 'includeSecurityCameras', label: 'Security Cameras', type: 'boolean' },
  { tab: 'features', key: 'includeBenches', label: 'Exterior Benches & Seating', type: 'boolean' },
  { tab: 'features', key: 'includeOutdoorVending', label: 'Outdoor Vending Equipment', type: 'boolean' },

  // Objects tab
  { tab: 'objects', group: 'Layer C Controls', key: 'includeObjectsLayer', label: 'Enable Environmental Objects', type: 'boolean' },
  { tab: 'objects', key: 'outdoorObjectDensity', label: 'Outdoor Object Density', type: 'range', min: 0, max: 1, step: 0.05 },

  // Materials tab
  {
    tab: 'materials',
    group: 'Surface Materials',
    key: 'exteriorMaterial',
    label: 'Exterior Material',
    type: 'select',
    options: MATERIAL_FAMILIES.map((m) => [m.id, m.label])
  },
  { tab: 'materials', key: 'primaryColor', label: 'Primary Wall Color', type: 'color' },
  { tab: 'materials', key: 'secondaryColor', label: 'Secondary Accent Color', type: 'color' },
  { tab: 'materials', key: 'accentColor', label: 'Brand / Canopy Accent', type: 'color' },
  { tab: 'materials', key: 'trimColor', label: 'Trim & Frame Color', type: 'color' },
  { tab: 'materials', key: 'glassColor', label: 'Window Glass Tint', type: 'color' },

  // Lighting tab
  {
    tab: 'lighting',
    group: 'Environment Lighting',
    key: 'lightingTime',
    label: 'Time Of Day',
    type: 'select',
    options: [
      ['day', 'Daylight'],
      ['golden_hour', 'Golden Hour'],
      ['dusk', 'Dusk Twilight'],
      ['night', 'Nighttime']
    ]
  },
  { tab: 'lighting', key: 'exteriorLighting', label: 'Exterior Fixtures & Lamps', type: 'boolean' },

  // Export tab
  {
    tab: 'export',
    group: 'Export Separation',
    key: 'exportScope',
    label: 'Export Layer Scope',
    type: 'select',
    options: [
      ['complete_property', 'Complete Property (Building + Lot + Objects)'],
      ['building_and_objects', 'Building + Environmental Objects (No Lot)'],
      ['building_and_attached', 'Building + Attached Structures Only'],
      ['building_only', 'Main Building Shell Only']
    ]
  }
];
