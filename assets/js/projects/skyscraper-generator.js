/* B Remastered - 3D Skyscraper Generator */
(function () {
  'use strict';


/* --- utils.js --- */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const degToRad = (deg) => (Number(deg) || 0) * (Math.PI / 180);

const copy = (value) => JSON.parse(JSON.stringify(value));

const rng32 = (seed) => {
  let a = (seed >>> 0) || 1337;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randBetween = (r, a, b) => a + (b - a) * r();
const randInt = (r, a, b) => Math.floor(randBetween(r, a, b + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const colorHex = (value, fallback = '#777777') => (/^#[a-f\d]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : fallback);

const hexToRgb = (hex) => {
  const clean = colorHex(hex).slice(1);
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const rgbToHex = (r, g, b) => {
  const toByte = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return '#' + toByte(r) + toByte(g) + toByte(b);
};

const mixHex = (hexA, hexB, t = 0.5) => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const k = clamp(t, 0, 1);
  return rgbToHex(lerp(a.r, b.r, k), lerp(a.g, b.g, k), lerp(a.b, b.b, k));
};

const darkenHex = (hex, amount = 0.2) => mixHex(hex, '#090c10', amount);
const lightenHex = (hex, amount = 0.2) => mixHex(hex, '#f4f8fb', amount);

const roundNum = (val, decimals = 4) => {
  const f = Math.pow(10, decimals);
  return Math.round((Number(val) || 0) * f) / f;
};

function hashBlueprintString(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0')) + ((h2 >>> 0).toString(16).padStart(8, '0'));
}

function polygonAreaSigned(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.z - b.x * a.z;
  }
  return area * 0.5;
}

function ensureCCW(pts) {
  if (pts.length < 3) return pts;
  return polygonAreaSigned(pts) < 0 ? [...pts].reverse() : pts;
}


/* --- config.js --- */
const STORAGE_KEY = 'b-remastered-skyscraper-presets-v1';
const BLUEPRINT_SCHEMA_VERSION = 'b.skyscraper.v1';
const B_UNITS_PER_METER = 16.404199475065617;

const GENERATOR_META = {
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

const MATERIAL_FAMILIES = {
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

const STYLES = [
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

const SECTION_ROLE_LABELS = {
  podium: 'Ground Podium',
  lower_tower: 'Lower Tower',
  middle_tower: 'Middle Tower',
  upper_tower: 'Upper Tower',
  crown: 'Crown Tier',
  rooftop: 'Rooftop Structure'
};

function createSectionTemplate(overrides = {}) {
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

const DEFAULT_SECTIONS = [
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

const BASE = {
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

const PRESETS = PRESET_DEFINITIONS;

const OPTIONS = {
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

const SCHEMA = {
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

const CATEGORIES = {
  structure: SCHEMA.structure.filter((x) => x.key).map((x) => x.key),
  facades: SCHEMA.facades.filter((x) => x.key).map((x) => x.key),
  materials: SCHEMA.materials.filter((x) => x.key).map((x) => x.key),
  roofs: SCHEMA.roofs.filter((x) => x.key).map((x) => x.key),
  connections: SCHEMA.connections.filter((x) => x.key && x.key !== 'towerCount').map((x) => x.key),
  ground: SCHEMA.ground.filter((x) => x.key && !['signText', 'interactionLabel'].includes(x.key)).map((x) => x.key),
  lighting: SCHEMA.lighting.filter((x) => x.key && x.key !== 'lightingTime').map((x) => x.key)
};

function getStyle(styleId) {
  return STYLES.find((x) => x.id === styleId) || STYLES[0];
}

function baseForStyle(styleId) {
  const descriptor = getStyle(styleId);
  const preset = PRESETS[descriptor.preset] || PRESETS.art_deco_monumental;
  return sanitiseConfig({ ...copy(BASE), ...copy(preset) });
}

function sanitiseSection(rawSec, index = 0) {
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

function sanitiseConfig(data) {
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

function applyPresetWithLocks(currentState, targetPresetData, locks = new Set()) {
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

function applySeedVariation(currentState, seed, strength = null, locks = new Set()) {
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


/* --- core/footprints.js --- */
function ensureTopDownCCW(pts) {
  if (!Array.isArray(pts) || pts.length < 3) return pts;
  const cleaned = [];
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const prev = cleaned[cleaned.length - 1];
    if (!prev || Math.hypot(cur.x - prev.x, cur.z - prev.z) > 0.02) {
      cleaned.push({ ...cur });
    }
  }
  if (cleaned.length > 2) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if (Math.hypot(first.x - last.x, first.z - last.z) <= 0.02) cleaned.pop();
  }
  if (cleaned.length < 3) return [];
  // Looking down from +Y onto XZ (+X right, +Z front/down), top-down CCW has negative signed area in (x, z)
  return polygonAreaSigned(cleaned) > 0 ? cleaned.reverse() : cleaned;
}

function segmentsIntersect(a, b, c, d) {
  const ccw = (p1, p2, p3) => (p3.z - p1.z) * (p2.x - p1.x) > (p2.z - p1.z) * (p3.x - p1.x);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

function isPolygonSimple(pts) {
  const n = pts.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = pts[j];
      const d = pts[(j + 1) % n];
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return Math.abs(polygonAreaSigned(pts)) > 1.0;
}

function makeRoundedRectPts(hw, hd, radius, segsPerCorner = 4) {
  const r = clamp(radius, 0.2, Math.min(hw, hd) * 0.48);
  const corners = [
    { cx: -hw + r, cz: hd - r, start: Math.PI * 0.5, end: Math.PI },
    { cx: -hw + r, cz: -hd + r, start: Math.PI, end: Math.PI * 1.5 },
    { cx: hw - r, cz: -hd + r, start: Math.PI * 1.5, end: Math.PI * 2 },
    { cx: hw - r, cz: hd - r, start: 0, end: Math.PI * 0.5 }
  ];
  // Build in front-left -> front-right -> back-right -> back-left order:
  // Note: in (x, z) where +Z is front, angles: 0=(+r,0), PI/2=(0,+r), PI=(-r,0), 3PI/2=(0,-r)
  const ordered = [
    { cx: -hw + r, cz: hd - r, a0: Math.PI, a1: Math.PI * 0.5, isCurved: true },      // front-left
    { cx: hw - r, cz: hd - r, a0: Math.PI * 0.5, a1: 0, isCurved: true },             // front-right
    { cx: hw - r, cz: -hd + r, a0: 0, a1: -Math.PI * 0.5, isCurved: true },           // back-right
    { cx: -hw + r, cz: -hd + r, a0: -Math.PI * 0.5, a1: -Math.PI, isCurved: true }    // back-left
  ];
  const pts = [];
  for (const c of ordered) {
    for (let i = 0; i <= segsPerCorner; i++) {
      const a = c.a0 + (c.a1 - c.a0) * (i / segsPerCorner);
      pts.push({
        x: c.cx + Math.cos(a) * r,
        z: c.cz + Math.sin(a) * r,
        curved: i < segsPerCorner
      });
    }
  }
  return pts;
}

function makeCurvedWingsPts(hw, hd, cornerSize) {
  // Two convex curved wing lobes flanking a recessed central core strip on +Z and -Z
  const wingW = hw * 0.68;
  const coreHalf = hw * 0.24;
  const recess = Math.min(hd * 0.24, Math.max(1.2, cornerSize * 0.65));
  const arcBulge = Math.min(hd * 0.16, 2.2);
  const pts = [];

  // Left-front convex curve: x from -hw to -coreHalf
  const steps = 4;
  pts.push({ x: -hw, z: hd * 0.55, curved: true, role: 'wing_side' });
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -hw + (hw - coreHalf) * t;
    const z = hd - recess * 0.2 + Math.sin(t * Math.PI) * arcBulge;
    pts.push({ x, z: Math.min(hd, z), curved: true, role: 'wing_front' });
  }
  // Recessed center front bay
  pts.push({ x: -coreHalf, z: hd - recess, curved: false, recessedCenter: true, role: 'center_strip' });
  pts.push({ x: coreHalf, z: hd - recess, curved: false, recessedCenter: true, role: 'center_strip' });
  // Right-front convex curve
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = coreHalf + (hw - coreHalf) * t;
    const z = hd - recess * 0.2 + Math.sin(t * Math.PI) * arcBulge;
    pts.push({ x, z: Math.min(hd, z), curved: true, role: 'wing_front' });
  }
  pts.push({ x: hw, z: hd * 0.55, curved: true, role: 'wing_side' });
  pts.push({ x: hw, z: -hd * 0.55, curved: true, role: 'wing_side' });

  // Right-back convex curve
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = hw - (hw - coreHalf) * t;
    const z = -(hd - recess * 0.2 + Math.sin(t * Math.PI) * arcBulge);
    pts.push({ x, z: Math.max(-hd, z), curved: true, role: 'wing_back' });
  }
  // Recessed center back bay
  pts.push({ x: coreHalf, z: -(hd - recess), curved: false, recessedCenter: true, role: 'center_strip' });
  pts.push({ x: -coreHalf, z: -(hd - recess), curved: false, recessedCenter: true, role: 'center_strip' });
  // Left-back convex curve
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -coreHalf - (hw - coreHalf) * t;
    const z = -(hd - recess * 0.2 + Math.sin(t * Math.PI) * arcBulge);
    pts.push({ x, z: Math.max(-hd, z), curved: true, role: 'wing_back' });
  }
  pts.push({ x: -hw, z: -hd * 0.55, curved: true, role: 'wing_side' });
  return pts;
}

function generateFootprintPolygon(footprintType, width, depth, options = {}) {
  const w = clamp(Number(width) || 22, 6, 90);
  const d = clamp(Number(depth) || 20, 6, 90);
  const hw = w * 0.5;
  const hd = d * 0.5;
  const cornerSize = clamp(Number(options.cornerSize) || 2.0, 0.3, Math.min(hw, hd) * 0.45);
  const cornerTreatment = options.cornerTreatment || 'sharp';
  const asymmetry = clamp(Number(options.asymmetry) || 0.25, 0.05, 0.45);

  let rawPts = [];

  switch (footprintType) {
    case 'square': {
      const s = Math.min(hw, hd);
      rawPts = [
        { x: -s, z: s },
        { x: s, z: s },
        { x: s, z: -s },
        { x: -s, z: -s }
      ];
      break;
    }
    case 'rounded_rectangle': {
      rawPts = makeRoundedRectPts(hw, hd, cornerSize, 4);
      break;
    }
    case 'octagon': {
      const cx = hw * 0.42;
      const cz = hd * 0.42;
      rawPts = [
        { x: -hw + cx, z: hd },
        { x: hw - cx, z: hd },
        { x: hw, z: hd - cz },
        { x: hw, z: -hd + cz },
        { x: hw - cx, z: -hd },
        { x: -hw + cx, z: -hd },
        { x: -hw, z: -hd + cz },
        { x: -hw, z: hd - cz }
      ];
      break;
    }
    case 'circle': {
      const r = Math.min(hw, hd);
      const sides = 20;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        rawPts.push({ x: Math.cos(a) * r, z: -Math.sin(a) * r, curved: true });
      }
      break;
    }
    case 'ellipse': {
      const sides = 20;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        rawPts.push({ x: Math.cos(a) * hw, z: -Math.sin(a) * hd, curved: true });
      }
      break;
    }
    case 'chamfered': {
      const c = cornerSize;
      if (cornerTreatment === 'stepped_piers') {
        const c1 = c * 0.55;
        const c2 = c * 1.1;
        rawPts = [
          { x: -hw + c2, z: hd },
          { x: hw - c2, z: hd },
          { x: hw - c2, z: hd - c1 },
          { x: hw - c1, z: hd - c1 },
          { x: hw - c1, z: hd - c2 },
          { x: hw, z: hd - c2 },
          { x: hw, z: -hd + c2 },
          { x: hw - c1, z: -hd + c2 },
          { x: hw - c1, z: -hd + c1 },
          { x: hw - c2, z: -hd + c1 },
          { x: hw - c2, z: -hd },
          { x: -hw + c2, z: -hd },
          { x: -hw + c2, z: -hd + c1 },
          { x: -hw + c1, z: -hd + c1 },
          { x: -hw + c1, z: -hd + c2 },
          { x: -hw, z: -hd + c2 },
          { x: -hw, z: hd - c2 },
          { x: -hw + c1, z: hd - c2 },
          { x: -hw + c1, z: hd - c1 },
          { x: -hw + c2, z: hd - c1 }
        ];
      } else {
        rawPts = [
          { x: -hw + c, z: hd },
          { x: hw - c, z: hd },
          { x: hw, z: hd - c },
          { x: hw, z: -hd + c },
          { x: hw - c, z: -hd },
          { x: -hw + c, z: -hd },
          { x: -hw, z: -hd + c },
          { x: -hw, z: hd - c }
        ];
      }
      break;
    }
    case 'cross': {
      const wx = hw * 0.42;
      const wz = hd * 0.42;
      rawPts = [
        { x: -wx, z: hd },
        { x: wx, z: hd },
        { x: wx, z: wz },
        { x: hw, z: wz },
        { x: hw, z: -wz },
        { x: wx, z: -wz },
        { x: wx, z: -hd },
        { x: -wx, z: -hd },
        { x: -wx, z: -wz },
        { x: -hw, z: -wz },
        { x: -hw, z: wz },
        { x: -wx, z: wz }
      ];
      break;
    }
    case 'h_shape': {
      const barW = hw * 0.42;
      const barD = hd * 0.38;
      rawPts = [
        { x: -hw, z: hd },
        { x: -barW, z: hd },
        { x: -barW, z: barD },
        { x: barW, z: barD },
        { x: barW, z: hd },
        { x: hw, z: hd },
        { x: hw, z: -hd },
        { x: barW, z: -hd },
        { x: barW, z: -barD },
        { x: -barW, z: -barD },
        { x: -barW, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
    case 'l_shape': {
      const wingX = hw * 0.1;
      const wingZ = hd * 0.1;
      rawPts = [
        { x: -hw, z: hd },
        { x: hw, z: hd },
        { x: hw, z: wingZ },
        { x: wingX, z: wingZ },
        { x: wingX, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
    case 'u_shape': {
      const armW = hw * 0.38;
      const courtD = hd * 0.25;
      rawPts = [
        { x: -hw, z: hd },
        { x: -armW, z: hd },
        { x: -armW, z: -courtD },
        { x: armW, z: -courtD },
        { x: armW, z: hd },
        { x: hw, z: hd },
        { x: hw, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
    case 'tapered_polygon': {
      rawPts = [
        { x: -hw * 0.72, z: hd },
        { x: hw * 0.72, z: hd },
        { x: hw, z: 0 },
        { x: hw * 0.55, z: -hd },
        { x: -hw * 0.55, z: -hd },
        { x: -hw, z: 0 }
      ];
      break;
    }
    case 'asymmetrical_polygon': {
      rawPts = [
        { x: -hw, z: hd * 0.85 },
        { x: hw * (1 - asymmetry * 0.5), z: hd },
        { x: hw, z: -hd * 0.3 },
        { x: hw * 0.35, z: -hd },
        { x: -hw * 0.88, z: -hd * 0.72 }
      ];
      break;
    }
    case 'multi_wing': {
      const stepX = hw * 0.26;
      const stepZ = hd * 0.32;
      rawPts = [
        { x: -hw, z: hd * 0.75 },
        { x: stepX, z: hd * 0.75 },
        { x: stepX, z: hd },
        { x: hw, z: hd },
        { x: hw, z: -hd * 0.65 },
        { x: -stepX, z: -hd * 0.65 },
        { x: -stepX, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
    case 'curved_wings': {
      rawPts = makeCurvedWingsPts(hw, hd, cornerSize);
      break;
    }
    case 'triangle':
    case 'triangular_wedge': {
      // Three-sided architectural wedge centered near its structural centroid
      const zFront = hd * 0.56;
      const zBack = -hd * 0.98;
      if (cornerTreatment !== 'sharp') {
        const bev = clamp(cornerSize / Math.max(8, Math.min(w, d)), 0.05, 0.22);
        const pts3 = [
          { x: -hw, z: zFront },
          { x: hw, z: zFront },
          { x: 0, z: zBack }
        ];
        for (let i = 0; i < 3; i++) {
          const prev = pts3[(i + 2) % 3];
          const cur = pts3[i];
          const next = pts3[(i + 1) % 3];
          rawPts.push({
            x: cur.x + (prev.x - cur.x) * bev,
            z: cur.z + (prev.z - cur.z) * bev,
            curved: cornerTreatment === 'rounded'
          });
          rawPts.push({
            x: cur.x + (next.x - cur.x) * bev,
            z: cur.z + (next.z - cur.z) * bev,
            curved: cornerTreatment === 'rounded'
          });
        }
      } else {
        rawPts = [
          { x: -hw, z: zFront },
          { x: hw, z: zFront },
          { x: 0, z: zBack }
        ];
      }
      break;
    }
    case 'rectangle':
    default: {
      rawPts = [
        { x: -hw, z: hd },
        { x: hw, z: hd },
        { x: hw, z: -hd },
        { x: -hw, z: -hd }
      ];
      break;
    }
  }

  let vertices = ensureTopDownCCW(rawPts);
  if (!isPolygonSimple(vertices)) {
    vertices = ensureTopDownCCW([
      { x: -hw, z: hd },
      { x: hw, z: hd },
      { x: hw, z: -hd },
      { x: -hw, z: -hd }
    ]);
  }

  const edges = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    minX = Math.min(minX, p1.x);
    maxX = Math.max(maxX, p1.x);
    minZ = Math.min(minZ, p1.z);
    maxZ = Math.max(maxZ, p1.z);
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.02) continue;
    const nx = -dz / length;
    const nz = dx / length;
    const isRecessedCenter = Boolean(p1.recessedCenter && p2.recessedCenter);
    edges.push({
      index: edges.length,
      p1: { x: roundNum(p1.x, 4), z: roundNum(p1.z, 4) },
      p2: { x: roundNum(p2.x, 4), z: roundNum(p2.z, 4) },
      mid: { x: roundNum((p1.x + p2.x) * 0.5, 4), z: roundNum((p1.z + p2.z) * 0.5, 4) },
      length: roundNum(length, 4),
      tangent: { x: dx / length, z: dz / length },
      normal: { x: roundNum(nx, 4), z: roundNum(nz, 4) },
      yawRadians: Math.atan2(nx, nz),
      isCurved: Boolean(p1.curved || p2.curved),
      isRecessedCenter,
      facadeRole: isRecessedCenter ? 'center_strip' : (p1.role || 'main')
    });
  }

  const normalizedType = footprintType === 'triangular_wedge' ? 'triangle' : footprintType;
  return {
    type: normalizedType,
    width: roundNum(w, 3),
    depth: roundNum(d, 3),
    vertices: vertices.map((v) => ({ x: roundNum(v.x, 4), z: roundNum(v.z, 4), curved: Boolean(v.curved) })),
    edges,
    bounds: {
      minX: roundNum(minX, 4),
      maxX: roundNum(maxX, 4),
      minZ: roundNum(minZ, 4),
      maxZ: roundNum(maxZ, 4)
    },
    area: roundNum(Math.abs(polygonAreaSigned(vertices)), 3)
  };
}

function scaleFootprintVertices(vertices, scaleX, scaleZ) {
  return vertices.map((v) => ({
    ...v,
    x: v.x * scaleX,
    z: v.z * scaleZ
  }));
}

function transformFootprintVertices2D(vertices, sx = 1, sz = 1, rotDeg = 0, offsetX = 0, offsetZ = 0) {
  const rad = degToRad(rotDeg || 0);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return vertices.map((v) => {
    const px = v.x * sx;
    const pz = v.z * sz;
    return {
      x: px * cos + pz * sin + offsetX,
      z: -px * sin + pz * cos + offsetZ
    };
  });
}

function pointInPolygon2D(pt, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x;
    const zi = verts[i].z;
    const xj = verts[j].x;
    const zj = verts[j].z;
    const intersect = ((zi > pt.z) !== (zj > pt.z)) &&
      (pt.x < ((xj - xi) * (pt.z - zi)) / ((zj - zi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceToSegment2D(pt, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) return Math.hypot(pt.x - a.x, pt.z - a.z);
  const t = clamp(((pt.x - a.x) * dx + (pt.z - a.z) * dz) / lenSq, 0, 1);
  return Math.hypot(pt.x - (a.x + t * dx), pt.z - (a.z + t * dz));
}

function distanceOutsidePolygon2D(pt, verts) {
  if (!verts || verts.length < 3) return 0;
  if (pointInPolygon2D(pt, verts)) return 0;
  let minDist = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    minDist = Math.min(minDist, distanceToSegment2D(pt, a, b));
  }
  return minDist === Infinity ? 0 : minDist;
}

function computeConvexHull2D(verts) {
  if (!verts || verts.length <= 3) return verts ? [...verts] : [];
  const pts = verts
    .map((p) => ({ x: p.x, z: p.z }))
    .sort((a, b) => (a.x === b.x ? a.z - b.z : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function computePolygonSupportMetrics(lowerTopVerts, upperBaseVerts) {
  if (!lowerTopVerts || lowerTopVerts.length < 3 || !upperBaseVerts || upperBaseVerts.length < 3) {
    return {
      maxHullProtrusion: 0,
      maxPolyProtrusion: 0,
      unsupportedSamples: 0,
      sampleCount: 0,
      supportedRatio: 1,
      worstPoint: null
    };
  }
  const lowerHull = computeConvexHull2D(lowerTopVerts);
  const samples = [];
  for (let i = 0; i < upperBaseVerts.length; i++) {
    const a = upperBaseVerts[i];
    const b = upperBaseVerts[(i + 1) % upperBaseVerts.length];
    samples.push(a);
    const edgeLen = Math.hypot(b.x - a.x, b.z - a.z);
    if (edgeLen > 3.5) {
      samples.push({ x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5 });
    }
  }

  let maxHullProtrusion = 0;
  let maxPolyProtrusion = 0;
  let unsupportedSamples = 0;
  let worstPoint = null;

  for (const pt of samples) {
    const dHull = distanceOutsidePolygon2D(pt, lowerHull);
    const dPoly = distanceOutsidePolygon2D(pt, lowerTopVerts);
    if (dHull > maxHullProtrusion) {
      maxHullProtrusion = dHull;
      worstPoint = { x: roundNum(pt.x, 3), z: roundNum(pt.z, 3), protrusion: roundNum(dHull, 3) };
    }
    if (dPoly > maxPolyProtrusion) maxPolyProtrusion = dPoly;
    if (dPoly > 0.4) unsupportedSamples++;
  }

  return {
    maxHullProtrusion: roundNum(maxHullProtrusion, 3),
    maxPolyProtrusion: roundNum(maxPolyProtrusion, 3),
    unsupportedSamples,
    sampleCount: samples.length,
    supportedRatio: roundNum((samples.length - unsupportedSamples) / Math.max(1, samples.length), 3),
    worstPoint
  };
}

function validateSectionTransition(lowerSection, upperSection, cfg = {}) {
  if (!lowerSection) {
    return {
      ...upperSection,
      transitionDiagnostics: {
        mode: upperSection.transitionMode || 'direct',
        maxHullProtrusion: 0,
        maxPolyProtrusion: 0,
        supportedRatio: 1,
        clamped: false,
        needsCantileverSupport: false,
        warnings: []
      }
    };
  }

  const mode = upperSection.transitionMode || 'setback';
  const explicitOverhang = Number(upperSection.overhang) || 0;
  const isCantileverMode = mode === 'supported_cantilever' || mode === 'outward_expansion' || Boolean(cfg.allowCantileveredSteps);
  const cfgMaxRatio = clamp(Number(cfg.maxOutwardExpansionRatio ?? 0.12), 0, 0.6);
  const effectiveRatio = isCantileverMode ? Math.max(0.32, cfgMaxRatio) : cfgMaxRatio;

  const lowPoly = lowerSection.polygon;
  const lowTopVerts = lowPoly && lowPoly.vertices
    ? transformFootprintVertices2D(
      lowPoly.vertices,
      lowerSection.taperX || 1,
      lowerSection.taperZ || 1,
      (lowerSection.baseRotationDeg || 0) + (lowerSection.twistDeg || 0),
      lowerSection.offsetX || 0,
      lowerSection.offsetZ || 0
    )
    : null;

  let lowMinX = Infinity;
  let lowMaxX = -Infinity;
  let lowMinZ = Infinity;
  let lowMaxZ = -Infinity;
  if (lowTopVerts) {
    for (const v of lowTopVerts) {
      lowMinX = Math.min(lowMinX, v.x);
      lowMaxX = Math.max(lowMaxX, v.x);
      lowMinZ = Math.min(lowMinZ, v.z);
      lowMaxZ = Math.max(lowMaxZ, v.z);
    }
  }
  const lowTopW = lowTopVerts ? Math.max(6, lowMaxX - lowMinX) : lowerSection.width;
  const lowTopD = lowTopVerts ? Math.max(6, lowMaxZ - lowMinZ) : lowerSection.depth;
  const lowCenterX = lowTopVerts ? (lowMinX + lowMaxX) * 0.5 : (lowerSection.offsetX || 0);
  const lowCenterZ = lowTopVerts ? (lowMinZ + lowMaxZ) * 0.5 : (lowerSection.offsetZ || 0);
  const minSpan = Math.max(6, Math.min(lowTopW, lowTopD));

  const maxScalarRatio = isCantileverMode ? 1.48 : 1.4;
  let safeW = clamp(upperSection.width, 8, Math.min(lowerSection.width * 1.4, lowTopW * maxScalarRatio));
  let safeD = clamp(upperSection.depth, 8, Math.min(lowerSection.depth * 1.4, lowTopD * maxScalarRatio));

  const maxOffsetX = Math.max(2, lowTopW * (isCantileverMode ? 0.42 : 0.34));
  const maxOffsetZ = Math.max(2, lowTopD * (isCantileverMode ? 0.42 : 0.34));
  let safeOffX = clamp(upperSection.offsetX || 0, lowCenterX - maxOffsetX, lowCenterX + maxOffsetX);
  let safeOffZ = clamp(upperSection.offsetZ || 0, lowCenterZ - maxOffsetZ, lowCenterZ + maxOffsetZ);

  const allowedHullProtrusion = minSpan * effectiveRatio + (!isCantileverMode && explicitOverhang > 0.25 ? Math.min(1.6, explicitOverhang * 0.5) : 0);
  let clamped = Math.abs(safeW - upperSection.width) > 0.05 ||
    Math.abs(safeD - upperSection.depth) > 0.05 ||
    Math.abs(safeOffX - (upperSection.offsetX || 0)) > 0.05 ||
    Math.abs(safeOffZ - (upperSection.offsetZ || 0)) > 0.05;

  let metrics = { maxHullProtrusion: 0, maxPolyProtrusion: 0, unsupportedSamples: 0, sampleCount: 0, supportedRatio: 1, worstPoint: null };
  if (lowTopVerts) {
    const cornerSize = upperSection.cornerSize || cfg.cornerRadius || 2.0;
    for (let iter = 0; iter < 10; iter++) {
      const candPoly = generateFootprintPolygon(upperSection.footprint, safeW, safeD, {
        cornerSize,
        cornerTreatment: upperSection.cornerTreatment
      });
      const upBaseVerts = transformFootprintVertices2D(
        candPoly.vertices,
        1,
        1,
        upperSection.baseRotationDeg || 0,
        safeOffX,
        safeOffZ
      );
      metrics = computePolygonSupportMetrics(lowTopVerts, upBaseVerts);
      if (metrics.maxHullProtrusion <= allowedHullProtrusion + 0.08) break;

      const excess = metrics.maxHullProtrusion - allowedHullProtrusion;
      safeW = Math.max(8, safeW - Math.min(safeW - 8, excess * 1.15));
      safeD = Math.max(8, safeD - Math.min(safeD - 8, excess * 1.15));
      safeOffX = lowCenterX + (safeOffX - lowCenterX) * 0.65;
      safeOffZ = lowCenterZ + (safeOffZ - lowCenterZ) * 0.65;
      clamped = true;
    }
  }

  const warnings = [];
  if (clamped) {
    warnings.push(`Transition on "${upperSection.label || upperSection.role}" adjusted to respect structural support limits.`);
  }
  const needsCantileverSupport = (mode === 'supported_cantilever' || metrics.maxHullProtrusion > 0.65 || (metrics.maxPolyProtrusion > 1.8 && isCantileverMode));
  if (metrics.maxHullProtrusion > 0.65 && !isCantileverMode) {
    warnings.push(`Outward overhang (${metrics.maxHullProtrusion}m) receives automatic transfer support brackets.`);
  }

  return {
    ...upperSection,
    width: roundNum(safeW, 3),
    depth: roundNum(safeD, 3),
    offsetX: roundNum(safeOffX, 3),
    offsetZ: roundNum(safeOffZ, 3),
    transitionDiagnostics: {
      mode,
      maxHullProtrusion: metrics.maxHullProtrusion,
      maxPolyProtrusion: metrics.maxPolyProtrusion,
      supportedRatio: metrics.supportedRatio,
      clamped,
      needsCantileverSupport,
      warnings
    }
  };
}


/* --- core/sections.js --- */
function resolveStackedSections(cfg, towerOverrides = {}) {
  const rawList = Array.isArray(cfg.sections) && cfg.sections.length > 0 ? cfg.sections : [createSectionTemplate()];
  const heightScale = clamp(Number(towerOverrides.heightRatio) || 1.0, 0.35, 1.5);
  const widthScale = clamp((Number(cfg.slenderness) > 0 ? 1 / Math.sqrt(cfg.slenderness) : 1.0) * (Number(towerOverrides.widthScale) || 1.0), 0.5, 1.5);
  const depthScale = clamp((Number(cfg.slenderness) > 0 ? 1 / Math.sqrt(cfg.slenderness) : 1.0) * (Number(towerOverrides.depthScale) || 1.0), 0.5, 1.5);
  const setbackScale = Number.isFinite(Number(cfg.steppedSetbackScale)) ? Number(cfg.steppedSetbackScale) : 1.0;
  const globalTaper = clamp(Number(cfg.globalTaper) || 0, -0.35, 0.6);
  const globalTwist = Number(cfg.globalTwistDeg) || 0;
  const symmetryMode = cfg.symmetryMode || 'symmetric';

  const resolved = [];
  let cursorY = cfg.raisedPodium ? clamp(Number(cfg.podiumElevation) || 0, 0, 4) : 0;
  let cumulativeTwist = 0;
  let cumulativeSetback = 0;
  let prevSection = null;
  let totalFloors = 0;

  for (let i = 0; i < rawList.length; i++) {
    const clean = sanitiseSection(rawList[i], i);
    const floors = clamp(Math.round(clean.floors * (i === 0 && clean.role === 'podium' ? 1 : heightScale)), 1, 80);
    const floorHeight = clamp(clean.floorHeight || cfg.floorHeight || 3.8, 2.8, 6.5);
    const sectionHeight = roundNum(floors * floorHeight, 3);

    cumulativeSetback += (clean.setback || 0) * setbackScale;
    const effOverhang = clean.overhang || 0;
    const rawW = Math.max(8, (clean.width * widthScale) - cumulativeSetback * 0.7 + effOverhang * 2);
    const rawD = Math.max(8, (clean.depth * depthScale) - cumulativeSetback * 0.7 + effOverhang * 2);

    const asymBoostX = symmetryMode === 'asymmetrical' ? ((i % 2 === 0 ? 1.5 : -1.5)) : 0;
    const candidate = {
      ...clean,
      index: i,
      floors,
      startFloor: totalFloors,
      endFloor: totalFloors + floors,
      floorHeight: roundNum(floorHeight, 3),
      height: sectionHeight,
      baseElevation: roundNum(cursorY, 3),
      topElevation: roundNum(cursorY + sectionHeight, 3),
      width: roundNum(rawW, 3),
      depth: roundNum(rawD, 3),
      offsetX: roundNum((clean.offsetX || 0) + asymBoostX, 3),
      offsetZ: roundNum(clean.offsetZ || 0, 3),
      taperX: roundNum(clamp(clean.taperX * (1 - globalTaper * 0.35), 0.45, 1.35), 3),
      taperZ: roundNum(clamp(clean.taperZ * (1 - globalTaper * 0.35), 0.45, 1.35), 3),
      baseRotationDeg: roundNum(clean.rotationDeg + cumulativeTwist, 3),
      twistDeg: roundNum(clean.twistDeg + (globalTwist / Math.max(1, rawList.length)), 3)
    };

    const effectiveFootprint = (i > 0 || clean.role !== 'podium') && cfg.footprintOverride
      ? cfg.footprintOverride
      : candidate.footprint;
    candidate.footprint = effectiveFootprint;
    candidate.isTopSection = i === rawList.length - 1;

    const validated = validateSectionTransition(prevSection, candidate, cfg);

    const poly = generateFootprintPolygon(validated.footprint, validated.width, validated.depth, {
      cornerSize: validated.cornerSize || cfg.cornerRadius || 2.0,
      cornerTreatment: validated.cornerTreatment
    });

    validated.footprint = poly.type;
    validated.polygon = poly;
    resolved.push(validated);

    cursorY += sectionHeight;
    cumulativeTwist += validated.twistDeg;
    totalFloors += floors;
    prevSection = validated;
  }

  let verticalGapCount = 0;
  let maxHullProtrusion = 0;
  const warnings = [];
  for (let i = 0; i < resolved.length; i++) {
    const s = resolved[i];
    if (i > 0) {
      const gap = Math.abs(s.baseElevation - resolved[i - 1].topElevation);
      if (gap > 0.02) verticalGapCount++;
    }
    if (s.transitionDiagnostics) {
      maxHullProtrusion = Math.max(maxHullProtrusion, s.transitionDiagnostics.maxHullProtrusion || 0);
      for (const w of s.transitionDiagnostics.warnings || []) {
        warnings.push(w);
      }
    }
  }

  return {
    sections: resolved,
    totalFloors,
    baseElevation: resolved[0]?.baseElevation || 0,
    totalHeight: roundNum(cursorY, 3),
    diagnostics: {
      valid: verticalGapCount === 0,
      verticalGapCount,
      maxHullProtrusion: roundNum(maxHullProtrusion, 3),
      warnings
    }
  };
}

function addSectionToState(state, templateOverrides = {}) {
  const sections = Array.isArray(state.sections) ? copy(state.sections) : [];
  if (sections.length >= 12) return false;
  const last = sections[sections.length - 1];
  const nextSec = createSectionTemplate({
    role: 'upper_tower',
    label: 'Upper Tier ' + (sections.length + 1),
    floors: 10,
    floorHeight: last ? last.floorHeight : state.floorHeight,
    width: last ? Math.max(10, roundNum(last.width - 2.5, 1)) : 20,
    depth: last ? Math.max(10, roundNum(last.depth - 2.5, 1)) : 18,
    setback: 1.25,
    footprint: last ? last.footprint : state.footprint,
    cornerTreatment: last ? last.cornerTreatment : 'chamfered',
    ...templateOverrides
  });
  sections.push(nextSec);
  state.sections = sections;
  return nextSec;
}

function removeSectionFromState(state, index) {
  if (!Array.isArray(state.sections) || state.sections.length <= 1) return false;
  if (index < 0 || index >= state.sections.length) return false;
  state.sections = state.sections.filter((_, i) => i !== index);
  return true;
}

function moveSectionInState(state, index, direction) {
  if (!Array.isArray(state.sections)) return false;
  const target = index + direction;
  if (index < 0 || index >= state.sections.length || target < 0 || target >= state.sections.length) {
    return false;
  }
  const next = [...state.sections];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  state.sections = next;
  return true;
}

function duplicateSectionInState(state, index) {
  if (!Array.isArray(state.sections) || state.sections.length >= 12) return false;
  if (index < 0 || index >= state.sections.length) return false;
  const src = state.sections[index];
  const dup = createSectionTemplate({
    ...copy(src),
    id: 'sec_dup_' + Math.random().toString(36).slice(2, 8),
    label: src.label + ' Copy',
    locked: false
  });
  const next = [...state.sections];
  next.splice(index + 1, 0, dup);
  state.sections = next;
  return dup;
}

function updateSectionPropertyInState(state, index, prop, value) {
  if (!Array.isArray(state.sections) || !state.sections[index]) return false;
  const next = copy(state.sections);
  next[index] = sanitiseSection({ ...next[index], [prop]: value }, index);
  state.sections = next;
  return true;
}


/* --- core/towers.js --- */
function towerFindSectionAtY(tower, y) {
  const secs = tower.stack.sections;
  for (const s of secs) {
    if (y >= s.baseElevation - 0.01 && y <= s.topElevation + 0.01) {
      return s;
    }
  }
  return secs[secs.length - 1] || null;
}

function towerCastSingleRay(verts, ox, oz, dirX, dirZ) {
  let bestT = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const rx = dirX;
    const rz = dirZ;
    const sx = b.x - a.x;
    const sz = b.z - a.z;
    const denom = rx * sz - rz * sx;
    if (Math.abs(denom) < 1e-6) continue;
    const qpx = a.x - ox;
    const qpz = a.z - oz;
    const t = (qpx * sz - qpz * sx) / denom;
    const u = (qpx * rz - qpz * rx) / denom;
    if (t > 0 && u >= -0.001 && u <= 1.001) {
      bestT = Math.max(bestT, t);
    }
  }
  return bestT;
}

function towerRayExitDistance(section, dirX, dirZ, y, halfWidth = 0) {
  if (!section || !section.polygon || !section.polygon.vertices) return (section?.width || 20) * 0.45;
  const frac = clamp((y - section.baseElevation) / Math.max(0.1, section.height), 0, 1);
  const tr = computeSliceTransform(section, frac, section.height, 0);
  const verts = section.polygon.vertices.map((v) =>
    transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, section.offsetX || 0, section.offsetZ || 0)
  );
  const cx = section.offsetX || 0;
  const cz = section.offsetZ || 0;
  const centerHit = towerCastSingleRay(verts, cx, cz, dirX, dirZ);
  if (halfWidth <= 0.25) {
    return centerHit > 0.5 ? centerHit : Math.max(4, Math.min(section.width, section.depth) * 0.42);
  }

  // Cast parallel rays across the connection width and pick the innermost wall depth so the whole bridge embeds solidly
  const px = -dirZ;
  const pz = dirX;
  const hits = [];
  if (centerHit > 0.5) hits.push(centerHit);
  for (const side of [-0.82, 0.82]) {
    const ox = cx + px * (halfWidth * side);
    const oz = cz + pz * (halfWidth * side);
    const h = towerCastSingleRay(verts, ox, oz, dirX, dirZ);
    if (h > 0.5 && (centerHit <= 0.5 || h >= centerHit * 0.45)) {
      hits.push(h);
    }
  }
  if (hits.length === 0) return Math.max(4, Math.min(section.width, section.depth) * 0.42);
  return Math.min(...hits);
}

function towerBuildSpecs(cfg) {
  const count = clamp(Math.round(Number(cfg.towerCount) || 1), 1, 4);
  const arr = cfg.towerArrangement || 'single';
  const spacing = clamp(Number(cfg.towerSpacing) || 26, 16, 80);
  const secHR = clamp(Number(cfg.secondaryTowerHeightRatio) || 0.85, 0.4, 1.3);
  const secScale = clamp(Number(cfg.secondaryTowerScale) || 0.92, 0.55, 1.35);
  const secOffZ = clamp(Number(cfg.secondaryTowerOffsetZ) || 0, -24, 24);
  const secRot = clamp(Number(cfg.secondaryTowerRotationDeg) || 0, -180, 180);

  if (count === 1) {
    return [{ index: 0, x: 0, z: 0, rotDeg: 0, heightRatio: 1, widthScale: 1, depthScale: 1, mirrorX: false }];
  }

  if (count === 2) {
    const isAtrium = arr === 'split_core_atrium';
    let mirrored = !isAtrium && (arr === 'twin_mirrored' || arr === 'twin_asymmetrical');
    // Guard against double-negation when both 180-degree rotation and X mirroring are requested
    if (mirrored && Math.abs(secRot) >= 135) {
      mirrored = false;
    }
    const secondHR = arr === 'twin_identical' || arr === 'twin_mirrored' || isAtrium ? 1.0 : secHR;
    const secondScale = arr === 'twin_identical' || arr === 'twin_mirrored' || isAtrium ? 1.0 : secScale;
    return [
      { index: 0, x: -spacing * 0.5, z: 0, rotDeg: 0, heightRatio: 1, widthScale: 1, depthScale: 1, mirrorX: false },
      {
        index: 1,
        x: spacing * 0.5,
        z: isAtrium ? 0 : secOffZ,
        rotDeg: isAtrium ? 0 : secRot,
        heightRatio: secondHR,
        widthScale: secondScale,
        depthScale: secondScale,
        mirrorX: mirrored
      }
    ];
  }

  if (count === 3) {
    return [
      { index: 0, x: 0, z: -spacing * 0.28, rotDeg: 0, heightRatio: 1.0, widthScale: 1.0, depthScale: 1.0, mirrorX: false },
      { index: 1, x: -spacing * 0.62, z: spacing * 0.34 + secOffZ * 0.4, rotDeg: secRot, heightRatio: secHR, widthScale: secScale, depthScale: secScale, mirrorX: false },
      { index: 2, x: spacing * 0.62, z: spacing * 0.34 - secOffZ * 0.4, rotDeg: -secRot, heightRatio: lerp(1.0, secHR, 0.7), widthScale: lerp(1.0, secScale, 0.8), depthScale: lerp(1.0, secScale, 0.8), mirrorX: true }
    ];
  }

  // Quad plaza
  const half = spacing * 0.52;
  return [
    { index: 0, x: -half, z: -half * 0.85, rotDeg: 0, heightRatio: 1.0, widthScale: 1.0, depthScale: 1.0, mirrorX: false },
    { index: 1, x: half, z: -half * 0.85 + secOffZ * 0.3, rotDeg: secRot, heightRatio: secHR, widthScale: secScale, depthScale: secScale, mirrorX: true },
    { index: 2, x: -half, z: half * 0.85, rotDeg: 0, heightRatio: lerp(1.0, secHR, 0.5), widthScale: lerp(1.0, secScale, 0.6), depthScale: lerp(1.0, secScale, 0.6), mirrorX: false },
    { index: 3, x: half, z: half * 0.85 - secOffZ * 0.3, rotDeg: -secRot, heightRatio: lerp(secHR, 1.0, 0.3), widthScale: secScale, depthScale: secScale, mirrorX: true }
  ];
}

function towerComputePointWorld(tower, localX, localZ) {
  const cos = Math.cos((tower.rotDeg * Math.PI) / 180);
  const sin = Math.sin((tower.rotDeg * Math.PI) / 180);
  return {
    x: tower.x + localX * cos + localZ * sin,
    z: tower.z - localX * sin + localZ * cos
  };
}

function towerComputePairConnection(towerA, towerB, y, halfConnWidth = 2.2) {
  const secA = towerFindSectionAtY(towerA, y);
  const secB = towerFindSectionAtY(towerB, y);
  if (!secA || !secB) return null;

  const centerA = towerComputePointWorld(towerA, secA.offsetX || 0, secA.offsetZ || 0);
  const centerB = towerComputePointWorld(towerB, secB.offsetX || 0, secB.offsetZ || 0);
  const dx = centerB.x - centerA.x;
  const dz = centerB.z - centerA.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.5) return null;

  const ux = dx / dist;
  const uz = dz / dist;

  // Transform world unit direction into each tower's local XZ frame
  const radA = (-towerA.rotDeg * Math.PI) / 180;
  const lxA = ux * Math.cos(radA) + uz * Math.sin(radA);
  const lzA = -ux * Math.sin(radA) + uz * Math.cos(radA);

  const radB = (-towerB.rotDeg * Math.PI) / 180;
  const lxB = -ux * Math.cos(radB) - uz * Math.sin(radB);
  const lzB = ux * Math.sin(radB) - uz * Math.cos(radB);

  const reachA = towerRayExitDistance(secA, lxA, lzA, y, halfConnWidth);
  const reachB = towerRayExitDistance(secB, lxB, lzB, y, halfConnWidth);
  const clearGap = dist - reachA - reachB;
  if (clearGap < 1.2) return null;

  // Inset anchors into facing walls to avoid gaps
  const embed = 0.85;
  const start = {
    x: roundNum(centerA.x + ux * Math.max(0.5, reachA - embed), 3),
    z: roundNum(centerA.z + uz * Math.max(0.5, reachA - embed), 3)
  };
  const end = {
    x: roundNum(centerB.x - ux * Math.max(0.5, reachB - embed), 3),
    z: roundNum(centerB.z - uz * Math.max(0.5, reachB - embed), 3)
  };
  return {
    start,
    end,
    clearGap: roundNum(clearGap, 3),
    spanLength: roundNum(Math.hypot(end.x - start.x, end.z - start.z), 3)
  };
}

function resolveTowerComplex(cfg) {
  const specs = towerBuildSpecs(cfg);
  const towers = [];

  let complexMinX = Infinity;
  let complexMaxX = -Infinity;
  let complexMinZ = Infinity;
  let complexMaxZ = -Infinity;
  let maxTowerHeight = 0;
  let totalFloors = 0;
  let maxSingleTowerFloors = 0;

  for (const spec of specs) {
    const towerCfg = copy(cfg);
    if (spec.mirrorX && Array.isArray(towerCfg.sections)) {
      towerCfg.sections = towerCfg.sections.map((s) => ({
        ...s,
        offsetX: -(Number(s.offsetX) || 0),
        slantedTopDeg: -(Number(s.slantedTopDeg) || 0),
        rotationDeg: -(Number(s.rotationDeg) || 0),
        twistDeg: -(Number(s.twistDeg) || 0)
      }));
    }

    const stack = resolveStackedSections(towerCfg, {
      heightRatio: spec.heightRatio,
      widthScale: spec.widthScale,
      depthScale: spec.depthScale
    });

    let tMinX = Infinity;
    let tMaxX = -Infinity;
    let tMinZ = Infinity;
    let tMaxZ = -Infinity;

    for (const sec of stack.sections) {
      for (const v of sec.polygon.vertices) {
        const pt = transformVertexXZ(v, 1, 1, (sec.baseRotationDeg * Math.PI) / 180, sec.offsetX || 0, sec.offsetZ || 0);
        const worldPt = towerComputePointWorld(spec, pt.x, pt.z);
        tMinX = Math.min(tMinX, worldPt.x);
        tMaxX = Math.max(tMaxX, worldPt.x);
        tMinZ = Math.min(tMinZ, worldPt.z);
        tMaxZ = Math.max(tMaxZ, worldPt.z);
      }
    }

    complexMinX = Math.min(complexMinX, tMinX);
    complexMaxX = Math.max(complexMaxX, tMaxX);
    complexMinZ = Math.min(complexMinZ, tMinZ);
    complexMaxZ = Math.max(complexMaxZ, tMaxZ);
    maxTowerHeight = Math.max(maxTowerHeight, stack.totalHeight);
    totalFloors += stack.totalFloors;
    maxSingleTowerFloors = Math.max(maxSingleTowerFloors, stack.totalFloors);

    towers.push({
      ...spec,
      stack,
      bounds: {
        minX: roundNum(tMinX, 3),
        maxX: roundNum(tMaxX, 3),
        minZ: roundNum(tMinZ, 3),
        maxZ: roundNum(tMaxZ, 3),
        width: roundNum(tMaxX - tMinX, 3),
        depth: roundNum(tMaxZ - tMinZ, 3),
        height: stack.totalHeight
      }
    });
  }

  // Compute skybridges & inter-tower open structural trusses
  const skybridges = [];
  const trusses = [];

  if (towers.length >= 2) {
    const pairs = [];
    for (let i = 0; i < towers.length - 1; i++) {
      pairs.push([0, i + 1]);
    }
    if (towers.length === 4) {
      pairs.push([2, 3]);
    }

    const reqBridges = clamp(Math.round(Number(cfg.bridgeCount) || 0), 0, 6);
    const startFloor = clamp(Math.round(Number(cfg.bridgeStartFloor) || 12), 2, 60);
    const floorStep = clamp(Math.round(Number(cfg.bridgeFloorSpacing) || 8), 2, 24);
    const bridgeW = clamp(Number(cfg.bridgeWidth) || 5.2, 2.5, 14);
    const bridgeH = clamp(Number(cfg.bridgeHeight) || 4.2, 2.5, 10);
    const avgFloorH = clamp(Number(cfg.floorHeight) || 3.8, 2.8, 6.5);

    if (reqBridges > 0) {
      for (let b = 0; b < reqBridges; b++) {
        const [aIdx, bIdx] = pairs[b % pairs.length];
        const tierIdx = Math.floor(b / pairs.length);
        const tA = towers[aIdx];
        const tB = towers[bIdx];

        const minSharedY = Math.max(tA.stack.baseElevation, tB.stack.baseElevation) + 4.0;
        const maxSharedY = Math.min(tA.stack.totalHeight, tB.stack.totalHeight) - bridgeH - 2.0;
        if (maxSharedY <= minSharedY) continue;

        const targetFloor = startFloor + tierIdx * floorStep;
        let bridgeY = clamp(targetFloor * avgFloorH, minSharedY, maxSharedY);

        // Prevent vertically colliding bridges on the same tower pair
        const existingOnPair = skybridges.filter((sb) => sb.fromTower === aIdx && sb.toTower === bIdx);
        for (const prev of existingOnPair) {
          if (Math.abs(bridgeY - prev.elevationY) < bridgeH + 2.2) {
            bridgeY = clamp(prev.elevationY + bridgeH + floorStep * avgFloorH * 0.45, minSharedY, maxSharedY);
          }
        }
        if (existingOnPair.some((prev) => Math.abs(bridgeY - prev.elevationY) < bridgeH * 0.9)) {
          bridgeY = clamp(lerp(minSharedY, maxSharedY, 0.85), minSharedY, maxSharedY);
        }
        if (existingOnPair.some((prev) => Math.abs(bridgeY - prev.elevationY) < bridgeH * 0.9)) continue;

        const conn = towerComputePairConnection(tA, tB, bridgeY + bridgeH * 0.5, bridgeW * 0.5);
        if (!conn) continue;

        skybridges.push({
          id: `bridge_${b}`,
          fromTower: aIdx,
          toTower: bIdx,
          floor: Math.round(bridgeY / avgFloorH),
          elevationY: roundNum(bridgeY, 3),
          width: bridgeW,
          height: bridgeH,
          start: conn.start,
          end: conn.end,
          spanLength: conn.spanLength,
          clearGap: conn.clearGap,
          enclosed: cfg.bridgeEnclosed !== false,
          glass: cfg.bridgeGlass !== false,
          trusses: cfg.bridgeTrusses !== false
        });
      }
    }

    if (cfg.interTowerTrussFrame) {
      const [aIdx, bIdx] = pairs[0];
      const tA = towers[aIdx];
      const tB = towers[bIdx];
      const maxTrussTop = Math.min(tA.stack.totalHeight, tB.stack.totalHeight) * 0.72;
      const matchingBridge = skybridges.find((sb) => sb.fromTower === aIdx && sb.toTower === bIdx);
      const lowY = Math.max(tA.stack.baseElevation, tB.stack.baseElevation) + 6.0;
      const highY = matchingBridge
        ? Math.max(lowY + 12, matchingBridge.elevationY - 0.5)
        : maxTrussTop;

      if (highY > lowY + 8) {
        const trussDepth = clamp(bridgeW * 0.75, 2.5, 6.5);
        const conn = towerComputePairConnection(tA, tB, (lowY + highY) * 0.5, trussDepth * 0.5);
        if (conn && conn.clearGap >= 2.0) {
          trusses.push({
            id: 'inter_truss_main',
            fromTower: aIdx,
            toTower: bIdx,
            bottomY: roundNum(lowY, 3),
            topY: roundNum(highY, 3),
            depth: trussDepth,
            start: conn.start,
            end: conn.end,
            spanLength: conn.spanLength,
            levels: clamp(Math.round((highY - lowY) / 7.5), 2, 7)
          });
        }
      }
    }
  }

  const rawComplexW = Math.max(12, complexMaxX - complexMinX);
  const rawComplexD = Math.max(12, complexMaxZ - complexMinZ);
  const podiumPad = cfg.connectedPodium ? 6 : 3.5;
  const podiumH = cfg.raisedPodium ? clamp(Number(cfg.podiumElevation) || 1.2, 0.4, 3.2) : 0;

  const plazaW = Math.max(Number(cfg.plazaWidth) || 48, rawComplexW + 12);
  const plazaD = Math.max(Number(cfg.plazaDepth) || 42, rawComplexD + 12);

  return {
    towers,
    skybridges,
    trusses,
    totalFloors,
    maxSingleTowerFloors,
    maxTowerHeight: roundNum(maxTowerHeight, 3),
    footprintBounds: {
      minX: roundNum(complexMinX, 3),
      maxX: roundNum(complexMaxX, 3),
      minZ: roundNum(complexMinZ, 3),
      maxZ: roundNum(complexMaxZ, 3),
      width: roundNum(rawComplexW, 3),
      depth: roundNum(rawComplexD, 3),
      centerX: roundNum((complexMinX + complexMaxX) * 0.5, 3),
      centerZ: roundNum((complexMinZ + complexMaxZ) * 0.5, 3)
    },
    podium: {
      enabled: Boolean(cfg.connectedPodium && towers.length > 1) || podiumH > 0,
      connected: Boolean(cfg.connectedPodium && towers.length > 1),
      centerX: roundNum((complexMinX + complexMaxX) * 0.5, 3),
      centerZ: roundNum((complexMinZ + complexMaxZ) * 0.5, 3),
      width: roundNum(rawComplexW + podiumPad * 2, 3),
      depth: roundNum(rawComplexD + podiumPad * 2, 3),
      height: podiumH
    },
    plaza: {
      enabled: cfg.plazaEnabled !== false,
      width: roundNum(plazaW, 3),
      depth: roundNum(plazaD, 3),
      elevation: 0
    }
  };
}


/* --- core/entrances.js --- */
function entToBUnits(x, y, z) {
  return {
    x: roundNum(x * B_UNITS_PER_METER, 2),
    y: roundNum(-z * B_UNITS_PER_METER, 2),
    z: roundNum(y * B_UNITS_PER_METER, 2)
  };
}

function computeSkyscraperEntrances(cfg, complex) {
  const entrances = [];
  const labelBase = String(cfg.interactionLabel || 'Enter Building Lobby').slice(0, 48);
  const radius = Number(cfg.interactionDistance) || 3.5;
  const podiumY = complex.podium?.height || 0;

  // Primary entrance per tower along front (+Z) street face
  for (const tower of complex.towers) {
    const b = tower.bounds;
    const baseSec = tower.stack.sections[0];
    const ex = tower.x + (baseSec?.offsetX || 0);
    const ez = b.maxZ + 0.35;
    const ey = Math.max(podiumY, tower.stack.baseElevation || 0);

    const doorWidth = Math.min(8.5, Math.max(3.6, b.width * 0.24));
    const doorHeight = Math.min(5.2, Math.max(3.4, (baseSec?.floorHeight || 4.2) * 0.9));

    entrances.push({
      id: `main_lobby_${tower.index}`,
      role: tower.index === 0 ? 'primary' : 'secondary_lobby',
      towerIndex: tower.index,
      style: cfg.entranceStyle || 'revolving_door',
      side: '+Z',
      interactive: cfg.entranceEnabled !== false,
      label: tower.index === 0 ? labelBase : `${labelBase} (${tower.index + 1})`,
      interactionRadius: radius,
      doorSize: { width: roundNum(doorWidth, 2), height: roundNum(doorHeight, 2) },
      position: { x: roundNum(ex, 3), y: roundNum(ey, 3), z: roundNum(ez, 3) },
      facing: { x: 0, y: 0, z: 1 },
      bGameUnits: {
        position: entToBUnits(ex, ey, ez),
        facing: { x: 0, y: -1, z: 0 }
      }
    });
  }

  // Optional connected central podium portal when dual+ towers share a deck
  if (complex.podium?.connected && complex.towers.length >= 2) {
    const px = complex.podium.centerX;
    const pz = complex.podium.centerZ + complex.podium.depth * 0.5 + 0.3;
    entrances.push({
      id: 'podium_concourse',
      role: 'podium_portal',
      towerIndex: -1,
      style: cfg.entranceStyle || 'glass_curtain_lobby',
      side: '+Z',
      interactive: cfg.entranceEnabled !== false,
      label: 'Enter Plaza Concourse',
      interactionRadius: radius,
      doorSize: { width: 6.4, height: 4.5 },
      position: { x: roundNum(px, 3), y: roundNum(podiumY, 3), z: roundNum(pz, 3) },
      facing: { x: 0, y: 0, z: 1 },
      bGameUnits: {
        position: entToBUnits(px, podiumY, pz),
        facing: { x: 0, y: -1, z: 0 }
      }
    });
  }

  // Service Loading Bay (-X or -Z)
  if (cfg.loadingBay) {
    const fb = complex.footprintBounds;
    const lx = fb.minX - 0.4;
    const lz = fb.centerZ - fb.depth * 0.15;
    entrances.push({
      id: 'service_loading_bay',
      role: 'service',
      towerIndex: 0,
      style: 'loading_dock',
      side: '-X',
      interactive: false,
      label: 'Service Loading Dock',
      interactionRadius: radius,
      doorSize: { width: 5.2, height: 4.0 },
      position: { x: roundNum(lx, 3), y: 0, z: roundNum(lz, 3) },
      facing: { x: -1, y: 0, z: 0 },
      bGameUnits: {
        position: entToBUnits(lx, 0, lz),
        facing: { x: -1, y: 0, z: 0 }
      }
    });
  }

  // Underground Parking Garage Ramp (+X)
  if (cfg.parkingEntrance) {
    const fb = complex.footprintBounds;
    const gx = fb.maxX + 0.4;
    const gz = fb.centerZ - fb.depth * 0.15;
    entrances.push({
      id: 'parking_garage_entry',
      role: 'parking',
      towerIndex: 0,
      style: 'garage_ramp',
      side: '+X',
      interactive: false,
      label: 'Parking Garage Entry',
      interactionRadius: radius,
      doorSize: { width: 6.0, height: 3.4 },
      position: { x: roundNum(gx, 3), y: 0, z: roundNum(gz, 3) },
      facing: { x: 1, y: 0, z: 0 },
      bGameUnits: {
        position: entToBUnits(gx, 0, gz),
        facing: { x: 1, y: 0, z: 0 }
      }
    });
  }

  return entrances;
}


/* --- core/blueprints.js --- */
function bpEstimateCrownHeight(cfg) {
  const crownStyle = cfg.crownStyle || 'flat';
  const crownH = clamp(Number(cfg.crownHeight) || 0, 0, 36);
  const spireH = cfg.spireStyle && cfg.spireStyle !== 'none'
    ? clamp(Number(cfg.spireHeight) || 0, 0, 80) + 0.7
    : 0;
  let effectiveCrown = 0;
  if (crownStyle === 'flat') effectiveCrown = Math.min(2.6, Math.max(0.85, crownH * 0.25));
  else if (crownStyle === 'slanted') effectiveCrown = crownH * 1.42;
  else if (crownStyle === 'domed') effectiveCrown = crownH + 2.2;
  else effectiveCrown = crownH;
  return {
    crownHeight: roundNum(effectiveCrown, 3),
    spireHeight: roundNum(spireH, 3),
    totalAddition: roundNum(effectiveCrown + spireH, 3)
  };
}

function bpVecToBUnits(x, y, z) {
  return {
    x: roundNum(x * B_UNITS_PER_METER, 2),
    y: roundNum(-z * B_UNITS_PER_METER, 2),
    z: roundNum(y * B_UNITS_PER_METER, 2)
  };
}

function computeSkyscraperBounds(cfg, complex, entrances = [], crownMetrics = null) {
  const fb = complex.footprintBounds;
  const est = bpEstimateCrownHeight(cfg);
  const roofBaseY = complex.maxTowerHeight;
  const crownTopY = crownMetrics ? crownMetrics.crownTopY : roundNum(roofBaseY + est.crownHeight, 3);
  const spireTopY = crownMetrics ? crownMetrics.topY : roundNum(roofBaseY + est.totalAddition, 3);
  const plazaW = complex.plaza.enabled ? complex.plaza.width : fb.width;
  const plazaD = complex.plaza.enabled ? complex.plaza.depth : fb.depth;

  return {
    meters: {
      minX: fb.minX,
      maxX: fb.maxX,
      minZ: fb.minZ,
      maxZ: fb.maxZ,
      width: fb.width,
      depth: fb.depth,
      roofBaseY: roundNum(roofBaseY, 3),
      crownTopY: roundNum(crownTopY, 3),
      spireTopY: roundNum(spireTopY, 3),
      height: roundNum(spireTopY, 3),
      plazaWidth: plazaW,
      plazaDepth: plazaD
    },
    bGameUnits: {
      unitsPerMeter: B_UNITS_PER_METER,
      width: roundNum(fb.width * B_UNITS_PER_METER, 1),
      depth: roundNum(fb.depth * B_UNITS_PER_METER, 1),
      height: roundNum(spireTopY * B_UNITS_PER_METER, 1),
      plazaWidth: roundNum(plazaW * B_UNITS_PER_METER, 1),
      plazaDepth: roundNum(plazaD * B_UNITS_PER_METER, 1),
      min: bpVecToBUnits(fb.minX, 0, fb.maxZ),
      max: bpVecToBUnits(fb.maxX, spireTopY, fb.minZ)
    },
    totalFloors: complex.totalFloors,
    maxTowerFloors: complex.maxSingleTowerFloors || complex.totalFloors,
    towerCount: complex.towers.length,
    entranceCount: entrances.length
  };
}

function generateSkyscraperBlueprint(rawCfg, options = {}) {
  const cfg = sanitiseConfig(rawCfg);
  const complex = options.complex || resolveTowerComplex(cfg);
  const entrances = options.entrances || computeSkyscraperEntrances(cfg, complex);
  const bounds = computeSkyscraperBounds(cfg, complex, entrances, options.crownMetrics || null);
  const styleDesc = getStyle(cfg.style);

  return {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    generator: GENERATOR_META,
    seed: cfg.seed,
    style: cfg.style,
    styleLabel: styleDesc.label,
    config: cfg,
    bounds,
    towers: complex.towers.map((t) => ({
      index: t.index,
      position: { x: t.x, y: 0, z: t.z },
      rotDeg: t.rotDeg,
      mirrorX: t.mirrorX,
      totalFloors: t.stack.totalFloors,
      totalHeight: t.stack.totalHeight,
      bounds: t.bounds,
      sections: t.stack.sections.map((s) => ({
        id: s.id,
        role: s.role,
        label: s.label,
        floors: s.floors,
        startFloor: s.startFloor,
        endFloor: s.endFloor,
        floorHeight: s.floorHeight,
        height: s.height,
        baseElevation: s.baseElevation,
        topElevation: s.topElevation,
        width: s.width,
        depth: s.depth,
        footprint: s.footprint,
        cornerTreatment: s.cornerTreatment,
        facadeStyle: s.facadeStyle,
        windowPattern: s.windowPattern,
        materialRole: s.materialRole,
        taperX: s.taperX,
        taperZ: s.taperZ,
        twistDeg: s.twistDeg,
        flareBase: s.flareBase,
        slantedTopDeg: s.slantedTopDeg,
        diagonalBrace: s.diagonalBrace,
        transitionMode: s.transitionMode,
        transitionDiagnostics: s.transitionDiagnostics
      })),
      diagnostics: t.stack.diagnostics
    })),
    skybridges: complex.skybridges,
    trusses: complex.trusses,
    entrances,
    ground: {
      plaza: complex.plaza,
      podium: complex.podium,
      entranceStyle: cfg.entranceStyle,
      monumentalStairs: cfg.monumentalStairs,
      exteriorColumns: cfg.exteriorColumns,
      retailStorefronts: cfg.retailStorefronts,
      loadingBay: cfg.loadingBay,
      parkingEntrance: cfg.parkingEntrance,
      signEnabled: cfg.signEnabled,
      signText: cfg.signText
    },
    roof: {
      crownStyle: cfg.crownStyle,
      crownHeight: cfg.crownHeight,
      crownSteps: cfg.crownSteps,
      crownCurvature: cfg.crownCurvature,
      spireStyle: cfg.spireStyle,
      spireHeight: cfg.spireHeight,
      antennaMasts: cfg.antennaMasts,
      commArrays: cfg.commArrays,
      mechPenthouse: cfg.mechPenthouse,
      waterTanks: cfg.waterTanks,
      hvacUnits: cfg.hvacUnits,
      helipad: cfg.helipad,
      crownLighting: cfg.crownLighting
    },
    lighting: {
      lightingTime: cfg.lightingTime,
      litWindowRatio: cfg.litWindowRatio,
      warmCoolBalance: cfg.warmCoolBalance,
      occupiedFloorGrouping: cfg.occupiedFloorGrouping,
      darkFloorChance: cfg.darkFloorChance,
      lightingSeed: cfg.lightingSeed
    },
    geometryStats: options.geometryStats || null
  };
}

function validateSkyscraperBlueprint(input) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['Input Must Be A Json Object'], warnings, config: null, blueprint: null };
  }

  let rawCfg = input;
  if (input.schemaVersion) {
    if (input.schemaVersion !== BLUEPRINT_SCHEMA_VERSION) {
      warnings.push(`Expected schemaVersion ${BLUEPRINT_SCHEMA_VERSION}, got ${input.schemaVersion}`);
    }
    if (!input.config || typeof input.config !== 'object') {
      errors.push('Blueprint Object Missing config Field');
    } else {
      rawCfg = input.config;
    }
  }

  if (rawCfg.footprint && !OPTIONS.footprint.some(([id]) => id === rawCfg.footprint)) {
    warnings.push(`Unrecognised footprint "${rawCfg.footprint}", clamped to default`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, config: null, blueprint: null };
  }

  const cleanCfg = sanitiseConfig(rawCfg);
  const bp = generateSkyscraperBlueprint(cleanCfg);

  if (!bp.towers || bp.towers.length === 0) {
    errors.push('Tower Complex Produced Zero Towers');
  }
  for (const sb of bp.skybridges) {
    if (sb.spanLength <= 0.5 || sb.elevationY <= 0) {
      errors.push(`Invalid Skybridge ${sb.id}`);
    }
  }
  for (const t of bp.towers || []) {
    if (t.diagnostics && t.diagnostics.verticalGapCount > 0) {
      errors.push(`Tower ${t.index} Detected ${t.diagnostics.verticalGapCount} Vertical Section Gap(s)`);
    }
    for (const w of t.diagnostics?.warnings || []) {
      warnings.push(w);
    }
  }
  if (bp.entrances.length === 0) {
    warnings.push('No Ground Entrances Defined');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    config: cleanCfg,
    blueprint: bp
  };
}


/* --- materials/palettes.js --- */
const HARMONIOUS_SCHEMES = [
  {
    name: 'Classic Limestone & Steel',
    primaryMaterial: 'limestone',
    primaryColor: '#c2b9aa',
    secondaryMaterial: 'limestone',
    secondaryColor: '#a69d8f',
    framingMaterial: 'steel',
    framingColor: '#3a4149',
    glassMaterial: 'tinted_glass',
    glassColor: '#29455c',
    mullionMaterial: 'aluminum',
    mullionColor: '#5b646e',
    trimMaterial: 'limestone',
    trimColor: '#dbd3c5',
    crownMaterial: 'limestone',
    crownColor: '#cbc2b4',
    podiumMaterial: 'granite',
    podiumColor: '#767069'
  },
  {
    name: 'Dark Art Deco Granite',
    primaryMaterial: 'dark_stone',
    primaryColor: '#52444c',
    secondaryMaterial: 'granite',
    secondaryColor: '#3d3339',
    framingMaterial: 'granite',
    framingColor: '#31282e',
    glassMaterial: 'dark_glass',
    glassColor: '#1b2434',
    mullionMaterial: 'bronze',
    mullionColor: '#52464b',
    trimMaterial: 'limestone',
    trimColor: '#7f7077',
    crownMaterial: 'dark_stone',
    crownColor: '#5c4b55',
    podiumMaterial: 'dark_stone',
    podiumColor: '#382f35'
  },
  {
    name: 'Midnight Steel & Cobalt Glass',
    primaryMaterial: 'steel',
    primaryColor: '#252c36',
    secondaryMaterial: 'steel',
    secondaryColor: '#343d4a',
    framingMaterial: 'steel',
    framingColor: '#1a1f26',
    glassMaterial: 'reflective_glass',
    glassColor: '#24466b',
    mullionMaterial: 'aluminum',
    mullionColor: '#485669',
    trimMaterial: 'steel',
    trimColor: '#505e70',
    crownMaterial: 'steel',
    crownColor: '#202630',
    podiumMaterial: 'dark_stone',
    podiumColor: '#262b33'
  },
  {
    name: 'Silver Curtain Wall',
    primaryMaterial: 'aluminum',
    primaryColor: '#aeb9c2',
    secondaryMaterial: 'steel',
    secondaryColor: '#788896',
    framingMaterial: 'aluminum',
    framingColor: '#c2ccd4',
    glassMaterial: 'reflective_glass',
    glassColor: '#4d7ea6',
    mullionMaterial: 'aluminum',
    mullionColor: '#ced7de',
    trimMaterial: 'aluminum',
    trimColor: '#dce3e8',
    crownMaterial: 'aluminum',
    crownColor: '#b9c4cc',
    podiumMaterial: 'granite',
    podiumColor: '#67717a'
  },
  {
    name: 'Warm Granite & Bronze',
    primaryMaterial: 'granite',
    primaryColor: '#9c786e',
    secondaryMaterial: 'bronze',
    secondaryColor: '#634f45',
    framingMaterial: 'bronze',
    framingColor: '#4a3a32',
    glassMaterial: 'tinted_glass',
    glassColor: '#365466',
    mullionMaterial: 'bronze',
    mullionColor: '#967c5c',
    trimMaterial: 'limestone',
    trimColor: '#d1bfb4',
    crownMaterial: 'copper',
    crownColor: '#5f8276',
    podiumMaterial: 'granite',
    podiumColor: '#785d55'
  },
  {
    name: 'Architectural Concrete',
    primaryMaterial: 'concrete',
    primaryColor: '#999c9e',
    secondaryMaterial: 'concrete',
    secondaryColor: '#7e8385',
    framingMaterial: 'concrete',
    framingColor: '#aeb1b3',
    glassMaterial: 'dark_glass',
    glassColor: '#202b36',
    mullionMaterial: 'steel',
    mullionColor: '#343b42',
    trimMaterial: 'concrete',
    trimColor: '#b8bbbd',
    crownMaterial: 'concrete',
    crownColor: '#8c9092',
    podiumMaterial: 'concrete',
    podiumColor: '#6c7073'
  },
  {
    name: 'Terracotta Brick & Copper',
    primaryMaterial: 'brick',
    primaryColor: '#8c4b3f',
    secondaryMaterial: 'limestone',
    secondaryColor: '#baa995',
    framingMaterial: 'steel',
    framingColor: '#363b40',
    glassMaterial: 'dark_glass',
    glassColor: '#23303d',
    mullionMaterial: 'bronze',
    mullionColor: '#4d4137',
    trimMaterial: 'limestone',
    trimColor: '#cfc1ad',
    crownMaterial: 'copper',
    crownColor: '#5f877b',
    podiumMaterial: 'granite',
    podiumColor: '#68625d'
  }
];

function generateCoherentPalette(seed = 2026) {
  const r = rng32((seed + 517) >>> 0);
  const base = pick(r, HARMONIOUS_SCHEMES);
  const tintShift = (r() - 0.5) * 0.14;
  const shiftFn = tintShift >= 0
    ? (hex) => lightenHex(hex, tintShift)
    : (hex) => darkenHex(hex, -tintShift);

  return {
    primaryMaterial: base.primaryMaterial,
    primaryColor: shiftFn(base.primaryColor),
    secondaryMaterial: base.secondaryMaterial,
    secondaryColor: shiftFn(base.secondaryColor),
    framingMaterial: base.framingMaterial,
    framingColor: base.framingColor,
    glassMaterial: base.glassMaterial,
    glassColor: mixHex(base.glassColor, '#2e4e6e', r() * 0.25),
    mullionMaterial: base.mullionMaterial,
    mullionColor: base.mullionColor,
    trimMaterial: base.trimMaterial,
    trimColor: shiftFn(base.trimColor),
    crownMaterial: base.crownMaterial,
    crownColor: shiftFn(base.crownColor),
    podiumMaterial: base.podiumMaterial,
    podiumColor: base.podiumColor
  };
}


/* --- materials/materials.js --- */
let matCache = new Map();
let texCache = new Map();
let maxAnisotropy = 1;

function setSkyscraperMaxAnisotropy(aniso) {
  maxAnisotropy = Math.max(1, Number(aniso) || 1);
}

function clearSkyscraperMaterialCache() {
  for (const m of matCache.values()) m.dispose();
  for (const t of texCache.values()) t.dispose();
  matCache.clear();
  texCache.clear();
}

function createSurfaceCanvas(familyId, baseHex, variation = 0.15, seed = 101) {
  const fam = MATERIAL_FAMILIES[familyId] || MATERIAL_FAMILIES.concrete;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const r = rng32(seed);
  const cleanHex = colorHex(baseHex, fam.defaultColor);

  ctx.fillStyle = cleanHex;
  ctx.fillRect(0, 0, 256, 256);

  const darkTone = darkenHex(cleanHex, 0.18 + variation * 0.25);
  const lightTone = lightenHex(cleanHex, 0.11 + variation * 0.18);

  if (fam.pattern === 'brick') {
    const rows = 16;
    const cols = 6;
    const bh = 256 / rows;
    const bw = 256 / cols;
    ctx.fillStyle = darkenHex(cleanHex, 0.34);
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < rows; y++) {
      for (let x = -1; x < cols + 1; x++) {
        const shift = (y % 2) * bw * 0.5;
        ctx.fillStyle = mixHex(darkTone, lightTone, clamp(0.45 + (r() - 0.5) * variation * 2, 0, 1));
        ctx.fillRect(x * bw + shift + 2, y * bh + 2, bw - 3, bh - 3);
      }
    }
  } else if (fam.pattern === 'stone' || fam.pattern === 'granite') {
    const rows = fam.pattern === 'granite' ? 8 : 6;
    const cols = 4;
    const bh = 256 / rows;
    const bw = 256 / cols;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = mixHex(darkTone, lightTone, clamp(0.46 + (r() - 0.5) * variation * 1.5, 0, 1));
        ctx.fillRect(x * bw + 2, y * bh + 2, bw - 3, bh - 3);
      }
    }
    if (fam.pattern === 'granite') {
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = r() > 0.5 ? lightTone : darkTone;
        ctx.fillRect(r() * 252, r() * 252, 3, 3);
      }
    }
  } else if (fam.pattern === 'metal') {
    ctx.strokeStyle = darkenHex(cleanHex, 0.25);
    ctx.lineWidth = 2;
    for (let p = 0; p < 256; p += 64) {
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = mixHex(cleanHex, lightTone, 0.4);
      ctx.fillRect(0, i * 16, 256, 3);
    }
  } else if (fam.pattern === 'glass') {
    if (typeof ctx.createLinearGradient === 'function') {
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, lightenHex(cleanHex, 0.16));
      grad.addColorStop(0.5, cleanHex);
      grad.addColorStop(1, darkenHex(cleanHex, 0.18));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    } else {
      for (let b = 0; b < 8; b++) {
        ctx.fillStyle = mixHex(lightenHex(cleanHex, 0.14), darkenHex(cleanHex, 0.16), b / 7);
        ctx.fillRect(0, b * 32, 256, 32);
      }
    }
    ctx.strokeStyle = darkenHex(cleanHex, 0.3);
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 252, 252);
  } else {
    // Concrete panel lines
    ctx.strokeStyle = darkenHex(cleanHex, 0.18);
    ctx.lineWidth = 2;
    for (let p = 0; p < 256; p += 64) {
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = mixHex(darkTone, lightTone, r());
      ctx.fillRect(r() * 240, r() * 240, 12 + r() * 20, 6 + r() * 14);
    }
  }

  return canvas;
}

function getSkyscraperMaterial(familyId, hexColor, options = {}) {
  const fam = MATERIAL_FAMILIES[familyId] || MATERIAL_FAMILIES.concrete;
  const cleanHex = colorHex(hexColor, fam.defaultColor);
  const variation = clamp(Number(options.colorVariation) ?? 0.15, 0, 0.5);
  const role = options.role || 'surface';
  const emissiveHex = options.emissiveHex || '#000000';
  const emissiveIntensity = Number(options.emissiveIntensity) || 0;
  const key = [role, familyId, cleanHex, Math.round(variation * 50), emissiveHex, emissiveIntensity.toFixed(2)].join('|');

  if (matCache.has(key)) return matCache.get(key);

  const canvas = createSurfaceCanvas(familyId, cleanHex, variation, options.seed || 307);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(options.repeatX || 1, options.repeatY || 1);
  texture.anisotropy = Math.min(maxAnisotropy, 4);

  const isMetalOrGlass = fam.category === 'metal' || fam.category === 'glass';
  const mat = isMetalOrGlass
    ? new THREE.MeshPhongMaterial({
        map: texture,
        color: '#ffffff',
        shininess: fam.shininess,
        specular: fam.category === 'glass' ? '#8ab4d6' : '#586470',
        emissive: emissiveHex,
        emissiveIntensity
      })
    : new THREE.MeshLambertMaterial({
        map: texture,
        color: '#ffffff',
        emissive: emissiveHex,
        emissiveIntensity
      });

  matCache.set(key, mat);
  texCache.set(key, texture);
  return mat;
}

function getSolidMaterial(hexColor, shininess = 18, emissiveHex = '#000000', emissiveIntensity = 0) {
  const clean = colorHex(hexColor, '#777777');
  const key = `solid|${clean}|${shininess}|${emissiveHex}|${emissiveIntensity.toFixed(2)}`;
  if (matCache.has(key)) return matCache.get(key);
  const mat = shininess > 30
    ? new THREE.MeshPhongMaterial({
        color: clean,
        shininess,
        specular: '#6c8296',
        emissive: emissiveHex,
        emissiveIntensity
      })
    : new THREE.MeshLambertMaterial({
        color: clean,
        emissive: emissiveHex,
        emissiveIntensity
      });
  matCache.set(key, mat);
  return mat;
}

function getWindowPaneMaterials(cfg, lightingTimeOverride = null) {
  const timeMode = lightingTimeOverride || cfg.lightingTime || 'day';
  const isNight = timeMode === 'night';
  const isDusk = timeMode === 'dusk';
  const isGolden = timeMode === 'golden_hour';
  const glassFam = cfg.glassMaterial || 'tinted_glass';
  const baseGlass = colorHex(cfg.glassColor, '#27435c');

  const unlitColor = isNight ? darkenHex(baseGlass, 0.35) : baseGlass;
  const unlitMat = getSkyscraperMaterial(glassFam, unlitColor, {
    role: 'glass_unlit',
    colorVariation: 0.08,
    emissiveHex: isNight ? '#050b14' : '#081320',
    emissiveIntensity: isNight ? 0.08 : 0.1
  });

  const warmBase = isNight ? '#ffcb77' : isDusk ? '#ffd58f' : isGolden ? '#ffe1a8' : mixHex(baseGlass, '#ffe6b8', 0.42);
  const warmMat = getSolidMaterial(warmBase, 110, isNight ? '#e08b28' : isDusk ? '#c87c24' : '#735a30', isNight ? 0.92 : isDusk ? 0.65 : isGolden ? 0.35 : 0.16);

  const coolBase = isNight ? '#b5dcff' : isDusk ? '#c4e3ff' : isGolden ? '#cce6ff' : mixHex(baseGlass, '#c2e3ff', 0.45);
  const coolMat = getSolidMaterial(coolBase, 120, isNight ? '#6cb5f5' : isDusk ? '#589ad6' : '#35608a', isNight ? 0.85 : isDusk ? 0.58 : isGolden ? 0.28 : 0.14);

  const dimBase = mixHex(baseGlass, '#59748c', 0.35);
  const dimMat = getSolidMaterial(dimBase, 95, isNight ? '#1b2c3d' : '#111e2b', isNight ? 0.28 : 0.1);

  return { unlitMat, warmMat, coolMat, dimMat };
}

function getSilhouetteClayMaterial() {
  const key = 'silhouette_clay_mat';
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({ color: '#9fb0bd' }));
  }
  return matCache.get(key);
}

function resolveMaterialBundle(cfg, lightingTimeOverride = null) {
  const panes = getWindowPaneMaterials(cfg, lightingTimeOverride);
  return {
    primary: getSkyscraperMaterial(cfg.primaryMaterial, cfg.primaryColor, { role: 'primary', colorVariation: cfg.colorVariation, seed: cfg.seed + 11 }),
    secondary: getSkyscraperMaterial(cfg.secondaryMaterial, cfg.secondaryColor, { role: 'secondary', colorVariation: cfg.colorVariation, seed: cfg.seed + 23 }),
    framing: getSkyscraperMaterial(cfg.framingMaterial, cfg.framingColor, { role: 'framing', colorVariation: cfg.colorVariation * 0.6, seed: cfg.seed + 37 }),
    mullion: getSkyscraperMaterial(cfg.mullionMaterial, cfg.mullionColor, { role: 'mullion', colorVariation: 0.05, seed: cfg.seed + 41 }),
    trim: getSkyscraperMaterial(cfg.trimMaterial, cfg.trimColor, { role: 'trim', colorVariation: cfg.colorVariation * 0.5, seed: cfg.seed + 53 }),
    crown: getSkyscraperMaterial(cfg.crownMaterial, cfg.crownColor, { role: 'crown', colorVariation: cfg.colorVariation * 0.5, seed: cfg.seed + 61 }),
    podium: getSkyscraperMaterial(cfg.podiumMaterial, cfg.podiumColor, { role: 'podium', colorVariation: cfg.colorVariation * 0.6, seed: cfg.seed + 79 }),
    glass: panes.unlitMat,
    glassUnlit: panes.unlitMat,
    glassWarm: panes.warmMat,
    glassCool: panes.coolMat,
    glassDim: panes.dimMat,
    plaza: getSkyscraperMaterial('granite', '#6c7278', { role: 'plaza', colorVariation: 0.12, seed: cfg.seed + 97 }),
    darkMetal: getSolidMaterial('#242a32', 55),
    beaconRed: getSolidMaterial('#ff384b', 40, '#ff2a3e', 0.95),
    crownLight: getSolidMaterial('#d9f5ff', 40, '#85dcff', cfg.crownLighting ? 0.85 : 0.1)
  };
}

function reapplySkyscraperMaterials(root, cfg, view = {}) {
  if (!root) return;
  const silhouette = Boolean(view.silhouetteMode);
  const bundle = resolveMaterialBundle(cfg, view.lightingTime || cfg.lightingTime);
  const clay = getSilhouetteClayMaterial();

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData?.layer === 'facade') {
      obj.visible = !silhouette;
    }
    if (silhouette) {
      if (!obj.userData._origMatRef) obj.userData._origMatRef = obj.material;
      obj.material = clay;
    } else {
      const role = obj.userData?.materialRole;
      if (role && bundle[role]) {
        obj.material = bundle[role];
      } else if (obj.userData._origMatRef) {
        obj.material = obj.userData._origMatRef;
      }
      obj.material.wireframe = Boolean(view.wireframe);
    }
  });
}


/* --- geometry/primitives.js --- */
function skyRoot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

function skyBox(parent, x, y, z, w, h, d, material, options = {}) {
  if (w <= 0.002 || h <= 0.002 || d <= 0.002) return null;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (options.rotY) mesh.rotation.y = options.rotY;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  mesh.userData = {
    layer: options.layer || 'structure',
    materialRole: options.materialRole || 'primary'
  };
  if (parent) parent.add(mesh);
  return mesh;
}

function skyCylinder(parent, x, y, z, rTop, rBottom, h, material, sides = 12, options = {}) {
  if (h <= 0.002) return null;
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, sides);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  mesh.userData = {
    layer: options.layer || 'roof',
    materialRole: options.materialRole || 'crown'
  };
  if (parent) parent.add(mesh);
  return mesh;
}

function skySignboard(parent, text, w, h, bgHex = '#19222d', fgHex = '#e6f6ff', options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = colorHex(bgHex, '#19222d');
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = colorHex(fgHex, '#e6f6ff');
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = colorHex(fgHex, '#e6f6ff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = String(text || 'Skyscraper').slice(0, 28);
    let size = 48;
    ctx.font = `bold ${size}px Arial`;
    while (size > 18 && ctx.measureText(label).width > 460) {
      size -= 2;
      ctx.font = `bold ${size}px Arial`;
    }
    ctx.fillText(label, 256, 65);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
  face.position.z = 0.09;
  face.userData = { layer: 'ground', materialRole: 'signFace', _tex: tex };
  const backing = skyBox(parent, 0, 0, 0, w + 0.16, h + 0.16, 0.15, options.frameMaterial, {
    layer: 'ground',
    materialRole: 'trim'
  });
  parent.add(face);
  return backing;
}

const BOX_FACES = [
  // +X
  { n: [1, 0, 0], c: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  // -X
  { n: [-1, 0, 0], c: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  // +Y
  { n: [0, 1, 0], c: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  // -Y
  { n: [0, -1, 0], c: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  // +Z
  { n: [0, 0, 1], c: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  // -Z
  { n: [0, 0, -1], c: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] }
];

class SkyscraperBatcher {
  constructor() {
    this.buckets = new Map();
    this.instanceCount = 0;
  }

  _getBucket(layer, materialRole) {
    const key = `${layer}|${materialRole}`;
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        layer,
        materialRole,
        positions: [],
        normals: [],
        uvs: [],
        indices: [],
        vertexOffset: 0
      });
    }
    return this.buckets.get(key);
  }

  addBox(cx, cy, cz, w, h, d, yawRad = 0, materialRole = 'primary', layer = 'facade', uvScale = 1) {
    if (w <= 0.002 || h <= 0.002 || d <= 0.002) return;
    const b = this._getBucket(layer, materialRole);
    const cosY = Math.cos(yawRad);
    const sinY = Math.sin(yawRad);
    this.instanceCount++;

    for (let f = 0; f < 6; f++) {
      const face = BOX_FACES[f];
      const nx = face.n[0] * cosY + face.n[2] * sinY;
      const ny = face.n[1];
      const nz = -face.n[0] * sinY + face.n[2] * cosY;
      const baseV = b.vertexOffset;

      for (let i = 0; i < 4; i++) {
        const lx = face.c[i][0] * w;
        const ly = face.c[i][1] * h;
        const lz = face.c[i][2] * d;
        const wx = cx + lx * cosY + lz * sinY;
        const wy = cy + ly;
        const wz = cz - lx * sinY + lz * cosY;
        b.positions.push(wx, wy, wz);
        b.normals.push(nx, ny, nz);
      }

      const uMax = (f < 2 ? d : w) * 0.25 * uvScale;
      const vMax = (f === 2 || f === 3 ? d : h) * 0.25 * uvScale;
      b.uvs.push(0, 0, uMax, 0, uMax, vMax, 0, vMax);
      b.indices.push(baseV, baseV + 1, baseV + 2, baseV, baseV + 2, baseV + 3);
      b.vertexOffset += 4;
    }
  }

  addQuad(p0, p1, p2, p3, normal, materialRole = 'primary', layer = 'facade') {
    const b = this._getBucket(layer, materialRole);
    const baseV = b.vertexOffset;
    const pts = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      b.positions.push(pts[i][0], pts[i][1], pts[i][2]);
      b.normals.push(normal[0], normal[1], normal[2]);
    }
    const uLen = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) * 0.25;
    const vLen = Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]) * 0.25;
    b.uvs.push(0, 0, uLen, 0, uLen, vLen, 0, vLen);
    b.indices.push(baseV, baseV + 1, baseV + 2, baseV, baseV + 2, baseV + 3);
    b.vertexOffset += 4;
    this.instanceCount++;
  }

  addBeam(a, bPt, halfWidth = 0.22, halfDepth = 0.22, materialRole = 'framing', layer = 'facade') {
    const dx = bPt[0] - a[0];
    const dy = bPt[1] - a[1];
    const dz = bPt[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len <= 0.01) return;

    const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
    const upRef = Math.abs(dir.y) > 0.94 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(upRef, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();

    const pA = new THREE.Vector3(a[0], a[1], a[2]);
    const pB = new THREE.Vector3(bPt[0], bPt[1], bPt[2]);
    const offsets = [
      [-halfWidth, -halfDepth],
      [halfWidth, -halfDepth],
      [halfWidth, halfDepth],
      [-halfWidth, halfDepth]
    ];
    const ringA = offsets.map(([ox, oy]) => {
      const v = pA.clone().addScaledVector(right, ox).addScaledVector(up, oy);
      return [v.x, v.y, v.z];
    });
    const ringB = offsets.map(([ox, oy]) => {
      const v = pB.clone().addScaledVector(right, ox).addScaledVector(up, oy);
      return [v.x, v.y, v.z];
    });

    const sideNormals = [
      up.clone().negate(),
      right.clone(),
      up.clone(),
      right.clone().negate()
    ];

    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const n = sideNormals[i];
      this.addQuad(ringA[i], ringA[next], ringB[next], ringB[i], [n.x, n.y, n.z], materialRole, layer);
    }
    this.addQuad(ringA[3], ringA[2], ringA[1], ringA[0], [-dir.x, -dir.y, -dir.z], materialRole, layer);
    this.addQuad(ringB[0], ringB[1], ringB[2], ringB[3], [dir.x, dir.y, dir.z], materialRole, layer);
  }

  finalize(parentGroup, materialBundle, options = {}) {
    const meshes = [];
    for (const bucket of this.buckets.values()) {
      if (bucket.indices.length === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uvs, 2));
      geo.setIndex(bucket.indices);
      geo.computeBoundingSphere();
      const mat = materialBundle[bucket.materialRole] || materialBundle.primary;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = options.castShadow !== false;
      mesh.receiveShadow = options.receiveShadow !== false;
      mesh.name = `SkyscraperBatch_${bucket.layer}_${bucket.materialRole}`;
      mesh.userData = {
        layer: bucket.layer,
        materialRole: bucket.materialRole,
        batchedCount: this.instanceCount
      };
      parentGroup.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }
}


/* --- geometry/footprints-mesh.js --- */
function computeSliceTransform(section, frac, height, xCoord = 0) {
  const flare = section.flareBase > 0
    ? Math.pow(Math.max(0, 1 - frac / 0.68), 2.0) * section.flareBase
    : 0;
  const sx = lerp(1, section.taperX || 1, frac) * (1 + flare);
  const sz = lerp(1, section.taperZ || 1, frac) * (1 + flare);
  const rotRad = degToRad((section.baseRotationDeg || 0) + (section.twistDeg || 0) * frac);
  let y = frac * height;
  // Only shear top bearing plane on terminal top sections so intermediate stacked seams stay coplanar and watertight
  if (section.slantedTopDeg && section.isTopSection !== false) {
    const slope = Math.tan(degToRad(section.slantedTopDeg));
    const shear = slope * xCoord * Math.pow(frac, 1.3);
    y = Math.max(frac * height * 0.35, y + shear);
  }
  return { sx, sz, rotRad, y, flare };
}

function transformVertexXZ(v, sx, sz, rotRad, offsetX = 0, offsetZ = 0) {
  const px = v.x * sx;
  const pz = v.z * sz;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  return {
    x: px * cos + pz * sin + offsetX,
    z: -px * sin + pz * cos + offsetZ
  };
}

function buildSectionCoreMesh(section, material, materialRole = 'primary', layer = 'structure') {
  const poly = section.polygon;
  const verts = poly.vertices;
  const n = verts.length;
  if (n < 3) return null;

  const needsSlices = Math.abs(section.twistDeg || 0) > 0.5 || (section.flareBase || 0) > 0.01;
  const slices = needsSlices ? 8 : 1;
  const h = section.height;

  const rings = [];
  for (let s = 0; s <= slices; s++) {
    const frac = s / slices;
    const ring = [];
    for (let i = 0; i < n; i++) {
      const v = verts[i];
      const tr = computeSliceTransform(section, frac, h, v.x);
      const pt = transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, section.offsetX || 0, section.offsetZ || 0);
      ring.push({ x: pt.x, y: section.baseElevation + tr.y, z: pt.z });
    }
    rings.push(ring);
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let vOff = 0;

  const pushTri = (a, b, c, nx, ny, nz, uvA = [0, 0], uvB = [1, 0], uvC = [1, 1]) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    uvs.push(uvA[0], uvA[1], uvB[0], uvB[1], uvC[0], uvC[1]);
    indices.push(vOff, vOff + 1, vOff + 2);
    vOff += 3;
  };

  // Side walls across slices
  for (let s = 0; s < slices; s++) {
    const r0 = rings[s];
    const r1 = rings[s + 1];
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const a = r0[i];
      const b = r0[next];
      const c = r1[next];
      const d = r1[i];

      const ux = b.x - a.x;
      const uy = b.y - a.y;
      const uz = b.z - a.z;
      const vx = c.x - a.x;
      const vy = c.y - a.y;
      const vz = c.z - a.z;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const edgeLen = Math.hypot(b.x - a.x, b.z - a.z);
      const uSpan = edgeLen * 0.14;
      const v0 = (s / slices) * h * 0.14;
      const v1 = ((s + 1) / slices) * h * 0.14;

      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
      normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
      uvs.push(0, v0, uSpan, v0, uSpan, v1, 0, v1);
      indices.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3);
      vOff += 4;
    }
  }

  // Triangulate bottom and top caps
  const contour = verts.map((v) => new THREE.Vector2(v.x, -v.z));
  const capTris = THREE.ShapeUtils.triangulateShape(contour, []);
  const botRing = rings[0];
  const topRing = rings[slices];

  for (const tri of capTris) {
    // Bottom cap (normal ~ -Y; flip if cross.y > 0)
    const ba = botRing[tri[0]];
    const bb = botRing[tri[1]];
    const bc = botRing[tri[2]];
    const crossBotY = (bb.z - ba.z) * (bc.x - ba.x) - (bb.x - ba.x) * (bc.z - ba.z);
    if (crossBotY <= 0) {
      pushTri(ba, bb, bc, 0, -1, 0);
    } else {
      pushTri(ba, bc, bb, 0, -1, 0);
    }

    // Top cap (normal pointing upward)
    const ta = topRing[tri[0]];
    const tb = topRing[tri[1]];
    const tc = topRing[tri[2]];
    const ux = tb.x - ta.x;
    const uy = tb.y - ta.y;
    const uz = tb.z - ta.z;
    const vx = tc.x - ta.x;
    const vy = tc.y - ta.y;
    const vz = tc.z - ta.z;
    let tnx = uy * vz - uz * vy;
    let tny = uz * vx - ux * vz;
    let tnz = ux * vy - uy * vx;
    const tlen = Math.hypot(tnx, tny, tnz) || 1;
    tnx /= tlen;
    tny /= tlen;
    tnz /= tlen;
    if (tny >= 0) {
      pushTri(ta, tb, tc, tnx, tny, tnz);
    } else {
      pushTri(ta, tc, tb, -tnx, -tny, -tnz);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = `SectionCore_${section.id}`;
  mesh.userData = { layer, materialRole, sectionId: section.id };
  return mesh;
}

function getSectionRingXZ(section, frac) {
  const verts = section?.polygon?.vertices || [];
  const h = section?.height || 10;
  const ring = [];
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    const tr = computeSliceTransform(section, frac, h, v.x);
    const pt = transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, section.offsetX || 0, section.offsetZ || 0);
    ring.push({ x: pt.x, z: pt.z });
  }
  return ring;
}

function closestPointOnRing2D(pt, ring) {
  let best = ring[0] || { x: 0, z: 0 };
  let bestDist = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq > 1e-6 ? clamp(((pt.x - a.x) * dx + (pt.z - a.z) * dz) / lenSq, 0, 1) : 0;
    const cx = a.x + t * dx;
    const cz = a.z + t * dz;
    const d = Math.hypot(pt.x - cx, pt.z - cz);
    if (d < bestDist) {
      bestDist = d;
      best = { x: cx, z: cz };
    }
  }
  return { pt: best, dist: bestDist };
}

function buildLoftedCollarMesh(lowRing, upRing, y0, y1, material, matRole) {
  if (!lowRing.length || !upRing.length) return null;
  const cx = lowRing.reduce((s, p) => s + p.x, 0) / lowRing.length;
  const cz = lowRing.reduce((s, p) => s + p.z, 0) / lowRing.length;

  const sampleRay = (ring, angle) => {
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let bestT = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const sx = b.x - a.x;
      const sz = b.z - a.z;
      const denom = dx * sz - dz * sx;
      if (Math.abs(denom) < 1e-6) continue;
      const qpx = a.x - cx;
      const qpz = a.z - cz;
      const t = (qpx * sz - qpz * sx) / denom;
      const u = (qpx * dz - qpz * dx) / denom;
      if (t > 0 && u >= -0.005 && u <= 1.005) {
        bestT = Math.max(bestT, t);
      }
    }
    return { x: cx + dx * bestT, z: cz + dz * bestT };
  };

  const steps = 28;
  const bot = [];
  const top = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    bot.push(sampleRay(lowRing, a));
    top.push(sampleRay(upRing, a));
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let vOff = 0;

  for (let i = 0; i < steps; i++) {
    const next = (i + 1) % steps;
    const p0 = { x: bot[i].x, y: y0, z: bot[i].z };
    const p1 = { x: bot[next].x, y: y0, z: bot[next].z };
    const p2 = { x: top[next].x, y: y1, z: top[next].z };
    const p3 = { x: top[i].x, y: y1, z: top[i].z };

    const ux = p1.x - p0.x;
    const uy = p1.y - p0.y;
    const uz = p1.z - p0.z;
    const vx = p2.x - p0.x;
    const vy = p2.y - p0.y;
    const vz = p2.z - p0.z;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3);
    vOff += 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'SectionTransitionCollar';
  mesh.userData = { layer: 'structure', materialRole: matRole };
  return mesh;
}

function buildSectionTransitionMesh(lowerSec, upperSec, batcher, materials, cfg) {
  if (!lowerSec || !upperSec) return null;
  const lowRing = getSectionRingXZ(lowerSec, 1);
  const upRing = getSectionRingXZ(upperSec, 0);
  if (lowRing.length < 3 || upRing.length < 3) return null;

  const joinY = upperSec.baseElevation;
  const mode = upperSec.transitionMode || 'setback';
  const diag = upperSec.transitionDiagnostics || {};
  let collarMesh = null;

  // 1. Lofted sloped collar for tapered transitions between distinct shapes or sizes
  if (mode === 'tapered' || mode === 'stepped') {
    const collarH = mode === 'tapered' ? 1.5 : 0.75;
    collarMesh = buildLoftedCollarMesh(lowRing, upRing, joinY - 0.15, joinY + collarH, materials.framing || materials.trim, 'framing');
  }

  // 2. Cantilever transfer collar & diagonal structural knee braces for intentional overhangs
  if (mode === 'supported_cantilever' || mode === 'outward_expansion' || diag.needsCantileverSupport) {
    const braceDrop = Math.min(lowerSec.height * 0.55, 5.2);
    const seen = new Set();
    for (let i = 0; i < upRing.length; i++) {
      const v = upRing[i];
      const outDist = distanceOutsidePolygon2D(v, lowRing);
      if (outDist > 0.55) {
        const key = `${Math.round(v.x * 0.5)},${Math.round(v.z * 0.5)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const anchor = closestPointOnRing2D(v, lowRing).pt;
        batcher.addBeam(
          [anchor.x, joinY - braceDrop, anchor.z],
          [v.x * 0.96 + anchor.x * 0.04, joinY - 0.1, v.z * 0.96 + anchor.z * 0.04],
          0.38,
          0.42,
          'framing',
          'facade'
        );
      }
    }
    // Transfer belt around base of upper section
    for (let i = 0; i < upRing.length; i++) {
      const a = upRing[i];
      const b = upRing[(i + 1) % upRing.length];
      batcher.addBeam([a.x, joinY + 0.18, a.z], [b.x, joinY + 0.18, b.z], 0.5, 0.58, 'framing', 'facade');
    }
  }

  // 3. Open transition structural collar (transfer portal columns & truss ring)
  if (mode === 'open_transition') {
    const step = Math.max(1, Math.floor(upRing.length / 8));
    for (let i = 0; i < upRing.length; i += step) {
      const a = upRing[i];
      const b = upRing[(i + 1) % upRing.length];
      batcher.addBeam([a.x, joinY, a.z], [a.x, joinY + 3.2, a.z], 0.52, 0.52, 'framing', 'facade');
      batcher.addBeam([a.x, joinY + 3.1, a.z], [b.x, joinY + 3.1, b.z], 0.42, 0.46, 'trim', 'facade');
    }
  }

  // 4. Terrace coping & greenery planters on stepped setback ledges
  if (cfg.terracePlanters || cfg.style === 'terraced_garden') {
    for (let i = 0; i < lowRing.length; i++) {
      const a = lowRing[i];
      const b = lowRing[(i + 1) % lowRing.length];
      const mid = { x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5 };
      if (distanceOutsidePolygon2D(mid, upRing) > 0.75) {
        const edgeLen = Math.hypot(b.x - a.x, b.z - a.z);
        if (edgeLen < 2.2) continue;
        const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
        batcher.addBox(mid.x, joinY + 0.28, mid.z, Math.min(edgeLen * 0.65, 8.5), 0.56, 0.85, yaw, 'trim', 'facade');
        batcher.addBox(mid.x, joinY + 0.76, mid.z, Math.min(edgeLen * 0.58, 7.6), 0.46, 0.62, yaw, 'crown', 'facade');
      }
    }
  }

  return collarMesh;
}


/* --- geometry/facades.js --- */
function addEdgeSegmentBox(batcher, p1, p2, cy, widthFrac, h, depth, outwardOffset, materialRole, layer = 'facade', centerFrac = 0.5) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const edgeLen = Math.hypot(dx, dz);
  if (edgeLen < 0.05) return;

  const nx = -dz / edgeLen;
  const nz = dx / edgeLen;
  const yaw = Math.atan2(nx, nz);

  const cx = lerp(p1.x, p2.x, centerFrac) + nx * outwardOffset;
  const cz = lerp(p1.z, p2.z, centerFrac) + nz * outwardOffset;
  const w = edgeLen * widthFrac;
  batcher.addBox(cx, cy, cz, w, h, depth, yaw, materialRole, layer);
}

function resolveWindowMaterialRole(cfg, towerIndex, sectionIndex, floorIndex, edgeIndex, bayIndex, floorActive, floorSeed) {
  if (cfg.lightingTime === 'day' && cfg.litWindowRatio <= 0.05) return 'glassUnlit';
  if (!floorActive) return 'glassUnlit';
  const r = rng32((cfg.lightingSeed || 404) + towerIndex * 10007 + sectionIndex * 1999 + floorIndex * 313 + edgeIndex * 59 + bayIndex * 17 + floorSeed);
  const v = r();
  const groupBias = (cfg.occupiedFloorGrouping || 0.7) > 0.3 ? (bayIndex % 3 === 0 ? 0.15 : 0) : 0;
  if (v < clamp(cfg.litWindowRatio + groupBias, 0, 1)) {
    const t = r();
    return t < (cfg.warmCoolBalance ?? 0.5) ? 'glassWarm' : 'glassCool';
  }
  return v < clamp(cfg.litWindowRatio + 0.14, 0, 1) ? 'glassDim' : 'glassUnlit';
}

function addArtDecoFanMotif(batcher, p1, p2, topY, bayW, secH) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const edgeLen = Math.hypot(dx, dz);
  if (edgeLen < 4) return;
  const nx = -dz / edgeLen;
  const nz = dx / edgeLen;
  const mx = (p1.x + p2.x) * 0.5;
  const mz = (p1.z + p2.z) * 0.5;
  const tx = dx / edgeLen;
  const tz = dz / edgeLen;

  const fanR = Math.min(bayW * 0.48, Math.max(3.2, secH * 0.16));
  const hubY = topY - fanR * 1.15 - 1.2;
  const out = 0.28;

  // Recessed dark backing arch
  const yaw = Math.atan2(nx, nz);
  batcher.addBox(mx + nx * 0.1, hubY + fanR * 0.45, mz + nz * 0.1, fanR * 1.9, fanR * 0.95, 0.22, yaw, 'glassUnlit', 'facade');

  // Sunburst radial stone ribs (7 rays)
  const rayCount = 7;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / (rayCount - 1)) * Math.PI;
    const rx = Math.cos(a) * fanR;
    const ry = Math.sin(a) * fanR;
    const aPt = [mx + nx * out, hubY, mz + nz * out];
    const bPt = [mx + tx * rx + nx * out, hubY + ry, mz + tz * rx + nz * out];
    batcher.addBeam(aPt, bPt, 0.22, 0.26, 'trim', 'facade');
  }

  // Semicircular arch ring segments
  const arcSegs = 8;
  for (let i = 0; i < arcSegs; i++) {
    const a0 = (i / arcSegs) * Math.PI;
    const a1 = ((i + 1) / arcSegs) * Math.PI;
    const pA = [mx + tx * Math.cos(a0) * fanR + nx * (out + 0.06), hubY + Math.sin(a0) * fanR, mz + tz * Math.cos(a0) * fanR + nz * (out + 0.06)];
    const pB = [mx + tx * Math.cos(a1) * fanR + nx * (out + 0.06), hubY + Math.sin(a1) * fanR, mz + tz * Math.cos(a1) * fanR + nz * (out + 0.06)];
    batcher.addBeam(pA, pB, 0.28, 0.3, 'framing', 'facade');
  }
}

function generateSectionFacades(batcher, section, cfg, towerIndex = 0) {
  const poly = section.polygon;
  if (!poly || !poly.edges || poly.edges.length === 0) return;

  const pattern = section.windowPattern !== 'inherit' ? section.windowPattern : cfg.windowPattern;
  const fStyle = section.facadeStyle !== 'inherit' ? section.facadeStyle : 'default';
  const floors = section.floors;
  const fh = section.floorHeight;
  const secH = section.height;
  const baseY = section.baseElevation;
  const recess = clamp(cfg.windowRecess || 0.22, 0.04, 0.8);
  const bandInterval = Math.max(1, Math.round(cfg.floorBandInterval || 1));
  const ribDensity = clamp(cfg.ribDensity ?? 0.7, 0, 1.2);
  const colThick = clamp(cfg.columnThickness || 0.6, 0.15, 2.0);
  const mullionThick = clamp(cfg.mullionThickness || 0.14, 0.05, 0.45);
  const bandThick = clamp(cfg.floorBandThickness || 0.35, 0.08, 1.4);
  const balconyRatio = clamp(cfg.balconyRatio || 0, 0, 1);

  const floorRng = rng32((cfg.lightingSeed || 404) + towerIndex * 997 + section.index * 131);

  // Track section top cornice ring
  const topTransform = computeSliceTransform(section, 1, secH, 0);
  const topVerts = poly.vertices.map((v) => {
    const tr = computeSliceTransform(section, 1, secH, v.x);
    const pt = transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, section.offsetX || 0, section.offsetZ || 0);
    return { x: pt.x, y: baseY + tr.y, z: pt.z };
  });

  // Cornice / Setback cap ring along top edges (only when bearing top is horizontal)
  const hasEffectiveSlant = Math.abs(section.slantedTopDeg || 0) >= 1 && section.isTopSection !== false;
  if ((cfg.corniceSize || 0) > 0.05 && !hasEffectiveSlant) {
    const cSize = clamp(cfg.corniceSize, 0.1, 1.6);
    for (let i = 0; i < topVerts.length; i++) {
      const a = topVerts[i];
      const b = topVerts[(i + 1) % topVerts.length];
      addEdgeSegmentBox(batcher, a, b, a.y - cSize * 0.25, 1.02, cSize * 0.55, cSize * 0.7, cSize * 0.18, 'trim', 'facade');
    }
  }

  // Vertical corner piers / columns along section height (sliced for flare/twist)
  const vSlices = Math.abs(section.twistDeg || 0) > 0.5 || (section.flareBase || 0) > 0.01 ? 8 : 1;
  const cornerScale = section.cornerTreatment === 'stepped_piers'
    ? 1.35
    : section.cornerTreatment === 'fluted_columns'
      ? 1.15
      : 0.7;

  if (ribDensity > 0.1 && (section.cornerTreatment !== 'rounded' || fStyle === 'art_deco' || fStyle === 'gothic')) {
    for (let vi = 0; vi < poly.vertices.length; vi++) {
      const v = poly.vertices[vi];
      if (v.curved && poly.vertices.length > 10 && vi % 2 === 1) continue;
      for (let s = 0; s < vSlices; s++) {
        const f0 = s / vSlices;
        const f1 = (s + 1) / vSlices;
        const t0 = computeSliceTransform(section, f0, secH, v.x);
        const t1 = computeSliceTransform(section, f1, secH, v.x);
        const p0 = transformVertexXZ(v, t0.sx, t0.sz, t0.rotRad, section.offsetX || 0, section.offsetZ || 0);
        const p1 = transformVertexXZ(v, t1.sx, t1.sz, t1.rotRad, section.offsetX || 0, section.offsetZ || 0);
        const pierR = colThick * 0.48 * cornerScale;
        batcher.addBeam([p0.x, baseY + t0.y, p0.z], [p1.x, baseY + t1.y, p1.z], pierR, pierR, 'framing', 'facade');
      }
    }
  }

  // Per-floor perimeter facade generation
  for (let f = 0; f < floors; f++) {
    const frac = (f + 0.5) / floors;
    const floorSeed = Math.floor(floorRng() * 10000);
    const isDarkFloor = floorRng() < (cfg.darkFloorChance || 0);
    const floorActive = !isDarkFloor;
    const cy = baseY + frac * secH;
    const showBand = f === 0 || f === floors - 1 || (f % bandInterval === 0);

    for (let ei = 0; ei < poly.edges.length; ei++) {
      const edge = poly.edges[ei];
      const tr1 = computeSliceTransform(section, frac, secH, edge.p1.x);
      const tr2 = computeSliceTransform(section, frac, secH, edge.p2.x);
      const maxAllowY = baseY + Math.min(tr1.y, tr2.y);

      const p1 = transformVertexXZ(edge.p1, tr1.sx, tr1.sz, tr1.rotRad, section.offsetX || 0, section.offsetZ || 0);
      const p2 = transformVertexXZ(edge.p2, tr2.sx, tr2.sz, tr2.rotRad, section.offsetX || 0, section.offsetZ || 0);
      const eLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      if (eLen < 0.8) continue;

      // Skip windows near/above a slanted top edge
      if (section.slantedTopDeg && section.isTopSection !== false) {
        const top1 = computeSliceTransform(section, 1, secH, edge.p1.x);
        const top2 = computeSliceTransform(section, 1, secH, edge.p2.x);
        const roofMin = baseY + Math.min(top1.y, top2.y);
        if (cy + fh * 0.38 > roofMin) continue;
      }

      const isCenterStrip = edge.isRecessedCenter || (section.recessedCoreStrip && Math.abs(edge.normal.z) > 0.85 && eLen > 9);
      const winH = clamp(
        pattern === 'floor_to_ceiling' || pattern === 'curtain_wall'
          ? fh * 0.84
          : pattern === 'horizontal_ribbon'
            ? fh * 0.6
            : (cfg.windowHeight || fh * 0.65),
        0.8,
        fh * 0.9
      );

      // Horizontal floor band
      if (showBand && !edge.isCurved) {
        const bandOut = pattern === 'recessed_bays' ? 0.24 : 0.1;
        addEdgeSegmentBox(batcher, p1, p2, baseY + f * fh + bandThick * 0.4, 1.0, bandThick, bandOut * 2 + 0.14, bandOut * 0.5, 'trim', 'facade');
      } else if (edge.isCurved && (showBand || pattern === 'horizontal_ribbon')) {
        addEdgeSegmentBox(batcher, p1, p2, baseY + f * fh + bandThick * 0.4, 1.02, bandThick, 0.22, 0.08, 'trim', 'facade');
      }

      // Curved / ribbon horizontal glass strip mode
      if (pattern === 'horizontal_ribbon' && !edge.isRecessedCenter) {
        const paneMat = resolveWindowMaterialRole(cfg, towerIndex, section.index, f, ei, 0, floorActive, floorSeed);
        addEdgeSegmentBox(batcher, p1, p2, cy, 0.96, winH, 0.16, 0.05, paneMat, 'facade');
        if (eLen > 2.2) {
          addEdgeSegmentBox(batcher, p1, p2, cy, 0.04, winH, 0.22, 0.08, 'mullion', 'facade', 0.5);
        }
        continue;
      }

      // Compute bay count for this edge
      const targetBayPitch = clamp(cfg.columnSpacing || 3.4, 1.8, 7.5);
      const minBays = edge.isCurved ? 1 : (isCenterStrip ? 3 : 1);
      const bays = clamp(Math.round(eLen / targetBayPitch), minBays, 22);
      const bayLen = eLen / bays;

      for (let b = 0; b < bays; b++) {
        const u0 = b / bays;
        const u1 = (b + 1) / bays;
        const uMid = (u0 + u1) * 0.5;

        // Vertical ribs / pilasters at bay dividers
        if (b > 0 && ribDensity > 0.05 && !edge.isCurved) {
          const ribW = clamp((colThick * 0.45 * ribDensity) / eLen, 0.015, 0.18);
          const ribOut = fStyle === 'art_deco' || fStyle === 'gothic' ? 0.26 : 0.12;
          const ribRole = fStyle === 'art_deco' || pattern === 'vertical_strips' ? 'framing' : 'mullion';
          addEdgeSegmentBox(batcher, p1, p2, cy, ribW, fh * 0.99, ribOut * 2 + 0.12, ribOut * 0.5, ribRole, 'facade', u0);
        }

        // Determine window width within bay
        let winFrac = 0.72;
        if (pattern === 'vertical_strips') winFrac = 0.48;
        else if (pattern === 'curtain_wall' || pattern === 'floor_to_ceiling') winFrac = 0.9;
        else if (pattern === 'corner_wrap') winFrac = 0.88;
        else if (pattern === 'alternating_widths') winFrac = b % 2 === 0 ? 0.78 : 0.44;
        else if (pattern === 'grouped_decorative') winFrac = b % 3 === 1 ? 0.3 : 0.74;
        else if (isCenterStrip && section.recessedCoreStrip) winFrac = 0.62;

        const paneRole = resolveWindowMaterialRole(cfg, towerIndex, section.index, f, ei, b, floorActive, floorSeed);
        const winOut = pattern === 'curtain_wall' || pattern === 'corner_wrap' ? 0.06 : 0.03;
        addEdgeSegmentBox(batcher, p1, p2, cy, (winFrac / bays), winH, 0.14, winOut, paneRole, 'facade', uMid);

        // Mullions inside wide bays
        if (bayLen > 2.4 && pattern !== 'vertical_strips') {
          addEdgeSegmentBox(batcher, p1, p2, cy, (mullionThick / eLen), winH, 0.19, winOut + 0.03, 'mullion', 'facade', uMid);
        }

        // Recessed bay deep framing surround
        if (pattern === 'recessed_bays' || fStyle === 'brutalist') {
          addEdgeSegmentBox(batcher, p1, p2, cy + winH * 0.48, (1 / bays), 0.22, recess * 0.9, recess * 0.45, 'framing', 'facade', uMid);
        }

        // Arched monumental lintel cap
        if (pattern === 'arched_monumental') {
          addEdgeSegmentBox(batcher, p1, p2, cy + winH * 0.46, (winFrac * 0.85) / bays, 0.24, 0.24, 0.14, 'trim', 'facade', uMid);
        }

        // Balconies on residential / luxury sections (proportional depth)
        if (balconyRatio > 0.05 && !edge.isCurved && !edge.isRecessedCenter && f > 0 && ((f + b) % 2 === 0)) {
          const br = rng32(cfg.seed + f * 31 + b * 17 + ei * 7)();
          if (br < balconyRatio) {
            addEdgeSegmentBox(batcher, p1, p2, cy - winH * 0.48, (0.72 / bays), 0.16, 0.96, 0.48, 'trim', 'facade', uMid);
            addEdgeSegmentBox(batcher, p1, p2, cy - winH * 0.48 + 0.48, (0.72 / bays), 0.86, 0.08, 0.92, 'glassDim', 'facade', uMid);
          }
        }
      }
    }
  }

  // Exterior diagonal braces (section or global)
  const braceMode = section.diagonalBrace && section.diagonalBrace !== 'none'
    ? section.diagonalBrace
    : (section.role !== 'podium' ? (cfg.exteriorBracing || 'none') : 'none');

  if (braceMode !== 'none' && section.floors >= 4) {
    const tierStep = Math.max(4, Math.min(8, Math.floor(floors / 2)));
    for (let f0 = 0; f0 < floors - 1; f0 += tierStep) {
      const f1 = Math.min(floors, f0 + tierStep);
      const frac0 = f0 / floors;
      const frac1 = f1 / floors;
      for (let ei = 0; ei < poly.edges.length; ei++) {
        const edge = poly.edges[ei];
        if (edge.length < 6 || edge.isCurved) continue;
        const trA0 = computeSliceTransform(section, frac0, secH, edge.p1.x);
        const trB0 = computeSliceTransform(section, frac0, secH, edge.p2.x);
        const trA1 = computeSliceTransform(section, frac1, secH, edge.p1.x);
        const trB1 = computeSliceTransform(section, frac1, secH, edge.p2.x);
        const out = 0.25;
        const nx = edge.normal.x * out;
        const nz = edge.normal.z * out;
        const a0 = transformVertexXZ(edge.p1, trA0.sx, trA0.sz, trA0.rotRad, (section.offsetX || 0) + nx, (section.offsetZ || 0) + nz);
        const b0 = transformVertexXZ(edge.p2, trB0.sx, trB0.sz, trB0.rotRad, (section.offsetX || 0) + nx, (section.offsetZ || 0) + nz);
        const a1 = transformVertexXZ(edge.p1, trA1.sx, trA1.sz, trA1.rotRad, (section.offsetX || 0) + nx, (section.offsetZ || 0) + nz);
        const b1 = transformVertexXZ(edge.p2, trB1.sx, trB1.sz, trB1.rotRad, (section.offsetX || 0) + nx, (section.offsetZ || 0) + nz);

        const pA0 = [a0.x, baseY + trA0.y, a0.z];
        const pB0 = [b0.x, baseY + trB0.y, b0.z];
        const pA1 = [a1.x, baseY + trA1.y, a1.z];
        const pB1 = [b1.x, baseY + trB1.y, b1.z];

        if (braceMode === 'left_to_right' || braceMode === 'x_brace') {
          batcher.addBeam(pA0, pB1, 0.24, 0.24, 'framing', 'facade');
        }
        if (braceMode === 'right_to_left' || braceMode === 'x_brace') {
          batcher.addBeam(pB0, pA1, 0.24, 0.24, 'framing', 'facade');
        }
        if (braceMode === 'diamond') {
          const midBot = [(pA0[0] + pB0[0]) * 0.5, (pA0[1] + pB0[1]) * 0.5, (pA0[2] + pB0[2]) * 0.5];
          const midTop = [(pA1[0] + pB1[0]) * 0.5, (pA1[1] + pB1[1]) * 0.5, (pA1[2] + pB1[2]) * 0.5];
          const midL = [(pA0[0] + pA1[0]) * 0.5, (pA0[1] + pA1[1]) * 0.5, (pA0[2] + pA1[2]) * 0.5];
          const midR = [(pB0[0] + pB1[0]) * 0.5, (pB0[1] + pB1[1]) * 0.5, (pB0[2] + pB1[2]) * 0.5];
          batcher.addBeam(midBot, midL, 0.2, 0.2, 'framing', 'facade');
          batcher.addBeam(midL, midTop, 0.2, 0.2, 'framing', 'facade');
          batcher.addBeam(midTop, midR, 0.2, 0.2, 'framing', 'facade');
          batcher.addBeam(midR, midBot, 0.2, 0.2, 'framing', 'facade');
        }
      }
    }
  }

  // Art Deco sunburst fan motif on upper front & back facades
  if (section.fanMotif) {
    for (const edge of poly.edges) {
      if (Math.abs(edge.normal.z) < 0.85 || edge.length < 6) continue;
      const tr1 = computeSliceTransform(section, 1, secH, edge.p1.x);
      const tr2 = computeSliceTransform(section, 1, secH, edge.p2.x);
      const p1 = transformVertexXZ(edge.p1, tr1.sx, tr1.sz, tr1.rotRad, section.offsetX || 0, section.offsetZ || 0);
      const p2 = transformVertexXZ(edge.p2, tr2.sx, tr2.sz, tr2.rotRad, section.offsetX || 0, section.offsetZ || 0);
      const fanTopY = baseY + Math.min(tr1.y, tr2.y);
      addArtDecoFanMotif(batcher, p1, p2, fanTopY, edge.length * 0.48, secH);
    }
  }
}


/* --- geometry/roofs.js --- */
function roofBuildLoftedCap(verts, baseY, topY, topScaleX, topScaleZ, topShiftX, topShiftYSlope, material, materialRole = 'crown') {
    const n = verts.length;
    if (n < 3) return null;

    const cx = verts.reduce((s, v) => s + v.x, 0) / n;
    const cz = verts.reduce((s, v) => s + v.z, 0) / n;
    let maxHalfX = 1;
    for (const v of verts) {
        maxHalfX = Math.max(maxHalfX, Math.abs(v.x - cx));
    }

    const bot = verts.map((v) => ({ x: v.x, y: v.y ?? baseY, z: v.z }));
    const top = verts.map((v) => {
        const lx = v.x - cx;
        const lz = v.z - cz;
        const slopeOffset = topShiftYSlope ? (lx / maxHalfX) * topShiftYSlope : 0;
        return {
            x: cx + topShiftX + lx * topScaleX,
            y: Math.max((v.y ?? baseY) + 0.35, topY + slopeOffset),
            z: cz + lz * topScaleZ
        };
    });

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let off = 0;

    const addTri = (a, b, c, nx, ny, nz, u0 = 0, v0 = 0, u1 = 1, v1 = 0, u2 = 1, v2 = 1) => {
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
        uvs.push(u0, v0, u1, v1, u2, v2);
        indices.push(off, off + 1, off + 2);
        off += 3;
    };

    // Side walls
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const a = bot[i];
        const b = bot[next];
        const c = top[next];
        const d = top[i];

        const ux = b.x - a.x;
        const uy = b.y - a.y;
        const uz = b.z - a.z;
        const vx = c.x - a.x;
        const vy = c.y - a.y;
        const vz = c.z - a.z;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;

        const span = Math.hypot(ux, uz) * 0.14;
        const hSpan = Math.max(0.5, Math.abs(d.y - a.y) * 0.14);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
        normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
        uvs.push(0, 0, span, 0, span, hSpan, 0, hSpan);
        indices.push(off, off + 1, off + 2, off, off + 2, off + 3);
        off += 4;
    }

    // Top cap via ear-clipping / ShapeUtils
    const top2D = top.map((p) => new THREE.Vector2(p.x, -p.z));
    const topTris = THREE.ShapeUtils.triangulateShape(top2D, []);
    for (const [ia, ib, ic] of topTris) {
        const pA = top[ia];
        const pB = top[ib];
        const pC = top[ic];
        const ux = pB.x - pA.x;
        const uy = pB.y - pA.y;
        const uz = pB.z - pA.z;
        const vx = pC.x - pA.x;
        const vy = pC.y - pA.y;
        const vz = pC.z - pA.z;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        if (ny < 0) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
            addTri(pA, pC, pB, nx, ny, nz);
        } else {
            const len = Math.hypot(nx, ny, nz) || 1;
            addTri(pA, pB, pC, nx / len, ny / len, nz / len);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { layer: 'roof', materialRole };
    return mesh;
}

function roofBuildSpire(parent, batcher, materials, cx, baseY, cz, spireStyle, spireH, spireR) {
    if (!spireStyle || spireStyle === 'none' || spireH <= 1) return baseY;

    const spireGroup = new THREE.Group();
    spireGroup.position.set(cx, baseY, cz);
    parent.add(spireGroup);

    // Structural base collar
    skyCylinder(spireGroup, 0, Math.min(2.2, spireH * 0.08) * 0.5, 0, spireR * 1.15, spireR * 1.45, Math.min(2.4, spireH * 0.1), materials.crown, 8, {
        layer: 'roof',
        materialRole: 'crown'
    });

    if (spireStyle === 'lattice_tower') {
        const latticeH = spireH * 0.58;
        const mastH = spireH - latticeH;
        const legSpread = Math.max(1.8, spireR * 1.5);
        const levels = 5;
        const legs = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1]
        ];

        for (let lv = 0; lv < levels; lv++) {
            const f0 = lv / levels;
            const f1 = (lv + 1) / levels;
            const y0 = baseY + f0 * latticeH;
            const y1 = baseY + f1 * latticeH;
            const s0 = lerp(legSpread, legSpread * 0.22, f0);
            const s1 = lerp(legSpread, legSpread * 0.22, f1);

            for (let i = 0; i < 4; i++) {
                const [lx, lz] = legs[i];
                const [nx, nz] = legs[(i + 1) % 4];
                const p00 = [cx + lx * s0, y0, cz + lz * s0];
                const p01 = [cx + nx * s0, y0, cz + nz * s0];
                const p10 = [cx + lx * s1, y1, cz + lz * s1];
                const p11 = [cx + nx * s1, y1, cz + nz * s1];
                batcher.addBeam(p00, p10, 0.22, 0.22, 'framing', 'roof');
                batcher.addBeam(p10, p11, 0.16, 0.16, 'trim', 'roof');
                batcher.addBeam(p00, p11, 0.12, 0.12, 'framing', 'roof');
                batcher.addBeam(p01, p10, 0.12, 0.12, 'framing', 'roof');
            }
        }

        const mastBase = latticeH;
        skyCylinder(spireGroup, 0, mastBase + mastH * 0.5, 0, 0.08, 0.36, mastH, materials.trim, 8, {
            layer: 'roof',
            materialRole: 'trim'
        });
    } else if (spireStyle === 'gothic_needle') {
        const shaftH = spireH * 0.88;
        skyCylinder(spireGroup, 0, shaftH * 0.5, 0, 0.14, spireR * 1.1, shaftH, materials.crown, 8, {
            layer: 'roof',
            materialRole: 'crown'
        });
        // Crocket rings along gothic needle
        for (let i = 1; i <= 3; i++) {
            const f = i * 0.24;
            const ry = shaftH * f;
            const rRing = lerp(spireR * 1.15, 0.22, f) * 1.25;
            skyCylinder(spireGroup, 0, ry, 0, rRing, rRing, 0.32, materials.trim, 8, {
                layer: 'roof',
                materialRole: 'trim'
            });
        }
        // 4 flanking pinnacle needlettes
        const pOff = spireR * 1.35;
        for (const [px, pz] of[[-pOff, 0], [pOff, 0], [0, -pOff], [0, pOff]]) {
            const ph = spireH * 0.34;
            skyCylinder(spireGroup, px, ph * 0.5, pz, 0.06, 0.42, ph, materials.trim, 6, {
                layer: 'roof',
                materialRole: 'trim'
            });
        }
        skyCylinder(spireGroup, 0, spireH * 0.94, 0, 0.04, 0.14, spireH * 0.12, materials.trim, 8, {
            layer: 'roof',
            materialRole: 'trim'
        });
    } else if (spireStyle === 'atomic_needle') {
        const shaftH = spireH * 0.85;
        skyCylinder(spireGroup, 0, shaftH * 0.5, 0, 0.12, spireR * 0.72, shaftH, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
        // 4 retro-futurist stabilizing fins around base
        for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2;
            const fin = skyBox(
                spireGroup,
                Math.cos(ang) * spireR * 0.95,
                spireH * 0.12,
                Math.sin(ang) * spireR * 0.95,
                spireR * 1.3,
                spireH * 0.24,
                0.28,
                materials.framing, { rotY: -ang, layer: 'roof', materialRole: 'framing' }
            );
            if (fin) fin.userData.materialRole = 'framing';
        }
        // Dual circular atomic saucer discs around spire shaft
        skyCylinder(spireGroup, 0, spireH * 0.32, 0, spireR * 2.2, spireR * 2.0, 0.55, materials.crownLight, 16, {
            layer: 'roof',
            materialRole: 'crownLight'
        });
        skyCylinder(spireGroup, 0, spireH * 0.56, 0, spireR * 1.35, spireR * 1.15, 0.42, materials.trim, 16, {
            layer: 'roof',
            materialRole: 'trim'
        });
        skyCylinder(spireGroup, 0, spireH * 0.92, 0, 0.04, 0.14, spireH * 0.16, materials.trim, 8, {
            layer: 'roof',
            materialRole: 'trim'
        });
    } else {
        // slender_mast - classic supertall 3-tier telescoping mast
        const h1 = spireH * 0.4;
        const h2 = spireH * 0.34;
        const h3 = spireH * 0.26;
        skyCylinder(spireGroup, 0, h1 * 0.5, 0, spireR * 0.52, spireR * 0.85, h1, materials.crown, 8, {
            layer: 'roof',
            materialRole: 'crown'
        });
        skyCylinder(spireGroup, 0, h1 + h2 * 0.5, 0, spireR * 0.24, spireR * 0.5, h2, materials.trim, 8, {
            layer: 'roof',
            materialRole: 'trim'
        });
        skyCylinder(spireGroup, 0, h1 + h2 + h3 * 0.5, 0, 0.06, spireR * 0.22, h3, materials.framing, 8, {
            layer: 'roof',
            materialRole: 'framing'
        });
        // Guy collar rings
        skyCylinder(spireGroup, 0, h1, 0, spireR * 0.95, spireR * 0.95, 0.36, materials.crownLight, 8, {
            layer: 'roof',
            materialRole: 'crownLight'
        });
    }

    // Aviation beacon orb at spire apex
    const beaconGeo = new THREE.SphereGeometry(0.45, 10, 8);
    const beacon = new THREE.Mesh(beaconGeo, materials.beaconRed);
    beacon.position.set(0, spireH + 0.25, 0);
    beacon.userData = { layer: 'roof', materialRole: 'beaconRed' };
    spireGroup.add(beacon);

    return baseY + spireH + 0.7;
}

function roofBuildRooftopEquipment(parent, batcher, materials, cx, deckY, cz, deckW, deckD, cfg, hasCenterSpire) {
    const safeW = Math.max(6, deckW);
    const safeD = Math.max(6, deckD);
    const sideShift = hasCenterSpire ? Math.min(safeW * 0.26, 5.0) : 0;

    // Mechanical penthouse
    if (cfg.mechPenthouse) {
        const pw = clamp(safeW * 0.42, 4.2, 13);
        const pd = clamp(safeD * 0.38, 4.0, 11);
        const ph = clamp((cfg.crownHeight || 8) * 0.42, 2.8, 6.2);
        const px = cx - (hasCenterSpire ? Math.min(safeW * 0.24, 4.2) : 0);
        const pz = cz - (hasCenterSpire ? Math.min(safeD * 0.16, 2.6) : 0);
        skyBox(parent, px, deckY + ph * 0.5, pz, pw, ph, pd, materials.secondary, {
            layer: 'roof',
            materialRole: 'secondary'
        });
        skyBox(parent, px, deckY + ph + 0.18, pz, pw + 0.45, 0.36, pd + 0.45, materials.trim, {
            layer: 'roof',
            materialRole: 'trim'
        });
        // Pent-house louvered exhaust grilles
        for (let i = -1; i <= 1; i++) {
            batcher.addBox(px + i * (pw * 0.26), deckY + ph * 0.55, pz + pd * 0.5 + 0.08, pw * 0.18, ph * 0.48, 0.12, 0, 'darkMetal', 'roof');
        }
    }

    // Rooftop water tank on trestle frame
    if (cfg.waterTanks) {
        const tx = cx + sideShift + Math.min(safeW * 0.22, 4.2);
        const tz = cz - Math.min(safeD * 0.22, 3.8);
        const legH = 2.0;
        const r = 1.25;
        for (const [lx, lz] of[[-0.85, -0.85], [0.85, -0.85], [0.85, 0.85], [-0.85, 0.85]]) {
            batcher.addBox(tx + lx, deckY + legH * 0.5, tz + lz, 0.2, legH, 0.2, 0, 'darkMetal', 'roof');
        }
        skyCylinder(parent, tx, deckY + legH + 1.45, tz, r, r, 2.7, materials.framing, 12, {
            layer: 'roof',
            materialRole: 'framing'
        });
        skyCylinder(parent, tx, deckY + legH + 3.25, tz, 0.12, r * 1.1, 0.95, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
    }

    // HVAC banks
    if (cfg.hvacUnits) {
        const hx = cx + Math.min(safeW * 0.22, 4.4);
        const hz = cz + Math.min(safeD * 0.2, 3.6);
        batcher.addBox(hx, deckY + 0.85, hz, 3.4, 1.7, 2.2, 0, 'framing', 'roof');
        batcher.addBox(hx - 2.4, deckY + 0.65, hz + 0.3, 1.8, 1.3, 1.8, 0, 'trim', 'roof');
        skyCylinder(parent, hx - 0.7, deckY + 1.85, hz, 0.58, 0.62, 0.35, materials.darkMetal, 10, {
            layer: 'roof',
            materialRole: 'darkMetal'
        });
        skyCylinder(parent, hx + 0.75, deckY + 1.85, hz, 0.58, 0.62, 0.35, materials.darkMetal, 10, {
            layer: 'roof',
            materialRole: 'darkMetal'
        });
    }

    // Helipad platform
    if (cfg.helipad && safeW >= 11 && safeD >= 11) {
        const padR = clamp(Math.min(safeW, safeD) * 0.34, 3.8, 7.2);
        const padY = deckY + 0.42;
        skyCylinder(parent, cx, padY, cz, padR, padR * 1.06, 0.48, materials.darkMetal, 8, {
            layer: 'roof',
            materialRole: 'darkMetal'
        });
        // Perimeter ring accents + H symbol
        const hScale = padR * 0.46;
        batcher.addBox(cx - hScale * 0.55, padY + 0.28, cz, 0.38, 0.08, hScale * 1.35, 0, 'crownLight', 'roof');
        batcher.addBox(cx + hScale * 0.55, padY + 0.28, cz, 0.38, 0.08, hScale * 1.35, 0, 'crownLight', 'roof');
        batcher.addBox(cx, padY + 0.28, cz, hScale * 1.1, 0.08, 0.38, 0, 'crownLight', 'roof');
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            batcher.addBox(cx + Math.cos(a) * (padR * 0.92), padY + 0.32, cz + Math.sin(a) * (padR * 0.92), 0.24, 0.2, 0.24, 0, 'beaconRed', 'roof');
        }
    }

    // Secondary antenna masts along perimeter corners
    const mastCount = clamp(Math.round(Number(cfg.antennaMasts) || 0), 0, 6);
    if (mastCount > 0) {
        const corners = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
            [0, -1],
            [0, 1]
        ];
        for (let i = 0; i < mastCount; i++) {
            const [kx, kz] = corners[i % corners.length];
            const mx = cx + kx * (safeW * 0.38);
            const mz = cz + kz * (safeD * 0.38);
            const mh = 5.5 + (i % 3) * 2.2;
            skyCylinder(parent, mx, deckY + mh * 0.5, mz, 0.04, 0.14, mh, materials.framing, 6, {
                layer: 'roof',
                materialRole: 'framing'
            });
            batcher.addBox(mx, deckY + mh * 0.65, mz, 0.95, 0.12, 0.12, 0, 'trim', 'roof');
        }
    }

    // Communication microwave dish array
    if (cfg.commArrays) {
        const ax = cx - Math.min(safeW * 0.32, 5.2);
        const az = cz + Math.min(safeD * 0.3, 4.6);
        skyCylinder(parent, ax, deckY + 2.4, az, 0.12, 0.2, 4.8, materials.darkMetal, 8, {
            layer: 'roof',
            materialRole: 'darkMetal'
        });
        const dishA = skyCylinder(parent, ax + 0.55, deckY + 3.8, az, 0.85, 0.12, 0.45, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
        if (dishA) dishA.rotation.z = -Math.PI * 0.35;
        const dishB = skyCylinder(parent, ax - 0.55, deckY + 3.1, az + 0.3, 0.68, 0.1, 0.38, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
        if (dishB) dishB.rotation.z = Math.PI * 0.38;
    }
}

function buildTowerCrownAndRoof(parent, topSection, cfg, towerSpec, batcher, materials) {
    const poly = topSection.polygon;
    const h = topSection.height;
    const baseY = topSection.baseElevation;
    const cx = topSection.offsetX || 0;
    const cz = topSection.offsetZ || 0;

    let minY = Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    const topVerts = poly.vertices.map((v) => {
        const tr = computeSliceTransform(topSection, 1, h, v.x);
        const pt = transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, cx, cz);
        const vy = baseY + tr.y;
        minY = Math.min(minY, vy);
        maxY = Math.max(maxY, vy);
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minZ = Math.min(minZ, pt.z);
        maxZ = Math.max(maxZ, pt.z);
        return { x: pt.x, y: vy, z: pt.z };
    });

    const topW = Math.max(4, maxX - minX);
    const topD = Math.max(4, maxZ - minZ);
    const midCenterX = (minX + maxX) * 0.5;
    const midCenterZ = (minZ + maxZ) * 0.5;
    const crownBaseY = maxY;
    const crownStyle = cfg.crownStyle || 'art_deco_stepped';
    const crownH = clamp(Number(cfg.crownHeight) || 10, 2, 36);
    const crownSteps = clamp(Math.round(Number(cfg.crownSteps) || 3), 1, 6);
    const curvature = clamp(Number(cfg.crownCurvature) || 0.4, 0, 1);
    const lightRole = cfg.crownLighting ? 'crownLight' : 'trim';

    let summitY = crownBaseY;
    let equipDeckY = crownBaseY;
    let equipDeckW = topW * 0.72;
    let equipDeckD = topD * 0.72;

    if (crownStyle === 'flat') {
        const parapetH = Math.min(2.6, Math.max(0.85, crownH * 0.25));
        for (let i = 0; i < topVerts.length; i++) {
            const a = topVerts[i];
            const b = topVerts[(i + 1) % topVerts.length];
            batcher.addBeam([a.x, a.y + parapetH * 0.45, a.z], [b.x, b.y + parapetH * 0.45, b.z], 0.52, parapetH, 'trim', 'roof');
        }
        summitY = crownBaseY + parapetH;
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'art_deco_stepped') {
        let cursorY = crownBaseY;
        const stepH = crownH / crownSteps;
        for (let s = 0; s < crownSteps; s++) {
            const sScale = lerp(0.88, 0.34, s / Math.max(1, crownSteps - 1));
            const tier = roofBuildLoftedCap(
                topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * sScale, y: cursorY, z: midCenterZ + (v.z - midCenterZ) * sScale })),
                cursorY,
                cursorY + stepH,
                lerp(1.0, 0.9, 0.4),
                lerp(1.0, 0.9, 0.4),
                0,
                0,
                materials.crown,
                'crown'
            );
            if (tier) parent.add(tier);

            // Decorative vertical flutes & corner ribs on each stepped tier
            const stepW = topW * sScale;
            const stepD = topD * sScale;
            for (const sx of[-1, 1]) {
                for (const sz of[-1, 1]) {
                    batcher.addBox(
                        midCenterX + sx * stepW * 0.49,
                        cursorY + stepH * 0.55,
                        midCenterZ + sz * stepD * 0.49,
                        0.55,
                        stepH * 1.12,
                        0.55,
                        0,
                        lightRole,
                        'roof'
                    );
                }
            }
            // Illuminated horizontal trim collar around tier
            if (cfg.crownLighting) {
                batcher.addBox(midCenterX, cursorY + stepH - 0.16, midCenterZ + stepD * 0.5 + 0.08, stepW * 0.92, 0.28, 0.14, 0, 'crownLight', 'roof');
                batcher.addBox(midCenterX, cursorY + stepH - 0.16, midCenterZ - stepD * 0.5 - 0.08, stepW * 0.92, 0.28, 0.14, 0, 'crownLight', 'roof');
            }
            cursorY += stepH;
        }
        summitY = cursorY;
        equipDeckY = crownBaseY;
        equipDeckW = topW * 0.42;
        equipDeckD = topD * 0.42;
    } else if (crownStyle === 'pyramid') {
        const plinthH = Math.min(2.4, crownH * 0.18);
        const plinth = roofBuildLoftedCap(topVerts, crownBaseY, crownBaseY + plinthH, 0.94, 0.94, 0, 0, materials.trim, 'trim');
        if (plinth) parent.add(plinth);
        const pyrVerts = topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * 0.9, y: crownBaseY + plinthH, z: midCenterZ + (v.z - midCenterZ) * 0.9 }));
        const pyr = roofBuildLoftedCap(pyrVerts, crownBaseY + plinthH, crownBaseY + crownH, 0.08, 0.08, 0, 0, materials.crown, 'crown');
        if (pyr) parent.add(pyr);

        // Ridge ribs from corners toward apex
        for (let i = 0; i < Math.min(8, pyrVerts.length); i += Math.max(1, Math.floor(pyrVerts.length / 4))) {
            const v = pyrVerts[i];
            batcher.addBeam([v.x, v.y, v.z], [midCenterX, crownBaseY + crownH, midCenterZ], 0.34, 0.34, lightRole, 'roof');
        }
        summitY = crownBaseY + crownH;
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'slanted') {
        // Only add an extra sloped crown wedge if section itself doesn't already slope strongly, or seamlessly crown its sloped plane
        const slopeBase = Math.abs(topSection.slantedTopDeg || 0) > 6 ? topVerts : topVerts.map((v) => ({ x: v.x, y: maxY, z: v.z }));
        const wedge = roofBuildLoftedCap(slopeBase, minY, maxY + crownH, 0.96, 0.96, 0, crownH * 0.42, materials.crown, 'crown');
        if (wedge) parent.add(wedge);

        // Sloped perimeter bezel rim
        for (let i = 0; i < slopeBase.length; i++) {
            const a = slopeBase[i];
            const b = slopeBase[(i + 1) % slopeBase.length];
            batcher.addBeam([a.x, a.y + 0.3, a.z], [b.x, b.y + 0.3, b.z], 0.55, 0.55, lightRole, 'roof');
        }
        summitY = maxY + crownH * 1.42;
        equipDeckY = minY + 0.4;
    } else if (crownStyle === 'curved') {
        const segs = 6;
        let cursorY = crownBaseY;
        const archH = crownH * (0.65 + curvature * 0.45);
        for (let s = 0; s < segs; s++) {
            const f0 = s / segs;
            const f1 = (s + 1) / segs;
            const w0 = Math.cos(f0 * Math.PI * 0.44);
            const w1 = Math.cos(f1 * Math.PI * 0.44);
            const sliceY0 = crownBaseY + Math.sin(f0 * Math.PI * 0.5) * archH;
            const sliceY1 = crownBaseY + Math.sin(f1 * Math.PI * 0.5) * archH;
            const ring = roofBuildLoftedCap(
                topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * w0, y: sliceY0, z: midCenterZ + (v.z - midCenterZ) * w0 })),
                sliceY0,
                sliceY1,
                w1 / Math.max(0.15, w0),
                Math.max(0.88, lerp(1, 0.85, f1)),
                0,
                0,
                s % 2 === 0 ? materials.crown : materials.glass,
                s % 2 === 0 ? 'crown' : 'glass'
            );
            if (ring) parent.add(ring);
            cursorY = sliceY1;
        }
        if (cfg.crownLighting) {
            batcher.addBox(midCenterX, cursorY + 0.1, midCenterZ, topW * 0.32, 0.25, topD * 0.82, 0, 'crownLight', 'roof');
        }
        summitY = cursorY;
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'domed') {
        const drumH = crownH * 0.32;
        const drumR = Math.min(topW, topD) * 0.38;
        skyCylinder(parent, midCenterX, crownBaseY + drumH * 0.5, midCenterZ, drumR, drumR * 1.04, drumH, materials.crown, 16, {
            layer: 'roof',
            materialRole: 'crown'
        });
        const domeGeo = new THREE.SphereGeometry(drumR * 0.96, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
        const domeMesh = new THREE.Mesh(domeGeo, materials.crown);
        domeMesh.position.set(midCenterX, crownBaseY + drumH, midCenterZ);
        domeMesh.scale.y = clamp((crownH * 0.68) / Math.max(1, drumR), 0.55, 1.85);
        domeMesh.castShadow = true;
        domeMesh.receiveShadow = true;
        domeMesh.userData = { layer: 'roof', materialRole: 'crown' };
        parent.add(domeMesh);

        const domeApex = crownBaseY + drumH + drumR * domeMesh.scale.y;
        skyCylinder(parent, midCenterX, domeApex + 1.1, midCenterZ, drumR * 0.14, drumR * 0.22, 2.2, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
        summitY = domeApex + 2.2;
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'angular_geometric') {
        // Intersecting cantilevered triangular blades & chamfered crown blocks
        const bladeCount = Math.max(2, Math.min(5, crownSteps + 1));
        for (let i = 0; i < bladeCount; i++) {
            const f = i / bladeCount;
            const bh = crownH * (0.58 + f * 0.55);
            const bw = topW * lerp(0.58, 0.32, f);
            const bd = topD * lerp(0.68, 0.34, f);
            const bx = midCenterX + (i % 2 === 0 ? -1 : 1) * topW * 0.16 * (1 - f * 0.5);
            const bz = midCenterZ + (i % 3 === 0 ? 1 : -1) * topD * 0.12;
            const ang = (i % 2 === 0 ? 1 : -1) * degToRad(14 * (1 + curvature));
            const shard = skyBox(parent, bx, crownBaseY + bh * 0.5, bz, bw, bh, bd, i % 2 === 0 ? materials.crown : materials.glass, {
                rotY: ang,
                layer: 'roof',
                materialRole: i % 2 === 0 ? 'crown' : 'glass'
            });
            if (shard) shard.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.08;
            if (cfg.crownLighting) {
                batcher.addBox(bx, crownBaseY + bh + 0.1, bz, bw * 0.9, 0.24, 0.24, ang, 'crownLight', 'roof');
            }
            summitY = Math.max(summitY, crownBaseY + bh);
        }
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'split_crown') {
        // Twin rising shoulder fins with slotted V-notch and recessed buttresses
        const finW = topW * 0.34;
        const finD = topD * 0.88;
        const shoulderX = topW * 0.3;
        const wingPeak = crownH;
        const innerStepH = crownH * 0.58;

        for (const side of[-1, 1]) {
            const sx = midCenterX + side * shoulderX;
            skyBox(parent, sx, crownBaseY + wingPeak * 0.45, midCenterZ, finW, wingPeak * 0.9, finD, materials.crown, {
                layer: 'roof',
                materialRole: 'crown'
            });
            // Outer stepped corner shoulder + inward bevel cap
            skyBox(parent, sx - side * finW * 0.18, crownBaseY + wingPeak * 0.92, midCenterZ, finW * 0.62, wingPeak * 0.22, finD * 0.92, materials.trim, {
                layer: 'roof',
                materialRole: 'trim'
            });
            // Vertical decorative flutes on split crown face
            batcher.addBox(sx, crownBaseY + wingPeak * 0.45, midCenterZ + finD * 0.5 + 0.15, finW * 0.16, wingPeak * 0.92, 0.35, 0, lightRole, 'roof');
            batcher.addBox(sx, crownBaseY + wingPeak * 0.45, midCenterZ - finD * 0.5 - 0.15, finW * 0.16, wingPeak * 0.92, 0.35, 0, lightRole, 'roof');
        }

        // Center recessed lower bridge connecting split cheeks
        skyBox(parent, midCenterX, crownBaseY + innerStepH * 0.5, midCenterZ, topW * 0.36, innerStepH, topD * 0.66, materials.framing, {
            layer: 'roof',
            materialRole: 'framing'
        });
        // Central V-notch needle accents
        batcher.addBeam([midCenterX - topW * 0.14, crownBaseY + innerStepH, midCenterZ + topD * 0.32], [midCenterX, crownBaseY + wingPeak * 0.88, midCenterZ + topD * 0.32], 0.36, 0.45, 'trim', 'roof');
        batcher.addBeam([midCenterX + topW * 0.14, crownBaseY + innerStepH, midCenterZ + topD * 0.32], [midCenterX, crownBaseY + wingPeak * 0.88, midCenterZ + topD * 0.32], 0.36, 0.45, 'trim', 'roof');

        summitY = crownBaseY + wingPeak;
        equipDeckY = crownBaseY + innerStepH;
    } else if (crownStyle === 'open_structural') {
        // Open Perimeter Steel Diagrid / Portal Cage
        const cageH = crownH;
        const inset = 0.92;
        const botPts = topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * inset, y: crownBaseY, z: midCenterZ + (v.z - midCenterZ) * inset }));
        const topPts = topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * (inset * 0.86), y: crownBaseY + cageH, z: midCenterZ + (v.z - midCenterZ) * (inset * 0.86) }));

        for (let i = 0; i < botPts.length; i++) {
            const next = (i + 1) % botPts.length;
            const b0 = botPts[i];
            const b1 = botPts[next];
            const t0 = topPts[i];
            const t1 = topPts[next];
            batcher.addBeam([b0.x, b0.y, b0.z], [t0.x, t0.y, t0.z], 0.52, 0.52, 'framing', 'roof');
            batcher.addBeam([t0.x, t0.y, t0.z], [t1.x, t1.y, t1.z], 0.58, 0.62, lightRole, 'roof');
            batcher.addBeam([b0.x, b0.y, b0.z], [t1.x, t1.y, t1.z], 0.24, 0.24, 'trim', 'roof');
        }
        // Cross tie beams overhead
        batcher.addBeam([midCenterX - topW * 0.38, crownBaseY + cageH, midCenterZ], [midCenterX + topW * 0.38, crownBaseY + cageH, midCenterZ], 0.45, 0.48, 'framing', 'roof');
        batcher.addBeam([midCenterX, crownBaseY + cageH, midCenterZ - topD * 0.38], [midCenterX, crownBaseY + cageH, midCenterZ + topD * 0.38], 0.45, 0.48, 'framing', 'roof');
        summitY = crownBaseY + cageH;
        equipDeckY = crownBaseY;
    }

    const spireStyle = cfg.spireStyle || 'none';
    const hasSpire = spireStyle !== 'none';
    roofBuildRooftopEquipment(parent, batcher, materials, midCenterX, equipDeckY, midCenterZ, equipDeckW, equipDeckD, cfg, hasSpire);

    let spireTopY = summitY;
    if (hasSpire) {
        const spireH = clamp(Number(cfg.spireHeight) || 24, 4, 80);
        const spireR = clamp(Math.min(topW, topD) * 0.08, 0.65, 2.8);
        spireTopY = roofBuildSpire(parent, batcher, materials, midCenterX, summitY - 0.3, midCenterZ, spireStyle, spireH, spireR);
    }

    return {
        crownBaseY,
        crownTopY: summitY,
        spireTopY,
        topY: Math.max(summitY, spireTopY),
        maxSpan: Math.max(topW, topD)
    };
}


/* --- geometry/bridges.js --- */
function buildSkybridgesAndTrusses(parent, complex, cfg, batcher, materials) {
  const skybridges = complex.skybridges || [];
  const trusses = complex.trusses || [];

  // 1. Enclosed / Open / Trussed Skybridges
  for (let i = 0; i < skybridges.length; i++) {
    const sb = skybridges[i];
    const dx = sb.end.x - sb.start.x;
    const dz = sb.end.z - sb.start.z;
    const span = Math.hypot(dx, dz);
    if (span < 1.2) continue;

    const ux = dx / span;
    const uz = dz / span;
    const px = -uz;
    const pz = ux;
    const yaw = Math.atan2(ux, uz);

    const mx = (sb.start.x + sb.end.x) * 0.5;
    const mz = (sb.start.z + sb.end.z) * 0.5;
    const y0 = sb.elevationY;
    const bh = sb.height;
    const bw = sb.width;
    const halfW = bw * 0.5;

    // Structural floor deck + twin underside girders
    batcher.addBox(mx, y0 + 0.22, mz, bw, 0.44, span, yaw, 'framing', 'bridge');
    // Wall attachment portal collars framing bridge entry into each tower facade
    for (const endPt of [sb.start, sb.end]) {
      batcher.addBox(endPt.x, y0 + bh * 0.5, endPt.z, bw + 0.95, bh + 0.72, 1.35, yaw, 'framing', 'bridge');
      batcher.addBox(endPt.x, y0 + bh + 0.28, endPt.z, bw + 1.2, 0.3, 1.5, yaw, 'trim', 'bridge');
      batcher.addBox(endPt.x, y0 - 0.16, endPt.z, bw + 1.2, 0.32, 1.5, yaw, 'trim', 'bridge');
    }
    batcher.addBox(
      mx + px * (halfW - 0.35),
      y0 - 0.18,
      mz + pz * (halfW - 0.35),
      0.34,
      0.42,
      span,
      yaw,
      'darkMetal',
      'bridge'
    );
    batcher.addBox(
      mx - px * (halfW - 0.35),
      y0 - 0.18,
      mz - pz * (halfW - 0.35),
      0.34,
      0.42,
      span,
      yaw,
      'darkMetal',
      'bridge'
    );

    if (sb.enclosed) {
      // Roof deck
      batcher.addBox(mx, y0 + bh - 0.2, mz, bw + 0.2, 0.4, span, yaw, 'trim', 'bridge');

      const bayCount = clamp(Math.round(span / 2.6), 2, 16);
      const bayLen = span / bayCount;
      const wallRole = sb.glass ? 'glass' : 'secondary';
      const wallY = y0 + bh * 0.5;
      const wallH = bh - 0.85;

      for (const side of [-1, 1]) {
        const lateral = side * (halfW - 0.14);
        const sx0 = sb.start.x + px * lateral;
        const sz0 = sb.start.z + pz * lateral;
        const ex0 = sb.end.x + px * lateral;
        const ez0 = sb.end.z + pz * lateral;

        // Top and bottom spandrel headers
        batcher.addBox(mx + px * lateral, y0 + 0.58, mz + pz * lateral, 0.24, 0.34, span, yaw, 'trim', 'bridge');
        batcher.addBox(mx + px * lateral, y0 + bh - 0.48, mz + pz * lateral, 0.24, 0.34, span, yaw, 'trim', 'bridge');

        for (let b = 0; b < bayCount; b++) {
          const bf = (b + 0.5) / bayCount;
          const bx = lerp(sb.start.x, sb.end.x, bf) + px * lateral;
          const bz = lerp(sb.start.z, sb.end.z, bf) + pz * lateral;
          const paneRole = sb.glass && (b + i) % 3 === 0 ? 'glassWarm' : wallRole;
          batcher.addBox(bx, wallY, bz, 0.16, wallH, bayLen * 0.9, yaw, paneRole, 'bridge');

          // Vertical mullion post at bay boundary
          const pf = b / bayCount;
          const postX = lerp(sx0, ex0, pf);
          const postZ = lerp(sz0, ez0, pf);
          batcher.addBox(postX, wallY, postZ, 0.22, bh - 0.4, 0.2, yaw, 'mullion', 'bridge');
        }
      }
    } else {
      // Open-air pedestrian bridge: safety balustrades + handrail posts
      for (const side of [-1, 1]) {
        const lat = side * (halfW - 0.18);
        batcher.addBox(mx + px * lat, y0 + 1.18, mz + pz * lat, 0.14, 0.14, span, yaw, 'trim', 'bridge');
        const posts = clamp(Math.round(span / 2.2), 2, 16);
        for (let p = 0; p <= posts; p++) {
          const f = p / posts;
          batcher.addBox(
            lerp(sb.start.x, sb.end.x, f) + px * lat,
            y0 + 0.72,
            lerp(sb.start.z, sb.end.z, f) + pz * lat,
            0.14,
            0.95,
            0.14,
            yaw,
            'framing',
            'bridge'
          );
        }
      }
    }

    // Structural Warren / X-brace truss along skybridge flanks
    if (sb.trusses) {
      const trussBays = clamp(Math.round(span / 3.4), 2, 12);
      for (const side of [-1, 1]) {
        const lat = side * (halfW + 0.14);
        const ax = sb.start.x + px * lat;
        const az = sb.start.z + pz * lat;
        const bx = sb.end.x + px * lat;
        const bz = sb.end.z + pz * lat;

        batcher.addBeam([ax, y0 + 0.2, az], [bx, y0 + 0.2, bz], 0.24, 0.26, 'framing', 'bridge');
        batcher.addBeam([ax, y0 + bh - 0.2, az], [bx, y0 + bh - 0.2, bz], 0.24, 0.26, 'framing', 'bridge');

        for (let tb = 0; tb < trussBays; tb++) {
          const f0 = tb / trussBays;
          const f1 = (tb + 1) / trussBays;
          const p0 = [lerp(ax, bx, f0), y0 + 0.2, lerp(az, bz, f0)];
          const p1 = [lerp(ax, bx, f1), y0 + 0.2, lerp(az, bz, f1)];
          const q0 = [lerp(ax, bx, f0), y0 + bh - 0.2, lerp(az, bz, f0)];
          const q1 = [lerp(ax, bx, f1), y0 + bh - 0.2, lerp(az, bz, f1)];
          batcher.addBeam(p0, q1, 0.18, 0.18, 'darkMetal', 'bridge');
          batcher.addBeam(q0, p1, 0.18, 0.18, 'darkMetal', 'bridge');
          batcher.addBeam(p1, q1, 0.2, 0.2, 'framing', 'bridge');
        }
      }

      // Angled knee-braces anchoring underside into tower walls
      const kneeDrop = Math.min(4.2, sb.spanLength * 0.28);
      const kneeOut = Math.min(3.6, sb.spanLength * 0.24);
      for (const side of [-1, 1]) {
        const lat = side * (halfW - 0.2);
        batcher.addBeam(
          [sb.start.x + px * lat, y0 - kneeDrop, sb.start.z + pz * lat],
          [sb.start.x + ux * kneeOut + px * lat, y0, sb.start.z + uz * kneeOut + pz * lat],
          0.26,
          0.26,
          'darkMetal',
          'bridge'
        );
        batcher.addBeam(
          [sb.end.x + px * lat, y0 - kneeDrop, sb.end.z + pz * lat],
          [sb.end.x - ux * kneeOut + px * lat, y0, sb.end.z - uz * kneeOut + pz * lat],
          0.26,
          0.26,
          'darkMetal',
          'bridge'
        );
      }
    }
  }

  // 2. Inter-Tower Multi-Story Open X-Brace Truss Frame
  for (const t of trusses) {
    const dx = t.end.x - t.start.x;
    const dz = t.end.z - t.start.z;
    const span = Math.hypot(dx, dz);
    if (span < 1.5) continue;

    const px = -dz / span;
    const pz = dx / span;
    const halfD = t.depth * 0.5;
    const levels = t.levels;
    const h = t.topY - t.bottomY;

    for (let lv = 0; lv < levels; lv++) {
      const y0 = t.bottomY + (lv / levels) * h;
      const y1 = t.bottomY + ((lv + 1) / levels) * h;

      for (const side of [-1, 1]) {
        const lat = side * halfD;
        const a0 = [t.start.x + px * lat, y0, t.start.z + pz * lat];
        const b0 = [t.end.x + px * lat, y0, t.end.z + pz * lat];
        const a1 = [t.start.x + px * lat, y1, t.start.z + pz * lat];
        const b1 = [t.end.x + px * lat, y1, t.end.z + pz * lat];

        batcher.addBeam(a0, b0, 0.34, 0.36, 'framing', 'bridge');
        if (lv === levels - 1) {
          batcher.addBeam(a1, b1, 0.36, 0.38, 'framing', 'bridge');
        }
        batcher.addBeam(a0, b1, 0.28, 0.28, 'darkMetal', 'bridge');
        batcher.addBeam(b0, a1, 0.28, 0.28, 'darkMetal', 'bridge');
      }

      // Cross-tie struts joining front and back truss faces
      batcher.addBeam(
        [(t.start.x + t.end.x) * 0.5 - px * halfD, y0, (t.start.z + t.end.z) * 0.5 - pz * halfD],
        [(t.start.x + t.end.x) * 0.5 + px * halfD, y0, (t.start.z + t.end.z) * 0.5 + pz * halfD],
        0.26,
        0.26,
        'framing',
        'bridge'
      );
    }

    // Structural truss anchor shoes at tower facades
    const trussYaw = Math.atan2(dx / span, dz / span);
    const trussMidY = (t.bottomY + t.topY) * 0.5;
    for (const endPt of [t.start, t.end]) {
      batcher.addBox(endPt.x, trussMidY, endPt.z, t.depth + 0.9, h + 0.8, 1.15, trussYaw, 'framing', 'bridge');
    }
  }
}


/* --- geometry/podiums.js --- */
function podiumBuildTreePlanter(parent, batcher, materials, x, y, z) {
  batcher.addBox(x, y + 0.35, z, 2.2, 0.7, 2.2, 0, 'podium', 'ground');
  batcher.addBox(x, y + 0.72, z, 1.9, 0.14, 1.9, 0, 'trim', 'ground');

  const greenMat = materials.crown;
  const trunkMat = materials.darkMetal;
  skyCylinder(parent, x, y + 1.35, z, 0.12, 0.16, 1.25, trunkMat, 6, {
    layer: 'ground',
    materialRole: 'darkMetal'
  });

  const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), greenMat);
  foliage.position.set(x, y + 2.35, z);
  foliage.scale.set(1.05, 1.25, 1.05);
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  foliage.userData = { layer: 'ground', materialRole: 'secondary' };
  parent.add(foliage);
}

function podiumBuildMainDoorway(parent, batcher, materials, ent, cfg) {
  const { x, y, z } = ent.position;
  const dw = ent.doorSize.width;
  const dh = ent.doorSize.height;
  const style = ent.style || 'revolving_door';

  if (style === 'monumental_arch') {
    // Tall Art Deco stepped arch surround
    const archH = dh * 1.65;
    const archW = dw * 1.45;
    batcher.addBox(x, y + dh * 0.5, z + 0.25, dw, dh, 0.35, 0, 'glassWarm', 'ground');
    batcher.addBox(x, y + archH * 0.5, z + 0.12, archW + 1.2, archH, 0.45, 0, 'trim', 'ground');
    batcher.addBox(x, y + archH + 0.35, z + 0.4, archW * 0.72, 1.1, 0.65, 0, 'framing', 'ground');
    for (let j = -2; j <= 2; j++) {
      batcher.addBox(x + j * (dw * 0.24), y + dh * 0.55, z + 0.45, 0.16, dh, 0.24, 0, 'mullion', 'ground');
    }
    const ringArch = skyCylinder(parent, x, y + dh + 0.25, z + 0.35, archW * 0.42, archW * 0.42, 0.55, materials.trim, 12, {
      layer: 'ground',
      materialRole: 'trim'
    });
    if (ringArch) {
      ringArch.rotation.x = Math.PI * 0.5;
      ringArch.scale.set(1.0, 0.55, 1.0);
    }
  } else if (style === 'oval_canopy') {
    // Crescent oval marquee canopy with tension rods
    batcher.addBox(x, y + dh * 0.5, z + 0.2, dw, dh, 0.32, 0, 'glassWarm', 'ground');
    const oval = skyCylinder(parent, x, y + dh + 0.25, z + 1.4, dw * 0.68, dw * 0.68, 0.42, materials.trim, 18, {
      layer: 'ground',
      materialRole: 'trim'
    });
    if (oval) {
      oval.scale.set(1.18, 1, 0.68);
    }
    // Tension tie rods up to transom
    batcher.addBeam([x - dw * 0.42, y + dh + 0.4, z + 2.2], [x - dw * 0.35, y + dh + 2.6, z + 0.1], 0.08, 0.08, 'darkMetal', 'ground');
    batcher.addBeam([x + dw * 0.42, y + dh + 0.4, z + 2.2], [x + dw * 0.35, y + dh + 2.6, z + 0.1], 0.08, 0.08, 'darkMetal', 'ground');
    for (let j = -1; j <= 1; j++) {
      batcher.addBox(x + j * (dw * 0.3), y + dh * 0.5, z + 0.38, 0.15, dh, 0.2, 0, 'mullion', 'ground');
    }
  } else if (style === 'glass_curtain_lobby') {
    // High-clarity double-height glass lobby volume
    const lobH = dh * 1.4;
    batcher.addBox(x, y + lobH * 0.5, z + 0.75, dw * 1.25, lobH, 1.5, 0, 'glassWarm', 'ground');
    batcher.addBox(x, y + lobH + 0.16, z + 1.1, dw * 1.35, 0.3, 2.3, 0, 'trim', 'ground');
    for (let j = -2; j <= 2; j++) {
      batcher.addBox(x + j * (dw * 0.28), y + lobH * 0.5, z + 1.52, 0.14, lobH, 0.18, 0, 'mullion', 'ground');
    }
  } else if (style === 'recessed_colonnade') {
    batcher.addBox(x, y + dh * 0.5, z + 0.05, dw * 1.15, dh, 0.28, 0, 'glassWarm', 'ground');
    for (const px of [-dw * 0.62, -dw * 0.25, dw * 0.25, dw * 0.62]) {
      batcher.addBox(x + px, y + dh * 0.62, z + 1.15, 0.62, dh * 1.24, 0.62, 0, 'podium', 'ground');
    }
    batcher.addBox(x, y + dh * 1.26, z + 0.9, dw * 1.48, 0.65, 1.7, 0, 'trim', 'ground');
  } else {
    // Classic revolving door drum + steel vestibule
    batcher.addBox(x, y + dh * 0.5, z + 0.16, dw, dh, 0.3, 0, 'glassWarm', 'ground');
    skyCylinder(parent, x, y + dh * 0.42, z + 0.95, 1.35, 1.35, dh * 0.84, materials.glassWarm, 14, {
      layer: 'ground',
      materialRole: 'glassWarm'
    });
    batcher.addBox(x, y + dh * 0.88, z + 0.95, 3.2, 0.32, 2.2, 0, 'trim', 'ground');
    for (const s of [-1, 1]) {
      batcher.addBox(x + s * (dw * 0.42), y + dh * 0.5, z + 0.3, 0.28, dh, 0.36, 0, 'framing', 'ground');
    }
  }

  // Optional rectangular projecting entrance canopy for styles that didn't draw oval
  if (cfg.entranceCanopy && style !== 'oval_canopy' && style !== 'glass_curtain_lobby') {
    batcher.addBox(x, y + dh + 0.16, z + 1.35, dw * 1.3, 0.28, 2.6, 0, 'trim', 'ground');
    batcher.addBeam([x - dw * 0.5, y + dh + 0.24, z + 2.3], [x - dw * 0.5, y + dh + 2.1, z + 0.1], 0.08, 0.08, 'darkMetal', 'ground');
    batcher.addBeam([x + dw * 0.5, y + dh + 0.24, z + 2.3], [x + dw * 0.5, y + dh + 2.1, z + 0.1], 0.08, 0.08, 'darkMetal', 'ground');
  }

  // Monumental staircase approaching primary entrance
  if (cfg.monumentalStairs) {
    const steps = 5;
    const stairH = Math.max(0.85, y > 0.2 ? y : 1.0);
    const stairD = 2.8;
    const stairW = dw * 1.45;
    for (let s = 0; s < steps; s++) {
      const f = (s + 1) / steps;
      const sh = (stairH / steps) * (s + 1);
      const sz = z + 0.45 + (steps - s) * (stairD / steps) * 0.5;
      batcher.addBox(x, Math.max(0, y - stairH) + sh * 0.5, sz, stairW, sh, stairD / steps + 0.15, 0, 'podium', 'ground');
    }
    // Cheek walls flanking stairs
    batcher.addBox(x - stairW * 0.52, Math.max(0, y - stairH) + stairH * 0.65, z + 0.65 + stairD * 0.35, 0.45, stairH * 0.9, stairD, 0, 'trim', 'ground');
    batcher.addBox(x + stairW * 0.52, Math.max(0, y - stairH) + stairH * 0.65, z + 0.65 + stairD * 0.35, 0.45, stairH * 0.9, stairD, 0, 'trim', 'ground');
  }

  // Building nameplate signboard on primary entrance only
  if (ent.role === 'primary' && cfg.signEnabled) {
    const signGroup = skyRoot(parent, x, y + dh + 1.05, z + 2.65);
    skySignboard(
      signGroup,
      cfg.signText || 'Skyscraper',
      clamp(dw * 0.85, 3.2, 6.4),
      1.05,
      '#18222e',
      '#edf6ff',
      { frameMaterial: materials.trim }
    );
  }
}

function buildGroundAndPodiums(parent, complex, entrances, cfg, batcher, materials) {
  const plaza = complex.plaza;
  const podium = complex.podium;

  // 1. Urban Ground Plaza Deck
  if (plaza.enabled) {
    skyBox(parent, complex.footprintBounds.centerX, -0.24, complex.footprintBounds.centerZ, plaza.width, 0.48, plaza.depth, materials.plaza, {
      layer: 'ground',
      materialRole: 'plaza'
    });
    // Perimeter granite coping border
    const hw = plaza.width * 0.5;
    const hd = plaza.depth * 0.5;
    const cx = complex.footprintBounds.centerX;
    const cz = complex.footprintBounds.centerZ;
    batcher.addBox(cx, 0.04, cz + hd - 0.3, plaza.width, 0.14, 0.6, 0, 'trim', 'ground');
    batcher.addBox(cx, 0.04, cz - hd + 0.3, plaza.width, 0.14, 0.6, 0, 'trim', 'ground');
    batcher.addBox(cx - hw + 0.3, 0.04, cz, 0.6, 0.14, plaza.depth, 0, 'trim', 'ground');
    batcher.addBox(cx + hw - 0.3, 0.04, cz, 0.6, 0.14, plaza.depth, 0, 'trim', 'ground');

    // Plaza approach steps & ADA ramp along street (+Z)
    if (cfg.plazaStepsAndRamps) {
      for (let s = 0; s < 3; s++) {
        batcher.addBox(
          cx,
          -0.18 + s * 0.09,
          cz + hd + 0.9 - s * 0.45,
          plaza.width * 0.45,
          0.16,
          0.52,
          0,
          'podium',
          'ground'
        );
      }
      // ADA Ramp with metal handrail
      batcher.addBeam([cx + plaza.width * 0.28, -0.18, cz + hd + 1.6], [cx + plaza.width * 0.38, 0.04, cz + hd - 0.4], 2.2, 0.18, 'plaza', 'ground');
      batcher.addBeam([cx + plaza.width * 0.28 + 1.0, 0.72, cz + hd + 1.6], [cx + plaza.width * 0.38 + 1.0, 0.94, cz + hd - 0.4], 0.08, 0.08, 'trim', 'ground');
    }
  }

  // 2. Shared / Raised Podium Terrace
  if (podium.enabled && podium.height > 0.05) {
    skyBox(parent, podium.centerX, podium.height * 0.5, podium.centerZ, podium.width, podium.height, podium.depth, materials.podium, {
      layer: 'ground',
      materialRole: 'podium'
    });
    batcher.addBox(podium.centerX, podium.height + 0.15, podium.centerZ + podium.depth * 0.5 - 0.18, podium.width, 0.3, 0.36, 0, 'trim', 'ground');
  }

  // 3. Connected Podium Concourse Bridge Building (between multi-towers)
  if (podium.connected && complex.towers.length >= 2) {
    const t0 = complex.towers[0];
    const t1 = complex.towers[1];
    const spanX = Math.max(8, Math.abs(t1.x - t0.x));
    const midX = (t0.x + t1.x) * 0.5;
    const midZ = (t0.z + t1.z) * 0.5;
    const connH = clamp((t0.stack.sections[0]?.height || 9) * 0.75, 4.5, 11);
    const connD = Math.min(t0.bounds.depth, t1.bounds.depth) * 0.65;

    skyBox(parent, midX, podium.height + connH * 0.5, midZ, spanX, connH, connD, materials.podium, {
      layer: 'ground',
      materialRole: 'podium'
    });
    batcher.addBox(midX, podium.height + connH * 0.5, midZ + connD * 0.5 + 0.08, spanX * 0.78, connH * 0.72, 0.14, 0, 'glassWarm', 'ground');
    batcher.addBox(midX, podium.height + connH + 0.2, midZ, spanX + 0.8, 0.4, connD + 0.8, 0, 'trim', 'ground');
  }

  // 4. Tower Street-Level Details: Entrances, Colonnades, Storefronts, Service Docks
  for (const ent of entrances) {
    if (ent.role === 'primary' || ent.role === 'secondary_lobby' || ent.role === 'podium_portal') {
      podiumBuildMainDoorway(parent, batcher, materials, ent, cfg);
    } else if (ent.role === 'service') {
      const { x, y, z } = ent.position;
      batcher.addBox(x - 0.15, y + 2.0, z, 0.4, 4.0, 5.2, 0, 'darkMetal', 'ground');
      batcher.addBox(x - 0.7, y + 0.38, z, 1.4, 0.76, 5.6, 0, 'podium', 'ground');
      batcher.addBox(x - 0.45, y + 4.15, z, 1.2, 0.35, 5.8, 0, 'trim', 'ground');
    } else if (ent.role === 'parking') {
      const { x, y, z } = ent.position;
      batcher.addBox(x + 0.15, y + 1.8, z, 0.4, 3.6, 6.0, 0, 'darkMetal', 'ground');
      batcher.addBox(x + 0.6, y + 3.65, z, 1.4, 0.4, 6.5, 0, 'framing', 'ground');
      batcher.addBeam([x + 0.4, y + 0.05, z - 1.2], [x + 3.2, y - 0.3, z + 3.2], 5.0, 0.25, 'podium', 'ground');
    }
  }

  for (const tower of complex.towers) {
    const baseSec = tower.stack.sections[0];
    if (!baseSec) continue;
    const tb = tower.bounds;
    const baseY = tower.stack.baseElevation || 0;
    const groundH = clamp(baseSec.floorHeight || 4.2, 3.2, 7.2);

    // Exterior Ground Colonnade Columns along front/back street perimeter
    if (cfg.exteriorColumns) {
      const cols = Math.max(3, Math.round(tb.width / 5.5));
      for (let c = 0; c <= cols; c++) {
        const cx = tb.minX + 0.6 + (c / cols) * Math.max(2, tb.width - 1.2);
        batcher.addBox(cx, baseY + groundH * 0.5, tb.maxZ + 0.55, 0.58, groundH, 0.58, 0, 'podium', 'ground');
      }
      batcher.addBox((tb.minX + tb.maxX) * 0.5, baseY + groundH + 0.25, tb.maxZ + 0.55, tb.width + 0.6, 0.5, 1.1, 0, 'trim', 'ground');
    }

    // Retail storefront glazing along left & right wings outside lobby portal
    if (cfg.retailStorefronts && tb.width >= 16) {
      const bayW = Math.min(5.2, tb.width * 0.22);
      for (const s of [-1, 1]) {
        const sx = tower.x + s * (tb.width * 0.34);
        batcher.addBox(sx, baseY + groundH * 0.48, tb.maxZ + 0.16, bayW, groundH * 0.72, 0.2, 0, 'glassWarm', 'ground');
        batcher.addBox(sx, baseY + groundH * 0.88, tb.maxZ + 0.35, bayW + 0.4, 0.24, 0.65, 0, 'trim', 'ground');
      }
    }
  }

  // 5. Decorative Planters & Urban Street Trees
  const pCount = clamp(Math.round(Number(cfg.plantersCount) || 0), 0, 16);
  if (pCount > 0) {
    const fb = complex.footprintBounds;
    const frontZ = fb.maxZ + 4.8;
    const spanW = Math.max(18, fb.width + 6);
    for (let i = 0; i < pCount; i++) {
      const row = i < Math.ceil(pCount * 0.7) ? 0 : 1;
      const idx = row === 0 ? i : i - Math.ceil(pCount * 0.7);
      const countInRow = row === 0 ? Math.ceil(pCount * 0.7) : Math.max(1, pCount - Math.ceil(pCount * 0.7));
      const frac = countInRow === 1 ? 0.5 : idx / (countInRow - 1);
      let px = fb.centerX + (frac - 0.5) * spanW;
      // Leave clear central avenue in front of main door
      if (Math.abs(px - fb.centerX) < 4.5) px += (px >= fb.centerX ? 4.8 : -4.8);
      const pz = row === 0 ? frontZ : fb.minZ - 4.4;
      podiumBuildTreePlanter(parent, batcher, materials, px, 0, pz);
    }
  }

  // 6. Exterior Plaza Lighting Standards
  if (cfg.exteriorGroundLights) {
    const fb = complex.footprintBounds;
    const posts = Math.min(6, Math.max(2, complex.towers.length * 2));
    for (let i = 0; i < posts; i++) {
      const f = posts === 1 ? 0.5 : i / (posts - 1);
      const lx = fb.centerX + (f - 0.5) * Math.max(20, fb.width + 8);
      const lz = fb.maxZ + 6.5;
      skyCylinder(parent, lx, 2.2, lz, 0.08, 0.12, 4.4, materials.darkMetal, 8, {
        layer: 'ground',
        materialRole: 'darkMetal'
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), materials.crownLight);
      bulb.position.set(lx, 4.55, lz);
      bulb.userData = { layer: 'ground', materialRole: 'crownLight' };
      parent.add(bulb);
    }
  }
}


/* --- geometry/skyscraper.js --- */
function createSkyscraper(rawCfg, options = {}) {
  const cfg = sanitiseConfig(rawCfg);
  const complex = resolveTowerComplex(cfg);
  const entrances = computeSkyscraperEntrances(cfg, complex);
  const materials = resolveMaterialBundle(cfg, options.lightingTime);

  const root = new THREE.Group();
  root.name = `Skyscraper_${cfg.style}_${cfg.seed}`;

  let maxCrownTopY = 0;
  let maxOverallTopY = 0;
  let totalBatchedInstances = 0;

  // Build each tower in local space before applying offset/rotation
  for (const tower of complex.towers) {
    const towerGroup = new THREE.Group();
    towerGroup.name = `Tower_${tower.index}`;
    towerGroup.position.set(tower.x, 0, tower.z);
    towerGroup.rotation.y = degToRad(tower.rotDeg || 0);
    root.add(towerGroup);

    const towerBatcher = new SkyscraperBatcher();

    for (let si = 0; si < tower.stack.sections.length; si++) {
      const sec = tower.stack.sections[si];
      const matRole = sec.materialRole || 'primary';
      const secMat = materials[matRole] || materials.primary;
      const coreMesh = buildSectionCoreMesh(sec, secMat, matRole, 'structure');
      if (coreMesh) {
        coreMesh.name = `Tower_${tower.index}_Section_${sec.index}_${sec.role}`;
        towerGroup.add(coreMesh);
      }

      if (si > 0) {
        const prevSec = tower.stack.sections[si - 1];
        const collarMesh = buildSectionTransitionMesh(prevSec, sec, towerBatcher, materials, cfg);
        if (collarMesh) {
          collarMesh.name = `Tower_${tower.index}_Transition_${si}`;
          towerGroup.add(collarMesh);
        }
      }

      generateSectionFacades(towerBatcher, sec, cfg, tower.index);
    }

    const topSection = tower.stack.sections[tower.stack.sections.length - 1];
    let crownMetrics = null;
    if (topSection) {
      crownMetrics = buildTowerCrownAndRoof(towerGroup, topSection, cfg, tower, towerBatcher, materials);
      maxCrownTopY = Math.max(maxCrownTopY, crownMetrics.crownTopY);
      maxOverallTopY = Math.max(maxOverallTopY, crownMetrics.topY);
    }

    towerBatcher.finalize(towerGroup, materials);
    totalBatchedInstances += towerBatcher.instanceCount;
  }

  // World-space complex bridges, trusses, plazas, podiums, and entrances
  const complexBatcher = new SkyscraperBatcher();
  buildSkybridgesAndTrusses(root, complex, cfg, complexBatcher, materials);
  buildGroundAndPodiums(root, complex, entrances, cfg, complexBatcher, materials);
  complexBatcher.finalize(root, materials);
  totalBatchedInstances += complexBatcher.instanceCount;

  // Measure draw calls and triangle counts for studio telemetry & blueprint metadata
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    meshCount++;
    const g = obj.geometry;
    if (g.index) triangleCount += g.index.count / 3;
    else if (g.attributes?.position) triangleCount += g.attributes.position.count / 3;
  });

  const crownMetrics = {
    crownTopY: maxCrownTopY || complex.maxTowerHeight,
    topY: maxOverallTopY || complex.maxTowerHeight
  };

  const blueprint = generateSkyscraperBlueprint(cfg, {
    complex,
    entrances,
    crownMetrics,
    geometryStats: {
      drawCalls: meshCount,
      batchedPrimitives: totalBatchedInstances,
      triangles: Math.round(triangleCount)
    }
  });

  root.userData.blueprint = blueprint;
  root.userData.complex = complex;
  return root;
}


/* --- studio/preview.js --- */
function disposeObject(obj) {
  if (!obj) return;
  while (obj.children.length > 0) {
    const child = obj.children[0];
    obj.remove(child);
    disposeObject(child);
  }
  if (obj.geometry) {
    obj.geometry.dispose();
  }
  if (obj.userData?._tex) {
    obj.userData._tex.dispose();
  }
  if (obj.userData?._ownedMat && obj.material) {
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
    else obj.material.dispose();
  }
}

function previewMakeLabelSprite(text, bgColor = '#0c2334', borderColor = '#4de2ff') {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 68;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 320, 68);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 314, 62);
    ctx.fillStyle = '#edf8ff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text || '').slice(0, 24), 160, 35);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(9.5, 2.1, 1);
  sprite.userData = { _tex: tex, _ownedMat: true };
  return sprite;
}

function buildSkyscraperDebugGizmos(skyscraperGroup, state) {
  const root = new THREE.Group();
  root.name = 'SkyscraperDebugGizmos';
  if (!skyscraperGroup?.userData?.blueprint) return root;

  const bp = skyscraperGroup.userData.blueprint;
  const complex = skyscraperGroup.userData.complex;

  // Entrance & Service Portal Markers
  for (const ent of bp.entrances || []) {
    const { x, y, z } = ent.position;
    const isMain = ent.role === 'primary' || ent.role === 'podium_portal';
    const col = isMain ? '#3af0b8' : ent.role === 'service' ? '#ffb74d' : '#64b5f6';

    const ringGeo = new THREE.RingGeometry(
      Math.max(0.4, (ent.interactionRadius || 3) - 0.16),
      ent.interactionRadius || 3,
      24
    );
    const ringMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.set(x, y + 0.12, z);
    ring.userData = { _ownedMat: true };
    root.add(ring);

    const f = ent.facing || { x: 0, y: 0, z: 1 };
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(f.x, f.y, f.z).normalize(),
      new THREE.Vector3(x, y + 0.8, z),
      4.2,
      new THREE.Color(col).getHex(),
      1.0,
      0.55
    );
    root.add(arrow);

    const lbl = previewMakeLabelSprite(
      ent.role === 'primary' ? 'Main Lobby' : ent.role === 'service' ? 'Loading Dock' : ent.role === 'parking' ? 'Parking Entry' : 'Portal',
      '#081d2b',
      col
    );
    lbl.position.set(x, y + 5.8, z);
    root.add(lbl);
  }

  const deg2Rad = Math.PI / 180;
  const makeXZLoop = (ptsXZ, yPos, colorHex) => {
    const vecs = ptsXZ.map(([px, pz]) => new THREE.Vector3(px, yPos, pz));
    const geo = new THREE.BufferGeometry().setFromPoints(vecs);
    const mat = new THREE.LineBasicMaterial({ color: colorHex });
    const loop = new THREE.LineLoop(geo, mat);
    loop.userData = { _ownedMat: true };
    return loop;
  };

  const getLocalSectionOutline = (sec) => {
    const hw = Math.max(0.5, (sec.width || 10) * 0.5);
    const hd = Math.max(0.5, (sec.depth || 10) * 0.5);
    const fp = sec.footprint || 'rectangle';
    if (fp === 'circle' || fp === 'ellipse') {
      const pts = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        pts.push([Math.cos(a) * hw, Math.sin(a) * hd]);
      }
      return pts;
    }
    if (fp === 'octagon') {
      const c = 0.4142;
      return [
        [-hw * c, -hd], [hw * c, -hd], [hw, -hd * c], [hw, hd * c],
        [hw * c, hd], [-hw * c, hd], [-hw, hd * c], [-hw, -hd * c]
      ];
    }
    if (fp === 'triangle' || fp === 'triangular_wedge') {
      return [[0, -hd], [hw, hd], [-hw, hd]];
    }
    return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  };

  const transformToWorldXZ = (lx, lz, sec, tower) => {
    const sRad = (sec.rotationDeg || sec.rotDeg || 0) * deg2Rad;
    const mirrorSign = tower.mirrorX ? -1 : 1;
    const sx = (lx * Math.cos(sRad) + lz * Math.sin(sRad) + (sec.offsetX || 0)) * mirrorSign;
    const sz = -lx * Math.sin(sRad) + lz * Math.cos(sRad) + (sec.offsetZ || 0);
    const tRad = (tower.rotDeg || 0) * deg2Rad;
    const tx = tower.x ?? tower.centerX ?? 0;
    const tz = tower.z ?? tower.centerZ ?? 0;
    return [
      sx * Math.cos(tRad) + sz * Math.sin(tRad) + tx,
      -sx * Math.sin(tRad) + sz * Math.cos(tRad) + tz
    ];
  };

  // Per-Tower Section Boundary Loops & Cantilever Support Indicators
  for (const tower of complex?.towers || []) {
    const secs = tower.stack?.sections || tower.sections || [];
    for (const sec of secs) {
      const diag = sec.transitionDiagnostics || {};
      const isCantilever = Boolean(diag.clamped || diag.needsCantileverSupport || sec.transitionMode === 'supported_cantilever');
      const loopColor = isCantilever ? '#f59e0b' : '#38bdf8';
      const localPts = getLocalSectionOutline(sec);
      const worldPts = localPts.map(([lx, lz]) => transformToWorldXZ(lx, lz, sec, tower));
      root.add(makeXZLoop(worldPts, sec.baseElevation + 0.06, loopColor));
      root.add(makeXZLoop(worldPts, sec.topElevation - 0.04, loopColor));

      if (isCantilever) {
        const [cx, cz] = transformToWorldXZ(0, 0, sec, tower);
        const cornerStride = Math.max(1, Math.floor(worldPts.length / 4));
        const strutVerts = [];
        for (let i = 0; i < worldPts.length; i += cornerStride) {
          const [wx, wz] = worldPts[i];
          const inX = cx + (wx - cx) * 0.72;
          const inZ = cz + (wz - cz) * 0.72;
          strutVerts.push(new THREE.Vector3(wx, sec.baseElevation, wz), new THREE.Vector3(inX, Math.max(0, sec.baseElevation - 2.2), inZ));
        }
        const strutGeo = new THREE.BufferGeometry().setFromPoints(strutVerts);
        const strutMat = new THREE.LineBasicMaterial({ color: '#f59e0b' });
        const strutLines = new THREE.LineSegments(strutGeo, strutMat);
        strutLines.userData = { _ownedMat: true };
        root.add(strutLines);
      }
    }
  }

  // Skybridge Attachment Vectors & Elevations
  for (const sb of complex?.skybridges || []) {
    const yMid = sb.elevationY + sb.height * 0.5;
    for (const endPt of [sb.start, sb.end]) {
      const markerGeo = new THREE.SphereGeometry(0.68, 10, 8);
      const markerMat = new THREE.MeshBasicMaterial({ color: '#ff6ec7' });
      const sphere = new THREE.Mesh(markerGeo, markerMat);
      sphere.position.set(endPt.x, yMid, endPt.z);
      sphere.userData = { _ownedMat: true };
      root.add(sphere);
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(sb.start.x, yMid, sb.start.z),
      new THREE.Vector3(sb.end.x, yMid, sb.end.z)
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: '#ff6ec7' });
    const bridgeVec = new THREE.Line(lineGeo, lineMat);
    bridgeVec.userData = { _ownedMat: true };
    root.add(bridgeVec);

    const midLbl = previewMakeLabelSprite(`Bridge Fl ${sb.floor}`, '#250e28', '#ff6ec7');
    midLbl.position.set((sb.start.x + sb.end.x) * 0.5, sb.elevationY + sb.height + 2.2, (sb.start.z + sb.end.z) * 0.5);
    root.add(midLbl);
  }

  // Truss Endpoint Markers
  for (const tr of complex?.trusses || []) {
    if (!tr?.start || !tr?.end) continue;
    const ys = tr.bottomY !== undefined && tr.topY !== undefined ? [tr.bottomY, tr.topY] : [tr.y ?? tr.elevationY ?? 0];
    for (const trY of ys) {
      for (const endPt of [tr.start, tr.end]) {
        const tGeo = new THREE.SphereGeometry(0.55, 8, 6);
        const tMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
        const tMesh = new THREE.Mesh(tGeo, tMat);
        tMesh.position.set(endPt.x, trY, endPt.z);
        tMesh.userData = { _ownedMat: true };
        root.add(tMesh);
      }
    }
  }

  return root;
}

function rebuildSkyscraperDebugOverlay(debugGroup, skyscraperGroup, state, enabled) {
  disposeObject(debugGroup);
  if (!enabled || !skyscraperGroup) return;
  const gizmos = buildSkyscraperDebugGizmos(skyscraperGroup, state);
  debugGroup.add(gizmos);
}

function rebuildEnvironment(environmentGroup, mode, showGrid, complexBounds = null, lightingTime = 'day') {
  disposeObject(environmentGroup);
  if (mode === 'none' && !showGrid) return;

  const span = complexBounds
    ? Math.max(complexBounds.plazaWidth || 50, complexBounds.plazaDepth || 50, 56)
    : 64;
  const gridSpan = Math.max(220, span * 3.2);

  if (showGrid) {
    const gridColor = lightingTime === 'night' ? 0x1e4b68 : 0x2a6988;
    const subColor = lightingTime === 'night' ? 0x0e2334 : 0x163246;
    const grid = new THREE.GridHelper(gridSpan, 40, gridColor, subColor);
    grid.position.y = -0.02;
    environmentGroup.add(grid);
  }

  if (mode === 'studio') {
    const discGeo = new THREE.CylinderGeometry(span * 0.78, span * 0.84, 0.4, 48);
    const discMat = new THREE.MeshLambertMaterial({ color: lightingTime === 'night' ? '#0d1822' : '#182838' });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.45;
    disc.receiveShadow = true;
    disc.userData = { _ownedMat: true };
    environmentGroup.add(disc);
    return;
  }

  if (mode === 'city') {
    // Ground asphalt sheet + roads framing the complex
    const roadMat = new THREE.MeshLambertMaterial({ color: lightingTime === 'night' ? '#0f161f' : '#242c36' });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(gridSpan * 1.4, gridSpan * 1.4), roadMat);
    ground.rotation.x = -Math.PI * 0.5;
    ground.position.y = -0.36;
    ground.receiveShadow = true;
    ground.userData = { _ownedMat: true };
    environmentGroup.add(ground);

    // Background neighbor silhouettes outside central plaza
    const ringRadius = Math.max(span * 0.88, 66);
    const contextMat = new THREE.MeshLambertMaterial({
      color: lightingTime === 'night' ? '#131d2b' : lightingTime === 'dusk' ? '#243248' : '#2b3e52'
    });
    const neighborSpecs = [
      { angle: 0.45, dist: 1.0, w: 22, d: 20, h: 48 },
      { angle: 1.35, dist: 1.15, w: 26, d: 24, h: 86 },
      { angle: 2.25, dist: 1.05, w: 20, d: 22, h: 62 },
      { angle: 3.05, dist: 1.2, w: 28, d: 22, h: 112 },
      { angle: 3.95, dist: 1.1, w: 24, d: 24, h: 55 },
      { angle: 5.05, dist: 1.18, w: 22, d: 26, h: 94 }
    ];
    for (const n of neighborSpecs) {
      const bx = Math.cos(n.angle) * ringRadius * n.dist;
      const bz = Math.sin(n.angle) * ringRadius * n.dist;
      const block = new THREE.Mesh(new THREE.BoxGeometry(n.w, n.h, n.d), contextMat);
      block.position.set(bx, n.h * 0.5 - 0.35, bz);
      block.receiveShadow = true;
      block.userData = { _ownedMat: true };
      environmentGroup.add(block);
    }
  }
}

function resetCameraForFocus(camera, orbit, skyscraperGroup, focusMode = 'full', scene = null) {
  if (!camera || !orbit || !skyscraperGroup) return;

  const box = new THREE.Box3().setFromObject(skyscraperGroup);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  if (box.isEmpty()) {
    size.set(32, 120, 32);
    center.set(0, 60, 0);
    box.min.set(-16, 0, -16);
    box.max.set(16, 120, 16);
  } else {
    box.getSize(size);
    box.getCenter(center);
  }

  const sx = Math.max(18, size.x || 30);
  const sy = Math.max(24, size.y || 120);
  const sz = Math.max(18, size.z || 30);
  const safeSpan = Math.max(24, sx, sz);
  const maxDim = Math.max(sy, safeSpan);

  const fovRad = ((camera.fov || 46) * Math.PI) / 180;
  const aspect = Math.max(0.4, camera.aspect || 1.33);
  const tanV = Math.max(0.1, Math.tan(fovRad * 0.5));
  const tanH = Math.max(0.1, tanV * aspect);
  const margin = 1.24;

  let activeDist = maxDim * 1.5;

  if (focusMode === 'street') {
    const targetY = box.min.y + Math.min(16, sy * 0.16);
    const frontZ = box.max.z || safeSpan * 0.5;
    const distStreet = Math.max(
      34,
      ((Math.max(sx, sz) * 0.55) / tanH) * 1.15,
      (Math.min(28, sy * 0.28) * 0.55) / tanV
    );
    activeDist = distStreet;
    orbit.target.set(center.x, targetY, center.z * 0.4 + frontZ * 0.25);
    camera.position.set(center.x + distStreet * 0.56, Math.max(8, box.min.y + 8), frontZ + distStreet * 0.84);
  } else if (focusMode === 'crown') {
    const crownH = Math.max(24, sy * 0.28);
    const crownSpan = Math.hypot(sx, sz);
    const crownY = box.min.y + sy * 0.84;
    const lookDir = new THREE.Vector3(0.58, 0.22, 0.78).normalize();
    activeDist = Math.max(34, (crownH * 0.62) / tanV, (crownSpan * 0.52) / tanH) * 1.18;
    orbit.target.set(center.x, crownY, center.z);
    camera.position.copy(orbit.target).addScaledVector(lookDir, activeDist);
  } else {
    // FOV and aspect-aware hero 3/4 view fitting all towers, crowns, and spires
    const lookDir = new THREE.Vector3(0.58, 0.2, 0.79).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const camRight = new THREE.Vector3().crossVectors(worldUp, lookDir).normalize();
    const camUp = new THREE.Vector3().crossVectors(lookDir, camRight).normalize();

    const halfProjX = 0.5 * (Math.abs(camRight.x) * sx + Math.abs(camRight.y) * sy + Math.abs(camRight.z) * sz);
    const halfProjY = 0.5 * (Math.abs(camUp.x) * sx + Math.abs(camUp.y) * sy + Math.abs(camUp.z) * sz);
    const halfProjZ = 0.5 * (Math.abs(lookDir.x) * sx + Math.abs(lookDir.y) * sy + Math.abs(lookDir.z) * sz);

    const distV = (halfProjY / tanV + halfProjZ * 0.55) * margin;
    const distH = (halfProjX / tanH + halfProjZ * 0.55) * margin;
    activeDist = Math.max(48, distV, distH);

    orbit.target.set(center.x, box.min.y + sy * 0.49, center.z);
    camera.position.copy(orbit.target).addScaledVector(lookDir, activeDist);
  }

  // Expand camera clip planes and fog for supertall complexes
  const envScale = Math.max(maxDim, activeDist * 1.45);
  camera.far = Math.max(3200, envScale * 10);
  camera.near = Math.max(0.25, Math.min(1.5, maxDim * 0.002));
  camera.updateProjectionMatrix();
  orbit.maxDistance = Math.max(520, envScale * 4.6);

  if (scene?.fog) {
    scene.fog.near = Math.max(220, envScale * 1.45);
    scene.fog.far = Math.max(1150, envScale * 5.6);
  }

  orbit.update();
}

function snapshot(renderer, scene, camera, state, ready, toast) {
  if (!ready || !renderer || !scene || !camera) return;
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyscraper-${state.style || 'design'}-${state.seed || 1}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (toast) toast('Saved Preview Snapshot');
  }, 'image/png');
}

function toggleSkyTheatreMode(view, toast, resizeFn) {
  view.theatre = !view.theatre;
  const shell = $('.studio-shell');
  if (shell) shell.classList.toggle('theatre-mode', view.theatre);
  $('#btn-theatre')?.classList.toggle('active', view.theatre);
  $('#btn-theatre-quick')?.classList.toggle('active', view.theatre);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast(view.theatre ? 'Theatre Mode On' : 'Theatre Mode Off');
}

function isSkyFullscreenActive() {
  const frame = $('.studio-viewport-frame');
  return Boolean(
    document.fullscreenElement === frame ||
    (frame && frame.classList.contains('is-fullscreen'))
  );
}

function updateSkyFullscreenUI(view) {
  const active = isSkyFullscreenActive();
  view.fullscreen = active;
  document.body.classList.toggle('studio-fullscreen-active', active);
  $('#btn-fullscreen')?.classList.toggle('active', active);
  $('#btn-fullscreen-quick')?.classList.toggle('active', active);
}

async function enterSkyFullscreenViewport(view, toast, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (!frame) return;
  frame.classList.add('is-fullscreen');
  if (frame.requestFullscreen && !document.fullscreenElement) {
    try {
      await frame.requestFullscreen();
    } catch {
    }
  }
  updateSkyFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast('Full-Screen Mode On (Press Esc To Exit)');
}

async function exitSkyFullscreenViewport(view, toast, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (frame) frame.classList.remove('is-fullscreen');
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore if already exited
    }
  }
  updateSkyFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
  if (toast) toast('Full-Screen Mode Off');
}

function toggleSkyFullscreenViewport(view, toast, resizeFn) {
  if (isSkyFullscreenActive()) return exitSkyFullscreenViewport(view, toast, resizeFn);
  return enterSkyFullscreenViewport(view, toast, resizeFn);
}

function handleSkyFullscreenChange(view, resizeFn) {
  const frame = $('.studio-viewport-frame');
  if (frame && !document.fullscreenElement) {
    frame.classList.remove('is-fullscreen');
  }
  updateSkyFullscreenUI(view);
  if (resizeFn) {
    resizeFn();
    setTimeout(resizeFn, 60);
  }
}

function handleSkyStudioKeydown(e, actions) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const key = (e.key || '').toLowerCase();
  if (key === 'f') {
    e.preventDefault();
    actions.toggleFullscreen();
  } else if (key === 't') {
    e.preventDefault();
    actions.toggleTheatre();
  } else if (key === 'e') {
    e.preventDefault();
    actions.toggleDebug();
  } else if (key === 's') {
    e.preventDefault();
    actions.toggleSilhouette();
  } else if (key === 'p') {
    e.preventDefault();
    actions.snapshot();
  } else if (e.key === 'Escape' && isSkyFullscreenActive()) {
    actions.exitFullscreen();
  }
}


/* --- studio/export.js --- */
function fileDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeSkyscraperName(cfg, customName = null) {
  const base = customName || cfg.signText || cfg.style || 'skyscraper';
  return String(base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'skyscraper';
}

function exportSkyscraperBlueprint(state, activeBlueprintName = null, toast = null) {
  const cfg = sanitiseConfig(state);
  const bp = generateSkyscraperBlueprint(cfg);
  const name = safeSkyscraperName(cfg, activeBlueprintName);
  const blob = new Blob([JSON.stringify(bp, null, 2)], { type: 'application/json' });
  fileDownload(`${name}.skyscraper.json`, blob);
  if (toast) toast(`Exported Blueprint: ${name}.skyscraper.json`);
  return bp;
}

function exportSkyscraperJSON(state, activeBlueprintName = null, toast = null) {
  const cfg = sanitiseConfig(state);
  const payload = {
    type: 'b-skyscraper-settings',
    schemaVersion: 'b.skyscraper.v1',
    config: copy(cfg)
  };
  const name = safeSkyscraperName(cfg, activeBlueprintName);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  fileDownload(`${name}-settings.json`, blob);
  if (toast) toast(`Exported Settings: ${name}-settings.json`);
  return payload;
}

function expDisposeTempGroup(group) {
  if (!group) return;
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.userData?._tex) obj.userData._tex.dispose();
  });
}

async function exportSkyscraperGLB(state, ready, activeBlueprintName, loadExporterFn, toast, setStatus) {
  if (!ready) {
    if (toast) toast('Wait For 3d Preview Before Exporting Model');
    return;
  }
  try {
    if (setStatus) setStatus('Preparing Glb Exporter...');
    await loadExporterFn();
    const cfg = sanitiseConfig(state);
    const exportGroup = createSkyscraper(cfg);
    exportGroup.updateMatrixWorld(true);

    const exporter = new THREE.GLTFExporter();
    const name = safeSkyscraperName(cfg, activeBlueprintName);
    if (setStatus) setStatus('Generating Binary Glb...');

    await new Promise((resolve, reject) => {
      try {
        exporter.parse(
          exportGroup,
          (result) => {
            const blob = result instanceof ArrayBuffer
              ? new Blob([result], { type: 'model/gltf-binary' })
              : new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' });
            fileDownload(`${name}.glb`, blob);
            if (toast) toast(`Exported 3d Model: ${name}.glb`);
            resolve();
          },
          { binary: true, onlyVisible: false }
        );
      } catch (err) {
        reject(err);
      }
    });
    expDisposeTempGroup(exportGroup);
    if (setStatus) setStatus('Model Export Complete');
  } catch (err) {
    console.error('Skyscraper Glb Export Error:', err);
    if (toast) toast(`Model Export Error: ${err.message}`);
    if (setStatus) setStatus('Export Failed');
  }
}

function applyImportedSkyscraperData(parsed, sourceLabel = 'Imported Skyscraper', applyFn = null, toast = null) {
  const res = validateSkyscraperBlueprint(parsed);
  if (!res.ok) {
    if (toast) toast(`Import Rejected: ${res.errors.join('; ')}`);
    return res;
  }
  const styleDesc = getStyle(res.config.style);
  const labelName = res.config.signText || styleDesc.label;
  if (applyFn) {
    applyFn(res.config, labelName, res.config.style, sourceLabel);
  }
  if (toast) {
    const warnMsg = res.warnings.length ? ` (${res.warnings.length} Adjusted)` : '';
    toast(`Loaded ${sourceLabel}${warnMsg}`);
  }
  return res;
}

function handleSkyscraperFileImport(file, onApply, toast) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const cleanName = file.name.replace(/\.(skyscraper\.)?json$/i, '');
      applyImportedSkyscraperData(parsed, cleanName, onApply, toast);
    } catch (err) {
      if (toast) toast(`Invalid Json File: ${err.message}`);
    }
  };
  reader.readAsText(file);
}


/* --- studio/controls.js --- */
const PRESET_CARDS = Object.entries(PRESETS).map(([id, data]) => {
  const styleDesc = getStyle(data.style || id);
  return {
    id,
    label: data.label || styleDesc.label,
    icon: styleDesc.icon,
    data
  };
});

const MATERIAL_INPLACE_KEYS = new Set([
  'primaryMaterial',
  'primaryColor',
  'secondaryMaterial',
  'secondaryColor',
  'framingMaterial',
  'framingColor',
  'glassMaterial',
  'glassColor',
  'mullionMaterial',
  'mullionColor',
  'trimMaterial',
  'trimColor',
  'crownMaterial',
  'crownColor',
  'podiumMaterial',
  'podiumColor',
  'colorVariation'
]);

const SECTION_EDITOR_FIELDS = [
  { key: 'label', name: 'Section Name', type: 'text' },
  { key: 'role', name: 'Architectural Role', type: 'select', optionsKey: 'sectionRole' },
  { key: 'floors', name: 'Section Floors', type: 'range', min: 1, max: 60, step: 1 },
  { key: 'floorHeight', name: 'Floor-to-Floor Height', type: 'range', min: 2.8, max: 6.5, step: 0.1, unit: 'm' },
  { key: 'width', name: 'Section Width', type: 'range', min: 8, max: 80, step: 1, unit: 'm' },
  { key: 'depth', name: 'Section Depth', type: 'range', min: 8, max: 80, step: 1, unit: 'm' },
  { key: 'footprint', name: 'Section Footprint', type: 'select', optionsKey: 'footprint' },
  { key: 'cornerTreatment', name: 'Corner Treatment', type: 'select', optionsKey: 'cornerTreatment' },
  { key: 'cornerSize', name: 'Corner Size', type: 'range', min: 0.2, max: 6.5, step: 0.2, unit: 'm' },
  { key: 'setback', name: 'Setback From Tier Below', type: 'range', min: 0, max: 10, step: 0.5, unit: 'm' },
  { key: 'overhang', name: 'Cantilever Overhang', type: 'range', min: 0, max: 6, step: 0.25, unit: 'm' },
  { key: 'transitionMode', name: 'Section Transition', type: 'select', optionsKey: 'transitionMode' },
  { key: 'offsetX', name: 'Horizontal Offset X', type: 'range', min: -24, max: 24, step: 0.5, unit: 'm' },
  { key: 'offsetZ', name: 'Horizontal Offset Z', type: 'range', min: -24, max: 24, step: 0.5, unit: 'm' },
  { key: 'rotationDeg', name: 'Section Base Rotation', type: 'range', min: -180, max: 180, step: 5, unit: '°' },
  { key: 'twistDeg', name: 'Continuous Twist Angle', type: 'range', min: -60, max: 60, step: 2, unit: '°' },
  { key: 'taperX', name: 'Width Taper Ratio', type: 'range', min: 0.45, max: 1.35, step: 0.02 },
  { key: 'taperZ', name: 'Depth Taper Ratio', type: 'range', min: 0.45, max: 1.35, step: 0.02 },
  { key: 'flareBase', name: 'Flared Lower Facade Skirt', type: 'range', min: 0, max: 0.55, step: 0.02 },
  { key: 'slantedTopDeg', name: 'Slanted Top Slope Angle', type: 'range', min: -45, max: 45, step: 2, unit: '°' },
  { key: 'facadeStyle', name: 'Facade Style', type: 'select', optionsKey: 'facadeStyle' },
  { key: 'windowPattern', name: 'Window Arrangement', type: 'select', optionsKey: 'windowPattern' },
  { key: 'materialRole', name: 'Exterior Material Slot', type: 'select', optionsList: [
    ['primary', 'Primary Material'],
    ['secondary', 'Secondary Material'],
    ['podium', 'Ground Podium'],
    ['crown', 'Crown Material'],
    ['glass', 'Curtain Glass']
  ] },
  { key: 'diagonalBrace', name: 'Section Exterior Braces', type: 'select', optionsKey: 'exteriorBracing' },
  { key: 'fanMotif', name: 'Art Deco Sunburst Motif', type: 'boolean' },
  { key: 'recessedCoreStrip', name: 'Recessed Center Facade Strip', type: 'boolean' }
];

function renderStylePicker(container, activeStyle, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  for (const s of STYLES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'style-option' + (s.id === activeStyle ? ' active' : '');
    btn.dataset.style = s.id;
    const icon = document.createElement('i');
    icon.className = 'fas ' + s.icon;
    const lbl = document.createElement('span');
    lbl.textContent = s.label;
    btn.append(icon, lbl);
    btn.addEventListener('click', () => {
      const presetData = PRESETS[s.preset] || baseForStyle(s.id);
      onSelect(copy(presetData), s.label, s.preset);
    });
    container.appendChild(btn);
  }
}

function updateStylePicker(activeStyle) {
  $$('#style-picker .style-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.style === activeStyle);
  });
}

function renderPresetList(container, activePresetId, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  for (const card of PRESET_CARDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-item' + (card.id === activePresetId ? ' active' : '');
    btn.dataset.preset = card.id;
    const icon = document.createElement('i');
    icon.className = 'fas ' + card.icon;
    const lbl = document.createElement('span');
    lbl.textContent = card.label;
    btn.append(icon, lbl);
    btn.addEventListener('click', () => {
      onSelect(copy(card.data), card.label, card.id);
    });
    container.appendChild(btn);
  }
}

function updatePresetList(activePresetId) {
  $$('#preset-list .preset-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === activePresetId);
  });
}

function renderCustomPresets(container, onLoad, toast) {
  if (!container) return;
  container.innerHTML = '';
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'studio-help';
    empty.textContent = 'No Saved Complexes Yet.';
    container.appendChild(empty);
    return;
  }

  list.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'custom-preset-row';
    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'custom-preset-btn';
    loadBtn.textContent = item.name || `Custom Skyline ${idx + 1}`;
    loadBtn.addEventListener('click', () => {
      onLoad(copy(item.config || item), item.name || 'Saved Complex', null, item.name);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'custom-preset-del';
    delBtn.title = 'Delete Saved Preset';
    const delIcon = document.createElement('i');
    delIcon.className = 'fas fa-trash';
    delBtn.appendChild(delIcon);
    delBtn.addEventListener('click', () => {
      const updated = list.filter((_, i) => i !== idx);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      renderCustomPresets(container, onLoad, toast);
      if (toast) toast(`Removed "${item.name}"`);
    });

    row.append(loadBtn, delBtn);
    container.appendChild(row);
  });
}

function randomizeSettings(cat, state, locks = new Set(), rngFn = null) {
  const r = rngFn || rng32((Date.now() ^ (state.seed || 2026)) >>> 0);
  const categories = cat === 'all'
    ? ['structure', 'facades', 'materials', 'roofs', 'connections', 'ground']
    : [cat];

  if (categories.includes('materials')) {
    const palette = generateCoherentPalette(Math.floor(r() * 999999));
    for (const [k, v] of Object.entries(palette)) {
      if (!locks.has(k)) state[k] = v;
    }
  }

  for (const catKey of categories) {
    if (catKey === 'materials') continue;
    const keys = CATEGORIES[catKey] || [];
    for (const key of keys) {
      if (locks.has(key)) continue;
      let def = null;
      for (const schemaRows of Object.values(SCHEMA)) {
        const hit = schemaRows.find((row) => row.key === key);
        if (hit) {
          def = hit;
          break;
        }
      }
      if (!def) continue;

      if (def.type === 'boolean') {
        state[key] = r() > 0.45;
      } else if (def.type === 'select') {
        const list = def.optionsKey === 'materialFamily'
          ? OPTIONS.materialFamily
          : (OPTIONS[key] || []);
        if (list.length > 0) state[key] = pick(r, list)[0];
      } else if (typeof def.min === 'number' && typeof def.max === 'number') {
        const step = def.step || 1;
        const steps = Math.max(1, Math.round((def.max - def.min) / step));
        const val = def.min + Math.floor(r() * (steps + 1)) * step;
        state[key] = roundNum(clamp(val, def.min, def.max), 3);
      }
    }
  }

  // Randomize unlocked stacked sections
  if (cat === 'all' || cat === 'structure') {
    const fpList = OPTIONS.footprint.map((x) => x[0]);
    const cornerList = OPTIONS.cornerTreatment.map((x) => x[0]);
    if (Array.isArray(state.sections)) {
      state.sections = state.sections.map((sec, idx) => {
        if (sec.locked) return sec;
        const nextFp = idx === 0 && r() > 0.4 ? 'rectangle' : pick(r, fpList);
        return {
          ...sec,
          floors: clamp(Math.round(sec.floors * (0.75 + r() * 0.55)), 2, 45),
          width: clamp(Math.round((sec.width + (r() - 0.5) * 6)), 10, 68),
          depth: clamp(Math.round((sec.depth + (r() - 0.5) * 6)), 10, 68),
          footprint: nextFp,
          cornerTreatment: pick(r, cornerList)
        };
      });
    }
  }

  return state;
}

function ctrlBuildFieldRow(def, value, isLocked, onChange, onToggleLock) {
  const wrap = document.createElement('div');
  wrap.className = 'studio-field';

  const head = document.createElement('div');
  head.className = 'studio-field-head';

  const label = document.createElement('label');
  label.textContent = def.name;
  head.appendChild(label);

  const rowEnd = document.createElement('div');
  rowEnd.className = 'studio-row-end';
  head.appendChild(rowEnd);

  if (def.type === 'range' || (!def.type && typeof def.min === 'number' && def.key !== 'seed')) {
    const unitSpan = document.createElement('span');
    unitSpan.className = 'studio-val';
    unitSpan.textContent = String(value) + (def.unit || '');
    rowEnd.appendChild(unitSpan);
    wrap.appendChild(head);

    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(def.min);
    range.max = String(def.max);
    range.step = String(def.step ?? 1);
    range.value = String(value);
    range.addEventListener('input', () => {
      const next = Number(range.value);
      unitSpan.textContent = String(next) + (def.unit || '');
      onChange(next, true);
    });
    range.addEventListener('change', () => onChange(Number(range.value), false));
    wrap.appendChild(range);
  } else if (def.type === 'select') {
    wrap.appendChild(head);
    const select = document.createElement('select');
    let list = [];
    if (def.optionsList) list = def.optionsList;
    else if (def.optionsKey === 'styleList') list = STYLES.map((s) => [s.id, s.label]);
    else if (def.optionsKey) list = OPTIONS[def.optionsKey] || [];
    else list = OPTIONS[def.key] || [];

    for (const [optVal, optLabel] of list) {
      const opt = document.createElement('option');
      opt.value = optVal;
      opt.textContent = optLabel;
      if (optVal === value) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => onChange(select.value, false));
    wrap.appendChild(select);
  } else if (def.type === 'color') {
    const hexSpan = document.createElement('span');
    hexSpan.className = 'studio-val';
    hexSpan.textContent = String(value);
    rowEnd.appendChild(hexSpan);
    wrap.appendChild(head);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = String(value);
    colorInput.addEventListener('input', () => {
      hexSpan.textContent = colorInput.value;
      onChange(colorInput.value, true);
    });
    wrap.appendChild(colorInput);
  } else if (def.type === 'boolean') {
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = Boolean(value);
    check.addEventListener('change', () => onChange(check.checked, false));
    rowEnd.appendChild(check);
    wrap.appendChild(head);
  } else if (def.type === 'number') {
    wrap.appendChild(head);
    const num = document.createElement('input');
    num.type = 'number';
    if (def.min !== undefined) num.min = String(def.min);
    if (def.max !== undefined) num.max = String(def.max);
    num.step = String(def.step ?? 1);
    num.value = String(value);
    num.addEventListener('change', () => onChange(Number(num.value), false));
    wrap.appendChild(num);
  } else {
    wrap.appendChild(head);
    const txt = document.createElement('input');
    txt.type = 'text';
    txt.className = 'studio-textbox';
    txt.value = String(value ?? '');
    txt.addEventListener('change', () => onChange(txt.value, false));
    wrap.appendChild(txt);
  }

  if (onToggleLock) {
    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = 'studio-lock' + (isLocked ? ' locked' : '');
    lockBtn.title = isLocked ? 'Unlock Setting' : 'Lock Setting During Randomization';
    const lockIcon = document.createElement('i');
    lockIcon.className = 'fas ' + (isLocked ? 'fa-lock' : 'fa-unlock');
    lockBtn.appendChild(lockIcon);
    lockBtn.addEventListener('click', () => {
      onToggleLock();
    });
    rowEnd.appendChild(lockBtn);
  }

  if (def.info) {
    const info = document.createElement('p');
    info.className = 'studio-help';
    info.textContent = def.info;
    wrap.appendChild(info);
  }

  return wrap;
}

function renderSectionStackManager(container, state, selectedIdx, onSelectSection, onMutateState, onRerender) {
  const stack = resolveStackedSections(state);
  const safeIdx = clamp(selectedIdx, 0, Math.max(0, state.sections.length - 1));

  const summary = document.createElement('div');
  summary.className = 'section-summary-banner';
  summary.textContent = `${state.sections.length} Stacked Tiers · ${stack.totalFloors} Floors · ${roundNum(stack.totalHeight, 1)}m Core Height`;
  container.appendChild(summary);

  const toolbar = document.createElement('div');
  toolbar.className = 'section-stack-toolbar';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'studio-btn studio-btn-primary';
  addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Tier';
  addBtn.addEventListener('click', () => {
    const added = addSectionToState(state);
    if (added) {
      onSelectSection(state.sections.length - 1);
      onMutateState(true);
      onRerender();
    }
  });

  const dupActiveBtn = document.createElement('button');
  dupActiveBtn.type = 'button';
  dupActiveBtn.className = 'studio-btn studio-btn-ghost';
  dupActiveBtn.innerHTML = '<i class="fas fa-copy"></i> Duplicate';
  dupActiveBtn.addEventListener('click', () => {
    if (duplicateSectionInState(state, safeIdx)) {
      onSelectSection(safeIdx + 1);
      onMutateState(true);
      onRerender();
    }
  });

  toolbar.append(addBtn, dupActiveBtn);
  container.appendChild(toolbar);

  const listEl = document.createElement('div');
  listEl.className = 'section-stack-list';

  stack.sections.forEach((sec, idx) => {
    const rawSec = state.sections[idx];
    const card = document.createElement('div');
    card.className = 'section-card' + (idx === safeIdx ? ' active' : '');
    card.dataset.sectionIndex = String(idx);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.section-mini-btn')) return;
      onSelectSection(idx);
      onRerender();
    });

    const head = document.createElement('div');
    head.className = 'section-card-head';

    const title = document.createElement('span');
    title.className = 'section-card-title';
    title.textContent = `${idx + 1}. ${rawSec.label || sec.label}`;

    const actions = document.createElement('div');
    actions.className = 'section-card-actions';

    const mkAction = (iconCls, tip, disabled, extraCls, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'section-mini-btn' + (extraCls ? ' ' + extraCls : '');
      b.title = tip;
      b.disabled = Boolean(disabled);
      const ic = document.createElement('i');
      ic.className = 'fas ' + iconCls;
      b.appendChild(ic);
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        fn();
      });
      return b;
    };

    actions.append(
      mkAction('fa-arrow-up', 'Move Lower (Earlier in Stack)', idx === 0, '', () => {
        if (moveSectionInState(state, idx, -1)) {
          onSelectSection(idx - 1);
          onMutateState(true);
          onRerender();
        }
      }),
      mkAction('fa-arrow-down', 'Move Higher (Later in Stack)', idx >= state.sections.length - 1, '', () => {
        if (moveSectionInState(state, idx, 1)) {
          onSelectSection(idx + 1);
          onMutateState(true);
          onRerender();
        }
      }),
      mkAction(rawSec.locked ? 'fa-lock' : 'fa-unlock', rawSec.locked ? 'Unlock Section' : 'Lock Section', false, rawSec.locked ? 'locked' : '', () => {
        updateSectionPropertyInState(state, idx, 'locked', !rawSec.locked);
        onRerender();
      }),
      mkAction('fa-trash', 'Remove Section', state.sections.length <= 1, 'danger', () => {
        if (removeSectionFromState(state, idx)) {
          onSelectSection(Math.max(0, Math.min(safeIdx, state.sections.length - 1)));
          onMutateState(true);
          onRerender();
        }
      })
    );

    head.append(title, actions);

    const diagParts = [];
    if (sec.transitionDiagnostics?.clamped) diagParts.push('Clamped');
    if (sec.transitionDiagnostics?.needsCantileverSupport || sec.transitionMode === 'supported_cantilever') diagParts.push('Cantilever');
    const diagSuffix = diagParts.length ? ` · ${diagParts.join(' · ')}` : '';
    const meta = document.createElement('div');
    meta.className = 'section-card-meta';
    meta.textContent = `Fl ${sec.startFloor + 1}–${sec.endFloor} · ${roundNum(sec.width, 1)}×${roundNum(sec.depth, 1)}m · ${sec.footprint.replace(/_/g, ' ')}${diagSuffix}`;

    card.append(head, meta);
    listEl.appendChild(card);
  });

  container.appendChild(listEl);

  // Active Section Detail Editor
  const activeSec = state.sections[safeIdx];
  if (activeSec) {
    const editor = document.createElement('div');
    editor.className = 'section-editor-box';
    const editorHead = document.createElement('div');
    editorHead.className = 'studio-group';
    editorHead.textContent = `Editing Tier ${safeIdx + 1}: ${activeSec.label}`;
    editor.appendChild(editorHead);

    for (const def of SECTION_EDITOR_FIELDS) {
      const f = ctrlBuildFieldRow(
        def,
        activeSec[def.key],
        false,
        (nextVal, isLiveInput) => {
          updateSectionPropertyInState(state, safeIdx, def.key, nextVal);
          onMutateState(!isLiveInput);
          if (!isLiveInput && ['label', 'role', 'floors', 'width', 'depth', 'footprint'].includes(def.key)) {
            onRerender();
          }
        },
        null
      );
      editor.appendChild(f);
    }
    container.appendChild(editor);
  }
}

function renderControls(tabId, container, state, locks, ctx) {
  if (!container) return;
  container.innerHTML = '';

  if (tabId === 'sections') {
    const grp = document.createElement('div');
    grp.className = 'studio-group';
    grp.textContent = 'Stacked Building Sections';
    container.appendChild(grp);
    renderSectionStackManager(
      container,
      state,
      ctx.selectedSectionIndex || 0,
      ctx.onSelectSection,
      (immediateRebuild) => ctx.onStructureChanged(immediateRebuild),
      () => renderControls(tabId, container, state, locks, ctx)
    );
    return;
  }

  if (tabId === 'presets') {
    const grp = document.createElement('div');
    grp.className = 'studio-group';
    grp.textContent = 'Architectural Styles & Presets';
    container.appendChild(grp);

    const grid = document.createElement('div');
    grid.className = 'preset-list';
    renderPresetList(grid, ctx.activePreset, ctx.onSelectPreset);
    container.appendChild(grid);
  }

  if (tabId === 'export') {
    const grp = document.createElement('div');
    grp.className = 'studio-group';
    grp.textContent = 'Blueprint & Glb Model Export';
    container.appendChild(grp);

    const info = document.createElement('p');
    info.className = 'studio-help';
    info.textContent = 'All exports use unified preview geometry and preserve multi-tower positions, skybridges, sections, materials, and B Remastered entrance coordinates.';
    container.appendChild(info);

    const actions = [
      { id: 'tab-exp-bp', label: 'Export Blueprint (.skyscraper.json)', icon: 'fa-drafting-compass', primary: true, fn: ctx.onExportBlueprint },
      { id: 'tab-exp-glb', label: 'Export 3d Model (.glb)', icon: 'fa-cube', primary: false, fn: ctx.onExportGLB },
      { id: 'tab-exp-json', label: 'Export Settings (.json)', icon: 'fa-file-code', primary: false, fn: ctx.onExportJSON },
      { id: 'tab-exp-png', label: 'Capture Preview (.png)', icon: 'fa-camera', primary: false, fn: ctx.onSnapshot }
    ];
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = act.id;
      btn.className = 'studio-btn ' + (act.primary ? 'studio-btn-primary' : 'studio-btn-ghost');
      btn.style.width = '100%';
      btn.style.marginBottom = '7px';
      btn.innerHTML = `<i class="fas ${act.icon}"></i> ${act.label}`;
      btn.addEventListener('click', act.fn);
      container.appendChild(btn);
    }
    return;
  }

  const schemaRows = SCHEMA[tabId] || [];
  for (const row of schemaRows) {
    if (row.group) {
      const g = document.createElement('div');
      g.className = 'studio-group';
      g.textContent = row.group;
      container.appendChild(g);
      continue;
    }

    const key = row.key;
    const def = { ...row, type: row.type || 'range' };
    const isLocked = locks.has(key);

    const fieldEl = ctrlBuildFieldRow(
      def,
      state[key],
      isLocked,
      (val, isLiveInput) => {
        if (key === 'style') {
          const preset = PRESETS[getStyle(val).preset] || baseForStyle(val);
          ctx.onSelectPreset(copy(preset), getStyle(val).label, getStyle(val).preset);
          return;
        }
        state[key] = val;
        if (key === 'lightingTime') {
          ctx.onLightingTimeChanged(val);
          return;
        }
        if (key === 'crownLighting') {
          ctx.onMaterialChanged(true);
          return;
        }
        if (MATERIAL_INPLACE_KEYS.has(key)) {
          ctx.onMaterialChanged(false);
          return;
        }
        ctx.onStructureChanged(!isLiveInput);
      },
      key === 'seed' || key === 'style'
        ? null
        : () => {
            if (locks.has(key)) locks.delete(key);
            else locks.add(key);
            renderControls(tabId, container, state, locks, ctx);
          }
    );
    container.appendChild(fieldEl);
  }
}


/* --- index.js --- */
let state = sanitiseConfig({ ...copy(BASE), ...copy(PRESETS.art_deco_monumental) });
let activePreset = 'art_deco_monumental';
let lastLoadedPresetId = 'art_deco_monumental';
let seedDerivedFromPreset = true;
let activeBlueprintName = null;
let activeTab = 'structure';
let selectedSectionIndex = 0;
let locks = new Set();

const view = {
  focus: 'full',
  autoRotate: false,
  silhouetteMode: false,
  wireframe: false,
  entranceDebug: false,
  theatre: false,
  fullscreen: false,
  environment: 'city',
  grid: true
};

let renderer = null;
let scene = null;
let camera = null;
let orbit = null;
let hemi = null;
let ambient = null;
let sun = null;
let fillLight = null;
let complexGroup = null;
let environmentGroup = null;
let debugGroup = null;
let ready = false;
let rebuildTimer = null;

function toast(msg) {
  const host = $('#studio-toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'studio-toast';
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3200);
}

function setStatus(msg) {
  const el = $('#render-status');
  if (el) el.textContent = msg;
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const stage = $('#skyscraper-stage');
  if (!stage) return;
  const w = Math.max(240, stage.clientWidth || 640);
  const h = Math.max(240, stage.clientHeight || 480);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function updateLighting() {
  if (!scene || !hemi || !ambient || !sun || !fillLight) return;
  const mode = state.lightingTime || 'day';

  if (mode === 'golden_hour') {
    scene.background.set('#282534');
    scene.fog.color.set('#282534');
    hemi.intensity = 0.85;
    hemi.color.set('#ffd29d');
    ambient.intensity = 0.38;
    sun.intensity = 1.45;
    sun.color.set('#ffb86c');
    sun.position.set(160, 88, 95);
    fillLight.intensity = 0.45;
  } else if (mode === 'dusk') {
    scene.background.set('#141c2c');
    scene.fog.color.set('#141c2c');
    hemi.intensity = 0.56;
    hemi.color.set('#96b8e8');
    ambient.intensity = 0.28;
    sun.intensity = 0.7;
    sun.color.set('#ff9e78');
    sun.position.set(-130, 62, 110);
    fillLight.intensity = 0.35;
  } else if (mode === 'night') {
    scene.background.set('#070d18');
    scene.fog.color.set('#070d18');
    hemi.intensity = 0.34;
    hemi.color.set('#7594c7');
    ambient.intensity = 0.22;
    sun.intensity = 0.45;
    sun.color.set('#96b2eb');
    sun.position.set(-110, 140, 80);
    fillLight.intensity = 0.28;
  } else {
    scene.background.set('#0f2030');
    scene.fog.color.set('#0f2030');
    hemi.intensity = 0.68;
    hemi.color.set('#dceeff');
    ambient.intensity = 0.28;
    sun.intensity = 1.04;
    sun.color.set('#ffe7c2');
    sun.position.set(145, 220, 130);
    fillLight.intensity = 0.24;
  }
}

function updateStats(bp) {
  if (!bp) return;
  const tEl = $('#stat-towers');
  const tUnitEl = $('#stat-towers-unit');
  const fEl = $('#stat-floors');
  const fUnitEl = $('#stat-floors-unit');
  const hEl = $('#stat-height');
  const triEl = $('#stat-triangles');
  const sceneLbl = $('#scene-label');
  const styleTag = $('#active-style-name');

  const towerCount = bp.bounds?.towerCount || 1;
  if (tEl) tEl.textContent = String(towerCount);
  if (tUnitEl) tUnitEl.textContent = towerCount === 1 ? 'tower' : 'towers';
  if (fEl) fEl.textContent = String(bp.bounds?.totalFloors || 0);
  if (fUnitEl) {
    fUnitEl.textContent = (towerCount > 1 && bp.bounds?.maxTowerFloors)
      ? `floors (${bp.bounds.maxTowerFloors} max)`
      : 'floors';
  }
  if (hEl) hEl.textContent = `${Math.round(bp.bounds?.meters?.height || 0)}m`;
  if (triEl) triEl.textContent = (bp.geometryStats?.triangles || 0).toLocaleString();
  if (styleTag) styleTag.textContent = bp.styleLabel || 'Custom Skyscraper';
  if (sceneLbl) {
    const refId = activePreset || lastLoadedPresetId;
    const idx = Math.max(1, Object.keys(PRESETS).indexOf(refId) + 1);
    const numStr = String(idx).padStart(2, '0');
    sceneLbl.textContent = `${numStr} / ${bp.styleLabel || 'Custom Skyscraper'}`;
  }
}

function refreshMaterialsInPlace() {
  if (!ready || !complexGroup) return;
  reapplySkyscraperMaterials(complexGroup, state, {
    silhouetteMode: view.silhouetteMode,
    wireframe: view.wireframe,
    lightingTime: state.lightingTime
  });
  setStatus(view.silhouetteMode ? 'Silhouette Massing Mode' : 'Ready');
}

function rebuild(resetCam = false) {
  if (!ready || !scene || !complexGroup) return;
  disposeObject(complexGroup);
  clearSkyscraperMaterialCache();

  const built = createSkyscraper(state, { lightingTime: state.lightingTime });
  while (built.children.length > 0) {
    const ch = built.children[0];
    built.remove(ch);
    complexGroup.add(ch);
  }
  complexGroup.userData.blueprint = built.userData.blueprint;
  complexGroup.userData.complex = built.userData.complex;

  reapplySkyscraperMaterials(complexGroup, state, {
    silhouetteMode: view.silhouetteMode,
    wireframe: view.wireframe,
    lightingTime: state.lightingTime
  });

  const bp = built.userData.blueprint;
  updateStats(bp);
  rebuildEnvironment(environmentGroup, view.environment, view.grid, bp?.bounds?.meters, state.lightingTime);
  rebuildSkyscraperDebugOverlay(debugGroup, complexGroup, state, view.entranceDebug);

  // Expand shadow camera bounds to cover multi-tower footprints
  if (sun && bp?.bounds?.meters) {
    const shadowHalf = Math.max(85, bp.bounds.meters.plazaWidth * 0.9, bp.bounds.meters.height * 0.7);
    sun.shadow.camera.left = -shadowHalf;
    sun.shadow.camera.right = shadowHalf;
    sun.shadow.camera.top = shadowHalf;
    sun.shadow.camera.bottom = -shadowHalf;
    sun.shadow.camera.far = Math.max(450, shadowHalf * 3.5);
    sun.shadow.camera.updateProjectionMatrix();
  }

  if (resetCam) {
    resetCameraForFocus(camera, orbit, complexGroup, view.focus, scene);
  }
  setStatus(view.silhouetteMode ? 'Silhouette Massing Mode' : 'Ready');
}

function scheduleRebuild(immediate = false, resetCam = false) {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
    rebuildTimer = null;
  }
  if (immediate) {
    rebuild(resetCam);
    return;
  }
  setStatus('Updating Massing...');
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    rebuild(resetCam);
  }, 55);
}

function loadPreset(presetData, name = 'Preset', presetId = null, customBlueprintName = null) {
  state = applyPresetWithLocks(state, presetData, locks);
  activePreset = presetId;
  seedDerivedFromPreset = Boolean(presetId && PRESETS[presetId]);
  if (presetId) lastLoadedPresetId = presetId;
  else if (state.style) lastLoadedPresetId = state.style;
  activeBlueprintName = customBlueprintName;
  selectedSectionIndex = clamp(selectedSectionIndex, 0, Math.max(0, state.sections.length - 1));

  const seedInput = $('#seed-input');
  if (seedInput) seedInput.value = String(state.seed);
  const varSel = $('#variation-strength-select');
  if (varSel) varSel.value = state.variationStrength || 'moderate';
  const lightSel = $('#lighting-select');
  if (lightSel) lightSel.value = state.lightingTime || 'day';

  updateStylePicker(state.style);
  updatePresetList(activePreset);
  renderStudioControls();
  updateLighting();
  rebuild(true);
  toast(`Loaded ${name}`);
}

function renderStudioControls() {
  renderControls(activeTab, $('#tab-content'), state, locks, {
    activePreset,
    selectedSectionIndex,
    onSelectSection: (idx) => {
      selectedSectionIndex = idx;
    },
    onSelectPreset: (data, label, id) => {
      loadPreset(data, label, id);
    },
    onStructureChanged: (immediate = true) => {
      activePreset = null;
      seedDerivedFromPreset = false;
      updatePresetList(null);
      scheduleRebuild(immediate, false);
    },
    onMaterialChanged: (needsFullRebuild = false) => {
      activePreset = null;
      seedDerivedFromPreset = false;
      updatePresetList(null);
      if (needsFullRebuild) scheduleRebuild(true, false);
      else refreshMaterialsInPlace();
    },
    onLightingTimeChanged: (nextTime) => {
      state.lightingTime = nextTime;
      const lightSel = $('#lighting-select');
      if (lightSel) lightSel.value = nextTime;
      updateLighting();
      scheduleRebuild(true, false);
    },
    onExportBlueprint: () => exportSkyscraperBlueprint(state, activeBlueprintName, toast),
    onExportJSON: () => exportSkyscraperJSON(state, activeBlueprintName, toast),
    onExportGLB: () => exportSkyscraperGLB(state, ready, activeBlueprintName, loadExporter, toast, setStatus),
    onSnapshot: () => snapshot(renderer, scene, camera, state, ready, toast)
  });
}

function handleToggleSilhouette(forceVal = null) {
  view.silhouetteMode = forceVal !== null ? Boolean(forceVal) : !view.silhouetteMode;
  $('#btn-silhouette')?.classList.toggle('active', view.silhouetteMode);
  $('#btn-silhouette-top')?.classList.toggle('active', view.silhouetteMode);
  const chk = $('#silhouette-toggle');
  if (chk) chk.checked = view.silhouetteMode;
  refreshMaterialsInPlace();
  toast(view.silhouetteMode ? 'Silhouette Evaluation Mode On' : 'Silhouette Mode Off');
}

function handleToggleDebug(forceVal = null) {
  view.entranceDebug = forceVal !== null ? Boolean(forceVal) : !view.entranceDebug;
  $('#btn-entrance-debug')?.classList.toggle('active', view.entranceDebug);
  const chk = $('#entrance-debug-toggle');
  if (chk) chk.checked = view.entranceDebug;
  rebuildSkyscraperDebugOverlay(debugGroup, complexGroup, state, view.entranceDebug);
  toast(view.entranceDebug ? 'Entrance & Skybridge Gizmos On' : 'Debug Gizmos Off');
}

function initScene() {
  const canvas = $('#skyscraper-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor('#0f2030', 1);

  if (renderer.capabilities?.getMaxAnisotropy) {
    setSkyscraperMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0f2030');
  scene.fog = new THREE.Fog('#0f2030', 220, 1200);

  camera = new THREE.PerspectiveCamera(46, 1, 0.5, 3600);
  camera.position.set(110, 115, 155);

  orbit = new THREE.OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  orbit.minDistance = 8;
  orbit.maxDistance = 900;
  orbit.maxPolarAngle = Math.PI * 0.495;
  orbit.target.set(0, 70, 0);

  complexGroup = new THREE.Group();
  complexGroup.name = 'SkyscraperComplexRoot';
  scene.add(complexGroup);

  environmentGroup = new THREE.Group();
  environmentGroup.name = 'SkylineEnvironment';
  scene.add(environmentGroup);

  debugGroup = new THREE.Group();
  debugGroup.name = 'SkyscraperDebugOverlay';
  scene.add(debugGroup);

  hemi = new THREE.HemisphereLight('#dceeff', '#26323a', 0.68);
  scene.add(hemi);
  ambient = new THREE.AmbientLight('#ffffff', 0.28);
  scene.add(ambient);

  sun = new THREE.DirectionalLight('#ffe7c2', 1.04);
  sun.position.set(145, 220, 130);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  fillLight = new THREE.DirectionalLight('#8ec5fc', 0.24);
  fillLight.position.set(-120, 95, -140);
  scene.add(fillLight);

  updateLighting();

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(resizeRenderer);
    const stage = $('#skyscraper-stage');
    if (stage) observer.observe(stage);
  }
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  ready = true;
  const loadingScreen = $('#studio-loading');
  if (loadingScreen) loadingScreen.classList.add('hidden');

  rebuild(true);

  function tick() {
    requestAnimationFrame(tick);
    if (!renderer || !scene) return;
    orbit.autoRotate = view.autoRotate;
    orbit.autoRotateSpeed = 0.45;
    orbit.update();
    renderer.render(scene, camera);
  }
  tick();
}

function initUI() {
  renderStylePicker($('#style-picker'), state.style, (data, label, id) => loadPreset(data, label, id));
  renderPresetList($('#preset-list'), activePreset, (data, label, id) => loadPreset(data, label, id));
  renderCustomPresets($('#custom-presets'), (data, label, id, customName) => loadPreset(data, label, id, customName), toast);
  renderStudioControls();

  $$('.studio-tab').forEach((btn) => btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    $$('.studio-tab').forEach((t) => {
      const on = t === btn;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    renderStudioControls();
  }));

  const seedInput = $('#seed-input');
  const varSel = $('#variation-strength-select');

  const applyCurrentSeedVariation = (toastMsg) => {
    const basePreset = PRESETS[lastLoadedPresetId] || PRESETS[state.style] || state;
    const startState = (activePreset || seedDerivedFromPreset) ? applyPresetWithLocks(state, basePreset, locks) : state;
    state = applySeedVariation(
      { ...startState, seed: state.seed, variationStrength: state.variationStrength },
      state.seed,
      state.variationStrength || 'moderate',
      locks
    );
    activePreset = null;
    updatePresetList(null);
    selectedSectionIndex = clamp(selectedSectionIndex, 0, Math.max(0, state.sections.length - 1));
    renderStudioControls();
    scheduleRebuild(true, false);
    if (toastMsg) toast(toastMsg);
  };

  if (seedInput) {
    seedInput.value = String(state.seed);
    seedInput.addEventListener('change', () => {
      state.seed = clamp(Math.floor(Number(seedInput.value) || 2026), 1, 99999999);
      seedInput.value = String(state.seed);
      applyCurrentSeedVariation(`Applied Seed: ${state.seed}`);
    });
  }

  if (varSel) {
    varSel.value = state.variationStrength || 'moderate';
    varSel.addEventListener('change', () => {
      state.variationStrength = varSel.value;
      applyCurrentSeedVariation(`Seed Variation: ${varSel.value}`);
    });
  }

  $('#btn-regenerate')?.addEventListener('click', () => {
    if (seedInput) {
      state.seed = clamp(Math.floor(Number(seedInput.value) || state.seed || 2026), 1, 99999999);
      seedInput.value = String(state.seed);
    }
    applyCurrentSeedVariation(`Regenerated Seed: ${state.seed}`);
  });

  $('#btn-new-seed')?.addEventListener('click', () => {
    state.seed = Math.floor(Math.random() * 99999998) + 1;
    if (seedInput) seedInput.value = String(state.seed);
    applyCurrentSeedVariation(`New Seed: ${state.seed}`);
  });

  $('#btn-reset-preset')?.addEventListener('click', () => {
    const presetId = activePreset || lastLoadedPresetId || state.style;
    const preset = PRESETS[presetId] || PRESETS.art_deco_monumental;
    const styleDef = getStyle(preset.style || presetId);
    loadPreset(preset, styleDef.label, presetId);
  });

  $('#btn-random-all')?.addEventListener('click', () => {
    randomizeSettings('all', state, locks);
    state = sanitiseConfig(state);
    activePreset = null;
    seedDerivedFromPreset = false;
    updatePresetList(null);
    renderStudioControls();
    rebuild(true);
    toast('Randomized Unlocked Skyscraper Parameters');
  });

  $$('[data-random]').forEach((btn) => btn.addEventListener('click', () => {
    const cat = btn.dataset.random;
    randomizeSettings(cat, state, locks);
    state = sanitiseConfig(state);
    activePreset = null;
    seedDerivedFromPreset = false;
    updatePresetList(null);
    renderStudioControls();
    if (cat === 'materials') refreshMaterialsInPlace();
    else rebuild(false);
    toast(`Randomized ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
  }));

  $$('.view-mode').forEach((btn) => btn.addEventListener('click', () => {
    view.focus = btn.dataset.focus || 'full';
    $$('.view-mode').forEach((b) => b.classList.toggle('active', b === btn));
    if (ready) resetCameraForFocus(camera, orbit, complexGroup, view.focus, scene);
  }));

  $('#btn-reset-camera')?.addEventListener('click', () => {
    if (ready) resetCameraForFocus(camera, orbit, complexGroup, view.focus, scene);
  });

  $('#btn-rotate')?.addEventListener('click', () => {
    view.autoRotate = !view.autoRotate;
    $('#btn-rotate')?.classList.toggle('active', view.autoRotate);
    toast(view.autoRotate ? 'Turntable On' : 'Turntable Off');
  });

  $('#btn-silhouette')?.addEventListener('click', () => handleToggleSilhouette());
  $('#btn-silhouette-top')?.addEventListener('click', () => handleToggleSilhouette());
  $('#silhouette-toggle')?.addEventListener('change', (e) => handleToggleSilhouette(e.target.checked));

  $('#btn-wireframe')?.addEventListener('click', () => {
    view.wireframe = !view.wireframe;
    $('#btn-wireframe')?.classList.toggle('active', view.wireframe);
    refreshMaterialsInPlace();
  });

  $('#btn-entrance-debug')?.addEventListener('click', () => handleToggleDebug());
  $('#entrance-debug-toggle')?.addEventListener('change', (e) => handleToggleDebug(e.target.checked));

  $('#btn-stage-snapshot')?.addEventListener('click', () => snapshot(renderer, scene, camera, state, ready, toast));
  $('#btn-screenshot')?.addEventListener('click', () => snapshot(renderer, scene, camera, state, ready, toast));
  $('#btn-screenshot-side')?.addEventListener('click', () => snapshot(renderer, scene, camera, state, ready, toast));

  $('#btn-theatre')?.addEventListener('click', () => toggleSkyTheatreMode(view, toast, resizeRenderer));
  $('#btn-theatre-quick')?.addEventListener('click', () => toggleSkyTheatreMode(view, toast, resizeRenderer));
  $('#btn-fullscreen')?.addEventListener('click', () => toggleSkyFullscreenViewport(view, toast, resizeRenderer));
  $('#btn-fullscreen-quick')?.addEventListener('click', () => toggleSkyFullscreenViewport(view, toast, resizeRenderer));

  $('#lighting-select')?.addEventListener('change', (e) => {
    state.lightingTime = e.target.value;
    updateLighting();
    scheduleRebuild(true, false);
    if (activeTab === 'lighting') renderStudioControls();
  });

  $('#environment-select')?.addEventListener('change', (e) => {
    view.environment = e.target.value;
    const bp = complexGroup?.userData?.blueprint;
    rebuildEnvironment(environmentGroup, view.environment, view.grid, bp?.bounds?.meters, state.lightingTime);
  });

  $('#ground-grid')?.addEventListener('change', (e) => {
    view.grid = Boolean(e.target.checked);
    const bp = complexGroup?.userData?.blueprint;
    rebuildEnvironment(environmentGroup, view.environment, view.grid, bp?.bounds?.meters, state.lightingTime);
  });

  $('#btn-save-custom')?.addEventListener('click', () => {
    const nameInput = $('#custom-name');
    const name = (nameInput?.value || '').trim() || `${getStyle(state.style).label} ${state.seed}`;
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(saved)) saved = [];
    } catch {
      saved = [];
    }
    saved.unshift({ name, config: copy(state), savedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.slice(0, 24)));
    if (nameInput) nameInput.value = '';
    renderCustomPresets($('#custom-presets'), (data, lbl, id, customName) => loadPreset(data, lbl, id, customName), toast);
    toast(`Saved "${name}"`);
  });

  $('#btn-export-blueprint')?.addEventListener('click', () => exportSkyscraperBlueprint(state, activeBlueprintName, toast));
  $('#btn-export-blueprint-top')?.addEventListener('click', () => exportSkyscraperBlueprint(state, activeBlueprintName, toast));
  $('#btn-export-json')?.addEventListener('click', () => exportSkyscraperJSON(state, activeBlueprintName, toast));
  $('#btn-export-glb')?.addEventListener('click', () => exportSkyscraperGLB(state, ready, activeBlueprintName, loadExporter, toast, setStatus));
  $('#btn-export-glb-side')?.addEventListener('click', () => exportSkyscraperGLB(state, ready, activeBlueprintName, loadExporter, toast, setStatus));

  const fileInput = $('#file-import');
  $('#btn-import-json')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) {
      handleSkyscraperFileImport(f, (cfg, label, styleId, bpName) => loadPreset(cfg, label, styleId, bpName), toast);
      fileInput.value = '';
    }
  });

  window.addEventListener('keydown', (e) => {
    handleSkyStudioKeydown(e, {
      toggleFullscreen: () => toggleSkyFullscreenViewport(view, toast, resizeRenderer),
      toggleTheatre: () => toggleSkyTheatreMode(view, toast, resizeRenderer),
      toggleDebug: () => handleToggleDebug(),
      toggleSilhouette: () => handleToggleSilhouette(),
      snapshot: () => snapshot(renderer, scene, camera, state, ready, toast),
      exitFullscreen: () => exitSkyFullscreenViewport(view, toast, resizeRenderer)
    });
  });

  document.addEventListener('fullscreenchange', () => handleSkyFullscreenChange(view, resizeRenderer));
}

function loadScript(url, check) {
  return new Promise((resolve, reject) => {
    if (check()) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    let done = false;
    const timer = setTimeout(() => finish(new Error('Timed Out Loading ' + url)), 14000);
    function finish(err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (err) {
        script.remove();
        reject(err);
      } else {
        resolve();
      }
    }
    script.onload = () => (check() ? finish() : finish(new Error('Loaded Library Missing Expected Symbols')));
    script.onerror = () => finish(new Error('Unable To Load ' + url));
    document.head.appendChild(script);
  });
}

async function loadOneOf(urls, check) {
  if (check()) return;
  let lastError = null;
  for (const url of urls) {
    try {
      await loadScript(url, check);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Missing 3d Dependency');
}

async function loadDependencies() {
  await loadOneOf([
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
  ], () => !!window.THREE?.WebGLRenderer);
  await loadOneOf([
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'
  ], () => !!window.THREE?.OrbitControls);
}

async function loadExporter() {
  await loadOneOf([
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js',
    'https://unpkg.com/three@0.128.0/examples/js/exporters/GLTFExporter.js'
  ], () => !!window.THREE?.GLTFExporter);
}

function showLoadError(error) {
  console.error('Unable To Start B Skyscraper Generator', error);
  const screen = $('#studio-loading');
  if (!screen) return;
  screen.innerHTML = '';
  const title = document.createElement('strong');
  title.textContent = '3d Preview Unavailable';
  const body = document.createElement('span');
  body.textContent = 'The Three.js Library Could Not Be Loaded. Check Your Connection And Reload This Page.';
  const detail = document.createElement('span');
  detail.textContent = error.message;
  screen.append(title, body, detail);
  setStatus('Library Error');
}

if (typeof window !== 'undefined') {
  window.BSkyscraperBlueprint = {
    SCHEMA_VERSION: BLUEPRINT_SCHEMA_VERSION,
    GENERATOR_META: copy(GENERATOR_META),
    resolveTowerComplex,
    computeSkyscraperEntrances,
    computeSkyscraperBounds,
    generateSkyscraperBlueprint,
    validateSkyscraperBlueprint,
    applyImportedSkyscraperData: (parsed, sourceLabel = 'Imported Skyscraper') =>
      applyImportedSkyscraperData(parsed, sourceLabel, (cfg, lbl, sid, bpName) => loadPreset(cfg, lbl, sid, bpName), toast),
    createSkyscraper,
    exportBlueprintJSON: () => generateSkyscraperBlueprint(state),
    fileDownload,
    safeSkyscraperName
  };
}

if (typeof document !== 'undefined') {
  initUI();
  loadDependencies().then(initScene).catch(showLoadError);
}


})();
