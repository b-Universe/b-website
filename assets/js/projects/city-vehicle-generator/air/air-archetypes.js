export const AIR_ARCHETYPES = [
  {
    id: 'news_helicopter',
    label: 'News Chopper (SkyCam)',
    icon: 'fa-helicopter',
    preset: 'news_helicopter',
    bodyFamily: 'air_news_chopper',
    vehicleDomain: 'air',
    categoryGroup: 'aviation',
    shortClass: 'News Heli',
    description: 'Agile ENG television news helicopter with panoramic bubble cockpit, nose gyro-camera gimbal, landing skids, and spinning rotors.'
  },
  {
    id: 'heavy_news_helicopter',
    label: 'Twin-Turbine News Heli',
    icon: 'fa-helicopter',
    preset: 'heavy_news_helicopter',
    bodyFamily: 'air_twin_chopper',
    vehicleDomain: 'air',
    categoryGroup: 'aviation',
    shortClass: 'Twin Broadcast',
    description: 'Twin-engine TV broadcast & traffic helicopter with 4-blade main rotor, shrouded fenestron tail, searchlight, and sliding camera bay.'
  }
];

export const AIR_SILHOUETTE_PROFILES = {
  news_chopper: { label: 'ENG Broadcast Helicopter', boxiness: 0.42, taper: 0.24, curvature: 0.56 },
  twin_broadcast_heli: { label: 'Twin-Turbine News Helicopter', boxiness: 0.48, taper: 0.2, curvature: 0.5 }
};

export const AIR_BASE_DEFAULTS = {
  vehicleDomain: 'air',
  bodyFamily: 'air_news_chopper',
  silhouetteFamily: 'news_chopper',
  overallLength: 10.4,
  overallWidth: 2.35,
  overallHeight: 3.15,
  airRotorDiameter: 9.8,
  airRotorBlades: 2,
  airTailStyle: 'classic_rotor',
  airLandingGear: 'skids',
  airNoseGimbal: 'broadcast_camera',
  airRotorSpinDeg: 0,
  airHoverHeight: 0,
  airDoorsOpen: 0,
  airInteriorEnabled: true,
  airCallsign: 'CH4-SKY',
  paletteFamily: 'broadcast_news',
  bodyPrimaryMaterial: 'painted_metal',
  bodyPrimaryColor: '#eef3f8',
  bodySecondaryMaterial: 'painted_metal',
  bodySecondaryColor: '#1b3868',
  trimMaterial: 'plastic_trim',
  trimColor: '#1d242e',
  bumperMaterial: 'utility_metal',
  bumperColor: '#363d46',
  wheelRimMaterial: 'chrome_metal',
  wheelRimColor: '#b9c4cf',
  tireMaterial: 'dark_rubber',
  tireColor: '#181c22',
  glassMaterial: 'reflective_glass',
  glassColor: '#26445e',
  utilityMaterial: 'chrome_metal',
  utilityColor: '#c9d2dc',
  liveryStripeColor: '#e2352c',
  colorVariation: 0.03,
  wearLevel: 'clean',
  roleVariant: 'news_media',
  headlightsLit: true,
  emergencyLightsLit: true,
  beaconFlash: true,
  windowTint: 0.36,
  signText: 'SKYCAM 4 NEWS'
};

export const AIR_PRESET_DEFINITIONS = {
  news_helicopter: {
    ...AIR_BASE_DEFAULTS,
    label: 'News Chopper (SkyCam)',
    style: 'news_helicopter',
    seed: 9104
  },
  heavy_news_helicopter: {
    ...AIR_BASE_DEFAULTS,
    label: 'Twin-Turbine Broadcast Helicopter',
    style: 'heavy_news_helicopter',
    seed: 9112,
    bodyFamily: 'air_twin_chopper',
    silhouetteFamily: 'twin_broadcast_heli',
    overallLength: 12.2,
    overallWidth: 2.68,
    overallHeight: 3.48,
    airRotorDiameter: 11.4,
    airRotorBlades: 4,
    airTailStyle: 'fenestron_shroud',
    airLandingGear: 'skids',
    airNoseGimbal: 'dual_flir_light',
    airCallsign: 'LIVE-TV7',
    bodyPrimaryColor: '#1a2f56',
    bodySecondaryColor: '#eef3f8',
    liveryStripeColor: '#e6a825',
    signText: 'CHANNEL 7 AIR'
  }
};

export const AIR_OPTIONS = {
  airTailStyle: [
    ['classic_rotor', 'Exposed Tail Rotor'],
    ['fenestron_shroud', 'Shrouded Fenestron Tail']
  ],
  airLandingGear: [
    ['skids', 'Tubular Landing Skids'],
    ['wheeled_gear', 'Fixed Wheeled Gear']
  ],
  airNoseGimbal: [
    ['broadcast_camera', 'Gyro Broadcast Camera Ball'],
    ['dual_flir_light', 'Camera Ball + Searchlight'],
    ['none', 'Clean Nose']
  ]
};

export const AIR_SCHEMA = {
  presets: [
    { group: 'Helicopter Archetype' },
    { key: 'style', name: 'Aircraft Archetype', type: 'select', optionsKey: 'styleList' },
    { key: 'seed', name: 'Generation Seed', type: 'number', min: 1, max: 99999999, step: 1 }
  ],
  structure: [
    { group: 'Airframe Dimensions' },
    { key: 'overallLength', name: 'Fuselage + Tail Length', min: 8.2, max: 14.5, step: 0.1, unit: 'm' },
    { key: 'overallWidth', name: 'Cabin / Skid Width', min: 1.9, max: 3.1, step: 0.02, unit: 'm' },
    { key: 'overallHeight', name: 'Mast Top Height', min: 2.6, max: 4.1, step: 0.02, unit: 'm' },
    { key: 'airLandingGear', name: 'Landing Gear Style', type: 'select' }
  ],
  body: [
    { group: 'Rotors & Tail Boom' },
    { key: 'airRotorDiameter', name: 'Main Rotor Diameter', min: 7.4, max: 13.5, step: 0.1, unit: 'm' },
    { key: 'airRotorBlades', name: 'Main Rotor Blades', min: 2, max: 5, step: 1 },
    { key: 'airTailStyle', name: 'Tail Rotor Configuration', type: 'select' }
  ],
  doors: [
    { group: 'Cabin Doors & Glass' },
    { key: 'airDoorsOpen', name: 'Camera Bay Door Open', min: 0, max: 1, step: 0.05 },
    { key: 'airInteriorEnabled', name: 'Cockpit & Operator Interior', type: 'boolean' },
    { key: 'windowTint', name: 'Canopy Glass Tint', min: 0.1, max: 0.85, step: 0.05 }
  ],
  wheels: [
    { group: 'Flight & Rotor Preview' },
    { key: 'airRotorSpinDeg', name: 'Rotor Angle Preview', min: 0, max: 360, step: 5, unit: '°' },
    { key: 'airHoverHeight', name: 'Hover Altitude Preview', min: 0, max: 3.5, step: 0.1, unit: 'm' }
  ],
  details: [
    { group: 'Broadcast & Aviation Gear' },
    { key: 'airNoseGimbal', name: 'Under-Nose Broadcast Turret', type: 'select' },
    { key: 'airCallsign', name: 'Tail Boom Callsign', type: 'text' },
    { key: 'signText', name: 'Station Livery Banner', type: 'text' },
    { key: 'headlightsLit', name: 'Landing & Search Light', type: 'boolean' },
    { key: 'emergencyLightsLit', name: 'Anti-Collision Strobes', type: 'boolean' },
    { key: 'beaconFlash', name: 'Live Strobe Flash', type: 'boolean' }
  ],
  materials: [
    { group: 'Livery & Finishes' },
    { key: 'paletteFamily', name: 'Color Palette Family', type: 'select' },
    { key: 'bodyPrimaryMaterial', name: 'Primary Fuselage Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'bodyPrimaryColor', name: 'Primary Fuselage Color', type: 'color' },
    { key: 'bodySecondaryMaterial', name: 'Secondary Trim Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'bodySecondaryColor', name: 'Secondary Accent Color', type: 'color' },
    { key: 'liveryStripeColor', name: 'Broadcast Stripe Color', type: 'color' },
    { key: 'glassMaterial', name: 'Canopy Glass Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'glassColor', name: 'Canopy Tint Color', type: 'color' }
  ],
  variants: [
    { group: 'Seed & Variation' },
    { key: 'seed', name: 'Generation Seed', type: 'number', min: 1, max: 99999999, step: 1 },
    { key: 'colorVariation', name: 'Paint Variation', min: 0, max: 0.35, step: 0.01 },
    { key: 'wearLevel', name: 'Weathering Level', type: 'select' }
  ],
  scene: [
    { group: 'Viewport Lighting' },
    { key: 'lightingTime', name: 'Time of Day', type: 'select' }
  ],
  export: []
};
