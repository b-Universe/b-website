import { clamp, copy, colorHex } from './utils.js';
import { ARCHETYPES, SILHOUETTE_PROFILES, PRESET_DEFINITIONS } from './core/archetypes.js';

export const STORAGE_KEY = 'b-remastered-city-vehicle-presets-v1';
export const BLUEPRINT_SCHEMA_VERSION = 'b.vehicle.v1';
export const B_UNITS_PER_METER = 16.404199475065617;

export const GENERATOR_META = {
  id: 'b-3d-city-vehicle-generator',
  name: 'B Remastered 3d City Vehicle Generator',
  version: '1.0.0',
  coordinateSystem: {
    handedness: 'right-handed',
    upAxis: '+Y',
    forwardAxis: '+Z',
    rightAxis: '+X',
    units: 'meters',
    rotationOrder: 'XYZ',
    rotationUnits: 'radians',
    origin: 'ground-level center beneath vehicle footprint (x=0, y=0, z=0); front bumper faces +Z'
  }
};

export const MATERIAL_FAMILIES = {
  painted_metal: { label: 'Painted Metal', category: 'paint', defaultColor: '#4c7ca8', shininess: 62, pattern: 'painted' },
  matte_body: { label: 'Matte Painted Body', category: 'paint', defaultColor: '#6f7c87', shininess: 16, pattern: 'matte' },
  worn_paint: { label: 'Worn Paint', category: 'paint', defaultColor: '#b57b4a', shininess: 22, pattern: 'worn' },
  plastic_trim: { label: 'Plastic Trim', category: 'trim', defaultColor: '#252a30', shininess: 18, pattern: 'plastic' },
  dark_rubber: { label: 'Dark Rubber', category: 'rubber', defaultColor: '#1a1d21', shininess: 8, pattern: 'rubber' },
  chrome_metal: { label: 'Chrome & Alloy', category: 'metal', defaultColor: '#c3ccd4', shininess: 110, pattern: 'metal' },
  utility_metal: { label: 'Metal Utility Parts', category: 'metal', defaultColor: '#8d96a0', shininess: 54, pattern: 'utility' },
  reflective_glass: { label: 'Reflective Glass', category: 'glass', defaultColor: '#3d6685', shininess: 150, pattern: 'glass' },
  tinted_glass: { label: 'Tinted Glass', category: 'glass', defaultColor: '#233647', shininess: 130, pattern: 'glass' },
  dark_glass: { label: 'Dark Glass', category: 'glass', defaultColor: '#182430', shininess: 138, pattern: 'glass' }
};

export const PALETTE_FAMILIES = {
  civilian_neutrals: {
    label: 'Civilian Neutrals',
    primaries: ['#7a8793', '#49545e', '#c6cbd0', '#364d5e', '#8b8378', '#2c3540'],
    secondaries: ['#4f5b66', '#252b32', '#9da4ab'],
    stripes: ['#dce2e8', '#8d97a0']
  },
  bright_city: {
    label: 'Bright City Colors',
    primaries: ['#3f7fb8', '#c95344', '#2d8a68', '#d99a32', '#526cc2', '#ba4f6f'],
    secondaries: ['#252a32', '#d7dfe6', '#1e4263'],
    stripes: ['#f2f5f7', '#e8a233']
  },
  taxi_palette: {
    label: 'Taxi Palette',
    primaries: ['#e2ae2c', '#ebb936', '#d89b24', '#f0c744'],
    secondaries: ['#21262c', '#e6ebf0'],
    stripes: ['#1e2228', '#f5e29e']
  },
  service_utility: {
    label: 'Service & Utility',
    primaries: ['#d9842b', '#dad3c5', '#dce2e8', '#4e7356', '#c9a63a'],
    secondaries: ['#375e7d', '#56606b', '#2c5c8a'],
    stripes: ['#e08b26', '#e6edf5']
  },
  emergency_palette: {
    label: 'Emergency Palette',
    primaries: ['#1d2633', '#e9eef2', '#c93a32', '#263e5c'],
    secondaries: ['#e6ebf0', '#c93a32', '#1d2633'],
    stripes: ['#c93a32', '#e6ebf0', '#326dc9']
  },
  muted_industrial: {
    label: 'Muted Industrial',
    primaries: ['#8d4336', '#c9cfd6', '#5a6659', '#6e6556', '#4a5763'],
    secondaries: ['#485869', '#2b3036', '#69727b'],
    stripes: ['#c95c32', '#d9ccb8']
  },
  retro_city: {
    label: 'Retro City Palette',
    primaries: ['#567863', '#3f8a88', '#c46c49', '#6f7e91', '#b89454'],
    secondaries: ['#8d6e4c', '#2b3642', '#d6cbb5'],
    stripes: ['#e88b48', '#d9ccb6']
  }
};

export const STYLES = ARCHETYPES;
export { ARCHETYPES, SILHOUETTE_PROFILES };
export const PRESETS = PRESET_DEFINITIONS;

export const BASE = {
  ...copy(PRESET_DEFINITIONS.sedan),
  lightingTime: 'day',
  headlightsLit: true,
  emergencyLightsLit: true,
  beaconFlash: true
};

delete BASE.label;

export const OPTIONS = {
  bodyFamily: [
    ['two_box', 'Two-Box Hatchback / Suv'],
    ['three_box', 'Three-Box Sedan'],
    ['fastback', 'Fastback Coupe'],
    ['convertible_open', 'Open-Top Convertible'],
    ['pickup_cab_bed', 'Pickup Cab & Open Bed'],
    ['van_monobox', 'Monobox Van / Minibus'],
    ['cab_over_box', 'Cab + Cargo Box'],
    ['transit_bus', 'Elongated Transit Bus'],
    ['articulated_bus', 'Articulated Accordion Bus'],
    ['semi_trailer', 'Semi Tractor & Trailer'],
    ['wedge_futuristic', 'Wedge Retro-Futuristic']
  ],
  silhouetteFamily: Object.entries(SILHOUETTE_PROFILES).map(([id, def]) => [id, def.label]),
  rooflineStyle: [
    ['flat', 'Flat Utility Roof'],
    ['domed', 'Slightly Domed Roof'],
    ['sloped_fastback', 'Sloped Fastback'],
    ['stepped_van', 'Stepped High Van Roof'],
    ['raised_transit', 'Raised Transit Crown'],
    ['split_aero', 'Split Aero Profile']
  ],
  doorLayout: [
    ['2_door', '2-Door Coupe'],
    ['4_door', '4-Door Sedan'],
    ['5_door_hatch', '5-Door Hatchback'],
    ['van_sliding', 'Van Sliding Side Door'],
    ['truck_cab', 'Truck Cab Doors'],
    ['transit_bus', 'Bus Folding Entry Doors']
  ],
  busDoorPlacement: [
    ['none', 'None'],
    ['front_only', 'Front Entry Only'],
    ['front_and_mid', 'Front & Mid Entry'],
    ['mid_only', 'Mid Entry Only']
  ],
  rearCargoDoor: [
    ['none', 'Fixed Trunk / Solid Rear'],
    ['liftgate', 'Rear Liftgate'],
    ['tailgate', 'Drop Tailgate'],
    ['double_barn', 'Double Cargo Barn Doors'],
    ['rollup_shutter', 'Roll-Up Shutter Door']
  ],
  hubcapStyle: [
    ['solid_steel', 'Solid Steel Wheel'],
    ['classic_dish', 'Classic Dish Hubcap'],
    ['five_spoke', 'Five-Spoke Alloy'],
    ['heavy_lug', 'Heavy Service Lug Hub'],
    ['aero_disc', 'Retro Aero Disc']
  ],
  bumperStyle: [
    ['standard', 'Standard Bumper'],
    ['heavy_duty', 'Heavy Duty Bumper'],
    ['integrated', 'Integrated Body Bumper'],
    ['chrome_classic', 'Classic Chrome Bumper'],
    ['stepped_utility', 'Stepped Utility Bumper']
  ],
  headlightStyle: [
    ['rectangular', 'Rectangular Headlights'],
    ['round_classic', 'Classic Round Headlamps'],
    ['twin_quad', 'Twin Quad Lamps'],
    ['slit_modern', 'Slim Angled Lamps'],
    ['flush_bar', 'Retro Light Strip']
  ],
  taillightStyle: [
    ['block', 'Classic Block Taillights'],
    ['vertical_stack', 'Vertical Utility Stack'],
    ['wide_bar', 'Wide Rear Light Bar'],
    ['round_dual', 'Dual Round Lamps']
  ],
  grilleStyle: [
    ['slatted', 'Horizontal Slatted Grille'],
    ['mesh', 'Dark Mesh Grille'],
    ['split_bar', 'Split Center Bar'],
    ['heavy_horizontal', 'Heavy Truck Grille'],
    ['minimal_ev', 'Minimal Clean Nose']
  ],
  mirrorStyle: [
    ['standard', 'Standard Side Mirrors'],
    ['compact', 'Compact Aero Mirrors'],
    ['truck_tow', 'Tall Truck Mirrors'],
    ['bus_extended', 'Extended Transit Mirrors'],
    ['none', 'None']
  ],
  doorHandleStyle: [
    ['bar', 'Grab Bar Handles'],
    ['flush', 'Flush Recessed Handles'],
    ['recessed', 'Pocket Handles'],
    ['none', 'None']
  ],
  sideTrim: [
    ['none', 'Clean Sides'],
    ['rub_strip', 'Black Rub Strip'],
    ['chrome_band', 'Chrome Belt Trim'],
    ['lower_cladding', 'Lower Rocker Cladding']
  ],
  exhaustStyle: [
    ['single', 'Single Rear Pipe'],
    ['dual', 'Dual Rear Pipes'],
    ['vertical_stack', 'Vertical Cab Stack'],
    ['hidden', 'Hidden / Electric']
  ],
  paletteFamily: Object.entries(PALETTE_FAMILIES).map(([id, def]) => [id, def.label]),
  materialFamily: Object.entries(MATERIAL_FAMILIES).map(([id, def]) => [id, def.label]),
  wearLevel: [
    ['clean', 'Clean Factory'],
    ['slightly_used', 'Slightly Used'],
    ['worn', 'City Worn'],
    ['municipal_worn', 'Municipal / Service Worn']
  ],
  roleVariant: [
    ['civilian', 'Civilian'],
    ['taxi', 'City Taxi'],
    ['delivery', 'Commercial Delivery'],
    ['food_vendor', 'Street Food Vendor'],
    ['service', 'Utility / Service'],
    ['police', 'Police / Security'],
    ['ambulance', 'Ambulance / Medical'],
    ['transit', 'Public Transit']
  ],
  lightBar: [
    ['none', 'None'],
    ['police_bar', 'Police Red & Blue Bar'],
    ['ambulance_bar', 'Ambulance Emergency Bar'],
    ['amber_work_bar', 'Amber Work Beacon Bar'],
    ['vintage_beacon', 'Single Vintage Beacon']
  ],
  roofRack: [
    ['none', 'None'],
    ['luggage_rack', 'Roof Luggage Rack'],
    ['utility_rack', 'Utility Storage Rack'],
    ['ladder_rack', 'Work Ladder Rack'],
    ['delivery_pod', 'Aerodynamic Roof Pod'],
    ['bus_ac_unit', 'Rooftop Ac Unit']
  ],
  frontAttachment: [
    ['none', 'None'],
    ['bumper_guards', 'Push Bumper Guards'],
    ['bull_bar', 'Heavy Bull Bar'],
    ['winch_bumper', 'Service Winch Bumper']
  ],
  rearAttachment: [
    ['none', 'None'],
    ['spare_tire', 'Rear Mounted Spare Tire'],
    ['cargo_step', 'Rear Cargo Step'],
    ['tow_hook', 'Heavy Tow Hitch'],
    ['tow_boom', 'Wrecker Tow Boom & Winch'],
    ['compactor_hopper', 'Sanitation Rear Hopper'],
    ['rear_ladder', 'Rear Access Ladder']
  ],
  sideUtility: [
    ['none', 'None'],
    ['branding_panels', 'Side Branding Panels'],
    ['utility_bins', 'Side Utility Tool Bins'],
    ['livery_stripe', 'Accent Livery Stripe'],
    ['checker_trim', 'Taxi Checker Trim'],
    ['serving_window', 'Food Truck Window & Awning']
  ],
  lightingTime: [
    ['day', 'Daytime'],
    ['golden_hour', 'Golden Hour'],
    ['dusk', 'Dusk Twilight'],
    ['night', 'Nighttime']
  ]
};

export const SCHEMA = {
  presets: [
    { group: 'Vehicle Archetypes' },
    { key: 'style', name: 'Vehicle Archetype', type: 'select', optionsKey: 'styleList' },
    { key: 'seed', name: 'Generation Seed', type: 'number', min: 1, max: 99999999, step: 1 }
  ],
  structure: [
    { group: 'Body Class & Silhouette' },
    { key: 'bodyFamily', name: 'Body Architecture', type: 'select' },
    { key: 'silhouetteFamily', name: 'Silhouette Family', type: 'select' },
    { group: 'Overall Dimensions' },
    { key: 'overallLength', name: 'Overall Length', min: 2.6, max: 15.5, step: 0.05, unit: 'm' },
    { key: 'overallWidth', name: 'Overall Width', min: 1.4, max: 2.65, step: 0.02, unit: 'm' },
    { key: 'overallHeight', name: 'Overall Height', min: 1.15, max: 3.6, step: 0.02, unit: 'm' },
    { key: 'groundClearance', name: 'Ground Clearance', min: 0.1, max: 0.55, step: 0.01, unit: 'm' },
    { key: 'roofHeight', name: 'Greenhouse / Roof Height', min: 0.35, max: 2.1, step: 0.02, unit: 'm' },
    { group: 'Longitudinal Proportions' },
    { key: 'wheelbase', name: 'Wheelbase', min: 1.7, max: 10.5, step: 0.05, unit: 'm' },
    { key: 'frontOverhang', name: 'Front Overhang', min: 0.35, max: 2.5, step: 0.02, unit: 'm' },
    { key: 'rearOverhang', name: 'Rear Overhang', min: 0.35, max: 3.9, step: 0.02, unit: 'm' },
    { key: 'hoodLength', name: 'Hood / Nose Length', min: 0.2, max: 2.4, step: 0.02, unit: 'm' },
    { key: 'cabinLength', name: 'Cabin Length', min: 1.1, max: 12.8, step: 0.05, unit: 'm' },
    { key: 'cargoLength', name: 'Rear / Cargo Length', min: 0.35, max: 9.8, step: 0.05, unit: 'm' },
    { key: 'cabCargoSeparation', name: 'Cab-to-Cargo / Joint Gap', min: 0, max: 0.68, step: 0.01, unit: 'm', info: 'Separates forward cab from bed, cargo box, trailer, or articulated bus joint.' }
  ],
  body: [
    { group: 'Roofline & Angles' },
    { key: 'rooflineStyle', name: 'Roofline Profile', type: 'select' },
    { key: 'hoodSlope', name: 'Hood Slope', min: 0.02, max: 0.6, step: 0.02 },
    { key: 'windshieldAngle', name: 'Windshield Rake Angle', min: 4, max: 58, step: 1, unit: '°' },
    { key: 'rearWindowAngle', name: 'Rear Window Angle', min: 0, max: 60, step: 1, unit: '°' },
    { key: 'trunkLength', name: 'Trunk Step Length', min: 0.05, max: 1.6, step: 0.02, unit: 'm' },
    { key: 'wedgeProfile', name: 'Forward Wedge Slope', min: 0, max: 0.35, step: 0.02 },
    { key: 'interiorDetail', name: 'Cabin Interior Silhouette', type: 'boolean' },
    { group: 'Massing & Surfacing' },
    { key: 'bodyBoxiness', name: 'Boxiness vs Smoothness', min: 0.15, max: 1.0, step: 0.02 },
    { key: 'bodyTaper', name: 'Nose & Tail Taper', min: 0, max: 0.32, step: 0.01 },
    { key: 'frontFaceWidth', name: 'Front Face Width Ratio', min: 0.68, max: 1.0, step: 0.02 },
    { key: 'cabinCurvature', name: 'Cabin Tumblehome', min: 0.05, max: 0.65, step: 0.02 },
    { key: 'bodySideInset', name: 'Lower Side Inset', min: 0, max: 0.16, step: 0.01, unit: 'm' },
    { key: 'roofRounding', name: 'Roof Crown Rounding', min: 0.02, max: 0.3, step: 0.01 },
    { key: 'cornerChamfer', name: 'Corner Chamfering', min: 0.02, max: 0.25, step: 0.01 },
    { key: 'fenderFlare', name: 'Fender Flare Width', min: 0, max: 0.16, step: 0.01, unit: 'm' },
    { key: 'wheelArchSize', name: 'Wheel Arch Padding', min: 0.04, max: 0.2, step: 0.01, unit: 'm' }
  ],
  doors: [
    { group: 'Doors & Access Layout' },
    { key: 'doorLayout', name: 'Door Configuration', type: 'select' },
    { key: 'doorsOpen', name: 'Open Doors & Tailgate Pose', type: 'boolean' },
    { key: 'slidingDoor', name: 'Sliding Van Side Door', type: 'boolean' },
    { key: 'busDoorPlacement', name: 'Bus Entry Door Placement', type: 'select' },
    { key: 'rearCargoDoor', name: 'Rear Door / Tailgate', type: 'select' },
    { group: 'Window & Glazing System' },
    { key: 'windshieldScale', name: 'Windshield Scale', min: 0.65, max: 1.0, step: 0.02 },
    { key: 'sideWindowSegmentation', name: 'Side Window Pillars', min: 1, max: 4, step: 1 },
    { key: 'rearWindowScale', name: 'Rear Window Scale', min: 0.35, max: 1.0, step: 0.02 },
    { key: 'busWindowBays', name: 'Bus / Van Window Bays', min: 2, max: 9, step: 1 },
    { key: 'vanPartialWindows', name: 'Van Partial Panel Windows', type: 'boolean' },
    { key: 'windowTint', name: 'Glass Tint Darkness', min: 0.1, max: 0.85, step: 0.05 },
    { key: 'framelessWindows', name: 'Frameless Flush Glass', type: 'boolean' },
    { key: 'wraparoundGlass', name: 'Wraparound Front Glass', type: 'boolean' }
  ],
  wheels: [
    { group: 'Axles & Stance' },
    { key: 'axleCount', name: 'Axle Count', min: 2, max: 3, step: 1 },
    { key: 'dualRearWheels', name: 'Dual Rear Tires', type: 'boolean' },
    { key: 'trackWidth', name: 'Track Width', min: 1.25, max: 2.5, step: 0.02, unit: 'm' },
    { key: 'frontAxleOffset', name: 'Front Axle Shift', min: -0.25, max: 0.25, step: 0.01, unit: 'm' },
    { key: 'rearAxleOffset', name: 'Rear Axle Shift', min: -0.25, max: 0.25, step: 0.01, unit: 'm' },
    { key: 'steerAngle', name: 'Front Wheel Steer Angle', min: -35, max: 35, step: 1, unit: '°' },
    { group: 'Wheel & Rim Proportions' },
    { key: 'wheelRadius', name: 'Wheel Radius', min: 0.22, max: 0.56, step: 0.01, unit: 'm' },
    { key: 'wheelThickness', name: 'Tire Width', min: 0.14, max: 0.38, step: 0.01, unit: 'm' },
    { key: 'rimInset', name: 'Rim Dish Inset', min: 0.02, max: 0.12, step: 0.005, unit: 'm' },
    { key: 'hubcapStyle', name: 'Hubcap / Rim Style', type: 'select' },
    { key: 'spokeCount', name: 'Spoke / Lug Count', min: 3, max: 8, step: 1 },
    { key: 'wheelArchHeight', name: 'Wheel Arch Height', min: 0.26, max: 0.68, step: 0.01, unit: 'm' }
  ],
  details: [
    { group: 'Front & Rear Fascia' },
    { key: 'bumperStyle', name: 'Bumper Style', type: 'select' },
    { key: 'headlightStyle', name: 'Headlight Style', type: 'select' },
    { key: 'taillightStyle', name: 'Taillight Style', type: 'select' },
    { key: 'grilleStyle', name: 'Front Grille Style', type: 'select' },
    { key: 'licensePlates', name: 'License Plates', type: 'boolean' },
    { group: 'Body Trim & Hardware' },
    { key: 'mirrorStyle', name: 'Side Mirrors', type: 'select' },
    { key: 'doorHandleStyle', name: 'Door Handles', type: 'select' },
    { key: 'sideTrim', name: 'Body Side Trim', type: 'select' },
    { key: 'mudguards', name: 'Wheel Mudguards', type: 'boolean' },
    { key: 'sideSteps', name: 'Running Boards / Steps', type: 'boolean' },
    { key: 'exhaustStyle', name: 'Exhaust Placement', type: 'select' },
    { key: 'antennaCount', name: 'Roof Antennas', min: 0, max: 2, step: 1 }
  ],
  materials: [
    { group: 'Palette & Paint Finish' },
    { key: 'paletteFamily', name: 'Curated Palette Family', type: 'select' },
    { key: 'bodyPrimaryMaterial', name: 'Body Primary Finish', type: 'select', optionsKey: 'materialFamily' },
    { key: 'bodyPrimaryColor', name: 'Body Primary Color', type: 'color' },
    { key: 'bodySecondaryMaterial', name: 'Body Secondary Finish', type: 'select', optionsKey: 'materialFamily' },
    { key: 'bodySecondaryColor', name: 'Body Secondary Color', type: 'color' },
    { key: 'liveryStripeColor', name: 'Accent / Livery Color', type: 'color' },
    { key: 'colorVariation', name: 'Panel Tone Variation', min: 0, max: 0.35, step: 0.02 },
    { key: 'wearLevel', name: 'Stylized Wear Level', type: 'select' },
    { group: 'Trim, Wheels & Glass' },
    { key: 'trimMaterial', name: 'Trim Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'trimColor', name: 'Trim Color', type: 'color' },
    { key: 'bumperMaterial', name: 'Bumper Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'bumperColor', name: 'Bumper Color', type: 'color' },
    { key: 'wheelRimMaterial', name: 'Wheel Rim Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'wheelRimColor', name: 'Wheel Rim Color', type: 'color' },
    { key: 'tireMaterial', name: 'Tire Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'tireColor', name: 'Tire Color', type: 'color' },
    { key: 'glassMaterial', name: 'Glass Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'glassColor', name: 'Glass Tint Base', type: 'color' },
    { key: 'utilityMaterial', name: 'Utility Equipment Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'utilityColor', name: 'Utility Equipment Color', type: 'color' }
  ],
  variants: [
    { group: 'Role & Fleet Variant' },
    { key: 'roleVariant', name: 'Vehicle Role Variant', type: 'select' },
    { key: 'taxiSign', name: 'Roof Taxi Sign', type: 'boolean' },
    { key: 'lightBar', name: 'Emergency / Work Light Bar', type: 'select' },
    { key: 'busRouteSign', name: 'Front Route / Destination Sign', type: 'boolean' },
    { key: 'signText', name: 'Vehicle Sign / Fleet Label', type: 'text' },
    { group: 'Cargo & Exterior Attachments' },
    { key: 'roofRack', name: 'Rooftop Rack / Equipment', type: 'select' },
    { key: 'frontAttachment', name: 'Front Bumper Attachment', type: 'select' },
    { key: 'rearAttachment', name: 'Rear Attachment', type: 'select' },
    { key: 'sideUtility', name: 'Side Panel Utility', type: 'select' }
  ],
  scene: [
    { group: 'Lighting & Active Lamps' },
    { key: 'lightingTime', name: 'Time of Day', type: 'select' },
    { key: 'headlightsLit', name: 'Headlights & Taillights On', type: 'boolean' },
    { key: 'emergencyLightsLit', name: 'Beacon & Sign Illumination', type: 'boolean' },
    { key: 'beaconFlash', name: 'Animated Beacon Strobe', type: 'boolean' }
  ],
  export: [
    { group: 'Blueprint & Model Export' }
  ]
};

export const CATEGORIES = {
  structure: SCHEMA.structure.filter((x) => x.key).map((x) => x.key),
  body: SCHEMA.body.filter((x) => x.key).map((x) => x.key),
  doors: SCHEMA.doors.filter((x) => x.key).map((x) => x.key),
  wheels: SCHEMA.wheels.filter((x) => x.key).map((x) => x.key),
  details: SCHEMA.details.filter((x) => x.key).map((x) => x.key),
  materials: SCHEMA.materials.filter((x) => x.key).map((x) => x.key),
  variants: SCHEMA.variants.filter((x) => x.key && x.key !== 'signText').map((x) => x.key),
  scene: SCHEMA.scene.filter((x) => x.key && x.key !== 'lightingTime').map((x) => x.key)
};

export function getStyle(styleId) {
  return STYLES.find((x) => x.id === styleId) || STYLES[1];
}

export function getArchetype(styleId) {
  return getStyle(styleId);
}

export function baseForStyle(styleId) {
  const descriptor = getStyle(styleId);
  const preset = PRESETS[descriptor.preset] || PRESETS.sedan;
  return sanitiseConfig({ ...copy(BASE), ...copy(preset) });
}

export function sanitiseConfig(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return sanitiseConfig(copy(BASE));
  }
  const style = STYLES.some((x) => x.id === data.style) ? data.style : BASE.style;
  const presetRaw = PRESETS[getStyle(style).preset] || {};
  const merged = { ...copy(BASE), ...copy(presetRaw), ...copy(data), style };

  for (const rows of Object.values(SCHEMA)) {
    for (const def of rows) {
      if (!def.key || def.key === 'style') continue;
      const key = def.key;
      const fallback = presetRaw[key] !== undefined ? presetRaw[key] : BASE[key];

      if (def.type === 'color') {
        merged[key] = colorHex(merged[key], fallback);
      } else if (def.type === 'boolean') {
        merged[key] = typeof merged[key] === 'boolean' ? merged[key] : Boolean(fallback);
      } else if (def.type === 'select') {
        const list = def.optionsKey === 'materialFamily'
          ? OPTIONS.materialFamily
          : (OPTIONS[key] || []);
        merged[key] = list.some(([v]) => v === merged[key]) ? merged[key] : fallback;
      } else if (def.type === 'text') {
        merged[key] = String(merged[key] ?? fallback).slice(0, 40);
      } else {
        const num = Number(merged[key]);
        merged[key] = Number.isFinite(num)
          ? clamp(num, def.min ?? -Infinity, def.max ?? Infinity)
          : fallback;
      }
    }
  }

  merged.seed = clamp(Math.floor(Number(merged.seed) || 1024), 1, 99999999);
  merged.axleCount = clamp(Math.round(merged.axleCount), 2, 3);
  merged.sideWindowSegmentation = clamp(Math.round(merged.sideWindowSegmentation), 1, 4);
  merged.busWindowBays = clamp(Math.round(merged.busWindowBays), 2, 9);
  merged.spokeCount = clamp(Math.round(merged.spokeCount), 3, 8);
  merged.antennaCount = clamp(Math.round(merged.antennaCount), 0, 2);

  delete merged.label;
  return merged;
}

export function applyPresetWithLocks(currentState, targetPresetData, locks = new Set()) {
  const cleanTarget = sanitiseConfig(targetPresetData);
  const next = copy(cleanTarget);

  for (const key of locks) {
    if (key in currentState) {
      next[key] = copy(currentState[key]);
    }
  }

  return sanitiseConfig(next);
}
