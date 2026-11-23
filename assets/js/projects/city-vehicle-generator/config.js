import { clamp, copy, colorHex } from './utils.js';
import { ARCHETYPES, SILHOUETTE_PROFILES, PRESET_DEFINITIONS } from './core/archetypes.js';
import {
  VEHICLE_CATEGORY_GROUPS,
  RAIL_SUBGROUPS,
  RAIL_ARCHETYPES,
  RAIL_SILHOUETTE_PROFILES,
  RAIL_BASE_DEFAULTS,
  RAIL_PRESET_DEFINITIONS,
  RAIL_OPTIONS,
  RAIL_SCHEMA
} from './transit/rail-archetypes.js';
import {
  AIR_ARCHETYPES,
  AIR_SILHOUETTE_PROFILES,
  AIR_BASE_DEFAULTS,
  AIR_PRESET_DEFINITIONS,
  AIR_OPTIONS,
  AIR_SCHEMA
} from './air/air-archetypes.js';

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
  },
  construction_yellow: {
    label: 'Construction Yellow',
    primaries: ['#e5a922', '#df961c', '#d8821e', '#e8b830'],
    secondaries: ['#48505a', '#2c3138', '#68717c'],
    stripes: ['#1e2228', '#e6ebf0', '#d95326']
  },
  postal_municipal: {
    label: 'Postal & Municipal',
    primaries: ['#eef2f6', '#e4eaef', '#d9e2ea', '#f5ece0'],
    secondaries: ['#28568f', '#3d7463', '#c82e28', '#e87a90'],
    stripes: ['#c93c34', '#28568f', '#f0a629']
  },
  freight_rail: {
    label: 'Freight Railroad Liveries',
    primaries: ['#24426b', '#8c3b2e', '#2f5a44', '#b87624', '#38424d', '#6e3230'],
    secondaries: ['#1f2731', '#3b434d', '#252a32', '#dfd5c2'],
    stripes: ['#eab02e', '#dfd5c2', '#d95434', '#e6edf5']
  },
  passenger_rail: {
    label: 'Passenger Transit Liveries',
    primaries: ['#c8d2dc', '#254a78', '#236b5e', '#d6dde5', '#8f3038'],
    secondaries: ['#253c59', '#1d242e', '#344960', '#d8e0e8'],
    stripes: ['#25a58d', '#eab02e', '#d6453a', '#4de2ff']
  },
  broadcast_news: {
    label: 'News Broadcast & Media',
    primaries: ['#edf2f7', '#1b3158', '#d9382e', '#243c64', '#f2f5f8'],
    secondaries: ['#1a3a6c', '#eef3f8', '#1d242e', '#c9332b'],
    stripes: ['#e0362e', '#f0b429', '#38bdf8', '#f8fafc']
  }
};

export const STYLES = [...ARCHETYPES, ...RAIL_ARCHETYPES, ...AIR_ARCHETYPES];
Object.assign(SILHOUETTE_PROFILES, RAIL_SILHOUETTE_PROFILES, AIR_SILHOUETTE_PROFILES);
export const PRESETS = { ...PRESET_DEFINITIONS, ...RAIL_PRESET_DEFINITIONS, ...AIR_PRESET_DEFINITIONS };
export {
  ARCHETYPES,
  SILHOUETTE_PROFILES,
  VEHICLE_CATEGORY_GROUPS,
  RAIL_SUBGROUPS,
  RAIL_ARCHETYPES,
  RAIL_BASE_DEFAULTS,
  RAIL_SCHEMA,
  RAIL_OPTIONS,
  AIR_ARCHETYPES,
  AIR_BASE_DEFAULTS,
  AIR_SCHEMA,
  AIR_OPTIONS
};

export const BASE = {
  ...copy(PRESET_DEFINITIONS.sedan),
  vehicleDomain: 'road',
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
    ['wedge_futuristic', 'Wedge Retro-Futuristic'],
    ['dump_truck', 'Heavy Dump Truck'],
    ['cement_mixer', 'Concrete Mixer Truck'],
    ['wheel_loader', 'Construction Wheel Loader'],
    ['flatbed_truck', 'Flatbed / Crane Truck'],
    ['double_decker', 'Double-Decker Bus'],
    ['rail_diesel_road_switcher', 'Rail Diesel Road-Switcher'],
    ['rail_diesel_switcher', 'Rail Yard Switcher'],
    ['rail_electric_loco', 'Dual-Cab Electric Loco'],
    ['rail_streamlined_diesel', 'Streamlined Bulldog Diesel'],
    ['rail_steam_loco', 'Pacific Steam Locomotive'],
    ['rail_maintenance', 'Track Maintenance Crane'],
    ['rail_highspeed_lead', 'High-Speed Bullet Lead'],
    ['rail_highspeed_coach', 'High-Speed Bullet Coach'],
    ['rail_passenger_coach', 'Rail Passenger Coach'],
    ['rail_bilevel_coach', 'Double-Decker Commuter'],
    ['rail_dome_coach', 'Vista-Dome Observation'],
    ['rail_subway_classic', 'Classic Stainless Subway'],
    ['rail_metro_modern', 'Modern Rounded Metro'],
    ['rail_people_mover', 'Automated People Mover'],
    ['rail_historic_streetcar', 'Historic Clerestory Streetcar'],
    ['rail_articulated_tram', '3-Section Articulated Tram'],
    ['rail_open_tram', 'Open-Sided Tourist Tram'],
    ['rail_freight_boxcar', 'Rail Freight Boxcar'],
    ['rail_freight_flatcar', 'Rail Container Flatcar'],
    ['rail_freight_tank', 'Rail Tank Wagon'],
    ['rail_freight_hopper', 'Open Bulk Hopper Car'],
    ['rail_freight_caboose', 'Cupola Freight Caboose'],
    ['rail_straddle_monorail', 'Straddle-Beam Monorail'],
    ['rail_suspended_monorail', 'Suspended Skytrain Monorail'],
    ['rail_aerial_gondola', 'Panoramic Aerial Gondola'],
    ['rail_tank_steam', 'Branchline 0-6-0 Tank Steam'],
    ['rail_articulated_steam', 'Articulated Heavy Steam'],
    ['rail_heavy_diesel', 'Wide-Cab Heavy Diesel'],
    ['rail_box_electric', 'Historic Box-Cab Electric'],
    ['rail_dining_coach', 'Luxury Heritage Dining Car'],
    ['rail_sleeper_coach', 'Overnight Sleeper Coach'],
    ['rail_freight_autorack', 'Bi-Level Auto-Rack Car'],
    ['rail_freight_wellcar', 'Double-Stack Intermodal Well Car'],
    ['air_news_chopper', 'ENG News Helicopter'],
    ['air_twin_chopper', 'Twin-Turbine News Helicopter']
  ],
  ...RAIL_OPTIONS,
  ...AIR_OPTIONS,
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
    ['postal', 'Postal / Mail'],
    ['food_vendor', 'Street Food Vendor'],
    ['service', 'Utility / Service'],
    ['construction', 'Heavy Construction'],
    ['police', 'Police / Security'],
    ['ambulance', 'Ambulance / Medical'],
    ['fire', 'Fire & Rescue'],
    ['armored', 'Armored Security'],
    ['transit', 'Public Transit'],
    ['news_media', 'News & TV Broadcast']
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
    ['bus_ac_unit', 'Rooftop Ac Unit'],
    ['ice_cream_cone', 'Rooftop Ice Cream Cone'],
    ['fire_ladder', 'Fire Turntable Ladder'],
    ['satellite_dish', 'News Satellite Dish & Mast'],
    ['broadcast_array', 'TV Broadcast Dish & Array']
  ],
  frontAttachment: [
    ['none', 'None'],
    ['bumper_guards', 'Push Bumper Guards'],
    ['bull_bar', 'Heavy Bull Bar'],
    ['winch_bumper', 'Service Winch Bumper'],
    ['loader_bucket', 'Construction Loader Bucket'],
    ['sweeper_brushes', 'Street Sweeper Brushes'],
    ['school_crossing_arm', 'School Bus Crossing Arm']
  ],
  rearAttachment: [
    ['none', 'None'],
    ['spare_tire', 'Rear Mounted Spare Tire'],
    ['cargo_step', 'Rear Cargo Step'],
    ['tow_hook', 'Heavy Tow Hitch'],
    ['tow_boom', 'Wrecker Tow Boom & Winch'],
    ['compactor_hopper', 'Sanitation Rear Hopper'],
    ['rear_ladder', 'Rear Access Ladder'],
    ['gravel_load', 'Construction Gravel Load'],
    ['knuckle_crane', 'Flatbed Knuckle Crane'],
    ['mixer_chute', 'Concrete Pouring Chute']
  ],
  sideUtility: [
    ['none', 'None'],
    ['branding_panels', 'Side Branding Panels'],
    ['utility_bins', 'Side Utility Tool Bins'],
    ['livery_stripe', 'Accent Livery Stripe'],
    ['checker_trim', 'Taxi Checker Trim'],
    ['serving_window', 'Food Truck Window & Awning'],
    ['postal_stripe', 'Postal Dual Stripe & Crest'],
    ['fire_pump_panel', 'Fire Pump & Equipment Bays'],
    ['hazard_stripes', 'Construction Hazard Chevrons'],
    ['news_branding', 'TV News Broadcast Livery']
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
    { key: 'overallHeight', name: 'Overall Height', min: 1.15, max: 4.25, step: 0.02, unit: 'm' },
    { key: 'groundClearance', name: 'Ground Clearance', min: 0.1, max: 0.62, step: 0.01, unit: 'm' },
    { key: 'roofHeight', name: 'Greenhouse / Roof Height', min: 0.35, max: 2.85, step: 0.02, unit: 'm' },
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
    { key: 'busWindowBays', name: 'Bus / Van Window Bays', min: 2, max: 10, step: 1 },
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
    { key: 'wheelRadius', name: 'Wheel Radius', min: 0.22, max: 0.62, step: 0.01, unit: 'm' },
    { key: 'wheelThickness', name: 'Tire Width', min: 0.14, max: 0.42, step: 0.01, unit: 'm' },
    { key: 'rimInset', name: 'Rim Dish Inset', min: 0.02, max: 0.12, step: 0.005, unit: 'm' },
    { key: 'hubcapStyle', name: 'Hubcap / Rim Style', type: 'select' },
    { key: 'spokeCount', name: 'Spoke / Lug Count', min: 3, max: 8, step: 1 },
    { key: 'wheelArchHeight', name: 'Wheel Arch Height', min: 0.26, max: 0.78, step: 0.01, unit: 'm' }
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

const ROAD_BUS_STYLES = new Set([
  'minibus',
  'city_bus',
  'articulated_bus',
  'double_decker_bus',
  'school_bus'
]);

const ROAD_CAR_STYLES = new Set([
  'compact_car',
  'sedan',
  'hatchback',
  'coupe',
  'wagon',
  'taxi',
  'suv',
  'retro_futuristic',
  'convertible',
  'micro_city_car',
  'police_car'
]);

const RAIL_BODY_FAMILIES = new Set([
  'rail_diesel_road_switcher',
  'rail_diesel_switcher',
  'rail_electric_loco',
  'rail_streamlined_diesel',
  'rail_steam_loco',
  'rail_maintenance',
  'rail_highspeed_lead',
  'rail_highspeed_coach',
  'rail_passenger_coach',
  'rail_bilevel_coach',
  'rail_dome_coach',
  'rail_subway_classic',
  'rail_metro_modern',
  'rail_people_mover',
  'rail_historic_streetcar',
  'rail_articulated_tram',
  'rail_open_tram',
  'rail_freight_boxcar',
  'rail_freight_flatcar',
  'rail_freight_tank',
  'rail_freight_hopper',
  'rail_freight_caboose',
  'rail_straddle_monorail',
  'rail_suspended_monorail',
  'rail_aerial_gondola',
  'rail_tank_steam',
  'rail_articulated_steam',
  'rail_heavy_diesel',
  'rail_box_electric',
  'rail_dining_coach',
  'rail_sleeper_coach',
  'rail_freight_autorack',
  'rail_freight_wellcar'
]);

const AIR_BODY_FAMILIES = new Set([
  'air_news_chopper',
  'air_twin_chopper'
]);

export function isRailConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  if (cfg.vehicleDomain === 'rail') return true;
  if (RAIL_BODY_FAMILIES.has(cfg.bodyFamily)) return true;
  return RAIL_ARCHETYPES.some((a) => a.id === cfg.style);
}

export function isAirConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  if (cfg.vehicleDomain === 'air') return true;
  if (AIR_BODY_FAMILIES.has(cfg.bodyFamily)) return true;
  return AIR_ARCHETYPES.some((a) => a.id === cfg.style);
}

export function getArchetypeCategoryGroup(archOrId) {
  const arch = typeof archOrId === 'string' ? getStyle(archOrId) : archOrId;
  if (!arch) return 'cars';
  if (arch.vehicleDomain === 'air' || AIR_ARCHETYPES.some((a) => a.id === arch.id)) {
    return 'aviation';
  }
  if (arch.vehicleDomain === 'rail' || RAIL_ARCHETYPES.some((a) => a.id === arch.id)) {
    return 'transit_rail';
  }
  if (ROAD_BUS_STYLES.has(arch.id)) return 'buses';
  if (ROAD_CAR_STYLES.has(arch.id)) return 'cars';
  return 'commercial';
}

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

function sanitiseFieldWithDef(merged, def, fallback) {
  const key = def.key;
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

export function sanitiseConfig(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return sanitiseConfig(copy(BASE));
  }
  const style = STYLES.some((x) => x.id === data.style) ? data.style : BASE.style;
  const arch = getStyle(style);
  const presetRaw = PRESETS[arch.preset] || {};
  const isAir = arch.vehicleDomain === 'air' || isAirConfig({ ...presetRaw, ...data, style });
  const isRail = !isAir && (arch.vehicleDomain === 'rail' || isRailConfig({ ...presetRaw, ...data, style }));

  if (isAir) {
    const merged = {
      ...copy(BASE),
      ...copy(AIR_BASE_DEFAULTS),
      ...copy(presetRaw),
      ...copy(data),
      style,
      vehicleDomain: 'air'
    };
    if (!AIR_BODY_FAMILIES.has(merged.bodyFamily)) {
      merged.bodyFamily = presetRaw.bodyFamily || arch.bodyFamily || 'air_news_chopper';
    }
    if (!SILHOUETTE_PROFILES[merged.silhouetteFamily]) {
      merged.silhouetteFamily = presetRaw.silhouetteFamily || 'news_chopper';
    }
    for (const tabKey of ['materials', 'scene']) {
      for (const def of SCHEMA[tabKey] || []) {
        if (!def.key) continue;
        const fallback = presetRaw[def.key] !== undefined ? presetRaw[def.key] : BASE[def.key];
        sanitiseFieldWithDef(merged, def, fallback);
      }
    }
    for (const rows of Object.values(AIR_SCHEMA)) {
      for (const def of rows) {
        if (!def.key || def.key === 'style') continue;
        const fallback = presetRaw[def.key] !== undefined
          ? presetRaw[def.key]
          : (AIR_BASE_DEFAULTS[def.key] !== undefined ? AIR_BASE_DEFAULTS[def.key] : BASE[def.key]);
        sanitiseFieldWithDef(merged, def, fallback);
      }
    }
    merged.seed = clamp(Math.floor(Number(merged.seed) || 9104), 1, 99999999);
    merged.airRotorBlades = clamp(Math.round(merged.airRotorBlades), 2, 5);
    merged.airRotorSpinDeg = ((Number(merged.airRotorSpinDeg) || 0) % 360 + 360) % 360;
    merged.airHoverHeight = clamp(Number(merged.airHoverHeight || 0), 0, 3.5);
    merged.airDoorsOpen = clamp(Number(merged.airDoorsOpen ?? (data.doorsOpen ? 1 : 0)), 0, 1);
    merged.doorsOpen = merged.airDoorsOpen > 0.05;
    merged.interiorDetail = Boolean(merged.airInteriorEnabled);
    merged.airCallsign = String(merged.airCallsign || presetRaw.airCallsign || 'CH4-SKY').slice(0, 16);
    merged.signText = String(merged.signText || presetRaw.signText || 'SKYCAM 4 NEWS').slice(0, 36);
    delete merged.label;
    return merged;
  }

  if (isRail) {
    const merged = {
      ...copy(BASE),
      ...copy(RAIL_BASE_DEFAULTS),
      ...copy(presetRaw),
      ...copy(data),
      style,
      vehicleDomain: 'rail'
    };

    if (!RAIL_BODY_FAMILIES.has(merged.bodyFamily)) {
      merged.bodyFamily = presetRaw.bodyFamily || arch.bodyFamily || 'rail_diesel_road_switcher';
    }
    if (!SILHOUETTE_PROFILES[merged.silhouetteFamily]) {
      merged.silhouetteFamily = presetRaw.silhouetteFamily || 'diesel_road_switcher';
    }

    const railSharedTabs = ['materials', 'scene'];
    for (const tabKey of railSharedTabs) {
      for (const def of SCHEMA[tabKey] || []) {
        if (!def.key) continue;
        const fallback = presetRaw[def.key] !== undefined ? presetRaw[def.key] : BASE[def.key];
        sanitiseFieldWithDef(merged, def, fallback);
      }
    }

    const extraRoadMetaKeys = ['roleVariant', 'lightBar', 'doorsOpen', 'interiorDetail', 'signText'];
    for (const key of extraRoadMetaKeys) {
      for (const rows of Object.values(SCHEMA)) {
        const def = rows.find((d) => d.key === key);
        if (def) {
          const fallback = presetRaw[key] !== undefined ? presetRaw[key] : BASE[key];
          sanitiseFieldWithDef(merged, def, fallback);
          break;
        }
      }
    }

    for (const rows of Object.values(RAIL_SCHEMA)) {
      for (const def of rows) {
        if (!def.key || def.key === 'style') continue;
        const fallback = presetRaw[def.key] !== undefined
          ? presetRaw[def.key]
          : (RAIL_BASE_DEFAULTS[def.key] !== undefined ? RAIL_BASE_DEFAULTS[def.key] : BASE[def.key]);
        sanitiseFieldWithDef(merged, def, fallback);
      }
    }

    merged.seed = clamp(Math.floor(Number(merged.seed) || 1024), 1, 99999999);
    merged.railBogieAxles = clamp(Math.round(merged.railBogieAxles), 2, 3);
    merged.railExhaustCount = clamp(Math.round(merged.railExhaustCount), 0, 3);
    merged.railWindowCount = clamp(Math.round(merged.railWindowCount), 0, 12);
    merged.railWheelSpinDeg = ((Number(merged.railWheelSpinDeg) || 0) % 360 + 360) % 360;
    if (data.doorsOpen === true && Number(data.railDoorsOpen) !== 0 && merged.railDoorsOpen < 0.05) {
      merged.railDoorsOpen = 1;
    }
    merged.doorsOpen = merged.railDoorsOpen > 0.05;
    merged.interiorDetail = Boolean(merged.railInteriorEnabled);
    merged.railUnitNumber = String(merged.railUnitNumber || presetRaw.railUnitNumber || 'B-4012').slice(0, 18);
    merged.railRouteBullet = String(merged.railRouteBullet || presetRaw.railRouteBullet || 'A').slice(0, 6);
    merged.railPantographHeight = clamp(Number(merged.railPantographHeight ?? 0.85), 0, 1);
    merged.railCabinSwingDeg = clamp(Number(merged.railCabinSwingDeg ?? 0), -12, 12);

    delete merged.label;
    return merged;
  }

  const merged = { ...copy(BASE), ...copy(presetRaw), ...copy(data), style, vehicleDomain: 'road' };
  if (RAIL_BODY_FAMILIES.has(merged.bodyFamily) || AIR_BODY_FAMILIES.has(merged.bodyFamily)) {
    merged.bodyFamily = presetRaw.bodyFamily || arch.bodyFamily || 'three_box';
  }

  for (const rows of Object.values(SCHEMA)) {
    for (const def of rows) {
      if (!def.key || def.key === 'style') continue;
      const key = def.key;
      const fallback = presetRaw[key] !== undefined ? presetRaw[key] : BASE[key];
      sanitiseFieldWithDef(merged, def, fallback);
    }
  }

  merged.seed = clamp(Math.floor(Number(merged.seed) || 1024), 1, 99999999);
  merged.axleCount = clamp(Math.round(merged.axleCount), 2, 3);
  merged.sideWindowSegmentation = clamp(Math.round(merged.sideWindowSegmentation), 1, 4);
  merged.busWindowBays = clamp(Math.round(merged.busWindowBays), 2, 10);
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
