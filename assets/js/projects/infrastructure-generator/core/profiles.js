import {
  INFRA_BASE_BRIDGE_PARAMS,
  INFRA_BASE_ELEVATED_PARAMS,
  INFRA_BASE_FACILITY_PARAMS,
  INFRA_BASE_PEDESTRIAN_PARAMS,
  INFRA_BASE_RAIL_PARAMS,
  INFRA_BASE_ROAD_PARAMS,
  INFRA_BASE_TUNNEL_PARAMS,
  INFRA_BASE_UTILITY_PARAMS,
  INFRA_BASE_WATERWAY_PARAMS,
  INFRA_DEFAULTS
} from '../config.js';
import { infraClamp, infraCopy, infraRound } from '../utils.js';

// Compiles a sequence of adjacent, non-overlapping horizontal strips into exact centered
// cross-section offsets [-W/2 .. +W/2] and typed semantic channels.
export function infraCompileCrossSectionProfile(spec) {
  const stripsInput = Array.isArray(spec?.strips) ? spec.strips : [];
  const rawTotal = stripsInput.reduce((acc, s) => acc + Math.max(0, Number(s.widthMeters) || 0), 0);
  let cursor = -rawTotal * 0.5;

  const compiledStrips = [];
  const channels = [];
  let maxElevationOffsetMeters = 0;
  let drivableMinX = Infinity;
  let drivableMaxX = -Infinity;
  let leftSidewalkWidth = 0;
  let rightSidewalkWidth = 0;
  let curbHeight = 0;
  let hasEmbeddedTram = false;
  const tramTrackOffsets = [];
  let tramGaugeMeters = INFRA_DEFAULTS.railGaugeStandardMeters;

  for (let i = 0; i < stripsInput.length; i++) {
    const s = stripsInput[i];
    const width = Math.max(0.01, Number(s.widthMeters) || 0.01);
    const xLeft = cursor;
    const xRight = cursor + width;
    const xCenter = (xLeft + xRight) * 0.5;
    cursor = xRight;

    const elevOffset = Number(s.elevationOffsetMeters) || 0;
    if (elevOffset > maxElevationOffsetMeters) maxElevationOffsetMeters = elevOffset;

    if (s.kind === 'sidewalk' || s.kind === 'walkway_deck') {
      if (xCenter < 0) leftSidewalkWidth += width;
      else rightSidewalkWidth += width;
    }
    if (s.kind === 'curb' && elevOffset > curbHeight) {
      curbHeight = elevOffset;
    }
    if (
      s.kind === 'vehicle_lane' ||
      s.kind === 'bus_lane' ||
      s.kind === 'tram_embedded' ||
      s.kind === 'shoulder' ||
      s.kind === 'median' ||
      s.kind === 'rail_bed'
    ) {
      drivableMinX = Math.min(drivableMinX, xLeft);
      drivableMaxX = Math.max(drivableMaxX, xRight);
    }

    if (s.kind === 'tram_embedded' && s.embeddedRails) {
      hasEmbeddedTram = true;
      tramGaugeMeters = Number(s.embeddedRails.gaugeMeters) || INFRA_DEFAULTS.railGaugeStandardMeters;
      const tCount = Math.max(1, Number(s.embeddedRails.trackCount) || 1);
      const tSpacing = Number(s.embeddedRails.trackSpacing) || 3.0;
      if (tCount === 1) {
        tramTrackOffsets.push(infraRound(xCenter, 4));
      } else {
        const startOff = -((tCount - 1) * tSpacing) * 0.5;
        for (let t = 0; t < tCount; t++) {
          tramTrackOffsets.push(infraRound(xCenter + startOff + t * tSpacing, 4));
        }
      }
    }

    compiledStrips.push({
      id: String(s.id || `strip_${i}`),
      kind: s.kind,
      widthMeters: infraRound(width, 4),
      xLeft: infraRound(xLeft, 4),
      xRight: infraRound(xRight, 4),
      xCenter: infraRound(xCenter, 4),
      elevationOffsetMeters: infraRound(elevOffset, 4),
      surfaceMaterial: s.surfaceMaterial || 'asphalt',
      markingKey: s.markingKey || 'plain',
      traversableBy: Array.isArray(s.traversableBy) ? [...s.traversableBy] : [],
      surfaceOwnership: s.surfaceOwnership || 'replace_terrain',
      vegetationPolicy: s.vegetationPolicy || 'exclude',
      embeddedRails: s.embeddedRails ? infraCopy(s.embeddedRails) : null,
      hangingClearance: s.hangingClearance ? infraCopy(s.hangingClearance) : null
    });

    if (
      s.kind === 'vehicle_lane' ||
      s.kind === 'bus_lane' ||
      s.kind === 'bike_lane' ||
      s.kind === 'sidewalk' ||
      s.kind === 'walkway_deck' ||
      s.kind === 'tram_embedded' ||
      s.kind === 'guideway_beam'
    ) {
      channels.push({
        channelId: String(s.id || `ch_${i}`),
        kind: s.kind === 'guideway_beam' ? 'guideway' : s.kind === 'walkway_deck' ? 'sidewalk' : s.kind,
        offsetFromCenterMeters: infraRound(xCenter, 4),
        widthMeters: infraRound(width, 4),
        direction: s.direction || 'bidirectional',
        ...(s.embeddedRails ? { gaugeMeters: s.embeddedRails.gaugeMeters } : {})
      });
    }
  }

  // Expand explicit rail track channels if supplied
  if (Array.isArray(spec.trackCenterOffsets) && spec.trackCenterOffsets.length) {
    const tGauge = Number(spec.trackGauge) || INFRA_DEFAULTS.railGaugeStandardMeters;
    for (let t = 0; t < spec.trackCenterOffsets.length; t++) {
      channels.push({
        channelId: `rail_track_${t}`,
        kind: spec.domain === 'tram' ? 'tram_track' : 'rail_track',
        offsetFromCenterMeters: infraRound(spec.trackCenterOffsets[t], 4),
        widthMeters: infraRound(tGauge + 1.2, 3),
        direction: 'bidirectional',
        gaugeMeters: tGauge
      });
    }
  }

  if (!Number.isFinite(drivableMinX)) {
    drivableMinX = -rawTotal * 0.5;
    drivableMaxX = rawTotal * 0.5;
  }

  return {
    id: String(spec.id || 'profile_custom'),
    domain: String(spec.domain || 'road'),
    label: String(spec.label || 'Custom Profile'),
    eraStyle: spec.eraStyle || 'modern_municipal',
    clearanceEnvelopeId: spec.clearanceEnvelopeId || 'road_urban_transit',
    totalWidthMeters: infraRound(rawTotal, 4),
    halfWidthMeters: infraRound(rawTotal * 0.5, 4),
    drivableMinX: infraRound(drivableMinX, 4),
    drivableMaxX: infraRound(drivableMaxX, 4),
    drivableWidthMeters: infraRound(drivableMaxX - drivableMinX, 4),
    leftSidewalkWidth: infraRound(leftSidewalkWidth, 4),
    rightSidewalkWidth: infraRound(rightSidewalkWidth, 4),
    curbHeightMeters: infraRound(curbHeight, 4),
    maxElevationOffsetMeters: infraRound(maxElevationOffsetMeters, 4),
    hasEmbeddedTram,
    tramTrackOffsets,
    tramGaugeMeters: hasEmbeddedTram ? tramGaugeMeters : null,
    trackCount: Number(spec.trackCount) || (hasEmbeddedTram ? tramTrackOffsets.length : 0),
    trackGauge: Number(spec.trackGauge) || (hasEmbeddedTram ? tramGaugeMeters : null),
    trackSpacing: Number(spec.trackSpacing) || 0,
    trackCenterOffsets: Array.isArray(spec.trackCenterOffsets) ? [...spec.trackCenterOffsets] : [],
    strips: compiledStrips,
    channels,
    hangingClearance: spec.hangingClearance ? infraCopy(spec.hangingClearance) : null,
    understructure: spec.understructure
      ? infraCopy(spec.understructure)
      : {
          deckThicknessMeters: INFRA_DEFAULTS.deckThicknessMeters,
          edgeBeamDepthMeters: INFRA_DEFAULTS.deckThicknessMeters,
          sideSkirtMode: 'embankment'
        }
  };
}

export function infraBuildRoadProfileFromParams(rawParams = {}, elevationMode = 'grade', eraStyle = 'modern_municipal') {
  const p = { ...INFRA_BASE_ROAD_PARAMS, ...rawParams };
  const laneCount = Math.round(infraClamp(p.laneCount, 1, 6));
  const laneWidth = infraClamp(p.laneWidth, 2.4, 4.5);
  const includeSidewalks = p.includeSidewalks !== false && elevationMode !== 'elevated';
  const sidewalkWidth = includeSidewalks ? infraClamp(p.sidewalkWidth, 1.0, 5.0) : 0;
  const curbHeight = includeSidewalks ? infraClamp(p.curbHeight, 0.08, 0.25) : 0;
  const curbWidth = includeSidewalks ? INFRA_DEFAULTS.curbWidthMeters : 0;
  const shoulderWidth = infraClamp(p.shoulderWidth, 0, 3.0);
  const vergeWidth = elevationMode === 'grade' ? infraClamp(p.vergeWidth, 0, 3.5) : 0;
  const tramMode = p.embeddedTramMode || 'none';
  const tramGauge = infraClamp(p.embeddedTramGauge || 1.435, 1.0, 1.676);
  const hasCenterTram = tramMode === 'center_single' || tramMode === 'center_double' || tramMode === 'grass_median_tram';
  const hasSideTram = tramMode === 'side_single';
  const includeMedian = Boolean(p.includeMedian) && laneCount >= 2 && !hasCenterTram;
  const medianWidth = includeMedian ? infraClamp(p.medianWidth, 0.6, 4.0) : 0;
  const surfaceMaterial = p.surfaceMaterial || 'asphalt';
  const sidewalkMaterial = p.sidewalkMaterial || 'concrete';
  const markingsStyle = p.markingsStyle || 'standard';
  const isElevated = elevationMode === 'elevated';
  const deckOwnership = isElevated ? 'elevated_clearance' : 'replace_terrain';

  const strips = [];

  if (vergeWidth > 0.05) {
    strips.push({
      id: 'verge_left',
      kind: 'verge',
      widthMeters: vergeWidth,
      elevationOffsetMeters: curbHeight,
      surfaceMaterial: 'verge_grass',
      traversableBy: [],
      surfaceOwnership: 'verge_transition',
      vegetationPolicy: 'verge_grass'
    });
  }

  if (includeSidewalks) {
    strips.push({
      id: 'sw_left',
      kind: 'sidewalk',
      widthMeters: sidewalkWidth,
      elevationOffsetMeters: curbHeight,
      surfaceMaterial: sidewalkMaterial,
      traversableBy: ['pedestrian'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude'
    });
    strips.push({
      id: 'curb_left',
      kind: 'curb',
      widthMeters: curbWidth,
      elevationOffsetMeters: curbHeight,
      surfaceMaterial: 'curb_stone',
      traversableBy: ['pedestrian'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude'
    });
  } else if (isElevated && p.includeBarriers !== false) {
    strips.push({
      id: 'barrier_left',
      kind: 'parapet',
      widthMeters: INFRA_DEFAULTS.barrierWidthMeters,
      elevationOffsetMeters: INFRA_DEFAULTS.barrierHeightMeters,
      surfaceMaterial: 'concrete',
      traversableBy: [],
      surfaceOwnership: 'elevated_clearance',
      vegetationPolicy: 'exclude'
    });
  }

  if (shoulderWidth > 0.05) {
    strips.push({
      id: 'shoulder_left',
      kind: 'shoulder',
      widthMeters: shoulderWidth,
      elevationOffsetMeters: 0,
      surfaceMaterial,
      markingKey: markingsStyle === 'none' ? 'plain' : 'solid_edge_left',
      traversableBy: ['car', 'emergency'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude'
    });
  }

  const splitCenter = includeMedian || hasCenterTram;
  const leftLaneCount = splitCenter ? Math.ceil(laneCount / 2) : (p.bidirectional !== false ? Math.floor(laneCount / 2) : laneCount);
  const rightLaneCount = laneCount - leftLaneCount;

  const laneDirLeft = p.bidirectional !== false && laneCount > 1 ? 'backward' : 'forward';
  const laneDirRight = 'forward';

  for (let i = 0; i < leftLaneCount; i++) {
    let markingKey = 'plain';
    if (markingsStyle !== 'none') {
      const isOuterLeft = i === 0 && shoulderWidth <= 0.05;
      const isCenterBoundary = !splitCenter && p.bidirectional !== false && i === leftLaneCount - 1 && rightLaneCount > 0;
      const isNextMedianOrTram = splitCenter && i === leftLaneCount - 1;
      const hasMoreLeft = i < leftLaneCount - 1;

      if (isCenterBoundary) {
        markingKey = isOuterLeft ? 'solid_left_double_yellow_right' : 'double_yellow_right';
      } else if (isNextMedianOrTram) {
        markingKey = isOuterLeft ? 'solid_left_yellow_right' : 'yellow_edge_right';
      } else if (isOuterLeft) {
        markingKey = hasMoreLeft ? 'solid_left_dashed_right' : 'solid_white_left';
      } else if (hasMoreLeft) {
        markingKey = 'dashed_white_right';
      }
    }
    strips.push({
      id: `lane_l_${i}`,
      kind: markingsStyle === 'bus_lane' && i === 0 ? 'bus_lane' : 'vehicle_lane',
      widthMeters: laneWidth,
      elevationOffsetMeters: 0,
      surfaceMaterial,
      markingKey,
      direction: laneDirLeft,
      traversableBy: ['car', 'bus', 'truck'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude'
    });
  }

  if (hasCenterTram) {
    const isDouble = tramMode === 'center_double' || tramMode === 'grass_median_tram';
    const isGrass = tramMode === 'grass_median_tram';
    const trackCount = isDouble ? 2 : 1;
    const trackSpacing = 3.0;
    const widthMeters = isDouble ? 5.4 : 2.9;
    strips.push({
      id: 'tram_center_corridor',
      kind: 'tram_embedded',
      widthMeters,
      elevationOffsetMeters: 0,
      surfaceMaterial: isGrass ? 'verge_grass' : surfaceMaterial,
      direction: 'bidirectional',
      traversableBy: ['tram'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: isGrass ? 'median_planter' : 'exclude',
      embeddedRails: {
        gaugeMeters: tramGauge,
        railWidthMeters: 0.08,
        grooveDepthMeters: 0.024,
        trackCount,
        trackSpacing
      }
    });
  } else if (includeMedian) {
    strips.push({
      id: 'median_center',
      kind: 'median',
      widthMeters: medianWidth,
      elevationOffsetMeters: p.medianType === 'raised' ? Math.max(curbHeight, 0.16) : 0,
      surfaceMaterial: p.medianType === 'planted' ? 'verge_grass' : 'concrete',
      traversableBy: [],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: p.medianType === 'planted' ? 'median_planter' : 'exclude'
    });
  }

  for (let i = 0; i < rightLaneCount; i++) {
    let markingKey = 'plain';
    if (markingsStyle !== 'none') {
      const isOuterRight = i === rightLaneCount - 1 && shoulderWidth <= 0.05 && !hasSideTram;
      const isNextMedianOrTram = splitCenter && i === 0;
      const hasMoreRight = i < rightLaneCount - 1;

      if (isNextMedianOrTram) {
        markingKey = isOuterRight ? 'yellow_left_white_right' : (hasMoreRight ? 'yellow_left_dashed_right' : 'yellow_edge_left');
      } else if (isOuterRight) {
        markingKey = 'solid_white_right';
      } else if (hasMoreRight) {
        markingKey = 'dashed_white_right';
      }
    }
    strips.push({
      id: `lane_r_${i}`,
      kind: markingsStyle === 'bus_lane' && i === rightLaneCount - 1 ? 'bus_lane' : 'vehicle_lane',
      widthMeters: laneWidth,
      elevationOffsetMeters: 0,
      surfaceMaterial,
      markingKey,
      direction: laneDirRight,
      traversableBy: ['car', 'bus', 'truck'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude'
    });
  }

  if (hasSideTram) {
    strips.push({
      id: 'tram_side_corridor',
      kind: 'tram_embedded',
      widthMeters: 2.9,
      elevationOffsetMeters: 0,
      surfaceMaterial,
      direction: 'bidirectional',
      traversableBy: ['tram'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude',
      embeddedRails: {
        gaugeMeters: tramGauge,
        railWidthMeters: 0.08,
        grooveDepthMeters: 0.024,
        trackCount: 1,
        trackSpacing: 3.0
      }
    });
  }

  if (shoulderWidth > 0.05) {
    strips.push({
      id: 'shoulder_right',
      kind: 'shoulder',
      widthMeters: shoulderWidth,
      elevationOffsetMeters: 0,
      surfaceMaterial,
      markingKey: markingsStyle === 'none' ? 'plain' : 'solid_edge_right',
      traversableBy: ['car', 'emergency'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude'
    });
  }

  if (includeSidewalks) {
    strips.push({
      id: 'curb_right',
      kind: 'curb',
      widthMeters: curbWidth,
      elevationOffsetMeters: curbHeight,
      surfaceMaterial: 'curb_stone',
      traversableBy: ['pedestrian'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude'
    });
    strips.push({
      id: 'sw_right',
      kind: 'sidewalk',
      widthMeters: sidewalkWidth,
      elevationOffsetMeters: curbHeight,
      surfaceMaterial: sidewalkMaterial,
      traversableBy: ['pedestrian'],
      surfaceOwnership: deckOwnership,
      vegetationPolicy: 'exclude'
    });
  } else if (isElevated && p.includeBarriers !== false) {
    strips.push({
      id: 'barrier_right',
      kind: 'parapet',
      widthMeters: INFRA_DEFAULTS.barrierWidthMeters,
      elevationOffsetMeters: INFRA_DEFAULTS.barrierHeightMeters,
      surfaceMaterial: 'concrete',
      traversableBy: [],
      surfaceOwnership: 'elevated_clearance',
      vegetationPolicy: 'exclude'
    });
  }

  if (vergeWidth > 0.05) {
    strips.push({
      id: 'verge_right',
      kind: 'verge',
      widthMeters: vergeWidth,
      elevationOffsetMeters: curbHeight,
      surfaceMaterial: 'verge_grass',
      traversableBy: [],
      surfaceOwnership: 'verge_transition',
      vegetationPolicy: 'verge_grass'
    });
  }

  const profileId = `road_${laneCount}l_${infraRound(laneWidth, 2)}_${includeMedian ? 'med' : 'nomed'}_${tramMode !== 'none' ? `tram_${tramMode}` : 'notram'}_${includeSidewalks ? 'sw' : 'nosw'}_${elevationMode}_${surfaceMaterial}_${markingsStyle}`;
  return infraCompileCrossSectionProfile({
    id: profileId,
    domain: 'road',
    label: `${laneCount}-Lane ${tramMode !== 'none' ? 'Tram ' : ''}${isElevated ? 'Elevated ' : ''}${surfaceMaterial}`,
    eraStyle,
    clearanceEnvelopeId: laneCount >= 4 ? 'road_highway_freight' : 'road_urban_transit',
    strips,
    understructure: {
      deckThicknessMeters: infraClamp(p.deckThickness, 0.3, 1.8),
      edgeBeamDepthMeters: infraClamp(p.deckThickness, 0.3, 1.8),
      sideSkirtMode: isElevated ? 'viaduct_box' : 'embankment'
    }
  });
}

export function infraBuildRailProfileFromParams(rawParams = {}, elevationMode = 'grade', eraStyle = 'early_industrial') {
  const p = { ...INFRA_BASE_RAIL_PARAMS, ...rawParams };
  const trackCount = Math.round(infraClamp(p.trackCount, 1, 4));
  const trackGauge = infraClamp(p.trackGauge, 0.9, 1.676);
  const trackSpacing = infraClamp(p.trackSpacing, 3.2, 5.6);
  const isElevated = elevationMode === 'elevated';
  const ownership = isElevated ? 'elevated_clearance' : 'replace_terrain';
  const abandonment = infraClamp(p.abandonment, 0, 1);
  const ballastMat = p.ballastMaterial || 'ballast_granite';
  const isEmbeddedTram = p.presetId === 'tram_only_corridor' || ballastMat === 'concrete_slab';

  const trackCenterOffsets = [];
  if (trackCount === 1) {
    trackCenterOffsets.push(0);
  } else {
    const startOff = -((trackCount - 1) * trackSpacing) * 0.5;
    for (let i = 0; i < trackCount; i++) {
      trackCenterOffsets.push(infraRound(startOff + i * trackSpacing, 4));
    }
  }

  const outerHalfSpan = trackCount === 1 ? trackGauge * 0.5 : (trackCount - 1) * trackSpacing * 0.5 + trackGauge * 0.5;
  const bedWidth = outerHalfSpan * 2 + infraClamp(p.ballastWidthMargin, 0.8, 2.2) * 2;
  const ballastTopY = isElevated || isEmbeddedTram ? 0 : infraClamp(p.ballastDepth, 0.15, 0.65);

  const strips = [];
  if (p.includeWalkway) {
    strips.push({
      id: 'rail_walkway_left',
      kind: 'walkway_deck',
      widthMeters: 1.15,
      elevationOffsetMeters: isElevated ? 0.15 : 0.05,
      surfaceMaterial: 'concrete',
      traversableBy: ['pedestrian'],
      surfaceOwnership: ownership,
      vegetationPolicy: 'exclude'
    });
  }

  if (isEmbeddedTram) {
    strips.push({
      id: 'rail_slab_corridor',
      kind: 'tram_embedded',
      widthMeters: bedWidth,
      elevationOffsetMeters: 0,
      surfaceMaterial: ballastMat === 'ballast_granite' ? 'concrete' : ballastMat,
      direction: 'bidirectional',
      traversableBy: ['tram'],
      surfaceOwnership: ownership,
      vegetationPolicy: abandonment > 0.35 ? 'overgrowth' : 'exclude',
      embeddedRails: {
        gaugeMeters: trackGauge,
        railWidthMeters: 0.08,
        grooveDepthMeters: 0.024,
        trackCount,
        trackSpacing
      }
    });
  } else {
    strips.push({
      id: 'rail_ballast_bed',
      kind: 'rail_bed',
      widthMeters: bedWidth,
      elevationOffsetMeters: ballastTopY,
      surfaceMaterial: ballastMat,
      traversableBy: ['rail'],
      surfaceOwnership: ownership,
      vegetationPolicy: abandonment > 0.35 ? 'overgrowth' : 'sparse_ballast'
    });
  }

  if (p.includeWalkway) {
    strips.push({
      id: 'rail_walkway_right',
      kind: 'walkway_deck',
      widthMeters: 1.15,
      elevationOffsetMeters: isElevated ? 0.15 : 0.05,
      surfaceMaterial: 'concrete',
      traversableBy: ['pedestrian'],
      surfaceOwnership: ownership,
      vegetationPolicy: 'exclude'
    });
  }

  const profileId = `rail_${trackCount}t_g${infraRound(trackGauge, 3)}_${ballastMat}_${elevationMode}${p.includeWalkway ? '_wk' : ''}`;
  return infraCompileCrossSectionProfile({
    id: profileId,
    domain: isEmbeddedTram ? 'tram' : 'rail',
    label: `${trackCount}-Track ${isEmbeddedTram ? 'Tramway' : 'Railway'} (${infraRound(trackGauge, 3)}m)`,
    eraStyle,
    clearanceEnvelopeId: isEmbeddedTram ? 'tram_urban' : 'rail_standard',
    trackCount,
    trackGauge,
    trackSpacing,
    trackCenterOffsets,
    strips,
    understructure: {
      deckThicknessMeters: isElevated ? infraClamp(p.deckThickness, 0.4, 1.6) : 0.25,
      edgeBeamDepthMeters: isElevated ? infraClamp(p.deckThickness, 0.4, 1.6) : 0.25,
      sideSkirtMode: isElevated ? 'viaduct_box' : 'ballast_slope'
    }
  });
}

export function infraBuildElevatedTransitProfileFromParams(rawParams = {}, elevationMode = 'suspended', eraStyle = 'contemporary_transit') {
  const p = { ...INFRA_BASE_ELEVATED_PARAMS, ...rawParams };
  const sys = p.transitSystem || 'suspended_monorail';
  const trackCount = Math.round(infraClamp(p.trackCount, 1, 2));
  const trackSpacing = infraClamp(p.trackSpacing, 2.8, 5.2);
  const isSuspended = sys === 'suspended_monorail' || elevationMode === 'suspended';
  const guidewayDepth = infraClamp(p.guidewayDepth, 0.85, 2.8);
  const beamW = trackCount === 2
    ? Math.max(infraClamp(p.guidewayWidth, 3.6, 8.2), trackSpacing + 1.8)
    : infraClamp(p.guidewayWidth, 1.2, 4.0);
  const dropH = isSuspended ? infraClamp(p.hangingDropMeters, 2.6, 5.0) : 0;
  const hangW = infraClamp(p.hangingWidthMeters, 1.8, 3.2);

  const trackCenterOffsets = trackCount === 1
    ? [0]
    : [infraRound(-trackSpacing * 0.5, 4), infraRound(trackSpacing * 0.5, 4)];

  const strips = [];
  if (p.includeMaintenanceWalkway) {
    strips.push({
      id: 'elev_catwalk_left',
      kind: 'walkway_deck',
      widthMeters: 0.85,
      elevationOffsetMeters: isSuspended ? 0.55 : 0.12,
      surfaceMaterial: 'steel_grating',
      traversableBy: ['pedestrian'],
      surfaceOwnership: 'elevated_clearance',
      vegetationPolicy: 'exclude'
    });
  }

  strips.push({
    id: 'elev_guideway_spine',
    kind: 'guideway_beam',
    widthMeters: beamW,
    elevationOffsetMeters: isSuspended ? guidewayDepth : 0,
    surfaceMaterial: p.structuralStyle === 'wuppertal_steel' ? 'steel_structure' : 'deck_concrete',
    direction: 'bidirectional',
    traversableBy: [isSuspended ? 'suspended_rail' : 'monorail'],
    surfaceOwnership: 'elevated_clearance',
    vegetationPolicy: 'exclude',
    ...(isSuspended
      ? {
          hangingClearance: {
            widthMeters: hangW,
            dropHeightMeters: dropH,
            bogieOffsetY: 0.45
          }
        }
      : {})
  });

  if (p.includeMaintenanceWalkway) {
    strips.push({
      id: 'elev_catwalk_right',
      kind: 'walkway_deck',
      widthMeters: 0.85,
      elevationOffsetMeters: isSuspended ? 0.55 : 0.12,
      surfaceMaterial: 'steel_grating',
      traversableBy: ['pedestrian'],
      surfaceOwnership: 'elevated_clearance',
      vegetationPolicy: 'exclude'
    });
  }

  const profileId = `elev_${sys}_${p.structuralStyle}_${trackCount}t_${elevationMode}`;
  return infraCompileCrossSectionProfile({
    id: profileId,
    domain: isSuspended ? 'suspended_rail' : sys === 'straddle_monorail' ? 'monorail' : 'rail',
    label: `${trackCount}-Track ${sys.replace(/_/g, ' ')}`,
    eraStyle,
    clearanceEnvelopeId: isSuspended ? 'suspended_monorail' : sys === 'straddle_monorail' ? 'straddle_monorail' : 'rail_standard',
    trackCount,
    trackGauge: 1.435,
    trackSpacing,
    trackCenterOffsets,
    strips,
    hangingClearance: isSuspended ? { widthMeters: hangW, dropHeightMeters: dropH, bogieOffsetY: 0.45 } : null,
    understructure: {
      deckThicknessMeters: isSuspended ? 0.35 : guidewayDepth,
      edgeBeamDepthMeters: guidewayDepth,
      sideSkirtMode: 'viaduct_box'
    }
  });
}

export function infraBuildBridgeProfileFromParams(rawParams = {}, elevationMode = 'elevated', eraStyle = 'modern_municipal') {
  const p = { ...INFRA_BASE_BRIDGE_PARAMS, ...rawParams };
  const laneCount = Math.round(infraClamp(p.laneCount, 1, 6));
  const laneWidth = infraClamp(p.laneWidth, 2.6, 4.2);
  const walkW = p.includeWalkways !== false ? infraClamp(p.walkwayWidth, 1.0, 3.2) : 0;
  const surfaceMaterial = p.surfaceMaterial || 'asphalt';
  const deckT = infraClamp(p.deckThickness, 0.5, 1.8);

  const strips = [];
  strips.push({
    id: 'br_parapet_l',
    kind: 'parapet',
    widthMeters: 0.44,
    elevationOffsetMeters: 0.9,
    surfaceMaterial: 'barrier_concrete',
    traversableBy: [],
    surfaceOwnership: 'elevated_clearance',
    vegetationPolicy: 'exclude'
  });
  if (walkW > 0.1) {
    strips.push({
      id: 'br_walk_l',
      kind: 'sidewalk',
      widthMeters: walkW,
      elevationOffsetMeters: 0.16,
      surfaceMaterial: 'sidewalk',
      traversableBy: ['pedestrian'],
      surfaceOwnership: 'elevated_clearance',
      vegetationPolicy: 'exclude'
    });
  }
  const half = Math.ceil(laneCount * 0.5);
  for (let i = 0; i < laneCount; i++) {
    let markingKey = 'plain';
    if (laneCount > 1) {
      if (i === 0) markingKey = half === 1 ? 'solid_left_double_yellow_right' : 'solid_left_dashed_right';
      else if (i === half - 1) markingKey = i === laneCount - 1 ? 'double_yellow_right' : 'double_yellow_right';
      else if (i === laneCount - 1) markingKey = 'solid_white_right';
      else markingKey = 'dashed_white_right';
    } else {
      markingKey = 'solid_left_white_right';
    }
    strips.push({
      id: `br_lane_${i}`,
      kind: 'vehicle_lane',
      widthMeters: laneWidth,
      elevationOffsetMeters: 0,
      surfaceMaterial,
      markingKey,
      direction: i < half ? 'backward' : 'forward',
      traversableBy: ['car', 'bus', 'truck'],
      surfaceOwnership: 'elevated_clearance',
      vegetationPolicy: 'exclude'
    });
  }
  if (walkW > 0.1) {
    strips.push({
      id: 'br_walk_r',
      kind: 'sidewalk',
      widthMeters: walkW,
      elevationOffsetMeters: 0.16,
      surfaceMaterial: 'sidewalk',
      traversableBy: ['pedestrian'],
      surfaceOwnership: 'elevated_clearance',
      vegetationPolicy: 'exclude'
    });
  }
  strips.push({
    id: 'br_parapet_r',
    kind: 'parapet',
    widthMeters: 0.44,
    elevationOffsetMeters: 0.9,
    surfaceMaterial: 'barrier_concrete',
    traversableBy: [],
    surfaceOwnership: 'elevated_clearance',
    vegetationPolicy: 'exclude'
  });

  return infraCompileCrossSectionProfile({
    id: `br_${p.bridgeType}_${laneCount}l_${elevationMode}`,
    domain: 'road',
    label: `${laneCount}-Lane ${String(p.bridgeType).replace(/_/g, ' ')} Bridge`,
    eraStyle,
    clearanceEnvelopeId: laneCount >= 4 ? 'road_highway_freight' : 'road_urban_transit',
    strips,
    understructure: {
      deckThicknessMeters: deckT,
      edgeBeamDepthMeters: deckT,
      sideSkirtMode: 'viaduct_box'
    }
  });
}

export function infraBuildPedestrianProfileFromParams(rawParams = {}, elevationMode = 'grade', eraStyle = 'modern_municipal') {
  const p = { ...INFRA_BASE_PEDESTRIAN_PARAMS, ...rawParams };
  const walkW = infraClamp(p.walkwayWidth, 1.6, 12.0);
  const mat = p.surfaceMaterial || 'tile_plaza';
  const isSky = p.pedestrianType === 'skybridge' || elevationMode === 'elevated';
  const ownership = isSky ? 'elevated_clearance' : 'replace_terrain';
  const deckElev = isSky ? 0 : 0.08;

  const strips = [];
  if (!isSky && p.includePlanters && p.pedestrianType === 'walkway') {
    strips.push({ id: 'ped_curb_l', kind: 'curb', widthMeters: 0.22, elevationOffsetMeters: deckElev, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: ownership, vegetationPolicy: 'exclude' });
    strips.push({ id: 'ped_verge_l', kind: 'verge', widthMeters: 0.95, elevationOffsetMeters: deckElev, surfaceMaterial: 'verge_grass', traversableBy: [], surfaceOwnership: 'verge_transition', vegetationPolicy: 'verge_grass' });
  } else {
    strips.push({ id: 'ped_edge_l', kind: 'curb', widthMeters: 0.28, elevationOffsetMeters: isSky ? 0.14 : deckElev, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: ownership, vegetationPolicy: 'exclude' });
  }
  strips.push({
    id: 'ped_deck',
    kind: 'walkway_deck',
    widthMeters: walkW,
    elevationOffsetMeters: deckElev,
    surfaceMaterial: mat,
    direction: 'bidirectional',
    traversableBy: ['pedestrian'],
    surfaceOwnership: ownership,
    vegetationPolicy: 'exclude'
  });
  if (!isSky && p.includePlanters && p.pedestrianType === 'walkway') {
    strips.push({ id: 'ped_verge_r', kind: 'verge', widthMeters: 0.95, elevationOffsetMeters: deckElev, surfaceMaterial: 'verge_grass', traversableBy: [], surfaceOwnership: 'verge_transition', vegetationPolicy: 'verge_grass' });
    strips.push({ id: 'ped_curb_r', kind: 'curb', widthMeters: 0.22, elevationOffsetMeters: deckElev, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: ownership, vegetationPolicy: 'exclude' });
  } else {
    strips.push({ id: 'ped_edge_r', kind: 'curb', widthMeters: 0.28, elevationOffsetMeters: isSky ? 0.14 : deckElev, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: ownership, vegetationPolicy: 'exclude' });
  }

  return infraCompileCrossSectionProfile({
    id: `ped_${p.pedestrianType}_${infraRound(walkW, 1)}_${elevationMode}`,
    domain: 'pedestrian',
    label: `Pedestrian ${String(p.pedestrianType).replace(/_/g, ' ')}`,
    eraStyle,
    clearanceEnvelopeId: 'pedestrian',
    strips,
    understructure: {
      deckThicknessMeters: isSky ? 0.45 : 0.25,
      edgeBeamDepthMeters: isSky ? 0.45 : 0.25,
      sideSkirtMode: isSky ? 'viaduct_box' : 'embankment'
    }
  });
}

export function infraBuildTunnelProfileFromParams(rawParams = {}, elevationMode = 'underground', eraStyle = 'modern_municipal') {
  const p = { ...INFRA_BASE_TUNNEL_PARAMS, ...rawParams };
  const clearW = infraClamp(p.clearWidthMeters, 4.4, 15.0);
  const clearH = infraClamp(p.clearHeightMeters, 3.8, 7.5);
  const wallT = infraClamp(p.wallThicknessMeters, 0.35, 1.2);
  const isRail = p.interiorMode === 'rail' || p.interiorMode === 'metro';
  const walkW = p.includeWalkways !== false ? 0.85 : 0;
  const deckW = Math.max(2.6, clearW - walkW * 2);

  const strips = [
    { id: 'tun_wall_l', kind: 'parapet', widthMeters: wallT, elevationOffsetMeters: clearH, surfaceMaterial: 'tunnel_concrete', traversableBy: [], surfaceOwnership: 'excavate_terrain', vegetationPolicy: 'exclude' }
  ];
  if (walkW > 0.1) {
    strips.push({ id: 'tun_walk_l', kind: 'walkway_deck', widthMeters: walkW, elevationOffsetMeters: 0.2, surfaceMaterial: 'sidewalk', traversableBy: ['pedestrian'], surfaceOwnership: 'excavate_terrain', vegetationPolicy: 'exclude' });
  }
  strips.push({
    id: 'tun_floor',
    kind: isRail ? 'rail_bed' : 'vehicle_lane',
    widthMeters: deckW,
    elevationOffsetMeters: 0,
    surfaceMaterial: isRail ? 'concrete' : 'asphalt',
    markingKey: isRail ? 'plain' : 'solid_left_double_yellow_right',
    direction: 'bidirectional',
    traversableBy: isRail ? ['rail'] : ['car', 'bus', 'truck'],
    surfaceOwnership: 'excavate_terrain',
    vegetationPolicy: 'exclude'
  });
  if (walkW > 0.1) {
    strips.push({ id: 'tun_walk_r', kind: 'walkway_deck', widthMeters: walkW, elevationOffsetMeters: 0.2, surfaceMaterial: 'sidewalk', traversableBy: ['pedestrian'], surfaceOwnership: 'excavate_terrain', vegetationPolicy: 'exclude' });
  }
  strips.push({
    id: 'tun_wall_r',
    kind: 'parapet',
    widthMeters: wallT,
    elevationOffsetMeters: clearH,
    surfaceMaterial: 'tunnel_concrete',
    traversableBy: [],
    surfaceOwnership: 'excavate_terrain',
    vegetationPolicy: 'exclude'
  });

  const trackCount = isRail ? (clearW >= 7.5 ? 2 : 1) : 0;
  const trackCenterOffsets = trackCount === 2 ? [-1.85, 1.85] : (trackCount === 1 ? [0] : []);

  return infraCompileCrossSectionProfile({
    id: `tun_${p.tunnelShape}_${p.interiorMode}_${infraRound(clearW, 1)}`,
    domain: isRail ? 'rail' : 'road',
    label: `${p.tunnelShape} ${isRail ? 'Rail' : 'Road'} Tunnel`,
    eraStyle,
    clearanceEnvelopeId: isRail ? 'tunnel_rail' : 'tunnel_road',
    trackCount,
    trackGauge: isRail ? 1.435 : null,
    trackSpacing: trackCount === 2 ? 3.7 : 0,
    trackCenterOffsets,
    strips,
    understructure: { deckThicknessMeters: 0.45, edgeBeamDepthMeters: clearH, sideSkirtMode: 'tunnel_lining' }
  });
}

export function infraBuildWaterwayProfileFromParams(rawParams = {}, elevationMode = 'grade', eraStyle = 'historic_european') {
  const p = { ...INFRA_BASE_WATERWAY_PARAMS, ...rawParams };
  const chanW = infraClamp(p.channelWidthMeters, 4.0, 28.0);
  const wallW = infraClamp(p.wallWidthMeters, 0.4, 2.0);
  const towW = p.includeTowpaths !== false ? infraClamp(p.towpathWidthMeters, 1.2, 5.0) : 0;
  const wallMat = p.wallMaterial || 'stone_masonry';

  const strips = [];
  if (towW > 0.1) {
    strips.push({ id: 'wat_tow_l', kind: 'walkway_deck', widthMeters: towW, elevationOffsetMeters: 0.22, surfaceMaterial: wallMat === 'stone_masonry' ? 'cobblestone' : 'concrete', traversableBy: ['pedestrian'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
  }
  strips.push({ id: 'wat_wall_l', kind: 'curb', widthMeters: wallW, elevationOffsetMeters: 0.36, surfaceMaterial: wallMat, traversableBy: [], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
  strips.push({ id: 'wat_channel', kind: 'waterway_channel', widthMeters: chanW, elevationOffsetMeters: 0, surfaceMaterial: 'water_canal', direction: 'bidirectional', traversableBy: ['boat'], surfaceOwnership: 'excavate_terrain', vegetationPolicy: 'exclude' });
  strips.push({ id: 'wat_wall_r', kind: 'curb', widthMeters: wallW, elevationOffsetMeters: 0.36, surfaceMaterial: wallMat, traversableBy: [], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
  if (towW > 0.1) {
    strips.push({ id: 'wat_tow_r', kind: 'walkway_deck', widthMeters: towW, elevationOffsetMeters: 0.22, surfaceMaterial: wallMat === 'stone_masonry' ? 'cobblestone' : 'concrete', traversableBy: ['pedestrian'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
  }

  return infraCompileCrossSectionProfile({
    id: `wat_${p.waterwayType}_${infraRound(chanW, 1)}`,
    domain: 'waterway',
    label: `${String(p.waterwayType).replace(/_/g, ' ')} (${infraRound(chanW, 1)}m)`,
    eraStyle,
    clearanceEnvelopeId: 'waterway_canal',
    strips,
    understructure: { deckThicknessMeters: infraClamp(p.channelDepthMeters, 1.2, 5.0), edgeBeamDepthMeters: 0.5, sideSkirtMode: 'quay' }
  });
}

export function infraBuildUtilityProfileFromParams(rawParams = {}, elevationMode = 'aerial', eraStyle = 'early_industrial') {
  const p = { ...INFRA_BASE_UTILITY_PARAMS, ...rawParams };
  const uType = p.utilityType || 'power_transmission';
  const width = infraClamp(p.corridorWidthMeters, 1.5, 14.0);
  const domain = uType === 'pipe_rack_elevated' || uType === 'industrial_pipeline' ? 'pipe' : uType === 'telecom_trunk' ? 'telecom' : 'power';
  const isAerial = elevationMode === 'aerial' || uType !== 'industrial_pipeline';

  const strips = [
    {
      id: 'util_corridor',
      kind: 'utility_corridor',
      widthMeters: width,
      elevationOffsetMeters: 0,
      surfaceMaterial: uType === 'industrial_pipeline' ? 'gravel' : 'verge_grass',
      direction: 'bidirectional',
      traversableBy: [],
      surfaceOwnership: isAerial ? 'elevated_clearance' : 'replace_terrain',
      vegetationPolicy: isAerial ? 'exclude_tall_canopy' : 'exclude'
    }
  ];

  return infraCompileCrossSectionProfile({
    id: `util_${uType}_${infraRound(width, 1)}_${elevationMode}`,
    domain,
    label: `${String(uType).replace(/_/g, ' ')}`,
    eraStyle,
    clearanceEnvelopeId: domain === 'pipe' && !isAerial ? 'utility_pipe' : 'utility_aerial',
    strips,
    understructure: { deckThicknessMeters: 0.25, edgeBeamDepthMeters: 0.25, sideSkirtMode: 'utility' }
  });
}

export function infraBuildFacilityProfileFromParams(rawParams = {}, elevationMode = 'grade', eraStyle = 'modern_municipal') {
  const p = { ...INFRA_BASE_FACILITY_PARAMS, ...rawParams };
  const fType = p.facilityType || 'protected_bikeway';
  const strips = [];

  if (fType === 'protected_bikeway') {
    const bw = infraClamp(p.corridorWidthMeters, 2.2, 5.0);
    if (p.includeCurbBuffer !== false) {
      strips.push({ id: 'fac_buf_l', kind: 'curb', widthMeters: 0.36, elevationOffsetMeters: 0.18, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    }
    strips.push({ id: 'fac_bike', kind: 'bike_lane', widthMeters: bw, elevationOffsetMeters: 0.02, surfaceMaterial: 'bike_green', direction: 'bidirectional', traversableBy: ['bike'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    if (p.includeCurbBuffer !== false) {
      strips.push({ id: 'fac_buf_r', kind: 'curb', widthMeters: 0.36, elevationOffsetMeters: 0.18, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    }
  } else if (fType === 'bus_rapid_bay') {
    strips.push({ id: 'fac_brt_sw', kind: 'sidewalk', widthMeters: 2.8, elevationOffsetMeters: 0.22, surfaceMaterial: 'sidewalk', traversableBy: ['pedestrian'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_brt_pad', kind: 'bus_lane', widthMeters: 3.8, elevationOffsetMeters: 0, surfaceMaterial: 'concrete', markingKey: 'solid_white_right', direction: 'forward', traversableBy: ['bus'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_brt_pass', kind: 'vehicle_lane', widthMeters: 3.4, elevationOffsetMeters: 0, surfaceMaterial: 'asphalt', markingKey: 'solid_white_right', direction: 'forward', traversableBy: ['car'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_brt_curb', kind: 'curb', widthMeters: 0.2, elevationOffsetMeters: 0.15, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
  } else if (fType === 'surface_parking_bay') {
    strips.push({ id: 'fac_pk_cl', kind: 'curb', widthMeters: 0.25, elevationOffsetMeters: 0.15, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_pk_l', kind: 'vehicle_lane', widthMeters: 4.8, elevationOffsetMeters: 0, surfaceMaterial: 'parking_bay', traversableBy: ['car'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_pk_aisle', kind: 'vehicle_lane', widthMeters: 6.0, elevationOffsetMeters: 0, surfaceMaterial: 'asphalt', direction: 'bidirectional', traversableBy: ['car'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_pk_r', kind: 'vehicle_lane', widthMeters: 4.8, elevationOffsetMeters: 0, surfaceMaterial: 'parking_bay', traversableBy: ['car'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_pk_cr', kind: 'curb', widthMeters: 0.25, elevationOffsetMeters: 0.15, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
  } else {
    // freight_loading_yard
    strips.push({ id: 'fac_yd_dock', kind: 'walkway_deck', widthMeters: 3.6, elevationOffsetMeters: 0.95, surfaceMaterial: 'concrete', traversableBy: ['pedestrian'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_yd_apron', kind: 'vehicle_lane', widthMeters: 9.2, elevationOffsetMeters: 0, surfaceMaterial: 'concrete', markingKey: 'solid_white_right', direction: 'bidirectional', traversableBy: ['truck'], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
    strips.push({ id: 'fac_yd_curb', kind: 'curb', widthMeters: 0.35, elevationOffsetMeters: 0.16, surfaceMaterial: 'curb_stone', traversableBy: [], surfaceOwnership: 'replace_terrain', vegetationPolicy: 'exclude' });
  }

  return infraCompileCrossSectionProfile({
    id: `fac_${fType}_${infraRound(p.corridorWidthMeters || 4, 1)}`,
    domain: fType === 'protected_bikeway' ? 'cycle' : 'road',
    label: `${String(fType).replace(/_/g, ' ')}`,
    eraStyle,
    clearanceEnvelopeId: fType === 'protected_bikeway' ? 'cycle_lane' : 'road_urban_transit',
    strips,
    understructure: { deckThicknessMeters: 0.28, edgeBeamDepthMeters: 0.28, sideSkirtMode: 'embankment' }
  });
}
