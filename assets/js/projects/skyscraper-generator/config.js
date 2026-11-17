import { clamp, copy, colorHex, rng32, pick, mixHex, darkenHex, lightenHex, roundNum } from './utils.js';

export const STORAGE_KEY = 'b-remastered-skyscraper-presets-v1';
export const BLUEPRINT_SCHEMA_VERSION = 'b.skyscraper.v1';
export const B_UNITS_PER_METER = 16.404199475065617;

export const GENERATOR_META = {
  id: 'b-3d-skyscraper-generator',
  name: 'B Remastered 3D Skyscraper Generator',
  version: '1.0.0',
  coordinateSystem: {
    handedness: 'right-handed',
    upAxis: '+Y',
    forwardAxis: '+Z',
    rightAxis: '+X',
    units: 'meters',
    rotationOrder: 'XYZ',
    rotationUnits: 'radians',
    origin: 'ground-level center of complex plaza (x=0, y=0, z=0); primary facade faces +Z'
  }
};

export const MATERIAL_FAMILIES = {
  concrete: { label: 'Concrete', category: 'masonry', defaultColor: '#9aa0a6', shininess: 14, pattern: 'concrete' },
  limestone: { label: 'Limestone', category: 'masonry', defaultColor: '#c7beb0', shininess: 16, pattern: 'stone' },
  granite: { label: 'Granite', category: 'masonry', defaultColor: '#8d8684', shininess: 28, pattern: 'granite' },
  brick: { label: 'Brick', category: 'masonry', defaultColor: '#8f4b3e', shininess: 12, pattern: 'brick' },
  dark_stone: { label: 'Dark Stone', category: 'masonry', defaultColor: '#4a4147', shininess: 22, pattern: 'stone' },
  steel: { label: 'Steel', category: 'metal', defaultColor: '#363f48', shininess: 68, pattern: 'metal' },
  aluminum: { label: 'Aluminum', category: 'metal', defaultColor: '#aeb9c2', shininess: 82, pattern: 'metal' },
  copper: { label: 'Copper', category: 'metal', defaultColor: '#6f8b7c', shininess: 54, pattern: 'metal' },
  bronze: { label: 'Bronze', category: 'metal', defaultColor: '#5c4b3c', shininess: 64, pattern: 'metal' },
  glass: { label: 'Glass', category: 'glass', defaultColor: '#3a5c78', shininess: 120, pattern: 'glass' },
  tinted_glass: { label: 'Tinted Glass', category: 'glass', defaultColor: '#27435c', shininess: 130, pattern: 'glass' },
  reflective_glass: { label: 'Reflective Glass', category: 'glass', defaultColor: '#4c799b', shininess: 165, pattern: 'glass' },
  dark_glass: { label: 'Dark Glass', category: 'glass', defaultColor: '#1b2735', shininess: 145, pattern: 'glass' }
};

export const STYLES = [
  { id: 'art_deco_monumental', label: 'Art Deco Spire', icon: 'fa-monument', preset: 'art_deco_monumental' },
  { id: 'modern_corporate', label: 'Modern Corporate', icon: 'fa-building', preset: 'modern_corporate' },
  { id: 'futuristic_asymmetrical', label: 'Futuristic Diag', icon: 'fa-drafting-compass', preset: 'futuristic_asymmetrical' },
  { id: 'connected_twin_towers', label: 'Connected Twins', icon: 'fa-archway', preset: 'connected_twin_towers' },
  { id: 'twin_art_deco', label: 'Twin Art Deco', icon: 'fa-columns', preset: 'twin_art_deco' },
  { id: 'curved_contemporary', label: 'Curved Ribbon', icon: 'fa-circle-notch', preset: 'curved_contemporary' },
  { id: 'neo_gothic', label: 'Neo-Gothic', icon: 'fa-place-of-worship', preset: 'neo_gothic' },
  { id: 'glass_curtain_wall', label: 'Curtain Wall', icon: 'fa-border-all', preset: 'glass_curtain_wall' },
  { id: 'brutalist_monolith', label: 'Brutalist', icon: 'fa-cubes', preset: 'brutalist_monolith' },
  { id: 'international_style', label: 'International', icon: 'fa-th', preset: 'international_style' },
  { id: 'postmodern_landmark', label: 'Postmodern', icon: 'fa-landmark', preset: 'postmodern_landmark' },
  { id: 'industrial_highrise', label: 'Industrial', icon: 'fa-industry', preset: 'industrial_highrise' },
  { id: 'luxury_residential', label: 'Luxury Condo', icon: 'fa-hotel', preset: 'luxury_residential' },
  { id: 'retro_futuristic', label: 'Retro-Futurist', icon: 'fa-satellite-dish', preset: 'retro_futuristic' },
  { id: 'stepped_ziggurat', label: 'Stepped Ziggurat', icon: 'fa-layer-group', preset: 'stepped_ziggurat' },
  { id: 'mid_century_slab', label: 'Mid-Century Slab', icon: 'fa-th-large', preset: 'mid_century_slab' },
  { id: 'hightech_exoskeleton', label: 'Exoskeleton', icon: 'fa-project-diagram', preset: 'hightech_exoskeleton' },
  { id: 'triangular_wedge', label: 'Triangular Wedge', icon: 'fa-play', preset: 'triangular_wedge' },
  { id: 'terraced_garden', label: 'Terraced Garden', icon: 'fa-seedling', preset: 'terraced_garden' },
  { id: 'split_core_atrium', label: 'Split Atrium', icon: 'fa-grip-lines-vertical', preset: 'split_core_atrium' },
  { id: 'broadcast_comm_tower', label: 'Broadcast Tower', icon: 'fa-broadcast-tower', preset: 'broadcast_comm_tower' },
  { id: 'cantilevered_landmark', label: 'Cantilevered', icon: 'fa-vector-square', preset: 'cantilevered_landmark' }
];

export const SECTION_ROLE_LABELS = {
  podium: 'Ground Podium',
  lower_tower: 'Lower Tower',
  middle_tower: 'Middle Tower',
  upper_tower: 'Upper Tower',
  crown: 'Crown Tier',
  rooftop: 'Rooftop Structure'
};

export function createSectionTemplate(overrides = {}) {
  return {
    id: overrides.id || 'sec_' + Math.random().toString(36).slice(2, 8),
    role: overrides.role || 'middle_tower',
    label: overrides.label || SECTION_ROLE_LABELS[overrides.role || 'middle_tower'] || 'Tower Section',
    floors: 12,
    floorHeight: 3.8,
    width: 24,
    depth: 22,
    offsetX: 0,
    offsetZ: 0,
    rotationDeg: 0,
    twistDeg: 0,
    taperX: 1.0,
    taperZ: 1.0,
    flareBase: 0,
    footprint: 'rectangle',
    cornerTreatment: 'sharp',
    cornerSize: 2.0,
    setback: 0,
    overhang: 0,
    transitionMode: 'setback',
    facadeStyle: 'inherit',
    windowPattern: 'inherit',
    materialRole: 'primary',
    colorVariation: 0.12,
    slantedTopDeg: 0,
    diagonalBrace: 'none',
    fanMotif: false,
    recessedCoreStrip: false,
    locked: false,
    ...overrides
  };
}

export const DEFAULT_SECTIONS = [
  createSectionTemplate({
    id: 'sec_0_podium',
    role: 'podium',
    label: 'Foundation Podium',
    floors: 4,
    floorHeight: 4.4,
    width: 34,
    depth: 30,
    footprint: 'chamfered',
    cornerTreatment: 'chamfered',
    cornerSize: 2.2,
    materialRole: 'podium',
    windowPattern: 'floor_to_ceiling'
  }),
  createSectionTemplate({
    id: 'sec_1_lower',
    role: 'lower_tower',
    label: 'Lower Tower',
    floors: 18,
    floorHeight: 3.8,
    width: 26,
    depth: 24,
    footprint: 'chamfered',
    cornerTreatment: 'stepped_piers',
    cornerSize: 2.0,
    materialRole: 'primary'
  }),
  createSectionTemplate({
    id: 'sec_2_middle',
    role: 'middle_tower',
    label: 'Middle Tower',
    floors: 14,
    floorHeight: 3.7,
    width: 22,
    depth: 20,
    setback: 1.5,
    footprint: 'chamfered',
    cornerTreatment: 'stepped_piers',
    cornerSize: 1.8,
    materialRole: 'primary'
  }),
  createSectionTemplate({
    id: 'sec_3_upper',
    role: 'upper_tower',
    label: 'Upper Tower',
    floors: 10,
    floorHeight: 3.7,
    width: 18,
    depth: 17,
    setback: 1.5,
    footprint: 'rectangle',
    cornerTreatment: 'fluted_columns',
    cornerSize: 1.5,
    materialRole: 'secondary'
  })
];

export const BASE = {
  style: 'art_deco_monumental',
  seed: 2026,
  variationStrength: 'moderate',

  // Structure Globals
  floorHeight: 3.8,
  baseWidth: 28,
  baseDepth: 26,
  slenderness: 1.0,
  globalTaper: 0.0,
  steppedSetbackScale: 1.0,
  maxOutwardExpansionRatio: 0.12,
  allowCantileveredSteps: false,
  symmetryMode: 'symmetric',
  globalTwistDeg: 0,
  cornerRadius: 2.0,
  structuralProtrusions: 0.65,
  footprint: 'chamfered',
  sections: copy(DEFAULT_SECTIONS),

  // Facade & Windows
  windowPattern: 'vertical_strips',
  baysPerEdge: 7,
  windowWidth: 1.55,
  windowHeight: 2.4,
  windowRecess: 0.24,
  columnThickness: 0.65,
  columnSpacing: 3.6,
  ribDensity: 0.7,
  floorBandThickness: 0.34,
  floorBandInterval: 1,
  mullionThickness: 0.14,
  spandrelHeight: 0.75,
  concreteFraming: 0.35,
  corniceSize: 0.55,
  exteriorBracing: 'none',
  balconyRatio: 0,
  terracePlanters: false,
  facadeRepetition: 1,

  // Materials & Colors
  primaryMaterial: 'dark_stone',
  primaryColor: '#54464e',
  secondaryMaterial: 'granite',
  secondaryColor: '#3f353d',
  framingMaterial: 'steel',
  framingColor: '#2d3138',
  glassMaterial: 'dark_glass',
  glassColor: '#1d2838',
  mullionMaterial: 'aluminum',
  mullionColor: '#484d58',
  trimMaterial: 'limestone',
  trimColor: '#7a6c74',
  crownMaterial: 'dark_stone',
  crownColor: '#5f4f58',
  podiumMaterial: 'granite',
  podiumColor: '#3d373f',
  colorVariation: 0.16,

  // Roofs & Crowns
  crownStyle: 'split_crown',
  crownHeight: 12,
  crownCurvature: 0.4,
  crownSteps: 3,
  spireStyle: 'none',
  spireHeight: 18,
  antennaMasts: 0,
  commArrays: false,
  mechPenthouse: true,
  waterTanks: false,
  hvacUnits: true,
  helipad: false,
  crownLighting: true,

  // Multi-Tower & Skybridges
  towerCount: 1,
  towerArrangement: 'twin_mirrored',
  towerSpacing: 28,
  secondaryTowerHeightRatio: 0.88,
  secondaryTowerScale: 0.94,
  secondaryTowerOffsetZ: 0,
  secondaryTowerRotationDeg: 0,
  bridgeCount: 0,
  bridgeStartFloor: 14,
  bridgeFloorSpacing: 10,
  bridgeWidth: 5.5,
  bridgeHeight: 4.4,
  bridgeEnclosed: true,
  bridgeGlass: true,
  bridgeTrusses: true,
  interTowerTrussFrame: false,
  connectedPodium: true,

  // Ground Level & Plaza
  entranceStyle: 'monumental_arch',
  entranceCanopy: true,
  monumentalStairs: true,
  raisedPodium: true,
  podiumElevation: 1.2,
  retailStorefronts: true,
  exteriorColumns: true,
  loadingBay: true,
  parkingEntrance: true,
  plantersCount: 6,
  plazaEnabled: true,
  plazaWidth: 56,
  plazaDepth: 48,
  plazaStepsAndRamps: true,
  signText: 'Paragon Tower',
  signEnabled: true,
  exteriorGroundLights: true,
  entranceEnabled: true,
  entranceCategory: 'lobby',
  interactionDistance: 3.5,
  interactionLabel: 'Enter Skyscraper Lobby',

  // Lighting & Atmosphere
  lightingTime: 'day',
  litWindowRatio: 0.42,
  warmCoolBalance: 0.48,
  occupiedFloorGrouping: 0.72,
  darkFloorChance: 0.12,
  lightingSeed: 404
};

const PRESET_DEFINITIONS = {
  art_deco_monumental: {
    label: 'Art Deco / Monumental',
    style: 'art_deco_monumental',
    seed: 1931,
    floorHeight: 3.7,
    baseWidth: 26,
    baseDepth: 24,
    footprint: 'chamfered',
    structuralProtrusions: 0.85,
    windowPattern: 'vertical_strips',
    baysPerEdge: 7,
    windowWidth: 1.35,
    windowHeight: 2.55,
    windowRecess: 0.34,
    columnThickness: 0.72,
    ribDensity: 0.9,
    floorBandThickness: 0.25,
    floorBandInterval: 4,
    spandrelHeight: 0.65,
    corniceSize: 0.65,
    primaryMaterial: 'dark_stone',
    primaryColor: '#54454d',
    secondaryMaterial: 'dark_stone',
    secondaryColor: '#43373f',
    framingMaterial: 'granite',
    framingColor: '#362d33',
    glassMaterial: 'dark_glass',
    glassColor: '#1b2434',
    mullionMaterial: 'bronze',
    mullionColor: '#483e46',
    trimMaterial: 'limestone',
    trimColor: '#7c6a72',
    crownMaterial: 'dark_stone',
    crownColor: '#5a4952',
    podiumMaterial: 'granite',
    podiumColor: '#393037',
    crownStyle: 'split_crown',
    crownHeight: 11,
    crownSteps: 3,
    spireStyle: 'none',
    mechPenthouse: false,
    hvacUnits: false,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'monumental_arch',
    monumentalStairs: true,
    raisedPodium: true,
    podiumElevation: 1.0,
    signText: 'Paragon Spire',
    sections: [
      createSectionTemplate({
        id: 'sec_deco_base',
        role: 'podium',
        label: 'Monumental Base',
        floors: 3,
        floorHeight: 4.5,
        width: 28,
        depth: 26,
        footprint: 'chamfered',
        cornerTreatment: 'stepped_piers',
        cornerSize: 2.4,
        facadeStyle: 'art_deco',
        windowPattern: 'arched_monumental',
        materialRole: 'podium'
      }),
      createSectionTemplate({
        id: 'sec_deco_lower',
        role: 'lower_tower',
        label: 'Lower Shaft',
        floors: 22,
        floorHeight: 3.7,
        width: 25,
        depth: 23,
        footprint: 'chamfered',
        cornerTreatment: 'stepped_piers',
        cornerSize: 2.4,
        facadeStyle: 'art_deco',
        windowPattern: 'vertical_strips',
        recessedCoreStrip: true,
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_deco_mid',
        role: 'middle_tower',
        label: 'Mid-Tower Setback',
        floors: 12,
        floorHeight: 3.6,
        width: 21.5,
        depth: 20,
        taperX: 0.92,
        taperZ: 0.92,
        setback: 1.75,
        footprint: 'chamfered',
        cornerTreatment: 'fluted_columns',
        cornerSize: 2.0,
        facadeStyle: 'art_deco',
        windowPattern: 'vertical_strips',
        recessedCoreStrip: true,
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_deco_upper',
        role: 'upper_tower',
        label: 'Sunburst Crown Shaft',
        floors: 16,
        floorHeight: 3.6,
        width: 18.5,
        depth: 17.5,
        setback: 1.5,
        footprint: 'chamfered',
        cornerTreatment: 'fluted_columns',
        cornerSize: 1.8,
        facadeStyle: 'art_deco',
        windowPattern: 'vertical_strips',
        recessedCoreStrip: true,
        fanMotif: true,
        materialRole: 'secondary'
      })
    ]
  },

  modern_corporate: {
    label: 'Modern Corporate',
    style: 'modern_corporate',
    seed: 1988,
    floorHeight: 3.8,
    baseWidth: 32,
    baseDepth: 28,
    footprint: 'chamfered',
    structuralProtrusions: 0.7,
    windowPattern: 'rectangular_grid',
    baysPerEdge: 8,
    windowWidth: 1.75,
    windowHeight: 2.45,
    windowRecess: 0.2,
    columnThickness: 0.78,
    ribDensity: 0.65,
    floorBandThickness: 0.42,
    floorBandInterval: 4,
    spandrelHeight: 0.85,
    concreteFraming: 0.75,
    corniceSize: 0.5,
    primaryMaterial: 'limestone',
    primaryColor: '#b3aba8',
    secondaryMaterial: 'concrete',
    secondaryColor: '#9c9593',
    framingMaterial: 'concrete',
    framingColor: '#c7c1be',
    glassMaterial: 'tinted_glass',
    glassColor: '#2d4458',
    mullionMaterial: 'aluminum',
    mullionColor: '#5c6670',
    trimMaterial: 'concrete',
    trimColor: '#d0cac7',
    crownMaterial: 'limestone',
    crownColor: '#b3aba8',
    podiumMaterial: 'concrete',
    podiumColor: '#8d8887',
    crownStyle: 'art_deco_stepped',
    crownHeight: 6,
    crownSteps: 2,
    spireStyle: 'none',
    mechPenthouse: true,
    hvacUnits: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'glass_curtain_lobby',
    monumentalStairs: false,
    raisedPodium: true,
    podiumElevation: 0.8,
    signText: 'Atlas Plaza',
    sections: [
      createSectionTemplate({
        id: 'sec_mc_podium',
        role: 'podium',
        label: 'Corporate Lobby Base',
        floors: 3,
        floorHeight: 4.5,
        width: 34,
        depth: 30,
        footprint: 'chamfered',
        cornerTreatment: 'chamfered',
        cornerSize: 2.6,
        facadeStyle: 'corporate_grid',
        windowPattern: 'floor_to_ceiling',
        recessedCoreStrip: true,
        materialRole: 'podium'
      }),
      createSectionTemplate({
        id: 'sec_mc_lower',
        role: 'lower_tower',
        label: 'Lower Corporate Shaft',
        floors: 18,
        floorHeight: 3.8,
        width: 31,
        depth: 27,
        footprint: 'chamfered',
        cornerTreatment: 'stepped_piers',
        cornerSize: 2.5,
        facadeStyle: 'corporate_grid',
        windowPattern: 'rectangular_grid',
        recessedCoreStrip: true,
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_mc_mid',
        role: 'middle_tower',
        label: 'Middle Setback Tier',
        floors: 14,
        floorHeight: 3.8,
        width: 26,
        depth: 23,
        setback: 2.5,
        footprint: 'chamfered',
        cornerTreatment: 'stepped_piers',
        cornerSize: 2.2,
        facadeStyle: 'corporate_grid',
        windowPattern: 'rectangular_grid',
        recessedCoreStrip: true,
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_mc_upper',
        role: 'upper_tower',
        label: 'Upper Core Tier',
        floors: 12,
        floorHeight: 3.7,
        width: 21,
        depth: 19,
        setback: 2.5,
        footprint: 'chamfered',
        cornerTreatment: 'chamfered',
        cornerSize: 1.8,
        facadeStyle: 'corporate_grid',
        windowPattern: 'rectangular_grid',
        recessedCoreStrip: true,
        materialRole: 'secondary'
      })
    ]
  },

  futuristic_asymmetrical: {
    label: 'Futuristic / Asymmetrical',
    style: 'futuristic_asymmetrical',
    seed: 2084,
    floorHeight: 4.0,
    baseWidth: 26,
    baseDepth: 22,
    footprint: 'asymmetrical_polygon',
    structuralProtrusions: 0.9,
    windowPattern: 'curtain_wall',
    baysPerEdge: 7,
    windowWidth: 2.0,
    windowHeight: 2.9,
    windowRecess: 0.18,
    columnThickness: 0.85,
    ribDensity: 0.8,
    floorBandThickness: 0.55,
    floorBandInterval: 6,
    mullionThickness: 0.16,
    spandrelHeight: 0.55,
    concreteFraming: 0.4,
    exteriorBracing: 'x_brace',
    primaryMaterial: 'steel',
    primaryColor: '#1f252e',
    secondaryMaterial: 'steel',
    secondaryColor: '#28303b',
    framingMaterial: 'steel',
    framingColor: '#161b22',
    glassMaterial: 'tinted_glass',
    glassColor: '#23364f',
    mullionMaterial: 'aluminum',
    mullionColor: '#2f3a47',
    trimMaterial: 'steel',
    trimColor: '#3a4656',
    crownMaterial: 'steel',
    crownColor: '#1b2029',
    podiumMaterial: 'dark_stone',
    podiumColor: '#20262f',
    crownStyle: 'slanted',
    crownHeight: 15,
    crownCurvature: 0.2,
    spireStyle: 'none',
    mechPenthouse: false,
    hvacUnits: false,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'glass_curtain_lobby',
    monumentalStairs: false,
    raisedPodium: false,
    signText: 'Vanguard Corp',
    sections: [
      createSectionTemplate({
        id: 'sec_fut_base',
        role: 'podium',
        label: 'Steel Frame Lobby',
        floors: 3,
        floorHeight: 4.6,
        width: 26,
        depth: 22,
        footprint: 'chamfered',
        cornerTreatment: 'stepped_piers',
        cornerSize: 1.6,
        facadeStyle: 'futuristic_diag',
        windowPattern: 'floor_to_ceiling',
        materialRole: 'podium'
      }),
      createSectionTemplate({
        id: 'sec_fut_lower',
        role: 'lower_tower',
        label: 'Braced Lower Shaft',
        floors: 20,
        floorHeight: 4.0,
        width: 25,
        depth: 21,
        footprint: 'asymmetrical_polygon',
        cornerTreatment: 'stepped_piers',
        cornerSize: 1.6,
        transitionMode: 'tapered',
        slantedTopDeg: 0,
        diagonalBrace: 'left_to_right',
        facadeStyle: 'futuristic_diag',
        windowPattern: 'curtain_wall',
        materialRole: 'glass'
      }),
      createSectionTemplate({
        id: 'sec_fut_upper',
        role: 'upper_tower',
        label: 'Asymmetrical Upper Spire',
        floors: 16,
        floorHeight: 4.0,
        width: 17.5,
        depth: 16,
        offsetX: -1.4,
        setback: 1.5,
        transitionMode: 'tapered',
        footprint: 'chamfered',
        cornerTreatment: 'chamfered',
        cornerSize: 1.6,
        slantedTopDeg: 32,
        diagonalBrace: 'right_to_left',
        facadeStyle: 'futuristic_diag',
        windowPattern: 'curtain_wall',
        materialRole: 'glass'
      })
    ]
  },

  connected_twin_towers: {
    label: 'Connected Twin Towers',
    style: 'connected_twin_towers',
    seed: 2099,
    floorHeight: 3.9,
    baseWidth: 24,
    baseDepth: 22,
    footprint: 'multi_wing',
    structuralProtrusions: 0.85,
    windowPattern: 'curtain_wall',
    baysPerEdge: 6,
    windowWidth: 1.95,
    windowHeight: 2.75,
    windowRecess: 0.16,
    columnThickness: 0.72,
    ribDensity: 0.65,
    floorBandThickness: 0.45,
    floorBandInterval: 5,
    spandrelHeight: 0.52,
    exteriorBracing: 'x_brace',
    primaryMaterial: 'steel',
    primaryColor: '#3f4b5a',
    secondaryMaterial: 'concrete',
    secondaryColor: '#566270',
    framingMaterial: 'steel',
    framingColor: '#2d3744',
    glassMaterial: 'reflective_glass',
    glassColor: '#274d7a',
    mullionMaterial: 'aluminum',
    mullionColor: '#5f7082',
    trimMaterial: 'steel',
    trimColor: '#758291',
    crownMaterial: 'steel',
    crownColor: '#394352',
    podiumMaterial: 'concrete',
    podiumColor: '#69727c',
    crownStyle: 'slanted',
    crownHeight: 14,
    spireStyle: 'none',
    mechPenthouse: false,
    hvacUnits: false,
    crownLighting: true,
    towerCount: 2,
    towerArrangement: 'twin_asymmetrical',
    towerSpacing: 34,
    secondaryTowerHeightRatio: 0.86,
    secondaryTowerScale: 0.96,
    secondaryTowerOffsetZ: 2,
    secondaryTowerRotationDeg: 0,
    bridgeCount: 1,
    bridgeStartFloor: 24,
    bridgeFloorSpacing: 8,
    bridgeWidth: 5.5,
    bridgeHeight: 4.5,
    bridgeEnclosed: true,
    bridgeGlass: true,
    bridgeTrusses: true,
    interTowerTrussFrame: true,
    connectedPodium: true,
    entranceStyle: 'glass_curtain_lobby',
    monumentalStairs: true,
    raisedPodium: true,
    podiumElevation: 1.4,
    plazaWidth: 74,
    plazaDepth: 52,
    signText: 'Gemini Nexus',
    sections: [
      createSectionTemplate({
        id: 'sec_twin_base',
        role: 'podium',
        label: 'Plaza Lobby Tier',
        floors: 3,
        floorHeight: 4.4,
        width: 24,
        depth: 22,
        footprint: 'multi_wing',
        cornerTreatment: 'chamfered',
        cornerSize: 1.5,
        facadeStyle: 'futuristic_diag',
        windowPattern: 'floor_to_ceiling',
        materialRole: 'podium'
      }),
      createSectionTemplate({
        id: 'sec_twin_lower',
        role: 'lower_tower',
        label: 'Lower Wing Shaft',
        floors: 18,
        floorHeight: 3.9,
        width: 23,
        depth: 21,
        footprint: 'multi_wing',
        cornerTreatment: 'stepped_piers',
        cornerSize: 1.5,
        transitionMode: 'tapered',
        slantedTopDeg: 0,
        diagonalBrace: 'left_to_right',
        facadeStyle: 'futuristic_diag',
        windowPattern: 'curtain_wall',
        materialRole: 'glass'
      }),
      createSectionTemplate({
        id: 'sec_twin_upper',
        role: 'upper_tower',
        label: 'Skybridge Upper Wing',
        floors: 14,
        floorHeight: 3.9,
        width: 19,
        depth: 17.5,
        offsetX: 0,
        setback: 1.25,
        transitionMode: 'tapered',
        footprint: 'multi_wing',
        cornerTreatment: 'stepped_piers',
        cornerSize: 1.4,
        slantedTopDeg: 30,
        diagonalBrace: 'right_to_left',
        facadeStyle: 'futuristic_diag',
        windowPattern: 'curtain_wall',
        materialRole: 'glass'
      })
    ]
  },

  twin_art_deco: {
    label: 'Twin Art Deco Towers',
    style: 'twin_art_deco',
    seed: 1929,
    floorHeight: 3.7,
    baseWidth: 26,
    baseDepth: 24,
    footprint: 'chamfered',
    structuralProtrusions: 0.9,
    windowPattern: 'vertical_strips',
    baysPerEdge: 7,
    windowWidth: 1.35,
    windowHeight: 2.35,
    windowRecess: 0.3,
    columnThickness: 0.72,
    ribDensity: 0.95,
    floorBandThickness: 0.3,
    floorBandInterval: 4,
    spandrelHeight: 0.7,
    concreteFraming: 0.65,
    corniceSize: 0.6,
    primaryMaterial: 'limestone',
    primaryColor: '#aea7aa',
    secondaryMaterial: 'limestone',
    secondaryColor: '#989095',
    framingMaterial: 'limestone',
    framingColor: '#bfb8bc',
    glassMaterial: 'dark_glass',
    glassColor: '#1f232c',
    mullionMaterial: 'bronze',
    mullionColor: '#484349',
    trimMaterial: 'limestone',
    trimColor: '#c9c2c6',
    crownMaterial: 'limestone',
    crownColor: '#b9b2b6',
    podiumMaterial: 'granite',
    podiumColor: '#7a7378',
    crownStyle: 'art_deco_stepped',
    crownHeight: 11,
    crownSteps: 3,
    spireStyle: 'none',
    mechPenthouse: false,
    hvacUnits: false,
    crownLighting: true,
    towerCount: 2,
    towerArrangement: 'twin_mirrored',
    towerSpacing: 34,
    secondaryTowerHeightRatio: 1.0,
    secondaryTowerScale: 1.0,
    bridgeCount: 0,
    connectedPodium: true,
    entranceStyle: 'monumental_arch',
    monumentalStairs: false,
    raisedPodium: true,
    podiumElevation: 0.9,
    plazaWidth: 74,
    plazaDepth: 50,
    signText: 'Sovereign Twins',
    sections: [
      createSectionTemplate({
        id: 'sec_tdeco_flare',
        role: 'lower_tower',
        label: 'Flared Sculpted Lower Shaft',
        floors: 18,
        floorHeight: 3.7,
        width: 24,
        depth: 22,
        flareBase: 0.34,
        footprint: 'h_shape',
        cornerTreatment: 'fluted_columns',
        cornerSize: 1.8,
        facadeStyle: 'art_deco',
        windowPattern: 'vertical_strips',
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_tdeco_mid',
        role: 'middle_tower',
        label: 'Fluted Mid Shaft',
        floors: 16,
        floorHeight: 3.7,
        width: 23,
        depth: 21,
        footprint: 'h_shape',
        cornerTreatment: 'fluted_columns',
        cornerSize: 1.8,
        facadeStyle: 'art_deco',
        windowPattern: 'vertical_strips',
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_tdeco_crown',
        role: 'upper_tower',
        label: 'Stepped Deco Upper Tier',
        floors: 6,
        floorHeight: 3.6,
        width: 19,
        depth: 18,
        setback: 2.0,
        footprint: 'chamfered',
        cornerTreatment: 'stepped_piers',
        cornerSize: 1.5,
        facadeStyle: 'art_deco',
        windowPattern: 'grouped_decorative',
        materialRole: 'secondary'
      })
    ]
  },

  curved_contemporary: {
    label: 'Curved Contemporary',
    style: 'curved_contemporary',
    seed: 2024,
    floorHeight: 3.7,
    baseWidth: 30,
    baseDepth: 22,
    footprint: 'curved_wings',
    structuralProtrusions: 0.65,
    windowPattern: 'horizontal_ribbon',
    baysPerEdge: 8,
    windowWidth: 2.2,
    windowHeight: 2.25,
    windowRecess: 0.22,
    columnThickness: 0.55,
    ribDensity: 0.5,
    floorBandThickness: 0.45,
    floorBandInterval: 1,
    spandrelHeight: 0.85,
    concreteFraming: 0.5,
    corniceSize: 0.75,
    primaryMaterial: 'dark_stone',
    primaryColor: '#48414b',
    secondaryMaterial: 'concrete',
    secondaryColor: '#5b525e',
    framingMaterial: 'dark_stone',
    framingColor: '#3c363f',
    glassMaterial: 'tinted_glass',
    glassColor: '#223656',
    mullionMaterial: 'aluminum',
    mullionColor: '#2c384e',
    trimMaterial: 'concrete',
    trimColor: '#665b69',
    crownMaterial: 'dark_stone',
    crownColor: '#48414b',
    podiumMaterial: 'dark_stone',
    podiumColor: '#363038',
    crownStyle: 'curved',
    crownHeight: 5.5,
    crownCurvature: 0.85,
    spireStyle: 'none',
    mechPenthouse: true,
    hvacUnits: true,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'oval_canopy',
    entranceCanopy: true,
    monumentalStairs: false,
    raisedPodium: false,
    signText: 'Crescent Tower',
    sections: [
      createSectionTemplate({
        id: 'sec_curv_t1',
        role: 'podium',
        label: 'Curved Tier 1 (Ground)',
        floors: 8,
        floorHeight: 3.9,
        width: 30,
        depth: 22,
        footprint: 'curved_wings',
        cornerTreatment: 'rounded',
        cornerSize: 3.2,
        facadeStyle: 'ribbon_modern',
        windowPattern: 'horizontal_ribbon',
        recessedCoreStrip: true,
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_curv_t2',
        role: 'lower_tower',
        label: 'Curved Tier 2',
        floors: 9,
        floorHeight: 3.7,
        width: 28.5,
        depth: 21,
        setback: 0.75,
        footprint: 'curved_wings',
        cornerTreatment: 'rounded',
        cornerSize: 3.0,
        facadeStyle: 'ribbon_modern',
        windowPattern: 'horizontal_ribbon',
        recessedCoreStrip: true,
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_curv_t3',
        role: 'middle_tower',
        label: 'Curved Tier 3',
        floors: 9,
        floorHeight: 3.7,
        width: 27,
        depth: 20,
        setback: 0.75,
        footprint: 'curved_wings',
        cornerTreatment: 'rounded',
        cornerSize: 2.8,
        facadeStyle: 'ribbon_modern',
        windowPattern: 'horizontal_ribbon',
        recessedCoreStrip: true,
        materialRole: 'primary'
      }),
      createSectionTemplate({
        id: 'sec_curv_t4',
        role: 'upper_tower',
        label: 'Curved Crown Tier',
        floors: 7,
        floorHeight: 3.8,
        width: 25.5,
        depth: 19,
        setback: 0.75,
        footprint: 'curved_wings',
        cornerTreatment: 'rounded',
        cornerSize: 2.6,
        facadeStyle: 'ribbon_modern',
        windowPattern: 'horizontal_ribbon',
        materialRole: 'secondary'
      })
    ]
  },

  neo_gothic: {
    label: 'Neo-Gothic / Corporate Gothic',
    style: 'neo_gothic',
    seed: 1913,
    floorHeight: 3.8,
    baseWidth: 26,
    baseDepth: 26,
    footprint: 'cross',
    structuralProtrusions: 0.95,
    windowPattern: 'arched_monumental',
    baysPerEdge: 7,
    windowWidth: 1.2,
    windowHeight: 2.7,
    windowRecess: 0.36,
    columnThickness: 0.8,
    ribDensity: 1.0,
    floorBandThickness: 0.24,
    floorBandInterval: 5,
    primaryMaterial: 'dark_stone',
    primaryColor: '#484a52',
    secondaryMaterial: 'granite',
    secondaryColor: '#373941',
    framingMaterial: 'dark_stone',
    framingColor: '#2d3038',
    glassMaterial: 'dark_glass',
    glassColor: '#19222d',
    mullionMaterial: 'steel',
    mullionColor: '#252930',
    trimMaterial: 'limestone',
    trimColor: '#8d8b86',
    crownMaterial: 'copper',
    crownColor: '#56786b',
    podiumMaterial: 'granite',
    podiumColor: '#393b42',
    crownStyle: 'pyramid',
    crownHeight: 18,
    spireStyle: 'gothic_needle',
    spireHeight: 28,
    mechPenthouse: false,
    hvacUnits: false,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'monumental_arch',
    monumentalStairs: true,
    raisedPodium: true,
    signText: 'Cathedral Tower',
    sections: [
      createSectionTemplate({ id: 'sec_ng_p', role: 'podium', label: 'Gothic Arcade', floors: 4, floorHeight: 4.6, width: 30, depth: 30, footprint: 'cross', cornerTreatment: 'stepped_piers', facadeStyle: 'gothic', windowPattern: 'arched_monumental', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_ng_l', role: 'lower_tower', label: 'Buttressed Shaft', floors: 22, floorHeight: 3.8, width: 24, depth: 24, footprint: 'cross', cornerTreatment: 'fluted_columns', facadeStyle: 'gothic', windowPattern: 'vertical_strips', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_ng_u', role: 'upper_tower', label: 'Belfry Crown Tier', floors: 12, floorHeight: 3.9, width: 17, depth: 17, setback: 3.5, footprint: 'octagon', cornerTreatment: 'stepped_piers', facadeStyle: 'gothic', windowPattern: 'arched_monumental', materialRole: 'secondary' })
    ]
  },

  glass_curtain_wall: {
    label: 'Glass Curtain-Wall Tower',
    style: 'glass_curtain_wall',
    seed: 2018,
    floorHeight: 3.9,
    baseWidth: 28,
    baseDepth: 24,
    footprint: 'rounded_rectangle',
    structuralProtrusions: 0.35,
    windowPattern: 'curtain_wall',
    baysPerEdge: 9,
    windowWidth: 2.3,
    windowHeight: 3.3,
    windowRecess: 0.08,
    columnThickness: 0.35,
    ribDensity: 0.4,
    floorBandThickness: 0.22,
    floorBandInterval: 1,
    mullionThickness: 0.1,
    spandrelHeight: 0.42,
    primaryMaterial: 'reflective_glass',
    primaryColor: '#4c799b',
    secondaryMaterial: 'tinted_glass',
    secondaryColor: '#376082',
    framingMaterial: 'aluminum',
    framingColor: '#a8b7c4',
    glassMaterial: 'reflective_glass',
    glassColor: '#568ab3',
    mullionMaterial: 'aluminum',
    mullionColor: '#b7c4cf',
    trimMaterial: 'aluminum',
    trimColor: '#c9d4dd',
    crownMaterial: 'reflective_glass',
    crownColor: '#699cc2',
    podiumMaterial: 'steel',
    podiumColor: '#475664',
    crownStyle: 'open_structural',
    crownHeight: 10,
    spireStyle: 'slender_mast',
    spireHeight: 22,
    mechPenthouse: true,
    helipad: true,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'revolving_door',
    entranceCanopy: true,
    monumentalStairs: false,
    signText: 'Aether Tower',
    sections: [
      createSectionTemplate({ id: 'sec_gcw_p', role: 'podium', label: 'Atrium Lobby', floors: 3, floorHeight: 4.8, width: 32, depth: 28, footprint: 'rounded_rectangle', cornerTreatment: 'rounded', cornerSize: 3.5, facadeStyle: 'curtain_wall', windowPattern: 'floor_to_ceiling', materialRole: 'glass' }),
      createSectionTemplate({ id: 'sec_gcw_l', role: 'lower_tower', label: 'Glass Curtain Shaft', floors: 26, floorHeight: 3.9, width: 27, depth: 23, footprint: 'rounded_rectangle', cornerTreatment: 'rounded', cornerSize: 3.2, facadeStyle: 'curtain_wall', windowPattern: 'curtain_wall', materialRole: 'glass' }),
      createSectionTemplate({ id: 'sec_gcw_u', role: 'upper_tower', label: 'Tapered Observatory', floors: 15, floorHeight: 4.0, width: 23, depth: 20, taperX: 0.85, taperZ: 0.85, setback: 2.0, footprint: 'rounded_rectangle', cornerTreatment: 'rounded', cornerSize: 3.0, facadeStyle: 'curtain_wall', windowPattern: 'corner_wrap', materialRole: 'glass' })
    ]
  },

  brutalist_monolith: {
    label: 'Brutalist Monolith',
    style: 'brutalist_monolith',
    seed: 1974,
    floorHeight: 3.9,
    baseWidth: 28,
    baseDepth: 26,
    footprint: 'h_shape',
    structuralProtrusions: 0.95,
    windowPattern: 'recessed_bays',
    baysPerEdge: 6,
    windowWidth: 1.6,
    windowHeight: 1.6,
    windowRecess: 0.55,
    columnThickness: 1.15,
    ribDensity: 0.85,
    floorBandThickness: 0.68,
    floorBandInterval: 2,
    spandrelHeight: 1.2,
    concreteFraming: 0.95,
    primaryMaterial: 'concrete',
    primaryColor: '#8d8f8e',
    secondaryMaterial: 'concrete',
    secondaryColor: '#757878',
    framingMaterial: 'concrete',
    framingColor: '#9ea19f',
    glassMaterial: 'dark_glass',
    glassColor: '#1d2226',
    mullionMaterial: 'steel',
    mullionColor: '#2d3236',
    trimMaterial: 'concrete',
    trimColor: '#a8aaa8',
    crownMaterial: 'concrete',
    crownColor: '#808382',
    podiumMaterial: 'concrete',
    podiumColor: '#6d7070',
    crownStyle: 'flat',
    crownHeight: 4,
    mechPenthouse: true,
    hvacUnits: true,
    waterTanks: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'recessed_colonnade',
    monumentalStairs: true,
    raisedPodium: true,
    podiumElevation: 1.5,
    signText: 'Citadel Annex',
    sections: [
      createSectionTemplate({ id: 'sec_br_p', role: 'podium', label: 'Bunker Plinth', floors: 3, floorHeight: 4.8, width: 26, depth: 24, footprint: 'rectangle', cornerTreatment: 'sharp', facadeStyle: 'brutalist', windowPattern: 'recessed_bays', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_br_m', role: 'middle_tower', label: 'Cantilevered Block', floors: 16, floorHeight: 3.9, width: 29, depth: 26, overhang: 1.6, transitionMode: 'supported_cantilever', footprint: 'h_shape', cornerTreatment: 'stepped_piers', facadeStyle: 'brutalist', windowPattern: 'horizontal_ribbon', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_br_u', role: 'upper_tower', label: 'Brutalist Crown Slab', floors: 10, floorHeight: 4.1, width: 24, depth: 21, setback: 2.5, footprint: 'h_shape', cornerTreatment: 'stepped_piers', facadeStyle: 'brutalist', windowPattern: 'recessed_bays', materialRole: 'secondary' })
    ]
  },

  international_style: {
    label: 'International Style',
    style: 'international_style',
    seed: 1958,
    floorHeight: 3.8,
    baseWidth: 28,
    baseDepth: 20,
    footprint: 'rectangle',
    structuralProtrusions: 0.45,
    windowPattern: 'rectangular_grid',
    baysPerEdge: 9,
    windowWidth: 2.1,
    windowHeight: 2.9,
    windowRecess: 0.14,
    columnThickness: 0.42,
    ribDensity: 0.9,
    floorBandThickness: 0.35,
    floorBandInterval: 1,
    mullionThickness: 0.12,
    spandrelHeight: 0.6,
    primaryMaterial: 'bronze',
    primaryColor: '#4a3d33',
    secondaryMaterial: 'steel',
    secondaryColor: '#362e28',
    framingMaterial: 'bronze',
    framingColor: '#3b3028',
    glassMaterial: 'tinted_glass',
    glassColor: '#2a373f',
    mullionMaterial: 'bronze',
    mullionColor: '#5c4c3f',
    trimMaterial: 'bronze',
    trimColor: '#695749',
    crownMaterial: 'bronze',
    crownColor: '#3b3028',
    podiumMaterial: 'granite',
    podiumColor: '#767470',
    crownStyle: 'flat',
    crownHeight: 3.5,
    mechPenthouse: true,
    hvacUnits: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'recessed_colonnade',
    exteriorColumns: true,
    plazaEnabled: true,
    raisedPodium: true,
    podiumElevation: 0.9,
    signText: 'Seagram Hall',
    sections: [
      createSectionTemplate({ id: 'sec_int_p', role: 'podium', label: 'Colonnade Lobby', floors: 2, floorHeight: 5.5, width: 26, depth: 18, footprint: 'rectangle', cornerTreatment: 'sharp', facadeStyle: 'corporate_grid', windowPattern: 'floor_to_ceiling', materialRole: 'glass' }),
      createSectionTemplate({ id: 'sec_int_l', role: 'lower_tower', label: 'Miesian Slab', floors: 34, floorHeight: 3.8, width: 28, depth: 20, overhang: 1.0, footprint: 'rectangle', cornerTreatment: 'sharp', facadeStyle: 'corporate_grid', windowPattern: 'rectangular_grid', materialRole: 'primary' })
    ]
  },

  postmodern_landmark: {
    label: 'Postmodern Landmark',
    style: 'postmodern_landmark',
    seed: 1984,
    floorHeight: 3.9,
    baseWidth: 28,
    baseDepth: 26,
    footprint: 'octagon',
    structuralProtrusions: 0.85,
    windowPattern: 'alternating_widths',
    baysPerEdge: 7,
    windowWidth: 1.8,
    windowHeight: 2.5,
    windowRecess: 0.28,
    columnThickness: 0.72,
    ribDensity: 0.75,
    floorBandThickness: 0.44,
    floorBandInterval: 3,
    primaryMaterial: 'granite',
    primaryColor: '#a67b72',
    secondaryMaterial: 'limestone',
    secondaryColor: '#c7a498',
    framingMaterial: 'granite',
    framingColor: '#7d5b54',
    glassMaterial: 'reflective_glass',
    glassColor: '#3b647d',
    mullionMaterial: 'bronze',
    mullionColor: '#b89763',
    trimMaterial: 'limestone',
    trimColor: '#dfc6b8',
    crownMaterial: 'granite',
    crownColor: '#a67b72',
    podiumMaterial: 'granite',
    podiumColor: '#7d5b54',
    crownStyle: 'domed',
    crownHeight: 14,
    spireStyle: 'slender_mast',
    spireHeight: 16,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'monumental_arch',
    monumentalStairs: true,
    raisedPodium: true,
    signText: 'Olympus Plaza',
    sections: [
      createSectionTemplate({ id: 'sec_pm_p', role: 'podium', label: 'Classical Plinth', floors: 4, floorHeight: 4.6, width: 32, depth: 30, footprint: 'chamfered', cornerTreatment: 'stepped_piers', facadeStyle: 'art_deco', windowPattern: 'arched_monumental', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_pm_l', role: 'lower_tower', label: 'Granite Shaft', floors: 20, floorHeight: 3.9, width: 26, depth: 24, footprint: 'octagon', cornerTreatment: 'chamfered', facadeStyle: 'corporate_grid', windowPattern: 'alternating_widths', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_pm_u', role: 'upper_tower', label: 'Rotunda Tier', floors: 10, floorHeight: 4.0, width: 20, depth: 20, setback: 3.0, footprint: 'circle', cornerTreatment: 'rounded', facadeStyle: 'corporate_grid', windowPattern: 'grouped_decorative', materialRole: 'secondary' })
    ]
  },

  industrial_highrise: {
    label: 'Industrial High-Rise',
    style: 'industrial_highrise',
    seed: 1969,
    floorHeight: 4.1,
    baseWidth: 28,
    baseDepth: 24,
    footprint: 'l_shape',
    structuralProtrusions: 0.9,
    windowPattern: 'grouped_decorative',
    baysPerEdge: 6,
    windowWidth: 1.6,
    windowHeight: 2.1,
    windowRecess: 0.25,
    columnThickness: 0.78,
    ribDensity: 0.8,
    floorBandThickness: 0.5,
    floorBandInterval: 2,
    exteriorBracing: 'x_brace',
    primaryMaterial: 'brick',
    primaryColor: '#7a453b',
    secondaryMaterial: 'steel',
    secondaryColor: '#3f474d',
    framingMaterial: 'steel',
    framingColor: '#2d3338',
    glassMaterial: 'dark_glass',
    glassColor: '#222b33',
    mullionMaterial: 'steel',
    mullionColor: '#272c30',
    trimMaterial: 'steel',
    trimColor: '#566066',
    crownMaterial: 'steel',
    crownColor: '#3a4247',
    podiumMaterial: 'concrete',
    podiumColor: '#585c60',
    crownStyle: 'open_structural',
    crownHeight: 11,
    spireStyle: 'lattice_tower',
    spireHeight: 26,
    antennaMasts: 4,
    commArrays: true,
    mechPenthouse: true,
    waterTanks: true,
    hvacUnits: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'recessed_colonnade',
    loadingBay: true,
    parkingEntrance: true,
    signText: 'Foundry Telecom',
    sections: [
      createSectionTemplate({ id: 'sec_ind_p', role: 'podium', label: 'Industrial Base', floors: 4, floorHeight: 4.6, width: 32, depth: 28, footprint: 'rectangle', cornerTreatment: 'stepped_piers', facadeStyle: 'brutalist', windowPattern: 'grouped_decorative', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_ind_l', role: 'lower_tower', label: 'Braced Equipment Core', floors: 18, floorHeight: 4.1, width: 27, depth: 23, footprint: 'l_shape', cornerTreatment: 'stepped_piers', diagonalBrace: 'x_brace', facadeStyle: 'futuristic_diag', windowPattern: 'grouped_decorative', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_ind_u', role: 'upper_tower', label: 'Upper Switchgear Tower', floors: 11, floorHeight: 4.2, width: 21, depth: 18, setback: 2.0, transitionMode: 'setback', footprint: 'l_shape', cornerTreatment: 'stepped_piers', diagonalBrace: 'x_brace', facadeStyle: 'brutalist', windowPattern: 'horizontal_ribbon', materialRole: 'secondary' })
    ]
  },

  luxury_residential: {
    label: 'Luxury Residential',
    style: 'luxury_residential',
    seed: 2025,
    floorHeight: 3.5,
    baseWidth: 26,
    baseDepth: 24,
    footprint: 'rounded_rectangle',
    structuralProtrusions: 0.6,
    windowPattern: 'floor_to_ceiling',
    baysPerEdge: 7,
    windowWidth: 2.05,
    windowHeight: 2.75,
    windowRecess: 0.18,
    columnThickness: 0.48,
    ribDensity: 0.55,
    floorBandThickness: 0.36,
    floorBandInterval: 1,
    balconyRatio: 0.45,
    primaryMaterial: 'limestone',
    primaryColor: '#bcae98',
    secondaryMaterial: 'aluminum',
    secondaryColor: '#98a6b0',
    framingMaterial: 'aluminum',
    framingColor: '#7f8f9b',
    glassMaterial: 'tinted_glass',
    glassColor: '#2d536b',
    mullionMaterial: 'bronze',
    mullionColor: '#69533b',
    trimMaterial: 'limestone',
    trimColor: '#cfc4b1',
    crownMaterial: 'aluminum',
    crownColor: '#a8b5be',
    podiumMaterial: 'limestone',
    podiumColor: '#9e9381',
    crownStyle: 'angular_geometric',
    crownHeight: 8,
    spireStyle: 'none',
    mechPenthouse: true,
    helipad: true,
    crownLighting: true,
    litWindowRatio: 0.58,
    warmCoolBalance: 0.78,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'oval_canopy',
    entranceCanopy: true,
    plantersCount: 10,
    signText: 'The Solstice',
    sections: [
      createSectionTemplate({ id: 'sec_lux_p', role: 'podium', label: 'Porte Cochere Lobby', floors: 3, floorHeight: 4.4, width: 32, depth: 29, footprint: 'rounded_rectangle', cornerTreatment: 'rounded', cornerSize: 3.0, facadeStyle: 'curtain_wall', windowPattern: 'floor_to_ceiling', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_lux_l', role: 'lower_tower', label: 'Terrace Residences', floors: 20, floorHeight: 3.5, width: 26, depth: 24, footprint: 'rounded_rectangle', cornerTreatment: 'rounded', cornerSize: 3.0, transitionMode: 'setback', facadeStyle: 'curtain_wall', windowPattern: 'corner_wrap', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_lux_u', role: 'upper_tower', label: 'Penthouse Suites', floors: 14, floorHeight: 3.7, width: 20, depth: 18, taperX: 0.9, taperZ: 0.9, setback: 2.0, transitionMode: 'setback', footprint: 'cross', cornerTreatment: 'chamfered', cornerSize: 1.6, facadeStyle: 'curtain_wall', windowPattern: 'corner_wrap', materialRole: 'secondary' })
    ]
  },

  retro_futuristic: {
    label: 'Retro-Futuristic Spire',
    style: 'retro_futuristic',
    seed: 1962,
    floorHeight: 3.7,
    baseWidth: 26,
    baseDepth: 26,
    footprint: 'circle',
    structuralProtrusions: 0.8,
    windowPattern: 'horizontal_ribbon',
    baysPerEdge: 10,
    windowWidth: 2.1,
    windowHeight: 2.2,
    windowRecess: 0.2,
    columnThickness: 0.45,
    ribDensity: 0.75,
    floorBandThickness: 0.48,
    floorBandInterval: 1,
    primaryMaterial: 'aluminum',
    primaryColor: '#c9d4dc',
    secondaryMaterial: 'copper',
    secondaryColor: '#5fa096',
    framingMaterial: 'aluminum',
    framingColor: '#dae3ea',
    glassMaterial: 'reflective_glass',
    glassColor: '#33889e',
    mullionMaterial: 'aluminum',
    mullionColor: '#e1ebf0',
    trimMaterial: 'copper',
    trimColor: '#4fb8a9',
    crownMaterial: 'aluminum',
    crownColor: '#d8e3eb',
    podiumMaterial: 'concrete',
    podiumColor: '#8d9ba6',
    crownStyle: 'domed',
    crownHeight: 11,
    spireStyle: 'atomic_needle',
    spireHeight: 30,
    antennaMasts: 2,
    commArrays: true,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'oval_canopy',
    entranceCanopy: true,
    signText: 'Horizon Spire',
    sections: [
      createSectionTemplate({ id: 'sec_rf_p', role: 'podium', label: 'Circular Concourse', floors: 3, floorHeight: 4.5, width: 32, depth: 32, footprint: 'circle', cornerTreatment: 'rounded', facadeStyle: 'ribbon_modern', windowPattern: 'floor_to_ceiling', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_rf_l', role: 'lower_tower', label: 'Tapered Cylindrical Core', floors: 20, floorHeight: 3.7, width: 22, depth: 22, taperX: 0.84, taperZ: 0.84, footprint: 'circle', cornerTreatment: 'rounded', facadeStyle: 'ribbon_modern', windowPattern: 'horizontal_ribbon', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_rf_pod', role: 'middle_tower', label: 'Cantilevered Sky Pod', floors: 5, floorHeight: 3.9, width: 24, depth: 24, overhang: 1.5, transitionMode: 'supported_cantilever', taperX: 1.04, taperZ: 1.04, footprint: 'ellipse', cornerTreatment: 'rounded', facadeStyle: 'ribbon_modern', windowPattern: 'floor_to_ceiling', materialRole: 'secondary' }),
      createSectionTemplate({ id: 'sec_rf_u', role: 'upper_tower', label: 'Upper Observation Shaft', floors: 10, floorHeight: 3.6, width: 17, depth: 17, taperX: 0.82, taperZ: 0.82, footprint: 'circle', cornerTreatment: 'rounded', facadeStyle: 'ribbon_modern', windowPattern: 'horizontal_ribbon', materialRole: 'primary' })
    ]
  },

  stepped_ziggurat: {
    label: 'Stepped Ziggurat Tower',
    style: 'stepped_ziggurat',
    seed: 1930,
    floorHeight: 3.6,
    baseWidth: 34,
    baseDepth: 32,
    footprint: 'chamfered',
    structuralProtrusions: 0.8,
    windowPattern: 'vertical_strips',
    baysPerEdge: 8,
    windowWidth: 1.35,
    windowHeight: 2.35,
    windowRecess: 0.28,
    columnThickness: 0.65,
    ribDensity: 0.88,
    floorBandThickness: 0.34,
    floorBandInterval: 3,
    corniceSize: 0.65,
    primaryMaterial: 'limestone',
    primaryColor: '#b89f82',
    secondaryMaterial: 'dark_stone',
    secondaryColor: '#7a6552',
    framingMaterial: 'bronze',
    framingColor: '#4e3f32',
    glassMaterial: 'dark_glass',
    glassColor: '#1f2936',
    mullionMaterial: 'bronze',
    mullionColor: '#5c4b3a',
    trimMaterial: 'limestone',
    trimColor: '#c9b396',
    crownMaterial: 'limestone',
    crownColor: '#b89f82',
    podiumMaterial: 'granite',
    podiumColor: '#695b4e',
    crownStyle: 'art_deco_stepped',
    crownHeight: 12,
    crownSteps: 4,
    spireStyle: 'slender_mast',
    spireHeight: 22,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'monumental_arch',
    monumentalStairs: true,
    raisedPodium: true,
    podiumElevation: 1.2,
    signText: 'Ziggurat Exchange',
    sections: [
      createSectionTemplate({ id: 'sec_zig_1', role: 'podium', label: 'Tier 1 Podium', floors: 5, floorHeight: 4.2, width: 34, depth: 32, footprint: 'chamfered', cornerTreatment: 'stepped_piers', facadeStyle: 'art_deco', windowPattern: 'arched_monumental', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_zig_2', role: 'lower_tower', label: 'Tier 2 Broad Shaft', floors: 12, floorHeight: 3.6, width: 29, depth: 27, setback: 2.0, transitionMode: 'stepped', footprint: 'chamfered', cornerTreatment: 'stepped_piers', facadeStyle: 'art_deco', windowPattern: 'vertical_strips', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_zig_3', role: 'middle_tower', label: 'Tier 3 Middle Setback', floors: 11, floorHeight: 3.6, width: 24, depth: 22, setback: 2.0, transitionMode: 'stepped', footprint: 'chamfered', cornerTreatment: 'fluted_columns', facadeStyle: 'art_deco', windowPattern: 'vertical_strips', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_zig_4', role: 'upper_tower', label: 'Tier 4 Upper Setback', floors: 10, floorHeight: 3.6, width: 18, depth: 17, setback: 2.0, transitionMode: 'stepped', footprint: 'octagon', cornerTreatment: 'fluted_columns', facadeStyle: 'art_deco', windowPattern: 'grouped_decorative', materialRole: 'secondary' }),
      createSectionTemplate({ id: 'sec_zig_5', role: 'crown', label: 'Tier 5 Lantern', floors: 6, floorHeight: 3.7, width: 13, depth: 12, setback: 1.5, transitionMode: 'stepped', footprint: 'octagon', cornerTreatment: 'stepped_piers', facadeStyle: 'art_deco', windowPattern: 'vertical_strips', materialRole: 'secondary' })
    ]
  },

  mid_century_slab: {
    label: 'Mid-Century Office Slab',
    style: 'mid_century_slab',
    seed: 1964,
    floorHeight: 3.7,
    baseWidth: 36,
    baseDepth: 18,
    footprint: 'rectangle',
    structuralProtrusions: 0.45,
    windowPattern: 'horizontal_ribbon',
    baysPerEdge: 11,
    windowWidth: 2.2,
    windowHeight: 2.2,
    windowRecess: 0.16,
    columnThickness: 0.5,
    ribDensity: 0.55,
    floorBandThickness: 0.46,
    floorBandInterval: 1,
    spandrelHeight: 0.9,
    primaryMaterial: 'concrete',
    primaryColor: '#98a1a8',
    secondaryMaterial: 'aluminum',
    secondaryColor: '#b7c1c7',
    framingMaterial: 'aluminum',
    framingColor: '#cad2d8',
    glassMaterial: 'tinted_glass',
    glassColor: '#2d5762',
    mullionMaterial: 'aluminum',
    mullionColor: '#d0d8dd',
    trimMaterial: 'concrete',
    trimColor: '#adb5bb',
    crownMaterial: 'aluminum',
    crownColor: '#8d969c',
    podiumMaterial: 'granite',
    podiumColor: '#6f7478',
    crownStyle: 'flat',
    crownHeight: 4,
    mechPenthouse: true,
    hvacUnits: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'recessed_colonnade',
    exteriorColumns: true,
    raisedPodium: true,
    podiumElevation: 0.8,
    signText: 'Commerce Slab',
    sections: [
      createSectionTemplate({ id: 'sec_mcs_p', role: 'podium', label: 'Stilt Lobby Base', floors: 2, floorHeight: 5.2, width: 32, depth: 16, footprint: 'rectangle', cornerTreatment: 'sharp', facadeStyle: 'corporate_grid', windowPattern: 'floor_to_ceiling', materialRole: 'glass' }),
      createSectionTemplate({ id: 'sec_mcs_l', role: 'lower_tower', label: 'Office Slab Shaft', floors: 28, floorHeight: 3.7, width: 35, depth: 18, overhang: 0.8, transitionMode: 'supported_cantilever', footprint: 'rectangle', cornerTreatment: 'sharp', facadeStyle: 'ribbon_modern', windowPattern: 'horizontal_ribbon', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_mcs_u', role: 'upper_tower', label: 'Executive Top Floors', floors: 6, floorHeight: 3.9, width: 31, depth: 16, setback: 1.5, footprint: 'rectangle', cornerTreatment: 'sharp', facadeStyle: 'corporate_grid', windowPattern: 'rectangular_grid', materialRole: 'secondary' })
    ]
  },

  hightech_exoskeleton: {
    label: 'High-Tech Exoskeleton',
    style: 'hightech_exoskeleton',
    seed: 1997,
    floorHeight: 4.0,
    baseWidth: 28,
    baseDepth: 26,
    footprint: 'octagon',
    structuralProtrusions: 1.0,
    windowPattern: 'curtain_wall',
    baysPerEdge: 8,
    windowWidth: 2.1,
    windowHeight: 3.0,
    windowRecess: 0.14,
    columnThickness: 0.88,
    ribDensity: 0.85,
    floorBandThickness: 0.42,
    floorBandInterval: 4,
    exteriorBracing: 'diamond',
    primaryMaterial: 'steel',
    primaryColor: '#414c57',
    secondaryMaterial: 'aluminum',
    secondaryColor: '#98a6b3',
    framingMaterial: 'steel',
    framingColor: '#252d36',
    glassMaterial: 'reflective_glass',
    glassColor: '#366587',
    mullionMaterial: 'aluminum',
    mullionColor: '#798996',
    trimMaterial: 'aluminum',
    trimColor: '#aebbc4',
    crownMaterial: 'steel',
    crownColor: '#343e48',
    podiumMaterial: 'steel',
    podiumColor: '#313942',
    crownStyle: 'open_structural',
    crownHeight: 14,
    spireStyle: 'lattice_tower',
    spireHeight: 28,
    antennaMasts: 2,
    commArrays: true,
    helipad: true,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'glass_curtain_lobby',
    exteriorColumns: true,
    signText: 'Diagrid Center',
    sections: [
      createSectionTemplate({ id: 'sec_exo_p', role: 'podium', label: 'Truss Transfer Lobby', floors: 3, floorHeight: 4.8, width: 30, depth: 28, footprint: 'octagon', cornerTreatment: 'chamfered', facadeStyle: 'futuristic_diag', windowPattern: 'floor_to_ceiling', diagonalBrace: 'x_brace', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_exo_l', role: 'lower_tower', label: 'Lower Diagrid Exoskeleton', floors: 20, floorHeight: 4.0, width: 27, depth: 25, footprint: 'octagon', cornerTreatment: 'stepped_piers', facadeStyle: 'futuristic_diag', windowPattern: 'curtain_wall', diagonalBrace: 'diamond', materialRole: 'glass' }),
      createSectionTemplate({ id: 'sec_exo_u', role: 'upper_tower', label: 'Upper Braced Spire Shaft', floors: 16, floorHeight: 4.0, width: 22, depth: 20, setback: 2.0, taperX: 0.88, taperZ: 0.88, transitionMode: 'tapered', footprint: 'octagon', cornerTreatment: 'chamfered', facadeStyle: 'futuristic_diag', windowPattern: 'curtain_wall', diagonalBrace: 'diamond', materialRole: 'glass' })
    ]
  },

  triangular_wedge: {
    label: 'Triangular Wedge Tower',
    style: 'triangular_wedge',
    seed: 2012,
    floorHeight: 3.8,
    baseWidth: 32,
    baseDepth: 30,
    footprint: 'triangle',
    structuralProtrusions: 0.65,
    windowPattern: 'curtain_wall',
    baysPerEdge: 8,
    windowWidth: 2.1,
    windowHeight: 2.9,
    windowRecess: 0.14,
    columnThickness: 0.62,
    ribDensity: 0.65,
    floorBandThickness: 0.34,
    floorBandInterval: 3,
    primaryMaterial: 'reflective_glass',
    primaryColor: '#3f7394',
    secondaryMaterial: 'steel',
    secondaryColor: '#313d48',
    framingMaterial: 'aluminum',
    framingColor: '#98aab8',
    glassMaterial: 'reflective_glass',
    glassColor: '#4882a6',
    mullionMaterial: 'aluminum',
    mullionColor: '#b3c1cc',
    trimMaterial: 'aluminum',
    trimColor: '#c2ced6',
    crownMaterial: 'steel',
    crownColor: '#2d3944',
    podiumMaterial: 'granite',
    podiumColor: '#4a545e',
    crownStyle: 'slanted',
    crownHeight: 14,
    spireStyle: 'slender_mast',
    spireHeight: 20,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'glass_curtain_lobby',
    signText: 'Apex Wedge',
    sections: [
      createSectionTemplate({ id: 'sec_tri_p', role: 'podium', label: 'Delta Lobby Plinth', floors: 3, floorHeight: 4.6, width: 34, depth: 32, footprint: 'triangle', cornerTreatment: 'chamfered', cornerSize: 2.4, facadeStyle: 'curtain_wall', windowPattern: 'floor_to_ceiling', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_tri_l', role: 'lower_tower', label: 'Tapered Wedge Shaft', floors: 20, floorHeight: 3.8, width: 29, depth: 27, setback: 1.5, taperX: 0.9, taperZ: 0.9, transitionMode: 'tapered', footprint: 'triangle', cornerTreatment: 'chamfered', cornerSize: 2.2, facadeStyle: 'curtain_wall', windowPattern: 'curtain_wall', materialRole: 'glass' }),
      createSectionTemplate({ id: 'sec_tri_u', role: 'upper_tower', label: 'Slanted Prism Crown Tier', floors: 14, floorHeight: 3.8, width: 23, depth: 21, setback: 1.5, taperX: 0.86, taperZ: 0.86, transitionMode: 'tapered', slantedTopDeg: 24, footprint: 'triangle', cornerTreatment: 'chamfered', cornerSize: 1.8, facadeStyle: 'curtain_wall', windowPattern: 'curtain_wall', materialRole: 'glass' })
    ]
  },

  terraced_garden: {
    label: 'Terraced Garden Tower',
    style: 'terraced_garden',
    seed: 2027,
    floorHeight: 3.6,
    baseWidth: 32,
    baseDepth: 30,
    footprint: 'rounded_rectangle',
    structuralProtrusions: 0.65,
    windowPattern: 'floor_to_ceiling',
    baysPerEdge: 8,
    windowWidth: 2.1,
    windowHeight: 2.75,
    windowRecess: 0.18,
    columnThickness: 0.5,
    ribDensity: 0.55,
    floorBandThickness: 0.42,
    floorBandInterval: 1,
    balconyRatio: 0.55,
    terracePlanters: true,
    primaryMaterial: 'limestone',
    primaryColor: '#b7ab94',
    secondaryMaterial: 'copper',
    secondaryColor: '#588267',
    framingMaterial: 'bronze',
    framingColor: '#695744',
    glassMaterial: 'tinted_glass',
    glassColor: '#2f5c63',
    mullionMaterial: 'bronze',
    mullionColor: '#5b4b3a',
    trimMaterial: 'limestone',
    trimColor: '#c9bea7',
    crownMaterial: 'copper',
    crownColor: '#4c7559',
    podiumMaterial: 'granite',
    podiumColor: '#767168',
    crownStyle: 'flat',
    crownHeight: 5,
    mechPenthouse: true,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'recessed_colonnade',
    plantersCount: 14,
    signText: 'Verdant Heights',
    sections: [
      createSectionTemplate({ id: 'sec_tg_1', role: 'podium', label: 'Garden Concourse', floors: 4, floorHeight: 4.3, width: 34, depth: 32, footprint: 'rounded_rectangle', cornerTreatment: 'rounded', cornerSize: 3.2, facadeStyle: 'ribbon_modern', windowPattern: 'floor_to_ceiling', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_tg_2', role: 'lower_tower', label: 'Lower Terrace Tier', floors: 12, floorHeight: 3.6, width: 29, depth: 27, setback: 2.5, transitionMode: 'stepped', footprint: 'rounded_rectangle', cornerTreatment: 'rounded', cornerSize: 3.0, facadeStyle: 'curtain_wall', windowPattern: 'corner_wrap', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_tg_3', role: 'middle_tower', label: 'Mid Garden Deck', floors: 11, floorHeight: 3.6, width: 24, depth: 22, setback: 2.5, transitionMode: 'stepped', footprint: 'chamfered', cornerTreatment: 'chamfered', cornerSize: 2.4, facadeStyle: 'curtain_wall', windowPattern: 'floor_to_ceiling', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_tg_4', role: 'upper_tower', label: 'Sky Conservatory', floors: 9, floorHeight: 3.7, width: 18, depth: 17, setback: 2.5, transitionMode: 'stepped', footprint: 'chamfered', cornerTreatment: 'chamfered', cornerSize: 2.0, facadeStyle: 'curtain_wall', windowPattern: 'floor_to_ceiling', materialRole: 'secondary' })
    ]
  },

  split_core_atrium: {
    label: 'Split-Core Atrium Tower',
    style: 'split_core_atrium',
    seed: 2032,
    floorHeight: 3.8,
    baseWidth: 16,
    baseDepth: 24,
    footprint: 'rectangle',
    structuralProtrusions: 0.75,
    windowPattern: 'curtain_wall',
    baysPerEdge: 6,
    windowWidth: 1.9,
    windowHeight: 2.8,
    windowRecess: 0.15,
    columnThickness: 0.65,
    ribDensity: 0.7,
    floorBandThickness: 0.38,
    floorBandInterval: 3,
    exteriorBracing: 'none',
    primaryMaterial: 'aluminum',
    primaryColor: '#8d9aa6',
    secondaryMaterial: 'steel',
    secondaryColor: '#3a4652',
    framingMaterial: 'steel',
    framingColor: '#2c3640',
    glassMaterial: 'reflective_glass',
    glassColor: '#3a6c91',
    mullionMaterial: 'aluminum',
    mullionColor: '#b3c0cc',
    trimMaterial: 'aluminum',
    trimColor: '#c7d1d9',
    crownMaterial: 'steel',
    crownColor: '#3a4652',
    podiumMaterial: 'granite',
    podiumColor: '#616870',
    crownStyle: 'open_structural',
    crownHeight: 10,
    spireStyle: 'none',
    mechPenthouse: true,
    crownLighting: true,
    towerCount: 2,
    towerArrangement: 'split_core_atrium',
    towerSpacing: 26,
    secondaryTowerHeightRatio: 1.0,
    secondaryTowerScale: 1.0,
    secondaryTowerOffsetZ: 0,
    secondaryTowerRotationDeg: 0,
    bridgeCount: 3,
    bridgeStartFloor: 10,
    bridgeFloorSpacing: 8,
    bridgeWidth: 6.0,
    bridgeHeight: 4.2,
    bridgeEnclosed: true,
    bridgeGlass: true,
    bridgeTrusses: true,
    interTowerTrussFrame: true,
    connectedPodium: true,
    entranceStyle: 'glass_curtain_lobby',
    monumentalStairs: true,
    raisedPodium: true,
    podiumElevation: 1.2,
    plazaWidth: 72,
    plazaDepth: 52,
    signText: 'Atrium Portal',
    sections: [
      createSectionTemplate({ id: 'sec_sca_p', role: 'podium', label: 'Shared Atrium Base', floors: 3, floorHeight: 4.5, width: 17, depth: 25, footprint: 'chamfered', cornerTreatment: 'chamfered', cornerSize: 1.6, facadeStyle: 'corporate_grid', windowPattern: 'floor_to_ceiling', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_sca_l', role: 'lower_tower', label: 'Lower Atrium Wing', floors: 18, floorHeight: 3.8, width: 16, depth: 24, footprint: 'chamfered', cornerTreatment: 'stepped_piers', cornerSize: 1.5, facadeStyle: 'curtain_wall', windowPattern: 'curtain_wall', materialRole: 'glass' }),
      createSectionTemplate({ id: 'sec_sca_u', role: 'upper_tower', label: 'Upper Portal Wing', floors: 12, floorHeight: 3.8, width: 14, depth: 20, setback: 1.0, transitionMode: 'setback', footprint: 'chamfered', cornerTreatment: 'chamfered', cornerSize: 1.4, facadeStyle: 'curtain_wall', windowPattern: 'vertical_strips', materialRole: 'primary' })
    ]
  },

  broadcast_comm_tower: {
    label: 'Broadcast / Comm Tower',
    style: 'broadcast_comm_tower',
    seed: 1978,
    floorHeight: 4.0,
    baseWidth: 28,
    baseDepth: 28,
    footprint: 'octagon',
    structuralProtrusions: 0.85,
    windowPattern: 'vertical_strips',
    baysPerEdge: 6,
    windowWidth: 1.4,
    windowHeight: 2.3,
    windowRecess: 0.25,
    columnThickness: 0.72,
    ribDensity: 0.85,
    floorBandThickness: 0.48,
    floorBandInterval: 4,
    primaryMaterial: 'concrete',
    primaryColor: '#8d949a',
    secondaryMaterial: 'steel',
    secondaryColor: '#36434f',
    framingMaterial: 'steel',
    framingColor: '#25303a',
    glassMaterial: 'tinted_glass',
    glassColor: '#28536e',
    mullionMaterial: 'aluminum',
    mullionColor: '#7e8e9c',
    trimMaterial: 'concrete',
    trimColor: '#acb4ba',
    crownMaterial: 'steel',
    crownColor: '#3b4854',
    podiumMaterial: 'concrete',
    podiumColor: '#6b7278',
    crownStyle: 'open_structural',
    crownHeight: 12,
    spireStyle: 'lattice_tower',
    spireHeight: 44,
    antennaMasts: 4,
    commArrays: true,
    mechPenthouse: true,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    entranceStyle: 'recessed_colonnade',
    loadingBay: true,
    signText: 'Relay Broadcast',
    sections: [
      createSectionTemplate({ id: 'sec_bct_p', role: 'podium', label: 'Studio Tech Base', floors: 4, floorHeight: 4.6, width: 28, depth: 28, footprint: 'octagon', cornerTreatment: 'chamfered', facadeStyle: 'brutalist', windowPattern: 'grouped_decorative', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_bct_l', role: 'lower_tower', label: 'Reinforced Core Shaft', floors: 24, floorHeight: 4.0, width: 17, depth: 17, setback: 3.0, taperX: 0.86, taperZ: 0.86, footprint: 'octagon', cornerTreatment: 'fluted_columns', facadeStyle: 'art_deco', windowPattern: 'vertical_strips', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_bct_pod', role: 'upper_tower', label: 'Transmitter Sky Deck', floors: 5, floorHeight: 4.2, width: 19, depth: 19, overhang: 1.5, transitionMode: 'supported_cantilever', footprint: 'octagon', cornerTreatment: 'chamfered', facadeStyle: 'futuristic_diag', windowPattern: 'floor_to_ceiling', materialRole: 'secondary' })
    ]
  },

  cantilevered_landmark: {
    label: 'Cantilevered Landmark',
    style: 'cantilevered_landmark',
    seed: 2040,
    floorHeight: 3.8,
    baseWidth: 26,
    baseDepth: 24,
    footprint: 'chamfered',
    structuralProtrusions: 0.9,
    windowPattern: 'curtain_wall',
    baysPerEdge: 7,
    windowWidth: 1.9,
    windowHeight: 2.7,
    windowRecess: 0.16,
    columnThickness: 0.72,
    ribDensity: 0.75,
    floorBandThickness: 0.5,
    floorBandInterval: 4,
    exteriorBracing: 'x_brace',
    primaryMaterial: 'steel',
    primaryColor: '#37414a',
    secondaryMaterial: 'bronze',
    secondaryColor: '#8c694a',
    framingMaterial: 'steel',
    framingColor: '#222a30',
    glassMaterial: 'reflective_glass',
    glassColor: '#2f5e7d',
    mullionMaterial: 'bronze',
    mullionColor: '#7a5c41',
    trimMaterial: 'bronze',
    trimColor: '#a68262',
    crownMaterial: 'steel',
    crownColor: '#2f3840',
    podiumMaterial: 'granite',
    podiumColor: '#4c5157',
    crownStyle: 'angular_geometric',
    crownHeight: 11,
    spireStyle: 'none',
    helipad: true,
    crownLighting: true,
    towerCount: 1,
    bridgeCount: 0,
    allowCantileveredSteps: true,
    maxOutwardExpansionRatio: 0.34,
    entranceStyle: 'glass_curtain_lobby',
    signText: 'Cantilever Haus',
    sections: [
      createSectionTemplate({ id: 'sec_cnt_p', role: 'podium', label: 'Transfer Plinth', floors: 4, floorHeight: 4.5, width: 28, depth: 26, footprint: 'chamfered', cornerTreatment: 'stepped_piers', facadeStyle: 'corporate_grid', windowPattern: 'floor_to_ceiling', materialRole: 'podium' }),
      createSectionTemplate({ id: 'sec_cnt_1', role: 'lower_tower', label: 'Lower Core Volume', floors: 12, floorHeight: 3.8, width: 23, depth: 22, setback: 1.5, footprint: 'rectangle', cornerTreatment: 'sharp', diagonalBrace: 'x_brace', facadeStyle: 'futuristic_diag', windowPattern: 'curtain_wall', materialRole: 'primary' }),
      createSectionTemplate({ id: 'sec_cnt_2', role: 'middle_tower', label: 'West Cantilever Block', floors: 11, floorHeight: 3.8, width: 24, depth: 20, offsetX: -3.2, overhang: 1.0, transitionMode: 'supported_cantilever', footprint: 'rectangle', cornerTreatment: 'sharp', facadeStyle: 'curtain_wall', windowPattern: 'horizontal_ribbon', materialRole: 'secondary' }),
      createSectionTemplate({ id: 'sec_cnt_3', role: 'upper_tower', label: 'East Transfer Tower', floors: 12, floorHeight: 3.8, width: 20, depth: 18, offsetX: 2.8, overhang: 0.8, transitionMode: 'supported_cantilever', footprint: 'chamfered', cornerTreatment: 'chamfered', facadeStyle: 'futuristic_diag', windowPattern: 'curtain_wall', diagonalBrace: 'left_to_right', materialRole: 'primary' })
    ]
  }
};

export const PRESETS = PRESET_DEFINITIONS;

export const OPTIONS = {
  footprint: [
    ['rectangle', 'Rectangle'],
    ['square', 'Square'],
    ['rounded_rectangle', 'Rounded Rectangle'],
    ['octagon', 'Octagonal'],
    ['circle', 'Circular'],
    ['ellipse', 'Elliptical'],
    ['chamfered', 'Chamfered Corners'],
    ['cross', 'Cross-Shaped'],
    ['h_shape', 'H-Shaped'],
    ['l_shape', 'L-Shaped'],
    ['u_shape', 'U-Shaped'],
    ['tapered_polygon', 'Tapered Polygon'],
    ['asymmetrical_polygon', 'Asymmetrical Polygon'],
    ['multi_wing', 'Multi-Wing Complex'],
    ['curved_wings', 'Curved Wings & Recessed Core'],
    ['triangle', 'Triangular Wedge']
  ],
  transitionMode: [
    ['setback', 'Stepped Setback'],
    ['direct', 'Direct Flush Connection'],
    ['tapered', 'Tapered Transition Collar'],
    ['stepped', 'Multi-Step Collar'],
    ['outward_expansion', 'Controlled Expansion'],
    ['supported_cantilever', 'Supported Cantilever'],
    ['open_transition', 'Open Structural Atrium']
  ],
  variationStrength: [
    ['none', 'Exact Preset (None)'],
    ['subtle', 'Subtle Variation'],
    ['moderate', 'Moderate Variation'],
    ['strong', 'Strong Variation']
  ],
  symmetryMode: [
    ['symmetric', 'Symmetric'],
    ['bilateral', 'Bilateral'],
    ['asymmetrical', 'Asymmetrical']
  ],
  sectionRole: [
    ['podium', 'Ground Podium'],
    ['lower_tower', 'Lower Tower'],
    ['middle_tower', 'Middle Tower'],
    ['upper_tower', 'Upper Tower'],
    ['crown', 'Crown Tier'],
    ['rooftop', 'Rooftop Structure']
  ],
  cornerTreatment: [
    ['sharp', 'Sharp Corners'],
    ['chamfered', 'Chamfered Corners'],
    ['rounded', 'Rounded Corners'],
    ['stepped_piers', 'Stepped Corner Piers'],
    ['fluted_columns', 'Fluted Vertical Ribs']
  ],
  facadeStyle: [
    ['inherit', 'Inherit Global Style'],
    ['art_deco', 'Art Deco Ribs'],
    ['curtain_wall', 'Glass Curtain Wall'],
    ['corporate_grid', 'Corporate Grid'],
    ['ribbon_modern', 'Ribbon Modern'],
    ['brutalist', 'Brutalist Concrete'],
    ['gothic', 'Neo-Gothic Buttress'],
    ['futuristic_diag', 'Futuristic Braced']
  ],
  windowPattern: [
    ['inherit', 'Inherit Global Pattern'],
    ['rectangular_grid', 'Rectangular Grid'],
    ['vertical_strips', 'Narrow Vertical Strips'],
    ['curtain_wall', 'Full-Height Curtain Wall'],
    ['horizontal_ribbon', 'Horizontal Ribbon'],
    ['recessed_bays', 'Recessed Window Bays'],
    ['alternating_widths', 'Alternating Widths'],
    ['floor_to_ceiling', 'Floor-to-Ceiling Glass'],
    ['grouped_decorative', 'Grouped Decorative'],
    ['corner_wrap', 'Corner-Wrapping Glass'],
    ['arched_monumental', 'Arched Monumental']
  ],
  exteriorBracing: [
    ['none', 'None'],
    ['left_to_right', 'Diagonal Left-to-Right'],
    ['right_to_left', 'Diagonal Right-to-Left'],
    ['x_brace', 'Cross X-Bracing'],
    ['diamond', 'Diamond Diagrid']
  ],
  materialFamily: Object.entries(MATERIAL_FAMILIES).map(([id, m]) => [id, m.label]),
  crownStyle: [
    ['flat', 'Flat Roof'],
    ['art_deco_stepped', 'Stepped Art Deco Crown'],
    ['pyramid', 'Pyramid Crown'],
    ['slanted', 'Slanted Mono-Pitch'],
    ['curved', 'Curved / Undulating'],
    ['domed', 'Domed Crown'],
    ['angular_geometric', 'Angular Geometric'],
    ['split_crown', 'Split Monumental Crown'],
    ['open_structural', 'Open Structural Crown']
  ],
  spireStyle: [
    ['none', 'None'],
    ['slender_mast', 'Slender Spire Mast'],
    ['gothic_needle', 'Gothic Needle Spire'],
    ['lattice_tower', 'Lattice Broadcast Spire'],
    ['atomic_needle', 'Retro-Futurist Spire']
  ],
  towerArrangement: [
    ['single', 'Single Tower'],
    ['twin_mirrored', 'Twin Mirrored Towers'],
    ['twin_identical', 'Twin Identical Towers'],
    ['twin_asymmetrical', 'Twin Asymmetrical Towers'],
    ['split_core_atrium', 'Split-Core Shared Atrium'],
    ['triple_complex', 'Triple Tower Complex'],
    ['quad_plaza', 'Quad Plaza Towers']
  ],
  entranceStyle: [
    ['revolving_door', 'Revolving Doors'],
    ['monumental_arch', 'Monumental Arch'],
    ['oval_canopy', 'Oval Canopy Portal'],
    ['glass_curtain_lobby', 'Glass Lobby Facade'],
    ['recessed_colonnade', 'Recessed Colonnade']
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
    { group: 'Architectural Archetypes' },
    { key: 'style', name: 'Architectural Family', type: 'select', optionsKey: 'styleList' },
    { key: 'seed', name: 'Generation Seed', type: 'number', min: 1, max: 99999999, step: 1 },
    { key: 'variationStrength', name: 'Seed Variation Strength', type: 'select' }
  ],
  structure: [
    { group: 'Tower Proportions' },
    { key: 'floorHeight', name: 'Default Floor Height', min: 3.0, max: 6.0, step: 0.1, unit: 'm' },
    { key: 'baseWidth', name: 'Reference Width', min: 10, max: 70, step: 1, unit: 'm' },
    { key: 'baseDepth', name: 'Reference Depth', min: 10, max: 70, step: 1, unit: 'm' },
    { key: 'slenderness', name: 'Slenderness Multiplier', min: 0.55, max: 1.5, step: 0.05 },
    { key: 'footprint', name: 'Global Footprint Family', type: 'select' },
    { key: 'symmetryMode', name: 'Symmetry / Asymmetry', type: 'select' },
    { group: 'Silhouette & Overhang Control' },
    { key: 'globalTaper', name: 'Overall Tapering', min: -0.25, max: 0.5, step: 0.05 },
    { key: 'steppedSetbackScale', name: 'Stepped Setback Scale', min: 0, max: 2.5, step: 0.1 },
    { key: 'maxOutwardExpansionRatio', name: 'Max Outward Expansion Ratio', min: 0, max: 0.6, step: 0.02, info: 'Limits automatic upper-section expansion relative to lower supporting width.' },
    { key: 'allowCantileveredSteps', name: 'Permit Cantilevered Steps', type: 'boolean' },
    { key: 'globalTwistDeg', name: 'Progressive Tower Twist', min: -60, max: 60, step: 2, unit: '°' },
    { key: 'cornerRadius', name: 'Corner Chamfer / Radius', min: 0.2, max: 6.0, step: 0.2, unit: 'm' },
    { key: 'structuralProtrusions', name: 'Structural Protrusions', min: 0, max: 1.5, step: 0.05 },
    { key: 'towerCount', name: 'Tower Count', min: 1, max: 4, step: 1 }
  ],
  sections: [
    { group: 'Stacked Architectural Sections' }
  ],
  facades: [
    { group: 'Window Arrangement' },
    { key: 'windowPattern', name: 'Window Pattern', type: 'select' },
    { key: 'baysPerEdge', name: 'Facade Bay Density', min: 3, max: 18, step: 1 },
    { key: 'windowWidth', name: 'Window Width', min: 0.7, max: 3.2, step: 0.05, unit: 'm' },
    { key: 'windowHeight', name: 'Window Height', min: 1.0, max: 3.8, step: 0.05, unit: 'm' },
    { key: 'windowRecess', name: 'Window Recess Depth', min: 0.05, max: 0.8, step: 0.05, unit: 'm' },
    { key: 'mullionThickness', name: 'Mullion Thickness', min: 0.06, max: 0.35, step: 0.02, unit: 'm' },
    { group: 'Structural Articulation' },
    { key: 'columnThickness', name: 'Column Thickness', min: 0.25, max: 1.8, step: 0.05, unit: 'm' },
    { key: 'columnSpacing', name: 'Column Spacing', min: 2.2, max: 8.0, step: 0.2, unit: 'm' },
    { key: 'ribDensity', name: 'Vertical Ribs & Pilasters', min: 0, max: 1.2, step: 0.05 },
    { key: 'floorBandThickness', name: 'Horizontal Floor Band', min: 0.1, max: 1.2, step: 0.05, unit: 'm' },
    { key: 'floorBandInterval', name: 'Floor Band Interval', min: 1, max: 8, step: 1 },
    { key: 'spandrelHeight', name: 'Spandrel Panel Height', min: 0.2, max: 1.6, step: 0.05, unit: 'm' },
    { key: 'concreteFraming', name: 'Concrete Framing Depth', min: 0, max: 1.2, step: 0.05 },
    { key: 'corniceSize', name: 'Decorative Cornice Size', min: 0, max: 1.4, step: 0.05, unit: 'm' },
    { key: 'exteriorBracing', name: 'Structural Exterior Braces', type: 'select' },
    { key: 'balconyRatio', name: 'Balcony Frequency', min: 0, max: 1, step: 0.05 },
    { key: 'terracePlanters', name: 'Setback Terrace Greenery', type: 'boolean' },
    { key: 'facadeRepetition', name: 'Facade Rhythm Interval', min: 1, max: 4, step: 1 }
  ],
  materials: [
    { group: 'Exterior Surfaces' },
    { key: 'primaryMaterial', name: 'Primary Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'primaryColor', name: 'Primary Color', type: 'color' },
    { key: 'secondaryMaterial', name: 'Secondary Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'secondaryColor', name: 'Secondary Color', type: 'color' },
    { key: 'framingMaterial', name: 'Structural Framing Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'framingColor', name: 'Structural Framing Color', type: 'color' },
    { key: 'colorVariation', name: 'Procedural Color Variation', min: 0, max: 0.5, step: 0.02 },
    { group: 'Glass, Mullions & Accents' },
    { key: 'glassMaterial', name: 'Window Glass Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'glassColor', name: 'Window Glass Color', type: 'color' },
    { key: 'mullionMaterial', name: 'Window Mullion Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'mullionColor', name: 'Window Mullion Color', type: 'color' },
    { key: 'trimMaterial', name: 'Decorative Trim Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'trimColor', name: 'Decorative Trim Color', type: 'color' },
    { key: 'crownMaterial', name: 'Crown Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'crownColor', name: 'Crown Color', type: 'color' },
    { key: 'podiumMaterial', name: 'Ground Podium Material', type: 'select', optionsKey: 'materialFamily' },
    { key: 'podiumColor', name: 'Ground Podium Color', type: 'color' }
  ],
  roofs: [
    { group: 'Architectural Crown' },
    { key: 'crownStyle', name: 'Crown Family', type: 'select' },
    { key: 'crownHeight', name: 'Crown Height', min: 2, max: 32, step: 0.5, unit: 'm' },
    { key: 'crownCurvature', name: 'Crown Curvature', min: 0, max: 1, step: 0.05 },
    { key: 'crownSteps', name: 'Stepped Crown Tiers', min: 1, max: 6, step: 1 },
    { group: 'Spires & Rooftop Equipment' },
    { key: 'spireStyle', name: 'Spire Style', type: 'select' },
    { key: 'spireHeight', name: 'Spire Height', min: 4, max: 65, step: 1, unit: 'm' },
    { key: 'antennaMasts', name: 'Antenna Masts', min: 0, max: 6, step: 1 },
    { key: 'commArrays', name: 'Communication Arrays', type: 'boolean' },
    { key: 'mechPenthouse', name: 'Mechanical Penthouse', type: 'boolean' },
    { key: 'waterTanks', name: 'Rooftop Water Tanks', type: 'boolean' },
    { key: 'hvacUnits', name: 'Rooftop Air Handling Units', type: 'boolean' },
    { key: 'helipad', name: 'Rooftop Helipad', type: 'boolean' },
    { key: 'crownLighting', name: 'Decorative Crown Lighting', type: 'boolean' }
  ],
  connections: [
    { group: 'Multi-Tower Arrangement' },
    { key: 'towerCount', name: 'Number of Towers', min: 1, max: 4, step: 1 },
    { key: 'towerArrangement', name: 'Tower Arrangement', type: 'select' },
    { key: 'towerSpacing', name: 'Distance Between Towers', min: 16, max: 68, step: 1, unit: 'm' },
    { key: 'secondaryTowerHeightRatio', name: 'Secondary Tower Height Ratio', min: 0.45, max: 1.25, step: 0.02 },
    { key: 'secondaryTowerScale', name: 'Secondary Tower Width Scale', min: 0.6, max: 1.2, step: 0.02 },
    { key: 'secondaryTowerOffsetZ', name: 'Secondary Tower Offset Depth', min: -20, max: 20, step: 1, unit: 'm' },
    { key: 'secondaryTowerRotationDeg', name: 'Secondary Tower Rotation', min: -180, max: 180, step: 15, unit: '°' },
    { key: 'connectedPodium', name: 'Shared Connected Podium', type: 'boolean' },
    { group: 'Skybridges & Structural Trusses' },
    { key: 'bridgeCount', name: 'Number of Skybridges', min: 0, max: 6, step: 1 },
    { key: 'bridgeStartFloor', name: 'Lowest Skybridge Floor', min: 4, max: 50, step: 1 },
    { key: 'bridgeFloorSpacing', name: 'Vertical Floor Spacing', min: 4, max: 20, step: 1 },
    { key: 'bridgeWidth', name: 'Skybridge Width', min: 3.0, max: 12.0, step: 0.5, unit: 'm' },
    { key: 'bridgeHeight', name: 'Skybridge Height', min: 3.0, max: 9.0, step: 0.2, unit: 'm' },
    { key: 'bridgeEnclosed', name: 'Enclosed Bridge Deck', type: 'boolean' },
    { key: 'bridgeGlass', name: 'Glass Skybridge Enclosure', type: 'boolean' },
    { key: 'bridgeTrusses', name: 'Structural Bridge Trusses', type: 'boolean' },
    { key: 'interTowerTrussFrame', name: 'Inter-Tower Open X-Brace Truss', type: 'boolean' }
  ],
  ground: [
    { group: 'Main Street Entrances' },
    { key: 'entranceStyle', name: 'Entrance Architecture', type: 'select' },
    { key: 'entranceCanopy', name: 'Entrance Canopy', type: 'boolean' },
    { key: 'monumentalStairs', name: 'Monumental Staircase', type: 'boolean' },
    { key: 'raisedPodium', name: 'Raised Ground Podium', type: 'boolean' },
    { key: 'podiumElevation', name: 'Podium Terrace Height', min: 0.4, max: 3.0, step: 0.2, unit: 'm' },
    { key: 'exteriorColumns', name: 'Ground Colonnade Columns', type: 'boolean' },
    { key: 'retailStorefronts', name: 'Retail Storefronts', type: 'boolean' },
    { key: 'signEnabled', name: 'Building Signage', type: 'boolean' },
    { key: 'signText', name: 'Building Nameplate', type: 'text' },
    { group: 'Plaza & Service Access' },
    { key: 'plazaEnabled', name: 'Ground Plaza Deck', type: 'boolean' },
    { key: 'plazaWidth', name: 'Plaza Width', min: 32, max: 110, step: 2, unit: 'm' },
    { key: 'plazaDepth', name: 'Plaza Depth', min: 28, max: 95, step: 2, unit: 'm' },
    { key: 'plazaStepsAndRamps', name: 'Plaza Steps & Ramps', type: 'boolean' },
    { key: 'plantersCount', name: 'Decorative Planters', min: 0, max: 16, step: 2 },
    { key: 'loadingBay', name: 'Service Loading Bay', type: 'boolean' },
    { key: 'parkingEntrance', name: 'Parking Garage Ramp', type: 'boolean' },
    { key: 'exteriorGroundLights', name: 'Exterior Plaza Lighting', type: 'boolean' },
    { group: 'Game Integration Metadata' },
    { key: 'entranceEnabled', name: 'Interactive Main Entrance', type: 'boolean' },
    { key: 'interactionLabel', name: 'Interaction Prompt', type: 'text' },
    { key: 'interactionDistance', name: 'Interaction Radius', min: 1.5, max: 8.0, step: 0.25, unit: 'm' }
  ],
  lighting: [
    { group: 'Environment Preview' },
    { key: 'lightingTime', name: 'Time of Day', type: 'select' },
    { group: 'Procedural Window Illumination' },
    { key: 'litWindowRatio', name: 'Illuminated Windows', min: 0, max: 1, step: 0.05 },
    { key: 'warmCoolBalance', name: 'Warm / Cool Distribution', min: 0, max: 1, step: 0.05, info: '0 = cool corporate fluorescents, 1 = warm residential tungsten.' },
    { key: 'occupiedFloorGrouping', name: 'Occupied Floor Grouping', min: 0, max: 1, step: 0.05 },
    { key: 'darkFloorChance', name: 'Unoccupied / Dark Floors', min: 0, max: 0.6, step: 0.05 },
    { key: 'lightingSeed', name: 'Window Lighting Seed', min: 1, max: 99999, step: 1 }
  ],
  export: [
    { group: 'Blueprint & Model Export' }
  ]
};

export const CATEGORIES = {
  structure: SCHEMA.structure.filter((x) => x.key).map((x) => x.key),
  facades: SCHEMA.facades.filter((x) => x.key).map((x) => x.key),
  materials: SCHEMA.materials.filter((x) => x.key).map((x) => x.key),
  roofs: SCHEMA.roofs.filter((x) => x.key).map((x) => x.key),
  connections: SCHEMA.connections.filter((x) => x.key && x.key !== 'towerCount').map((x) => x.key),
  ground: SCHEMA.ground.filter((x) => x.key && !['signText', 'interactionLabel'].includes(x.key)).map((x) => x.key),
  lighting: SCHEMA.lighting.filter((x) => x.key && x.key !== 'lightingTime').map((x) => x.key)
};

export function getStyle(styleId) {
  return STYLES.find((x) => x.id === styleId) || STYLES[0];
}

export function baseForStyle(styleId) {
  const descriptor = getStyle(styleId);
  const preset = PRESETS[descriptor.preset] || PRESETS.art_deco_monumental;
  return sanitiseConfig({ ...copy(BASE), ...copy(preset) });
}

export function sanitiseSection(rawSec, index = 0) {
  const src = rawSec && typeof rawSec === 'object' ? rawSec : {};
  const role = OPTIONS.sectionRole.some(([id]) => id === src.role) ? src.role : 'middle_tower';
  const footprint = OPTIONS.footprint.some(([id]) => id === src.footprint) ? src.footprint : 'rectangle';
  const cornerTreatment = OPTIONS.cornerTreatment.some(([id]) => id === src.cornerTreatment) ? src.cornerTreatment : 'sharp';
  const facadeStyle = OPTIONS.facadeStyle.some(([id]) => id === src.facadeStyle) ? src.facadeStyle : 'inherit';
  const windowPattern = OPTIONS.windowPattern.some(([id]) => id === src.windowPattern) ? src.windowPattern : 'inherit';
  const diagonalBrace = OPTIONS.exteriorBracing.some(([id]) => id === src.diagonalBrace) ? src.diagonalBrace : 'none';
  const transitionMode = OPTIONS.transitionMode.some(([id]) => id === src.transitionMode) ? src.transitionMode : 'setback';
  const materialRole = ['primary', 'secondary', 'podium', 'crown', 'glass'].includes(src.materialRole) ? src.materialRole : 'primary';

  return {
    id: typeof src.id === 'string' && src.id.trim() ? src.id.trim() : `sec_${index}_${role}`,
    role,
    label: typeof src.label === 'string' && src.label.trim() ? src.label.trim().slice(0, 40) : (SECTION_ROLE_LABELS[role] || 'Tower Section'),
    floors: clamp(Math.round(Number(src.floors) || 10), 1, 60),
    floorHeight: clamp(Number(src.floorHeight) || 3.8, 2.8, 6.5),
    width: clamp(Number(src.width) || 22, 8, 80),
    depth: clamp(Number(src.depth) || 20, 8, 80),
    offsetX: clamp(Number(src.offsetX) || 0, -24, 24),
    offsetZ: clamp(Number(src.offsetZ) || 0, -24, 24),
    rotationDeg: clamp(Number(src.rotationDeg) || 0, -180, 180),
    twistDeg: clamp(Number(src.twistDeg) || 0, -60, 60),
    taperX: clamp(Number(src.taperX) || 1.0, 0.45, 1.35),
    taperZ: clamp(Number(src.taperZ) || 1.0, 0.45, 1.35),
    flareBase: clamp(Number(src.flareBase) || 0, 0, 0.55),
    footprint,
    cornerTreatment,
    cornerSize: clamp(Number(src.cornerSize) || 2.0, 0.2, 6.5),
    setback: clamp(Number(src.setback) || 0, 0, 10),
    overhang: clamp(Number(src.overhang) || 0, 0, 6),
    transitionMode,
    facadeStyle,
    windowPattern,
    materialRole,
    colorVariation: clamp(Number(src.colorVariation) || 0.12, 0, 0.5),
    slantedTopDeg: clamp(Number(src.slantedTopDeg) || 0, -45, 45),
    diagonalBrace,
    fanMotif: Boolean(src.fanMotif),
    recessedCoreStrip: Boolean(src.recessedCoreStrip),
    locked: Boolean(src.locked)
  };
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
        merged[key] = String(merged[key] ?? fallback).slice(0, 48);
      } else {
        const num = Number(merged[key]);
        merged[key] = Number.isFinite(num)
          ? clamp(num, def.min ?? -Infinity, def.max ?? Infinity)
          : fallback;
      }
    }
  }

  merged.seed = clamp(Math.floor(Number(merged.seed) || 2026), 1, 99999999);
  merged.lightingSeed = clamp(Math.floor(Number(merged.lightingSeed) || 404), 1, 99999999);

  const rawSections = Array.isArray(data.sections) && data.sections.length > 0
    ? data.sections
    : (Array.isArray(presetRaw.sections) && presetRaw.sections.length > 0 ? presetRaw.sections : DEFAULT_SECTIONS);
  merged.sections = rawSections.slice(0, 12).map((s, idx) => sanitiseSection(s, idx));

  delete merged.label;
  return merged;
}

export function applyPresetWithLocks(currentState, targetPresetData, locks = new Set()) {
  const cleanTarget = sanitiseConfig(targetPresetData);
  const next = copy(cleanTarget);

  for (const key of locks) {
    if (key in currentState && key !== 'sections') {
      next[key] = copy(currentState[key]);
    }
  }

  if (Array.isArray(currentState.sections)) {
    const lockedMap = new Map();
    currentState.sections.forEach((sec, idx) => {
      if (sec && sec.locked) lockedMap.set(idx, copy(sec));
    });
    if (lockedMap.size > 0) {
      next.sections = next.sections.map((sec, idx) => (lockedMap.has(idx) ? lockedMap.get(idx) : sec));
      for (const [idx, lockedSec] of lockedMap.entries()) {
        if (idx >= next.sections.length) next.sections.push(lockedSec);
      }
    }
  }

  return sanitiseConfig(next);
}

const STYLE_VARIATION_PROFILES = {
  art_deco_monumental: {
    footprints: ['chamfered', 'octagon', 'rectangle', 'h_shape'],
    windows: ['vertical_strips', 'grouped_decorative', 'arched_monumental'],
    crowns: ['split_crown', 'art_deco_stepped', 'pyramid'],
    spires: ['none', 'slender_mast'],
    colorTints: ['#685360', '#87786a', '#4a5261', '#5c4946']
  },
  modern_corporate: {
    footprints: ['chamfered', 'rounded_rectangle', 'rectangle', 'octagon'],
    windows: ['rectangular_grid', 'curtain_wall', 'alternating_widths'],
    crowns: ['art_deco_stepped', 'flat', 'angular_geometric'],
    spires: ['none', 'slender_mast'],
    colorTints: ['#a5a09d', '#8e9ba6', '#b8b2a6', '#7d8a96']
  },
  futuristic_asymmetrical: {
    footprints: ['asymmetrical_polygon', 'tapered_polygon', 'chamfered', 'triangle'],
    windows: ['curtain_wall', 'corner_wrap', 'horizontal_ribbon'],
    crowns: ['slanted', 'angular_geometric', 'open_structural'],
    spires: ['none', 'slender_mast'],
    colorTints: ['#243447', '#1f2833', '#2d3f4a', '#353947'],
    allowSlantedTop: true
  },
  connected_twin_towers: {
    footprints: ['multi_wing', 'chamfered', 'h_shape', 'asymmetrical_polygon'],
    windows: ['curtain_wall', 'vertical_strips', 'corner_wrap'],
    crowns: ['slanted', 'angular_geometric', 'open_structural'],
    spires: ['none', 'slender_mast'],
    colorTints: ['#3b4f66', '#4a5568', '#2e485c', '#525b66'],
    allowSlantedTop: true
  },
  twin_art_deco: {
    footprints: ['h_shape', 'chamfered', 'u_shape'],
    windows: ['vertical_strips', 'grouped_decorative', 'recessed_bays'],
    crowns: ['art_deco_stepped', 'pyramid', 'split_crown'],
    spires: ['none', 'slender_mast'],
    colorTints: ['#b2aaad', '#a1968b', '#8d969e', '#b8a99e']
  },
  curved_contemporary: {
    footprints: ['curved_wings', 'rounded_rectangle', 'ellipse'],
    windows: ['horizontal_ribbon', 'curtain_wall', 'floor_to_ceiling'],
    crowns: ['curved', 'flat', 'open_structural'],
    spires: ['none'],
    colorTints: ['#48414b', '#3a4b5c', '#544a44', '#394645']
  },
  neo_gothic: {
    footprints: ['cross', 'chamfered', 'octagon'],
    windows: ['arched_monumental', 'vertical_strips', 'recessed_bays'],
    crowns: ['pyramid', 'split_crown'],
    spires: ['gothic_needle', 'slender_mast'],
    colorTints: ['#4e5059', '#5a4e4a', '#3e454d', '#625e57']
  },
  glass_curtain_wall: {
    footprints: ['rounded_rectangle', 'ellipse', 'circle', 'chamfered'],
    windows: ['curtain_wall', 'corner_wrap', 'floor_to_ceiling'],
    crowns: ['open_structural', 'slanted', 'flat'],
    spires: ['slender_mast', 'none'],
    colorTints: ['#47779c', '#3d6e78', '#526fa3', '#49828f']
  },
  brutalist_monolith: {
    footprints: ['h_shape', 'u_shape', 'rectangle'],
    windows: ['recessed_bays', 'horizontal_ribbon', 'grouped_decorative'],
    crowns: ['flat', 'open_structural'],
    spires: ['none'],
    colorTints: ['#8d8f8e', '#7c7873', '#6e757a', '#968f86']
  },
  international_style: {
    footprints: ['rectangle', 'square', 'chamfered'],
    windows: ['rectangular_grid', 'curtain_wall', 'vertical_strips'],
    crowns: ['flat', 'open_structural'],
    spires: ['none'],
    colorTints: ['#4a3d33', '#32383e', '#454840', '#54443c']
  },
  postmodern_landmark: {
    footprints: ['octagon', 'chamfered', 'circle'],
    windows: ['alternating_widths', 'grouped_decorative', 'arched_monumental'],
    crowns: ['domed', 'pyramid', 'art_deco_stepped'],
    spires: ['slender_mast', 'none'],
    colorTints: ['#a67b72', '#a89279', '#8a7a85', '#9e8474']
  },
  industrial_highrise: {
    footprints: ['l_shape', 'chamfered', 'rectangle'],
    windows: ['grouped_decorative', 'horizontal_ribbon', 'recessed_bays'],
    crowns: ['open_structural', 'flat'],
    spires: ['lattice_tower', 'slender_mast'],
    colorTints: ['#7a453b', '#694e42', '#4c5257', '#6e3f3a']
  },
  luxury_residential: {
    footprints: ['rounded_rectangle', 'chamfered', 'cross'],
    windows: ['corner_wrap', 'floor_to_ceiling', 'curtain_wall'],
    crowns: ['angular_geometric', 'flat', 'curved'],
    spires: ['none'],
    colorTints: ['#bcae98', '#a9b3ba', '#b8a99a', '#9ea8a1']
  },
  retro_futuristic: {
    footprints: ['circle', 'ellipse', 'octagon'],
    windows: ['horizontal_ribbon', 'floor_to_ceiling'],
    crowns: ['domed', 'curved'],
    spires: ['atomic_needle', 'slender_mast'],
    colorTints: ['#c9d4dc', '#b4c9c5', '#c8c4d4', '#b8cad6']
  },
  stepped_ziggurat: {
    footprints: ['chamfered', 'octagon', 'rectangle'],
    windows: ['vertical_strips', 'grouped_decorative'],
    crowns: ['art_deco_stepped', 'pyramid'],
    spires: ['slender_mast', 'none'],
    colorTints: ['#b89f82', '#9e8670', '#a39886', '#8a725e']
  },
  mid_century_slab: {
    footprints: ['rectangle', 'chamfered'],
    windows: ['horizontal_ribbon', 'rectangular_grid'],
    crowns: ['flat', 'open_structural'],
    spires: ['none'],
    colorTints: ['#98a1a8', '#8a9e9b', '#a8a296', '#7e8b94']
  },
  hightech_exoskeleton: {
    footprints: ['octagon', 'chamfered', 'rectangle'],
    windows: ['curtain_wall', 'floor_to_ceiling'],
    crowns: ['open_structural', 'angular_geometric'],
    spires: ['lattice_tower', 'slender_mast'],
    colorTints: ['#414c57', '#35454a', '#4a4e5c', '#2e3a42']
  },
  triangular_wedge: {
    footprints: ['triangle'],
    windows: ['curtain_wall', 'corner_wrap', 'horizontal_ribbon'],
    crowns: ['slanted', 'angular_geometric'],
    spires: ['slender_mast', 'none'],
    colorTints: ['#3f7394', '#385c75', '#4c6782', '#3a7a78'],
    allowSlantedTop: true
  },
  terraced_garden: {
    footprints: ['rounded_rectangle', 'chamfered', 'octagon'],
    windows: ['floor_to_ceiling', 'corner_wrap'],
    crowns: ['flat', 'open_structural'],
    spires: ['none'],
    colorTints: ['#b7ab94', '#9aa68f', '#b5a28c', '#8ea198']
  },
  split_core_atrium: {
    footprints: ['chamfered', 'rectangle', 'multi_wing'],
    windows: ['curtain_wall', 'vertical_strips', 'rectangular_grid'],
    crowns: ['open_structural', 'flat', 'angular_geometric'],
    spires: ['none', 'slender_mast'],
    colorTints: ['#8d9aa6', '#6c8091', '#9aa19c', '#5e6d7a']
  },
  broadcast_comm_tower: {
    footprints: ['octagon', 'circle', 'chamfered'],
    windows: ['vertical_strips', 'grouped_decorative'],
    crowns: ['open_structural', 'angular_geometric'],
    spires: ['lattice_tower', 'atomic_needle'],
    colorTints: ['#8d949a', '#707d87', '#968f87', '#5a6875']
  },
  cantilevered_landmark: {
    footprints: ['rectangle', 'chamfered', 'l_shape'],
    windows: ['curtain_wall', 'horizontal_ribbon'],
    crowns: ['angular_geometric', 'slanted', 'flat'],
    spires: ['none'],
    colorTints: ['#37414a', '#4a403a', '#2e3e4a', '#484a54']
  }
};

function hashStreamSeed(seed, styleId, streamName) {
  let h = (Number(seed) || 1) >>> 0;
  const tag = `${styleId}:${streamName}`;
  for (let i = 0; i < tag.length; i++) {
    h = Math.imul(h ^ tag.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h || 1337;
}

export function applySeedVariation(currentState, seed, strength = null, locks = new Set()) {
  const cleanSeed = clamp(Math.floor(Number(seed) || 2026), 1, 99999999);
  const styleId = STYLES.some((x) => x.id === currentState?.style) ? currentState.style : BASE.style;
  const presetRaw = PRESETS[getStyle(styleId).preset] || PRESETS.art_deco_monumental;
  const effStrength = OPTIONS.variationStrength.some(([id]) => id === strength)
    ? strength
    : (currentState?.variationStrength || 'moderate');

  // Anchor to the style's canonical preset while retaining locked globals and locked sections
  const next = applyPresetWithLocks(currentState || {}, { ...copy(BASE), ...copy(presetRaw) }, locks);
  next.seed = cleanSeed;
  next.variationStrength = effStrength;
  next.lightingSeed = (cleanSeed * 7 + 404) % 99991 + 1;

  if (effStrength === 'none' || cleanSeed === presetRaw.seed) {
    return sanitiseConfig(next);
  }

  const amp = effStrength === 'subtle' ? 0.35 : effStrength === 'strong' ? 1.0 : 0.7;
  const profile = STYLE_VARIATION_PROFILES[styleId] || STYLE_VARIATION_PROFILES.art_deco_monumental;

  const rStruct = rng32(hashStreamSeed(cleanSeed, styleId, 'structure'));
  const rSections = rng32(hashStreamSeed(cleanSeed, styleId, 'sections'));
  const rFacades = rng32(hashStreamSeed(cleanSeed, styleId, 'facades'));
  const rMat = rng32(hashStreamSeed(cleanSeed, styleId, 'materials'));
  const rCrowns = rng32(hashStreamSeed(cleanSeed, styleId, 'crowns'));
  const rDecor = rng32(hashStreamSeed(cleanSeed, styleId, 'decoration'));

  // 1. Structure & Proportions
  if (!locks.has('slenderness')) {
    next.slenderness = roundNum(clamp(next.slenderness + (rStruct() * 2 - 1) * 0.16 * amp, 0.72, 1.32), 2);
  }
  if (!locks.has('steppedSetbackScale')) {
    next.steppedSetbackScale = roundNum(clamp(next.steppedSetbackScale + (rStruct() * 2 - 1) * 0.45 * amp, 0.5, 1.8), 2);
  }
  if (!locks.has('globalTaper') && rStruct() < 0.45 * amp) {
    next.globalTaper = roundNum(clamp(next.globalTaper + (rStruct() - 0.3) * 0.14 * amp, 0, 0.25), 2);
  }

  // 2. Stacked Section Variations (respecting section.locked)
  const chosenTowerFp = pick(rSections, profile.footprints);
  const scaleFactor = 1 + (rSections() * 2 - 1) * 0.14 * amp;

  const lockFloors = locks.has('floors') || locks.has('sections');
  const lockWidth = locks.has('baseWidth') || locks.has('towerWidth') || locks.has('sections');
  const lockDepth = locks.has('baseDepth') || locks.has('towerDepth') || locks.has('sections');

  if (Array.isArray(next.sections)) {
    const count = next.sections.length;
    next.sections = next.sections.map((sec, idx) => {
      if (sec.locked) return sec;
      const copySec = { ...sec };
      const floorJitter = 1 + (rSections() * 2 - 1) * 0.28 * amp;
      if (!lockFloors) {
        copySec.floors = clamp(Math.round(copySec.floors * floorJitter), idx === 0 && sec.role === 'podium' ? 2 : 4, 48);
      }

      const widthJitter = scaleFactor * (1 + (rSections() * 2 - 1) * 0.08 * amp);
      const depthJitter = scaleFactor * (1 + (rSections() * 2 - 1) * 0.08 * amp);
      if (!lockWidth) {
        copySec.width = roundNum(clamp(copySec.width * widthJitter, 10, 60), 1);
      }
      if (!lockDepth) {
        copySec.depth = roundNum(clamp(copySec.depth * depthJitter, 10, 60), 1);
      }

      if (idx > 0 && rSections() < 0.65 * amp) {
        copySec.setback = roundNum(clamp((copySec.setback || 1.2) * (0.7 + rSections() * 0.8), 0.5, 4.5), 2);
      }

      if (idx > 0 && idx < count - 1 && profile.footprints.length > 1 && rSections() < 0.55 * amp) {
        copySec.footprint = chosenTowerFp;
      } else if (idx === count - 1 && profile.footprints.length > 1 && rSections() < 0.6 * amp) {
        copySec.footprint = pick(rSections, profile.footprints);
      }

      if (idx === count - 1 && profile.allowSlantedTop && copySec.slantedTopDeg) {
        const sign = copySec.slantedTopDeg >= 0 ? 1 : -1;
        copySec.slantedTopDeg = roundNum(sign * clamp(Math.abs(copySec.slantedTopDeg) + (rSections() * 2 - 1) * 8 * amp, 14, 38), 0);
      }

      return sanitiseSection(copySec, idx);
    });

    // Enforce progressive non-expanding lower podium -> upper tower bounds unless explicitly cantilevered
    for (let i = 1; i < next.sections.length; i++) {
      const prev = next.sections[i - 1];
      const cur = next.sections[i];
      if (cur.locked) continue;
      if (cur.transitionMode !== 'supported_cantilever' && (cur.overhang || 0) <= 0.2) {
        if (!lockWidth) {
          cur.width = Math.min(cur.width, roundNum(Math.max(10, prev.width - (cur.setback > 0 ? 1.0 : 0)), 1));
        }
        if (!lockDepth) {
          cur.depth = Math.min(cur.depth, roundNum(Math.max(10, prev.depth - (cur.setback > 0 ? 1.0 : 0)), 1));
        }
      }
    }
  }

  // 3. Facades & Window Patterns
  if (!locks.has('windowPattern') && rFacades() < 0.5 * amp && profile.windows.length > 1) {
    next.windowPattern = pick(rFacades, profile.windows);
  }
  if (!locks.has('baysPerEdge')) {
    next.baysPerEdge = clamp(Math.round(next.baysPerEdge + (rFacades() * 2 - 1) * 2.5 * amp), 4, 15);
  }
  if (!locks.has('ribDensity')) {
    next.ribDensity = roundNum(clamp(next.ribDensity + (rFacades() * 2 - 1) * 0.22 * amp, 0.2, 1.1), 2);
  }
  if (!locks.has('floorBandInterval') && rFacades() < 0.5 * amp) {
    next.floorBandInterval = clamp(Math.round(next.floorBandInterval + (rFacades() * 2 - 1) * 2 * amp), 1, 6);
  }
  if (!locks.has('balconyRatio') && next.balconyRatio > 0.05) {
    next.balconyRatio = roundNum(clamp(next.balconyRatio + (rFacades() * 2 - 1) * 0.25 * amp, 0.2, 0.8), 2);
  }

  // 4. Crowns & Rooftops
  if (!locks.has('crownStyle') && profile.crowns.length > 1 && rCrowns() < 0.5 * amp) {
    next.crownStyle = pick(rCrowns, profile.crowns);
  }
  if (!locks.has('crownHeight')) {
    next.crownHeight = roundNum(clamp(next.crownHeight * (1 + (rCrowns() * 2 - 1) * 0.3 * amp), 3, 28), 1);
  }
  if (!locks.has('crownSteps')) {
    next.crownSteps = clamp(Math.round(next.crownSteps + (rCrowns() * 2 - 1) * 1.5 * amp), 2, 5);
  }
  if (!locks.has('spireStyle') && profile.spires.length > 1 && rCrowns() < 0.55 * amp) {
    next.spireStyle = pick(rCrowns, profile.spires);
  }
  if (!locks.has('spireHeight') && next.spireStyle !== 'none') {
    next.spireHeight = roundNum(clamp(next.spireHeight * (1 + (rCrowns() * 2 - 1) * 0.28 * amp), 12, 55), 0);
  }
  if (!locks.has('antennaMasts') && next.spireStyle !== 'none') {
    next.antennaMasts = clamp(Math.round(rDecor() * 4 * amp), 0, 5);
  }

  // 5. Multi-tower & Decoration Variations
  if (next.towerCount > 1) {
    if (!locks.has('towerSpacing')) {
      next.towerSpacing = roundNum(clamp(next.towerSpacing + (rDecor() * 2 - 1) * 6 * amp, 22, 54), 1);
    }
    if (!locks.has('bridgeCount') && next.bridgeCount > 0) {
      next.bridgeCount = clamp(Math.round(next.bridgeCount + (rDecor() - 0.35) * 2 * amp), 1, 4);
    }
    if (!locks.has('bridgeStartFloor') && next.bridgeCount > 0) {
      next.bridgeStartFloor = clamp(Math.round(next.bridgeStartFloor + (rDecor() * 2 - 1) * 6 * amp), 8, 32);
    }
  }
  if (!locks.has('plantersCount') && next.plantersCount > 0) {
    next.plantersCount = clamp(Math.round(next.plantersCount + (rDecor() * 2 - 1) * 4 * amp), 2, 16);
  }

  // 6. Cohesive Palette Tint Shifting (preserves architectural realism)
  const targetTint = pick(rMat, profile.colorTints);
  const shift = (0.14 + rMat() * 0.32) * amp;
  if (!locks.has('primaryColor')) {
    next.primaryColor = mixHex(next.primaryColor, targetTint, shift);
  }
  if (!locks.has('secondaryColor')) {
    next.secondaryColor = mixHex(next.secondaryColor, rMat() > 0.5 ? darkenHex(targetTint, 0.18) : lightenHex(targetTint, 0.14), shift);
  }
  if (!locks.has('trimColor')) {
    next.trimColor = mixHex(next.trimColor, lightenHex(targetTint, 0.22), shift * 0.85);
  }
  if (!locks.has('crownColor')) {
    next.crownColor = mixHex(next.crownColor, next.primaryColor, 0.45);
  }
  if (!locks.has('glassColor')) {
    const glassTints = ['#1b2c40', '#254a63', '#2d5c66', '#1e323d', '#344c6b'];
    next.glassColor = mixHex(next.glassColor, pick(rMat, glassTints), shift * 0.75);
  }

  return sanitiseConfig(next);
}
