export const TREE_CATEGORIES = [
  { id: 'all', label: 'All Flora', icon: 'fa-seedling' },
  { id: 'deciduous', label: 'Deciduous', icon: 'fa-tree' },
  { id: 'conifer', label: 'Conifers', icon: 'fa-mountain' },
  { id: 'tropical', label: 'Tropical & Wetland', icon: 'fa-umbrella-beach' },
  { id: 'arid', label: 'Arid & Bamboo', icon: 'fa-sun' },
  { id: 'shrubs', label: 'Shrubs & Bonsai', icon: 'fa-scissors' },
  { id: 'fantasy', label: 'Fantasy & Arcane', icon: 'fa-gem' }
];

export const TREE_SPECIES = [
  {
    id: 'oak',
    name: 'Broadleaf Oak',
    shortName: 'Oak',
    category: 'deciduous',
    icon: 'fa-tree',
    description: 'Classic broad crown oak with sturdy spreading limbs and layered foliage clusters.',
    defaultPreset: 'lumbridge_oak',
    foliageMode: 'broadleaf',
    barkMode: 'furrowed',
    supportsFruit: true,
    supportsSnow: true
  },
  {
    id: 'maple',
    name: 'Maple & Ginkgo',
    shortName: 'Maple',
    category: 'deciduous',
    icon: 'fa-canadian-maple-leaf',
    description: 'Tiered multi-crown maple with vibrant seasonal leaf pads and graceful forks.',
    defaultPreset: 'seers_maple',
    foliageMode: 'tiered_pads',
    barkMode: 'smooth_furrowed',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'birch',
    name: 'Silver Birch',
    shortName: 'Birch',
    category: 'deciduous',
    icon: 'fa-leaf',
    description: 'Slender pale trunk with dark horizontal lenticel bands and airy crown.',
    defaultPreset: 'silver_birch',
    foliageMode: 'airy',
    barkMode: 'birch',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'sakura',
    name: 'Cherry Blossom',
    shortName: 'Sakura',
    category: 'deciduous',
    icon: 'fa-spa',
    description: 'Sweeping gnarled boughs crowned with lush layered blossom clouds.',
    defaultPreset: 'kyoto_sakura',
    foliageMode: 'blossom_pads',
    barkMode: 'banded_dark',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'willow',
    name: 'Weeping Willow',
    shortName: 'Willow',
    category: 'deciduous',
    icon: 'fa-water',
    description: 'Wide umbrella crown draped with cascading low-poly weeping frond curtains.',
    defaultPreset: 'draynor_willow',
    foliageMode: 'weeping',
    barkMode: 'furrowed',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'baobab',
    name: 'Savanna Baobab',
    shortName: 'Baobab',
    category: 'arid',
    icon: 'fa-sun',
    description: 'Massive bottle-shaped trunk topped with stubby horizontal arms and flat crown pads.',
    defaultPreset: 'savanna_baobab',
    foliageMode: 'flat_umbrella',
    barkMode: 'smooth_thick',
    supportsFruit: true,
    supportsSnow: false
  },
  {
    id: 'pine',
    name: 'Alpine Conifer',
    shortName: 'Conifer',
    category: 'conifer',
    icon: 'fa-mountain',
    description: 'Tiered evergreen conical skirts tapering cleanly to a winter-ready spire.',
    defaultPreset: 'rellekka_pine',
    foliageMode: 'conifer_cones',
    barkMode: 'scaly',
    supportsFruit: true,
    supportsSnow: true
  },
  {
    id: 'cypress',
    name: 'Columnar Cypress',
    shortName: 'Cypress',
    category: 'conifer',
    icon: 'fa-caret-up',
    description: 'Tall slender Mediterranean cypress and Italian poplar flame silhouettes.',
    defaultPreset: 'tuscan_cypress',
    foliageMode: 'columnar',
    barkMode: 'furrowed',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'redwood',
    name: 'Giant Redwood',
    shortName: 'Redwood',
    category: 'conifer',
    icon: 'fa-monument',
    description: 'Towering ancient sequoia with fluted buttress trunk and high-altitude needle shelves.',
    defaultPreset: 'sequoia_giant',
    foliageMode: 'high_boughs',
    barkMode: 'deep_red_furrow',
    supportsFruit: true,
    supportsSnow: true
  },
  {
    id: 'yew',
    name: 'Ancient Yew',
    shortName: 'Yew',
    category: 'conifer',
    icon: 'fa-shield-halved',
    description: 'Gnarled multi-ribbed ancient trunk with dense evergreen boughs and wide root flare.',
    defaultPreset: 'edgeville_yew',
    foliageMode: 'dense_evergreen',
    barkMode: 'gnarled_ancient',
    supportsFruit: true,
    supportsSnow: true
  },
  {
    id: 'palm',
    name: 'Coconut Palm',
    shortName: 'Palm',
    category: 'tropical',
    icon: 'fa-umbrella-beach',
    description: 'Curved segmented trunk topped with arched pinnate fronds and coconut clusters.',
    defaultPreset: 'karamja_palm',
    foliageMode: 'palm_fronds',
    barkMode: 'palm_rings',
    supportsFruit: true,
    supportsSnow: false
  },
  {
    id: 'banana_palm',
    name: 'Banana & Fan Palm',
    shortName: 'Banana',
    category: 'tropical',
    icon: 'fa-fan',
    description: 'Short fleshy pseudo-stem bursting with oversized broad tropical paddle leaves.',
    defaultPreset: 'jungle_banana_palm',
    foliageMode: 'paddle_leaves',
    barkMode: 'smooth_stalk',
    supportsFruit: true,
    supportsSnow: false
  },
  {
    id: 'mangrove',
    name: 'Swamp Mangrove',
    shortName: 'Mangrove',
    category: 'tropical',
    icon: 'fa-water-ladder',
    description: 'Interlaced aerial prop stilt roots supporting a humid wetland canopy.',
    defaultPreset: 'lumbridge_swamp_mangrove',
    foliageMode: 'broadleaf',
    barkMode: 'wet_bark',
    supportsFruit: false,
    supportsSnow: false
  },
  {
    id: 'cactus',
    name: 'Saguaro Cactus',
    shortName: 'Cactus',
    category: 'arid',
    icon: 'fa-spa',
    description: 'Ribbed desert succulent column with curved elbow arms and bloom caps.',
    defaultPreset: 'kharid_saguaro',
    foliageMode: 'succulent_bloom',
    barkMode: 'ribbed_cactus',
    supportsFruit: true,
    supportsSnow: false
  },
  {
    id: 'bamboo',
    name: 'Bamboo Clump',
    shortName: 'Bamboo',
    category: 'arid',
    icon: 'fa-grip-lines-vertical',
    description: 'Clustered jointed green culms crowned with feathery side-shoot leaf tufts.',
    defaultPreset: 'pandaria_bamboo',
    foliageMode: 'bamboo_tufts',
    barkMode: 'bamboo_nodes',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'dead',
    name: 'Wilderness Deadwood',
    shortName: 'Deadwood',
    category: 'arid',
    icon: 'fa-skull-crossbones',
    description: 'Leafless charred or sun-bleached snag with forked crooked branches and stumps.',
    defaultPreset: 'wildy_dead',
    foliageMode: 'none',
    barkMode: 'cracked_dry',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'bush',
    name: 'Wild Shrubbery',
    shortName: 'Shrub',
    category: 'shrubs',
    icon: 'fa-seedling',
    description: 'Ground-hugging foliage clumps with customizable berry, blossom, or thorn variants.',
    defaultPreset: 'basic_shrub',
    foliageMode: 'shrub',
    barkMode: 'twig',
    supportsFruit: true,
    supportsSnow: true
  },
  {
    id: 'topiary',
    name: 'Park Topiary',
    shortName: 'Topiary',
    category: 'shrubs',
    icon: 'fa-shapes',
    description: 'Sculpted geometric garden hedges, spirals, tiered spheres, and city planter trees.',
    defaultPreset: 'royal_spiral_topiary',
    foliageMode: 'topiary',
    barkMode: 'smooth_trimmed',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'bonsai',
    name: 'Sculpted Bonsai',
    shortName: 'Bonsai',
    category: 'shrubs',
    icon: 'fa-mountain-sun',
    description: 'Miniature wind-swept serpentine trunk with cloud foliage pads in an artisan ceramic pot.',
    defaultPreset: 'zen_pine_bonsai',
    foliageMode: 'cloud_pads',
    barkMode: 'gnarled_ancient',
    supportsFruit: false,
    supportsSnow: true
  },
  {
    id: 'fantasy',
    name: 'Arcane & Glowshroom',
    shortName: 'Fantasy',
    category: 'fantasy',
    icon: 'fa-gem',
    description: 'Crystal spires, bioluminescent giant mushrooms, and arcane mana trees with glowing pods.',
    defaultPreset: 'prif_crystal',
    foliageMode: 'fantasy',
    barkMode: 'arcane',
    supportsFruit: true,
    supportsSnow: true
  }
];

export const TREE_PRESETS = {
  // Classic B Remastered presets
  lumbridge_oak: {
    id: 'lumbridge_oak', name: 'Lumbridge Oak', category: 'deciduous', species: 'oak',
    seed: 1337, height: 6.5, radius: 0.52, taper: 0.62, curve: 0.22, branches: 5, secondaryBranches: 2,
    gnarl: 0.30, radialSegments: 6, rootFlare: 0.45, rootStyle: 'buttress', spread: 3.7, canopyHeight: 1.0,
    density: 14, clusterSize: 1.45, polyDetail: 1, jitter: 0.18, leafStyle: 'icosahedron', canopyShape: 'dome',
    season: 'summer', colorLeaf1: '#3b7a2e', colorLeaf2: '#5a9e38', colorBark: '#5c4028', colorAccent: '#e8f4f8',
    colorVar: 0.16, snow: 0.0, mossCoverage: 0.12, fruitType: 'none'
  },
  seers_maple: {
    id: 'seers_maple', name: "Seers' Maple", category: 'deciduous', species: 'maple',
    seed: 4092, height: 7.4, radius: 0.46, taper: 0.65, curve: 0.18, branches: 6, secondaryBranches: 2,
    gnarl: 0.25, radialSegments: 6, rootFlare: 0.4, rootStyle: 'flared', spread: 4.1, canopyHeight: 1.15,
    density: 18, clusterSize: 1.50, polyDetail: 1, jitter: 0.22, leafStyle: 'faceted_pad', canopyShape: 'layered',
    season: 'autumn', colorLeaf1: '#c93b18', colorLeaf2: '#e67e17', colorBark: '#4a3525', colorAccent: '#ffbe3d',
    colorVar: 0.22, snow: 0.15, mossCoverage: 0.05
  },
  silver_birch: {
    id: 'silver_birch', name: 'Silver Birch', category: 'deciduous', species: 'birch',
    seed: 8821, height: 7.8, radius: 0.30, taper: 0.72, curve: 0.28, branches: 5, secondaryBranches: 2,
    gnarl: 0.20, radialSegments: 6, rootFlare: 0.25, rootStyle: 'flared', spread: 2.8, canopyHeight: 1.35,
    density: 13, clusterSize: 1.20, polyDetail: 1, jitter: 0.16, leafStyle: 'icosahedron', canopyShape: 'oval',
    season: 'spring', colorLeaf1: '#64b543', colorLeaf2: '#91d966', colorBark: '#dcd6cd', colorAccent: '#fff0f6',
    colorVar: 0.14, snow: 0.0, barkTextureStyle: 'birch_lenticel'
  },
  draynor_willow: {
    id: 'draynor_willow', name: 'Draynor Willow', category: 'deciduous', species: 'willow',
    seed: 3105, height: 6.2, radius: 0.58, taper: 0.58, curve: 0.42, branches: 6, secondaryBranches: 2,
    gnarl: 0.45, radialSegments: 6, rootFlare: 0.65, rootStyle: 'buttress', spread: 4.4, canopyHeight: 1.1,
    density: 18, clusterSize: 1.35, polyDetail: 1, jitter: 0.15, season: 'summer',
    colorLeaf1: '#3d7040', colorLeaf2: '#5d9152', colorBark: '#4a3b28', colorAccent: '#a3c98d',
    colorVar: 0.14, snow: 0.0, mossCoverage: 0.25, vineDensity: 0.25
  },
  rellekka_pine: {
    id: 'rellekka_pine', name: 'Rellekka Pine', category: 'conifer', species: 'pine',
    seed: 7741, height: 9.2, radius: 0.42, taper: 0.80, curve: 0.08, branches: 6, secondaryBranches: 0,
    gnarl: 0.12, radialSegments: 6, rootFlare: 0.35, rootStyle: 'flared', spread: 3.1, canopyHeight: 1.45,
    density: 7, clusterSize: 1.55, polyDetail: 1, jitter: 0.12, season: 'winter',
    colorLeaf1: '#1f4d36', colorLeaf2: '#2d6648', colorBark: '#422c1d', colorAccent: '#f0f8ff',
    colorVar: 0.10, snow: 0.58, fruitType: 'pinecones', fruitDensity: 0.45
  },
  karamja_palm: {
    id: 'karamja_palm', name: 'Karamja Palm', category: 'tropical', species: 'palm',
    seed: 5519, height: 7.6, radius: 0.36, taper: 0.55, curve: 0.68, branches: 8, secondaryBranches: 0,
    gnarl: 0.15, radialSegments: 6, rootFlare: 0.3, rootStyle: 'flared', spread: 4.2, canopyHeight: 0.8,
    density: 9, clusterSize: 1.4, polyDetail: 1, jitter: 0.10, season: 'tropical',
    colorLeaf1: '#4d9c2d', colorLeaf2: '#76bf43', colorBark: '#755638', colorAccent: '#4a321a',
    colorVar: 0.12, snow: 0.0, fruitType: 'coconuts', fruitDensity: 0.7
  },
  wildy_dead: {
    id: 'wildy_dead', name: 'Wildy Deadwood', category: 'arid', species: 'dead',
    seed: 6660, height: 6.4, radius: 0.50, taper: 0.68, curve: 0.48, branches: 7, secondaryBranches: 3,
    gnarl: 0.72, radialSegments: 5, rootFlare: 0.55, rootStyle: 'buttress', spread: 3.5, canopyHeight: 1.0,
    density: 6, clusterSize: 0.8, polyDetail: 0, jitter: 0.25, season: 'autumn',
    colorLeaf1: '#3b322c', colorLeaf2: '#4f433b', colorBark: '#382f29', colorAccent: '#6e5f53',
    colorVar: 0.10, snow: 0.0, hollowEnabled: true, shelfMushrooms: 0.35
  },
  prif_crystal: {
    id: 'prif_crystal', name: 'Crystal Magic', category: 'fantasy', species: 'fantasy',
    seed: 9999, height: 7.5, radius: 0.46, taper: 0.65, curve: 0.35, branches: 6, secondaryBranches: 2,
    gnarl: 0.40, radialSegments: 6, rootFlare: 0.5, rootStyle: 'twisted', spread: 3.8, canopyHeight: 1.25,
    density: 16, clusterSize: 1.35, polyDetail: 1, jitter: 0.20, fantasyForm: 'crystal',
    season: 'arcane', colorLeaf1: '#00d4ff', colorLeaf2: '#9d4edd', colorBark: '#232946', colorAccent: '#e0fbfc',
    colorVar: 0.25, snow: 0.35, emissiveIntensity: 0.65
  },
  basic_shrub: {
    id: 'basic_shrub', name: 'Basic Shrub', category: 'shrubs', species: 'bush',
    seed: 2048, height: 2.3, radius: 0.22, taper: 0.70, curve: 0.18, branches: 4, secondaryBranches: 1,
    gnarl: 0.25, radialSegments: 5, rootFlare: 0.15, rootStyle: 'none', spread: 2.7, canopyHeight: 0.85,
    density: 12, clusterSize: 1.20, polyDetail: 1, jitter: 0.18, season: 'summer',
    colorLeaf1: '#2f6d22', colorLeaf2: '#478f31', colorBark: '#453221', colorAccent: '#e8f4f8',
    colorVar: 0.14, snow: 0.0, shrubVariant: 'basic', berryDensity: 0.45, berryColor: '#ff2a55',
    berrySize: 0.18, blossomDensity: 0.45, blossomColor: '#ff85a2', blossomSize: 0.20
  },
  varrock_bush: {
    id: 'varrock_bush', name: 'Berry Bush', category: 'shrubs', species: 'bush',
    seed: 2048, height: 2.4, radius: 0.24, taper: 0.70, curve: 0.20, branches: 4, secondaryBranches: 1,
    gnarl: 0.30, radialSegments: 5, rootFlare: 0.15, rootStyle: 'none', spread: 2.8, canopyHeight: 0.85,
    density: 12, clusterSize: 1.25, polyDetail: 1, jitter: 0.20, season: 'spring',
    colorLeaf1: '#397d28', colorLeaf2: '#559e3e', colorBark: '#4f3824', colorAccent: '#e8f4f8',
    colorVar: 0.15, snow: 0.0, shrubVariant: 'berry', berryDensity: 0.55, berryColor: '#ff2a55',
    berrySize: 0.18, blossomDensity: 0.45, blossomColor: '#ff85a2', blossomSize: 0.20
  },
  flowering_shrub: {
    id: 'flowering_shrub', name: 'Flowering Shrub', category: 'shrubs', species: 'bush',
    seed: 3344, height: 2.5, radius: 0.25, taper: 0.70, curve: 0.22, branches: 4, secondaryBranches: 1,
    gnarl: 0.28, radialSegments: 5, rootFlare: 0.15, rootStyle: 'none', spread: 2.9, canopyHeight: 0.90,
    density: 14, clusterSize: 1.25, polyDetail: 1, jitter: 0.18, season: 'spring',
    colorLeaf1: '#3e8428', colorLeaf2: '#61a845', colorBark: '#4a3622', colorAccent: '#ffccd5',
    colorVar: 0.15, snow: 0.0, shrubVariant: 'flowering', berryDensity: 0.45, berryColor: '#ff2a55',
    berrySize: 0.18, blossomDensity: 0.60, blossomColor: '#ff85a2', blossomSize: 0.22
  },

  // Deciduous presets
  kyoto_sakura: {
    id: 'kyoto_sakura', name: 'Kyoto Sakura', category: 'deciduous', species: 'sakura',
    seed: 5120, height: 6.4, radius: 0.44, taper: 0.60, curve: 0.44, branches: 7, secondaryBranches: 3,
    gnarl: 0.42, radialSegments: 6, rootFlare: 0.50, rootStyle: 'flared', spread: 4.6, canopyHeight: 0.95,
    density: 20, clusterSize: 1.45, polyDetail: 1, jitter: 0.20, season: 'blossom',
    colorLeaf1: '#f48fb1', colorLeaf2: '#ffc1e3', colorBark: '#3e2d31', colorAccent: '#fff5f8',
    colorVar: 0.18, snow: 0.30, ambientFx: 'petals'
  },
  golden_aspen_grove: {
    id: 'golden_aspen_grove', name: 'Golden Aspen', category: 'deciduous', species: 'birch',
    seed: 2290, height: 8.6, radius: 0.28, taper: 0.78, curve: 0.16, branches: 6, secondaryBranches: 2,
    gnarl: 0.16, radialSegments: 6, rootFlare: 0.20, rootStyle: 'flared', spread: 2.6, canopyHeight: 1.5,
    density: 16, clusterSize: 1.15, polyDetail: 1, jitter: 0.16, season: 'autumn',
    colorLeaf1: '#e09f1f', colorLeaf2: '#ffd166', colorBark: '#e6e2d8', colorAccent: '#fff3b0',
    colorVar: 0.20, snow: 0.0, barkTextureStyle: 'birch_lenticel'
  },
  city_boulevard_linden: {
    id: 'city_boulevard_linden', name: 'City Boulevard Tree', category: 'deciduous', species: 'oak',
    seed: 1984, height: 6.2, radius: 0.34, taper: 0.72, curve: 0.08, branches: 5, secondaryBranches: 2,
    gnarl: 0.15, radialSegments: 7, rootFlare: 0.20, rootStyle: 'none', spread: 3.1, canopyHeight: 1.15,
    density: 15, clusterSize: 1.25, polyDetail: 1, jitter: 0.14, season: 'summer',
    colorLeaf1: '#418232', colorLeaf2: '#66ad49', colorBark: '#57463a', colorAccent: '#d9f7be',
    colorVar: 0.12, snow: 0.0, groundAttachment: 'city_grate', environmentStage: 'city_sidewalk'
  },
  courtyard_planter_maple: {
    id: 'courtyard_planter_maple', name: 'Planter Street Maple', category: 'deciduous', species: 'maple',
    seed: 3311, height: 5.0, radius: 0.28, taper: 0.68, curve: 0.18, branches: 5, secondaryBranches: 2,
    gnarl: 0.24, radialSegments: 6, rootFlare: 0.15, rootStyle: 'none', spread: 3.0, canopyHeight: 0.95,
    density: 14, clusterSize: 1.15, polyDetail: 1, jitter: 0.18, season: 'autumn',
    colorLeaf1: '#b83227', colorLeaf2: '#e85d04', colorBark: '#4a3a31', colorAccent: '#faa307',
    colorVar: 0.18, snow: 0.0, groundAttachment: 'stone_planter', environmentStage: 'city_sidewalk'
  },
  cherry_orchard_apple: {
    id: 'cherry_orchard_apple', name: 'Orchard Apple Tree', category: 'deciduous', species: 'oak',
    seed: 4412, height: 5.2, radius: 0.42, taper: 0.58, curve: 0.28, branches: 6, secondaryBranches: 2,
    gnarl: 0.36, radialSegments: 6, rootFlare: 0.40, rootStyle: 'flared', spread: 3.8, canopyHeight: 0.95,
    density: 15, clusterSize: 1.35, polyDetail: 1, jitter: 0.18, season: 'summer',
    colorLeaf1: '#3c7a2a', colorLeaf2: '#589e3c', colorBark: '#5c4028', colorAccent: '#e63946',
    colorVar: 0.15, snow: 0.0, fruitType: 'apples', fruitDensity: 0.65, fruitColor: '#e63946'
  },
  enchanted_autumn_oak: {
    id: 'enchanted_autumn_oak', name: 'Lantern Grove Oak', category: 'deciduous', species: 'oak',
    seed: 7104, height: 7.4, radius: 0.60, taper: 0.58, curve: 0.26, branches: 6, secondaryBranches: 3,
    gnarl: 0.40, radialSegments: 6, rootFlare: 0.65, rootStyle: 'buttress', spread: 4.5, canopyHeight: 1.05,
    density: 18, clusterSize: 1.55, polyDetail: 1, jitter: 0.20, season: 'autumn',
    colorLeaf1: '#c45119', colorLeaf2: '#e89020', colorBark: '#4f3524', colorAccent: '#ffd166',
    colorVar: 0.22, snow: 0.08, detailProp: 'lanterns', lightingMode: 'golden_hour', shelfMushrooms: 0.35
  },

  // Conifer presets
  nordic_spruce: {
    id: 'nordic_spruce', name: 'Nordic Spruce', category: 'conifer', species: 'pine',
    seed: 1091, height: 10.4, radius: 0.38, taper: 0.82, curve: 0.05, branches: 5, secondaryBranches: 0,
    gnarl: 0.10, radialSegments: 6, rootFlare: 0.30, rootStyle: 'flared', spread: 2.9, canopyHeight: 1.55,
    density: 9, clusterSize: 1.45, polyDetail: 1, jitter: 0.14, season: 'summer',
    colorLeaf1: '#1a4531', colorLeaf2: '#296346', colorBark: '#452e1e', colorAccent: '#cde8d5',
    colorVar: 0.10, snow: 0.0, fruitType: 'pinecones', fruitDensity: 0.55
  },
  winter_frost_fir: {
    id: 'winter_frost_fir', name: 'Frostpeak Fir', category: 'conifer', species: 'pine',
    seed: 8877, height: 9.8, radius: 0.40, taper: 0.80, curve: 0.06, branches: 6, secondaryBranches: 0,
    gnarl: 0.10, radialSegments: 6, rootFlare: 0.32, rootStyle: 'flared', spread: 3.2, canopyHeight: 1.50,
    density: 8, clusterSize: 1.50, polyDetail: 1, jitter: 0.12, season: 'winter',
    colorLeaf1: '#234740', colorLeaf2: '#366159', colorBark: '#3b2b23', colorAccent: '#f2faff',
    colorVar: 0.10, snow: 0.82, environmentStage: 'snow_tundra', ambientFx: 'snow'
  },
  tuscan_cypress: {
    id: 'tuscan_cypress', name: 'Tuscan Cypress', category: 'conifer', species: 'cypress',
    seed: 3501, height: 9.6, radius: 0.28, taper: 0.78, curve: 0.06, branches: 3, secondaryBranches: 0,
    gnarl: 0.08, radialSegments: 6, rootFlare: 0.20, rootStyle: 'none', spread: 1.5, canopyHeight: 1.65,
    density: 9, clusterSize: 1.15, polyDetail: 1, jitter: 0.10, season: 'summer',
    colorLeaf1: '#224a2b', colorLeaf2: '#356b3d', colorBark: '#523b2a', colorAccent: '#9bc49a',
    colorVar: 0.12, snow: 0.0
  },
  sequoia_giant: {
    id: 'sequoia_giant', name: 'Giant Sequoia', category: 'conifer', species: 'redwood',
    seed: 6021, height: 15.5, radius: 1.05, taper: 0.70, curve: 0.05, branches: 8, secondaryBranches: 2,
    gnarl: 0.18, radialSegments: 8, rootFlare: 0.85, rootStyle: 'buttress', spread: 4.8, canopyHeight: 1.25,
    density: 16, clusterSize: 1.85, polyDetail: 1, jitter: 0.18, season: 'summer',
    colorLeaf1: '#235334', colorLeaf2: '#367549', colorBark: '#6b3222', colorAccent: '#a8d5ba',
    colorVar: 0.12, snow: 0.0, mossCoverage: 0.35, shelfMushrooms: 0.25
  },
  edgeville_yew: {
    id: 'edgeville_yew', name: 'Ancient Yew', category: 'conifer', species: 'yew',
    seed: 4242, height: 7.2, radius: 0.68, taper: 0.56, curve: 0.30, branches: 7, secondaryBranches: 2,
    gnarl: 0.55, radialSegments: 7, rootFlare: 0.75, rootStyle: 'twisted', spread: 4.4, canopyHeight: 1.1,
    density: 18, clusterSize: 1.50, polyDetail: 1, jitter: 0.22, season: 'summer',
    colorLeaf1: '#1d4428', colorLeaf2: '#2e613a', colorBark: '#473022', colorAccent: '#d62828',
    colorVar: 0.14, snow: 0.0, mossCoverage: 0.30, hollowEnabled: true
  },
  coastal_windswept_pine: {
    id: 'coastal_windswept_pine', name: 'Coastal Windswept Pine', category: 'conifer', species: 'pine',
    seed: 5091, height: 6.2, radius: 0.36, taper: 0.65, curve: 0.85, branches: 5, secondaryBranches: 0,
    gnarl: 0.45, radialSegments: 6, rootFlare: 0.45, rootStyle: 'twisted', spread: 3.4, canopyHeight: 0.90,
    density: 6, clusterSize: 1.35, polyDetail: 1, jitter: 0.22, season: 'summer',
    colorLeaf1: '#2b5e3b', colorLeaf2: '#468255', colorBark: '#543c2c', colorAccent: '#d9ed92',
    colorVar: 0.15, snow: 0.0, windStrength: 0.65
  },

  // Tropical & wetland presets
  oasis_date_palm: {
    id: 'oasis_date_palm', name: 'Oasis Date Palm', category: 'tropical', species: 'palm',
    seed: 9102, height: 8.8, radius: 0.40, taper: 0.62, curve: 0.45, branches: 10, secondaryBranches: 0,
    gnarl: 0.12, radialSegments: 6, rootFlare: 0.35, rootStyle: 'flared', spread: 4.5, canopyHeight: 0.90,
    density: 12, clusterSize: 1.45, polyDetail: 1, jitter: 0.10, season: 'arid',
    colorLeaf1: '#538d22', colorLeaf2: '#73a942', colorBark: '#826142', colorAccent: '#b5651d',
    colorVar: 0.12, snow: 0.0, fruitType: 'coconuts', fruitDensity: 0.85, environmentStage: 'desert_sand'
  },
  jungle_banana_palm: {
    id: 'jungle_banana_palm', name: 'Tropical Banana Palm', category: 'tropical', species: 'banana_palm',
    seed: 3177, height: 4.4, radius: 0.32, taper: 0.68, curve: 0.24, branches: 6, secondaryBranches: 0,
    gnarl: 0.15, radialSegments: 6, rootFlare: 0.25, rootStyle: 'flared', spread: 3.8, canopyHeight: 0.95,
    density: 8, clusterSize: 1.55, polyDetail: 1, jitter: 0.12, season: 'tropical',
    colorLeaf1: '#3fa32b', colorLeaf2: '#70c943', colorBark: '#5c7a38', colorAccent: '#f4d35e',
    colorVar: 0.16, snow: 0.0, fruitType: 'bananas', fruitDensity: 0.70
  },
  lumbridge_swamp_mangrove: {
    id: 'lumbridge_swamp_mangrove', name: 'Swamp Mangrove', category: 'tropical', species: 'mangrove',
    seed: 6420, height: 6.4, radius: 0.44, taper: 0.62, curve: 0.36, branches: 6, secondaryBranches: 2,
    gnarl: 0.48, radialSegments: 6, rootFlare: 0.90, rootStyle: 'stilt', spread: 4.2, canopyHeight: 1.0,
    density: 15, clusterSize: 1.35, polyDetail: 1, jitter: 0.20, season: 'tropical',
    colorLeaf1: '#2f6e3a', colorLeaf2: '#4b8f4e', colorBark: '#45382a', colorAccent: '#8fbc8f',
    colorVar: 0.16, snow: 0.0, mossCoverage: 0.45, vineDensity: 0.55, environmentStage: 'forest_floor'
  },

  // Arid & bamboo presets
  savanna_baobab: {
    id: 'savanna_baobab', name: 'Savanna Baobab', category: 'arid', species: 'baobab',
    seed: 7811, height: 8.4, radius: 1.18, taper: 0.52, curve: 0.12, branches: 6, secondaryBranches: 2,
    gnarl: 0.32, radialSegments: 8, rootFlare: 0.70, rootStyle: 'buttress', spread: 5.4, canopyHeight: 0.70,
    density: 12, clusterSize: 1.65, polyDetail: 1, jitter: 0.18, season: 'arid',
    colorLeaf1: '#6a8e36', colorLeaf2: '#92b34c', colorBark: '#7d6352', colorAccent: '#e9d8a6',
    colorVar: 0.14, snow: 0.0, environmentStage: 'desert_sand'
  },
  kharid_saguaro: {
    id: 'kharid_saguaro', name: 'Kharid Saguaro', category: 'arid', species: 'cactus',
    seed: 1414, height: 4.8, radius: 0.38, taper: 0.85, curve: 0.08, branches: 3, secondaryBranches: 0,
    gnarl: 0.12, radialSegments: 8, rootFlare: 0.15, rootStyle: 'none', spread: 2.2, canopyHeight: 1.0,
    density: 4, clusterSize: 0.9, polyDetail: 1, jitter: 0.08, season: 'arid',
    colorLeaf1: '#3b8c47', colorLeaf2: '#55ab5e', colorBark: '#2f7339', colorAccent: '#ff5d8f',
    colorVar: 0.10, snow: 0.0, fruitType: 'cactus_bloom', fruitDensity: 0.75, environmentStage: 'desert_sand'
  },
  pandaria_bamboo: {
    id: 'pandaria_bamboo', name: 'Jade Bamboo Clump', category: 'arid', species: 'bamboo',
    seed: 8008, height: 7.4, radius: 0.16, taper: 0.85, curve: 0.18, branches: 7, secondaryBranches: 0,
    gnarl: 0.12, radialSegments: 6, rootFlare: 0.10, rootStyle: 'none', spread: 2.6, canopyHeight: 1.15,
    density: 12, clusterSize: 1.05, polyDetail: 1, jitter: 0.14, season: 'summer',
    colorLeaf1: '#52a43a', colorLeaf2: '#80cc58', colorBark: '#6ca644', colorAccent: '#c9e265',
    colorVar: 0.14, snow: 0.0, windStrength: 0.55
  },
  volcanic_ash_deadwood: {
    id: 'volcanic_ash_deadwood', name: 'Charred Ash Snag', category: 'arid', species: 'dead',
    seed: 9012, height: 7.0, radius: 0.54, taper: 0.62, curve: 0.52, branches: 8, secondaryBranches: 3,
    gnarl: 0.82, radialSegments: 5, rootFlare: 0.60, rootStyle: 'twisted', spread: 3.8, canopyHeight: 1.0,
    density: 5, clusterSize: 0.8, polyDetail: 0, jitter: 0.28, season: 'twilight',
    colorLeaf1: '#262121', colorLeaf2: '#3d3330', colorBark: '#211c1b', colorAccent: '#ff5400',
    colorVar: 0.08, snow: 0.0, emissiveIntensity: 0.25, hollowEnabled: true
  },

  // Shrub, hedge & bonsai presets
  thorn_bramble_bush: {
    id: 'thorn_bramble_bush', name: 'Thorn Bramble', category: 'shrubs', species: 'bush',
    seed: 6161, height: 2.2, radius: 0.26, taper: 0.65, curve: 0.30, branches: 5, secondaryBranches: 2,
    gnarl: 0.60, radialSegments: 5, rootFlare: 0.20, rootStyle: 'none', spread: 3.0, canopyHeight: 0.80,
    density: 11, clusterSize: 1.15, polyDetail: 0, jitter: 0.28, season: 'autumn',
    colorLeaf1: '#354f2f', colorLeaf2: '#4d6639', colorBark: '#3b2b23', colorAccent: '#800f2f',
    colorVar: 0.18, snow: 0.0, shrubVariant: 'berry', berryDensity: 0.35, berryColor: '#6a040f', berrySize: 0.14
  },
  lavender_meadow_shrub: {
    id: 'lavender_meadow_shrub', name: 'Lavender Bush', category: 'shrubs', species: 'bush',
    seed: 4820, height: 1.9, radius: 0.18, taper: 0.72, curve: 0.12, branches: 3, secondaryBranches: 1,
    gnarl: 0.15, radialSegments: 5, rootFlare: 0.10, rootStyle: 'none', spread: 2.3, canopyHeight: 0.90,
    density: 13, clusterSize: 1.05, polyDetail: 1, jitter: 0.15, season: 'spring',
    colorLeaf1: '#4c7c4a', colorLeaf2: '#6b9b62', colorBark: '#5c4b3b', colorAccent: '#c77dff',
    colorVar: 0.14, snow: 0.0, shrubVariant: 'flowering', blossomDensity: 0.85, blossomColor: '#9d4edd', blossomSize: 0.19
  },
  falador_boxwood_hedge: {
    id: 'falador_boxwood_hedge', name: 'Boxwood Hedge', category: 'shrubs', species: 'topiary',
    seed: 1200, height: 2.6, radius: 0.22, taper: 0.75, curve: 0.0, branches: 3, secondaryBranches: 0,
    gnarl: 0.05, radialSegments: 6, rootFlare: 0.0, rootStyle: 'none', spread: 2.8, canopyHeight: 1.0,
    density: 8, clusterSize: 1.25, polyDetail: 1, jitter: 0.05, topiaryShape: 'hedge_box',
    season: 'summer', colorLeaf1: '#2b6e29', colorLeaf2: '#418f3b', colorBark: '#4f3824', colorAccent: '#f7d6e0',
    colorVar: 0.10, snow: 0.0, groundAttachment: 'stone_planter', environmentStage: 'city_sidewalk'
  },
  royal_spiral_topiary: {
    id: 'royal_spiral_topiary', name: 'Royal Spiral Topiary', category: 'shrubs', species: 'topiary',
    seed: 2026, height: 4.2, radius: 0.24, taper: 0.78, curve: 0.0, branches: 3, secondaryBranches: 0,
    gnarl: 0.04, radialSegments: 6, rootFlare: 0.10, rootStyle: 'none', spread: 1.9, canopyHeight: 1.15,
    density: 12, clusterSize: 1.05, polyDetail: 1, jitter: 0.04, topiaryShape: 'tiered_spheres',
    season: 'summer', colorLeaf1: '#2e752c', colorLeaf2: '#4ea148', colorBark: '#573c26', colorAccent: '#ffffff',
    colorVar: 0.10, snow: 0.0, groundAttachment: 'stone_planter', environmentStage: 'city_sidewalk'
  },
  zen_pine_bonsai: {
    id: 'zen_pine_bonsai', name: 'Zen Pine Bonsai', category: 'shrubs', species: 'bonsai',
    seed: 707, height: 2.4, radius: 0.24, taper: 0.48, curve: 0.75, branches: 5, secondaryBranches: 2,
    gnarl: 0.58, radialSegments: 6, rootFlare: 0.45, rootStyle: 'twisted', spread: 2.6, canopyHeight: 0.75,
    density: 10, clusterSize: 1.05, polyDetail: 1, jitter: 0.12, season: 'summer',
    colorLeaf1: '#255e36', colorLeaf2: '#3f824e', colorBark: '#4f3727', colorAccent: '#c48f65',
    colorVar: 0.12, snow: 0.0, groundAttachment: 'bonsai_pot', planterColor: '#2c4257'
  },
  sakura_bonsai: {
    id: 'sakura_bonsai', name: 'Sakura Bonsai', category: 'shrubs', species: 'bonsai',
    seed: 808, height: 2.3, radius: 0.22, taper: 0.50, curve: 0.68, branches: 5, secondaryBranches: 2,
    gnarl: 0.50, radialSegments: 6, rootFlare: 0.40, rootStyle: 'twisted', spread: 2.5, canopyHeight: 0.80,
    density: 12, clusterSize: 1.05, polyDetail: 1, jitter: 0.14, season: 'blossom',
    colorLeaf1: '#f075a5', colorLeaf2: '#ffb8d2', colorBark: '#3d2a2d', colorAccent: '#fff0f5',
    colorVar: 0.15, snow: 0.20, groundAttachment: 'bonsai_pot', planterColor: '#5c2b2b', ambientFx: 'petals'
  },

  // Fantasy & arcane presets
  mycelium_glowshroom: {
    id: 'mycelium_glowshroom', name: 'Bioluminescent Glowshroom', category: 'fantasy', species: 'fantasy',
    seed: 5544, height: 5.8, radius: 0.52, taper: 0.65, curve: 0.34, branches: 4, secondaryBranches: 0,
    gnarl: 0.28, radialSegments: 7, rootFlare: 0.45, rootStyle: 'flared', spread: 4.0, canopyHeight: 0.85,
    density: 10, clusterSize: 1.50, polyDetail: 1, jitter: 0.14, fantasyForm: 'mushroom',
    season: 'arcane', colorLeaf1: '#3a0ca3', colorLeaf2: '#4cc9f0', colorBark: '#d8d2e1', colorAccent: '#80ffdb',
    colorVar: 0.20, snow: 0.25, emissiveIntensity: 0.85, lightingMode: 'night', ambientFx: 'fireflies'
  },
  astral_mana_tree: {
    id: 'astral_mana_tree', name: 'Astral Mana Willow', category: 'fantasy', species: 'fantasy',
    seed: 3141, height: 8.2, radius: 0.48, taper: 0.60, curve: 0.40, branches: 6, secondaryBranches: 2,
    gnarl: 0.42, radialSegments: 6, rootFlare: 0.60, rootStyle: 'twisted', spread: 4.3, canopyHeight: 1.15,
    density: 18, clusterSize: 1.40, polyDetail: 1, jitter: 0.22, fantasyForm: 'arcane_willow',
    season: 'arcane', colorLeaf1: '#560bad', colorLeaf2: '#b5179e', colorBark: '#2b2d42', colorAccent: '#4cc9f0',
    colorVar: 0.25, snow: 0.30, emissiveIntensity: 0.75, detailProp: 'lanterns', lightingMode: 'dusk', ambientFx: 'fireflies'
  },
  crimson_japanese_maple: {
    id: 'crimson_japanese_maple', name: 'Crimson Courtyard Maple', category: 'deciduous', species: 'maple',
    seed: 2408, height: 5.4, radius: 0.32, taper: 0.58, curve: 0.36, branches: 6, secondaryBranches: 3,
    gnarl: 0.38, radialSegments: 6, rootFlare: 0.42, rootStyle: 'flared', spread: 3.9, canopyHeight: 0.90,
    density: 18, clusterSize: 1.25, polyDetail: 1, jitter: 0.18, season: 'autumn',
    colorLeaf1: '#9e1922', colorLeaf2: '#d62839', colorBark: '#423029', colorAccent: '#ffccd5',
    colorVar: 0.18, snow: 0.0, detailProp: 'fallen_leaves', ambientFx: 'leaves'
  },
  golden_weeping_willow: {
    id: 'golden_weeping_willow', name: 'Sunset Weeping Willow', category: 'deciduous', species: 'willow',
    seed: 6789, height: 7.0, radius: 0.62, taper: 0.56, curve: 0.38, branches: 7, secondaryBranches: 2,
    gnarl: 0.46, radialSegments: 6, rootFlare: 0.68, rootStyle: 'buttress', spread: 4.8, canopyHeight: 1.05,
    density: 19, clusterSize: 1.40, polyDetail: 1, jitter: 0.16, season: 'autumn',
    colorLeaf1: '#b5841d', colorLeaf2: '#e6b839', colorBark: '#4f3d28', colorAccent: '#fff3b0',
    colorVar: 0.16, snow: 0.0, vineDensity: 0.45, lightingMode: 'golden_hour'
  }
};

export const SPECIES_DEFAULT_PRESETS = TREE_SPECIES.reduce((acc, s) => {
  acc[s.id] = s.defaultPreset;
  return acc;
}, {});

export function getSpeciesMeta(speciesId) {
  return TREE_SPECIES.find((s) => s.id === speciesId) || TREE_SPECIES[0];
}

export function getTreePreset(presetId) {
  return TREE_PRESETS[presetId] || null;
}
