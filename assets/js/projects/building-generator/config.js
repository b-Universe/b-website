import { clamp, copy, colorHex } from './utils.js';
import { computeDefaultEntranceGameplay } from './core/entrances.js';

export const STORAGE_KEY = 'b-remastered-building-presets-v1';

export const BLUEPRINT_SCHEMA_VERSION = 'b.building.v1';

export const GENERATOR_META = {
  id: 'b-3d-building-generator',
  name: 'B Remastered 3D Building Generator',
  version: '1.1.0',
  coordinateSystem: {
    handedness: 'right-handed',
    upAxis: '+Y',
    forwardAxis: '+Z',
    rightAxis: '+X',
    units: 'meters',
    rotationOrder: 'XYZ',
    rotationUnits: 'radians',
    origin: 'ground-level center of primary footprint (x=0, y=0, z=0); primary facade faces +Z'
  }
};

export const STYLES = [
  { id: 'brick', label: 'Red Brick', icon: 'fa-building', preset: 'paragon_brick' },
  { id: 'brownstone', label: 'Brownstone', icon: 'fa-home', preset: 'kings_row' },
  { id: 'commercial', label: 'Downtown', icon: 'fa-city', preset: 'old_downtown' },
  { id: 'mixed', label: 'Mixed Use', icon: 'fa-store', preset: 'market_street' },
  { id: 'artdeco', label: 'Art Deco', icon: 'fa-landmark', preset: 'golden_age' },
  { id: 'modern', label: 'Modern', icon: 'fa-th-large', preset: 'new_harbor' },
  { id: 'abandoned', label: 'Derelict', icon: 'fa-ghost', preset: 'abandoned_flats' },
  { id: 'corner', label: 'Corner', icon: 'fa-vector-square', preset: 'corner_block' }
];

export const BASE = {
  style: 'brick', seed: 1337,
  width: 13, depth: 11, floors: 5, floorHeight: 3.3, wallThickness: 0.22,
  footprint: 'rectangle', extension: 0, setback: 0, cornerCut: 0,
  roofType: 'flat', parapet: true, parapetHeight: 0.65, roofColor: '#343b43',
  wallMaterial: 'brick', wallColor: '#a64a40', secondaryWallColor: '#7c3431', mortarColor: '#c3aaa0',
  brickScale: 1.1, colorVariation: 0.24, groundFloorMaterial: 'stone', groundFloorColor: '#747576',
  trimColor: '#d6c9ad', trimAmount: 0.55, facadeAccent: 'cornice',
  windowsX: 4, windowsSide: 3, windowWidth: 1.4, windowHeight: 1.85,
  windowStyle: 'sash', windowFrameColor: '#d6cdbb', glassColor: '#384955',
  windowLighting: 0.20, shutters: false, curtains: true, balconies: 0.0, acUnits: false, fireEscape: true,
  doorStyle: 'stoop', doorColor: '#5f4134', entranceSteps: 3,
  groundUse: 'residential', awning: false, awningColor: '#8e3b3b',
  signage: 'none', signText: 'CORNER MARKET', signColor: '#f2e1aa',
  entranceEnabled: true, entranceCategory: 'apartment', interactionDistance: 2.5,
  triggerWidth: 2.4, triggerHeight: 2.9, triggerDepth: 3.0,
  entranceLocked: false, interactionLabel: 'Enter Building',
  rooftopProps: 0.65, rooftopWaterTank: true, skylights: false, chimneys: 2, antennas: true, rooftopPipes: true,
  age: 0.18, damage: 0, windowDamageStyle: 'mixed', tarPatches: false, roofPuddles: false, overgrowth: 0, grimeColor: '#282b2a',
  interiorMode: 'none', cutaway: false, inspectedFloor: 0,
  stairwell: true, elevator: false, roomsPerFloor: 4,
  accentFloor: 0, accentSide: 'front', accentFloorColor: '#b58867', floorOverrides: [],
  rearEntrance: false, rearDoorStyle: 'single', sideEntrance: 'none',
  basementEntrance: false, deliveryEntrance: false,
  roofAccess: false, roofAccessStyle: 'brick', roofAccessRoof: 'flat', roofAccessDoorSide: 'front',
  roofAccessWidth: 3.0, roofAccessDepth: 3.4, roofAccessHeight: 2.6,
  rooftopVents: false, rooftopHatch: false, rooftopWalkways: false, safetyRailings: false, rooftopCollision: false,
  fireEscapeLadder: 'raised', fireEscapeRoofAccess: true, fireEscapeTreads: true,
  fireEscapeClearance: 'one_way', fireEscapeLadderClearance: 0.0, fireEscapeStairWidth: 0.98, fireEscapeLandingDepth: 2.25,
  fireEscapeWallStandoff: 0.0, fireEscapeSupportStyle: 'columns_and_braces', fireEscapeRoofLandingSize: 0.0,
  tallStaircase: false, tallStaircaseSide: 'auto', tallStaircaseWidth: 1.0, tallStaircaseClearance: 0.34,
  tallStaircaseFloors: 0, tallStaircaseLanding: 'ground_continuous', tallStaircaseRailing: 'full',
  doorScale: 1.0, doorWidth: 0, doorHeight: 0,
  windowLightingTime: 'day', windowLightingProfile: 'auto',
  graffiti: false, graffitiDensity: 0.4, graffitiStyle: 'mixed'
};

export const NEW_EXPANSION_DEFAULTS = {
  rearEntrance: false,
  rearDoorStyle: 'single',
  sideEntrance: 'none',
  basementEntrance: false,
  deliveryEntrance: false,
  roofAccess: false,
  roofAccessStyle: 'brick',
  roofAccessRoof: 'flat',
  roofAccessDoorSide: 'front',
  roofAccessWidth: 3.0,
  roofAccessDepth: 3.4,
  roofAccessHeight: 2.6,
  rooftopVents: false,
  rooftopHatch: false,
  rooftopWalkways: false,
  safetyRailings: false,
  rooftopCollision: false,
  fireEscapeLadder: 'raised',
  fireEscapeRoofAccess: true,
  fireEscapeTreads: false,
  fireEscapeClearance: 'legacy',
  fireEscapeLadderClearance: 0.0,
  fireEscapeStairWidth: 0,
  fireEscapeLandingDepth: 0,
  fireEscapeWallStandoff: 0,
  fireEscapeSupportStyle: 'columns_and_braces',
  fireEscapeRoofLandingSize: 0,
  tallStaircase: false,
  tallStaircaseSide: 'auto',
  tallStaircaseWidth: 1.0,
  tallStaircaseClearance: 0.34,
  tallStaircaseFloors: 0,
  tallStaircaseLanding: 'ground_continuous',
  tallStaircaseRailing: 'full',
  doorScale: 1.0,
  doorWidth: 0,
  doorHeight: 0,
  windowLightingTime: 'day',
  windowLightingProfile: 'auto',
  graffiti: false,
  graffitiDensity: 0.4,
  graffitiStyle: 'mixed'
};

export const CONFIG_KEYS = Object.keys(BASE).filter((k) => k !== 'floorOverrides');

export const PRESETS = {
  paragon_brick: { label: 'Paragon Brick', style: 'brick', seed: 1337, wallColor: '#a64a40', floors: 5, width: 13, depth: 11, curtains: true, acUnits: true, fireEscape: true, rooftopWaterTank: true, rooftopPipes: true },
  kings_row: { label: "King's Row Brownstone", style: 'brownstone', seed: 4612, width: 9, depth: 14, floors: 4, floorHeight: 3.4, roofType: 'mansard', wallColor: '#946d55', secondaryWallColor: '#6e5344', groundFloorColor: '#8b776b', roofColor: '#4a4040', wallMaterial: 'brick', trimAmount: 0.85, facadeAccent: 'ornate', windowsX: 3, windowsSide: 3, windowStyle: 'arched', windowFrameColor: '#e2c5a7', curtains: true, shutters: true, doorStyle: 'stoop', entranceSteps: 5, fireEscape: true, acUnits: false, balconies: 0, rooftopWaterTank: false, rooftopPipes: false, chimneys: 2, rooftopProps: 0.2 },
  old_downtown: { label: 'Old Downtown', style: 'commercial', seed: 5821, floors: 7, width: 19, depth: 15, groundUse: 'shop', groundFloorMaterial: 'stone', groundFloorColor: '#777167', wallColor: '#86765e', secondaryWallColor: '#6f6250', roofType: 'flat', trimAmount: 0.85, facadeAccent: 'cornice', windowsX: 7, windowsSide: 5, windowStyle: 'tall', curtains: false, fireEscape: false, acUnits: false, rooftopWaterTank: false, rooftopPipes: true, rooftopProps: 0.75, signage: 'marquee', signText: 'DOWNTOWN' },
  market_street: { label: 'Market Street Shops', style: 'mixed', seed: 3009, width: 16, depth: 11, floors: 4, wallColor: '#a95f4b', secondaryWallColor: '#864b3f', groundUse: 'shop', groundFloorColor: '#625d62', awning: true, awningColor: '#a14248', signage: 'shop', signText: 'THE MARKET', roofType: 'flat', curtains: true, acUnits: true, fireEscape: true, rooftopWaterTank: false, rooftopPipes: true, windowsX: 5 },
  golden_age: { label: 'Golden Age Deco', style: 'artdeco', seed: 1017, floors: 8, width: 17, depth: 14, wallMaterial: 'stone', wallColor: '#bbad8d', secondaryWallColor: '#8d826b', groundFloorColor: '#746e61', trimColor: '#e1c98a', roofColor: '#615c55', facadeAccent: 'vertical', trimAmount: 0.9, windowsX: 6, windowStyle: 'tall', curtains: false, roofType: 'stepped', setback: 1.0, rooftopWaterTank: false, rooftopPipes: false, chimneys: 0, fireEscape: false, acUnits: false, groundUse: 'lobby', doorStyle: 'double', rooftopProps: 0.2 },
  new_harbor: { label: 'New Harbor Apartments', style: 'modern', seed: 9135, floors: 9, width: 20, depth: 14, floorHeight: 3.1, wallMaterial: 'concrete', wallColor: '#9daab1', secondaryWallColor: '#71838c', groundFloorMaterial: 'concrete', groundFloorColor: '#556b78', roofColor: '#363f48', trimColor: '#d4e1e5', trimAmount: 0.2, facadeAccent: 'none', windowsX: 7, windowsSide: 4, windowStyle: 'modern', windowFrameColor: '#293d48', glassColor: '#2a526a', windowWidth: 1.8, windowHeight: 2.25, curtains: true, balconies: 0.8, acUnits: false, fireEscape: false, rooftopWaterTank: false, skylights: true, rooftopPipes: true, rooftopProps: 0.9, chimneys: 0, entranceSteps: 0, doorStyle: 'double', groundUse: 'lobby' },
  abandoned_flats: { label: 'Abandoned Flats', style: 'abandoned', seed: 6697, width: 15, depth: 12, floors: 6, wallColor: '#695e53', secondaryWallColor: '#474641', trimColor: '#827864', trimAmount: 0.2, windowFrameColor: '#554b42', glassColor: '#252d2d', windowLighting: 0, shutters: true, curtains: true, acUnits: true, fireEscape: true, age: 0.85, damage: 0.48, windowDamageStyle: 'mixed', tarPatches: true, roofPuddles: true, rooftopPipes: true, overgrowth: 0.48, chimneys: 1, rooftopWaterTank: true },
  corner_block: { label: 'Corner Block', style: 'corner', seed: 7284, width: 18, depth: 17, floors: 5, footprint: 'corner', cornerCut: 1.75, wallColor: '#ad6c56', secondaryWallColor: '#915342', groundUse: 'shop', groundFloorColor: '#786d5c', windowStyle: 'arched', windowsX: 6, windowsSide: 5, curtains: true, acUnits: true, signage: 'shop', signText: 'CORNER GOODS', awning: true, awningColor: '#45647b', fireEscape: false, rooftopWaterTank: true, rooftopPipes: true, balconies: 0.25 }
};

export const OPTIONS = {
  footprint: [['rectangle', 'Rectangle'], ['L', 'L-shaped'], ['U', 'U-shaped courtyard'], ['corner', 'Corner lot']],
  roofType: [['flat', 'Flat roof'], ['pitched', 'Gabled'], ['mansard', 'Mansard'], ['stepped', 'Stepped crown']],
  wallMaterial: [['brick', 'Brick'], ['stone', 'Stone'], ['concrete', 'Concrete'], ['painted', 'Painted plaster']],
  groundFloorMaterial: [['brick', 'Brick'], ['stone', 'Stone'], ['concrete', 'Concrete'], ['painted', 'Painted plaster']],
  facadeAccent: [['none', 'None'], ['cornice', 'Classic cornices'], ['ornate', 'Ornate stonework'], ['vertical', 'Art Deco verticals']],
  windowStyle: [['sash', 'Classic sash'], ['arched', 'Arched'], ['tall', 'Tall panes'], ['modern', 'Modern glass'], ['square', 'Square']],
  windowDamageStyle: [['mixed', 'Mixed (broken & boarded)'], ['boarded', 'Fully boarded'], ['partial', 'Partially boarded'], ['broken', 'Broken glass only']],
  doorStyle: [['stoop', 'Raised stoop'], ['single', 'Single entrance'], ['double', 'Double doors']],
  groundUse: [['residential', 'Residential'], ['shop', 'Shops'], ['lobby', 'Shared lobby']],
  entranceCategory: [
    ['apartment', 'Apartment entrance'],
    ['shop', 'Shop entrance'],
    ['mission', 'Mission entrance'],
    ['generic', 'Generic entrance'],
    ['decorative', 'Decorative (non-interactive)'],
    ['custom', 'Custom entrance']
  ],
  signage: [['none', 'None'], ['shop', 'Storefront sign'], ['marquee', 'Wall marquee']],
  interiorMode: [['none', 'None'], ['basic', 'Floor plans'], ['apartments', 'Apartments & rooms']],
  accentSide: [['front', 'Front'], ['back', 'Back'], ['left', 'Left'], ['right', 'Right'], ['all', 'All walls']],
  rearDoorStyle: [['single', 'Single steel door'], ['double', 'Double service doors'], ['metal', 'Security metal door']],
  sideEntrance: [['none', 'None'], ['left', 'Left wall'], ['right', 'Right wall'], ['both', 'Both sides']],
  roofAccessStyle: [['brick', 'Brick stairwell'], ['concrete', 'Concrete access'], ['metal', 'Metal utility enclosure'], ['decorative', 'Decorative masonry'], ['industrial', 'Industrial bulkhead']],
  roofAccessRoof: [['flat', 'Flat coping'], ['sloped', 'Sloped roof']],
  roofAccessDoorSide: [['front', 'Front (facing +Z)'], ['back', 'Back (facing -Z)'], ['left', 'Left (facing -X)'], ['right', 'Right (facing +X)']],
  fireEscapeLadder: [
    ['raised', 'Raised drop ladder (2.2m clearance)'],
    ['lowered', 'Lowered drop ladder to street'],
    ['stair', 'Fixed bottom stair flight (street entry)']
  ],
  fireEscapeClearance: [
    ['one_way', 'Classic Single-Direction Fire Escape (Default)'],
    ['standard', 'Classic Alternating Switchback'],
    ['generous', 'Large-Model Alternating Switchback'],
    ['straight_run', 'Straight-Run Vertical Stack'],
    ['legacy', 'Compact Side Escape (Legacy)']
  ],
  fireEscapeSupportStyle: [
    ['columns_and_braces', 'Columns & Diagonal Braces (Default)'],
    ['wall_brackets', 'Cantilever Wall Brackets'],
    ['columns_only', 'Vertical Support Columns']
  ],
  tallStaircaseSide: [
    ['auto', 'Automatic Opposite Wall'],
    ['left', 'Left Wall'],
    ['right', 'Right Wall'],
    ['back', 'Rear Wall'],
    ['front', 'Front Wall']
  ],
  tallStaircaseLanding: [
    ['ground_continuous', 'Street Entry + Floor Landings'],
    ['ground_and_roof', 'Street Entry + Floor + Roof Access'],
    ['elevated_roof', 'Elevated Landings + Drop/Roof Ladders']
  ],
  tallStaircaseRailing: [
    ['full', 'Full Guardrails (Both Sides)'],
    ['industrial', 'Industrial Heavy Guardrails'],
    ['open_inner', 'Outer Guardrail Only (Open Wall Side)']
  ],
  windowLightingTime: [['day', 'Sunny Day'], ['golden_hour', 'Golden Hour'], ['evening', 'Evening Twilight'], ['night', 'Night'], ['late_night', 'Late Night'], ['morning', 'Dawn / Morning']],
  windowLightingProfile: [['auto', 'Automatic by style'], ['residential', 'Residential apartments'], ['commercial', 'Offices & Commercial'], ['derelict', 'Derelict / Dark']],
  graffitiStyle: [['mixed', 'Mixed urban art & tags'], ['tags', 'Spray-paint tags'], ['stencils', 'Industrial stencils'], ['posters', 'Worn street posters']]
};

export const SCHEMA = {
  form: [
    { group: 'BUILDING FORM' },
    { key: 'width', name: 'Building width', min: 6, max: 32, step: 0.5, unit: 'm' },
    { key: 'depth', name: 'Building depth', min: 6, max: 30, step: 0.5, unit: 'm' },
    { key: 'floors', name: 'Number of floors', min: 1, max: 14, step: 1 },
    { key: 'floorHeight', name: 'Floor height', min: 2.5, max: 5, step: 0.1, unit: 'm' },
    { key: 'wallThickness', name: 'Wall thickness', min: 0.12, max: 0.5, step: 0.02, unit: 'm' },
    { key: 'footprint', name: 'Building footprint', type: 'select' },
    { key: 'extension', name: 'Rear & side extensions', min: 0, max: 3, step: 1 },
    { key: 'setback', name: 'Upper-floor setbacks', min: 0, max: 2, step: 0.25, unit: 'm' },
    { key: 'cornerCut', name: 'Cut corner entrance', min: 0, max: 2.5, step: 0.25, unit: 'm', info: 'Angled front-right corner chamfer across any footprint.' },
    { group: 'ROOFLINE' },
    { key: 'roofType', name: 'Roof silhouette', type: 'select' },
    { key: 'roofColor', name: 'Roof color', type: 'color' },
    { key: 'parapet', name: 'Parapet walls', type: 'boolean' },
    { key: 'parapetHeight', name: 'Parapet height', min: 0.2, max: 1.5, step: 0.05, unit: 'm' }
  ],
  facade: [
    { group: 'WALL MATERIALS' },
    { key: 'wallMaterial', name: 'Main wall material', type: 'select' },
    { key: 'wallColor', name: 'Primary wall color', type: 'color' },
    { key: 'secondaryWallColor', name: 'Secondary wall color', type: 'color' },
    { key: 'mortarColor', name: 'Mortar / grout', type: 'color' },
    { key: 'brickScale', name: 'Brick & stone size', min: 0.5, max: 2.4, step: 0.1 },
    { key: 'colorVariation', name: 'Color variation', min: 0, max: 1, step: 0.05 },
    { key: 'groundFloorMaterial', name: 'Ground-floor material', type: 'select' },
    { key: 'groundFloorColor', name: 'Ground-floor color', type: 'color' },
    { key: 'trimColor', name: 'Trim & ledge color', type: 'color' },
    { key: 'trimAmount', name: 'Trim amount', min: 0, max: 1, step: 0.05 },
    { key: 'facadeAccent', name: 'Architectural detailing', type: 'select' },
    { group: 'WINDOWS' },
    { key: 'windowsX', name: 'Front window columns', min: 1, max: 10, step: 1 },
    { key: 'windowsSide', name: 'Side window columns', min: 1, max: 8, step: 1 },
    { key: 'windowWidth', name: 'Window width', min: 0.55, max: 2.8, step: 0.05, unit: 'm' },
    { key: 'windowHeight', name: 'Window height', min: 0.65, max: 3.15, step: 0.05, unit: 'm' },
    { key: 'windowStyle', name: 'Window style', type: 'select' },
    { key: 'windowFrameColor', name: 'Frame color', type: 'color' },
    { key: 'glassColor', name: 'Glass color', type: 'color' },
    { key: 'windowLighting', name: 'Interior lights', min: 0, max: 1, step: 0.05 },
    { key: 'curtains', name: 'Window curtains', type: 'boolean' },
    { key: 'shutters', name: 'Window shutters', type: 'boolean' }
  ],
  entrances: [
    { group: 'PRIMARY STREET ENTRANCE' },
    { key: 'groundUse', name: 'Ground-floor use', type: 'select' },
    { key: 'doorStyle', name: 'Entrance style', type: 'select' },
    { key: 'doorScale', name: 'Door scale multiplier', min: 0.7, max: 1.3, step: 0.05, unit: 'x', info: 'Modestly scales entrance door dimensions relative to player character.' },
    { key: 'doorWidth', name: 'Door width override', min: 0, max: 2.8, step: 0.05, unit: 'm', info: 'Overrides doorway opening width (0 preserves archetype standard).' },
    { key: 'doorHeight', name: 'Door height override', min: 0, max: 3.2, step: 0.05, unit: 'm', info: 'Overrides doorway opening height (0 preserves archetype standard).' },
    { key: 'doorColor', name: 'Door color', type: 'color' },
    { key: 'entranceSteps', name: 'Entrance steps', min: 0, max: 6, step: 1 },
    { key: 'awning', name: 'Shop / door awning', type: 'boolean' },
    { key: 'awningColor', name: 'Awning color', type: 'color' },
    { key: 'signage', name: 'Sign type', type: 'select' },
    { key: 'signText', name: 'Sign lettering', type: 'text' },
    { key: 'signColor', name: 'Sign color', type: 'color' },
    { group: 'ADDITIONAL BUILDING ENTRANCES' },
    { key: 'rearEntrance', name: 'Rear service entrance', type: 'boolean', info: 'Places a rear access door respecting building footprint and extensions.' },
    { key: 'rearDoorStyle', name: 'Rear door style', type: 'select' },
    { key: 'sideEntrance', name: 'Side facade entrance', type: 'select', info: 'Places entrance doors on exposed left or right exterior walls.' },
    { key: 'basementEntrance', name: 'Basement cellar doors', type: 'boolean', info: 'Ground-level angled metal cellar bulkhead access.' },
    { key: 'deliveryEntrance', name: 'Commercial delivery bay', type: 'boolean', info: 'Roll-up overhead door and loading threshold.' },
    { group: 'GAMEPLAY & INTERACTION' },
    { key: 'entranceEnabled', name: 'Enable interactive entrance', type: 'boolean', info: 'When disabled or set to Decorative, the entrance remains visually rendered but non-interactive in blueprints.' },
    { key: 'entranceCategory', name: 'Entrance category', type: 'select' },
    { key: 'interactionLabel', name: 'Interaction label', type: 'text' },
    { key: 'entranceLocked', name: 'Locked by default', type: 'boolean' },
    { key: 'interactionDistance', name: 'Interaction distance', min: 1.0, max: 8.0, step: 0.25, unit: 'm' },
    { key: 'triggerWidth', name: 'Trigger width', min: 1.0, max: 8.0, step: 0.1, unit: 'm' },
    { key: 'triggerHeight', name: 'Trigger height', min: 1.8, max: 6.0, step: 0.1, unit: 'm' },
    { key: 'triggerDepth', name: 'Trigger depth', min: 1.0, max: 8.0, step: 0.1, unit: 'm' }
  ],
  rooftop: [
    { group: 'ROOFTOP STAIRWELL HEADHOUSE' },
    { key: 'roofAccess', name: 'Rooftop stairwell headhouse', type: 'boolean', info: 'Enclosure containing the upper interior stairwell with roof access door.' },
    { key: 'roofAccessStyle', name: 'Headhouse architecture', type: 'select' },
    { key: 'roofAccessRoof', name: 'Headhouse roof style', type: 'select' },
    { key: 'roofAccessDoorSide', name: 'Access door facing', type: 'select' },
    { key: 'roofAccessWidth', name: 'Headhouse width', min: 2.0, max: 4.5, step: 0.1, unit: 'm' },
    { key: 'roofAccessDepth', name: 'Headhouse depth', min: 2.4, max: 5.5, step: 0.1, unit: 'm' },
    { key: 'roofAccessHeight', name: 'Headhouse height', min: 2.0, max: 3.5, step: 0.1, unit: 'm' },
    { group: 'ROOFTOP EQUIPMENT & DETAILS' },
    { key: 'rooftopProps', name: 'Rooftop equipment frequency', min: 0, max: 1, step: 0.1 },
    { key: 'rooftopWaterTank', name: 'Rooftop water tank', type: 'boolean' },
    { key: 'rooftopVents', name: 'Industrial ventilation fans', type: 'boolean' },
    { key: 'rooftopHatch', name: 'Maintenance roof hatch', type: 'boolean' },
    { key: 'rooftopWalkways', name: 'Roof maintenance walkways', type: 'boolean' },
    { key: 'safetyRailings', name: 'Perimeter safety railings', type: 'boolean' },
    { key: 'rooftopPipes', name: 'Exposed pipes & conduits', type: 'boolean' },
    { key: 'skylights', name: 'Rooftop skylights', type: 'boolean' },
    { key: 'chimneys', name: 'Chimneys', min: 0, max: 5, step: 1 },
    { key: 'antennas', name: 'Rooftop antenna', type: 'boolean' },
    { key: 'rooftopCollision', name: 'Rooftop semantic collision', type: 'boolean', info: 'Exports deterministic collision boxes for substantial rooftop equipment, chimneys, and structures.' }
  ],
  lighting: [
    { group: 'TIME-OF-DAY PREVIEW' },
    { key: 'windowLightingTime', name: 'Time of day mode', type: 'select', info: 'Simulates ambient lighting, sky color, and interior window illumination.' },
    { key: 'windowLightingProfile', name: 'Occupancy profile', type: 'select', info: 'Controls statistical distribution and color temperature of illuminated rooms.' },
    { group: 'WINDOW ILLUMINATION' },
    { key: 'windowLighting', name: 'Lit windows ratio', min: 0, max: 1, step: 0.05 },
    { key: 'curtains', name: 'Interior curtains', type: 'boolean' },
    { key: 'shutters', name: 'Window shutters', type: 'boolean' }
  ],
  features: [
    { group: 'Exterior Fire Escapes' },
    { key: 'fireEscape', name: 'Enable Exterior Fire Escape', type: 'boolean' },
    { key: 'fireEscapeClearance', name: 'Fire Escape Layout', type: 'select', info: 'Selects single-direction fire escape (default), alternating switchback, straight-run vertical stack, or legacy compact escape.' },
    { key: 'fireEscapeLadder', name: 'Bottom Access Mode', type: 'select', info: 'Selects counterweighted drop ladder (raised/lowered) or fixed ground stair flight.' },
    { key: 'fireEscapeSupportStyle', name: 'Support & Brace Style', type: 'select', info: 'Configures vertical support columns and underside diagonal wall braces.' },
    { key: 'fireEscapeRoofAccess', name: 'Parapet Roof Access Ladder', type: 'boolean', info: 'Gooseneck ladder connecting top arrival landing to roof deck.' },
    { key: 'fireEscapeRoofLandingSize', name: 'Roof Access Landing Size', min: 0, max: 2.0, step: 0.05, unit: 'm', info: 'Turnaround staging depth at roof ladder portal (0 uses active layout default).' },
    { key: 'fireEscapeTreads', name: 'Stair Tread Collision', type: 'boolean', info: 'Export individual physical stair tread positions, railings, and supports for player traversal.' },
    { key: 'fireEscapeWallStandoff', name: 'Wall Standoff', min: 0, max: 0.6, step: 0.02, unit: 'm', info: 'Clearance between exterior brick face and inner flight stringer (0 uses profile default).' },
    { key: 'fireEscapeStairWidth', name: 'Stair Tread Clear Width', min: 0, max: 1.3, step: 0.02, unit: 'm', info: 'Stair flight tread clear width (default 0.98m; 0 uses active profile default).' },
    { key: 'fireEscapeLandingDepth', name: 'Landing Platform Depth', min: 0, max: 3.2, step: 0.05, unit: 'm', info: 'Landing platform depth (default 2.25m; 0 uses active profile default).' },
    { key: 'fireEscapeLadderClearance', name: 'Ladder Extra Clearance', min: 0, max: 0.3, step: 0.02, unit: 'm', info: 'Additional ladder width and portal clearance for larger character models (default 0m).' },
    { key: 'tallStaircase', name: 'Enable Secondary Tall Exterior Staircase', type: 'boolean', info: 'Optional continuous 1-unit exterior staircase mounted along an unobstructed facade.' },
    { key: 'tallStaircaseSide', name: 'Staircase Placement Side', type: 'select', info: 'Chooses an unobstructed wall opposite any conventional fire escape when set to automatic.' },
    { key: 'tallStaircaseWidth', name: 'Staircase Clear Width', min: 0.8, max: 1.4, step: 0.05, unit: 'm', info: 'Walkable clear width between inner and outer stringers.' },
    { key: 'tallStaircaseClearance', name: 'Wall Offset Clearance', min: 0.24, max: 0.6, step: 0.02, unit: 'm', info: 'Standoff gap from exterior brick face to inner stair stringer.' },
    { key: 'tallStaircaseFloors', name: 'Supported Floors', type: 'floor', info: 'Highest elevated landing floor (0 spans all available floors).' },
    { key: 'tallStaircaseLanding', name: 'Landing Configuration', type: 'select', info: 'Selects street-entry plinth vs elevated drop ladder and top roof parapet ladder.' },
    { key: 'tallStaircaseRailing', name: 'Railing & Safety Option', type: 'select', info: 'Selects full double guardrails, heavy industrial guardrails, or open inner side.' },
    { group: 'FACADE ACCENTS' },
    { key: 'balconies', name: 'Balcony frequency', min: 0, max: 1, step: 0.1 },
    { key: 'acUnits', name: 'Window A/C units', type: 'boolean' },
    { group: 'STREET ART & DECALS' },
    { key: 'graffiti', name: 'Street graffiti & decals', type: 'boolean', info: 'Procedural street art and tags on lower exterior walls avoiding windows/doors.' },
    { key: 'graffitiDensity', name: 'Graffiti density', min: 0.1, max: 1.0, step: 0.05 },
    { key: 'graffitiStyle', name: 'Graffiti aesthetic', type: 'select' },
    { group: 'AGE & CHARACTER' },
    { key: 'age', name: 'Weathering / dirt', min: 0, max: 1, step: 0.05 },
    { key: 'damage', name: 'Damaged windows & walls', min: 0, max: 1, step: 0.05 },
    { key: 'windowDamageStyle', name: 'Window damage style', type: 'select' },
    { key: 'tarPatches', name: 'Tar patches & roof repairs', type: 'boolean' },
    { key: 'roofPuddles', name: 'Roof puddles & water stains', type: 'boolean' },
    { key: 'overgrowth', name: 'Vines & overgrowth', min: 0, max: 1, step: 0.05 },
    { key: 'grimeColor', name: 'Grime tone', type: 'color' }
  ],
  interior: [
    { group: 'BUILDING INTERIOR' },
    { key: 'interiorMode', name: 'Interior layout', type: 'select' },
    { key: 'cutaway', name: 'Show cutaway / hide front wall', type: 'boolean' },
    { key: 'inspectedFloor', name: 'Inspect through floor', type: 'floor' },
    { key: 'roomsPerFloor', name: 'Rooms per floor', min: 1, max: 8, step: 1 },
    { key: 'stairwell', name: 'Include stairs', type: 'boolean' },
    { key: 'elevator', name: 'Elevator shaft', type: 'boolean' },
    { group: 'CUSTOM FLOOR COLORS' },
    { key: 'accentFloor', name: 'Floor to customize', type: 'floorNumber' },
    { key: 'accentSide', name: 'Wall to customize', type: 'select' },
    { key: 'accentFloorColor', name: 'Custom wall color', type: 'color' }
  ]
};

export const CATEGORIES = {
  form: SCHEMA.form.filter((x) => x.key).map((x) => x.key).filter((k) => !['roofColor'].includes(k)),
  facade: SCHEMA.facade.filter((x) => x.key).map((x) => x.key),
  entrances: SCHEMA.entrances.filter((x) => x.key).map((x) => x.key),
  rooftop: SCHEMA.rooftop.filter((x) => x.key).map((x) => x.key),
  lighting: SCHEMA.lighting.filter((x) => x.key).map((x) => x.key),
  features: SCHEMA.features.filter((x) => x.key).map((x) => x.key),
  palette: ['wallColor', 'secondaryWallColor', 'groundFloorColor', 'trimColor', 'windowFrameColor', 'doorColor', 'roofColor', 'awningColor', 'signColor']
};

export const MATERIAL_CHOICES = ['#9f4b3d', '#a97455', '#9b8674', '#beb19c', '#73818b', '#817e77', '#d1bd93', '#5d675a', '#7a5661', '#bc8550', '#aeb5aa'];
export const COLOR_CHOICES = ['#2c4e6a', '#425c6e', '#575753', '#8d392f', '#ab6752', '#d1b9a0', '#cdb78e', '#7e5c47', '#718580', '#5e625b'];

export function getStyle(id) {
  return STYLES.find((x) => x.id === id) || STYLES[0];
}

export function baseForStyle(style) {
  const descriptor = getStyle(style);
  const raw = { ...copy(BASE), ...copy(PRESETS[descriptor.preset]) };
  return { ...raw, ...computeDefaultEntranceGameplay(raw) };
}

export function sanitisePreset(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid building settings');
  const style = STYLES.some((x) => x.id === data.style) ? data.style : 'brick';
  const rawBase = { ...baseForStyle(style), ...Object.fromEntries(Object.entries(data).filter(([k]) => k in BASE)), style };
  const autoEntrance = computeDefaultEntranceGameplay(rawBase);
  for (const k of Object.keys(autoEntrance)) {
    if (!(k in data) || data[k] === undefined || data[k] === null) {
      rawBase[k] = autoEntrance[k];
    }
  }
  const merged = rawBase;
  for (const [, rows] of Object.entries(SCHEMA)) {
    for (const def of rows) {
      if (!def.key) continue;
      const key = def.key;
      const fallback = baseForStyle(style)[key];
      if (key === 'fireEscapeClearance' && typeof merged[key] === 'number') {
        merged[key] = merged[key] > 1.05 ? 'generous' : 'legacy';
      }
      if (def.type === 'color') merged[key] = colorHex(merged[key]);
      else if (def.type === 'boolean') merged[key] = typeof merged[key] === 'boolean' ? merged[key] : fallback;
      else if (def.type === 'select') merged[key] = OPTIONS[key].some((x) => x[0] === merged[key]) ? merged[key] : fallback;
      else if (def.type === 'text') merged[key] = String(merged[key] ?? fallback).slice(0, 48);
      else if (typeof merged[key] !== 'number' || !Number.isFinite(merged[key])) merged[key] = fallback;
      else merged[key] = clamp(merged[key], def.min ?? (def.type === 'floorNumber' ? 0 : 0), def.max ?? (def.type === 'floorNumber' ? 14 : 14));
    }
  }
  merged.seed = clamp(Math.floor(Number(merged.seed) || 1337), 1, 99999999);
  merged.inspectedFloor = clamp(Math.floor(merged.inspectedFloor), 0, merged.floors);
  merged.accentFloor = clamp(Math.floor(merged.accentFloor), 0, merged.floors);
  merged.floorOverrides = Array.isArray(data.floorOverrides)
    ? data.floorOverrides.slice(0, 80).filter((o) => o && Number.isInteger(o.floor) && o.floor >= 1 && o.floor <= merged.floors && ['front', 'back', 'left', 'right', 'all'].includes(o.side) && /^#[a-f\d]{6}$/i.test(o.color)).map((o) => ({ floor: o.floor, side: o.side, color: o.color }))
    : [];
  if (merged.fireEscapeClearance !== 'one_way' && merged.fireEscapeClearance !== 'standard') {
    if (!Object.prototype.hasOwnProperty.call(data, 'fireEscapeStairWidth')) merged.fireEscapeStairWidth = 0;
    if (!Object.prototype.hasOwnProperty.call(data, 'fireEscapeLandingDepth')) merged.fireEscapeLandingDepth = 0;
  }
  delete merged.label;
  return merged;
}
