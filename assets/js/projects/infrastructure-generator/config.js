import { infraRound } from './utils.js';

export const INFRA_BLUEPRINT_SCHEMA_VERSION = 'b.infrastructure.v1';
export const INFRA_ASSEMBLY_SCHEMA_VERSION = 'b.infrastructure-assembly.v1';
export const INFRA_B_UNITS_PER_METER = 16.404199475065617;
export const INFRA_STORAGE_KEY = 'b.infrastructureGenerator.saved.v1';

export const INFRA_GENERATOR_META = {
  id: 'b-infrastructure-generator',
  name: 'B Remastered Procedural Infrastructure & Transit Generator',
  version: '1.0.0',
  milestone: 'Full Suite — All 9 Infrastructure Families + Assembly & District Modes',
  coordinateSystem: {
    handedness: 'right',
    upAxis: '+Y',
    forwardAxis: '+Z',
    rightAxis: '+X',
    units: 'meters',
    rotationOrder: 'XYZ',
    rotationUnits: 'radians',
    bGameUnitsPerMeter: INFRA_B_UNITS_PER_METER,
    bGameCoordinateMapping: { x: 'x', y: '-z', z: 'y' }
  }
};

export const INFRA_ELEVATION_MODES = [
  { id: 'grade', label: 'At-Grade (Terrain)' },
  { id: 'elevated', label: 'Elevated Structure' },
  { id: 'underground', label: 'Underground / Tunnel' },
  { id: 'suspended', label: 'Suspended Guideway' },
  { id: 'aerial', label: 'Aerial Utility / Cableway' }
];

export const INFRA_WORKSPACE_MODES = [
  { id: 'component', label: 'Component', available: true, description: 'Single configurable road, rail, bridge, or utility segment' },
  { id: 'network', label: 'Network', available: true, description: 'Interactive multi-domain connected infrastructure graph' },
  { id: 'assembly', label: 'Assembly', available: true, description: 'Reusable multi-component infrastructure assembly with external snap ports' },
  { id: 'district', label: 'District', available: true, description: 'Complete multi-domain City Generator district showcase' }
];

export const INFRA_DOMAINS = {
  road: { id: 'road', label: 'Roads & Streets', implemented: true, defaultElevationMode: 'grade' },
  rail: { id: 'rail', label: 'Railways', implemented: true, defaultElevationMode: 'grade' },
  tram: { id: 'tram', label: 'Street-Running Trams', implemented: true, defaultElevationMode: 'grade' },
  monorail: { id: 'monorail', label: 'Beam Monorail', implemented: true, defaultElevationMode: 'elevated' },
  suspended_rail: { id: 'suspended_rail', label: 'Suspended Monorail & Pods', implemented: true, defaultElevationMode: 'suspended' },
  pedestrian: { id: 'pedestrian', label: 'Pedestrian Circulation', implemented: true, defaultElevationMode: 'grade' },
  cableway: { id: 'cableway', label: 'Aerial Cableway & Utility Spans', implemented: true, defaultElevationMode: 'aerial' },
  cycle: { id: 'cycle', label: 'Bicycle Network', implemented: true, defaultElevationMode: 'grade' },
  waterway: { id: 'waterway', label: 'Waterways & Canals', implemented: true, defaultElevationMode: 'grade' },
  power: { id: 'power', label: 'Electrical Distribution', implemented: true, defaultElevationMode: 'aerial' },
  telecom: { id: 'telecom', label: 'Telecommunications', implemented: true, defaultElevationMode: 'aerial' },
  pipe: { id: 'pipe', label: 'Pipelines & Drainage', implemented: true, defaultElevationMode: 'grade' },
  building_access: { id: 'building_access', label: 'Building Entrance Access', implemented: true, defaultElevationMode: 'grade' }
};

export const INFRA_ERA_STYLES = {
  modern_municipal: { id: 'modern_municipal', label: 'Modern Municipal' },
  historic_european: { id: 'historic_european', label: 'Historic European' },
  early_industrial: { id: 'early_industrial', label: 'Early Industrial' },
  contemporary_transit: { id: 'contemporary_transit', label: 'Contemporary Transit' },
  neglected_urban: { id: 'neglected_urban', label: 'Neglected Urban' }
};

export const INFRA_SURFACE_OWNERSHIP_KINDS = [
  'replace_terrain',
  'excavate_terrain',
  'elevated_clearance',
  'verge_transition',
  'structural_support',
  'surface_marking'
];

export const INFRA_VEGETATION_POLICIES = [
  'exclude',
  'verge_grass',
  'median_planter',
  'sparse_ballast',
  'overgrowth'
];

// Configurable stylized gameplay defaults (NOT civil engineering certification rules)
export const INFRA_DEFAULTS = {
  laneWidthMeters: 3.2,
  sidewalkWidthMeters: 2.2,
  curbHeightMeters: 0.15,
  curbWidthMeters: 0.18,
  gutterWidthMeters: 0.25,
  shoulderWidthMeters: 0.0,
  vergeWidthMeters: 0.0,
  medianWidthMeters: 1.4,
  deckThicknessMeters: 0.65,
  barrierWidthMeters: 0.42,
  barrierHeightMeters: 0.85,
  embankmentSkirtDepthMeters: 0.35,
  cornerRadiusMeters: 3.2,
  crosswalkDepthMeters: 2.8,
  urbanClearanceMeters: 4.5,
  highwayClearanceMeters: 5.0,
  pedestrianHeadroomMeters: 2.15,
  maxPlayerStepRiseMeters: 0.2438, // 4 B units
  maxRoadGradeRatio: 0.14,
  minRoadCurveRadiusMeters: 8.0,
  railGaugeStandardMeters: 1.435,
  railTrackSpacingMeters: 4.2,
  railSleeperSpacingMeters: 0.68,
  railBallastDepthMeters: 0.36,
  minRailCurveRadiusMeters: 24.0,
  minTramCurveRadiusMeters: 14.0,
  maxRailGradeRatio: 0.05,
  maxTramGradeRatio: 0.08,
  suspendedGuidewayDefaultY: 9.4,
  suspendedHangingDropMeters: 3.6,
  suspendedMinStreetClearanceMeters: 4.5,
  catenaryWireHeightAboveRailMeters: 5.2,
  defaultSupportSpacingMeters: 16.0,
  maxUnsupportedRoadSpanMeters: 26.0,
  portSnapRadiusMeters: 2.2,
  portElevationToleranceMeters: 0.25,
  portYawToleranceDeg: 35,
  splineMaxSegmentLengthMeters: 2.2
};

export const INFRA_BASE_ROAD_PARAMS = {
  presetId: 'residential_2lane',
  laneCount: 2,
  laneWidth: 3.2,
  bidirectional: true,
  includeSidewalks: true,
  sidewalkWidth: 2.2,
  curbHeight: 0.15,
  shoulderWidth: 0.0,
  vergeWidth: 0.0,
  includeMedian: false,
  medianWidth: 1.4,
  medianType: 'raised',
  embeddedTramMode: 'none',
  embeddedTramGauge: 1.435,
  includeTramPoles: true,
  includeTramPlatform: false,
  surfaceMaterial: 'asphalt',
  sidewalkMaterial: 'concrete',
  markingsStyle: 'standard',
  includeCrosswalks: true,
  cornerRadius: 3.2,
  wear: 0.15,
  deckThickness: 0.65,
  includeBarriers: true,
  supportSpacing: 16.0,
  supportStyle: 'double_pier',
  bankingDeg: 0
};

export const INFRA_BASE_RAIL_PARAMS = {
  presetId: 'freight_double_track',
  trackCount: 2,
  trackGauge: 1.435,
  trackSpacing: 4.2,
  railHeight: 0.17,
  sleeperMaterial: 'wood',
  sleeperSpacing: 0.68,
  ballastMaterial: 'ballast_granite',
  ballastDepth: 0.36,
  ballastWidthMargin: 1.15,
  electrification: 'none',
  includeSignals: true,
  includeWalkway: false,
  includeFencing: false,
  includeBufferStop: false,
  includePlatform: 'none',
  platformLengthRatio: 0.45,
  abandonment: 0.0,
  wear: 0.2,
  deckThickness: 0.72,
  supportSpacing: 16.0,
  supportStyle: 'double_pier'
};

export const INFRA_BASE_ELEVATED_PARAMS = {
  presetId: 'wuppertal_steel_double',
  transitSystem: 'suspended_monorail',
  structuralStyle: 'wuppertal_steel',
  trackCount: 2,
  trackSpacing: 3.6,
  guidewayWidth: 5.4,
  guidewayDepth: 1.75,
  hangingDropMeters: 3.6,
  hangingWidthMeters: 2.55,
  supportStyle: 'a_frame_wuppertal',
  supportSpacing: 18.0,
  includeMaintenanceWalkway: true,
  includeStation: false,
  stationStyle: 'historic_steel',
  stationArchitecture: 'industrial_open',
  stationCanopy: 'preset',
  stationCoverage: 75,
  stationPlatformWidth: 3.6,
  stationGlass: 0,
  stationStairCover: 'preset',
  stationLift: true,
  stationSeating: 2,
  stationLighting: 2,
  stationDetail: 2,
  stationStairStyle: 'concrete',
  includeStationStairs: true,
  lightingFixtures: true,
  wear: 0.18
};

export const INFRA_BASE_BRIDGE_PARAMS = {
  presetId: 'cable_stayed_bridge',
  bridgeType: 'cable_stayed',
  laneCount: 2,
  laneWidth: 3.3,
  walkwayWidth: 1.6,
  deckThickness: 0.9,
  archRiseMeters: 5.5,
  towerHeightMeters: 16.0,
  trussHeightMeters: 5.4,
  cableCountPerSide: 6,
  surfaceMaterial: 'asphalt',
  includeWalkways: true,
  includeLighting: true,
  wear: 0.14
};

export const INFRA_BASE_PEDESTRIAN_PARAMS = {
  presetId: 'city_promenade',
  pedestrianType: 'walkway',
  walkwayWidth: 4.0,
  surfaceMaterial: 'tile_plaza',
  includePlanters: true,
  includeBollards: true,
  includeHandrails: true,
  includeLighting: true,
  includeCanopy: true,
  maxStepRiseMeters: 0.19,
  wear: 0.12
};

export const INFRA_BASE_TUNNEL_PARAMS = {
  presetId: 'highway_arch_tunnel',
  tunnelShape: 'arch',
  interiorMode: 'road',
  clearWidthMeters: 8.6,
  clearHeightMeters: 5.2,
  wallThicknessMeters: 0.55,
  includeWalkways: true,
  includePortals: true,
  includeLighting: true,
  includeJetFans: true,
  wear: 0.16
};

export const INFRA_BASE_WATERWAY_PARAMS = {
  presetId: 'urban_stone_canal',
  waterwayType: 'canal',
  channelWidthMeters: 12.0,
  channelDepthMeters: 2.6,
  waterDepthMeters: 2.1,
  wallWidthMeters: 0.85,
  towpathWidthMeters: 2.4,
  wallMaterial: 'stone_masonry',
  includeTowpaths: true,
  includeRailings: true,
  includeBollards: true,
  includePierSpurs: false,
  wear: 0.18
};

export const INFRA_BASE_UTILITY_PARAMS = {
  presetId: 'hv_transmission_line',
  utilityType: 'power_transmission',
  corridorWidthMeters: 6.0,
  towerHeightMeters: 14.5,
  poleSpacingMeters: 26.0,
  wireCount: 3,
  pipeCount: 3,
  pipeDiameterMeters: 0.45,
  includeSafetyCages: true,
  wear: 0.15
};

export const INFRA_BASE_FACILITY_PARAMS = {
  presetId: 'protected_bikeway',
  facilityType: 'protected_bikeway',
  corridorWidthMeters: 3.6,
  laneCount: 2,
  includeCurbBuffer: true,
  includeBollards: true,
  includePlatformShelter: false,
  includeLighting: true,
  wear: 0.12
};

export function infraVecToBGameUnits(x = 0, y = 0, z = 0) {
  return {
    x: infraRound(x * INFRA_B_UNITS_PER_METER, 3),
    y: infraRound(-z * INFRA_B_UNITS_PER_METER, 3),
    z: infraRound(y * INFRA_B_UNITS_PER_METER, 3)
  };
}

export function infraBoundsToBGameUnits(minMeters, maxMeters) {
  const minX = Number(minMeters?.x) || 0;
  const minY = Number(minMeters?.y) || 0;
  const minZ = Number(minMeters?.z) || 0;
  const maxX = Number(maxMeters?.x) || 0;
  const maxY = Number(maxMeters?.y) || 0;
  const maxZ = Number(maxMeters?.z) || 0;
  return {
    unitsPerMeter: INFRA_B_UNITS_PER_METER,
    min: infraVecToBGameUnits(minX, minY, maxZ),
    max: infraVecToBGameUnits(maxX, maxY, minZ),
    size: {
      x: infraRound((maxX - minX) * INFRA_B_UNITS_PER_METER, 3),
      y: infraRound((maxZ - minZ) * INFRA_B_UNITS_PER_METER, 3),
      z: infraRound((maxY - minY) * INFRA_B_UNITS_PER_METER, 3)
    }
  };
}
