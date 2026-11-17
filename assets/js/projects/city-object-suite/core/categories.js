export const BLUEPRINT_SCHEMA_VERSION = 'b.city-object.v1';
export const ASSEMBLY_SCHEMA_VERSION = 'b.city-assembly.v1';
export const B_UNITS_PER_METER = 16.404199475065617;
export const STORAGE_KEY = 'b_city_object_suite_saved_v1';
export const FAVORITES_KEY = 'b_city_object_suite_favs_v1';

export const GENERATOR_META = {
  name: 'B Remastered 3d City Object Suite',
  version: '1.0.0',
  coordinateSpace: 'right-handed-y-up-meters',
  bGameCoordinateSpace: 'z-up-b-game-units'
};

export const SPACE_GROUPS = [
  { id: 'all', label: 'All Spaces', shortLabel: 'All' },
  { id: 'exterior', label: 'Exterior & Streetscape', shortLabel: 'Exterior' },
  { id: 'trades_utility', label: 'Trades, Utilities & Industrial', shortLabel: 'Trades & Utility' },
  { id: 'interior', label: 'Interior & Public Spaces', shortLabel: 'Interior' },
  { id: 'assemblies', label: 'Composite Assemblies', shortLabel: 'Assemblies' }
];

export const OBJECT_CATEGORIES = [
  {
    id: '01_postal',
    code: '01',
    spaceGroup: 'exterior',
    label: 'Postal & Deliveries',
    shortLabel: 'Postal',
    icon: 'fa-envelope',
    description: 'Mailboxes, apartment cluster banks, parcel lockers, and street collection drops.',
    subcategories: ['Apartment Banks', 'Street Collection', 'Parcel Lockers', 'Residential Mailboxes']
  },
  {
    id: '02_waste',
    code: '02',
    spaceGroup: 'exterior',
    label: 'Waste & Recycling',
    shortLabel: 'Waste',
    icon: 'fa-dumpster',
    description: 'Commercial dumpsters, roll-offs, wheeled bins, recycling carts, and litter baskets.',
    subcategories: ['Commercial Dumpsters', 'Wheeled Carts', 'Street Litter Bins', 'Recycling Stations']
  },
  {
    id: '03_utilities',
    code: '03',
    spaceGroup: 'trades_utility',
    label: 'Utilities, Pipes & Infrastructure',
    shortLabel: 'Utilities',
    icon: 'fa-network-wired',
    description: 'Exposed pipe manifolds, conduits, electrical cabinets, transformers, and meter banks.',
    subcategories: ['Exposed Pipes', 'Utility Cabinets', 'Transformers & Meters', 'Valves & Standpipes']
  },
  {
    id: '04_street_furniture',
    code: '04',
    spaceGroup: 'exterior',
    label: 'Street Furniture',
    shortLabel: 'Furniture',
    icon: 'fa-chair',
    description: 'Park benches, seating blocks, bollards, chain posts, railings, and street clocks.',
    subcategories: ['Benches & Tables', 'Bollards & Guardrails', 'Public Clocks']
  },
  {
    id: '05_traffic',
    code: '05',
    spaceGroup: 'exterior',
    label: 'Roads, Parking & Traffic',
    shortLabel: 'Traffic',
    icon: 'fa-traffic-light',
    description: 'Parking meters, pay kiosks, traffic signals, street signs, barrier arms, and Jersey barriers.',
    subcategories: ['Parking Meters & Kiosks', 'Traffic Signals & Signs', 'Road Barriers']
  },
  {
    id: '06_transit',
    code: '06',
    spaceGroup: 'exterior',
    label: 'Public Transit',
    shortLabel: 'Transit',
    icon: 'fa-bus',
    description: 'Bus stop shelters, subway railings, arrival displays, ticket kiosks, and turnstiles.',
    subcategories: ['Bus Shelters', 'Subway Entrances', 'Transit Kiosks & Boards']
  },
  {
    id: '07_vendors',
    code: '07',
    spaceGroup: 'exterior',
    label: 'Food Vendors & Street Commerce',
    shortLabel: 'Vendors',
    icon: 'fa-hotdog',
    description: 'Hot dog carts, coffee carts, produce stalls, taco stands, and mobile ice cream carts.',
    subcategories: ['Food Carts', 'Market Stalls', 'Mobile Kiosks']
  },
  {
    id: '08_advertising',
    code: '08',
    spaceGroup: 'exterior',
    label: 'Newspapers, Advertising & Info',
    shortLabel: 'News & Ads',
    icon: 'fa-newspaper',
    description: 'Newspaper vending boxes, A-frame signs, illuminated ad totems, and poster cases.',
    subcategories: ['Newspaper Boxes', 'Sidewalk Signs', 'Advertising Panels']
  },
  {
    id: '09_commercial',
    code: '09',
    spaceGroup: 'exterior',
    label: 'Storefronts, Restaurants & Cafes',
    shortLabel: 'Storefronts',
    icon: 'fa-store',
    description: 'Bistro tables, patio umbrellas, storefront awnings, blade signs, and vending machines.',
    subcategories: ['Cafe Seating', 'Storefront Attachments', 'Vending & Heaters']
  },
  {
    id: '10_residential',
    code: '10',
    spaceGroup: 'exterior',
    label: 'Residential & Apartment Exteriors',
    shortLabel: 'Residential',
    icon: 'fa-building-user',
    description: 'Apartment intercoms, exterior AC condensers, security cameras, and fire escape ladders.',
    subcategories: ['Entry Panels', 'Wall Condensers', 'Exterior Safety & Trim']
  },
  {
    id: '11_industrial',
    code: '11',
    spaceGroup: 'trades_utility',
    label: 'Industrial, Warehouses & Loading',
    shortLabel: 'Industrial',
    icon: 'fa-boxes-stacked',
    description: 'Wooden pallets, shipping crates, steel cargo drums, hand trucks, and cable reels.',
    subcategories: ['Pallets & Crates', 'Barrels & Reels', 'Handling Carts']
  },
  {
    id: '12_construction',
    code: '12',
    spaceGroup: 'trades_utility',
    label: 'Construction & Maintenance',
    shortLabel: 'Construction',
    icon: 'fa-helmet-safety',
    description: 'Sawhorse barricades, scaffold sections, portable light towers, and temp fencing.',
    subcategories: ['Barricades & Fencing', 'Scaffolding', 'Site Equipment']
  },
  {
    id: '13_parks',
    code: '13',
    spaceGroup: 'exterior',
    label: 'Parks, Landscaping & Plazas',
    shortLabel: 'Parks',
    icon: 'fa-seedling',
    description: 'Street planters, tree grates and guards, drinking fountains, and plaza fountains.',
    subcategories: ['Planters & Tree Grates', 'Fountains', 'Park Signage']
  },
  {
    id: '14_safety',
    code: '14',
    spaceGroup: 'exterior',
    label: 'Public Safety & Emergency',
    shortLabel: 'Safety',
    icon: 'fa-fire-extinguisher',
    description: 'Fire hydrants, emergency call boxes, extinguisher cabinets, crowd barriers, and guard booths.',
    subcategories: ['Fire & Emergency', 'Crowd Barriers', 'Security Booths']
  },
  {
    id: '15_lighting',
    code: '15',
    spaceGroup: 'exterior',
    label: 'Lighting & Electrical',
    shortLabel: 'Lighting',
    icon: 'fa-lightbulb',
    description: 'Decorative streetlamps, cobrahead poles, wall coach lanterns, and wooden utility poles.',
    subcategories: ['Streetlamps', 'Wall Lights', 'Utility Poles']
  },
  {
    id: '16_rooftop',
    code: '16',
    spaceGroup: 'exterior',
    label: 'Rooftops & Building Services',
    shortLabel: 'Rooftop',
    icon: 'fa-fan',
    description: 'Rooftop HVAC units, wooden water towers, satellite dishes, antennas, and solar arrays.',
    subcategories: ['Hvac & Cooling', 'Tanks & Headhouses', 'Antennas & Solar']
  },
  {
    id: '17_mobility',
    code: '17',
    spaceGroup: 'exterior',
    label: 'Bicycles, Mobility & Pedestrians',
    shortLabel: 'Mobility',
    icon: 'fa-bicycle',
    description: 'Wave and U-loop bike racks, bike-share stations, city bicycles, and scooter docks.',
    subcategories: ['Bike Racks', 'Bike Share Docks', 'Personal Mobility']
  },
  {
    id: '18_waterfront',
    code: '18',
    spaceGroup: 'exterior',
    label: 'Waterfront & Drainage',
    shortLabel: 'Waterfront',
    icon: 'fa-water',
    description: 'Sewer manholes, curb storm drains, mooring bollards, lifebuoy stations, and canal rails.',
    subcategories: ['Manholes & Drains', 'Dock Moorings', 'Waterfront Safety']
  },
  {
    id: '19_clutter',
    code: '19',
    spaceGroup: 'exterior',
    label: 'Urban Clutter, Weathering & Decals',
    shortLabel: 'Clutter',
    icon: 'fa-trash-can',
    description: 'Garbage bag piles, flattened cardboard, cone tangles, oil puddles, and wall decals.',
    subcategories: ['Loose Trash & Piles', 'Abandoned Props', 'Surface Decals']
  },
  {
    id: '20_futuristic',
    code: '20',
    spaceGroup: 'exterior',
    label: 'Futuristic & Superhero City Props',
    shortLabel: 'Futuristic',
    icon: 'fa-microchip',
    description: 'Holographic kiosks, drone landing pads, bot charging docks, and energy barrier pylons.',
    subcategories: ['Holo Terminals', 'Autonomous Docks', 'Security & Power']
  },
  {
    id: 'office_public_interiors',
    code: '21',
    spaceGroup: 'interior',
    label: 'Office & Public Interiors',
    shortLabel: 'Office & Int',
    icon: 'fa-building-user',
    description: 'Desks, chairs, computers, printers, reception counters, cubicles, filing cabinets, breakroom equipment, signage, and public interior props.',
    subcategories: [
      'Desks & Workstations',
      'Office Chairs & Seating',
      'Computers & Technology',
      'Printers & Office Machines',
      'Desktop Accessories',
      'Reception & Front Desks',
      'Waiting Rooms & Public Lobbies',
      'Conference & Meeting Rooms',
      'Cubicles & Office Partitions',
      'Filing, Storage & Mailrooms',
      'Breakrooms & Employee Amenities',
      'Signs, Information & Wayfinding',
      'Security & Access Control',
      'Interior Building Infrastructure',
      'Cleaning & Maintenance',
      'Office Decorations & Miscellaneous Props',
      'Public Service & Civic Facilities',
      'Medical Office & Professional Waiting Areas',
      'Coworking, Training & Shared Workspaces',
      'Futuristic & Superhero Office Technology'
    ]
  },
  {
    id: '22_police_municipal',
    code: '22',
    spaceGroup: 'interior',
    label: 'Police Stations, Courthouses & Civic Halls',
    shortLabel: 'Police & Civic',
    icon: 'fa-shield-halved',
    description: 'Booking desks, holding cells, interrogation rooms, evidence lockers, judge benches, Dmv teller windows, and civic kiosks.',
    subcategories: [
      'Police Booking & Holding',
      'Investigation & Evidence',
      'Courthouses & Hearings',
      'Public Service & Civic Facilities'
    ]
  },
  {
    id: '23_clinics_waiting',
    code: '23',
    spaceGroup: 'interior',
    label: 'Clinics, Waiting Rooms & Medical Lobbies',
    shortLabel: 'Clinics & Wait',
    icon: 'fa-stethoscope',
    description: 'Waiting room beam seating, ticket dispensers, kids bead tables, exam tables, Iv stands, vitals carts, and wall Aed cabinets.',
    subcategories: [
      'Waiting Rooms & Public Lobbies',
      'Medical Office & Professional Waiting Areas',
      'Waiting Room Amenities'
    ]
  },
  {
    id: '24_labs_research',
    code: '24',
    spaceGroup: 'interior',
    label: 'Laboratories, Science & Cleanrooms',
    shortLabel: 'Labs & Science',
    icon: 'fa-flask',
    description: 'Chemical fume hoods, glovebox isolators, gas cylinder racks, cryo dewars, microscope benches, cleanroom air showers, and emergency eyewashes.',
    subcategories: [
      'Wet Labs & Fume Hoods',
      'Scientific Analyzers & Glassware',
      'Cleanroom & Safety Stations'
    ]
  },
  {
    id: '25_malls_libraries',
    code: '25',
    spaceGroup: 'interior',
    label: 'Malls, Libraries & Commercial Interiors',
    shortLabel: 'Malls & Books',
    icon: 'fa-book-open',
    description: 'Mall island kiosks, map totems, photo booths, escalators, library study carrels, book drops, card catalogs, and Rfid checkout gates.',
    subcategories: [
      'Mall Concourses & Kiosks',
      'Library Study & Checkouts',
      'Retail & Arcade Attractions'
    ]
  },
  {
    id: '26_trades_plumbing_electrical',
    code: '26',
    spaceGroup: 'trades_utility',
    label: 'Electrician, Plumbing & Building Trades',
    shortLabel: 'Trades & Mep',
    icon: 'fa-screwdriver-wrench',
    description: 'Circuit breaker panels, wire spool carts, switchgear, ladders, commercial water heaters, drain snakes, pipe vises, booster pumps, and tool chests.',
    subcategories: [
      'Electrical Panels & Distribution',
      'Plumbing, Boilers & Pumps',
      'Repair Tools, Ladders & Carts'
    ]
  },
  {
    id: '27_sims_everyday_misc',
    code: '27',
    spaceGroup: 'interior',
    label: 'Everyday, Recreation & Sims-Inspired Misc',
    shortLabel: 'Everyday & Rec',
    icon: 'fa-chess-knight',
    description: 'Aquariums, retro jukeboxes, billiards and foosball tables, grandfather clocks, art easels, upright pianos, pinball machines, gym gear, and lockers.',
    subcategories: [
      'Hobbies, Music & Arts',
      'Game Room & Breakroom Fun',
      'Gym, Fitness & Locker Room',
      'Lobbies, Decor & Collectibles'
    ]
  },
  {
    id: 'arcades_entertainment',
    code: '28',
    spaceGroup: 'interior',
    label: 'Arcades & Entertainment',
    shortLabel: 'Arcades & Ent',
    icon: 'fa-gamepad',
    description: 'Classic 1980s/1990s coin-op arcade cabinets, racing and rhythm simulators, pinball tables, skill games, claw cranes, redemption counters, neon signage, Vr attractions, and retro retail gear.',
    subcategories: [
      'Classic Arcade Cabinets',
      'Specialty Arcade Cabinets',
      'Racing & Driving Machines',
      'Shooting & Action Machines',
      'Fighting & Multiplayer Stations',
      'Rhythm & Music Games',
      'Pinball Machines',
      'Mechanical & Skill Games',
      'Ticket Redemption Games',
      'Prize & Claw Machines',
      'Tokens, Tickets & Payment',
      'Arcade Furniture & Seating',
      'Signage, Lighting & Decorations',
      'Arcade Carpets, Flooring & Walls',
      'Food, Candy & Refreshments',
      'Game Store & Retail Displays',
      'Modern Vr & Interactive Attractions',
      'Security, Maintenance & Operations',
      'Retro Electronics & Accessories',
      'Arcade Assemblies & Environmental Scenes'
    ]
  },
  {
    id: '29_residential_household',
    code: '29',
    spaceGroup: 'interior',
    label: 'Residential Furniture & Household Props',
    shortLabel: 'Home & Living',
    icon: 'fa-couch',
    description: 'Residential chairs, recliners, sofas, dining & coffee tables, beds, dressers, kitchen appliances, bath fixtures, patio grills & fire pits, and home decor.',
    subcategories: [
      'Residential Chairs & Lounge Seating',
      'Sofas, Loveseats & Sectionals',
      'Dining, Coffee & Side Tables',
      'Beds, Dressers & Home Storage',
      'Kitchen Appliances & Counters',
      'Bathroom & Laundry Fixtures',
      'Patio & Outdoor Living',
      'Home Lighting, Decor & Clutter'
    ]
  },
  {
    id: '30_holidays',
    code: '30',
    spaceGroup: 'exterior',
    label: 'Holidays & Seasonal Decor',
    shortLabel: 'Holidays',
    icon: 'fa-holly-berry',
    description: 'Stick-on building and object string lights, Christmas trees, nutcrackers, Thanksgiving harvest & feast displays, snowmen, and seasonal props.',
    subcategories: [
      'String Lights & Eave Strands',
      'Christmas Trees & Wreaths',
      'Nutcrackers & Holiday Figures',
      'Thanksgiving & Harvest',
      'Outdoor Lawn & Porch Displays',
      'Indoor Mantle, Gifts & Tabletop',
      'Holiday Assemblies'
    ]
  },
  {
    id: 'assemblies',
    code: 'As',
    spaceGroup: 'assemblies',
    label: 'Composite Assemblies',
    shortLabel: 'Assemblies',
    icon: 'fa-cubes',
    description: 'Multi-object urban and interior vignettes preserving every component transform and metadata.',
    subcategories: ['Alley & Service', 'Sidewalk & Commerce', 'Residential & Rooftop', 'Office & Public Interiors']
  }
];

export const ATTACHMENT_PROFILES = {
  ground_standing: {
    id: 'ground_standing',
    label: 'Ground-Standing',
    originDesc: 'Bottom Center (y = 0)',
    surfaceNormal: [0, 1, 0],
    defaultStage: 'street_curb',
    requiresWall: false,
    flushEmbed: false,
    passable: false
  },
  wall_mounted: {
    id: 'wall_mounted',
    label: 'Wall-Mounted',
    originDesc: 'Back Mount Plate Center (z = 0)',
    surfaceNormal: [0, 0, 1],
    defaultStage: 'wall_facade',
    requiresWall: true,
    flushEmbed: false,
    passable: false
  },
  roof_mounted: {
    id: 'roof_mounted',
    label: 'Roof-Mounted',
    originDesc: 'Roof Curb Base Center (y = 0)',
    surfaceNormal: [0, 1, 0],
    defaultStage: 'rooftop_deck',
    requiresWall: false,
    flushEmbed: false,
    passable: false
  },
  ground_embedded: {
    id: 'ground_embedded',
    label: 'Ground-Embedded',
    originDesc: 'Flush Pavement Level (y = 0)',
    surfaceNormal: [0, 1, 0],
    defaultStage: 'street_curb',
    requiresWall: false,
    flushEmbed: true,
    passable: true
  },
  pole_mounted: {
    id: 'pole_mounted',
    label: 'Pole-Mounted',
    originDesc: 'Pole Base / Clamp Origin',
    surfaceNormal: [0, 0, 1],
    defaultStage: 'street_curb',
    requiresWall: false,
    flushEmbed: false,
    passable: false
  },
  hanging: {
    id: 'hanging',
    label: 'Hanging / Suspended',
    originDesc: 'Top Suspension Anchor',
    surfaceNormal: [0, -1, 0],
    defaultStage: 'wall_facade',
    requiresWall: true,
    flushEmbed: false,
    passable: false
  },
  surface_decal: {
    id: 'surface_decal',
    label: 'Surface Decal',
    originDesc: 'Flush Surface Overlay',
    surfaceNormal: [0, 1, 0],
    defaultStage: 'street_curb',
    requiresWall: false,
    flushEmbed: true,
    passable: true
  },
  surface_placed: {
    id: 'surface_placed',
    label: 'Surface-Placed (Tabletop)',
    originDesc: 'Bottom Base On Tabletop (y = 0)',
    surfaceNormal: [0, 1, 0],
    defaultStage: 'desk_surface',
    requiresWall: false,
    flushEmbed: false,
    passable: false
  },
  ceiling_mounted: {
    id: 'ceiling_mounted',
    label: 'Ceiling-Mounted',
    originDesc: 'Top Ceiling Canopy (y = 0)',
    surfaceNormal: [0, -1, 0],
    defaultStage: 'office_corner',
    requiresWall: false,
    flushEmbed: false,
    passable: false
  },
  furniture_attached: {
    id: 'furniture_attached',
    label: 'Furniture-Attached',
    originDesc: 'Mount Bracket Origin',
    surfaceNormal: [0, 0, 1],
    defaultStage: 'desk_surface',
    requiresWall: false,
    flushEmbed: false,
    passable: false
  }
};

export const ARCHITECTURAL_STYLES = [
  { id: 'modern_downtown', label: 'Modern Downtown' },
  { id: 'older_metropolitan', label: 'Older Metropolitan' },
  { id: 'residential', label: 'Residential' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'municipal', label: 'Municipal' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'neglected_abandoned', label: 'Neglected / Abandoned' },
  { id: 'clean_futuristic', label: 'Clean Futuristic' },
  { id: 'retro_futuristic', label: 'Retro-Futuristic' },
  { id: 'modern_corporate', label: 'Modern Corporate' },
  { id: 'classic_executive', label: 'Classic Executive' },
  { id: 'budget_office', label: 'Budget Office' },
  { id: 'clean_medical', label: 'Clean Medical' },
  { id: 'futuristic_ops', label: 'Futuristic Operations' },
  { id: 'retro_arcade_80s', label: 'Classic 1980s Arcade' },
  { id: 'mall_arcade_90s', label: 'Colorful 1990s Mall Arcade' },
  { id: 'modern_fec', label: 'Modern Family Entertainment' },
  { id: 'home_game_room', label: 'Residential Game Room' }
];

export const SIZE_CLASSES = [
  { id: 'tiny', label: 'Tiny (< 0.6m)' },
  { id: 'small', label: 'Small (0.6m - 1.4m)' },
  { id: 'medium', label: 'Medium (1.4m - 3.0m)' },
  { id: 'large', label: 'Large (> 3.0m)' },
  { id: 'assembly', label: 'Multi-Object Assembly' }
];

export const FUNCTIONAL_ROLES = [
  { id: 'functional', label: 'Functional Prop' },
  { id: 'decorative', label: 'Decorative Accent' },
  { id: 'infrastructure', label: 'City Infrastructure' },
  { id: 'commerce', label: 'Street Commerce' },
  { id: 'safety', label: 'Safety & Emergency' },
  { id: 'clutter', label: 'Clutter & Wear' },
  { id: 'assembly', label: 'Composite Assembly' }
];

export const CONDITION_LEVELS = [
  { id: 'new', label: 'New', wearScore: 0 },
  { id: 'clean', label: 'Clean', wearScore: 0.12 },
  { id: 'lightly_worn', label: 'Lightly Worn', wearScore: 0.34 },
  { id: 'weathered', label: 'Weathered', wearScore: 0.62 },
  { id: 'neglected', label: 'Neglected', wearScore: 0.84 },
  { id: 'damaged', label: 'Damaged', wearScore: 1.0 }
];

export const VARIATION_MODES = [
  { id: 'none', label: 'None (Exact)', spread: 0 },
  { id: 'subtle', label: 'Subtle (+/- 5%)', spread: 0.05 },
  { id: 'moderate', label: 'Moderate (+/- 12%)', spread: 0.12 },
  { id: 'strong', label: 'Strong (+/- 24%)', spread: 0.24 }
];

export const LOCATION_CONTEXTS = [
  { id: 'exterior', label: 'Exterior' },
  { id: 'interior', label: 'Interior' },
  { id: 'both', label: 'Interior & Exterior' }
];

export const ENVIRONMENT_TAGS = [
  'office',
  'lobby',
  'conference',
  'reception',
  'waiting_room',
  'breakroom',
  'utility_room',
  'storage_room',
  'public_service',
  'commercial',
  'residential_interior',
  'security',
  'municipal',
  'industrial_interior',
  'medical',
  'clinic',
  'coworking',
  'library',
  'mall',
  'laboratory',
  'police_station',
  'courthouse',
  'call_center',
  'electrical_room',
  'plumbing_mechanical',
  'recreation_room',
  'arcade',
  'retro_arcade',
  'modern_arcade',
  'family_entertainment',
  'gaming_lounge',
  'bowling_alley',
  'game_store',
  'entertainment_venue',
  'residential_game_room',
  'superhero_base',
  'public_interior',
  'living_room',
  'dining_room',
  'kitchen',
  'bedroom',
  'bathroom',
  'laundry_room',
  'patio',
  'gym',
  'locker_room',
  'street',
  'highway',
  'construction_zone',
  'holiday',
  'christmas',
  'winter',
  'thanksgiving',
  'autumn'
];
