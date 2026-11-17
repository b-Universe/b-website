import { rng32, pick, mixHex, darkenHex } from '../utils.js';

export const OBJECT_MATERIAL_FAMILIES = {
  painted_steel: {
    id: 'painted_steel',
    label: 'Painted Steel',
    category: 'metal',
    defaultColor: '#2d6847',
    shininess: 36,
    supportsRust: true,
    supportsMoss: false,
    pattern: 'painted_metal'
  },
  galvanized_metal: {
    id: 'galvanized_metal',
    label: 'Galvanized Metal',
    category: 'metal',
    defaultColor: '#98a3ad',
    shininess: 48,
    supportsRust: true,
    supportsMoss: false,
    pattern: 'galvanized'
  },
  brushed_metal: {
    id: 'brushed_metal',
    label: 'Brushed Metal',
    category: 'metal',
    defaultColor: '#adb7c2',
    shininess: 68,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'brushed'
  },
  cast_iron: {
    id: 'cast_iron',
    label: 'Cast Iron',
    category: 'metal',
    defaultColor: '#2a3036',
    shininess: 22,
    supportsRust: true,
    supportsMoss: false,
    pattern: 'iron'
  },
  painted_aluminum: {
    id: 'painted_aluminum',
    label: 'Painted Aluminum',
    category: 'metal',
    defaultColor: '#768899',
    shininess: 52,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'painted_metal'
  },
  plastic: {
    id: 'plastic',
    label: 'Molded Plastic',
    category: 'polymer',
    defaultColor: '#2d5e8a',
    shininess: 28,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'plastic'
  },
  rubber: {
    id: 'rubber',
    label: 'Dark Rubber',
    category: 'polymer',
    defaultColor: '#1f2328',
    shininess: 8,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'rubber'
  },
  wood: {
    id: 'wood',
    label: 'Timber Wood',
    category: 'organic',
    defaultColor: '#8d5b34',
    shininess: 10,
    supportsRust: false,
    supportsMoss: true,
    pattern: 'wood'
  },
  concrete: {
    id: 'concrete',
    label: 'Precast Concrete',
    category: 'masonry',
    defaultColor: '#8a8f94',
    shininess: 6,
    supportsRust: false,
    supportsMoss: true,
    pattern: 'concrete'
  },
  brick: {
    id: 'brick',
    label: 'Masonry Brick',
    category: 'masonry',
    defaultColor: '#8d4c3b',
    shininess: 8,
    supportsRust: false,
    supportsMoss: true,
    pattern: 'brick'
  },
  glass: {
    id: 'glass',
    label: 'Tempered Glass',
    category: 'glass',
    defaultColor: '#4c7996',
    shininess: 110,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'glass'
  },
  fabric: {
    id: 'fabric',
    label: 'Awning Fabric',
    category: 'textile',
    defaultColor: '#b83d35',
    shininess: 6,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'fabric'
  },
  weathered_surface: {
    id: 'weathered_surface',
    label: 'Weathered Alloy',
    category: 'metal',
    defaultColor: '#5b564e',
    shininess: 14,
    supportsRust: true,
    supportsMoss: false,
    pattern: 'weathered'
  },
  emissive_display: {
    id: 'emissive_display',
    label: 'Illuminated Panel',
    category: 'emissive',
    defaultColor: '#66d9ff',
    shininess: 80,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'emissive'
  },
  foliage_leaf: {
    id: 'foliage_leaf',
    label: 'Stylized Foliage',
    category: 'organic',
    defaultColor: '#3f7c46',
    shininess: 6,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'foliage'
  },
  decal_surface: {
    id: 'decal_surface',
    label: 'Surface Decal',
    category: 'decal',
    defaultColor: '#3a3f46',
    shininess: 12,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'decal'
  },
  laminate_desktop: {
    id: 'laminate_desktop',
    label: 'Office Laminate',
    category: 'polymer',
    defaultColor: '#d8d2c5',
    shininess: 24,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'laminate'
  },
  light_office_wood: {
    id: 'light_office_wood',
    label: 'Light Office Wood',
    category: 'organic',
    defaultColor: '#c49a6c',
    shininess: 18,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'wood'
  },
  dark_executive_wood: {
    id: 'dark_executive_wood',
    label: 'Dark Executive Wood',
    category: 'organic',
    defaultColor: '#4d2e1d',
    shininess: 34,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'wood'
  },
  office_plastic_black: {
    id: 'office_plastic_black',
    label: 'Black Electronics Plastic',
    category: 'polymer',
    defaultColor: '#22262b',
    shininess: 16,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'plastic'
  },
  office_plastic_beige: {
    id: 'office_plastic_beige',
    label: 'Beige Office Plastic',
    category: 'polymer',
    defaultColor: '#cfc9b8',
    shininess: 18,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'plastic'
  },
  upholstery_fabric: {
    id: 'upholstery_fabric',
    label: 'Chair Upholstery Fabric',
    category: 'textile',
    defaultColor: '#35536e',
    shininess: 8,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'fabric'
  },
  mesh_upholstery: {
    id: 'mesh_upholstery',
    label: 'Ergonomic Mesh',
    category: 'textile',
    defaultColor: '#292f36',
    shininess: 12,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'mesh_weave'
  },
  faux_leather: {
    id: 'faux_leather',
    label: 'Executive Leather',
    category: 'textile',
    defaultColor: '#2b221e',
    shininess: 38,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'leather'
  },
  office_carpet: {
    id: 'office_carpet',
    label: 'Commercial Carpet',
    category: 'textile',
    defaultColor: '#47525e',
    shininess: 4,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'carpet'
  },
  polished_stone: {
    id: 'polished_stone',
    label: 'Polished Lobby Stone',
    category: 'masonry',
    defaultColor: '#d6dadf',
    shininess: 72,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'stone'
  },
  chrome_metal: {
    id: 'chrome_metal',
    label: 'Polished Chrome',
    category: 'metal',
    defaultColor: '#d0d7de',
    shininess: 92,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'brushed'
  },
  arcade_carpet_original: {
    id: 'arcade_carpet_original',
    label: 'Neon Confetti Carpet (1980s Original)',
    category: 'textile',
    defaultColor: '#000000',
    shininess: 4,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'arcade_carpet_original',
    nearestFilter: true,
    bGameTileId: 'arcade-carpet',
    textureAsset: '/assets/img/projects/city-object-suite/arcade-carpet.png',
    apartmentBuildable: true
  },
  arcade_carpet_seamless: {
    id: 'arcade_carpet_seamless',
    label: 'Neon Confetti Carpet (Seamless Tile)',
    category: 'textile',
    defaultColor: '#000000',
    shininess: 4,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'arcade_carpet_seamless',
    nearestFilter: true,
    bGameTileId: 'arcade-carpet-seamless',
    apartmentBuildable: true
  },
  arcade_carpet_purple_geo: {
    id: 'arcade_carpet_purple_geo',
    label: 'Purple Geometric Carpet',
    category: 'textile',
    defaultColor: '#23133d',
    shininess: 5,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'arcade_purple_geo',
    nearestFilter: true,
    apartmentBuildable: true
  },
  arcade_carpet_retro_squiggle: {
    id: 'arcade_carpet_retro_squiggle',
    label: 'Retro Squiggle Carpet',
    category: 'textile',
    defaultColor: '#161b2e',
    shininess: 5,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'arcade_squiggle',
    nearestFilter: true,
    apartmentBuildable: true
  },
  arcade_carpet_blacklight: {
    id: 'arcade_carpet_blacklight',
    label: 'Blacklight Neon Carpet',
    category: 'textile',
    defaultColor: '#110a24',
    shininess: 6,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'arcade_blacklight',
    nearestFilter: true,
    apartmentBuildable: true
  },
  arcade_carpet_bowling: {
    id: 'arcade_carpet_bowling',
    label: 'Bowling Alley Carpet',
    category: 'textile',
    defaultColor: '#192242',
    shininess: 5,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'arcade_bowling',
    nearestFilter: true,
    apartmentBuildable: true
  },
  arcade_carpet_party: {
    id: 'arcade_carpet_party',
    label: 'Arcade Party Room Carpet',
    category: 'textile',
    defaultColor: '#28143b',
    shininess: 5,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'arcade_party',
    nearestFilter: true,
    apartmentBuildable: true
  },
  arcade_vinyl_checker: {
    id: 'arcade_vinyl_checker',
    label: 'Checkerboard Arcade Tile',
    category: 'masonry',
    defaultColor: '#f0f2f5',
    shininess: 58,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'checker_tile',
    nearestFilter: true,
    apartmentBuildable: true
  },
  arcade_led_floor: {
    id: 'arcade_led_floor',
    label: 'Modern Led Floor Panels',
    category: 'emissive',
    defaultColor: '#141d2e',
    shininess: 85,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'led_floor_grid',
    nearestFilter: true,
    apartmentBuildable: true
  },
  arcade_wall_retro_stripe: {
    id: 'arcade_wall_retro_stripe',
    label: 'Retro Striped Arcade Wall',
    category: 'polymer',
    defaultColor: '#2a2238',
    shininess: 14,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'retro_stripe_wall',
    apartmentBuildable: true
  },
  arcade_wall_pixel_mural: {
    id: 'arcade_wall_pixel_mural',
    label: 'Pixel-Art Wall Panel',
    category: 'polymer',
    defaultColor: '#1b2038',
    shininess: 18,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'pixel_mural_wall',
    nearestFilter: true,
    apartmentBuildable: true
  },
  arcade_wall_acoustic: {
    id: 'arcade_wall_acoustic',
    label: 'Vintage Acoustic Wall',
    category: 'textile',
    defaultColor: '#363344',
    shininess: 6,
    supportsRust: false,
    supportsMoss: false,
    pattern: 'acoustic_panel',
    apartmentBuildable: true
  }
};

export const ARCADE_SURFACE_MATERIALS = [
  { id: 'neon_confetti_carpet', label: 'Neon Confetti Carpet (32x32 Reference)', surfaceKind: 'floor', materialFamily: 'arcade_carpet_original', defaultColor: '#000000', secondaryColor: '#e744dd', uvScaleMeters: 1.0, filter: 'nearest', wrap: 'repeat', textureAsset: '/assets/img/projects/city-object-suite/arcade-carpet.png', bGameTileId: 'arcade-carpet', quadrantGrid: [2, 2], apartmentBuildable: true },
  { id: 'neon_confetti_seamless', label: 'Neon Confetti Carpet (Seamless Derivative)', surfaceKind: 'floor', materialFamily: 'arcade_carpet_seamless', defaultColor: '#000000', secondaryColor: '#0be271', uvScaleMeters: 1.0, filter: 'nearest', wrap: 'repeat', bGameTileId: 'arcade-carpet-seamless', apartmentBuildable: true },
  { id: 'classic_arcade_carpet', label: 'Classic Purple Geometric Carpet', surfaceKind: 'floor', materialFamily: 'arcade_carpet_purple_geo', defaultColor: '#23133d', secondaryColor: '#9644e7', uvScaleMeters: 1.25, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'retro_squiggle_carpet', label: 'Retro 1990s Squiggle Carpet', surfaceKind: 'floor', materialFamily: 'arcade_carpet_retro_squiggle', defaultColor: '#161b2e', secondaryColor: '#38e8d6', uvScaleMeters: 1.25, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'blacklight_pattern_carpet', label: 'Blacklight Neon Carpet', surfaceKind: 'floor', materialFamily: 'arcade_carpet_blacklight', defaultColor: '#110a24', secondaryColor: '#4de2ff', uvScaleMeters: 1.0, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'bowling_alley_carpet', label: 'Bowling Alley Starburst Carpet', surfaceKind: 'floor', materialFamily: 'arcade_carpet_bowling', defaultColor: '#192242', secondaryColor: '#ff7043', uvScaleMeters: 1.25, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'arcade_party_carpet', label: 'Arcade Party Room Carpet', surfaceKind: 'floor', materialFamily: 'arcade_carpet_party', defaultColor: '#28143b', secondaryColor: '#f5c542', uvScaleMeters: 1.25, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'checkerboard_vinyl_bw', label: 'Black-And-White Checker Tile', surfaceKind: 'floor', materialFamily: 'arcade_vinyl_checker', defaultColor: '#1b1f26', secondaryColor: '#eef2f6', uvScaleMeters: 1.0, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'checkerboard_vinyl_red', label: 'Red-And-Black Diner Checker Tile', surfaceKind: 'floor', materialFamily: 'arcade_vinyl_checker', defaultColor: '#1b1f26', secondaryColor: '#c93832', uvScaleMeters: 1.0, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'dark_commercial_carpet', label: 'Dark Commercial Carpet', surfaceKind: 'floor', materialFamily: 'office_carpet', defaultColor: '#272c36', secondaryColor: '#384152', uvScaleMeters: 1.5, filter: 'linear', wrap: 'repeat', apartmentBuildable: true },
  { id: 'modern_led_floor', label: 'Modern Led Floor Panels', surfaceKind: 'floor', materialFamily: 'arcade_led_floor', defaultColor: '#141d2e', secondaryColor: '#4de2ff', uvScaleMeters: 1.0, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'purple_arcade_wall', label: 'Purple Arcade Accent Wall', surfaceKind: 'wall', materialFamily: 'painted_steel', defaultColor: '#392259', secondaryColor: '#e744dd', uvScaleMeters: 2.0, filter: 'linear', wrap: 'repeat', apartmentBuildable: true },
  { id: 'retro_striped_wall', label: 'Retro 1980s Striped Wallpaper', surfaceKind: 'wall', materialFamily: 'arcade_wall_retro_stripe', defaultColor: '#2a2238', secondaryColor: '#ff7b3b', uvScaleMeters: 1.5, filter: 'linear', wrap: 'repeat', apartmentBuildable: true },
  { id: 'pixel_mural_wall', label: 'Pixel-Art Decorative Wall Panel', surfaceKind: 'wall', materialFamily: 'arcade_wall_pixel_mural', defaultColor: '#1b2038', secondaryColor: '#4de2ff', uvScaleMeters: 1.5, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'wood_panel_1980s', label: '1980s Dark Wood Paneling', surfaceKind: 'wall', materialFamily: 'dark_executive_wood', defaultColor: '#54321e', secondaryColor: '#361f12', uvScaleMeters: 2.0, filter: 'linear', wrap: 'repeat', apartmentBuildable: true },
  { id: 'vintage_acoustic_wall', label: 'Vintage Acoustic Wall Panels', surfaceKind: 'wall', materialFamily: 'arcade_wall_acoustic', defaultColor: '#363344', secondaryColor: '#7c53c9', uvScaleMeters: 1.25, filter: 'linear', wrap: 'repeat', apartmentBuildable: true },
  { id: 'modern_led_wall', label: 'Modern Led Wall Accent Panels', surfaceKind: 'wall', materialFamily: 'arcade_led_floor', defaultColor: '#171f2e', secondaryColor: '#4de2ff', uvScaleMeters: 1.0, filter: 'nearest', wrap: 'repeat', apartmentBuildable: true },
  { id: 'exposed_industrial_ceiling', label: 'Exposed Black Industrial Ceiling', surfaceKind: 'ceiling', materialFamily: 'cast_iron', defaultColor: '#1f232b', secondaryColor: '#353b45', uvScaleMeters: 2.0, filter: 'linear', wrap: 'repeat', apartmentBuildable: true },
  { id: 'retro_ceiling_panels', label: 'Retro Colored Ceiling Panels', surfaceKind: 'ceiling', materialFamily: 'arcade_wall_acoustic', defaultColor: '#26213b', secondaryColor: '#e744dd', uvScaleMeters: 1.5, filter: 'linear', wrap: 'repeat', apartmentBuildable: true }
];

export const URBAN_PALETTES = {
  modern_downtown: {
    id: 'modern_downtown',
    label: 'Modern Downtown',
    primaries: ['#3b4958', '#4d6073', '#2d5e7a', '#5f7080', '#314252'],
    secondaries: ['#b6c0ca', '#8d9aa6', '#2a333d', '#cfd7df'],
    accents: ['#3ec7e8', '#e5a832', '#e0533c', '#58c488'],
    frames: ['#20262d', '#2b333c', '#36404a'],
    woods: ['#96673d', '#7c5330'],
    concretes: ['#8e959c', '#7b8289'],
    primaryMaterial: 'painted_aluminum',
    secondaryMaterial: 'brushed_metal',
    frameMaterial: 'cast_iron'
  },
  older_metropolitan: {
    id: 'older_metropolitan',
    label: 'Older Metropolitan',
    primaries: ['#26473a', '#354856', '#5e352d', '#495248', '#2a3642'],
    secondaries: ['#7d847c', '#988868', '#2b2f34', '#8f7d64'],
    accents: ['#c89b3c', '#9c3c31', '#4f7a68', '#d4b468'],
    frames: ['#1d2126', '#282c31', '#312b26'],
    woods: ['#6e4427', '#835230'],
    concretes: ['#848078', '#73706a'],
    primaryMaterial: 'cast_iron',
    secondaryMaterial: 'painted_steel',
    frameMaterial: 'cast_iron'
  },
  residential: {
    id: 'residential',
    label: 'Residential',
    primaries: ['#5c768a', '#4b7357', '#8d6e54', '#727c85', '#9d5948'],
    secondaries: ['#d5cfc4', '#b8b0a3', '#3b4248', '#e2ddd3'],
    accents: ['#c9873c', '#3c856d', '#bf4d3d', '#4c7ea8'],
    frames: ['#2a3036', '#3d4349', '#5a4636'],
    woods: ['#8f5d38', '#a37146'],
    concretes: ['#999891', '#888781'],
    primaryMaterial: 'painted_steel',
    secondaryMaterial: 'painted_aluminum',
    frameMaterial: 'painted_steel'
  },
  industrial: {
    id: 'industrial',
    label: 'Industrial',
    primaries: ['#8c5b32', '#4c5964', '#697254', '#385773', '#7a4035'],
    secondaries: ['#8f969d', '#727980', '#33383e', '#a3a8ad'],
    accents: ['#e0a124', '#cc4828', '#d6c13a', '#4e8ca8'],
    frames: ['#23272c', '#2e333a', '#3a3835'],
    woods: ['#916b40', '#785530'],
    concretes: ['#7b8085', '#696e73'],
    primaryMaterial: 'galvanized_metal',
    secondaryMaterial: 'painted_steel',
    frameMaterial: 'cast_iron'
  },
  municipal: {
    id: 'municipal',
    label: 'Municipal',
    primaries: ['#2a6b49', '#2b588c', '#c23c2d', '#3e6f78', '#465866'],
    secondaries: ['#adb5bd', '#2d343b', '#d9dde0', '#8f98a1'],
    accents: ['#f0b429', '#38b583', '#d9483b', '#3ca4d9'],
    frames: ['#1f252b', '#2c333b', '#384049'],
    woods: ['#825835', '#6e492b'],
    concretes: ['#8a9096', '#7a8086'],
    primaryMaterial: 'painted_steel',
    secondaryMaterial: 'galvanized_metal',
    frameMaterial: 'cast_iron'
  },
  commercial: {
    id: 'commercial',
    label: 'Commercial',
    primaries: ['#b84034', '#2e6a9c', '#d48d28', '#2f7a64', '#704982'],
    secondaries: ['#e8e3d8', '#cfd6dc', '#293038', '#f2e8cf'],
    accents: ['#f5c342', '#47d1ff', '#e85d4a', '#52c77c'],
    frames: ['#222830', '#313942', '#47362b'],
    woods: ['#966238', '#ad7847'],
    concretes: ['#94999e', '#84888d'],
    primaryMaterial: 'painted_aluminum',
    secondaryMaterial: 'fabric',
    frameMaterial: 'painted_steel'
  },
  neglected_abandoned: {
    id: 'neglected_abandoned',
    label: 'Neglected / Abandoned',
    primaries: ['#5c5548', '#4f5a54', '#69493f', '#54585c', '#635c44'],
    secondaries: ['#756e62', '#64696d', '#36332f', '#807a6f'],
    accents: ['#9e6f34', '#8a4836', '#6c7a52', '#7a7554'],
    frames: ['#262422', '#302c29', '#3b3733'],
    woods: ['#5e4b38', '#4d3e2e'],
    concretes: ['#6e6d66', '#5e5d57'],
    primaryMaterial: 'weathered_surface',
    secondaryMaterial: 'galvanized_metal',
    frameMaterial: 'cast_iron'
  },
  clean_futuristic: {
    id: 'clean_futuristic',
    label: 'Clean Futuristic',
    primaries: ['#cfd9e3', '#3b5b78', '#25384b', '#87a2ba', '#dce5ee'],
    secondaries: ['#232d38', '#455a6e', '#eff5fa', '#6f879c'],
    accents: ['#3ee6ff', '#5cffb8', '#75aaff', '#f2b84b'],
    frames: ['#1a222c', '#283442', '#394959'],
    woods: ['#85715c', '#6e5e4d'],
    concretes: ['#a2acb5', '#8b96a0'],
    primaryMaterial: 'painted_aluminum',
    secondaryMaterial: 'brushed_metal',
    frameMaterial: 'brushed_metal'
  },
  retro_futuristic: {
    id: 'retro_futuristic',
    label: 'Retro-Futuristic',
    primaries: ['#3e7c82', '#c86a3a', '#485b8a', '#b8943a', '#4b7a68'],
    secondaries: ['#dfd7c4', '#c9bfa8', '#2d353d', '#b8c4c8'],
    accents: ['#4ef0e0', '#ffb84d', '#ff6e52', '#7be382'],
    frames: ['#212830', '#333b44', '#403630'],
    woods: ['#8f5a34', '#a86e42'],
    concretes: ['#949188', '#7f7d75'],
    primaryMaterial: 'painted_steel',
    secondaryMaterial: 'brushed_metal',
    frameMaterial: 'painted_aluminum'
  },
  modern_corporate: {
    id: 'modern_corporate',
    label: 'Modern Corporate',
    primaries: ['#dcd8ce', '#cfd5dc', '#4a647a', '#e8e4da', '#364554'],
    secondaries: ['#2a3138', '#424c57', '#9aa5b0', '#c4cdd6'],
    accents: ['#38b6d6', '#336791', '#d9a441', '#4ca676'],
    frames: ['#232830', '#353d47', '#adb6bf'],
    woods: ['#c49a6c', '#a87d52'],
    concretes: ['#cfd5db', '#9ba3ab'],
    primaryMaterial: 'laminate_desktop',
    secondaryMaterial: 'upholstery_fabric',
    frameMaterial: 'brushed_metal'
  },
  budget_office: {
    id: 'budget_office',
    label: 'Budget Office',
    primaries: ['#b8afa0', '#8d969e', '#6f7c85', '#c9bfae'],
    secondaries: ['#3d444a', '#55616b', '#a89f8d', '#2f3840'],
    accents: ['#597d99', '#8a7a5c', '#4d7a64', '#9e5847'],
    frames: ['#23272c', '#383d42', '#4a4f54'],
    woods: ['#a88258', '#8c6943'],
    concretes: ['#9a9c99', '#838582'],
    primaryMaterial: 'laminate_desktop',
    secondaryMaterial: 'office_plastic_beige',
    frameMaterial: 'painted_steel'
  },
  classic_executive: {
    id: 'classic_executive',
    label: 'Classic Executive',
    primaries: ['#5c3520', '#4a2a19', '#6e4026', '#3d2417'],
    secondaries: ['#29221d', '#3a4a3e', '#592929', '#1e2836'],
    accents: ['#c49a3c', '#8c6e32', '#3d634d', '#732e2e'],
    frames: ['#211a16', '#332922', '#262b30'],
    woods: ['#5c3520', '#4d2b18'],
    concretes: ['#a8a196', '#8a847b'],
    primaryMaterial: 'dark_executive_wood',
    secondaryMaterial: 'faux_leather',
    frameMaterial: 'cast_iron'
  },
  municipal_office: {
    id: 'municipal_office',
    label: 'Municipal Office',
    primaries: ['#9aa1a8', '#7d8a94', '#b8b29e', '#687882'],
    secondaries: ['#2d4a66', '#3d6152', '#4a5259', '#c4bfb0'],
    accents: ['#d9a234', '#2e70a6', '#b84238', '#418c6b'],
    frames: ['#232a30', '#39414a', '#505962'],
    woods: ['#8f663e', '#755230'],
    concretes: ['#9ea3a8', '#83888d'],
    primaryMaterial: 'painted_steel',
    secondaryMaterial: 'laminate_desktop',
    frameMaterial: 'painted_steel'
  },
  retro_80s_office: {
    id: 'retro_80s_office',
    label: 'Retro 1980s Office',
    primaries: ['#c7b699', '#b58d58', '#8c6239', '#d1c4a8'],
    secondaries: ['#9c5a2d', '#5c7056', '#7d412d', '#4f4538'],
    accents: ['#d6812c', '#849658', '#ba4b34', '#cfa948'],
    frames: ['#3b3026', '#28231e', '#52453a'],
    woods: ['#9c6538', '#804f28'],
    concretes: ['#999082', '#827a6e'],
    primaryMaterial: 'office_plastic_beige',
    secondaryMaterial: 'light_office_wood',
    frameMaterial: 'painted_steel'
  },
  retro_90s_office: {
    id: 'retro_90s_office',
    label: 'Retro 1990s Office',
    primaries: ['#c2bdb0', '#70848c', '#98a3a6', '#b0a695'],
    secondaries: ['#335c6b', '#4d485e', '#386153', '#61564a'],
    accents: ['#4da89c', '#8570ba', '#d48d3f', '#427ab0'],
    frames: ['#2c3238', '#40474f', '#575d63'],
    woods: ['#a67e53', '#8c673f'],
    concretes: ['#a0a4a8', '#868b90'],
    primaryMaterial: 'office_plastic_beige',
    secondaryMaterial: 'upholstery_fabric',
    frameMaterial: 'painted_steel'
  },
  contemporary_tech: {
    id: 'contemporary_tech',
    label: 'Contemporary Tech',
    primaries: ['#f0f3f7', '#262d36', '#d8e0e8', '#333d47'],
    secondaries: ['#243447', '#32485e', '#6f8194', '#1d242b'],
    accents: ['#3ec7e8', '#52d49a', '#ff7b47', '#6c8eff'],
    frames: ['#1c2229', '#c2cad4', '#2e3742'],
    woods: ['#cfb186', '#b89464'],
    concretes: ['#dce2e8', '#b6bfc9'],
    primaryMaterial: 'painted_aluminum',
    secondaryMaterial: 'mesh_upholstery',
    frameMaterial: 'chrome_metal'
  },
  industrial_loft_office: {
    id: 'industrial_loft_office',
    label: 'Industrial Loft Office',
    primaries: ['#694c35', '#424952', '#825d3e', '#333a42'],
    secondaries: ['#2b2623', '#524942', '#8a5136', '#384654'],
    accents: ['#d48a28', '#c74c34', '#4d8a78', '#e0b34c'],
    frames: ['#1e2226', '#2b3036', '#3a3836'],
    woods: ['#7d5432', '#613f22'],
    concretes: ['#7b7f84', '#63676b'],
    primaryMaterial: 'light_office_wood',
    secondaryMaterial: 'cast_iron',
    frameMaterial: 'cast_iron'
  },
  clean_medical_office: {
    id: 'clean_medical_office',
    label: 'Clean Medical Office',
    primaries: ['#edf2f7', '#d8e6ed', '#cadde6', '#f4f7fa'],
    secondaries: ['#3e7ca3', '#499c8e', '#58829c', '#9eb8c7'],
    accents: ['#2ea68d', '#3891cf', '#e0584d', '#58c499'],
    frames: ['#bcc7d1', '#8fa0ad', '#3e4e5c'],
    woods: ['#cfb693', '#baa07c'],
    concretes: ['#e1e8ed', '#c6d1d9'],
    primaryMaterial: 'laminate_desktop',
    secondaryMaterial: 'faux_leather',
    frameMaterial: 'chrome_metal'
  },
  luxury_corporate_lobby: {
    id: 'luxury_corporate_lobby',
    label: 'Luxury Corporate Lobby',
    primaries: ['#dad7d0', '#30343a', '#4d3324', '#c9c3b8'],
    secondaries: ['#22252a', '#3d3129', '#2b3a4a', '#595048'],
    accents: ['#d4ab48', '#b88f38', '#4cb8c9', '#8a6d32'],
    frames: ['#1e2126', '#8f753a', '#b8bfc7'],
    woods: ['#543320', '#6e452b'],
    concretes: ['#e0dcd4', '#aba59c'],
    primaryMaterial: 'polished_stone',
    secondaryMaterial: 'dark_executive_wood',
    frameMaterial: 'chrome_metal'
  },
  neglected_office: {
    id: 'neglected_office',
    label: 'Neglected Office',
    primaries: ['#8c8574', '#6e6a61', '#7d725f', '#5e6366'],
    secondaries: ['#4a463d', '#595248', '#46524b', '#696256'],
    accents: ['#9c7538', '#874838', '#687858', '#7d7a64'],
    frames: ['#292826', '#383532', '#45413c'],
    woods: ['#6e5338', '#57412b'],
    concretes: ['#7a7870', '#696760'],
    primaryMaterial: 'weathered_surface',
    secondaryMaterial: 'upholstery_fabric',
    frameMaterial: 'cast_iron'
  },
  futuristic_ops_center: {
    id: 'futuristic_ops_center',
    label: 'Futuristic Operations Center',
    primaries: ['#243140', '#cfd9e3', '#1c2633', '#384c61'],
    secondaries: ['#18212b', '#4d647a', '#2c3d4f', '#899eb3'],
    accents: ['#4de2ff', '#4dffb8', '#759eff', '#ffb84d'],
    frames: ['#161d26', '#283645', '#687d91'],
    woods: ['#786c5c', '#5e5548'],
    concretes: ['#9ca8b5', '#7e8a96'],
    primaryMaterial: 'painted_aluminum',
    secondaryMaterial: 'mesh_upholstery',
    frameMaterial: 'brushed_metal'
  },
  arcade_1980s_retro: {
    id: 'arcade_1980s_retro',
    label: 'Classic 1980s Arcade',
    primaries: ['#5c3620', '#2b2833', '#8c3232', '#28527a', '#b8762c'],
    secondaries: ['#1d1e24', '#d4a644', '#c96f32', '#2d323b'],
    accents: ['#f5c542', '#e85d35', '#32d9c8', '#e744dd'],
    frames: ['#1b191d', '#2b2420', '#38322c'],
    woods: ['#6e4126', '#8a5432'],
    concretes: ['#3a3942', '#26252c'],
    primaryMaterial: 'wood',
    secondaryMaterial: 'painted_steel',
    frameMaterial: 'cast_iron'
  },
  arcade_1990s_mall: {
    id: 'arcade_1990s_mall',
    label: 'Vibrant 1990s Mall Arcade',
    primaries: ['#26479c', '#7c2b9c', '#1e7378', '#b82952', '#24293d'],
    secondaries: ['#1b202e', '#f0f3f7', '#2b3347', '#cfd6e3'],
    accents: ['#ff3ec8', '#3cf2e6', '#ffe142', '#32e875'],
    frames: ['#191d28', '#252c3d', '#3a4259'],
    woods: ['#7c5434', '#946742'],
    concretes: ['#2a233d', '#1c1829'],
    primaryMaterial: 'painted_aluminum',
    secondaryMaterial: 'plastic',
    frameMaterial: 'chrome_metal'
  },
  modern_family_entertainment: {
    id: 'modern_family_entertainment',
    label: 'Modern Family Entertainment',
    primaries: ['#e8edf2', '#2b6cb0', '#d9534f', '#2f9e75', '#2c3645'],
    secondaries: ['#222a35', '#cfd8e3', '#384659', '#f5f7fa'],
    accents: ['#38d9ff', '#ff9436', '#5ae07c', '#ff4d88'],
    frames: ['#202833', '#374454', '#9aa8b8'],
    woods: ['#b58b5c', '#997248'],
    concretes: ['#303947', '#212833'],
    primaryMaterial: 'plastic',
    secondaryMaterial: 'painted_aluminum',
    frameMaterial: 'chrome_metal'
  },
  superhero_cyber_arcade: {
    id: 'superhero_cyber_arcade',
    label: 'Superhero Cyber Arcade',
    primaries: ['#1b2336', '#283654', '#38245e', '#182b3b'],
    secondaries: ['#141926', '#425878', '#2a2042', '#7089ab'],
    accents: ['#4de2ff', '#b55cff', '#3dffb2', '#ff4da6'],
    frames: ['#111520', '#232e45', '#4e6485'],
    woods: ['#4a4252', '#383240'],
    concretes: ['#1a2133', '#121724'],
    primaryMaterial: 'painted_aluminum',
    secondaryMaterial: 'brushed_metal',
    frameMaterial: 'chrome_metal'
  },
  home_game_room: {
    id: 'home_game_room',
    label: 'Residential Game Room',
    primaries: ['#4d2f22', '#26453a', '#7a2b32', '#283e5e', '#262b33'],
    secondaries: ['#1e2229', '#d6cfc2', '#3b332d', '#8c6943'],
    accents: ['#e8b339', '#4cc9b0', '#e85d4a', '#a85cff'],
    frames: ['#1d1c21', '#2c2723', '#423a33'],
    woods: ['#6e4427', '#8c5a34'],
    concretes: ['#383430', '#2b2824'],
    primaryMaterial: 'light_office_wood',
    secondaryMaterial: 'faux_leather',
    frameMaterial: 'cast_iron'
  }
};

export function generateObjectPalette(paletteFamilyId, seed = 1024, condition = 'clean') {
  const r = rng32((seed >>> 0) || 1024);
  const key = paletteFamilyId && URBAN_PALETTES[paletteFamilyId] ? paletteFamilyId : 'municipal';
  const pal = URBAN_PALETTES[key];

  let primary = pick(r, pal.primaries);
  let secondary = pick(r, pal.secondaries);
  let accent = pick(r, pal.accents);
  const frame = pick(r, pal.frames);
  const wood = pick(r, pal.woods);
  const concrete = pick(r, pal.concretes);

  if (condition === 'neglected' || condition === 'damaged') {
    primary = mixHex(primary, '#574a3a', 0.28);
    secondary = mixHex(secondary, '#5d5549', 0.22);
    accent = darkenHex(accent, 0.18);
  } else if (condition === 'weathered') {
    primary = mixHex(primary, '#61584b', 0.16);
  }

  return {
    paletteFamily: key,
    primaryMaterial: pal.primaryMaterial,
    primaryColor: primary,
    secondaryMaterial: pal.secondaryMaterial,
    secondaryColor: secondary,
    accentMaterial: 'painted_steel',
    accentColor: accent,
    frameMaterial: pal.frameMaterial,
    frameColor: frame,
    woodColor: wood,
    concreteColor: concrete,
    glassColor: '#365870',
    emissiveColor: accent
  };
}
