import { INFRA_DEFAULTS } from '../config.js';
import { infraCopy, infraRound } from '../utils.js';

// Configurable gameplay clearance envelopes calibrated to existing B Remastered assets
// (1.82m player, 2.15m pedestrian headroom, 3.92m double-decker bus, 2.52m semi width).
export const INFRA_CLEARANCE_ENVELOPES = {
  pedestrian: {
    id: 'pedestrian',
    label: 'Pedestrian Walkway',
    domain: 'pedestrian',
    mountMode: 'floor_supported',
    widthMeters: 1.2,
    heightMeters: INFRA_DEFAULTS.pedestrianHeadroomMeters,
    minClearanceAboveDatumMeters: 2.15,
    minClearanceBelowMeters: 0
  },
  road_passenger: {
    id: 'road_passenger',
    label: 'Passenger Vehicle Corridor',
    domain: 'road',
    mountMode: 'floor_supported',
    widthMeters: 2.6,
    heightMeters: 3.2,
    minClearanceAboveDatumMeters: 3.2,
    minClearanceBelowMeters: 0
  },
  road_urban_transit: {
    id: 'road_urban_transit',
    label: 'Urban Road & Double-Decker Transit',
    domain: 'road',
    mountMode: 'floor_supported',
    widthMeters: 2.9,
    heightMeters: INFRA_DEFAULTS.urbanClearanceMeters, // clears 3.92m double_decker_bus + 0.58m margin
    minClearanceAboveDatumMeters: INFRA_DEFAULTS.urbanClearanceMeters,
    minClearanceBelowMeters: 0
  },
  road_highway_freight: {
    id: 'road_highway_freight',
    label: 'Highway & Heavy Freight',
    domain: 'road',
    mountMode: 'floor_supported',
    widthMeters: 3.2,
    heightMeters: INFRA_DEFAULTS.highwayClearanceMeters,
    minClearanceAboveDatumMeters: INFRA_DEFAULTS.highwayClearanceMeters,
    minClearanceBelowMeters: 0
  },
  rail_standard: {
    id: 'rail_standard',
    label: 'Standard Rail Kinematic Envelope',
    domain: 'rail',
    mountMode: 'floor_supported',
    widthMeters: 3.4,
    heightMeters: 4.8,
    minClearanceAboveDatumMeters: 4.8,
    minClearanceBelowMeters: 0
  },
  tram_urban: {
    id: 'tram_urban',
    label: 'Street-Running Urban Tram',
    domain: 'tram',
    mountMode: 'floor_supported',
    widthMeters: 2.65,
    heightMeters: 3.8,
    minClearanceAboveDatumMeters: 3.8,
    minClearanceBelowMeters: 0
  },
  suspended_monorail: {
    id: 'suspended_monorail',
    label: 'Wuppertal-Style Suspended Monorail',
    domain: 'suspended_rail',
    mountMode: 'top_hung',
    widthMeters: 2.6,
    heightMeters: 3.4,
    bogieOffsetY: 0.4,
    dropBelowGuidewayMeters: 3.6,
    minClearanceAboveDatumMeters: 1.75,
    minClearanceBelowMeters: INFRA_DEFAULTS.urbanClearanceMeters
  },
  straddle_monorail: {
    id: 'straddle_monorail',
    label: 'Straddle-Beam Monorail',
    domain: 'monorail',
    mountMode: 'floor_supported',
    widthMeters: 2.9,
    heightMeters: 3.6,
    minClearanceAboveDatumMeters: 3.6,
    minClearanceBelowMeters: 0
  },
  waterway_canal: {
    id: 'waterway_canal',
    label: 'Navigable Canal Craft',
    domain: 'waterway',
    mountMode: 'water_surface',
    widthMeters: 6.0,
    heightMeters: 4.0,
    minClearanceAboveDatumMeters: 4.0,
    minClearanceBelowMeters: 0
  },
  cycle_lane: {
    id: 'cycle_lane',
    label: 'Protected Two-Way Cycle Track',
    domain: 'cycle',
    mountMode: 'floor_supported',
    widthMeters: 2.6,
    heightMeters: 2.5,
    minClearanceAboveDatumMeters: 2.5,
    minClearanceBelowMeters: 0
  },
  tunnel_road: {
    id: 'tunnel_road',
    label: 'Road Tunnel Bore',
    domain: 'road',
    mountMode: 'underground_bore',
    widthMeters: 8.6,
    heightMeters: 5.2,
    minClearanceAboveDatumMeters: 5.8,
    minClearanceBelowMeters: 0
  },
  tunnel_rail: {
    id: 'tunnel_rail',
    label: 'Rail / Metro Tunnel Bore',
    domain: 'rail',
    mountMode: 'underground_bore',
    widthMeters: 5.6,
    heightMeters: 5.4,
    minClearanceAboveDatumMeters: 6.0,
    minClearanceBelowMeters: 0
  },
  utility_aerial: {
    id: 'utility_aerial',
    label: 'Overhead Power / Telecom Span',
    domain: 'power',
    mountMode: 'aerial',
    widthMeters: 5.0,
    heightMeters: 3.5,
    wireHeightAboveGroundMeters: 8.5,
    minClearanceAboveDatumMeters: 12.0,
    minClearanceBelowMeters: 5.5
  },
  utility_pipe: {
    id: 'utility_pipe',
    label: 'Industrial Pipe Corridor',
    domain: 'pipe',
    mountMode: 'floor_supported',
    widthMeters: 3.4,
    heightMeters: 4.5,
    minClearanceAboveDatumMeters: 4.5,
    minClearanceBelowMeters: 0
  }
};

export function infraGetClearanceEnvelope(id = 'road_urban_transit', overrides = null) {
  const base = INFRA_CLEARANCE_ENVELOPES[id] || INFRA_CLEARANCE_ENVELOPES.road_urban_transit;
  const out = infraCopy(base);
  if (overrides && typeof overrides === 'object') {
    Object.assign(out, overrides);
  }
  return out;
}

// Computes exact vertical occupied band and required vertical clearance band for any edge.
// Works uniformly for grade, elevated, underground, and top-hung suspended guideways.
export function infraComputeEdgeVerticalEnvelope(elevationY, compiledProfile, elevationMode = 'grade', clearanceId = null, overrides = null) {
  const env = infraGetClearanceEnvelope(clearanceId || compiledProfile?.clearanceEnvelopeId || 'road_urban_transit');
  const deckThickness = Number(compiledProfile?.understructure?.deckThicknessMeters) || 0;
  const beamDepth = Number(compiledProfile?.understructure?.edgeBeamDepthMeters) || 0;
  const underDepth = elevationMode === 'elevated' || elevationMode === 'suspended'
    ? Math.max(deckThickness, beamDepth)
    : 0;

  if (env.mountMode === 'top_hung' || elevationMode === 'suspended') {
    const drop = Number(overrides?.dropBelowGuidewayMeters ?? compiledProfile?.hangingClearance?.dropHeightMeters ?? env.dropBelowGuidewayMeters) || 3.6;
    const guidewayTopY = elevationY + (Number(compiledProfile?.maxElevationOffsetMeters) || Number(env.minClearanceAboveDatumMeters) || 1.75);
    const hangingBottomY = elevationY - drop;
    return {
      datumY: infraRound(elevationY, 4),
      structuralTopY: infraRound(guidewayTopY, 4),
      structuralBottomY: infraRound(elevationY - underDepth, 4),
      clearanceTopY: infraRound(guidewayTopY, 4),
      clearanceBottomY: infraRound(hangingBottomY, 4),
      dropBelowGuidewayMeters: infraRound(drop, 3),
      requiredHeadroomAboveDatum: infraRound(env.minClearanceAboveDatumMeters || 1.75, 3),
      requiredClearanceBelowEnvelope: infraRound(env.minClearanceBelowMeters || INFRA_DEFAULTS.urbanClearanceMeters, 3),
      mountMode: 'top_hung'
    };
  }

  if (env.mountMode === 'aerial' || elevationMode === 'aerial') {
    const towerH = Number(overrides?.towerHeightMeters) || 11.5;
    const wireLow = Number(overrides?.wireClearanceY) || Math.max(2.0, towerH - 3.0);
    return {
      datumY: infraRound(elevationY, 4),
      structuralTopY: infraRound(elevationY + towerH, 4),
      structuralBottomY: infraRound(elevationY, 4),
      clearanceTopY: infraRound(elevationY + towerH + 1.0, 4),
      clearanceBottomY: infraRound(elevationY + wireLow, 4),
      requiredHeadroomAboveDatum: infraRound(towerH, 3),
      requiredClearanceBelowEnvelope: infraRound(env.minClearanceBelowMeters || 5.5, 3),
      mountMode: 'aerial'
    };
  }

  const headroom = Number(env.minClearanceAboveDatumMeters) || INFRA_DEFAULTS.urbanClearanceMeters;
  return {
    datumY: infraRound(elevationY, 4),
    structuralTopY: infraRound(elevationY + (Number(compiledProfile?.maxElevationOffsetMeters) || 0.15), 4),
    structuralBottomY: infraRound(elevationY - underDepth, 4),
    clearanceTopY: infraRound(elevationY + headroom, 4),
    clearanceBottomY: infraRound(elevationY - underDepth, 4),
    requiredHeadroomAboveDatum: infraRound(headroom, 3),
    requiredClearanceBelowEnvelope: 0,
    mountMode: env.mountMode
  };
}
